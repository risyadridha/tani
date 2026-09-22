import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getPool, isDbConfigured, type DbRow } from "@/lib/server/db";
import { sellerApplicationRepository } from "@/lib/server/repositories/farmer-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

const draftSchema = z.object({
  id: z.string().min(8).max(64).optional(),
  fullName: z.string().trim().min(3).max(100),
  phone: z.string().trim().min(10).max(15),
  email: z.string().trim().email().max(190).optional().or(z.literal("")),
  location: z.string().trim().min(3).max(120),
  farmName: z.string().trim().min(3).max(100),
  farmLocation: z.string().trim().min(3).max(120),
  commodities: z.string().trim().min(1).max(200),
  description: z.string().trim().min(10).max(500),
  farmSize: z.string().trim().max(50).optional().or(z.literal("")),
});

function mapApp(r: DbRow) {
  return {
    id: r.id, userId: r.user_id, fullName: r.full_name, phone: r.phone,
    email: r.email, location: r.location, farmName: r.farm_name, farmLocation: r.farm_location,
    commodities: r.commodities, description: r.description, farmSize: r.farm_size,
    status: r.status, rejectionReason: r.rejection_reason, submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// GET /api/seller/applications — milik user login.
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  try {
    const rows = await sellerApplicationRepository.listMine(getPool(), auth.user.id);
    return NextResponse.json({ data: rows.map(mapApp) });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}

// POST /api/seller/applications — simpan draf milik user login.
export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Data tidak valid.", 422);
  }
  try {
    const v = parsed.data;
    const id = v.id ?? randomUUID();
    // Cegah penimpaan draf milik user lain SEBELUM upsert (bukan sesudah).
    if (v.id) {
      const existing = await sellerApplicationRepository.findById(getPool(), v.id);
      if (existing && existing.user_id !== auth.user.id) {
        return error("FORBIDDEN", "Pengajuan bukan milik Anda.", 403);
      }
    }
    await sellerApplicationRepository.upsertDraft(getPool(), {
      id, userId: auth.user.id, fullName: v.fullName, phone: v.phone,
      email: v.email || null, location: v.location, farmName: v.farmName,
      farmLocation: v.farmLocation, commodities: v.commodities, description: v.description,
      farmSize: v.farmSize || null,
    });
    const saved = await sellerApplicationRepository.findById(getPool(), id);
    if (!saved) {
      return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
    }
    return NextResponse.json({ data: mapApp(saved) }, { status: 201 });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
