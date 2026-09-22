"use client";

import type { Product } from "@/data/products";

// ---------------------------------------------------------------------------
// Klien API terpusat. Mengembalikan body UTUH ({ data, meta? }) agar bentuk
// respons konsisten di semua call site. Same-origin → cookie sesi otomatis.
// Error API { error: { code, message } } dilempar sebagai ApiError.
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
  toJSON() {
    return { code: this.code, status: this.status, message: this.message };
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Periksa koneksi internet Anda lalu coba lagi.", 0);
  }
  let body: { data?: unknown; error?: { code?: string; message?: string } } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new ApiError("BAD_RESPONSE", "Respons server tidak valid.", res.status);
  }
  if (!res.ok) {
    throw new ApiError(body.error?.code ?? "REQUEST_FAILED", body.error?.message ?? "Permintaan gagal.", res.status);
  }
  return body as T;
}

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(path, { signal });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

export interface ApiOrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  unit: string;
  quantity: number;
  subtotal: number;
}

export interface ApiOrderSummary {
  id: string;
  groupId: string;
  farmerId: string;
  farmerName: string;
  buyerName: string | null;
  buyerCity: string | null;
  itemsSummary: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrderDetail extends ApiOrderSummary {
  items: ApiOrderItem[];
  subtotal: number;
  shippingFee: number;
  serviceFee: number;
  address: {
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
  };
  courier: string;
  courierService: string;
  paymentMethod: string;
  paidAt: string | null;
  shipmentStatus: string;
  trackingNumber: string | null;
  statusHistory: { status: string; actor: string; createdAt: string }[];
}

export interface ApiFarmer {
  id: string;
  name: string;
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseRate: number;
  memberSince: string;
  description: string;
  farmSize: string | null;
  avatar: string | null;
  commodities: string[];
  certifications: string[];
  upcomingHarvests: { crop: string; estimatedDate: string; estimatedQuantity: string }[];
  productCount: number;
}

export async function fetchFarmer(id: string, signal?: AbortSignal): Promise<ApiFarmer | null> {
  try {
    const res = await apiFetch<{ data: ApiFarmer & { products: ApiProduct[] } }>(
      `/api/farmers/${encodeURIComponent(id)}`,
      { signal }
    );
    return res.data;
  } catch {
    return null;
  }
}

export interface ApiApplication {
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

export interface ApiProduct {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  farmerVerified: boolean;
  farmerRating: number;
  farmerReviewCount: number;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  grade: "A" | "B" | "C";
  price: number;
  unit: string;
  minOrder: number;
  stock: number;
  status: string;
  location: string;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// Bentuk API → Product domain agar Cart/PDP reuse tanpa perubahan.
// Gambar kosong [""] dinormalisasi ke bawaan (lapis pertahanan klien).
export function toProduct(p: ApiProduct): Product {
  const rawImages = (p.images?.length ?? 0) > 0 ? p.images : [p.image];
  const images = rawImages.filter((u) => typeof u === "string" && u.trim() !== "");
  const fallback = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80";
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    images: images.length > 0 ? images : [fallback],
    grade: p.grade,
    price: p.price,
    unit: p.unit,
    minOrder: p.minOrder,
    stock: p.stock,
    location: p.location,
    farmerId: p.farmerId,
    farmerName: p.farmerName,
    farmerVerified: p.farmerVerified,
    farmerRating: p.farmerRating ?? 0,
    farmerReviewCount: p.farmerReviewCount ?? 0,
    category: p.category,
    tags: [],
    harvestDate: p.createdAt.slice(0, 10),
    availableUntil: p.createdAt.slice(0, 10),
    rating: p.rating,
    reviewCount: p.reviewCount,
  };
}
