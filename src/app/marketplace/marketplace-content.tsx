"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import { Search, Filter, X, ChevronDown, Loader2 } from "lucide-react";
import { mockProducts, mockCategories, mockLocations } from "@/data/products";
import { isAvailableForMarketplace } from "@/data/seller";
import { useCartStore } from "@/store/cart";
import { useSellerCatalogStore } from "@/store/seller-catalog";

export function MarketplaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCartStore();
  // Single source of truth: katalog mock + produk seller yang memenuhi
  // business rule (active + stok > 0). Satu daftar, tidak ada dua sistem.
  // Selector mengambil referensi array (stabil) — filter di useMemo.
  const sellerProducts = useSellerCatalogStore((s) => s.products);
  const allProducts = useMemo(
    () => [...mockProducts, ...sellerProducts.filter(isAvailableForMarketplace)],
    [sellerProducts]
  );

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "Semua");
  const [location, setLocation] = useState(searchParams.get("location") || "Semua Lokasi");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "terbaru");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [showFilters, setShowFilters] = useState(false);

  const handleAddToCart = useCallback((product: typeof mockProducts[0]) => {
    addItem(product, product.minOrder);
  }, [addItem]);

  const handleChat = useCallback(
    (product: typeof mockProducts[0]) => {
      router.push(`/chat/${product.farmerId}?product=${product.id}`);
    },
    [router]
  );

  const handleCategoryChange = useCallback((value: string | null) => {
    setCategory(value ?? "");
  }, []);

  const handleLocationChange = useCallback((value: string | null) => {
    setLocation(value ?? "");
  }, []);

  const handleSortChange = useCallback((value: string | null) => {
    setSortBy(value ?? "");
  }, []);

  const handleCategoryChangeSidebar = useCallback((value: string | null) => {
    setCategory(value ?? "");
  }, []);

  const handleLocationChangeSidebar = useCallback((value: string | null) => {
    setLocation(value ?? "");
  }, []);

  const handleSortChangeSidebar = useCallback((value: string | null) => {
    setSortBy(value ?? "");
  }, []);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase()) ||
        product.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));

      const matchesCategory = category === "Semua" || product.category === category;
      const matchesLocation = location === "Semua Lokasi" || product.location.includes(location);
      const matchesMinPrice = !minPrice || product.price >= parseInt(minPrice);
      const matchesMaxPrice = !maxPrice || product.price <= parseInt(maxPrice);

      return matchesQuery && matchesCategory && matchesLocation && matchesMinPrice && matchesMaxPrice;
    });
  }, [allProducts, query, category, location, minPrice, maxPrice]);

  const sortedProducts = useMemo(() => {
    const products = [...filteredProducts];
    switch (sortBy) {
      case "termurah":
        return products.sort((a, b) => a.price - b.price);
      case "termahal":
        return products.sort((a, b) => b.price - a.price);
      case "rating":
        return products.sort((a, b) => b.rating - a.rating);
      case "terlaris":
        return products.sort((a, b) => b.reviewCount - a.reviewCount);
      default:
        return products;
    }
  }, [filteredProducts, sortBy]);

  const hasActiveFilters = category !== "Semua" || location !== "Semua Lokasi" || minPrice || maxPrice;

  const updateUrl = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "Semua") params.set("category", category);
    if (location !== "Semua Lokasi") params.set("location", location);
    if (sortBy !== "terbaru") params.set("sort", sortBy);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    // replace (bukan push) agar mengetik filter tidak menumpuk history browser.
    router.replace(`/marketplace?${params.toString()}`);
  };

  useEffect(() => {
    const timer = setTimeout(updateUrl, 300);
    return () => clearTimeout(timer);
  }, [query, category, location, sortBy, minPrice, maxPrice]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl();
  };

  const clearFilters = () => {
    setCategory("Semua");
    setLocation("Semua Lokasi");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("terbaru");
  };

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
              onChange={(e) => setQuery(e.target.value)}
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

        {/* Filter Bar - Desktop */}
        <div className={cn("mt-4 flex flex-wrap items-center gap-3", showFilters ? "block" : "lg:block hidden")}>
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
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-28 h-10"
              aria-label="Harga minimum"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
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
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="flex-1 h-10"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
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
            <p className="text-sm text-muted-foreground">
              {sortedProducts.length} produk ditemukan
            </p>
          </div>

          {sortedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProducts.map((product, index) => (
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

          {/* Pagination */}
          {sortedProducts.length > 12 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="default" size="icon">
                1
              </Button>
              <Button variant="outline" size="icon">
                2
              </Button>
              <Button variant="outline" size="icon">
                3
              </Button>
              <Button variant="outline" size="icon">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}