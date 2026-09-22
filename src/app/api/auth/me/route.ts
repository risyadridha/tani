import { NextResponse } from "next/server";
import { getCurrentUser, toSafeUser, UNAUTHENTICATED, error } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) return UNAUTHENTICATED();
    return NextResponse.json({ data: toSafeUser(user) });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan autentikasi sedang tidak tersedia.", 503);
  }
}
