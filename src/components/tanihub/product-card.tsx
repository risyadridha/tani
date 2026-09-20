"use client";

import Image from "next/image";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, CheckCircle2, Truck, MessageSquare } from "lucide-react";

interface ProductCardProps {
  image: string;
  name: string;
  grade: "A" | "B" | "C";
  price: number;
  unit: string;
  minOrder: number;
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  productId: string;
  onAddToCart?: () => void;
  onChat?: () => void;
  className?: string;
  priority?: boolean;
}

export function ProductCard({
  image,
  name,
  grade,
  price,
  unit,
  minOrder,
  location,
  verified,
  rating,
  reviewCount,
  productId,
  onAddToCart,
  onChat,
  className,
  priority = false,
}: ProductCardProps) {
  const gradeColors = {
    A: "bg-green-100 text-green-800 border-green-200",
    B: "bg-yellow-100 text-yellow-800 border-yellow-200",
    C: "bg-orange-100 text-orange-800 border-orange-200",
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "border-border bg-card hover:shadow-subtle-hover",
        "flex flex-col h-full",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading={priority ? undefined : "lazy"}
          priority={priority}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
              gradeColors[grade]
            )}
          >
            Grade {grade}
          </Badge>
          {verified && (
            <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Terverifikasi
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onChat}
            aria-label={`Chat penjual ${name}`}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col p-4 space-y-3">
        <Link href={`/produk/${productId}`} className="block">
          <h3 className="text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-foreground">
            {formatCurrency(price)}
          </span>
          <span className="text-sm text-muted-foreground">/ {unit}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-primary">Min.</span>
            {minOrder} {unit}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-0.5 text-yellow-600">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground">({reviewCount})</span>
        </div>

        <div className="mt-auto flex gap-2 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            className="flex-1 py-2 text-sm"
            onClick={onChat}
            disabled={!onChat}
          >
            Chat
          </Button>
          <Button
            className="flex-1 py-2 text-sm"
            onClick={onAddToCart}
            disabled={!onAddToCart}
          >
            Tambah
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}