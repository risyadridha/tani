import { execute, escapeLike, num, query, type DbConn, type DbRow } from "@/lib/server/db";

// ---------------------------------------------------------------------------
// Product & inventory repositories. Uang integer Rupiah; stok integer.
// Semua tulis baca parameterized.
// ---------------------------------------------------------------------------

export interface ProductInput {
  id: string;
  farmerId: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  grade: "A" | "B" | "C";
  price: number;
  unit: string;
  minOrder: number;
  status: "draft" | "active" | "inactive";
  location: string;
}

export interface ProductListFilter {
  q?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "terbaru" | "termurah" | "termahal" | "rating";
  availableOnly?: boolean;
}

// Bentuk baris gabungan untuk mapper API (snake_case DB apa adanya).
export interface ProductJoinedRow extends DbRow {
  farmer_farm_name?: unknown;
  farmer_location?: unknown;
  farmer_verified?: unknown;
  inv_unit?: unknown;
}

const SORT_SQL: Record<string, string> = {
  terbaru: "p.created_at DESC",
  termurah: "p.price ASC",
  termahal: "p.price DESC",
  rating: "p.rating DESC",
};

export const productRepository = {
  async list(conn: DbConn, f: ProductListFilter, limit: number, offset: number): Promise<{ rows: DbRow[]; total: number }> {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (f.availableOnly !== false) {
      conds.push("p.status = 'active'", "COALESCE(i.quantity, 0) > 0");
    }
    if (f.category && f.category !== "Semua") {
      conds.push("p.category = ?");
      params.push(f.category);
    }
    if (f.location && f.location !== "Semua Lokasi") {
      conds.push("p.location LIKE ?");
      params.push(`%${escapeLike(f.location)}%`);
    }
    if (f.minPrice !== undefined) {
      conds.push("p.price >= ?");
      params.push(f.minPrice);
    }
    if (f.maxPrice !== undefined) {
      conds.push("p.price <= ?");
      params.push(f.maxPrice);
    }
    if (f.q) {
      conds.push("(p.name LIKE ? OR p.category LIKE ?)");
      params.push(`%${escapeLike(f.q)}%`, `%${escapeLike(f.q)}%`);
    }
    const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
    const order = SORT_SQL[f.sort ?? "terbaru"] ?? SORT_SQL.terbaru;
    const rows = await query<DbRow[]>(
      conn,
      `SELECT p.*, COALESCE(i.quantity, 0) AS stock, i.unit AS inv_unit,
              f.farm_name AS farmer_farm_name, f.location AS farmer_location, f.verified AS farmer_verified,
              f.rating AS farmer_rating, f.review_count AS farmer_review_count
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       LEFT JOIN farmers f ON f.id = p.farmer_id
       ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const count = await query<DbRow[]>(
      conn,
      `SELECT COUNT(*) AS total FROM products p LEFT JOIN inventory i ON i.product_id = p.id ${where}`,
      params
    );
    return { rows, total: num(count[0] ?? {}, "total") };
  },
  async findById(conn: DbConn, id: string): Promise<DbRow | undefined> {
    const rows = await query<DbRow[]>(
      conn,
      `SELECT p.*, COALESCE(i.quantity, 0) AS stock, f.farm_name AS farmer_farm_name,
              f.location AS farmer_location, f.verified AS farmer_verified,
              f.rating AS farmer_rating, f.review_count AS farmer_review_count
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       LEFT JOIN farmers f ON f.id = p.farmer_id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    return rows[0];
  },
  async listByFarmer(conn: DbConn, farmerId: string): Promise<DbRow[]> {
    return query<DbRow[]>(
      conn,
      `SELECT p.*, COALESCE(i.quantity, 0) AS stock FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.farmer_id = ? ORDER BY p.updated_at DESC`,
      [farmerId]
    );
  },
  async insert(conn: DbConn, p: ProductInput, stock: number): Promise<void> {
    await execute(
      conn,
      `INSERT INTO products (id, farmer_id, name, category, description, image_url, grade, price, unit, min_order, status, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.farmerId, p.name, p.category, p.description, p.imageUrl, p.grade, p.price, p.unit, p.minOrder, p.status, p.location]
    );
    await execute(conn, "INSERT INTO inventory (product_id, quantity, unit) VALUES (?, ?, ?)", [
      p.id,
      stock,
      p.unit,
    ]);
  },
  async update(conn: DbConn, id: string, farmerId: string, patch: Partial<ProductInput>): Promise<boolean> {
    const sets: string[] = [];
    const params: unknown[] = [];
    const allowed = ["name", "category", "description", "image_url", "grade", "price", "unit", "min_order", "status", "location"] as const;
    const keyMap: Record<(typeof allowed)[number], keyof ProductInput> = {
      name: "name", category: "category", description: "description", image_url: "imageUrl",
      grade: "grade", price: "price", unit: "unit", min_order: "minOrder", status: "status", location: "location",
    };
    for (const col of allowed) {
      const v: unknown = patch[keyMap[col]];
      if (v !== undefined) {
        sets.push(`${col} = ?`);
        params.push(v);
      }
    }
    if (sets.length === 0) return true;
    const res = await execute(
      conn,
      `UPDATE products SET ${sets.join(", ")} WHERE id = ? AND farmer_id = ?`,
      [...params, id, farmerId]
    );
    return res.affectedRows === 1;
  },
  async remove(conn: DbConn, id: string, farmerId: string): Promise<boolean> {
    // Hapus inventory dulu (RESTRICT), lalu produk — dalam transaksi pemanggil.
    // Produk ber-order aktif tidak boleh dihapus (dicek service).
    await execute(conn, "DELETE FROM inventory WHERE product_id = ? AND EXISTS (SELECT 1 FROM products WHERE id = ? AND farmer_id = ?)", [id, id, farmerId]);
    const res = await execute(conn, "DELETE FROM products WHERE id = ? AND farmer_id = ?", [id, farmerId]);
    return res.affectedRows === 1;
  },
};

export const inventoryRepository = {
  async get(conn: DbConn, productId: string): Promise<DbRow | undefined> {
    const rows = await query<DbRow[]>(
      conn,
      `SELECT i.*, p.name AS product_name, p.farmer_id FROM inventory i
       JOIN products p ON p.id = i.product_id WHERE i.product_id = ? LIMIT 1`,
      [productId]
    );
    return rows[0];
  },
  async listByFarmer(conn: DbConn, farmerId: string): Promise<DbRow[]> {
    return query<DbRow[]>(
      conn,
      `SELECT i.*, p.name AS product_name, p.status AS product_status FROM inventory i
       JOIN products p ON p.id = i.product_id WHERE p.farmer_id = ? ORDER BY p.updated_at DESC`,
      [farmerId]
    );
  },
  async history(conn: DbConn, productId: string, limit: number): Promise<DbRow[]> {
    return query<DbRow[]>(
      conn,
      "SELECT * FROM inventory_transactions WHERE product_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
      [productId, limit]
    );
  },
};
