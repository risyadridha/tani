"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Navbar } from "@/components/tanihub/navbar";
import { ProductCard } from "@/components/tanihub/product-card";
import { PriceDisplay } from "@/components/tanihub/price-display";
import { QuantitySelector } from "@/components/tanihub/quantity-selector";
import { StatusBadge } from "@/components/tanihub/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Star,
  MapPin,
  CheckCircle2,
  Truck,
  MessageSquare,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  Leaf,
  Award,
  User,
} from "lucide-react";
import { Product } from "@/data/products";
import { useCartStore } from "@/store/cart";

interface ProductDetailContentProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailContent({ product, relatedProducts }: ProductDetailContentProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(product.minOrder);
  const [activeTab, setActiveTab] = useState("deskripsi");
  const [isWished, setIsWished] = useState(false);
  const [failedImages, setFailedImages] = useState<ReadonlySet<number>>(new Set());

  // Navigasi antar produk (mis. via "produk terkait") memakai ulang komponen
  // yang sama — reset agar index tidak menunjuk gambar produk sebelumnya.
  useEffect(() => {
    setSelectedImage(0);
    setQuantity(product.minOrder);
    setFailedImages(new Set());
  }, [product.id, product.minOrder]);

  const safeIndex =
    product.images.length === 0
      ? -1
      : Math.min(selectedImage, product.images.length - 1);

  const markImageFailed = (index: number) =>
    setFailedImages((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tautan produk disalin.");
    } catch {
      toast.info("Salin tautan dari address bar browser.");
    }
  };
  const { addItem, openCart } = useCartStore();
  const router = useRouter();

  // Stok di bawah min. pembelian (atau habis) tidak dapat dibeli — inventaris
  // tetap jujur (angka apa adanya), PDP yang menanganinya eksplisit.
  const cannotBuy = product.stock < product.minOrder;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="container-wide">
      {/* Breadcrumb */}
      <nav className="mb-6 lg:mb-8" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <a href="/" className="hover:text-foreground transition-colors">
              Beranda
            </a>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <a href="/marketplace" className="hover:text-foreground transition-colors">
              Marketplace
            </a>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground truncate max-w-[200px]">{product.category}</span>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
            {safeIndex >= 0 && !failedImages.has(safeIndex) ? (
              <Image
                src={product.images[safeIndex]}
                alt={`${product.name} - Gambar ${safeIndex + 1}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                onError={() => markImageFailed(safeIndex)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Package className="h-12 w-12" />
                <p className="text-sm">Gambar tidak tersedia</p>
              </div>
            )}
            {product.farmerVerified && (
              <div className="absolute top-4 right-4">
                <Badge className="gap-1 px-3 py-1.5 bg-primary/90 text-primary-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Petani Terverifikasi
                </Badge>
              </div>
            )}
            {product.grade && (
              <div className="absolute top-4 left-4">
                <Badge
                  className={cn(
                    "px-3 py-1.5",
                    product.grade === "A" && "bg-green-100 text-green-800",
                    product.grade === "B" && "bg-yellow-100 text-yellow-800",
                    product.grade === "C" && "bg-orange-100 text-orange-800"
                  )}
                >
                  Grade {product.grade}
                </Badge>
              </div>
            )}
          </div>

          {product.images.filter((_, i) => !failedImages.has(i)).length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((image, index) => {
                if (failedImages.has(index)) return null;
                return (
                  <button
                    key={`${product.id}-${index}`}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                      safeIndex === index
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                    aria-label={`Lihat gambar ${index + 1}`}
                    aria-current={safeIndex === index ? "true" : "false"}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - Gambar ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                      onError={() => markImageFailed(index)}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Leaf className="h-4 w-4" />
              <span>{product.category}</span>
              {product.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <span className="text-lg font-semibold text-foreground">{product.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({product.reviewCount} ulasan)</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {product.location}
              </span>
            </div>

            {/* Price & Stock */}
            <div className="p-4 bg-muted/50 rounded-xl mb-4">
              <PriceDisplay
                price={product.price}
                unit={product.unit}
                minOrder={product.minOrder}
                size="xl"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Stok tersedia: <span className="font-medium text-foreground">{product.stock} {product.unit}</span>
              </p>
            </div>

            {/* Farmer Info */}
            <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
              <Avatar className="h-12 w-12">
                <AvatarImage src={product.images[0]} alt={product.farmerName} />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {product.farmerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{product.farmerName}</span>
                  {product.farmerVerified && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Terverifikasi
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    {product.farmerRating.toFixed(1)} ({product.farmerReviewCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {product.farmerReviewCount} pesanan
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => router.push(`/chat/${product.farmerId}?product=${product.id}`)}>
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Chat
              </Button>
            </div>
          </div>

          {/* Quantity Selector & Actions */}
          <div className="border-t border-border pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Jumlah</label>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={product.minOrder}
                max={product.stock}
                step={product.minOrder}
                unit={product.unit}
                className="w-full sm:w-64"
                disabled={cannotBuy}
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 text-lg"
                disabled={cannotBuy}
                onClick={() => {
                  addItem(product, quantity);
                  openCart();
                }}
              >
                Tambah ke Keranjang
              </Button>
              <Button
                variant="outline"
                className="h-12 px-6"
                aria-label={isWished ? "Hapus dari favorit" : "Simpan ke favorit"}
                aria-pressed={isWished}
                onClick={() => {
                  setIsWished((v) => {
                    toast.success(v ? "Dihapus dari favorit." : "Disimpan ke favorit.");
                    return !v;
                  });
                }}
              >
                <Heart className={cn("h-5 w-5", isWished && "fill-red-500 text-red-500")} />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-6"
                aria-label="Bagikan produk"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick Info */}
            {cannotBuy && (
              <p className="text-sm text-warning font-medium" role="status">
                {product.stock <= 0
                  ? "Stok produk ini sedang habis."
                  : `Stok tersisa ${product.stock} ${product.unit} — di bawah min. pembelian ${product.minOrder} ${product.unit}.`}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengiriman</p>
                  <p className="text-sm font-medium text-foreground">Kirim dari {product.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Panen</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(product.harvestDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tersedia hingga</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(product.availableUntil)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Min. Order</p>
                  <p className="text-sm font-medium text-foreground">{product.minOrder} {product.unit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-10 lg:mt-14">
          {/* flex-col eksplisit: varian data-horizontal di ui/tabs tidak cocok
              dengan atribut Base UI (data-orientation), sehingga root flex-row
              membuat list & panel tampil sejajar. */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col">
          <TabsList variant="line" className="flex w-full justify-start gap-6 overflow-x-auto border-b border-border">
            <TabsTrigger value="deskripsi" className="-mb-px flex-none rounded-none px-1 pb-3 text-sm data-[active]:border-b-2 data-[active]:border-primary data-[active]:font-semibold">Deskripsi</TabsTrigger>
            <TabsTrigger value="informasi" className="-mb-px flex-none rounded-none px-1 pb-3 text-sm data-[active]:border-b-2 data-[active]:border-primary data-[active]:font-semibold">Informasi Produk</TabsTrigger>
            <TabsTrigger value="panen" className="-mb-px flex-none rounded-none px-1 pb-3 text-sm data-[active]:border-b-2 data-[active]:border-primary data-[active]:font-semibold">Informasi Panen</TabsTrigger>
            <TabsTrigger value="penjual" className="-mb-px flex-none rounded-none px-1 pb-3 text-sm data-[active]:border-b-2 data-[active]:border-primary data-[active]:font-semibold">Penjual</TabsTrigger>
          </TabsList>

          <TabsContent value="deskripsi" className="mt-4">
            <Card>
              <CardContent className="p-5 sm:p-6 space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Deskripsi Produk</h3>
                <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="informasi" className="mt-4">
            <Card>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Informasi Detail</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Nama Produk</dt>
                <dd className="text-foreground">{product.name}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Kategori</dt>
                <dd className="text-foreground">{product.category}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Grade</dt>
                <dd className="text-foreground">Grade {product.grade}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Harga</dt>
                <dd className="text-foreground">{product.price.toLocaleString("id-ID")} / {product.unit}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Minimum Order</dt>
                <dd className="text-foreground">{product.minOrder} {product.unit}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Stok Tersedia</dt>
                <dd className="text-foreground">{product.stock} {product.unit}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Satuan</dt>
                <dd className="text-foreground">{product.unit}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">Lokasi</dt>
                <dd className="text-foreground">{product.location}</dd>
              </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground">Tags</dt>
                  <dd className="text-foreground">{product.tags.join(", ")}</dd>
                </div>
              </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="panen" className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Informasi Panen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tanggal Panen</p>
                      <p className="font-medium text-foreground">{formatDate(product.harvestDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tersedia Sampai</p>
                      <p className="font-medium text-foreground">{formatDate(product.availableUntil)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stok Saat Ini</p>
                      <p className="font-medium text-foreground">{product.stock} {product.unit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Leaf className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Minimum Order</p>
                      <p className="font-medium text-foreground">{product.minOrder} {product.unit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="penjual" className="mt-6 space-y-6">
            <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
              <Avatar className="h-16 w-16">
                <AvatarImage src={product.images[0]} alt={product.farmerName} />
                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                  {product.farmerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">{product.farmerName}</h3>
                  {product.farmerVerified && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Terverifikasi
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {product.farmerReviewCount} ulasan
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    {product.farmerRating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {product.location}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/chat/${product.farmerId}?product=${product.id}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Chat Penjual
                  </Button>
                  <Button size="sm" onClick={() => router.push(`/petani/${product.farmerId}`)}>
                    Lihat Profil
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Produk Lainnya dari Penjual Ini</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedProducts.map((p) => (
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
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Produk Serupa</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
{relatedProducts.map((p) => (
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
                  />
                ))}
          </div>
        </section>
      )}
    </div>
  );
}