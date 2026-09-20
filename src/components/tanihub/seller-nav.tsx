"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useSellerStore } from "@/store/seller";

const SELLER_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
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

// Gerbang eligibility: USER → APPROVED → FARMER ACTIVE → CAN SELL (spec §32).
// Menolak akses sebelum approval dengan CTA yang jelas, bukan halaman kosong.
export function SellerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const application = useSellerStore((s) => s.application);
  const farmer = useSellerStore((s) => s.farmer);
  const isHydrated = useSellerStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <div className="container-wide max-w-5xl" aria-busy="true">
        <div className="h-10 w-48 rounded-lg bg-muted animate-pulse mb-4" />
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (application?.status !== "approved" || !farmer) {
    return (
      <div className="container-wide max-w-5xl">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Memerlukan akun seller
            </h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {application == null
                ? "Anda belum mengajukan diri sebagai seller. Isi pengajuan terlebih dahulu."
                : application.status === "rejected"
                  ? "Pengajuan Anda perlu diperbaiki sebelum dapat mengakses fitur seller."
                  : "Pengajuan Anda masih dalam peninjauan. Fitur seller terbuka setelah disetujui."}
            </p>
            <Button onClick={() => router.push("/menjual")}>
              {application == null ? "Ajukan Sebagai Seller" : "Lihat Status Pengajuan"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
