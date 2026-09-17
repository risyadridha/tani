"use client";

import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  unit: string;
  minOrder?: number;
  showMinOrder?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeStyles = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

const unitStyles = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export function PriceDisplay({
  price,
  unit,
  minOrder,
  showMinOrder = true,
  size = "md",
  className,
}: PriceDisplayProps) {
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span className={cn("font-bold text-foreground", sizeStyles[size])}>
        {formattedPrice}
      </span>
      <span className={cn("text-muted-foreground", unitStyles[size])}>
        / {unit}
      </span>
      {showMinOrder && minOrder && minOrder > 1 && (
        <span className={cn("text-muted-foreground ml-1", unitStyles[size])}>
          (Min. {minOrder} {unit})
        </span>
      )}
    </div>
  );
}

interface PriceRangeProps {
  minPrice: number;
  maxPrice: number;
  unit: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceRange({
  minPrice,
  maxPrice,
  unit,
  size = "md",
  className,
}: PriceRangeProps) {
  const formattedMin = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minPrice);

  const formattedMax = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(maxPrice);

  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span className="font-semibold text-foreground">{formattedMin}</span>
      <span className="text-muted-foreground">–</span>
      <span className="font-semibold text-foreground">{formattedMax}</span>
      <span className="text-muted-foreground">/ {unit}</span>
    </div>
  );
}