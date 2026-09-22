"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

// Satu-satunya pemicu verifikasi sesi (single-flight di store).
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const refresh = useAuthStore((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return <>{children}</>;
}
