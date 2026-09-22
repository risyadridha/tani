"use client";

import { use } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import {
  OrderStateBadge,
  PaymentStateBadge,
  ShipmentStateBadge,
} from "@/components/tanihub/order-badges";
import {
  ORDER_STATUS_LABEL,
  ORDER_TIMELINE,
  canActorTransition,
  type OrderStatus,
  type PaymentStatus,
  type ShipmentStatus,
} from "@/data/order";
import { apiFetch, apiPatch, apiPost, type ApiOrderDetail } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Check, ChevronLeft, Loader2, X } from "lucide-react";

function OrderTimeline({ order }: { order: ApiOrderDetail }) {
  if (order.status === "cancelled") {
    const reached = order.statusHistory.map((h) => h.status);
    return (
      <ol className="space-y-3">
        {ORDER_TIMELINE.filter((s) => reached.includes(s)).map((s) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="text-muted-foreground">{ORDER_STATUS_LABEL[s as OrderStatus]}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <X className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-foreground">Dibatalkan</span>
        </li>
      </ol>
    );
  }
  const currentIdx = ORDER_TIMELINE.indexOf(order.status as OrderStatus);
  return (
    <ol className="space-y-3">
      {ORDER_TIMELINE.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !done && !active && "bg-muted text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={done || active ? "font-medium text-foreground" : "text-muted-foreground"}>
              {ORDER_STATUS_LABEL[s as OrderStatus]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const [order, setOrder] = useState<ApiOrderDetail | null>(null);
  // farmerId milik sesi (server) — tombol aksi farmer hanya tampil bila cocok.
  const [myFarmerId, setMyFarmerId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "denied" | "error">("loading");
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const myId = ++reqId.current;
    try {
      const res = await apiFetch<{ data: ApiOrderDetail }>(`/api/orders/${encodeURIComponent(id)}`);
      if (reqId.current !== myId) return;
      setOrder(res.data);
      setState("ready");
    } catch (err) {
      if (reqId.current !== myId) return;
      // Server sengaja 404 untuk absen MAUPUN tak berhak (tanpa bocorkan bedanya).
      const status = err instanceof Error && "status" in err ? (err as { status: number }).status : 0;
      if (status === 404) setState("missing");
      else {
        setState("error");
        setError(err instanceof Error ? err.message : "Gagal memuat pesanan.");
      }
    }
  }, [id]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const myId = ++reqId.current;
    apiFetch<{ farmer: { id: string } | null }>("/api/seller/status").then(
      (res) => {
        if (reqId.current !== myId) return;
        setMyFarmerId(res.farmer?.id ?? null);
      },
      () => {
        if (reqId.current === myId) setMyFarmerId(null);
      }
    );
    apiFetch<{ data: ApiOrderDetail }>(`/api/orders/${encodeURIComponent(id)}`).then(      (res) => {
        if (reqId.current !== myId) return;
        setOrder(res.data);
        setState("ready");
      },
      (err: unknown) => {
        if (reqId.current !== myId) return;
        const status = err instanceof Error && "status" in err ? (err as { status: number }).status : 0;
        if (status === 404) setState("missing");
        else {
          setState("error");
          setError(err instanceof Error ? err.message : "Gagal memuat pesanan.");
        }
      }
    );
    return () => {
      reqId.current++;
    };
  }, [authStatus, id]);

  const retry = () => {
    setState("loading");
    setError("");
    void load();
  };

  if (authStatus === "unauthenticated") {
    return (
      <div className="container-wide max-w-md text-center py-16">
        <h1 className="text-2xl font-bold text-foreground mb-2">Masuk terlebih dahulu.</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Detail pesanan hanya untuk pemilik akun.
        </p>
        <Button onClick={() => router.push(`/login?returnTo=${encodeURIComponent(`/pesanan/${id}`)}`)}>
          Masuk / Daftar
        </Button>
      </div>
    );
  }

  if (state === "loading" || authStatus === "loading") {
    return (
      <div className="container-wide max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (state === "missing" || (state === "ready" && !order)) {
    return (
      <div className="container-wide max-w-md text-center py-16">
        <h1 className="text-2xl font-bold text-foreground mb-2">Pesanan tidak ditemukan.</h1>
        <p className="text-sm text-muted-foreground mb-6">
          ID salah atau Anda tidak memiliki akses ke pesanan ini.
        </p>
        <Button onClick={() => router.push("/pesanan")}>Kembali ke Pesanan</Button>
      </div>
    );
  }

  if (state === "error" || !order) {
    return (
      <div className="container-wide max-w-md text-center py-16">
        <h1 className="text-2xl font-bold text-foreground mb-2">Pesanan gagal dimuat.</h1>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <Button onClick={retry}>Coba Lagi</Button>
      </div>
    );
  }

  const doTransition = async (to: OrderStatus) => {
    if (acting) return;
    setActing(true);
    try {
      await apiPatch(`/api/orders/${encodeURIComponent(order.id)}/status`, { to });
      toast.success(`Status menjadi "${ORDER_STATUS_LABEL[to]}".`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
    } finally {
      setActing(false);
    }
  };

  const doPay = async () => {
    if (acting) return;
    setActing(true);
    try {
      await apiPost(`/api/orders/${encodeURIComponent(order.id)}/pay`, {});
      toast.success("Pembayaran lunas.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal.");
    } finally {
      setActing(false);
    }
  };

  // Peran dihitung dari relasi order (server yang memutuskan; UI hanya display).
  const buyerCancel = canActorTransition("buyer", order.status as OrderStatus, "cancelled");
  const buyerConfirm = canActorTransition("buyer", order.status as OrderStatus, "delivered");
  const farmerNext = (["confirmed", "processing", "packed", "shipped", "completed"] as const).find((to) =>
    canActorTransition("farmer", order.status as OrderStatus, to)
  );
  // Tombol farmer hanya tampil bila farmer sesi pemilik order ini; server
  // tetap menolak bila bukan (klik tak berguna = pesan error jujur).
  const showFarmerAction = !!farmerNext && !!myFarmerId && !!order && order.farmerId === myFarmerId;

  return (
    <div className="container-wide max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        Kembali
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground font-mono">{order.id.slice(0, 18)}…</h1>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <OrderStateBadge status={order.status as OrderStatus} />
          <PaymentStateBadge status={order.paymentStatus as PaymentStatus} />
          <ShipmentStateBadge status={order.shipmentStatus as ShipmentStatus} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {new Date(order.createdAt).toLocaleString("id-ID")} • {order.farmerName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((it) => (
            <div key={`${order.id}-${it.productId}`} className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={it.image} alt={it.name} fill className="object-cover" sizes="48px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{it.name}</p>
                <p className="text-xs text-muted-foreground">
                  {it.quantity} {it.unit} × {formatCurrency(it.price)}
                </p>
              </div>
              <span className="text-sm font-medium">{formatCurrency(it.subtotal)}</span>
            </div>
          ))}
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ongkir ({order.courier} {order.courierService})</span><span>{order.shippingFee === 0 ? "Gratis" : formatCurrency(order.shippingFee)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Biaya Layanan</span><span>{formatCurrency(order.serviceFee)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatCurrency(order.total)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alamat Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{order.address.fullName}</p>
            <p className="text-muted-foreground">{order.address.phone}</p>
            <p className="text-muted-foreground">
              {order.address.address}, {order.address.village}, {order.address.district},{" "}
              {order.address.city}, {order.address.province} {order.address.postalCode}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Perjalanan</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline order={order} />
            {order.trackingNumber && (
              <p className="text-sm mt-4">
                Resi: <span className="font-mono font-medium">{order.trackingNumber}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {(buyerCancel || buyerConfirm || order.paymentStatus === "pending") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aksi Pembeli</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            {order.paymentStatus === "pending" && order.status !== "cancelled" && (
              <Button onClick={() => void doPay()} disabled={acting}>
                {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Tandai Dibayar (Demo)
              </Button>
            )}
            {buyerConfirm && (
              <Button onClick={() => void doTransition("delivered")} disabled={acting}>
                Konfirmasi Barang Diterima
              </Button>
            )}
            {buyerCancel && (
              <Button
                variant="outline"
                onClick={() => void doTransition("cancelled")}
                disabled={acting}
              >
                Batalkan Pesanan
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showFarmerAction && farmerNext && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aksi Farmer</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void doTransition(farmerNext)} disabled={acting}>
              {
                {
                  confirmed: "Konfirmasi Pesanan",
                  processing: "Mulai Proses",
                  packed: "Tandai Dikemas",
                  shipped: "Kirim + Buat Resi",
                  completed: "Selesaikan Pesanan",
                }[farmerNext]
              }
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <OrderDetailContent id={id} />
      </main>
      <Footer />
    </div>
  );
}
