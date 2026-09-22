import { NextResponse } from "next/server";
import { z } from "zod";
import { execute, getPool, isDbConfigured, query, withTransaction, type DbRow } from "@/lib/server/db";
import { DEFAULT_PRODUCT_IMAGE, isAllowedImageUrl } from "@/data/seller";
import { productRepository } from "@/lib/server/repositories/product-repository";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const listQuery = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(60).optional(),
  location: z.string().max(120).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["terbaru", "termurah", "termahal", "rating"]).optional(),
  mine: z.enum(["true", "false"]).optional(),
  // Revalidasi cart: daftar id spesifik (maks 50), tanpa filter availability
  // agar item yang berubah status/stok tetap terlapor (bukan hilang diam-diam).
  ids: z.string().max(2000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function mapProduct(r: DbRow) {
  return {
    id: r.id,
    farmerId: r.farmer_id,
    farmerName: r.farmer_farm_name ?? "",
    farmerLocation: r.farmer_location ?? "",
    farmerVerified: r.farmer_verified === 1,
    farmerRating: Number(r.farmer_rating ?? 0),
    farmerReviewCount: Number(r.farmer_review_count ?? 0),
    name: r.name,
    category: r.category,
    description: r.description,
    image: r.image_url && String(r.image_url).trim() !== "" ? r.image_url : DEFAULT_PRODUCT_IMAGE,
    images: r.image_url && String(r.image_url).trim() !== "" ? [r.image_url] : [DEFAULT_PRODUCT_IMAGE],
    grade: r.grade,
    price: Number(r.price),
    unit: r.inv_unit ?? r.unit,
    minOrder: Number(r.min_order),
    stock: Number(r.stock ?? 0),
    status: r.status,
    location: r.location,
    rating: Number(r.rating ?? 0),
    reviewCount: Number(r.review_count ?? 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/products — publik (hanya tersedia) atau milik farmer (?mine=true).
export async function GET(req: Request): Promise<NextResponse> {
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const url = new URL(req.url);
  const parsed = listQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Query tidak valid.", 400);
  }
  const { page, limit, mine, ids, ...filter } = parsed.data;
  try {
    if (ids) {
      const idList = [...new Set(ids.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 50);
      if (idList.length === 0) return NextResponse.json({ data: [], meta: { page: 1, limit, total: 0 } });
      const placeholders = idList.map(() => "?").join(",");
      const rows = await query<DbRow[]>(
        getPool(),
        `SELECT p.*, COALESCE(i.quantity, 0) AS stock, i.unit AS inv_unit,
                f.farm_name AS farmer_farm_name, f.location AS farmer_location, f.verified AS farmer_verified,
                f.rating AS farmer_rating, f.review_count AS farmer_review_count
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
         LEFT JOIN farmers f ON f.id = p.farmer_id
         WHERE p.id IN (${placeholders})`,
        idList
      );
      return NextResponse.json({ data: rows.map(mapProduct), meta: { page: 1, limit, total: rows.length } });
    }
    if (mine === "true") {
      const auth = await requireAuth();
      if ("response" in auth) return auth.response;
      const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
      if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
      const rows = await productRepository.listByFarmer(getPool(), farmer.id);
      return NextResponse.json({ data: rows.map(mapProduct), meta: { page: 1, limit: rows.length, total: rows.length } });
    }
    const { rows, total } = await productRepository.list(getPool(), filter, limit, (page - 1) * limit);
    return NextResponse.json({ data: rows.map(mapProduct), meta: { page, limit, total } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(3).max(100),
  category: z.string().min(1).max(60),
  description: z.string().trim().min(10).max(1000),
  // Foto: URL Unsplash, data:image dari file-picker (terkompresi), atau kosong
  // (= gambar bawaan). Host lain ditolak agar next/image tak pernah error.
  imageUrl: z.string().trim().max(500000).optional().or(z.literal("")).refine(
    (v) => !v || v.startsWith("data:image/") || isAllowedImageUrl(v),
    { message: "Gunakan URL gambar images.unsplash.com, pilih file dari perangkat, atau kosongkan" }
  ),
  grade: z.enum(["A", "B", "C"]),
  price: z.number().int().gt(0),
  unit: z.string().min(1).max(20),
  minOrder: z.number().int().gt(0),
  stock: z.number().int().min(0),
  location: z.string().trim().min(3).max(120),
  status: z.enum(["draft", "active"]).default("draft"),
});

// POST /api/products — farmer only; produk + inventory dibuat atomik.
export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Data tidak valid.", 422);
  }
  if (parsed.data.minOrder > Math.max(parsed.data.stock, 1) && parsed.data.stock !== 0) {
    return error("VALIDATION_ERROR", "Min. pembelian tidak boleh melebihi stok.", 422);
  }
  try {
    const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
    if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
    const id = randomUUID();
    const v = parsed.data;
    await withTransaction(async (conn) => {
      await productRepository.insert(conn, {
        id, farmerId: farmer.id, name: v.name.trim(), category: v.category,
        description: v.description.trim(), imageUrl: v.imageUrl?.trim() || "", grade: v.grade,
        price: v.price, unit: v.unit, minOrder: v.minOrder, status: v.status, location: v.location.trim(),
      }, v.stock);
      if (v.stock > 0) {
        await execute(
          conn,
          `INSERT INTO inventory_transactions (id, product_id, quantity_change, resulting_stock, reason, actor_id)
           VALUES (?, ?, ?, ?, 'INITIAL: Stok awal produk', ?)`,
          [randomUUID(), id, v.stock, v.stock, auth.user.id]
        );
      }
    });
    const created = await productRepository.findById(getPool(), id);
    if (!created) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
    return NextResponse.json({ data: mapProduct(created) }, { status: 201 });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
