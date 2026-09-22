import { z } from "zod";

// ---------------------------------------------------------------------------
// TaniHub Order & Fulfillment domain — Sprint 2 (aturan bisnis + validasi).
// Sejak Sprint 4, order dibuat via POST /api/orders dengan buyerId dari sesi
// server; tipe di sini dipakai service, API, dan UI. DEMO_BUYER_ID hanya untuk
// riwayat lokal lama yang belum diklaim.
// ---------------------------------------------------------------------------

export const DEMO_BUYER_ID = "demo-buyer";

// -- Status machines ----------------------------------------------------------
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded";

export type ShipmentStatus = "pending" | "picked_up" | "in_transit" | "delivered" | "failed";

// Satu-satunya definisi transisi valid. Semua UI (buyer + farmer) wajib
// memakai canTransitionOrderStatus — jangan sebar if-status di component.
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function allowedOrderTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

// Pembagian peran (prototype; backend menegakkan via authenticated identity):
// farmer memajukan fulfillment; buyer hanya batal (awal) + konfirmasi terima.
// Aturan bisnis: buyer mengonfirmasi barang diterima (shipped→delivered),
// farmer menutup pesanan (delivered→completed). Tidak ada penutupan sepihak
// sebelum kedua sisi tercatat.
export type OrderActor = "farmer" | "buyer";

const FARMER_TRANSITIONS: readonly (readonly [OrderStatus, OrderStatus])[] = [
  ["pending", "confirmed"],
  ["confirmed", "processing"],
  ["processing", "packed"],
  ["packed", "shipped"],
  ["delivered", "completed"],
];

const BUYER_TRANSITIONS: readonly (readonly [OrderStatus, OrderStatus])[] = [
  ["pending", "cancelled"],
  ["confirmed", "cancelled"],
  ["shipped", "delivered"],
];

export function canActorTransition(
  actor: OrderActor,
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (!canTransitionOrderStatus(from, to)) return false;
  const table = actor === "farmer" ? FARMER_TRANSITIONS : BUYER_TRANSITIONS;
  return table.some(([f, t]) => f === from && t === to);
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  packed: "Dikemas",
  shipped: "Dikirim",
  delivered: "Sampai",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Menunggu Bayar",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluarsa",
  refunded: "Dikembalikan",
};

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "Menunggu",
  picked_up: "Dijemput",
  in_transit: "Dalam Perjalanan",
  delivered: "Terkirim",
  failed: "Gagal Kirim",
};

// Urutan timeline buyer (cancelled ditampilkan sebagai cabang akhir).
export const ORDER_TIMELINE: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "completed",
];

// -- Model --------------------------------------------------------------------
export interface OrderItemSnapshot {
  productId: string;
  name: string;
  image: string;
  price: number; // snapshot saat checkout — tidak mengikuti harga terbaru
  unit: string;
  quantity: number;
  subtotal: number;
}

export interface AddressSnapshot {
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

export interface OrderStatusEntry {
  status: OrderStatus;
  at: string;
  actor: OrderActor | "system";
}

export interface Order {
  id: string;
  groupId: string; // satu checkout multi-farmer → banyak order, satu group
  buyerId: string;
  farmerId: string;
  farmerName: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  shippingFee: number;
  serviceFee: number;
  total: number;
  address: AddressSnapshot;
  courier: string;
  courierService: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  shipmentStatus: ShipmentStatus;
  trackingNumber?: string;
  status: OrderStatus;
  statusHistory: OrderStatusEntry[];
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export function generateOrderId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export function generateIdempotencyKey(): string {
  // crypto.randomUUID bila tersedia; fallback Math.random (tabrakan hanya
  // menyebabkan dedupe[P3] — aman karena respons tetap order valid).
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return uuid.slice(0, 64);
}

// -- Validasi pembuatan order (dipakai store; backend validasi ulang) ----------
export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().gt(0, "Jumlah harus lebih dari 0"),
});

export interface ValidatedOrderLine {
  productId: string;
  name: string;
  image: string;
  price: number;
  unit: string;
  quantity: number;
  minOrder: number;
  stock: number;
  farmerId: string;
  farmerName: string;
  category: string;
}

export type OrderValidationError =
  | { code: "EMPTY_CART" }
  | { code: "PRODUCT_NOT_FOUND"; productId: string }
  | { code: "PRODUCT_INACTIVE"; productId: string; name: string }
  | { code: "INVALID_QUANTITY"; productId: string; name: string }
  | { code: "INSUFFICIENT_STOCK"; productId: string; name: string; stock: number; unit: string }
  | { code: "BELOW_MIN_ORDER"; productId: string; name: string; minOrder: number; unit: string };

// Aturan validasi terpusat (Sprint 2 §11): dipanggil SEBELUM mutasi apa pun
// sehingga validasi gagal = tidak ada order, tidak ada pengurangan stok.
export function validateOrderLine(line: ValidatedOrderLine): OrderValidationError | null {
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
    return { code: "INVALID_QUANTITY", productId: line.productId, name: line.name };
  }
  if (line.quantity > line.stock) {
    return {
      code: "INSUFFICIENT_STOCK",
      productId: line.productId,
      name: line.name,
      stock: line.stock,
      unit: line.unit,
    };
  }
  if (line.quantity < line.minOrder) {
    return {
      code: "BELOW_MIN_ORDER",
      productId: line.productId,
      name: line.name,
      minOrder: line.minOrder,
      unit: line.unit,
    };
  }
  return null;
}

// Aturan ongkos terpusat — dipakai checkout (review), store prototype, dan
// service server. Satu rumus, tidak ada drift: per grup farmer, gratis di
// atas Rp500rb else Rp25rb; jasa 2% subtotal (integer Rupiah).
export function computeGroupTotals(subtotal: number): {
  shippingFee: number;
  serviceFee: number;
  total: number;
} {
  const shippingFee = subtotal > 500000 ? 0 : 25000;
  const serviceFee = Math.round(subtotal * 0.02);
  return { shippingFee, serviceFee, total: subtotal + shippingFee + serviceFee };
}

export function orderErrorMessage(err: OrderValidationError): string {  switch (err.code) {
    case "EMPTY_CART":
      return "Keranjang kosong.";
    case "PRODUCT_NOT_FOUND":
      return "Ada produk yang tidak ditemukan. Muat ulang keranjang.";
    case "PRODUCT_INACTIVE":
      return `"${err.name}" sudah tidak tersedia.`;
    case "INVALID_QUANTITY":
      return `Jumlah "${err.name}" tidak valid.`;
    case "INSUFFICIENT_STOCK":
      return `Stok "${err.name}" tidak mencukupi (tersisa ${err.stock} ${err.unit}).`;
    case "BELOW_MIN_ORDER":
      return `"${err.name}" minimal pembelian ${err.minOrder} ${err.unit}.`;
  }
}
