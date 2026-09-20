"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { FarmerCard } from "@/components/tanihub/farmer-card";
import { Input } from "@/components/ui/input";
import { mockFarmers, type Farmer } from "@/data/farmers";
import { mockProducts } from "@/data/products";
import type { SellerFarmer } from "@/data/seller";
import { useSellerStore } from "@/store/seller";
import { Search } from "lucide-react";

// Petani yang hanya muncul di products.ts (farmer-6..8) belum ada di
// mockFarmers. Sintesis profil minimal agar tidak 404 dan tetap konsisten.
function getAllFarmers(seller: SellerFarmer | null): Farmer[] {
  const known = new Set(mockFarmers.map((f) => f.id));
  const extra: Farmer[] = mockProducts
    .filter((p) => !known.has(p.farmerId))
    .filter(
      (p, i, arr) => arr.findIndex((x) => x.farmerId === p.farmerId) === i
    )
    .map((p) => ({
      id: p.farmerId,
      name: p.farmerName,
      location: p.location,
      verified: p.farmerVerified,
      rating: p.farmerRating,
      reviewCount: p.farmerReviewCount,
      completedOrders: p.farmerReviewCount,
      responseRate: 90,
      memberSince: "-",
      commodities: [p.category],
      description: `Petani ${p.name} dari ${p.location}.`,
      farmSize: "-",
      certifications: [],
      upcomingHarvests: [],
    }));
  // Akun seller perangkat ini (dibuat saat application disetujui).
  const mine: Farmer[] =
    seller && !known.has(seller.id)
      ? [
          {
            id: seller.id,
            name: seller.name,
            avatar: seller.avatar,
            location: seller.location,
            verified: true,
            rating: 0,
            reviewCount: 0,
            completedOrders: 0,
            responseRate: 100,
            memberSince: seller.memberSince,
            commodities: seller.commodities,
            description: seller.description,
            farmSize: seller.farmSize ?? "-",
            certifications: [],
            upcomingHarvests: [],
          },
        ]
      : [];
  return [...mine, ...mockFarmers, ...extra];
}

export default function PetaniPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const sellerFarmer = useSellerStore((s) => s.farmer);
  const farmers = useMemo(() => getAllFarmers(sellerFarmer), [sellerFarmer]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return farmers;
    return farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.commodities.some((c) => c.toLowerCase().includes(q))
    );
  }, [farmers, query]);

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

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((f) => (
                <FarmerCard
                  key={f.id}
                  image={f.avatar}
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
