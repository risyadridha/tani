import Link from "next/link";
import { Leaf, Globe, Camera, MessageSquare, Play, MapPin, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const footerLinks = {
  platform: [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/permintaan", label: "Permintaan" },
    { href: "/petani", label: "Petani" },
    { href: "/harga-pasar", label: "Harga Pasar" },
    { href: "/edukasi", label: "Edukasi" },
  ],
  untukPetani: [
    { href: "/menjual", label: "Mulai Menjual" },
    { href: "/panduan-petani", label: "Panduan Petani" },
    { href: "/dashboard", label: "Dashboard Petani" },
    { href: "/kelola-produk", label: "Kelola Produk" },
    { href: "/keuangan", label: "Keuangan" },
  ],
  untukPembeli: [
    { href: "/cara-belanja", label: "Cara Belanja" },
    { href: "/pengiriman", label: "Pengiriman" },
    { href: "/pembayaran", label: "Pembayaran" },
    { href: "/retur", label: "Retur & Refund" },
    { href: "/bantuan", label: "Bantuan" },
  ],
  perusahaan: [
    { href: "/tentang", label: "Tentang Kami" },
    { href: "/karir", label: "Karir" },
    { href: "/mitra", label: "Mitra" },
    { href: "/pers", label: "Pers" },
    { href: "/kontak", label: "Kontak" },
  ],
  legal: [
    { href: "/syarat", label: "Syarat & Ketentuan" },
    { href: "/privasi", label: "Kebijakan Privasi" },
    { href: "/cookie", label: "Kebijakan Cookie" },
    { href: "/komunitas", label: "Pedoman Komunitas" },
  ],
};

const socialLinks = [
  { href: "#", label: "Website", icon: Globe },
  { href: "#", label: "Instagram", icon: Camera },
  { href: "#", label: "Twitter", icon: MessageSquare },
  { href: "#", label: "YouTube", icon: Play },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30" role="contentinfo">
      <div className="container-wide py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2" aria-label="TaniHub Home">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">TaniHub</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Platform pertanian modern menghubungkan petani dengan pembeli secara langsung.
              Dari hasil panen hingga kebutuhan bisnis.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <nav aria-label="Platform">
            <h4 className="font-semibold text-foreground mb-4">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Untuk Petani */}
          <nav aria-label="Untuk Petani">
            <h4 className="font-semibold text-foreground mb-4">Untuk Petani</h4>
            <ul className="space-y-2">
              {footerLinks.untukPetani.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Untuk Pembeli */}
          <nav aria-label="Untuk Pembeli">
            <h4 className="font-semibold text-foreground mb-4">Untuk Pembeli</h4>
            <ul className="space-y-2">
              {footerLinks.untukPembeli.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Perusahaan */}
          <nav aria-label="Perusahaan">
            <h4 className="font-semibold text-foreground mb-4">Perusahaan</h4>
            <ul className="space-y-2">
              {footerLinks.perusahaan.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Kontak</h4>
              <address className="not-italic space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Jl. Sudirman No. 123, Jakarta Selatan 12190</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <a href="tel:+62211234567" className="hover:text-foreground transition-colors">
                    +62 21 1234 567
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <a href="mailto:hello@tanihub.id" className="hover:text-foreground transition-colors">
                    hello@tanihub.id
                  </a>
                </div>
              </address>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <h4 className="font-semibold text-foreground mb-3">Ikuti Kami</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Dapatkan update harga pasar, tips bertani, dan promo terbaru.
              </p>
              <form className="flex gap-2 max-w-md" aria-label="Newsletter signup">
                <Input
                  type="email"
                  placeholder="Email Anda"
                  className="flex-1"
                  aria-label="Email untuk newsletter"
                />
                <Button type="submit">Langganan</Button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TaniHub. Hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}