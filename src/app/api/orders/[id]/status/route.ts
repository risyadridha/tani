import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { transitionOrder } from "@/lib/server/services/order-service";
import { error, requireAuth } from "@/lib/server/auth-helpers";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import type { OrderActor, OrderStatus } from "@/data/order";

export const runtime = "nodejs";

const statusSchema = z.object({
  to: z.enum(["confirmed", "processing", "packed", "shipped", "delivered", "completed", "cancelled"]),
});

// PATCH /api/orders/:id/status — peran + ownership + mesin transisi di server.
// Buyer dicoba dulu (transisinya), lalu farmer pemilik. Selain itu: 403/404.
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
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Status tidak valid.", 422);
  }
  try {
    const pool = getPool();
    const farmer = await farmerRepository.findByUserId(pool, auth.user.id);
    const to = parsed.data.to as OrderStatus;
    const buyerFirst = await transitionOrder(id, "buyer" as OrderActor, to, { buyerId: auth.user.id });
    if (buyerFirst.ok) return NextResponse.json({ data: { id, status: to, actor: "buyer" } });
    if (!farmer) {
      return buyerFirst.error === "Pesanan tidak ditemukan."
        ? error("NOT_FOUND", "Pesanan tidak ditemukan.", 404)
        : error("FORBIDDEN", buyerFirst.error ?? "Aksi tidak diizinkan.", 403);
    }
    const res = await transitionOrder(id, "farmer" as OrderActor, to, { farmerId: farmer.id });
    if (!res.ok) {
      if (res.error === "Pesanan tidak ditemukan.") return error("NOT_FOUND", "Pesanan tidak ditemukan.", 404);
      return error("FORBIDDEN", res.error ?? "Aksi tidak diizinkan.", 403);
    }
    return NextResponse.json({ data: { id, status: to, actor: "farmer" } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
