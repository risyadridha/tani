"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { ProductCard } from "@/components/tanihub/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, fetchFarmer, toProduct, type ApiFarmer } from "@/lib/api";
import type { Product } from "@/data/products";
import { useCartStore } from "@/store/cart";
import { useSellerStore } from "@/store/seller";
import {
  Star,
  MapPin,
  CheckCircle2,
  MessageSquare,
  Package,
  ChevronLeft,
  Award,
  Calendar,
  MessageSquareText,
} from "lucide-react";

export default function FarmerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCartStore();
  const farmerId = params.id;
  const sellerFarmer = useSellerStore((s) => s.farmer);

  const [farmer, setFarmer] = useState<ApiFarmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState("");
  const reqId = useRef(0);

  useEffect(() => {
    // Profil seller perangkat ini tanpa round-trip API.
    if (sellerFarmer && sellerFarmer.id === farmerId) return;
    const id = ++reqId.current;
    const ctrl = new AbortController();
    apiFetch<{ data: ApiFarmer & { products: Parameters<typeof toProduct>[0][] } }>(
      `/api/farmers/${encodeURIComponent(farmerId)}`,
      { signal: ctrl.signal }
    )
      .then((res) => {
        if (reqId.current !== id) return;
        const { products: rel, ...f } = res.data;
        setFarmer(f);
        setProducts(rel.map(toProduct));
        setState("ready");
      })
      .catch((err: unknown) => {
        if (reqId.current !== id) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
          setState("missing");
        } else {
          setState("error");
          setError(err instanceof Error ? err.message : "Gagal memuat petani.");
        }
      });
    return () => {
      reqId.current++;
      ctrl.abort();
    };
  }, [farmerId, sellerFarmer]);

  const sellerView = useMemo(() => {
    if (!sellerFarmer || sellerFarmer.id !== farmerId) return null;
    return {
      farmer: {
        id: sellerFarmer.id,
        name: sellerFarmer.name,
        location: sellerFarmer.location,
        verified: true,
        rating: 0,
        reviewCount: 0,
        completedOrders: 0,
        responseRate: 100,
        memberSince: sellerFarmer.memberSince,
        description: sellerFarmer.description,
        farmSize: sellerFarmer.farmSize ?? "-",
        avatar: sellerFarmer.avatar ?? null,
        commodities: sellerFarmer.commodities,
        certifications: [] as string[],
        upcomingHarvests: [] as { crop: string; estimatedDate: string; estimatedQuantity: string }[],
        productCount: 0,
      } satisfies ApiFarmer,
      products: [] as Product[],
    };
  }, [sellerFarmer, farmerId]);

  if (sellerView) {
    return <FarmerDetailView farmer={sellerView.farmer} products={sellerView.products} />;
  }
  if (state === "loading") {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 pt-6 pb-12" aria-busy="true">
          <div className="container-wide space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  if (state === "missing") notFound();
  if (state === "error" || !farmer) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">Petani gagal dimuat.</h1>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Coba Lagi</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  return <FarmerDetailView farmer={farmer} products={products} />;
}

function FarmerDetailView({ farmer, products }: { farmer: ApiFarmer; products: Product[] }) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const hasRating = farmer.reviewCount > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="container-wide">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali
          </Button>

          <Card className="mb-8">
            <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={farmer.avatar ?? undefined} alt={farmer.name} />
                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                  {farmer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">
                    {farmer.name}
                  </h1>
                  {farmer.verified && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Terverifikasi
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {farmer.location}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                  {hasRating ? (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      {farmer.rating.toFixed(1)} ({farmer.reviewCount} ulasan)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Belum ada ulasan</span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    {farmer.completedOrders} pesanan selesai
                  </span>
                  <span className="text-muted-foreground">
                    {products.length} produk • Bergabung {farmer.memberSince}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-3 max-w-2xl">
                  {farmer.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {farmer.commodities.map((c) => (
                    <Badge key={c} variant="outline">
                      {c}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <Button onClick={() => router.push(`/chat/${farmer.id}`)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat Petani
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="produk" className="w-full flex-col">
            <TabsList variant="line" className="flex w-full justify-start gap-6 overflow-x-auto border-b border-border">
              <TabsTrigger value="produk" className="-mb-px flex-none rounded-none px-1 pb-3 text-sm data-[active]:border-b-2 data-[active]:border-primary data-[active]:font-semibold">
                Produk ({products.length})
              </TabsTrigger>
              <TabsTrigger value="tentang" className="-mb-px flex-none rounded-none px-1 pb-3 text-sm data-[active]:border-b-2 data-[active]:border-primary data-[active]:font-semibold">
                Tentang
              </TabsTrigger>
              <TabsTrigger value="ulasan" className="-mb-px flex-none rounded-none px-1 pb-3 text-sm data-[active]:border-b-2 data-[active]:border-primary data-[active]:font-semibold">
                Ulasan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="produk" className="mt-6">
              {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      productId={p.id}
                      image={p.images[0]}
                      name={p.name}
                      grade={p.grade}
                      price={p.price}
                      unit={p.unit}
                      minOrder={p.minOrder}
                      location={p.location}
                      verified={p.farmerVerified}
                      rating={p.rating}
                      reviewCount={p.reviewCount}
                      onAddToCart={() => addItem(p, p.minOrder)}
                      onChat={() =>
                        router.push(`/chat/${p.farmerId}?product=${p.id}`)
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Petani ini belum memiliki produk aktif.
                </p>
              )}
            </TabsContent>

            <TabsContent value="tentang" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Sertifikasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {farmer.certifications.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {farmer.certifications.map((c) => (
                          <Badge key={c} variant="secondary">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada sertifikasi tercatat.
                      </p>
                    )}
                    <Separator className="my-3" />
                    <p className="text-sm text-muted-foreground">
                      Luas lahan:{" "}
                      <span className="text-foreground font-medium">
                        {farmer.farmSize ?? "-"}
                      </span>
                    </p>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Rencana Panen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {farmer.upcomingHarvests.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {farmer.upcomingHarvests.map((h) => (
                          <li
                            key={`${h.crop}-${h.estimatedDate}`}
                            className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
                          >
                            <span className="font-medium text-foreground">
                              {h.crop}
                            </span>
                            <span className="text-muted-foreground">
                              {h.estimatedDate} • {h.estimatedQuantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada jadwal panen tercatat.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ulasan" className="mt-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquareText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <h2 className="font-semibold text-foreground mb-1">
                    Belum ada ulasan.
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Ulasan pembeli akan tampil di sini setelah fitur ulasan tersedia.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
