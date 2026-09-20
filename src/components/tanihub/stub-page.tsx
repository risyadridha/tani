import Link from "next/link";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hammer } from "lucide-react";

interface StubPageProps {
  title: string;
  description: string;
}

// Placeholder jujur untuk rute yang direferensikan navigasi tetapi
// fiturnya belum diimplementasikan. Bukan fitur palsu: halaman ini
// eksplisit menyatakan ketidaktersediaan.
export function StubPage({ title, description }: StubPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Hammer className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Segera hadir
            </p>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">{description}</p>
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
