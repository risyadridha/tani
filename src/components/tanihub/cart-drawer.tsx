"use client";

import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Trash2, X, Package, Truck, CreditCard } from "lucide-react";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getSubtotal, getTotalItems } = useCartStore();
  const subtotal = getSubtotal();
  const totalItems = getTotalItems();
  const shipping = subtotal > 500000 ? 0 : 25000;
  const serviceFee = Math.round(subtotal * 0.02);
  const total = subtotal + shipping + serviceFee;

  if (items.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={closeCart}>
        <SheetContent side="right" className="w-full sm:max-w-md lg:max-w-lg p-0">
          <SheetHeader className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Keranjang Belanja</SheetTitle>
                <SheetDescription>{totalItems} item</SheetDescription>
              </div>
              <button onClick={closeCart} className="p-1 hover:bg-muted rounded-lg transition-colors" aria-label="Tutup keranjang">
                <X className="h-5 w-5" />
              </button>
            </div>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Keranjang Kosong</h3>
            <p className="text-muted-foreground mb-6">Belum ada produk di keranjang Anda</p>
            <Button onClick={closeCart} className="w-full sm:w-auto">
              Mulai Belanja
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent side="right" className="w-full sm:max-w-md lg:max-w-lg p-0 flex flex-col h-[calc(100%-2rem)] max-h-[calc(100%-2rem)]">
        <SheetHeader className="p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Keranjang Belanja</SheetTitle>
              <SheetDescription>{totalItems} item</SheetDescription>
            </div>
            <button onClick={closeCart} className="p-1 hover:bg-muted rounded-lg transition-colors" aria-label="Tutup keranjang">
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-medium text-foreground truncate">{item.product.name}</h4>
                  <p className="text-sm text-primary font-semibold">{formatCurrency(item.product.price)} / {item.product.unit}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.product.farmerName} • {item.product.location}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 border border-input rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - item.product.minOrder)}
                      disabled={item.quantity <= item.product.minOrder}
                      className="p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      aria-label="Kurangi"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + item.product.minOrder)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      aria-label="Tambah"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    aria-label="Hapus item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <Separator className="mx-4" />
        <div className="p-6 space-y-4 border-t border-border flex-shrink-0">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({totalItems} item)</span>
              <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Ongkir
              </span>
              <span className="font-medium text-foreground">
                {shipping === 0 ? "Gratis" : formatCurrency(shipping)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Biaya Layanan (2%)
              </span>
              <span className="font-medium text-foreground">{formatCurrency(serviceFee)}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>

          {subtotal < 500000 && (
            <p className="text-xs text-muted-foreground text-center">
              Tambah {formatCurrency(500000 - subtotal)} untuk ongkir gratis
            </p>
          )}

          <Button className="w-full h-12 text-lg" onClick={() => { closeCart(); window.location.href = "/checkout"; }}>
            Checkout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}