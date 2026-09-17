import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Leaf, Truck, Shield, Star, Users } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Langsung dari Petani",
    description: "Beli langsung tanpa perantara, harga lebih adil untuk petani dan pembeli.",
  },
  {
    icon: Shield,
    title: "Petani Terverifikasi",
    description: "Setiap petani diverifikasi identitas, lahan, dan kualitas produksi.",
  },
  {
    icon: Star,
    title: "Sistem Rating Transparan",
    description: "Ulasan dan rating nyata dari pembeli lain untuk keputusan belanja yang lebih baik.",
  },
  {
    icon: Users,
    title: "Komunitas Tani",
    description: "Terhubung dengan petani, pembeli, dan praktisi pertanian di satu platform.",
  },
];

const quickSearches = [
  "Cabai",
  "Beras",
  "Tomat",
  "Bawang",
  "Sayuran",
  "Buah",
  "Bahan Restoran",
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-28">
          <div className="container-wide">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Leaf className="h-4 w-4" />
                  <span>Platform Pertanian Modern Indonesia</span>
                </div>
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight mb-6">
                  Temukan hasil tani.<br />
                  <span className="text-primary">Atau pembeli yang membutuhkannya.</span>
                </h1>
                <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-xl">
                  TaniHub menghubungkan petani dengan pembeli secara langsung,
                  dari hasil panen hingga kebutuhan bisnis.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Link href="/marketplace">
                    <Button size="lg" className="w-full sm:w-auto gap-2">
                      Mulai Belanja
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/menjual">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Saya Punya Hasil Tani
                    </Button>
                  </Link>
                </div>

                {/* Quick Search Suggestions */}
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((search) => (
                    <Link
                      key={search}
                      href={`/marketplace?q=${encodeURIComponent(search)}`}
                      className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                    >
                      {search}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative hidden lg:block">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted shadow-subtle">
                  <Image
                    src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80"
                    alt="Petani memanen cabai merah segar di kebun"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                </div>
                <div className="absolute -bottom-6 -right-6 lg:-bottom-8 lg:-right-8 bg-card rounded-2xl p-5 shadow-subtle border border-border max-w-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">500+</p>
                      <p className="text-sm text-muted-foreground">Petani Aktif</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">50+</p>
                      <p className="text-sm text-muted-foreground">Kota Terjangkau</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Star className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">4.8</p>
                      <p className="text-sm text-muted-foreground">Rating Rata-rata</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* "Butuh Apa?" Feature */}
        <section className="py-16 lg:py-20 bg-card border-y border-border">
          <div className="container-wide">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Butuh apa hari ini?
              </h2>
              <p className="text-lg text-muted-foreground">
                Tuliskan kebutuhan Anda, kami cari pemasok yang cocok.
              </p>
            </div>
            <form className="max-w-3xl mx-auto" action="/permintaan">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  placeholder="Contoh: Saya butuh 100 kg cabai untuk restoran minggu depan..."
                  className="h-14 pl-12 pr-16 text-base lg:text-lg bg-background border-border"
                  aria-label="Kebutuhan Anda"
                />
                <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6">
                  Cari Pemasok
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 lg:py-24">
          <div className="container-wide">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Mengapa TaniHub?
              </h2>
              <p className="text-lg text-muted-foreground">
                Platform yang dirancang untuk keadilan, kepercayaan, dan kemudahan.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="p-6 lg:p-8 bg-card border border-border rounded-2xl hover:shadow-subtle-hover transition-shadow"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-primary text-primary-foreground">
          <div className="container-wide text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Siap memulai?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Bergabunglah dengan ribuan petani dan pembeli yang sudah percaya pada TaniHub.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/marketplace">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2">
                  Jelajahi Marketplace
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/menjual">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/30 hover:bg-primary-foreground/10">
                  Daftar Sebagai Penjual
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}