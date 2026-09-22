import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool, isDbConfigured, type DbRow } from "@/lib/server/db";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";
import { error } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

function parseJsonField(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    const parsed: unknown = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const listQuery = z.object({
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function mapFarmer(r: DbRow) {
  return {
    id: r.id,
    name: r.farm_name,
    location: r.location,
    verified: r.verified === 1,
    rating: Number(r.rating ?? 0),
    reviewCount: Number(r.review_count ?? 0),
    completedOrders: Number(r.completed_orders ?? 0),
    responseRate: Number(r.response_rate ?? 100),
    memberSince: String(r.member_since),
    description: r.description,
    farmSize: r.farm_size,
    avatar: r.avatar_url,
    commodities: parseJsonField(r.commodities),
    certifications: parseJsonField(r.certifications),
    upcomingHarvests: parseJsonField(r.upcoming_harvests),
    productCount: Number(r.product_count ?? 0),
  };
}

// GET /api/farmers — publik, hanya terverifikasi.
export async function GET(req: Request): Promise<NextResponse> {
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const url = new URL(req.url);
  const parsed = listQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return error("VALIDATION_ERROR", "Query tidak valid.", 400);
  try {
    const { rows, total } = await farmerRepository.listVerified(
      getPool(), parsed.data.limit, (parsed.data.page - 1) * parsed.data.limit, parsed.data.q ?? ""
    );
    return NextResponse.json({
      data: rows.map(mapFarmer),
      meta: { page: parsed.data.page, limit: parsed.data.limit, total },
    });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
