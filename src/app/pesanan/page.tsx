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
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/data/order";
import { apiFetch, type ApiMeta, type ApiOrderSummary } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Package } from "lucide-react";
import type { PaymentStatus } from "@/data/order";

const FILTERS: { value: string; label: string }[] = [
  { value: "semua", label: "Semua Status" },
  ...(Object.entries(ORDER_STATUS_LABEL) as [OrderStatus, string][]).map(([v, label]) => ({
    value: v,
    label,
  })),
];

export default function PesananPage() {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const [orders, setOrders] = useState<ApiOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("semua");
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter !== "semua") params.set("status", filter);
      const res = await apiFetch<{ data: ApiOrderSummary[]; meta: ApiMeta }>(
        `/api/orders?${params.toString()}`
      );
      if (reqId.current !== id) return;
      setOrders(res.data);
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
    if (authStatus === "unauthenticated") return;
    if (authStatus !== "authenticated") return;
    const params = new URLSearchParams({ limit: "50" });
    if (filter !== "semua") params.set("status", filter);
    const id = ++reqId.current;
    apiFetch<{ data: ApiOrderSummary[]; meta: ApiMeta }>(
      `/api/orders?${params.toString()}`
    ).then(
      (res) => {
        if (reqId.current !== id) return;
        setOrders(res.data);
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
  }, [authStatus, filter]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    void load();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="container-wide max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Pesanan Saya
          </h1>
          <p className="text-muted-foreground mb-6">
            Lacak status pesanan dari semua petani
          </p>

          {authStatus === "loading" || (authStatus === "authenticated" && loading) ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : authStatus === "unauthenticated" ? (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="font-semibold text-foreground mb-2">
                  Masuk untuk melihat pesanan
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Riwayat pesanan terhubung ke akun Anda.
                </p>
                <Button onClick={() => router.push("/login?returnTo=%2Fpesanan")}>
                  Masuk / Daftar
                </Button>
              </CardContent>
            </Card>
          ) : loadError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="font-semibold text-foreground mb-2">Pesanan gagal dimuat.</h3>
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
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  Belum ada pesanan
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Pesanan yang Anda buat dari checkout akan tampil di sini.
                </p>
                <Button onClick={() => router.push("/marketplace")}>
                  Mulai Belanja
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Select value={filter} onValueChange={(v) => setFilter(v ?? "semua")}>
                <SelectTrigger className="h-11 sm:w-56 mb-4" aria-label="Filter status">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  {FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <button
                          onClick={() => router.push(`/pesanan/${order.id}`)}
                          className="font-mono text-sm font-semibold text-foreground hover:underline"
                        >
                          {order.id.slice(0, 13)}…
                        </button>
                        <OrderStateBadge status={order.status as OrderStatus} />
                        <PaymentStateBadge status={order.paymentStatus as PaymentStatus} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {new Date(order.createdAt).toLocaleString("id-ID")} • {order.farmerName}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/pesanan/${order.id}`)}
                        >
                          Lihat Detail
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
