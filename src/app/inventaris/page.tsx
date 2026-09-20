"use client";

import { useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/tanihub/status-badge";
import { SellerGate, SellerNav } from "@/components/tanihub/seller-nav";
import { LOW_STOCK_THRESHOLD, getEffectiveStatus, stockAdjustSchema, type StockAdjustForm } from "@/data/seller";
import { useSellerStore } from "@/store/seller";
import { useSellerCatalogStore } from "@/store/seller-catalog";
import { Loader2, Minus, Package, Plus } from "lucide-react";

type AdjustTarget = { productId: string; mode: "add" | "reduce" } | null;

function InventoryContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("produk");
  const farmer = useSellerStore((s) => s.farmer);
  const products = useSellerCatalogStore((s) => s.products);
  const history = useSellerCatalogStore((s) => s.history);
  const isHydrated = useSellerCatalogStore((s) => s.isHydrated);
  const adjustStock = useSellerCatalogStore((s) => s.adjustStock);

  const [target, setTarget] = useState<AdjustTarget>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myProducts = useMemo(() => {
    const list = farmer ? products.filter((p) => p.farmerId === farmer.id) : [];
    if (!focusId) return list;
    // Produk dari deep-link tampil paling atas agar mudah ditemukan.
    return [...list].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0));
  }, [products, farmer, focusId]);

  const recentHistory = useMemo(() => history.slice(0, 20), [history]);

  const form = useForm<StockAdjustForm>({
    resolver: zodResolver(stockAdjustSchema),
    mode: "onTouched",
    defaultValues: { quantity: 0, reason: "" },
  });

  if (!farmer) return null;
  const targetProduct = target ? myProducts.find((p) => p.id === target.productId) : undefined;

  const openDialog = (productId: string, mode: "add" | "reduce") => {
    form.reset({ quantity: 0, reason: "" });
    setTarget({ productId, mode });
  };

  const handleAdjust = (values: StockAdjustForm) => {
    if (!target || !targetProduct || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const delta = target.mode === "add" ? values.quantity : -values.quantity;
      const res = adjustStock(targetProduct.id, farmer.id, delta, values.reason);
      if (!res.ok) {
        toast.error(res.error ?? "Gagal memperbarui stok.");
        return;
      }
      toast.success(
        target.mode === "add"
          ? `Stok ${targetProduct.name} bertambah ${values.quantity} ${targetProduct.unit}.`
          : `Stok ${targetProduct.name} berkurang ${values.quantity} ${targetProduct.unit}.`
      );
      setTarget(null);
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

      <SellerNav farmerId={farmer.id} />

      {!isHydrated ? (
        <div className="h-48 rounded-2xl bg-muted animate-pulse" aria-busy="true" />
      ) : myProducts.length === 0 ? (
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
                {myProducts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.stock} {p.unit} tersedia
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={getEffectiveStatus(p)} type="product" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(p.id, "add")}
                        aria-label={`Tambah stok ${p.name}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(p.id, "reduce")}
                        disabled={p.stock <= 0}
                        aria-label={`Kurangi stok ${p.name}`}
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
              {recentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada perubahan stok.</p>
              ) : (
                <ul className="space-y-3">
                  {recentHistory.map((h) => {
                    const p = myProducts.find((x) => x.id === h.productId);
                    return (
                      <li key={h.id} className="text-sm border-b border-border/50 pb-3 last:border-0">
                        <p className="font-medium text-foreground">
                          {h.change > 0 ? "+" : ""}
                          {h.change} {p?.unit ?? ""}{" "}
                          <span className="font-normal text-muted-foreground">
                            • {p?.name ?? "Produk dihapus"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{h.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Stok menjadi {h.resultingStock} • {new Date(h.createdAt).toLocaleString("id-ID")}
                        </p>
                      </li>
                    );
                  })}
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
              {targetProduct ? ` — ${targetProduct.name}` : ""}
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
              <Label htmlFor="inv-qty">Jumlah ({targetProduct?.unit}) *</Label>
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
