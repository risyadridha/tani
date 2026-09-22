import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import { adjustStock } from "@/lib/server/services/inventory-service";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

const adjustSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, "Delta tidak boleh 0."),
  reason: z.string().trim().min(3).max(200),
  kind: z.enum(["RESTOCK", "ADJUSTMENT", "RETURN"]).default("ADJUSTMENT"),
});

// POST /api/inventory/:productId/adjust — farmer pemilik; tercatat + anti-negatif.
export async function POST(req: Request, ctx: { params: Promise<{ productId: string }> }): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { productId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Data tidak valid.", 422);
  }
  try {
    const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
    if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
    const res = await adjustStock(getPool(), {
      productId,
      farmerId: farmer.id,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      kind: parsed.data.kind,
      actorId: auth.user.id,
    });
    if (!res.ok) return error("CONFLICT", res.error ?? "Gagal memperbarui stok.", 409);
    return NextResponse.json({ data: { productId, stock: res.stock } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
