import type { UserRole, UserStatus } from "@/data/auth";
import { query, type DbConn } from "@/lib/server/db";

// ---------------------------------------------------------------------------
// User & session repositories (MySQL). Semua query parameterized — tidak ada
// string concatenation dari input user (anti SQL injection by construction).
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

interface UserDbRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

function mapUser(r: UserDbRow): UserRow {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    passwordHash: r.password_hash,
    role: r.role,
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}

export const userRepository = {
  async findByEmail(conn: DbConn, email: string): Promise<UserRow | undefined> {
    const rows = await query<UserDbRow[]>(conn, "SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] ? mapUser(rows[0]) : undefined;
  },
  async findById(conn: DbConn, id: string): Promise<UserRow | undefined> {
    const rows = await query<UserDbRow[]>(conn, "SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? mapUser(rows[0]) : undefined;
  },
  async insert(
    conn: DbConn,
    user: { id: string; name: string; email: string; phone: string; passwordHash: string }
  ): Promise<boolean> {
    try {
      await query(conn,
        "INSERT INTO users (id, name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'buyer', 'active')",
        [user.id, user.name, user.email, user.phone, user.passwordHash]
      );
      return true;
    } catch (err: unknown) {
      // Duplikat email atomik via UNIQUE (anti race, tanpa check-then-insert).
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "ER_DUP_ENTRY") {
        return false;
      }
      throw err;
    }
  },
  async setRole(conn: DbConn, id: string, role: UserRole): Promise<void> {
    await query(conn, "UPDATE users SET role = ? WHERE id = ?", [role, id]);
  },
};

export interface SessionRow {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

interface SessionDbRow {
  token_hash: string;
  user_id: string;
  expires_at: Date;
}

export const sessionRepository = {
  async insert(conn: DbConn, s: { tokenHash: string; userId: string; expiresAt: string }): Promise<void> {
    await query(conn, "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
      s.tokenHash,
      s.userId,
      s.expiresAt.slice(0, 19).replace("T", " "),
    ]);
  },
  async findByTokenHash(conn: DbConn, tokenHash: string): Promise<SessionRow | undefined> {
    const rows = await query<SessionDbRow[]>(conn, "SELECT token_hash, user_id, expires_at FROM sessions WHERE token_hash = ? LIMIT 1", [tokenHash]);
    const r = rows[0];
    if (!r) return undefined;
    return {
      tokenHash: r.token_hash,
      userId: r.user_id,
      expiresAt: r.expires_at instanceof Date ? r.expires_at.toISOString() : String(r.expires_at),
    };
  },
  async deleteByTokenHash(conn: DbConn, tokenHash: string): Promise<void> {
    await query(conn, "DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
  },
  async deleteExpired(conn: DbConn, nowIso: string): Promise<void> {
    await query(conn, "DELETE FROM sessions WHERE expires_at <= ?", [nowIso.slice(0, 19).replace("T", " ")]);
  },
};
