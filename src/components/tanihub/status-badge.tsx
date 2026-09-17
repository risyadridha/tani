"use client";

import { cn } from "@/lib/utils";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "disputed";

type ProductStatus = "active" | "low_stock" | "out_of_stock" | "inactive" | "draft";

type VerificationStatus = "pending" | "approved" | "rejected" | "revision_needed";

const orderStatusConfig: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Menunggu", variant: "secondary" },
  confirmed: { label: "Dikonfirmasi", variant: "default" },
  processing: { label: "Diproses", variant: "outline" },
  shipped: { label: "Dikirim", variant: "default" },
  delivered: { label: "Selesai", variant: "secondary" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
  refunded: { label: "Dikembalikan", variant: "destructive" },
  disputed: { label: "Sengketa", variant: "destructive" },
};

const productStatusConfig: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Aktif", variant: "default" },
  low_stock: { label: "Stok Menipis", variant: "secondary" },
  out_of_stock: { label: "Habis", variant: "destructive" },
  inactive: { label: "Nonaktif", variant: "outline" },
  draft: { label: "Draf", variant: "secondary" },
};

const verificationStatusConfig: Record<
  VerificationStatus,
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "Menunggu Verifikasi", variant: "secondary" },
  approved: { label: "Disetujui", variant: "default" },
  rejected: { label: "Ditolak", variant: "destructive" },
  revision_needed: { label: "Perlu Perbaikan", variant: "outline" },
};

interface StatusBadgeProps {
  status: OrderStatus | ProductStatus | VerificationStatus;
  type?: "order" | "product" | "verification";
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  type = "order",
  className,
  showDot = false,
}: StatusBadgeProps) {
  let config:
    | { label: string; variant: BadgeVariant }
    | undefined;

  switch (type) {
    case "order":
      config = orderStatusConfig[status as OrderStatus];
      break;
    case "product":
      config = productStatusConfig[status as ProductStatus];
      break;
    case "verification":
      config = verificationStatusConfig[status as VerificationStatus];
      break;
  }

  if (!config) {
    return <Badge variant="outline" className={className}>{status}</Badge>;
  }

  return (
    <Badge variant={config.variant} className={cn("gap-1", className)}>
      {showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            config.variant === "default" && "bg-primary",
            config.variant === "destructive" && "bg-destructive",
            config.variant === "secondary" && "bg-muted-foreground",
            config.variant === "outline" && "bg-border"
          )}
        />
      )}
      {config.label}
    </Badge>
  );
}

export function OrderStatusBadge({ status, ...props }: { status: OrderStatus } & Omit<StatusBadgeProps, "status" | "type">) {
  return <StatusBadge status={status} type="order" {...props} />;
}

export function ProductStatusBadge({ status, ...props }: { status: ProductStatus } & Omit<StatusBadgeProps, "status" | "type">) {
  return <StatusBadge status={status} type="product" {...props} />;
}

export function VerificationStatusBadge({ status, ...props }: { status: VerificationStatus } & Omit<StatusBadgeProps, "status" | "type">) {
  return <StatusBadge status={status} type="verification" {...props} />;
}