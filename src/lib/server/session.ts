import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getPool } from "@/lib/server/db";
import { sessionRepository } from "@/lib/server/repositories/user-repository";

// ---------------------------------------------------------------------------
// Sesi opaque server-managed (MySQL). Cookie hanya membawa token acak;
// yang disimpan adalah sha256(token). HttpOnly, SameSite=Lax, Secure saat
// production, TTL 7 hari. Sesi kedaluwarsa dihapus oportunistik.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "tanihub_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiresIso(fromMs: number): string {
  return new Date(fromMs).toISOString();
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const pool = getPool();
  await sessionRepository.deleteExpired(pool, expiresIso(now));
  await sessionRepository.insert(pool, {
    tokenHash: hashToken(token),
    userId,
    expiresAt: expiresIso(now + SESSION_TTL_MS),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return token;
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await sessionRepository.findByTokenHash(getPool(), hashToken(token));
  if (!session) return null;
  if (session.expiresAt <= new Date().toISOString()) {
    await sessionRepository.deleteByTokenHash(getPool(), session.tokenHash);
    return null;
  }
  return session.userId;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  // Logout efektif walau DB sedang down (cookie selalu dihapus dulu).
  if (token) {
    try {
      await sessionRepository.deleteByTokenHash(getPool(), hashToken(token));
    } catch {
      // Abaikan: sesi yatim kedaluwarsa dan dibersihkan oportunistik.
    }
  }
}
