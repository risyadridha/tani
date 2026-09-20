"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { CartDrawer } from "@/components/tanihub/cart-drawer";
import { useCartStore } from "@/store/cart";
import { useOrderStore, cartItemsToOrderItems } from "@/store/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import { ChevronRight, Check, Truck, CreditCard, MapPin, User, Mail, Phone, Loader2, Package } from "lucide-react";

const addressSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  phone: z.string().min(10, "Nomor telepon tidak valid").max(15),
  email: z.string().email("Email tidak valid"),
  province: z.string().min(1, "Pilih provinsi"),
  city: z.string().min(1, "Pilih kota/kabupaten"),
  district: z.string().min(1, "Pilih kecamatan"),
  village: z.string().min(1, "Pilih kelurahan/desa"),
  address: z.string().min(10, "Alamat lengkap minimal 10 karakter"),
  postalCode: z.string().regex(/^\d{5}$/, "Kode pos 5 digit"),
  notes: z.string().optional(),
});

const deliverySchema = z.object({
  courier: z.string().min(1, "Pilih kurir"),
  service: z.string().min(1, "Pilih layanan"),
  deliveryDate: z.string().optional(),
  deliveryTime: z.string().optional(),
});

const paymentSchema = z.object({
  method: z.string().min(1, "Pilih metode pembayaran"),
  vaBank: z.string().optional(),
  ewalletType: z.string().optional(),
});

type AddressForm = z.infer<typeof addressSchema>;
type DeliveryForm = z.infer<typeof deliverySchema>;
type PaymentForm = z.infer<typeof paymentSchema>;

const steps = [
  { id: "address", label: "Alamat", icon: MapPin },
  { id: "delivery", label: "Pengiriman", icon: Truck },
  { id: "payment", label: "Pembayaran", icon: CreditCard },
  { id: "review", label: "Review", icon: Check },
];

const provinces = [
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur",
  "Banten", "DI Yogyakarta", "Sumatera Utara", "Sumatera Barat",
  "Bali", "Kalimantan Timur", "Sulawesi Selatan",
];

const couriers = [
  { id: "jne", name: "JNE", services: ["YES", "REG", "OKE"] },
  { id: "jnt", name: "J&T Express", services: ["REG", "ECO"] },
  { id: "sicepat", name: "SiCepat", services: ["BEST", "REG", "HALU"] },
  { id: "ninja", name: "Ninja Xpress", services: ["STANDARD", "PRIORITY"] },
];

const paymentMethods = [
  { id: "va", name: "Transfer Bank (Virtual Account)", banks: ["BCA", "BRI", "BNI", "Mandiri", "Permata"] },
  { id: "ewallet", name: "E-Wallet", types: ["GoPay", "ShopeePay", "Dana", "OVO"] },
  { id: "qris", name: "QRIS", types: [] },
  { id: "cod", name: "Bayar di Tempat (COD)", types: [] },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, clearCart, isHydrated } = useCartStore();
  const addOrder = useOrderStore((s) => s.addOrder);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const subtotal = isHydrated ? getSubtotal() : 0;
  const shipping = subtotal > 500000 ? 0 : 25000;
  const serviceFee = Math.round(subtotal * 0.02);
  const total = subtotal + shipping + serviceFee;

  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      province: "",
      city: "",
      district: "",
      village: "",
      address: "",
      postalCode: "",
      notes: "",
    },
  });

  const deliveryForm = useForm<DeliveryForm>({
    resolver: zodResolver(deliverySchema),
    mode: "onTouched",
    defaultValues: {
      courier: "",
      service: "",
      deliveryDate: "",
      deliveryTime: "",
    },
  });

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    mode: "onTouched",
    defaultValues: {
      method: "va",
      vaBank: "",
      ewalletType: "",
    },
  });

  const handleAddressSelectChange = (field: keyof AddressForm) => (value: string | null) => {
    addressForm.setValue(field, value ?? "", { shouldValidate: true });
  };

  const handleDeliverySelectChange = (field: keyof DeliveryForm) => (value: string | null) => {
    deliveryForm.setValue(field, value ?? "", { shouldValidate: true });
  };

  const handlePaymentSelectChange = (field: keyof PaymentForm) => (value: string | null) => {
    paymentForm.setValue(field, value ?? "", { shouldValidate: true });
  };

  const handleNext = async () => {
    if (currentStep < 3) {
      const activeForm =
        currentStep === 0
          ? addressForm
          : currentStep === 1
            ? deliveryForm
            : paymentForm;
      const valid = await activeForm.trigger();
      if (valid) {
        setCurrentStep((prev) => prev + 1);
      }
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const newOrderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    // Persist order BEFORE clearing cart so /pesanan can display it.
    addOrder({
      id: newOrderId,
      items: cartItemsToOrderItems(items),
      subtotal,
      shipping,
      serviceFee,
      total,
      recipientName: addressForm.getValues("fullName"),
      city: addressForm.getValues("city"),
    });
    setOrderId(newOrderId);
    clearCart();
    setCurrentStep(4); // Success step
    setIsSubmitting(false);
  };

  const isCartEmpty = isHydrated && items.length === 0 && currentStep !== 4;

  if (currentStep === 4) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full text-center">
            <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Pesanan Berhasil!</h1>
            <p className="text-muted-foreground mb-6">
              Pesanan Anda telah dikonfirmasi dengan nomor <strong className="text-foreground">{orderId}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Detail pesanan telah dikirim ke email Anda. Anda dapat melacak status pesanan di halaman Pesanan Saya.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => router.push("/pesanan")}>
                Lihat Pesanan
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/marketplace")}>
                Lanjut Belanja
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isCartEmpty) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Keranjang Kosong
            </h1>
            <p className="text-muted-foreground mb-8">
              Tambahkan produk terlebih dahulu sebelum ke halaman checkout.
            </p>
            <Button className="w-full" onClick={() => router.push("/marketplace")}>
              Cari Produk
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="container-wide">
          {/* Progress Steps */}
          <div className="mb-8 lg:mb-12">
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-1 bg-muted" />
              <div className="relative flex justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "relative z-10 h-10 w-10 rounded-full flex items-center justify-center transition-all",
                        index < currentStep
                          ? "bg-primary text-primary-foreground"
                          : index === currentStep
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index < currentStep ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                    </div>
                    <span className={cn("mt-2 text-xs font-medium text-center w-24", index <= currentStep ? "text-foreground" : "text-muted-foreground")}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Address */}
              {currentStep === 0 && (
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Alamat Pengiriman
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Label htmlFor="fullName">Nama Lengkap *</Label>
                          <Input
                            id="fullName"
                            placeholder="Nama penerima"
                            {...addressForm.register("fullName")}
                          />
                          {addressForm.formState.errors.fullName && (
                            <p className="text-sm text-destructive mt-1">{addressForm.formState.errors.fullName.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="phone">Nomor Telepon *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="08xxxxxxxxxx"
                            {...addressForm.register("phone")}
                          />
                          {addressForm.formState.errors.phone && (
                            <p className="text-sm text-destructive mt-1">{addressForm.formState.errors.phone.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@domain.com"
                            {...addressForm.register("email")}
                          />
                          {addressForm.formState.errors.email && (
                            <p className="text-sm text-destructive mt-1">{addressForm.formState.errors.email.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="province">Provinsi *</Label>
                          <Select onValueChange={handleAddressSelectChange("province")} value={addressForm.watch("province")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih provinsi" />
                            </SelectTrigger>
                            <SelectContent>
                              {provinces.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="city">Kota/Kabupaten *</Label>
                          <Input id="city" placeholder="Kota/Kabupaten" {...addressForm.register("city")} />
                        </div>
                        <div>
                          <Label htmlFor="district">Kecamatan *</Label>
                          <Input id="district" placeholder="Kecamatan" {...addressForm.register("district")} />
                        </div>
                        <div>
                          <Label htmlFor="village">Kelurahan/Desa *</Label>
                          <Input id="village" placeholder="Kelurahan/Desa" {...addressForm.register("village")} />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address">Alamat Lengkap *</Label>
                        <Input
                          id="address"
                          placeholder="Jalan, RT/RW, blok, nomor rumah, dll"
                          {...addressForm.register("address")}
                        />
                        {addressForm.formState.errors.address && (
                          <p className="text-sm text-destructive mt-1">{addressForm.formState.errors.address.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="postalCode">Kode Pos *</Label>
                          <Input
                            id="postalCode"
                            placeholder="12345"
                            maxLength={5}
                            {...addressForm.register("postalCode")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Catatan (Opsional)</Label>
                          <Input
                            id="notes"
                            placeholder="Contoh: Depan masjid, pagar biru"
                            {...addressForm.register("notes")}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Button type="submit" className="w-full lg:w-auto" disabled={isSubmitting}>
                    Selanjutnya <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              )}

              {/* Step 2: Delivery */}
              {currentStep === 1 && (
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Metode Pengiriman
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Kurir *</Label>
                        <Select onValueChange={handleDeliverySelectChange("courier")} value={deliveryForm.watch("courier")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kurir" />
                          </SelectTrigger>
                          <SelectContent>
                            {couriers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Layanan *</Label>
                        <Select onValueChange={handleDeliverySelectChange("service")} value={deliveryForm.watch("service")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih layanan" />
                          </SelectTrigger>
                          <SelectContent>
                            {couriers.find((c) => c.id === deliveryForm.watch("courier"))?.services?.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="deliveryDate">Tanggal Pengiriman (Opsional)</Label>
                          <Input
                            id="deliveryDate"
                            type="date"
                            min={new Date().toISOString().split("T")[0]}
                            {...deliveryForm.register("deliveryDate")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="deliveryTime">Waktu Pengiriman (Opsional)</Label>
                          <Select onValueChange={handleDeliverySelectChange("deliveryTime")} value={deliveryForm.watch("deliveryTime")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih waktu" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="08:00-12:00">08:00 - 12:00</SelectItem>
                              <SelectItem value="12:00-16:00">12:00 - 16:00</SelectItem>
                              <SelectItem value="16:00-20:00">16:00 - 20:00</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack}>Kembali</Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      Selanjutnya <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 3: Payment */}
              {currentStep === 2 && (
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Metode Pembayaran
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup onValueChange={handlePaymentSelectChange("method")} value={paymentForm.watch("method")}>
                        {paymentMethods.map((method) => (
                          <div key={method.id} className="border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={method.id} className="h-4 w-4" />
                              <span className="font-medium text-foreground">{method.name}</span>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>

                      {paymentForm.watch("method") === "va" && (
                        <div className="ml-7 mt-2">
                          <Label>Pilih Bank *</Label>
                          <Select onValueChange={handlePaymentSelectChange("vaBank")} value={paymentForm.watch("vaBank")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih bank" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.find((m) => m.id === "va")?.banks?.map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {paymentForm.watch("method") === "ewallet" && (
                        <div className="ml-7 mt-2">
                          <Label>Pilih E-Wallet *</Label>
                          <Select onValueChange={handlePaymentSelectChange("ewalletType")} value={paymentForm.watch("ewalletType")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih e-wallet" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.find((m) => m.id === "ewallet")?.types?.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack}>Kembali</Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      Selanjutnya <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 4: Review */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Alamat Pengiriman
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{addressForm.watch("fullName")}</p>
                      <p className="text-sm text-muted-foreground">{addressForm.watch("phone")}</p>
                      <p className="text-sm text-muted-foreground">{addressForm.watch("address")}, {addressForm.watch("village")}, {addressForm.watch("district")}, {addressForm.watch("city")}, {addressForm.watch("province")} {addressForm.watch("postalCode")}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Pengiriman
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{couriers.find((c) => c.id === deliveryForm.watch("courier"))?.name} - {deliveryForm.watch("service")}</p>
                      {deliveryForm.watch("deliveryDate") && <p className="text-sm text-muted-foreground">Tanggal: {deliveryForm.watch("deliveryDate")}</p>}
                      {deliveryForm.watch("deliveryTime") && <p className="text-sm text-muted-foreground">Waktu: {deliveryForm.watch("deliveryTime")}</p>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Pembayaran
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{paymentMethods.find((m) => m.id === paymentForm.watch("method"))?.name}</p>
                      {paymentForm.watch("vaBank") && <p className="text-sm text-muted-foreground">Bank: {paymentForm.watch("vaBank")}</p>}
                      {paymentForm.watch("ewalletType") && <p className="text-sm text-muted-foreground">E-Wallet: {paymentForm.watch("ewalletType")}</p>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Ringkasan Pesanan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-3">
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.name}
                                width={50}
                                height={50}
                                className="h-[50px] w-[50px] rounded-lg object-cover"
                              />
                              <div>
                                <p className="text-sm font-medium">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">{item.quantity} {item.product.unit} × {formatCurrency(item.product.price)}</p>
                              </div>
                            </div>
                            <span className="font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between"><span>Ongkir</span><span>{shipping === 0 ? "Gratis" : formatCurrency(shipping)}</span></div>
                        <div className="flex justify-between"><span>Biaya Layanan</span><span>{formatCurrency(serviceFee)}</span></div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack}>Kembali</Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        "Bayar Sekarang"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Ringkasan Pesanan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          width={50}
                          height={50}
                          className="h-[50px] w-[50px] rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} {item.product.unit}</p>
                        </div>
                        <span className="text-sm font-medium text-foreground">{formatCurrency(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" />
                        Ongkir
                      </span>
                      <span>{shipping === 0 ? "Gratis" : formatCurrency(shipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5" />
                        Biaya Layanan
                      </span>
                      <span>{formatCurrency(serviceFee)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Bayar</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>

                  {subtotal < 500000 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Tambah {formatCurrency(500000 - subtotal)} untuk ongkir gratis
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}