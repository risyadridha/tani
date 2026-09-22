import { bool, escapeLike, execute, isoDate, num, query, str, strOrNull, type DbConn, type DbRow } from "@/lib/server/db";

// ---------------------------------------------------------------------------
// Farmer & seller-application repositories.
// Relasi User 1 ─── 0..1 Farmer ditegakkan via UNIQUE(farmers.user_id).
// ---------------------------------------------------------------------------

export interface FarmerRow {
  id: string;
  userId: string;
  farmName: string;
  location: string;
  description: string;
  farmSize: string | null;
  avatarUrl: string | null;
  verified: boolean;
  memberSince: number;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseRate: number;
  commodities: string[];
  certifications: string[];
  upcomingHarvests: UpcomingHarvest[];
  createdAt: string;
  updatedAt: string;
}

export interface SellerApplicationRow {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  location: string;
  farmName: string;
  farmLocation: string;
  commodities: string;
  description: string;
  farmSize: string | null;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapFarmer(r: DbRow): FarmerRow {
  return {
    id: str(r, "id"),
    userId: str(r, "user_id"),
    farmName: str(r, "farm_name"),
    location: str(r, "location"),
    description: str(r, "description"),
    farmSize: strOrNull(r, "farm_size"),
    avatarUrl: strOrNull(r, "avatar_url"),
  verified: bool(r, "verified"),
  memberSince: num(r, "member_since"),
  rating: Number(r["rating"] ?? 0),
  reviewCount: num(r, "review_count"),
  completedOrders: num(r, "completed_orders"),
  responseRate: num(r, "response_rate"),
  commodities: parseJsonArray(r["commodities"]),
  certifications: parseJsonArray(r["certifications"]),
  upcomingHarvests: parseJsonObjects(r["upcoming_harvests"]),
  createdAt: isoDate(r, "created_at"),
  updatedAt: isoDate(r, "updated_at"),
  };
}

export interface UpcomingHarvest {
  crop: string;
  estimatedDate: string;
  estimatedQuantity: string;
}

function parseJsonArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    const parsed: unknown = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

function parseJsonObjects(v: unknown): UpcomingHarvest[] {
  const asArray = (raw: unknown): unknown[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string" || raw.trim() === "") return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return asArray(v)
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      crop: typeof x.crop === "string" ? x.crop : "",
      estimatedDate: typeof x.estimatedDate === "string" ? x.estimatedDate : "",
      estimatedQuantity: typeof x.estimatedQuantity === "string" ? x.estimatedQuantity : "",
    }))
    .filter((x) => x.crop !== "");
}

export const farmerRepository = {
  async findById(conn: DbConn, id: string): Promise<FarmerRow | undefined> {
    const rows = await query<DbRow[]>(conn, "SELECT * FROM farmers WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? mapFarmer(rows[0]) : undefined;
  },
  async findByUserId(conn: DbConn, userId: string): Promise<FarmerRow | undefined> {
    const rows = await query<DbRow[]>(conn, "SELECT * FROM farmers WHERE user_id = ? LIMIT 1", [userId]);
    return rows[0] ? mapFarmer(rows[0]) : undefined;
  },
  async listVerified(conn: DbConn, limit: number, offset: number, q: string): Promise<{ rows: DbRow[]; total: number }> {
    const like = `%${escapeLike(q)}%`;
    const rows = await query<DbRow[]>(
      conn,
      `SELECT f.*, (SELECT COUNT(*) FROM products p WHERE p.farmer_id = f.id AND p.status = 'active') AS product_count
       FROM farmers f WHERE f.verified = 1 AND (f.farm_name LIKE ? OR f.location LIKE ?)
       ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      [like, like, limit, offset]
    );
    const count = await query<DbRow[]>(
      conn,
      "SELECT COUNT(*) AS total FROM farmers WHERE verified = 1 AND (farm_name LIKE ? OR location LIKE ?)",
      [like, like]
    );
    return { rows, total: num(count[0] ?? {}, "total") };
  },
  async insert(
    conn: DbConn,
    f: { id: string; userId: string; farmName: string; location: string; description: string; farmSize: string | null; memberSince: number }
  ): Promise<void> {
    await query(
      conn,
      `INSERT INTO farmers (id, user_id, farm_name, location, description, farm_size, verified, member_since)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [f.id, f.userId, f.farmName, f.location, f.description, f.farmSize, f.memberSince]
    );
  },
};

export const sellerApplicationRepository = {
  async listMine(conn: DbConn, userId: string): Promise<DbRow[]> {
    return query<DbRow[]>(conn, "SELECT * FROM seller_applications WHERE user_id = ? ORDER BY updated_at DESC", [userId]);
  },
  async findById(conn: DbConn, id: string): Promise<DbRow | undefined> {
    const rows = await query<DbRow[]>(conn, "SELECT * FROM seller_applications WHERE id = ? LIMIT 1", [id]);
    return rows[0];
  },
  async upsertDraft(
    conn: DbConn,
    app: { id: string; userId: string; fullName: string; phone: string; email: string | null; location: string; farmName: string; farmLocation: string; commodities: string; description: string; farmSize: string | null }
  ): Promise<void> {
    await query(
      conn,
      `INSERT INTO seller_applications
        (id, user_id, full_name, phone, email, location, farm_name, farm_location, commodities, description, farm_size, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
       ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name), phone = VALUES(phone), email = VALUES(email),
        location = VALUES(location), farm_name = VALUES(farm_name), farm_location = VALUES(farm_location),
        commodities = VALUES(commodities), description = VALUES(description), farm_size = VALUES(farm_size)`,
      [app.id, app.userId, app.fullName, app.phone, app.email, app.location, app.farmName, app.farmLocation, app.commodities, app.description, app.farmSize]
    );
  },
  async submit(conn: DbConn, id: string, userId: string): Promise<boolean> {
    const res = await execute(conn,
      "UPDATE seller_applications SET status = 'under_review', submitted_at = NOW() WHERE id = ? AND user_id = ? AND status IN ('draft','rejected')",
      [id, userId]
    );
    return res.affectedRows === 1;
  },
  async review(conn: DbConn, id: string, approved: boolean, reason: string | null, reviewerId?: string): Promise<boolean> {
    const res = await execute(conn,
      `UPDATE seller_applications SET status = ?, rejection_reason = ?, reviewed_at = NOW(), reviewed_by = COALESCE(?, reviewed_by)
       WHERE id = ? AND status = 'under_review'`,
      [approved ? "approved" : "rejected", reason, reviewerId ?? null, id]
    );
    return res.affectedRows === 1;
  },
};
