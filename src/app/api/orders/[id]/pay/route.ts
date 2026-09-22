import { NextResponse } from "next/server";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { orderRepository } from "@/lib/server/repositories/order-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

// POST /api/orders/:id/pay — mock pembayaran (production: gateway).
// Hanya pemilik buyer; idempotent (hanya dari pending).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  try {
    const pool = getPool();
    const order = await orderRepository.findById(pool, id);
    if (!order || order.buyer_id !== auth.user.id) {
      return error("NOT_FOUND", "Pesanan tidak ditemukan.", 404);
    }
    if (order.status === "cancelled") {
      return error("CONFLICT", "Pesanan dibatalkan.", 409);
    }
    // Pembayaran hanya di tahap awal fulfillment; di luar itu butuh penanganan
    // manual (bukan mock). Aturan bisnis eksplisit, bukan validasi diam-diam.
    if (!["pending", "confirmed", "processing"].includes(String(order.status))) {
      return error("CONFLICT", "Pembayaran hanya dapat dilakukan sebelum pengemasan.", 409);
    }
    const ok = await orderRepository.markPaid(pool, id);
    if (!ok) return error("CONFLICT", "Pembayaran sudah diproses.", 409);
    return NextResponse.json({ data: { id, paymentStatus: "paid" } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
