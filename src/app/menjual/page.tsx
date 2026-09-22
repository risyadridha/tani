"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  COMMODITY_OPTIONS,
  sellerApplicationSchema,
  type SellerApplicationForm,
} from "@/data/seller";
import { apiFetch, apiPost, type ApiApplication } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Check, ChevronRight, ClipboardList, Loader2, Store } from "lucide-react";

const STEPS = ["Data dikirim", "Pengajuan diterima", "Sedang ditinjau", "Disetujui"] as const;

function statusStepIndex(status: string): number {
  switch (status) {
    case "submitted":
      return 1;
    case "under_review":
      return 2;
    case "approved":
      return 3;
    default:
      return 0;
  }
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  submitted: "Terkirim",
  under_review: "Sedang ditinjau",
  approved: "Disetujui",
  rejected: "Perlu diperbaiki",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export default function MenjualPage() {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const authUser = useAuthStore((s) => s.user);
  const [application, setApplication] = useState<ApiApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await apiFetch<{ data: ApiApplication[] }>("/api/seller/applications");
      if (reqId.current !== id) return;
      setApplication(res.data[0] ?? null);
    } catch {
      if (reqId.current !== id) return;
      setApplication(null);
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setLoading(false);
      return;
    }
    void load();
    return () => {
      reqId.current++;
    };
  }, [authStatus, load]);

  const form = useForm<SellerApplicationForm>({
    resolver: zodResolver(sellerApplicationSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      location: "",
      farmName: "",
      farmLocation: "",
      commodities: "",
      description: "",
      farmSize: "",
    },
  });

  // Prefill saat revisi.
  useEffect(() => {
    if (application && (application.status === "draft" || application.status === "rejected")) {
      form.reset({
        fullName: application.fullName,
        phone: application.phone,
        email: application.email ?? "",
        location: application.location,
        farmName: application.farmName,
        farmLocation: application.farmLocation,
        commodities: application.commodities,
        description: application.description,
        farmSize: application.farmSize ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id]);

  const editable =
    !!application &&
    (application.status === "draft" || application.status === "rejected");

  const handleSubmit = async (data: SellerApplicationForm) => {
    if (isSubmitting) return;
    if (authStatus !== "authenticated" || !authUser) {
      toast.info("Masuk terlebih dahulu untuk mengajukan diri sebagai seller.");
      router.push(`/login?returnTo=${encodeURIComponent("/menjual")}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const saved = await apiPost<{ data: ApiApplication }>("/api/seller/applications", {
        ...(application && editable ? { id: application.id } : {}),
        ...data,
        email: data.email || undefined,
        farmSize: data.farmSize || undefined,
      });
      await apiPost(`/api/seller/applications/${encodeURIComponent(saved.data.id)}/submit`, {});
      toast.success("Pengajuan seller terkirim.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim pengajuan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="container-wide max-w-3xl">
          <div className="mb-8">
            <p className="text-sm font-medium text-primary mb-1">Seller Ecosystem</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
              Mulai Menjual di TaniHub
            </h1>
            <p className="text-muted-foreground mt-1">
              Ajukan sebagai petani/penjual → verifikasi → mulai menjual.
            </p>
          </div>

          {loading || authStatus === "loading" ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : authStatus === "unauthenticated" ? (
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="font-semibold text-foreground mb-2">Masuk terlebih dahulu</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Pengajuan seller terhubung ke akun Anda.
                </p>
                <Button onClick={() => router.push(`/login?returnTo=${encodeURIComponent("/menjual")}`)}>
                  Masuk / Daftar
                </Button>
              </CardContent>
            </Card>
          ) : !application || editable ? (
            <>
              {application?.status === "rejected" && (
                <Card className="mb-6 border-destructive/40">
                  <CardContent className="p-5">
                    <h2 className="font-semibold text-foreground mb-1">
                      Pengajuan perlu diperbaiki
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Alasan:{" "}
                      <span className="text-foreground">
                        {application.rejectionReason || "Tidak ada alasan tercatat."}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Perbaiki data di bawah lalu kirim ulang.
                    </p>
                  </CardContent>
                </Card>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void form.handleSubmit((d) => void handleSubmit(d))(e);
                }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Data Pribadi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Nama lengkap *</Label>
                      <Input id="fullName" placeholder="Nama Anda" {...form.register("fullName")} />
                      <FieldError message={form.formState.errors.fullName?.message} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Nomor telepon *</Label>
                        <Input id="phone" type="tel" placeholder="08xxxxxxxxxx" {...form.register("phone")} />
                        <FieldError message={form.formState.errors.phone?.message} />
                      </div>
                      <div>
                        <Label htmlFor="email">Email (opsional)</Label>
                        <Input id="email" type="email" placeholder="email@domain.com" {...form.register("email")} />
                        <FieldError message={form.formState.errors.email?.message} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Domisili *</Label>
                      <Input id="location" placeholder="Kota/Kabupaten, Provinsi" {...form.register("location")} />
                      <FieldError message={form.formState.errors.location?.message} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Data Kebun/Usaha
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="farmName">Nama kebun/usaha *</Label>
                        <Input id="farmName" placeholder="Kebun ..." {...form.register("farmName")} />
                        <FieldError message={form.formState.errors.farmName?.message} />
                      </div>
                      <div>
                        <Label htmlFor="farmLocation">Lokasi kebun *</Label>
                        <Input id="farmLocation" placeholder="Desa/Kecamatan ..." {...form.register("farmLocation")} />
                        <FieldError message={form.formState.errors.farmLocation?.message} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="commodities">Jenis komoditas *</Label>
                        <Select
                          value={form.watch("commodities") || undefined}
                          onValueChange={(v) => form.setValue("commodities", v ?? "", { shouldValidate: true })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih komoditas utama" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMODITY_OPTIONS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={form.formState.errors.commodities?.message} />
                      </div>
                      <div>
                        <Label htmlFor="farmSize">Estimasi luas lahan (opsional)</Label>
                        <Input id="farmSize" placeholder="Contoh: 2 hektar" {...form.register("farmSize")} />
                        <FieldError message={form.formState.errors.farmSize?.message} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Deskripsi singkat *</Label>
                      <Input
                        id="description"
                        placeholder="Ceritakan usaha tani Anda..."
                        {...form.register("description")}
                      />
                      <FieldError message={form.formState.errors.description?.message} />
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      Kirim Pengajuan
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status Pengajuan</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {STEPS.map((label, i) => {
                      const current = statusStepIndex(application.status);
                      const done = i < current || application.status === "approved";
                      const active = i === current && application.status !== "approved";
                      return (
                        <li key={label} className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                              done
                                ? "bg-primary text-primary-foreground"
                                : active
                                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                  : "bg-muted text-muted-foreground"
                            )}
                            aria-hidden="true"
                          >
                            {done ? <Check className="h-4 w-4" /> : i + 1}
                          </span>
                          <span
                            className={cn(
                              "text-sm",
                              done || active ? "font-medium text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-4 text-sm">
                    Status:{" "}
                    <span className="font-semibold text-foreground">
                      {STATUS_LABEL[application.status] ?? application.status}
                    </span>
                  </p>
                </CardContent>
              </Card>

              {application.status === "approved" ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                      <Check className="h-7 w-7 text-success" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      Pengajuan disetujui!
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Akun seller aktif. Kelola produk dan stok dari dashboard.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={() => router.push("/dashboard")}>Buka Dashboard</Button>
                      <Button variant="outline" onClick={() => router.push("/marketplace")}>
                        Lihat Marketplace
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-5">
                    <h2 className="font-semibold text-foreground mb-1">
                      Menunggu verifikasi tim
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Pengajuan Anda sedang ditinjau. Status diperbarui otomatis di halaman ini.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
