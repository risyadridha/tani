import { NextResponse } from "next/server";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { farmerRepository, mapFarmer } from "@/lib/server/repositories/farmer-repository";
import { productRepository } from "@/lib/server/repositories/product-repository";
import { error } from "@/lib/server/auth-helpers";
import { mapProduct } from "@/app/api/products/route";

export const runtime = "nodejs";

// GET /api/farmers/:id — publik + produk aktifnya.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  try {
    const pool = getPool();
    const farmer = await farmerRepository.findById(pool, id);
    if (!farmer || !farmer.verified) return error("NOT_FOUND", "Petani tidak ditemukan.", 404);
    const products = await productRepository.listByFarmer(pool, id);
    const active = products.filter((p) => p.status === "active" && Number(p.stock) > 0);
    const f = mapFarmer({
      id: farmer.id,
      farm_name: farmer.farmName,
      location: farmer.location,
      verified: farmer.verified ? 1 : 0,
      member_since: farmer.memberSince,
      rating: farmer.rating,
      review_count: farmer.reviewCount,
      completed_orders: farmer.completedOrders,
      response_rate: farmer.responseRate,
      description: farmer.description,
      farm_size: farmer.farmSize,
      avatar_url: farmer.avatarUrl,
      commodities: farmer.commodities,
      certifications: farmer.certifications,
      upcoming_harvests: farmer.upcomingHarvests,
      product_count: active.length,
    });
    return NextResponse.json({
      data: {
        ...f,
        name: f.farmName,
        avatar: f.avatarUrl,
        memberSince: String(f.memberSince),
        products: active.map(mapProduct),
      },
    });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
