import { z } from "zod";
import type { Product } from "@/data/products";

// ---------------------------------------------------------------------------
// TaniHub Seller domain — Sprint 1 (Farmer/Seller Ecosystem).
//
// KONDISI: backend/database BELUM ada (confirmed: tidak ada src/app/api,
// tidak ada database client, tidak ada env, tidak ada auth). Modul ini adalah
// data model + business rules yang nantinya mudah dipindahkan ke database.
// UI dan store hanya mengonsumsi tipe/helper di sini, sehingga backend dapat
// masuk tanpa membongkar UI.
//
// Source of truth:
//   Farmer profile      → useSellerStore.farmer (device demo) / mockFarmers
//   Seller application  → useSellerStore.application (satu enum status)
//   Product             → useSellerCatalogStore.products
//   Stock               → product.stock (satu angka + unit per produk)
//   Stock history       → useSellerCatalogStore.history
//   Marketplace display → Product + availability (derived, bukan kolom ganda)
// ---------------------------------------------------------------------------

// -- Application state machine: satu enum, bukan banyak boolean -------------
export type SellerApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export const SELLER_APPLICATION_LABEL: Record<SellerApplicationStatus, string> = {
  draft: "Draf",
  submitted: "Terkirim",
  under_review: "Sedang ditinjau",
  approved: "Disetujui",
  rejected: "Perlu diperbaiki",
};

export interface SellerApplication {
  id: string;
  userId?: string; // pemilik akun terautentikasi (Sprint 3); undefined = pengajuan anonim lama
  fullName: string;
  phone: string;
  email?: string;
  location: string;
  farmName: string;
  farmLocation: string;
  commodities: string;
  description: string;
  farmSize?: string;
  status: SellerApplicationStatus;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  updatedAt: string;
}

// -- Farmer milik seller (dibuat saat application disetujui) -----------------
export interface SellerFarmer {
  id: string;
  userId?: string; // User 1 ─── 0..1 Farmer (otoritas penuh menunggu backend)
  name: string;
  location: string;
  description: string;
  commodities: string[];
  farmName: string;
  farmSize?: string;
  avatar?: string;
  memberSince: string;
  verified: true;
}

// -- Product: status tersimpan vs status turunan ------------------------------
export type StoredProductStatus = "draft" | "active" | "inactive";

export type EffectiveProductStatus =
  | "draft"
  | "active"
  | "low_stock"
  | "out_of_stock"
  | "inactive";

export interface SellerProduct extends Product {
  status: StoredProductStatus;
  createdAt: string;
  updatedAt: string;
}

// Satu-satunya threshold stok menipis — jangan sebar magic number di UI.
export const LOW_STOCK_THRESHOLD = 20;

export const STOCK_UNITS = ["kg", "gram", "pcs", "ikat", "karung", "liter"] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

export const COMMODITY_OPTIONS = [
  "Sayuran",
  "Buah",
  "Beras & Biji-bijian",
  "Rempah & Bumbu",
  "Hasil Peternakan",
  "Hasil Perikanan",
  "Olahan",
] as const;

// Gambar fallback untuk produk seller tanpa foto. Bukan data palsu: hanya
// placeholder visual sampai backend upload tersedia.
export const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80";

// Seluruh codebase hanya memakai images.unsplash.com (lihat next.config.ts
// remotePatterns + semua mock data). Validasi + sanitizer di bawah menjaga
// invariant itu agar next/image tidak pernah menerima host tak terdaftar.
export const ALLOWED_IMAGE_HOSTS = ["images.unsplash.com"] as const;

export function isAllowedImageUrl(url: string): boolean {
  try {
    return (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Sanitasi satu arah untuk data lama (localStorage) yang tersimpan sebelum
// validasi host ada — bukan normalisasi diam-diam untuk input baru.
// Data URL dari file picker (rasterized ke JPEG saat dipilih) selalu lolos.
export function getSafeImageUrl(url: string | undefined): string {
  if (!url) return DEFAULT_PRODUCT_IMAGE;
  if (url.startsWith("data:image/")) return url;
  if (isAllowedImageUrl(url)) return url;
  return DEFAULT_PRODUCT_IMAGE;
}

// OUT_OF_STOCK adalah hasil turunan dari inventory (spec §24), bukan kolom
// yang disimpan — ini mencegah kontradiksi status=ACTIVE + stock=0.
export function getEffectiveStatus(product: Pick<SellerProduct, "status" | "stock">): EffectiveProductStatus {
  if (product.status !== "active") return product.status;
  if (product.stock <= 0) return "out_of_stock";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "active";
}

// Business rule marketplace: produk seller hanya tampil jika farmer approved
// (dijamin oleh SellerGate di UI), status active, dan stok tersedia.
// CATATAN SPRINT 2: filter ini TIDAK memeriksa approval farmer — tidak ada
// duplicate approval state di client dan tidak boleh ada (client bukan
// security boundary). Backend wajib menegakkan eligibility farmer di query
// server; tidak ada revoke path di demo sehingga kondisi ini belum reachable.
export function isAvailableForMarketplace(
  product: Pick<SellerProduct, "status" | "stock">
): boolean {
  return product.status === "active" && product.stock > 0;
}

export function generateSellerId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// -- Inventory history --------------------------------------------------------
export interface InventoryTransaction {
  id: string;
  productId: string;
  change: number; // +masuk, -keluar
  resultingStock: number;
  reason: string;
  reference?: string;
  createdAt: string;
}

// -- Validation (dipakai form seller; backend wajib validasi ulang) ------------
export const sellerApplicationSchema = z.object({
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter").max(100),
  phone: z
    .string()
    .trim()
    .min(10, "Nomor telepon tidak valid")
    .max(15, "Nomor telepon tidak valid")
    .regex(/^[0-9+ ]+$/, "Nomor telepon hanya boleh angka, spasi, dan +"),
  email: z.string().trim().email("Email tidak valid").optional().or(z.literal("")),
  location: z.string().trim().min(3, "Lokasi wajib diisi").max(120),
  farmName: z.string().trim().min(3, "Nama kebun/usaha minimal 3 karakter").max(100),
  farmLocation: z.string().trim().min(3, "Lokasi kebun wajib diisi").max(120),
  commodities: z.string().trim().min(1, "Pilih minimal satu komoditas"),
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(500),
  farmSize: z.string().trim().max(50).optional().or(z.literal("")),
});

export type SellerApplicationForm = z.infer<typeof sellerApplicationSchema>;

export const sellerProductSchema = z
  .object({
    name: z.string().trim().min(3, "Nama produk minimal 3 karakter").max(100),
    category: z.string().min(1, "Kategori wajib dipilih"),
    description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(1000),
    price: z.coerce.number().finite("Harga tidak valid").gt(0, "Harga harus lebih dari 0"),
    unit: z.string().min(1, "Satuan wajib dipilih"),
    stock: z.coerce.number().int("Stok harus bilangan bulat").min(0, "Stok tidak boleh negatif"),
    minOrder: z.coerce.number().int("Min. pembelian harus bilangan bulat").gt(0, "Min. pembelian harus lebih dari 0"),
    location: z.string().trim().min(3, "Lokasi wajib diisi").max(120),
    grade: z.enum(["A", "B", "C"]),
    imageUrl: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || v.startsWith("data:image/") || isAllowedImageUrl(v), {
        message: "Gunakan URL gambar images.unsplash.com, pilih file dari perangkat, atau kosongkan",
      }),
    // "inactive" hanya muncul saat mengedit produk nonaktif (dipertahankan,
    // bukan diubah diam-diam). Form tambah hanya menawarkan draft/active.
    status: z.enum(["draft", "active", "inactive"]),
  })
  .refine((v) => v.minOrder <= Math.max(v.stock, 1) || v.stock === 0, {
    message: "Min. pembelian tidak boleh melebihi stok",
    path: ["minOrder"],
  });

export type SellerProductForm = z.infer<typeof sellerProductSchema>;

export const stockAdjustSchema = z.object({
  quantity: z.coerce.number().int("Jumlah harus bilangan bulat").gt(0, "Jumlah harus lebih dari 0"),
  reason: z.string().trim().min(3, "Alasan wajib diisi").max(200),
});

export type StockAdjustForm = z.infer<typeof stockAdjustSchema>;
