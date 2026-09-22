import { NextResponse } from "next/server";
import { getPool, isDbConfigured, type DbRow } from "@/lib/server/db";
import { farmerRepository, sellerApplicationRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

function str(r: DbRow, k: string): string {
  const v = r[k];
  return typeof v === "string" ? v : "";
}

// GET /api/seller/status — ringkasan seller untuk gate UI: aplikasi terbaru
// + farmer milik user login (bila ada). BUKAN otorisasi; enforcement di tiap API.
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  try {
    const pool = getPool();
    const apps = await sellerApplicationRepository.listMine(pool, auth.user.id);
    const farmer = await farmerRepository.findByUserId(pool, auth.user.id);
    const app = apps[0];
    return NextResponse.json({
      data: {
        application: app
          ? { id: str(app, "id"), status: str(app, "status"), rejectionReason: (app["rejection_reason"] as string | null) ?? null }
          : null,
        farmer: farmer ? { id: farmer.id, farmName: farmer.farmName } : null,
      },
    });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
