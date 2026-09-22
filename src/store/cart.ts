import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/data/products";

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  addedAt: string;
}

export interface RevalidateResult {
  changed: boolean;
  unknownProductIds: string[];
}

// Kelipatan minOrder dalam [minOrder, stock]. Stok < minOrder → ikut stok
// (server menolak dengan pesan jelas saat checkout).
function clampQuantity(quantity: number, minOrder: number, stock: number): number {
  if (quantity <= 0) return 0;
  if (stock <= 0) return 0;
  if (stock < minOrder) return Math.min(quantity, stock);
  const stepped = minOrder + Math.floor((Math.min(quantity, stock) - minOrder) / minOrder) * minOrder;
  return Math.max(minOrder, stepped);
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  removeByProductIds: (productIds: string[]) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getItemCount: (productId: string) => number;
  setHydrated: (hydrated: boolean) => void;
  // Sinkronkan snapshot cart dengan server (harga/stok/minOrder/status).
  // Dipanggil saat drawer dibuka & sebelum review checkout.
  revalidate: () => Promise<RevalidateResult>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      addItem: (product, quantity = product.minOrder) => {
        const existingItem = get().items.find((item) => item.productId === product.id);
        if (existingItem) {
          set((state) => ({
            items: state.items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
                : item
            ),
          }));
        } else {
          const newItem: CartItem = {
            id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId: product.id,
            product,
            quantity: Math.min(quantity, product.stock),
            addedAt: new Date().toISOString(),
          };
          set((state) => ({ items: [...state.items, newItem] }));
        }
        get().openCart();
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      removeByProductIds: (productIds) => {
        const gone = new Set(productIds);
        set((state) => ({
          items: state.items.filter((item) => !gone.has(item.productId)),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item) return;
        const next = clampQuantity(quantity, item.product.minOrder, item.product.stock);
        if (next <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.id === itemId ? { ...i, quantity: next } : i)),
        }));
      },

      revalidate: async () => {
        const items = get().items;
        if (items.length === 0) return { changed: false, unknownProductIds: [] };
        const ids = [...new Set(items.map((i) => i.productId))];
        let server: { id: string; price: number; stock: number; minOrder: number; status: string; name: string }[];
        try {
          const res = await fetch(`/api/products?ids=${encodeURIComponent(ids.join(","))}&limit=50`);
          if (!res.ok) return { changed: false, unknownProductIds: [] };
          const body = (await res.json()) as { data?: typeof server };
          server = body.data ?? [];
        } catch {
          return { changed: false, unknownProductIds: [] };
        }
        const byId = new Map(server.map((p) => [p.id, p]));
        const unknownProductIds = ids.filter((id) => !byId.has(id));
        let changed = unknownProductIds.length > 0;
        const nextItems = items.map((item) => {
          const s = byId.get(item.productId);
          if (!s) return item;
          const snapshot: Product = {
            ...item.product,
            price: s.price,
            stock: s.stock,
            minOrder: s.minOrder,
            name: s.name,
          };
          if (
            snapshot.price !== item.product.price ||
            snapshot.stock !== item.product.stock ||
            snapshot.minOrder !== item.product.minOrder
          ) {
            changed = true;
          }
          const quantity = clampQuantity(item.quantity, snapshot.minOrder, snapshot.stock);
          if (quantity !== item.quantity) changed = true;
          return { ...item, product: snapshot, quantity };
        });
        set({ items: nextItems });
        return { changed, unknownProductIds };
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      getItemCount: (productId) => {
        const item = get().items.find((item) => item.productId === productId);
        return item?.quantity || 0;
      },
    }),
    {
      name: "tanihub-cart",
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);