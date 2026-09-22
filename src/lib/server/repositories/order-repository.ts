import { execute, num, query, type DbConn, type DbRow } from "@/lib/server/db";

// ---------------------------------------------------------------------------
// Order / payment / shipment repositories. Order creation transaksional ada di
// service (order-service.ts) — repository hanya data access.
// ---------------------------------------------------------------------------

export const orderRepository = {
  async findByIdempotency(conn: DbConn, key: string): Promise<DbRow[]> {
    return query<DbRow[]>(conn, "SELECT id, group_id FROM orders WHERE idempotency_key = ? ORDER BY created_at", [key]);
  },
  async findById(conn: DbConn, id: string): Promise<DbRow | undefined> {
    // Dua query (tanpa JSON_ARRAYAGG — tak tersedia di MariaDB 10.4).
    const orders = await query<DbRow[]>(
      conn,
      `SELECT o.*,
        (SELECT status FROM payments WHERE order_id = o.id LIMIT 1) AS payment_status,
        (SELECT paid_at FROM payments WHERE order_id = o.id LIMIT 1) AS paid_at,
        (SELECT status FROM shipments WHERE order_id = o.id LIMIT 1) AS shipment_status,
        (SELECT tracking_number FROM shipments WHERE order_id = o.id LIMIT 1) AS tracking_number
       FROM orders o WHERE o.id = ? LIMIT 1`,
      [id]
    );
    const r = orders[0];
    if (!r) return undefined;
    const items = await query<DbRow[]>(
      conn,
      `SELECT product_id AS productId, name_snapshot AS name, image_snapshot AS image,
              price_snapshot AS price, unit, quantity, subtotal
       FROM order_items WHERE order_id = ? ORDER BY id`,
      [id]
    );
    return { ...r, items };
  },
  async listByBuyer(conn: DbConn, buyerId: string, status: string | null, limit: number, offset: number): Promise<{ rows: DbRow[]; total: number }> {
    const conds = ["o.buyer_id = ?"];
    const params: unknown[] = [buyerId];
    if (status) {
      conds.push("o.status = ?");
      params.push(status);
    }
    const where = `WHERE ${conds.join(" AND ")}`;
    const rows = await query<DbRow[]>(
      conn,
      `SELECT o.*, (SELECT status FROM payments WHERE order_id = o.id LIMIT 1) AS payment_status,
              (SELECT GROUP_CONCAT(CONCAT(quantity, 'x ', name_snapshot) SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS items_summary
       FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const count = await query<DbRow[]>(
      conn,
      `SELECT COUNT(*) AS total FROM orders o ${where}`,
      params
    );
    return { rows, total: num(count[0] ?? {}, "total") };
  },
  async listByFarmer(conn: DbConn, farmerId: string, status: string | null, actionOnly: boolean, limit: number, offset: number): Promise<{ rows: DbRow[]; total: number }> {
    const conds = ["o.farmer_id = ?"];
    const params: unknown[] = [farmerId];
    if (actionOnly) {
      conds.push("o.status IN ('pending','confirmed','processing','packed','shipped','delivered')");
    } else if (status) {
      conds.push("o.status = ?");
      params.push(status);
    }
    const where = `WHERE ${conds.join(" AND ")}`;
    const rows = await query<DbRow[]>(
      conn,
      `SELECT o.*, (SELECT status FROM payments WHERE order_id = o.id LIMIT 1) AS payment_status,
              (SELECT GROUP_CONCAT(CONCAT(quantity, 'x ', name_snapshot) SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS items_summary
       FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const count = await query<DbRow[]>(
      conn,
      `SELECT COUNT(*) AS total FROM orders o ${where}`,
      params
    );
    return { rows, total: num(count[0] ?? {}, "total") };
  },
  async history(conn: DbConn, orderId: string): Promise<DbRow[]> {
    return query<DbRow[]>(conn, "SELECT status, actor, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at, id", [orderId]);
  },
  async updateStatus(conn: DbConn, orderId: string, to: string): Promise<boolean> {
    const res = await execute(conn, "UPDATE orders SET status = ? WHERE id = ?", [to, orderId]);
    return res.affectedRows === 1;
  },
  async appendHistory(conn: DbConn, orderId: string, status: string, actor: string): Promise<void> {
    await execute(conn, "INSERT INTO order_status_history (order_id, status, actor) VALUES (?, ?, ?)", [orderId, status, actor]);
  },
  async markPaid(conn: DbConn, orderId: string): Promise<boolean> {
    const res = await execute(
      conn,
      "UPDATE payments SET status = 'paid', paid_at = NOW() WHERE order_id = ? AND status = 'pending'",
      [orderId]
    );
    return res.affectedRows === 1;
  },
};
