import { NextResponse } from "next/server";
import { getPool, isDbConfigured, type DbRow } from "@/lib/server/db";
import { orderRepository } from "@/lib/server/repositories/order-repository";
import { error, requireAuth } from "@/lib/server/auth-helpers";
import { farmerRepository } from "@/lib/server/repositories/farmer-repository";

export const runtime = "nodejs";

function mapDetail(r: DbRow) {
  return {
    id: r.id,
    groupId: r.group_id,
    farmerId: r.farmer_id,
    farmerName: r.farmer_name,
    status: r.status,
    paymentStatus: r.payment_status ?? "pending",
    paidAt: r.paid_at ?? null,
    shipmentStatus: r.shipment_status ?? "pending",
    trackingNumber: r.tracking_number ?? null,
    items: ((r.items ?? []) as DbRow[]).map((i) => ({
      productId: i.productId,
      name: i.name,
      image: i.image,
      price: Number(i.price),
      unit: i.unit,
      quantity: Number(i.quantity),
      subtotal: Number(i.subtotal),
    })),
    subtotal: Number(r.subtotal),
    shippingFee: Number(r.shipping_fee),
    serviceFee: Number(r.service_fee),
    total: Number(r.total),
    address: {
      fullName: r.ship_name, phone: r.ship_phone, email: r.ship_email,
      province: r.ship_province, city: r.ship_city, district: r.ship_district,
      village: r.ship_village, address: r.ship_address, postalCode: r.ship_postal_code,
      notes: r.ship_notes ?? undefined,
    },
    courier: r.courier,
    courierService: r.courier_service,
    paymentMethod: r.payment_method,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/orders/:id — pemilik buyer ATAU farmer pemilik (selain itu 404,
// tanpa membocorkan keberadaan resource ke pihak tak berhak).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const { id } = await ctx.params;
  try {
    const pool = getPool();
    const order = await orderRepository.findById(pool, id);
    if (!order) return error("NOT_FOUND", "Pesanan tidak ditemukan.", 404);
    const isBuyer = order.buyer_id === auth.user.id;
    let isFarmer = false;
    if (!isBuyer) {
      const farmer = await farmerRepository.findByUserId(pool, auth.user.id);
      isFarmer = !!farmer && farmer.id === order.farmer_id;
    }
    if (!isBuyer && !isFarmer) return error("NOT_FOUND", "Pesanan tidak ditemukan.", 404);
    const history = await orderRepository.history(pool, id);
    return NextResponse.json({ data: { ...mapDetail(order), statusHistory: history } });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
