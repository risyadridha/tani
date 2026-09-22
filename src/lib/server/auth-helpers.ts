import { NextResponse } from "next/server";
import type { SafeUser, UserRole } from "@/data/auth";
import { getPool } from "@/lib/server/db";
import { userRepository, type UserRow } from "@/lib/server/repositories/user-repository";
import { getSessionUserId } from "@/lib/server/session";

// ---------------------------------------------------------------------------
// Lapisan otorisasi reusable: requireAuth / requireRole / ownership.
// Identity SELALU dari sesi server — tidak pernah dari body/query/localStorage.
// ---------------------------------------------------------------------------

export function toSafeUser(u: UserRow): SafeUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
  };
}

export function error(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const UNAUTHENTICATED = () => error("UNAUTHENTICATED", "Silakan masuk terlebih dahulu.", 401);
export const FORBIDDEN = () => error("FORBIDDEN", "Anda tidak memiliki akses.", 403);

export async function getCurrentUser(): Promise<UserRow | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await userRepository.findById(getPool(), userId);
  // Sesi milik user yang sudah dihapus/di-suspend = tidak valid.
  if (!user || user.status !== "active") return null;
  return user;
}

export async function requireAuth(): Promise<{ user: UserRow } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { response: UNAUTHENTICATED() };
  return { user };
}

export async function requireRole(
  ...roles: UserRole[]
): Promise<{ user: UserRow } | { response: NextResponse }> {
  const auth = await requireAuth();
  if ("response" in auth) return auth;
  if (!roles.includes(auth.user.role)) return { response: FORBIDDEN() };
  return auth;
}
