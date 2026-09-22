import { NextResponse } from "next/server";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { sellerApplicationRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

// POST /api/seller/applications/:id/submit — pemilik, draft/rejected → under_review.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  try {
    const ok = await sellerApplicationRepository.submit(getPool(), id, auth.user.id);
    if (!ok) return error("CONFLICT", "Pengajuan tidak ditemukan atau tidak dapat dikirim.", 409);
    return NextResponse.json({ data: { id, status: "under_review" } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
