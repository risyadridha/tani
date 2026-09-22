import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { orderRepository } from "@/lib/server/repositories/order-repository";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";
import { mapOrderList } from "@/app/api/orders/route";

export const runtime = "nodejs";

const listQuery = z.object({
  status: z.enum(["pending", "confirmed", "processing", "packed", "shipped", "delivered", "completed", "cancelled"]).optional(),
  actionOnly: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/farmer/orders — hanya order milik farmer login.
export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const url = new URL(req.url);
  const parsed = listQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Query tidak valid.", 400);
  }
  try {
    const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
    if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
    const { rows, total } = await orderRepository.listByFarmer(
      getPool(), farmer.id, parsed.data.status ?? null,
      parsed.data.actionOnly === "true", parsed.data.limit, (parsed.data.page - 1) * parsed.data.limit
    );
    return NextResponse.json({
      data: rows.map(mapOrderList),
      meta: { page: parsed.data.page, limit: parsed.data.limit, total },
    });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
