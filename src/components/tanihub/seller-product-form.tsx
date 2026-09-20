"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  COMMODITY_OPTIONS,
  STOCK_UNITS,
  sellerProductSchema,
  type SellerProduct,
  type SellerProductForm,
} from "@/data/seller";
import { Loader2, ImagePlus, X } from "lucide-react";

// File dari perangkat dikompresi di browser (maks 1024px, JPEG 0.75) lalu
// disimpan sebagai data URL di state lokal — belum ada backend upload
// (lihat src/data/seller.ts). Melewati canvas sekaligus me-rasterize SVG
// menjadi JPEG sehingga aman dirender via <img>/next/image.
function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface SellerProductFormProps {
  title: string;
  initial?: Partial<SellerProductForm> & { imageUrl?: string };
  existing?: SellerProduct;
  submitLabel: string;
  // True hanya saat mengedit produk nonaktif — status dipertahankan eksplisit,
  // bukan diubah diam-diam menjadi draf.
  showInactiveOption?: boolean;
  onSubmit: (values: SellerProductForm) => void | Promise<void>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function SellerProductForm({ title, initial, submitLabel, showInactiveOption = false, onSubmit }: SellerProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const form = useForm<SellerProductForm>({
    resolver: zodResolver(sellerProductSchema),
    mode: "onTouched",
    defaultValues: {
      name: initial?.name ?? "",
      category: initial?.category ?? "",
      description: initial?.description ?? "",
      price: initial?.price ?? 0,
      unit: initial?.unit ?? "kg",
      stock: initial?.stock ?? 0,
      minOrder: initial?.minOrder ?? 1,
      location: initial?.location ?? "",
      grade: initial?.grade ?? "A",
      imageUrl: initial?.imageUrl ?? "",
      status: initial?.status ?? "draft",
    },
  });
  const errors = form.formState.errors;
  const imagePreview = form.watch("imageUrl");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // izinkan pilih file yang sama berulang kali
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError("Pilih file JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Ukuran file maksimal 5 MB.");
      return;
    }
    setFileError(null);
    setIsReadingFile(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      form.setValue("imageUrl", dataUrl, { shouldValidate: true });
    } catch {
      setFileError("Gagal memproses gambar. Coba file lain.");
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleSubmit = async (values: SellerProductForm) => {
    if (isSubmitting) return; // cegah duplicate submission (double click)
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit(handleSubmit)(e);
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sp-name">Nama produk *</Label>
            <Input id="sp-name" placeholder="Contoh: Cabai Merah Keriting" {...form.register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Kategori *</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v ?? "", { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {COMMODITY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.category?.message} />
            </div>
            <div>
              <Label>Grade *</Label>
              <Select
                value={form.watch("grade")}
                onValueChange={(v) => form.setValue("grade", (v as "A" | "B" | "C") ?? "A", { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih grade" />
                </SelectTrigger>
                <SelectContent>
                  {(["A", "B", "C"] as const).map((g) => (
                    <SelectItem key={g} value={g}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.grade?.message} />
            </div>
          </div>
          <div>
            <Label htmlFor="sp-desc">Deskripsi *</Label>
            <Input id="sp-desc" placeholder="Ceritakan kualitas, cara tanam, cocok untuk apa..." {...form.register("description")} />
            <FieldError message={errors.description?.message} />
          </div>
          <div>
            <Label htmlFor="sp-image">URL foto (opsional)</Label>
            <Input id="sp-image" type="url" placeholder="https://images.unsplash.com/..." {...form.register("imageUrl")} />
            <FieldError message={errors.imageUrl?.message} />
            <div className="mt-2 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isReadingFile || isSubmitting}
                onClick={() => document.getElementById("sp-image-file")?.click()}
              >
                <ImagePlus className="h-4 w-4 mr-1.5" />
                {isReadingFile ? "Memproses..." : "Pilih file dari perangkat"}
              </Button>
              <input
                id="sp-image-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Pilih file foto produk"
                onChange={(e) => void handleFileSelect(e)}
              />
              {imagePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue("imageUrl", "", { shouldValidate: true })}
                >
                  <X className="h-4 w-4 mr-1" />
                  Hapus foto
                </Button>
              )}
            </div>
            {fileError && <p className="text-sm text-destructive mt-1">{fileError}</p>}
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Pratinjau foto produk"
                className="mt-2 h-24 w-24 rounded-lg object-cover border border-border"
              />
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Kosongkan untuk memakai gambar bawaan. File dikompresi otomatis (maks ~5 MB).
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sp-price">Harga (Rp) *</Label>
              <Input id="sp-price" type="number" min={0} {...form.register("price")} />
              <FieldError message={errors.price?.message} />
            </div>
            <div>
              <Label>Satuan *</Label>
              <Select
                value={form.watch("unit")}
                onValueChange={(v) => form.setValue("unit", v ?? "kg", { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Satuan" />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.unit?.message} />
            </div>
            <div>
              <Label htmlFor="sp-location">Lokasi *</Label>
              <Input id="sp-location" placeholder="Kota, Provinsi" {...form.register("location")} />
              <FieldError message={errors.location?.message} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sp-stock">Stok awal *</Label>
              <Input id="sp-stock" type="number" min={0} step={1} {...form.register("stock")} />
              <FieldError message={errors.stock?.message} />
            </div>
            <div>
              <Label htmlFor="sp-min">Min. pembelian *</Label>
              <Input id="sp-min" type="number" min={1} step={1} {...form.register("minOrder")} />
              <FieldError message={errors.minOrder?.message} />
            </div>
            <div>
              <Label>Status *</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) =>
                  form.setValue("status", (v as "draft" | "active" | "inactive") ?? "draft", { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draf</SelectItem>
                  <SelectItem value="active">Aktif (tampil di marketplace)</SelectItem>
                  {showInactiveOption && <SelectItem value="inactive">Nonaktif</SelectItem>}
                </SelectContent>
              </Select>
              <FieldError message={errors.status?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Menyimpan...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
