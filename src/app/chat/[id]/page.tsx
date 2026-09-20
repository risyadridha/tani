"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  notFound,
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatCurrency } from "@/lib/utils";
import { getFarmerById } from "@/data/farmers";
import { getProductById, mockProducts } from "@/data/products";
import { useChatStore, type ChatMessage } from "@/store/chat";
import { useSellerStore } from "@/store/seller";
import { useSellerCatalogStore } from "@/store/seller-catalog";
import { ChevronLeft, Send } from "lucide-react";

const EMPTY_MESSAGES: ChatMessage[] = [];

const AUTO_REPLIES = [
  "Halo, terima kasih sudah menghubungi. Ada yang bisa saya bantu?",
  "Stok masih tersedia. Mau pesan berapa banyak?",
  "Bisa kirim hari ini kalau order sebelum jam 15:00.",
  "Harga sudah termasuk sortir grade A. Pengiriman dari lokasi kami.",
];

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const farmerId = params.id;
  const productId = searchParams.get("product");

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = useChatStore((s) => s.messagesByFarmer[farmerId]);
  const messages = conversation ?? EMPTY_MESSAGES;
  const sendMessage = useChatStore((s) => s.sendMessage);
  const receiveMessage = useChatStore((s) => s.receiveMessage);
  const sellerFarmer = useSellerStore((s) => s.farmer);
  const sellerProducts = useSellerCatalogStore((s) => s.products);

  const farmer = useMemo(() => {
    const found = getFarmerById(farmerId);
    if (found) return { id: found.id, name: found.name, avatar: found.avatar };
    // Seller dari Seller Ecosystem (source of truth: useSellerStore.farmer).
    if (sellerFarmer && sellerFarmer.id === farmerId) {
      return { id: sellerFarmer.id, name: sellerFarmer.name, avatar: sellerFarmer.avatar };
    }
    const product = mockProducts.find((p) => p.farmerId === farmerId);
    if (product)
      return {
        id: product.farmerId,
        name: product.farmerName,
        avatar: product.images[0],
      };
    const mine = sellerProducts.find((p) => p.farmerId === farmerId);
    if (mine)
      return { id: mine.farmerId, name: mine.farmerName, avatar: mine.images[0] };
    return undefined;
  }, [farmerId, sellerFarmer, sellerProducts]);

  const contextProduct = useMemo(
    () => (productId ? (getProductById(productId) ?? sellerProducts.find((p) => p.id === productId)) : undefined),
    [productId, sellerProducts]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  if (!farmer) {
    notFound();
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendMessage(farmerId, text, productId ?? undefined);
    setDraft("");

    // Balasan otomatis mock agar alur bisa diverifikasi end-to-end.
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      const reply =
        AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      receiveMessage(farmerId, reply);
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12">
        <div className="container-wide max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={farmer.avatar} alt={farmer.name} />
              <AvatarFallback>
                {farmer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link
                href={`/petani/${farmer.id}`}
                className="font-semibold text-foreground hover:underline truncate block"
              >
                {farmer.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                Online • balasan otomatis (mode demo)
              </p>
            </div>
          </div>

          {contextProduct && (
            <Card className="mb-4">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={contextProduct.images[0]}
                    alt={contextProduct.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contextProduct.name}
                  </p>
                  <p className="text-sm text-primary font-semibold">
                    {formatCurrency(contextProduct.price)} /{" "}
                    {contextProduct.unit}
                  </p>
                </div>
                <Link href={`/produk/${contextProduct.id}`}>
                  <Button variant="outline" size="sm">
                    Lihat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="mb-4">
            <CardContent className="p-4 space-y-3 min-h-[300px] max-h-[480px] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Belum ada pesan. Sapa petani untuk menanyakan stok, harga,
                  atau pengiriman.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.from === "me" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                        m.from === "me"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </CardContent>
          </Card>

          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Tanya ${farmer.name}...`}
              aria-label="Tulis pesan"
              maxLength={500}
            />
            <Button type="submit" disabled={!draft.trim()}>
              <Send className="h-4 w-4 mr-1" />
              Kirim
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
