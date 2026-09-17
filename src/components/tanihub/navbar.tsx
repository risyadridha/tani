"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Search,
  ShoppingCart,
  User,
  Bell,
  X,
  ChevronDown,
  Leaf,
} from "lucide-react";

const navItems = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/permintaan", label: "Permintaan" },
  { href: "/petani", label: "Petani" },
  { href: "/harga-pasar", label: "Harga Pasar" },
  { href: "/edukasi", label: "Edukasi" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Desktop Navbar */}
      <header className="hidden lg:fixed lg:top-0 lg:left-0 lg:right-0 lg:z-50 lg:border-b lg:border-border lg:bg-background/95 lg:backdrop-blur-sm">
        <div className="container-wide h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" aria-label="TaniHub Home">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TaniHub</span>
          </Link>

          {/* Center Navigation */}
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  pathname === item.href
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari produk, petani, komoditas..."
                className="h-10 w-64 pl-10 pr-4 text-sm bg-muted/50 border-border focus:bg-background"
                aria-label="Pencarian"
              />
            </div>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Keranjang">
              <ShoppingCart className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="h-10 w-10 rounded-full" aria-label="Menu pengguna">
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-semibold">Akun Saya</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/dashboard" className="flex h-full w-full">
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/pesanan" className="flex h-full w-full">
                    Pesanan Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/disimpan" className="flex h-full w-full">
                    Disimpan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/menjual" className="flex h-full w-full">
                    Mulai Menjual
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/pengaturan" className="flex h-full w-full">
                    Pengaturan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive-foreground">
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Navbar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="h-14 flex items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="TaniHub Home">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">TaniHub</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setSearchOpen(true)}
              aria-label="Pencarian"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              aria-label="Keranjang"
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger>
                <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-semibold">Menu</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Tutup menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="p-4 space-y-1" aria-label="Mobile navigation">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                        pathname === item.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <hr className="my-4 border-border" />
                  <Link
                    href="/dashboard"
                    className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/pesanan"
                    className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pesanan Saya
                  </Link>
                  <Link
                    href="/menjual"
                    className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-primary hover:bg-primary/10"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mulai Menjual
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {searchOpen && (
          <div
            className="fixed inset-0 z-50 bg-background border-b border-border"
            onClick={() => setSearchOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian"
          >
            <div className="container-narrow h-full flex items-start justify-center pt-20">
              <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cari produk, petani, komoditas..."
                    className="h-12 pl-12 pr-4 text-base bg-muted/50 border-border"
                    autoFocus
                    aria-label="Pencarian"
                  />
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Tekan ESC atau klik di luar untuk menutup
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-16" aria-hidden="true" />
    </>
  );
}