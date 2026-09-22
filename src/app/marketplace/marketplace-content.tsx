"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/tanihub/navbar";
import { ProductCard } from "@/components/tanihub/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, Filter, X, ChevronDown, ChevronLeft, Loader2 } from "lucide-react";
import { mockCategories, mockLocations, type Product } from "@/data/products";
import { apiFetch, toProduct, type ApiMeta, type ApiProduct } from "@/lib/api";
import { useCartStore } from "@/store/cart";

const PAGE_SIZE = 12;

export function MarketplaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCartStore();

  // Source of truth: GET /api/products (MySQL). Filter dikirim sebagai query.
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "Semua");
  const [location, setLocation] = useState(searchParams.get("location") || "Semua Lokasi");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "terbaru");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [showFilters, setShowFilters] = useState(false);

  const handleAddToCart = useCallback((product: Product) => {
    addItem(product, product.minOrder);
  }, [addItem]);

  const handleChat = useCallback(
    (product: Product) => {
      router.push(`/chat/${product.farmerId}?product=${product.id}`);
    },
    [router]
  );

  const handleCategoryChange = useCallback((value: string | null) => {
    setCategory(value ?? "");
    setPage(1);
  }, []);

  const handleLocationChange = useCallback((value: string | null) => {
    setLocation(value ?? "");
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: string | null) => {
    setSortBy(value ?? "");
    setPage(1);
  }, []);

  const handleCategoryChangeSidebar = useCallback((value: string | null) => {
    setCategory(value ?? "");
    setPage(1);
  }, []);

  const handleLocationChangeSidebar = useCallback((value: string | null) => {
    setLocation(value ?? "");
    setPage(1);
  }, []);

  const handleSortChangeSidebar = useCallback((value: string | null) => {
    setSortBy(value ?? "");
    setPage(1);
  }, []);

  const filteredParams = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "Semua") params.set("category", category);
    if (location !== "Semua Lokasi") params.set("location", location);
    if (sortBy !== "terbaru") params.set("sort", sortBy);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    return params;
  }, [query, category, location, sortBy, minPrice, maxPrice, page]);

  // Fetch dengan guard race (requestId) + abort agar respons basi diabaikan.
  useEffect(() => {
    const id = ++requestId.current;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      // replace (bukan push) agar mengetik filter tidak menumpuk history.
      router.replace(`/marketplace?${filteredParams().toString()}`);
      try {
        const res = await apiFetch<{ data: ApiProduct[]; meta: ApiMeta }>(
          `/api/products?${filteredParams().toString()}`,
          { signal: ctrl.signal }
        );
        if (requestId.current !== id) return;
        setProducts(res.data.map(toProduct));
        setTotal(res.meta.total);
      } catch (err) {
        if (requestId.current !== id) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "Gagal memuat produk.");
        setProducts([]);
        setTotal(0);
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [filteredParams, router]);

  // Ganti filter → kembali ke halaman 1.
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("Semua");
    setLocation("Semua Lokasi");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("terbaru");
    setPage(1);
  };

  const hasActiveFilters =
    query.trim() !== "" || category !== "Semua" || location !== "Semua Lokasi" || minPrice || maxPrice;

  return (
    <div className="container-wide">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Temukan hasil tani segar langsung dari petani di seluruh Indonesia
        </p>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari produk, petani, komoditas..."
              className="h-12 pl-12 pr-4 text-base lg:h-12"
            />
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Filter Bar - hanya mobile (dibuka via tombol Filter).
            Desktop memakai panel sidebar agar tidak ada kontrol duplikat. */}
        <div className={cn("mt-4 flex-col gap-3 lg:hidden", showFilters ? "flex" : "hidden")}>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-10 w-full sm:w-48">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {mockCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={location} onValueChange={handleLocationChange}>
            <SelectTrigger className="h-10 w-full sm:w-56">
              <SelectValue placeholder="Lokasi" />
            </SelectTrigger>
            <SelectContent>
              {mockLocations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setPage(1);
              }}
              className="w-28 h-10"
              aria-label="Harga minimum"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
              className="w-28 h-10"
              aria-label="Harga maksimum"
            />
          </div>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="h-10 w-full sm:w-44">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="terbaru">Terbaru</SelectItem>
              <SelectItem value="termurah">Termurah</SelectItem>
              <SelectItem value="termahal">Termahal</SelectItem>
              <SelectItem value="rating">Rating Tertinggi</SelectItem>
              <SelectItem value="terlaris">Terlaris</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Hapus Filter
            </Button>
          )}
        </div>
      </form>

      {/* Results */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Mobile Filter Sheet */}
        <aside className="lg:w-64 flex-shrink-0 lg:block hidden">
          <div className="sticky top-24 space-y-6 p-4 bg-card border border-border rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Filter</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 p-0">
                  <X className="h-3.5 w-3.5" />
                  Hapus
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Kategori</label>
                <Select value={category} onValueChange={handleCategoryChangeSidebar}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Lokasi</label>
                <Select value={location} onValueChange={handleLocationChangeSidebar}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Semua Lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Harga (Rp/kg)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => {
                setMinPrice(e.target.value);
                setPage(1);
              }}
                    className="flex-1 h-10"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
                    className="flex-1 h-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Urutkan</label>
                <Select value={sortBy} onValueChange={handleSortChangeSidebar}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Terbaru" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terbaru">Terbaru</SelectItem>
                    <SelectItem value="termurah">Termurah</SelectItem>
                    <SelectItem value="termahal">Termahal</SelectItem>
                    <SelectItem value="rating">Rating Tertinggi</SelectItem>
                    <SelectItem value="terlaris">Terlaris</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {loading ? "Memuat produk..." : `${total} produk ditemukan`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="text-center py-16 lg:py-24">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Produk gagal dimuat.
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{loadError}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setLoadError(null);
                  setLoading(true);
                  const id = ++requestId.current;
                  apiFetch<{ data: ApiProduct[]; meta: ApiMeta }>(
                    `/api/products?${filteredParams().toString()}`
                  )
                    .then((res) => {
                      if (requestId.current !== id) return;
                      setProducts(res.data.map(toProduct));
                      setTotal(res.meta.total);
                    })
                    .catch((err: unknown) => {
                      if (requestId.current !== id) return;
                      setLoadError(err instanceof Error ? err.message : "Gagal memuat produk.");
                    })
                    .finally(() => {
                      if (requestId.current === id) setLoading(false);
                    });
                }}
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  productId={product.id}
                  image={product.images[0]}
                  name={product.name}
                  grade={product.grade}
                  price={product.price}
                  unit={product.unit}
                  minOrder={product.minOrder}
                  location={product.location}
                  verified={product.farmerVerified}
                  rating={product.rating}
                  reviewCount={product.reviewCount}
                  onAddToCart={() => handleAddToCart(product)}
                  onChat={() => handleChat(product)}
                  priority={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 lg:py-24">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Tidak ada produk ditemukan
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Coba ubah kata kunci pencarian atau filter Anda
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Hapus Semua Filter
              </Button>
            </div>
          )}

          {/* Pagination nyata dari server */}
          {!loading && !loadError && total > PAGE_SIZE && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2" aria-live="polite">
                Halaman {page} dari {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Halaman berikutnya"
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}