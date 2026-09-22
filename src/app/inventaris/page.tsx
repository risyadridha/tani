"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/tanihub/status-badge";
import { SellerGate, SellerNav, useSellerIdentity } from "@/components/tanihub/seller-nav";
import { LOW_STOCK_THRESHOLD, stockAdjustSchema, type StockAdjustForm, type EffectiveProductStatus } from "@/data/seller";
import { apiFetch, apiPost } from "@/lib/api";
import { Loader2, Minus, Package, Plus } from "lucide-react";

interface InventoryRow {
  productId: string;
  productName: string | null;
  productStatus: string | null;
  quantity: number;
  unit: string;
  updatedAt: string;
}

interface HistoryEntry {
  id: string;
  change: number;
  resultingStock: number;
  reason: string;
  referenceId: string | null;
  createdAt: string;
}

type AdjustTarget = { productId: string; productName: string; unit: string; mode: "add" | "reduce" } | null;

function effectiveStatus(productStatus: string | null, stock: number): EffectiveProductStatus {
  if (productStatus !== "active") return (productStatus ?? "inactive") as EffectiveProductStatus;
  if (stock <= 0) return "out_of_stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "active";
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("produk");
  const identity = useSellerIdentity();

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<AdjustTarget>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const res = await apiFetch<{ data: InventoryRow[] }>("/api/inventory");
      if (reqId.current !== id) return;
      const list = [...res.data].sort((a, b) =>
        a.productId === focusId ? -1 : b.productId === focusId ? 1 : 0
      );
      setRows(list);
      if (focusId) {
        try {
          const detail = await apiFetch<{ data: { history: HistoryEntry[] } }>(
            `/api/inventory/${encodeURIComponent(focusId)}`
          );
          if (reqId.current !== id) return;
          setHistory(detail.data.history.slice(0, 20));
        } catch {
          if (reqId.current === id) setHistory([]);
        }
      } else {
        setHistory([]);
      }
    } catch (err) {
      if (reqId.current !== id) return;
      setLoadError(err instanceof Error ? err.message : "Gagal memuat inventaris.");
      setRows([]);
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, [focusId]);

  useEffect(() => {
    const id = ++reqId.current;
    apiFetch<{ data: InventoryRow[] }>("/api/inventory").then(
      (res) => {
        if (reqId.current !== id) return;
        const list = [...res.data].sort((a, b) =>
          a.productId === focusId ? -1 : b.productId === focusId ? 1 : 0
        );
        setRows(list);
        setLoadError(null);
        if (!focusId) {
          setHistory([]);
          setLoading(false);
          return;
        }
        apiFetch<{ data: { history: HistoryEntry[] } }>(
          `/api/inventory/${encodeURIComponent(focusId)}`
        ).then(
          (detail) => {
            if (reqId.current !== id) return;
            setHistory(detail.data.history.slice(0, 20));
            setLoading(false);
          },
          () => {
            if (reqId.current !== id) return;
            setHistory([]);
            setLoading(false);
          }
        );
      },
      (err: unknown) => {
        if (reqId.current !== id) return;
        setLoadError(err instanceof Error ? err.message : "Gagal memuat inventaris.");
        setRows([]);
        setLoading(false);
      }
    );
    return () => {
      reqId.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const form = useForm<StockAdjustForm>({
    resolver: zodResolver(stockAdjustSchema),
    mode: "onTouched",
    defaultValues: { quantity: 0, reason: "" },
  });

  if (!identity) return null;

  const openDialog = (row: InventoryRow, mode: "add" | "reduce") => {
    form.reset({ quantity: 0, reason: "" });
    setTarget({ productId: row.productId, productName: row.productName ?? "Produk", unit: row.unit, mode });
  };

  const handleAdjust = async (values: StockAdjustForm) => {
    if (!target || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const delta = target.mode === "add" ? values.quantity : -values.quantity;
      const res = await apiPost<{ data: { productId: string; stock: number } }>(
        `/api/inventory/${encodeURIComponent(target.productId)}/adjust`,
        { delta, reason: values.reason, kind: target.mode === "add" ? "RESTOCK" : "ADJUSTMENT" }
      );
      toast.success(
        target.mode === "add"
          ? `Stok ${target.productName} menjadi ${res.data.stock} ${target.unit}.`
          : `Stok ${target.productName} menjadi ${res.data.stock} ${target.unit}.`
      );
      setTarget(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui stok.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-wide max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Inventaris</h1>
        <p className="text-muted-foreground mt-1">
          Stok menipis pada ≤ {LOW_STOCK_THRESHOLD} per produk. Setiap perubahan tercatat.
        </p>
      </div>

      <SellerNav farmerId={identity.farmerId} />

      {loading ? (
        <div className="h-48 rounded-2xl bg-muted animate-pulse" aria-busy="true" />
      ) : loadError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="font-semibold text-foreground mb-2">Inventaris gagal dimuat.</h2>
            <p className="text-sm text-muted-foreground mb-6">{loadError}</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                setLoadError(null);
                void load();
              }}
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-semibold text-foreground mb-2">Belum ada inventaris.</h2>
            <p className="text-sm text-muted-foreground">
              Inventaris terbentuk otomatis setiap kali produk dibuat.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Stok Produk</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/50">
                {rows.map((r) => (
                  <li key={r.productId} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{r.productName ?? r.productId}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.quantity} {r.unit} tersedia
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={effectiveStatus(r.productStatus, r.quantity)} type="product" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(r, "add")}
                        aria-label={`Tambah stok ${r.productName}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(r, "reduce")}
                        disabled={r.quantity <= 0}
                        aria-label={`Kurangi stok ${r.productName}`}
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        Kurangi
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Riwayat Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {focusId ? "Belum ada perubahan stok produk ini." : "Pilih produk (via Kelola Produk → Stok) untuk melihat riwayat."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="text-sm border-b border-border/50 pb-3 last:border-0">
                      <p className="font-medium text-foreground">
                        {h.change > 0 ? "+" : ""}
                        {h.change}
                      </p>
                      <p className="text-xs text-muted-foreground">{h.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Stok menjadi {h.resultingStock} • {new Date(h.createdAt).toLocaleString("id-ID")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.mode === "add" ? "Tambah stok" : "Kurangi stok"}
              {target ? ` — ${target.productName}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit(handleAdjust)(e);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="inv-qty">Jumlah ({target?.unit}) *</Label>
              <Input id="inv-qty" type="number" min={1} step={1} {...form.register("quantity")} />
              {form.formState.errors.quantity && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="inv-reason">Alasan *</Label>
              <Input
                id="inv-reason"
                placeholder={target?.mode === "add" ? "Contoh: Restock panen" : "Contoh: Penjualan offline"}
                {...form.register("reason")}
              />
              {form.formState.errors.reason && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InventarisPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <SellerGate>
          <InventoryContent />
        </SellerGate>
      </main>
      <Footer />
    </div>
  );
}
