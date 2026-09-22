"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_BUYER_ID, type Order } from "@/data/order";

// ---------------------------------------------------------------------------
// Sisa store order klien: menampung riwayat lokal lama + klaim sekali ke user
// login. Create/transition/pay/order-detail SEMUA via API (Sprint 4); fungsi
// lama yang yatim sudah dipensiunkan (bukan dihapus diam-diam: tidak ada
// consumer tersisa — terverifikasi via grep sebelum penghapusan).
// ---------------------------------------------------------------------------

interface OrderState {
  orders: Order[];
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  // Migrasi demo satu kali: order anonim lama diklaim ke user pertama login.
  claimDemoOrders: (userId: string) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: [],
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      claimDemoOrders: (userId) => {
        if (userId === DEMO_BUYER_ID) return;
        set((state) => ({
          orders: state.orders.map((o) =>
            o.buyerId === DEMO_BUYER_ID ? { ...o, buyerId: userId } : o
          ),
        }));
      },
    }),
    {
      name: "tanihub-orders-v2",
      partialize: (state) => ({ orders: state.orders }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);

export type { Order };
