"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { FarmerCard } from "@/components/tanihub/farmer-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, type ApiFarmer, type ApiMeta } from "@/lib/api";
import { useSellerStore } from "@/store/seller";
import type { SellerFarmer } from "@/data/seller";
import { Search, Loader2 } from "lucide-react";

function sellerToApi(seller: SellerFarmer): ApiFarmer {
  return {
    id: seller.id,
    name: seller.name,
    location: seller.location,
    verified: true,
    rating: 0,
    reviewCount: 0,
    completedOrders: 0,
    responseRate: 100,
    memberSince: seller.memberSince,
    description: seller.description,
    farmSize: seller.farmSize ?? null,
    avatar: seller.avatar ?? null,
    commodities: seller.commodities,
    certifications: [],
    upcomingHarvests: [],
    productCount: 0,
  };
}

export default function PetaniPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [farmers, setFarmers] = useState<ApiFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sellerFarmer = useSellerStore((s) => s.farmer);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (query.trim()) params.set("q", query.trim());
        const res = await apiFetch<{ data: ApiFarmer[]; meta: ApiMeta }>(
          `/api/farmers?${params.toString()}`,
          { signal: ctrl.signal }
        );
        if (reqId.current !== id) return;
        setFarmers(res.data);
      } catch (err) {
        if (reqId.current !== id) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "Gagal memuat petani.");
        setFarmers([]);
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Akun seller perangkat ini tampil paling atas.
  const visible =
    sellerFarmer && !farmers.some((f) => f.id === sellerFarmer.id)
      ? [sellerToApi(sellerFarmer), ...farmers]
      : farmers;

  const retry = () => {
    setLoadError(null);
    setLoading(true);
    const id = ++reqId.current;
    const params = new URLSearchParams({ limit: "50" });
    if (query.trim()) params.set("q", query.trim());
    apiFetch<{ data: ApiFarmer[]; meta: ApiMeta }>(`/api/farmers?${params.toString()}`)
      .then((res) => {
        if (reqId.current !== id) return;
        setFarmers(res.data);
      })
      .catch((err: unknown) => {
        if (reqId.current !== id) return;
        setLoadError(err instanceof Error ? err.message : "Gagal memuat petani.");
      })
      .finally(() => {
        if (reqId.current === id) setLoading(false);
      });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="container-wide">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
              Petani
            </h1>
            <p className="text-muted-foreground mt-1">
              Kenali petani terverifikasi di seluruh Indonesia
            </p>
          </div>

          <div className="relative max-w-md mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, lokasi, komoditas..."
              className="h-12 pl-12"
              aria-label="Cari petani"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Petani gagal dimuat.
              </h3>
              <p className="text-muted-foreground mb-6">{loadError}</p>
              <Button variant="outline" onClick={retry}>
                <Loader2 className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          ) : visible.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {visible.map((f) => (
                <FarmerCard
                  key={f.id}
                  image={f.avatar ?? undefined}
                  name={f.name}
                  location={f.location}
                  verified={f.verified}
                  rating={f.rating}
                  reviewCount={f.reviewCount}
                  completedOrders={f.completedOrders}
                  responseRate={f.responseRate}
                  memberSince={f.memberSince}
                  commodities={f.commodities}
                  onViewProfile={() => router.push(`/petani/${f.id}`)}
                  onChat={() => router.push(`/chat/${f.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Tidak ada petani ditemukan
              </h3>
              <p className="text-muted-foreground">
                Coba ubah kata kunci pencarian Anda
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
