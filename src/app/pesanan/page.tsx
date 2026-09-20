"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOrderStore } from "@/store/orders";
import { formatCurrency } from "@/lib/utils";
import { Package } from "lucide-react";

export default function PesananPage() {
  const router = useRouter();
  const orders = useOrderStore((s) => s.orders);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="container-wide max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Pesanan Saya
          </h1>
          <p className="text-muted-foreground mb-6">
            Riwayat pesanan di perangkat ini
          </p>

          {orders.length === 0 ? (
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
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-base">{order.id}</CardTitle>
                    <Badge variant="secondary">{order.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString("id-ID")} •{" "}
                      {order.recipientName} • {order.city}
                    </p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={`${order.id}-${item.productId}`}
                          className="flex items-center gap-3"
                        >
                          <div className="relative h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit} ×{" "}
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
