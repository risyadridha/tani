import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool, isDbConfigured } from "@/lib/server/db";
import { orderRepository } from "@/lib/server/repositories/order-repository";
import { createOrders } from "@/lib/server/services/order-service";
import { error, requireAuth } from "@/lib/server/auth-helpers";

export const runtime = "nodejs";

const listQuery = z.object({
  status: z.enum(["pending", "confirmed", "processing", "packed", "shipped", "delivered", "completed", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOrderList(r: any) {
  return {
    id: r.id,
    groupId: r.group_id,
    farmerId: r.farmer_id,
    farmerName: r.farmer_name,
    buyerName: r.ship_name ?? null,
    buyerCity: r.ship_city ?? null,
    itemsSummary: typeof r.items_summary === "string" ? r.items_summary : "",
    status: r.status,
    paymentStatus: r.payment_status ?? "pending",
    total: Number(r.total),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/orders — hanya milik buyer login (scope = sesi, bukan query).
export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  const url = new URL(req.url);
  const parsed = listQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Query tidak valid.", 400);
  }
  try {
    const { rows, total } = await orderRepository.listByBuyer(
      getPool(), auth.user.id, parsed.data.status ?? null, parsed.data.limit, (parsed.data.page - 1) * parsed.data.limit
    );
    return NextResponse.json({
      data: rows.map(mapOrderList),
      meta: { page: parsed.data.page, limit: parsed.data.limit, total },
    });
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}

const lineSchema = z.object({
  productId: z.string().min(1).max(64),
  // Batas atas 100.000 mencegah typo/abuse tanpa menghambat B2B wajar.
  quantity: z.number().int().gt(0).max(100000),
});

const createSchema = z.object({
  lines: lineSchema.array().min(1).max(50),
  address: z.object({
    fullName: z.string().trim().min(3).max(100),
    phone: z.string().trim().min(10).max(15),
    email: z.string().trim().email().max(190).or(z.literal("")),
    province: z.string().trim().min(1).max(60),
    city: z.string().trim().min(1).max(60),
    district: z.string().trim().min(1).max(60),
    village: z.string().trim().min(1).max(60),
    address: z.string().trim().min(10).max(300),
    postalCode: z.string().regex(/^\d{5}$/, "Kode pos 5 digit"),
    notes: z.string().trim().max(200).optional(),
  }),
  courier: z.string().min(1).max(40),
  courierService: z.string().min(1).max(40),
  paymentMethod: z.string().min(1).max(40),
  idempotencyKey: z.string().min(8).max(64),
});

// POST /api/orders — buyer terautentikasi. Harga dihitung server; buyerId dari sesi.
export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isDbConfigured()) return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Data tidak valid.", 422);
  }
  try {
    const res = await createOrders({
      buyerId: auth.user.id,
      lines: parsed.data.lines,
      address: { ...parsed.data.address, email: parsed.data.address.email || "" },
      courier: parsed.data.courier,
      courierService: parsed.data.courierService,
      paymentMethod: parsed.data.paymentMethod,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (!res.ok) {
      const status =
        res.code === "PRODUCT_NOT_FOUND" ? 404
        : res.code === "EMPTY_CART" ? 400
        : 409;
      return NextResponse.json({ error: { code: res.code, message: res.message } }, { status });
    }
    return NextResponse.json(
      { data: { groupId: res.groupId, orderIds: res.orderIds, deduped: res.deduped } },
      { status: res.deduped ? 200 : 201 }
    );
  } catch {
    return error("DB_UNAVAILABLE", "Layanan tidak tersedia.", 503);
  }
}
