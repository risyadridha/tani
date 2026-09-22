"use client";

import { create } from "zustand";
import type { LoginInput, RegisterInput, SafeUser } from "@/data/auth";
import { useOrderStore } from "@/store/orders";

// ---------------------------------------------------------------------------
// Client auth state. OTORITAS = GET /api/auth/me (server), BUKAN localStorage.
// Store ini tidak di-persist: setiap reload memverifikasi ulang ke server.
// Single-flight refresh agar /me tidak dipanggil berulang (satu provider).
// ---------------------------------------------------------------------------

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: SafeUser | null;
  refresh: () => Promise<void>;
  login: (input: LoginInput) => Promise<{ ok: boolean; message?: string }>;
  register: (input: RegisterInput) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

let inflight: Promise<void> | null = null;

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? "Terjadi kesalahan.";
  } catch {
    return "Tidak dapat menghubungi server.";
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,

  refresh: () => {
    if (!inflight) {
      inflight = (async () => {
        try {
          const res = await fetch("/api/auth/me", { cache: "no-store" });
          if (!res.ok) {
            set({ status: "unauthenticated", user: null });
            return;
          }
          const body = (await res.json()) as { data: SafeUser };
          set({ status: "authenticated", user: body.data });
        } catch {
          set({ status: "unauthenticated", user: null });
        } finally {
          inflight = null;
        }
      })();
    }
    return inflight;
  },

  login: async (input) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) return { ok: false, message: await readError(res) };
      const body = (await res.json()) as { data: SafeUser };
      set({ status: "authenticated", user: body.data });
      useOrderStore.getState().claimDemoOrders(body.data.id);
      return { ok: true };
    } catch {
      return { ok: false, message: "Tidak dapat menghubungi server." };
    }
  },

  register: async (input) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) return { ok: false, message: await readError(res) };
      const body = (await res.json()) as { data: SafeUser };
      set({ status: "authenticated", user: body.data });
      useOrderStore.getState().claimDemoOrders(body.data.id);
      return { ok: true };
    } catch {
      return { ok: false, message: "Tidak dapat menghubungi server." };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout lokal tetap dilanjutkan (sesi server sudah dihapus bila tercapai).
    }
    set({ status: "unauthenticated", user: null });
  },
}));
