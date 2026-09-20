"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/store/cart";

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  unit: string;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  serviceFee: number;
  total: number;
  recipientName: string;
  city: string;
  createdAt: string;
  status: "diproses" | "selesai" | "dibatalkan";
}

interface OrderState {
  orders: Order[];
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  addOrder: (order: Omit<Order, "createdAt" | "status">) => Order;
  getOrderById: (id: string) => Order | undefined;
  clearOrders: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      addOrder: (order) => {
        const full: Order = {
          ...order,
          createdAt: new Date().toISOString(),
          status: "diproses",
        };
        set((state) => ({ orders: [full, ...state.orders] }));
        return full;
      },

      getOrderById: (id) => get().orders.find((o) => o.id === id),

      clearOrders: () => set({ orders: [] }),
    }),
    {
      name: "tanihub-orders",
      partialize: (state) => ({ orders: state.orders }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);

export function cartItemsToOrderItems(items: CartItem[]): OrderItem[] {
  return items.map((item) => ({
    productId: item.productId,
    name: item.product.name,
    image: item.product.images[0],
    price: item.product.price,
    unit: item.product.unit,
    quantity: item.quantity,
  }));
}
