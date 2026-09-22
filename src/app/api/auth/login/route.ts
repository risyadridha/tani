import { NextResponse } from "next/server";
import { loginSchema } from "@/data/auth";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { verifyPassword } from "@/lib/server/password";
import { createSession } from "@/lib/server/session";
import { error, toSafeUser } from "@/lib/server/auth-helpers";
import { clientIp, isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const GENERIC = "Email atau kata sandi salah.";

export async function POST(req: Request): Promise<NextResponse> {
  if (isRateLimited(await clientIp())) {
    return error("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi sebentar.", 429);
  }
  if (!isDbConfigured()) {
    return error("DB_UNAVAILABLE", "Layanan autentikasi sedang tidak tersedia.", 503);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Data tidak valid.", 422);
  }
  let user;
  try {
    user = await userRepository.findByEmail(getPool(), parsed.data.email);
  } catch {
    return error("DB_UNAVAILABLE", "Layanan autentikasi sedang tidak tersedia.", 503);
  }
  // Generic untuk: tidak ada, password salah, DAN suspended — tanpa enumerasi.
  if (!user || user.status !== "active") {
    if (user) await verifyPassword(parsed.data.password, user.passwordHash);
    return error("INVALID_CREDENTIALS", GENERIC, 401);
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return error("INVALID_CREDENTIALS", GENERIC, 401);
  }
  await createSession(user.id);
  return NextResponse.json({ data: toSafeUser(user) });
}
