import Link from "next/link";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <SearchX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Halaman tidak ditemukan
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Alamat yang Anda tuju tidak tersedia atau fiturnya belum
              diimplementasikan.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/marketplace">
                <Button>Ke Marketplace</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Beranda</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
