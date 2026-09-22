"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";

export interface SellerIdentity {
  farmerId: string;
  farmName: string;
}

const SellerContext = createContext<SellerIdentity | null>(null);

// Identitas farmer dari server (bukan store lokal) untuk halaman seller.
export function useSellerIdentity(): SellerIdentity | null {
  return useContext(SellerContext);
}

const SELLER_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/pesanan", label: "Pesanan" },
  { href: "/kelola-produk", label: "Produk" },
  { href: "/inventaris", label: "Inventaris" },
];

// Navigasi konsisten antar halaman seller (dashboard/produk/inventaris).
export function SellerNav({ farmerId }: { farmerId: string }) {
  const pathname = usePathname();
  const items = [
    ...SELLER_LINKS,
    { href: `/petani/${farmerId}`, label: "Profil Publik" },
  ];
  return (
    <nav aria-label="Navigasi seller" className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-none rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Gerbang berlapis: login (otoritas server via /me) → status seller SERVER
// (/api/seller/status). Approval lokal tidak lagi dipercaya.
export function SellerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStore((s) => s.status);
  const [status, setStatus] = useState<{
    application: { id: string; status: string; rejectionReason: string | null } | null;
    farmer: { id: string; farmName: string } | null;
  } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const id = ++reqId.current;
    apiFetch<{
      application: { id: string; status: string; rejectionReason: string | null } | null;
      farmer: { id: string; farmName: string } | null;
    }>("/api/seller/status").then(
      (res) => {
        if (reqId.current !== id) return;
        setStatus(res);
        setLoadFailed(false);
        setLoading(false);
      },
      () => {
        if (reqId.current !== id) return;
        setStatus(null);
        setLoadFailed(true);
        setLoading(false);
      }
    );
    return () => {
      reqId.current++;
    };
  }, [authStatus]);

  if (authStatus === "unauthenticated") {
    return (
      <div className="container-wide max-w-5xl">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Masuk terlebih dahulu
            </h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Fitur seller memerlukan akun. Keranjang dan data lain tetap tersimpan.
            </p>
            <Button onClick={() => router.push(`/login?returnTo=${encodeURIComponent(pathname)}`)}>
              Masuk / Daftar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="container-wide max-w-5xl" aria-busy="true">
        <div className="h-10 w-48 rounded-lg bg-muted animate-pulse mb-4" />
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (status?.application?.status !== "approved" || !status?.farmer) {
    const isError = loadFailed && !status;
    return (
      <div className="container-wide max-w-5xl">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isError ? "Status seller gagal dimuat." : "Memerlukan akun seller"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {isError
                ? "Periksa koneksi lalu muat ulang halaman."
                : status?.application == null
                  ? "Anda belum mengajukan diri sebagai seller. Isi pengajuan terlebih dahulu."
                  : status.application.status === "rejected"
                    ? "Pengajuan Anda perlu diperbaiki sebelum dapat mengakses fitur seller."
                    : "Pengajuan Anda masih dalam peninjauan. Fitur seller terbuka setelah disetujui."}
            </p>
            <Button
              onClick={() => {
                if (isError) {
                  window.location.reload();
                } else {
                  router.push("/menjual");
                }
              }}
            >
              {isError
                ? "Muat Ulang"
                : status?.application == null
                  ? "Ajukan Sebagai Seller"
                  : "Lihat Status Pengajuan"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SellerContext.Provider value={{ farmerId: status.farmer.id, farmName: status.farmer.farmName }}>
      {children}
    </SellerContext.Provider>
  );
}
