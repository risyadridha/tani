import { NextResponse } from "next/server";
import { z } from "zod";
import { isDbConfigured } from "@/lib/server/db";
import { approveApplication, rejectApplication } from "@/lib/server/services/seller-service";
import { error, requireRole } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

const reviewSchema = z.object({
  approved: z.boolean(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

// PATCH /api/seller/applications/:id/review — ADMIN saja.
// Approve = transaksi: aplikasi → farmer + role farmer (atomic).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireRole("admin");
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Data tidak valid.", 422);
  }
  try {
    const res = parsed.data.approved
      ? await approveApplication(id, auth.user.id)
      : await rejectApplication(id, parsed.data.reason || "");
    if (!res.ok) return error("CONFLICT", res.error ?? "Gagal mereview.", 409);
    return NextResponse.json({ data: { id, approved: parsed.data.approved, ...("farmerId" in res ? { farmerId: res.farmerId } : {}) } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
