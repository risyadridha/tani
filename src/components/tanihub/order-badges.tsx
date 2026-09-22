"use client";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/tanihub/status-badge";
import {
  PAYMENT_STATUS_LABEL,
  SHIPMENT_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
  type ShipmentStatus,
} from "@/data/order";

// Badge terpusat untuk domain order (dipakai halaman buyer + farmer).
export function OrderStateBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge status={status} type="order" />;
}

const paymentVariant: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
  expired: "outline",
  refunded: "destructive",
};

export function PaymentStateBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={paymentVariant[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

const shipmentVariant: Record<ShipmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  picked_up: "outline",
  in_transit: "default",
  delivered: "secondary",
  failed: "destructive",
};

export function ShipmentStateBadge({ status }: { status: ShipmentStatus }) {
  return <Badge variant={shipmentVariant[status]}>{SHIPMENT_STATUS_LABEL[status]}</Badge>;
}
