import { NextResponse } from "next/server";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { inventoryRepository } from "@/lib/server/repositories/product-repository";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

// GET /api/inventory/:productId — farmer pemilik saja.
export async function GET(_req: Request, ctx: { params: Promise<{ productId: string }> }): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { productId } = await ctx.params;
  try {
    const farmer = await farmerRepository.findByUserId(getPool(), auth.user.id);
    if (!farmer) return error("FORBIDDEN", "Akun ini bukan farmer.", 403);
    const inv = await inventoryRepository.get(getPool(), productId);
    if (!inv || inv.farmer_id !== farmer.id) {
      return error("NOT_FOUND", "Inventaris tidak ditemukan.", 404);
    }
    const history = await inventoryRepository.history(getPool(), productId, 20);
    return NextResponse.json({
      data: {
        productId: inv.product_id,
        productName: inv.product_name,
        quantity: Number(inv.quantity),
        unit: inv.unit,
        updatedAt: inv.updated_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        history: history.map((h: any) => ({
          id: h.id,
          change: Number(h.quantity_change),
          resultingStock: Number(h.resulting_stock),
          reason: h.reason,
          referenceId: h.reference_id,
          createdAt: h.created_at,
        })),
      },
    });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
