import { NextResponse } from "next/server";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { inventoryRepository } from "@/lib/server/repositories/product-repository";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInv(r: any) {
  return {
    productId: r.product_id,
    productName: r.product_name ?? null,
    productStatus: r.product_status ?? null,
    quantity: Number(r.quantity),
    unit: r.unit,
    updatedAt: r.updated_at,
  };
}

// GET /api/inventory — farmer melihat inventaris miliknya.
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  try {
    const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
    if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
    const rows = await inventoryRepository.listByFarmer(getPool(), farmer.id);
    return NextResponse.json({ data: rows.map(mapInv) });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
