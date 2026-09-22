import { randomUUID } from "node:crypto";
import { execute, query, type DbConn } from "@/lib/server/db";

// ---------------------------------------------------------------------------
// Inventory service: penyesuaian stok tercatat + anti-negatif di level DB.
// Pola: UPDATE kondisional (quantity + delta >= 0) lalu cek affectedRows —
// atomic tanpa SELECT terpisah; CHECK constraint lapis terakhir.
// ---------------------------------------------------------------------------

export type InventoryReason = "RESTOCK" | "ADJUSTMENT" | "SALE" | "CANCELLATION" | "RETURN" | "INITIAL";

export async function adjustStock(
  conn: DbConn,
  args: { productId: string; farmerId: string; delta: number; reason: string; kind: InventoryReason; actorId: string; referenceId?: string }
): Promise<{ ok: boolean; error?: string; stock?: number }> {
  if (!Number.isInteger(args.delta) || args.delta === 0) {
    return { ok: false, error: "Jumlah perubahan stok tidak valid." };
  }
  // Ownership: produk harus milik farmer peminta.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const own = await query<any[]>(conn, "SELECT id FROM products WHERE id = ? AND farmer_id = ? LIMIT 1", [
    args.productId,
    args.farmerId,
  ]);
  if (own.length === 0) return { ok: false, error: "Produk tidak ditemukan." };

  const res = await execute(
    conn,
    "UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND quantity + ? >= 0",
    [args.delta, args.productId, args.delta]
  );
  if (res.affectedRows !== 1) {
    return { ok: false, error: "Stok tidak mencukupi." };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cur = await query<any[]>(conn, "SELECT quantity FROM inventory WHERE product_id = ? LIMIT 1", [args.productId]);
  const stock = Number(cur[0]?.quantity ?? 0);
  await execute(
    conn,
    `INSERT INTO inventory_transactions (id, product_id, quantity_change, resulting_stock, reason, actor_id, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), args.productId, args.delta, stock, `${args.kind}: ${args.reason}`.slice(0, 200), args.actorId, args.referenceId ?? null]
  );
  return { ok: true, stock };
}
