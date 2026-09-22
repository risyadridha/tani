"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_PRODUCT_IMAGE,
  LOW_STOCK_THRESHOLD,
  generateSellerId,
  getEffectiveStatus,
  getSafeImageUrl,
  isAvailableForMarketplace,
  type InventoryTransaction,
  type SellerProduct,
  type SellerProductForm,
  type StoredProductStatus,
} from "@/data/seller";

// ---------------------------------------------------------------------------
// Katalog seller: Product + Inventory dalam SATU store agar tidak ada
// duplicate state (stock hanya hidup di product.stock; history terpisah).
// Semua mutasi menerima farmerId eksplisit dan memverifikasi ownership —
// hari ini single-seller per device, tetapi signature ini adalah titik tempat
// authorization server akan ditegakkan saat backend masuk (spec §33).
//
// Aturan yang dijaga store (bukan hanya UI):
//   - stock tidak pernah negatif (clamp + error)
//   - setiap perubahan stok mencatat InventoryTransaction (qty, reason,
//     timestamp, actor, reference)
// ---------------------------------------------------------------------------

export interface NewSellerProductInput extends SellerProductForm {
  farmerId: string;
  farmerName: string;
  farmerVerified: boolean;
  farmerRating: number;
  farmerReviewCount: number;
}

interface CatalogState {
  products: SellerProduct[];
  history: InventoryTransaction[];
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  addProduct: (input: NewSellerProductInput) => SellerProduct;
  updateProduct: (
    id: string,
    farmerId: string,
    patch: Omit<Partial<SellerProductForm>, "status"> & { status?: StoredProductStatus }
  ) => boolean;
  setProductStatus: (id: string, farmerId: string, status: StoredProductStatus) => boolean;
  adjustStock: (
    id: string,
    farmerId: string,
    delta: number,
    reason: string,
    reference?: string
  ) => { ok: boolean; error?: string };
  getProductById: (id: string) => SellerProduct | undefined;
  getProductsByFarmer: (farmerId: string) => SellerProduct[];
  getMarketplaceProducts: () => SellerProduct[];
  getHistoryByProduct: (productId: string) => InventoryTransaction[];
}

function toSellerProduct(input: NewSellerProductInput): SellerProduct {
  const now = new Date().toISOString();
  const image = input.imageUrl?.trim() || DEFAULT_PRODUCT_IMAGE;
  return {
    id: generateSellerId("my-prod"),
    name: input.name.trim(),
    description: input.description.trim(),
    images: [image],
    grade: input.grade,
    price: input.price,
    unit: input.unit,
    minOrder: input.minOrder,
    stock: input.stock,
    location: input.location.trim(),
    farmerId: input.farmerId,
    farmerName: input.farmerName,
    farmerVerified: input.farmerVerified,
    farmerRating: input.farmerRating,
    farmerReviewCount: input.farmerReviewCount,
    category: input.category,
    tags: ["seller"],
    harvestDate: now.slice(0, 10),
    availableUntil: now.slice(0, 10),
    rating: 0,
    reviewCount: 0,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
}

export const useSellerCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      products: [],
      history: [],
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      addProduct: (input) => {
        const product = toSellerProduct(input);
        const entry: InventoryTransaction = {
          id: generateSellerId("inv"),
          productId: product.id,
          change: product.stock,
          resultingStock: product.stock,
          reason: "Stok awal produk",
          createdAt: product.createdAt,
        };
        set((state) => ({
          products: [product, ...state.products],
          history: [entry, ...state.history],
        }));
        return product;
      },

      updateProduct: (id, farmerId, patch) => {
        const existing = get().products.find((p) => p.id === id);
        if (!existing || existing.farmerId !== farmerId) return false;
        const image = patch.imageUrl !== undefined ? patch.imageUrl.trim() || DEFAULT_PRODUCT_IMAGE : undefined;
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...(patch.name !== undefined && { name: patch.name.trim() }),
                  ...(patch.category !== undefined && { category: patch.category }),
                  ...(patch.description !== undefined && { description: patch.description.trim() }),
                  ...(patch.price !== undefined && { price: patch.price }),
                  ...(patch.unit !== undefined && { unit: patch.unit }),
                  ...(patch.minOrder !== undefined && { minOrder: patch.minOrder }),
                  ...(patch.location !== undefined && { location: patch.location.trim() }),
                  ...(patch.grade !== undefined && { grade: patch.grade }),
                  ...(image !== undefined && { images: [image] }),
                  ...(patch.status !== undefined && { status: patch.status }),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        return true;
      },

      setProductStatus: (id, farmerId, status) => {
        return get().updateProduct(id, farmerId, { status });
      },

      adjustStock: (id, farmerId, delta, reason, reference) => {
        const existing = get().products.find((p) => p.id === id);
        if (!existing || existing.farmerId !== farmerId) {
          return { ok: false, error: "Produk tidak ditemukan." };
        }
        if (!Number.isInteger(delta) || delta === 0) {
          return { ok: false, error: "Jumlah perubahan stok tidak valid." };
        }
        const next = existing.stock + delta;
        if (next < 0) {
          return { ok: false, error: `Stok tidak mencukupi (tersisa ${existing.stock} ${existing.unit}).` };
        }
        const now = new Date().toISOString();
        const entry: InventoryTransaction = {
          id: generateSellerId("inv"),
          productId: id,
          change: delta,
          resultingStock: next,
          reason: reason.trim(),
          reference: reference?.trim() || undefined,
          createdAt: now,
        };
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, stock: next, updatedAt: now } : p
          ),
          history: [entry, ...state.history].slice(0, 500),
        }));
        return { ok: true };
      },

      getProductById: (id) => get().products.find((p) => p.id === id),

      getProductsByFarmer: (farmerId) => get().products.filter((p) => p.farmerId === farmerId),

      getMarketplaceProducts: () => get().products.filter(isAvailableForMarketplace),

      getHistoryByProduct: (productId) =>
        get().history.filter((h) => h.productId === productId),
    }),
    {
      name: "tanihub-seller-catalog",
      partialize: (state) => ({ products: state.products, history: state.history }),
      // Sanitasi satu kali saat rehidrasi: produk yang tersimpan sebelum
      // validasi host ada (URL di luar allowlist) dipetakan ke gambar bawaan
      // agar next/image tidak pernah menerima host tak terdaftar.
      merge: (persisted, current) => {
        const data = (persisted ?? {}) as Partial<CatalogState>;
        const products = Array.isArray(data.products)
          ? data.products.map((p) => ({
              ...p,
              images:
                Array.isArray(p.images) && p.images.length > 0
                  ? [getSafeImageUrl(p.images[0])]
                  : [DEFAULT_PRODUCT_IMAGE],
            }))
          : current.products;
        return {
          ...current,
          ...data,
          products,
          history: Array.isArray(data.history) ? data.history : current.history,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);

// -- Derived helpers (pure, untuk dashboard & badge) ---------------------------
export interface SellerMetrics {
  activeProducts: number;
  draftProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
}

export function computeSellerMetrics(products: Pick<SellerProduct, "status" | "stock" | "price">[]): SellerMetrics {
  let activeProducts = 0;
  let draftProducts = 0;
  let totalStock = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let inventoryValue = 0;
  for (const p of products) {
    if (p.status === "draft") draftProducts += 1;
    if (p.status === "active") {
      activeProducts += 1;
      totalStock += p.stock;
      inventoryValue += p.price * p.stock;
      const eff = getEffectiveStatus(p);
      if (eff === "low_stock") lowStockCount += 1;
      if (eff === "out_of_stock") outOfStockCount += 1;
    }
  }
  return { activeProducts, draftProducts, totalStock, lowStockCount, outOfStockCount, inventoryValue };
}

export function getLowStockProducts<T extends Pick<SellerProduct, "status" | "stock">>(products: T[]): T[] {
  return products.filter(
    (p) => p.status === "active" && p.stock <= LOW_STOCK_THRESHOLD
  );
}
