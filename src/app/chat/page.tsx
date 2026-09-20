"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFarmerById } from "@/data/farmers";
import { mockProducts } from "@/data/products";
import type { SellerFarmer } from "@/data/seller";
import { useChatStore } from "@/store/chat";
import { useSellerStore } from "@/store/seller";
import { MessageSquare, ChevronRight } from "lucide-react";

function resolveFarmerName(
  farmerId: string,
  seller: SellerFarmer | null
): {
  name: string;
  avatar?: string;
} {
  const farmer = getFarmerById(farmerId);
  if (farmer) return { name: farmer.name, avatar: farmer.avatar };
  if (seller && seller.id === farmerId) return { name: seller.name, avatar: seller.avatar };
  const product = mockProducts.find((p) => p.farmerId === farmerId);
  if (product)
    return { name: product.farmerName, avatar: product.images[0] };
  return { name: farmerId };
}

export default function ChatListPage() {
  const router = useRouter();
  const messagesByFarmer = useChatStore((s) => s.messagesByFarmer);
  const sellerFarmer = useSellerStore((s) => s.farmer);

  const conversations = useMemo(() => {
    return Object.entries(messagesByFarmer)
      .map(([farmerId, messages]) => ({
        farmerId,
        lastMessage: messages[messages.length - 1],
        count: messages.length,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime()
      );
  }, [messagesByFarmer]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="container-wide max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-1">Chat</h1>
          <p className="text-muted-foreground mb-6">
            Riwayat percakapan dengan petani
          </p>

          {conversations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  Belum ada percakapan
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Mulai chat dari halaman produk atau profil petani.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => router.push("/marketplace")}>
                    Cari Produk
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/petani")}
                  >
                    Lihat Petani
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {conversations.map((c) => {
                const farmer = resolveFarmerName(c.farmerId, sellerFarmer);
                return (
                  <Link key={c.farmerId} href={`/chat/${c.farmerId}`}>
                    <Card className="hover:shadow-subtle-hover transition-shadow">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={farmer.avatar}
                            alt={farmer.name}
                          />
                          <AvatarFallback>
                            {farmer.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {farmer.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {c.lastMessage.from === "me" ? "Anda: " : ""}
                            {c.lastMessage.text}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
