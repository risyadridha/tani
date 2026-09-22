import { randomUUID } from "node:crypto";
import { execute, query, withTransaction, type DbConn } from "@/lib/server/db";
import {
  canActorTransition,
  computeGroupTotals,
  orderErrorMessage,
  validateOrderLine,
  type OrderActor,
  type OrderStatus,
  type OrderValidationError,
} from "@/data/order";

// ---------------------------------------------------------------------------
// Order service — business logic + transaksi. SATU transaksi mencakup:
// lock stok (FOR UPDATE) → validasi → harga otoritatif DB → order + items +
// snapshot → kurangi stok → inventory tx → payment + shipment pending → COMMIT.
// Gagal di mana pun = ROLLBACK total (tidak ada partial state).
// ---------------------------------------------------------------------------

export interface ServiceOrderLine {
  productId: string;
  quantity: number;
}

export interface ServiceAddress {
  fullName: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  district: string;
  village: string;
  address: string;
  postalCode: string;
  notes?: string;
}

export interface CreateOrderRequest {
  buyerId: string;
  lines: ServiceOrderLine[];
  address: ServiceAddress;
  courier: string;
  courierService: string;
  paymentMethod: string;
  idempotencyKey: string;
}

export type CreateOrderResult =
  | { ok: true; groupId: string; orderIds: string[]; deduped: boolean }
  | { ok: false; code: string; message: string };

// Aturan ongkos SAMA dengan prototype (computeGroupTotals): per grup farmer.
function groupTotals(subtotal: number): { shippingFee: number; serviceFee: number; total: number } {
  return computeGroupTotals(subtotal);
}

function fail(error: OrderValidationError): CreateOrderResult {
  const code =
    error.code === "EMPTY_CART" ? "EMPTY_CART"
    : error.code === "PRODUCT_NOT_FOUND" ? "PRODUCT_NOT_FOUND"
    : error.code === "PRODUCT_INACTIVE" ? "PRODUCT_INACTIVE"
    : error.code === "INVALID_QUANTITY" ? "INVALID_QUANTITY"
    : error.code === "INSUFFICIENT_STOCK" ? "INSUFFICIENT_STOCK"
    : "BELOW_MIN_ORDER";
  return { ok: false, code, message: orderErrorMessage(error) };
}

export async function createOrders(req: CreateOrderRequest): Promise<CreateOrderResult> {
  if (req.lines.length === 0) return fail({ code: "EMPTY_CART" });

  try {
    return await withTransaction(async (conn) => {
    // Idempotency: kunci yang sama → kembalikan order lama (tanpa duplikat).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dup = await query<any[]>(conn, "SELECT id, group_id FROM orders WHERE idempotency_key = ? ORDER BY created_at", [req.idempotencyKey]);
    if (dup.length > 0) {
      return { ok: true, groupId: dup[0].group_id as string, orderIds: dup.map((d) => d.id as string), deduped: true };
    }

    // Resolve + LOCK stok per produk (FOR UPDATE) sebelum validasi apa pun.
    interface Resolved {
      productId: string; name: string; image: string; price: number; unit: string;
      quantity: number; minOrder: number; stock: number; farmerId: string; farmerName: string; category: string;
    }
    const resolved: Resolved[] = [];
    for (const line of req.lines) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await query<any[]>(
        conn,
        `SELECT p.*, COALESCE(i.quantity, 0) AS stock, f.farm_name AS farmer_farm_name
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
         LEFT JOIN farmers f ON f.id = p.farmer_id
         WHERE p.id = ? LIMIT 1 FOR UPDATE`,
        [line.productId]
      );
      const p = rows[0];
      if (!p) return fail({ code: "PRODUCT_NOT_FOUND", productId: line.productId });
      if (p.status !== "active") {
        return fail({ code: "PRODUCT_INACTIVE", productId: line.productId, name: p.name as string });
      }
      const r: Resolved = {
        productId: p.id as string,
        name: p.name as string,
        image: p.image_url as string,
        price: Number(p.price),
        unit: p.unit as string,
        quantity: line.quantity,
        minOrder: Number(p.min_order),
        stock: Number(p.stock),
        farmerId: p.farmer_id as string,
        farmerName: (p.farmer_farm_name as string) ?? "",
        category: p.category as string,
      };
      const err = validateOrderLine(r);
      if (err) return fail(err);
      resolved.push(r);
    }

    // Group per farmer → order terpisah, satu groupId.
    const groupId = randomUUID();
    const byFarmer = new Map<string, Resolved[]>();
    for (const r of resolved) {
      const list = byFarmer.get(r.farmerId) ?? [];
      list.push(r);
      byFarmer.set(r.farmerId, list);
    }

    const orderIds: string[] = [];
    for (const [farmerId, lines] of byFarmer) {
      const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
      const { shippingFee, serviceFee, total } = groupTotals(subtotal);
      const orderId = randomUUID();
      await execute(
        conn,
        `INSERT INTO orders (id, group_id, buyer_id, farmer_id, farmer_name, status,
          subtotal, shipping_fee, service_fee, total,
          ship_name, ship_phone, ship_email, ship_province, ship_city, ship_district,
          ship_village, ship_address, ship_postal_code, ship_notes,
          courier, courier_service, payment_method, idempotency_key)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, groupId, req.buyerId, farmerId, lines[0].farmerName,
          subtotal, shippingFee, serviceFee, total,
          req.address.fullName, req.address.phone, req.address.email, req.address.province,
          req.address.city, req.address.district, req.address.village, req.address.address,
          req.address.postalCode, req.address.notes ?? null,
          req.courier, req.courierService, req.paymentMethod, req.idempotencyKey]
      );
      for (const l of lines) {
        await execute(
          conn,
          `INSERT INTO order_items (id, order_id, product_id, name_snapshot, image_snapshot, price_snapshot, unit, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), orderId, l.productId, l.name, l.image, l.price, l.unit, l.quantity, l.price * l.quantity]
        );
        // Kurangi stok atomik — baris sudah di-lock; CHECK(quantity>=0) lapis
        // akhir + verifikasi affectedRows eksplisit (lapis tengah).
        const upd = await execute(conn, "UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?", [l.quantity, l.productId]);
        if (upd.affectedRows !== 1) {
          throw new Error(`INSUFFICIENT_STOCK:${l.productId}`);
        }
        await execute(
          conn,
          `INSERT INTO inventory_transactions (id, product_id, quantity_change, resulting_stock, reason, actor_id, reference_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), l.productId, -l.quantity, l.stock - l.quantity, `Order ${orderId}`, req.buyerId, orderId]
        );
      }
      await execute(conn, "INSERT INTO payments (id, order_id, status, amount, method) VALUES (?, ?, 'pending', ?, ?)", [
        randomUUID(), orderId, total, req.paymentMethod,
      ]);
      await execute(
        conn,
        "INSERT INTO shipments (id, order_id, courier, service, status, shipping_cost) VALUES (?, ?, ?, ?, 'pending', ?)",
        [randomUUID(), orderId, req.courier, req.courierService, shippingFee]
      );
      await execute(conn, "INSERT INTO order_status_history (order_id, status, actor) VALUES (?, 'pending', 'system')", [orderId]);
      orderIds.push(orderId);
    }
    return { ok: true, groupId, orderIds, deduped: false };
    });
  } catch (err) {
    // Race langka: validasi lolos tapi stok habis sebelum UPDATE (affectedRows
    // 0) → 409 jujur, bukan 503. Error lain diteruskan ke handler 503.
    if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      const productId = err.message.split(":")[1] ?? "";
      return fail({ code: "INSUFFICIENT_STOCK", productId, name: "produk tersebut", stock: 0, unit: "" });
    }
    throw err;
  }
}

export async function transitionOrder(
  orderId: string,
  actor: OrderActor,
  to: OrderStatus,
  opts: { buyerId?: string; farmerId?: string }
): Promise<{ ok: boolean; error?: string }> {
  // Seluruh transisi atomik dalam satu transaksi: status + history +
  // shipment + kompensasi cancel (stok kembali + refund bila lunas).
  return withTransaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await query<any[]>(tx, "SELECT id, buyer_id, farmer_id, status FROM orders WHERE id = ? LIMIT 1", [orderId]);
    const order = rows[0];
    if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
    if (actor === "farmer" && order.farmer_id !== opts.farmerId) {
      return { ok: false, error: "Bukan pesanan farmer ini." };
    }
    if (actor === "buyer" && order.buyer_id !== opts.buyerId) {
      return { ok: false, error: "Bukan pesanan Anda." };
    }
    if (!canActorTransition(actor, order.status as OrderStatus, to)) {
      return { ok: false, error: `Transisi ${order.status} → ${to} tidak diizinkan.` };
    }
    await execute(tx, "UPDATE orders SET status = ? WHERE id = ?", [to, orderId]);
    await execute(tx, "INSERT INTO order_status_history (order_id, status, actor) VALUES (?, ?, ?)", [orderId, to, actor]);
    if (to === "packed") await execute(tx, "UPDATE shipments SET status = 'picked_up' WHERE order_id = ?", [orderId]);
    if (to === "shipped") {
      const tracking = `TH-${Date.now().toString(36).toUpperCase()}`;
      await execute(tx, "UPDATE shipments SET status = 'in_transit', tracking_number = ?, shipped_at = NOW() WHERE order_id = ?", [tracking, orderId]);
    }
    if (to === "delivered") {
      await execute(tx, "UPDATE shipments SET status = 'delivered', delivered_at = NOW() WHERE order_id = ?", [orderId]);
    }
    if (to === "cancelled") {
      // Kompensasi: kembalikan stok per item + catat CANCELLATION + refund payment.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = await query<any[]>(
        tx, "SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]
      );
      for (const it of items) {
        await execute(tx, "UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?", [
          Number(it.quantity),
          String(it.product_id),
        ]);
        await execute(
          tx,
          `INSERT INTO inventory_transactions (id, product_id, quantity_change, resulting_stock, reason, actor_id, reference_id)
           VALUES (?, ?, ?, (SELECT quantity FROM inventory WHERE product_id = ?), ?, ?, ?)`,
          [randomUUID(), String(it.product_id), Number(it.quantity), String(it.product_id),
            `CANCELLATION: Order ${orderId}`, String(order.buyer_id), orderId]
        );
      }
      await execute(tx, "UPDATE payments SET status = 'refunded' WHERE order_id = ? AND status = 'paid'", [orderId]);
    }
    return { ok: true };
  });
}
