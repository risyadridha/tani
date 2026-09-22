import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedImageUrl } from "@/data/seller";
import { getPool, isDbConfigured, query, withTransaction } from "@/lib/server/db";
import { adjustStock } from "@/lib/server/services/inventory-service";
import { productRepository } from "@/lib/server/repositories/product-repository";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";
import { mapProduct } from "@/app/api/products/route";

export const runtime = "nodejs";

// GET /api/products/:id — publik; produk non-aktif tetap terlihat (detail),
// availability ditentukan consumer (marketplace filter active+stok).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  try {
    const product = await productRepository.findById(getPool(), id);
    if (!product) return error("NOT_FOUND", "Produk tidak ditemukan.", 404);
    return NextResponse.json({ data: mapProduct(product) });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}

const patchSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    category: z.string().min(1).max(60).optional(),
    description: z.string().trim().min(10).max(1000).optional(),
    imageUrl: z.string().trim().max(500000).optional().refine(
      (v) => v === undefined || v === "" || v.startsWith("data:image/") || isAllowedImageUrl(v),
      { message: "Gunakan URL gambar images.unsplash.com, pilih file dari perangkat, atau kosongkan" }
    ),
    grade: z.enum(["A", "B", "C"]).optional(),
    price: z.number().int().gt(0).optional(),
    unit: z.string().min(1).max(20).optional(),
    minOrder: z.number().int().gt(0).optional(),
    status: z.enum(["draft", "active", "inactive"]).optional(),
    location: z.string().trim().min(3).max(120).optional(),
    // Stok opsional dalam PATCH agar edit produk+stok atomik (satu transaksi
    // di bawah): stok tak pernah ditulis langsung tanpa riwayat.
    stock: z.number().int().min(0).optional(),
    stockReason: z.string().trim().min(3).max(200).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Tidak ada perubahan." });

// PATCH /api/products/:id — farmer pemilik saja (ownership di WHERE).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Data tidak valid.", 422);
  }
  try {
    const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
    if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
    // Aturan minOrder-vs-stok berlaku juga saat PATCH (gabung nilai baru + lama).
    const existing = await productRepository.findById(getPool(), id);
    if (!existing || existing.farmer_id !== farmer.id) {
      return error("NOT_FOUND", "Produk tidak ditemukan atau bukan milik Anda.", 404);
    }
    const effMinOrder = parsed.data.minOrder ?? Number(existing.min_order);
    const effStock = parsed.data.stock ?? Number(existing.stock ?? 0);
    if (effStock !== 0 && effMinOrder > Math.max(effStock, 1)) {
      return error("VALIDATION_ERROR", "Min. pembelian tidak boleh melebihi stok.", 422);
    }
    // Satu transaksi: update produk + penyesuaian stok tercatat (atau tidak sama sekali).
    const { stock, stockReason, ...productPatch } = parsed.data;
    const result = await withTransaction(async (conn) => {
      const ok = await productRepository.update(conn, id, farmer.id, productPatch);
      if (!ok) return "missing" as const;
      if (stock !== undefined && stock !== Number(existing.stock ?? 0)) {
        const delta = stock - Number(existing.stock ?? 0);
        const adj = await adjustStock(conn, {
          productId: id,
          farmerId: farmer.id,
          delta,
          reason: stockReason?.trim() || "Penyesuaian stok via edit produk",
          kind: "ADJUSTMENT",
          actorId: auth.user.id,
        });
        if (!adj.ok) return { failed: adj.error ?? "Gagal menyesuaikan stok." } as const;
      }
      return "saved" as const;
    });
    if (result === "missing") return error("NOT_FOUND", "Produk tidak ditemukan atau bukan milik Anda.", 404);
    if (typeof result === "object") return error("CONFLICT", result.failed, 409);
    const updated = await productRepository.findById(getPool(), id);
    if (!updated) return error("NOT_FOUND", "Produk tidak ditemukan atau bukan milik Anda.", 404);
    return NextResponse.json({ data: mapProduct(updated) });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}

// DELETE /api/products/:id — farmer pemilik; HANYA bila tanpa riwayat.
// Produk ber-order/ber-riwayat dilindungi RESTRICT (audit) → 409 + arahkan
// ke nonaktif (PATCH status=inactive). Tidak ada hard-delete bersejarah.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  try {
    const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
    if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
    const outcome = await withTransaction(async (conn) => {
      const refs = await query<{ n: number }[]>(
        conn,
        `SELECT COUNT(*) AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = ? AND o.status NOT IN ('completed','cancelled')`,
        [id]
      );
      if (Number(refs[0]?.n ?? 0) > 0) return "has-orders" as const;
      const hist = await query<{ n: number }[]>(
        conn,
        `SELECT (SELECT COUNT(*) FROM order_items WHERE product_id = ?) +
                (SELECT COUNT(*) FROM inventory_transactions WHERE product_id = ?) AS n`,
        [id, id]
      );
      if (Number(hist[0]?.n ?? 0) > 0) return "has-history" as const;
      return (await productRepository.remove(conn, id, farmer.id)) ? ("deleted" as const) : ("missing" as const);
    });
    if (outcome === "has-orders") {
      return error("CONFLICT", "Produk memiliki order aktif dan tidak dapat dihapus.", 409);
    }
    if (outcome === "has-history") {
      return error("CONFLICT", "Produk memiliki riwayat dan tidak dapat dihapus. Nonaktifkan saja.", 409);
    }
    if (outcome === "missing") return error("NOT_FOUND", "Produk tidak ditemukan atau bukan milik Anda.", 404);
    return NextResponse.json({ data: { ok: true } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
