"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateSellerId,
  type SellerApplication,
  type SellerApplicationStatus,
  type SellerFarmer,
} from "@/data/seller";

// ---------------------------------------------------------------------------
// Seller identity + application. Satu source of truth untuk status aplikasi
// (satu enum — bukan banyak boolean). Persist ke localStorage sebagai
// arsitektur sementara pengganti backend (lihat src/data/seller.ts).
//
// CATATAN DEMO: tidak ada auth/user system di codebase (confirmed via grep:
// tidak ada session/login/role). "Seller saat ini" = farmer yang dibuat saat
// approval di perangkat ini. Label mode demo ditampilkan di UI. Saat backend
// masuk, ganti store ini dengan session + API tanpa mengubah UI.
// ---------------------------------------------------------------------------

interface SellerState {
  application: SellerApplication | null;
  farmer: SellerFarmer | null;
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  saveDraft: (data: Omit<SellerApplication, "id" | "status" | "updatedAt">) => void;
  submitApplication: () => void;
  // Simulasi verifikasi manual untuk demo — production diganti review tim
  // via backend. Dinamai eksplisit agar tidak menyamar sebagai verifikasi asli.
  simulateApprove: () => void;
  simulateReject: (reason: string) => void;
  resetAll: () => void;
}

function buildFarmer(app: SellerApplication): SellerFarmer {
  return {
    id: generateSellerId("farmer"),
    name: app.fullName,
    location: app.location,
    description: app.description,
    commodities: app.commodities.split(",").map((c) => c.trim()).filter(Boolean),
    farmName: app.farmName,
    farmSize: app.farmSize || undefined,
    memberSince: String(new Date().getFullYear()),
    verified: true,
  };
}

function touch(app: SellerApplication, patch: Partial<SellerApplication>): SellerApplication {
  return { ...app, ...patch, updatedAt: new Date().toISOString() };
}

export const useSellerStore = create<SellerState>()(
  persist(
    (set, get) => ({
      application: null,
      farmer: null,
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      saveDraft: (data) => {
        const prev = get().application;
        if (prev && prev.status !== "draft" && prev.status !== "rejected") return;
        const base: SellerApplication = {
          ...data,
          id: prev?.id ?? generateSellerId("app"),
          status: "draft",
          rejectionReason: undefined,
          updatedAt: new Date().toISOString(),
        };
        set({ application: prev ? touch(prev, { ...base, id: prev.id }) : base });
      },

      submitApplication: () => {
        const prev = get().application;
        if (!prev || (prev.status !== "draft" && prev.status !== "rejected")) return;
        set({
          application: touch(prev, {
            status: "under_review",
            rejectionReason: undefined,
            submittedAt: new Date().toISOString(),
          }),
        });
      },

      simulateApprove: () => {
        const prev = get().application;
        if (!prev || (prev.status !== "under_review" && prev.status !== "submitted")) return;
        const approved: SellerApplication = touch(prev, {
          status: "approved",
          reviewedAt: new Date().toISOString(),
        });
        // Farmer dibuat tepat sekali dari application yang disetujui.
        set({ application: approved, farmer: get().farmer ?? buildFarmer(approved) });
      },

      simulateReject: (reason) => {
        const prev = get().application;
        if (!prev || (prev.status !== "under_review" && prev.status !== "submitted")) return;
        set({
          application: touch(prev, {
            status: "rejected",
            rejectionReason: reason.trim(),
            reviewedAt: new Date().toISOString(),
          }),
        });
      },

      // Dipakai untuk testing manual; di UI hanya diekspos di area demo.
      resetAll: () => set({ application: null, farmer: null }),
    }),
    {
      name: "tanihub-seller",
      partialize: (state) => ({ application: state.application, farmer: state.farmer }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);

export function getApplicationStatus(app: SellerApplication | null): SellerApplicationStatus | null {
  return app?.status ?? null;
}
