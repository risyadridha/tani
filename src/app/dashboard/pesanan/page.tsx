"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStateBadge, PaymentStateBadge } from "@/components/tanihub/order-badges";
import { SellerGate, SellerNav, useSellerIdentity } from "@/components/tanihub/seller-nav";
import { ORDER_STATUS_LABEL, type OrderStatus, type PaymentStatus } from "@/data/order";
import { apiFetch, type ApiMeta, type ApiOrderSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Inbox, Loader2 } from "lucide-react";

const FILTERS = [
  { value: "semua", label: "Semua" },
  { value: "butuh-aksi", label: "Butuh Aksi" },
  ...((Object.entries(ORDER_STATUS_LABEL) as [OrderStatus, string][]).map(([v, label]) => ({
    value: v,
    label,
  }))),
];

function InboxContent() {
  const router = useRouter();
  const identity = useSellerIdentity();
  const [orders, setOrders] = useState<ApiOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("butuh-aksi");
  const reqId = useRef(0);

  // Inbox server: hanya order milik farmer login (otorisasi di API).
  // Fetch di promise callback; retry di bawah set state awal (event handler).
  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter === "butuh-aksi") params.set("actionOnly", "true");
      else if (filter !== "semua") params.set("status", filter);
      const res = await apiFetch<{ data: ApiOrderSummary[]; meta: ApiMeta }>(
        `/api/farmer/orders?${params.toString()}`
      );
      if (reqId.current !== id) return;
      setOrders(res.data);
      setTotal(res.meta.total);
      setLoadError(null);
    } catch (err) {
      if (reqId.current !== id) return;
      setLoadError(err instanceof Error ? err.message : "Gagal memuat pesanan.");
      setOrders([]);
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (filter === "butuh-aksi") params.set("actionOnly", "true");
    else if (filter !== "semua") params.set("status", filter);
    const id = ++reqId.current;
    apiFetch<{ data: ApiOrderSummary[]; meta: ApiMeta }>(
      `/api/farmer/orders?${params.toString()}`
    ).then(
      (res) => {
        if (reqId.current !== id) return;
        setOrders(res.data);
        setTotal(res.meta.total);
        setLoadError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (reqId.current !== id) return;
        setLoadError(err instanceof Error ? err.message : "Gagal memuat pesanan.");
        setOrders([]);
        setLoading(false);
      }
    );
    return () => {
      reqId.current++;
    };
  }, [filter]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    void load();
  };

  if (!identity) return null;

  return (
    <div className="container-wide max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Pesanan Masuk</h1>
        <p className="text-muted-foreground mt-1">
          {total} pesanan untuk {identity.farmName}.
        </p>
      </div>

      <SellerNav farmerId={identity.farmerId} />

      <Select value={filter} onValueChange={(v) => setFilter(v ?? "butuh-aksi")}>
        <SelectTrigger className="h-11 sm:w-56" aria-label="Filter pesanan">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          {FILTERS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="h-48 rounded-2xl bg-muted animate-pulse" aria-busy="true" />
      ) : loadError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="font-semibold text-foreground mb-2">Pesanan gagal dimuat.</h2>
            <p className="text-sm text-muted-foreground mb-6">{loadError}</p>
            <Button variant="outline" onClick={retry}>
              <Loader2 className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-semibold text-foreground mb-2">
              {filter === "semua" ? "Belum ada pesanan masuk." : "Tidak ada pesanan pada filter ini."}
            </h2>
            <p className="text-sm text-muted-foreground">
              Pesanan dari buyer yang membeli produk Anda akan tampil di sini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-semibold">{o.id.slice(0, 13)}…</span>
                  <OrderStateBadge status={o.status as OrderStatus} />
                  <PaymentStateBadge status={o.paymentStatus as PaymentStatus} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {new Date(o.createdAt).toLocaleString("id-ID")}
                  {o.buyerName ? ` • ${o.buyerName}` : ""}
                  {o.buyerCity ? ` • ${o.buyerCity}` : ""}
                </p>
                {o.itemsSummary && (
                  <p className="text-sm truncate mb-3">{o.itemsSummary}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">{formatCurrency(o.total)}</span>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/pesanan/${o.id}`)}>
                    Proses
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FarmerOrdersPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <SellerGate>
          <InboxContent />
        </SellerGate>
      </main>
      <Footer />
    </div>
  );
}
