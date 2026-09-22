import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { registerSchema } from "@/data/auth";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { hashPassword } from "@/lib/server/password";
import { createSession } from "@/lib/server/session";
import { error, toSafeUser } from "@/lib/server/auth-helpers";
import { clientIp, isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

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
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Data tidak valid.", 422);
  }
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    phone: "",
    passwordHash: await hashPassword(parsed.data.password),
    role: "buyer" as const,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };
  // Atomic: false = email sudah ada (UNIQUE DB, anti race).
  try {
    if (!(await userRepository.insert(getPool(), user))) {
      return error("EMAIL_TAKEN", "Email sudah terdaftar. Silakan masuk.", 409);
    }
  } catch {
    return error("DB_UNAVAILABLE", "Layanan autentikasi sedang tidak tersedia.", 503);
  }
  await createSession(user.id);
  return NextResponse.json({ data: toSafeUser(user) }, { status: 201 });
}
