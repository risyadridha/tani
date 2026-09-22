"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerSchema, type RegisterInput } from "@/data/auth";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";

function safeReturnTo(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/marketplace";
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useAuthStore((s) => s.register);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", password: "" },
  });

  const handleSubmit = async (values: RegisterInput) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setServerError(null);
    const res = await register(values);
    setIsSubmitting(false);
    if (!res.ok) {
      setServerError(res.message ?? "Gagal mendaftar.");
      return;
    }
    router.push(safeReturnTo(searchParams.get("returnTo")));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Daftar Akun TaniHub</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Masuk
              </Link>
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit(handleSubmit)(e);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="reg-name">Nama lengkap</Label>
                <Input id="reg-name" autoComplete="name" placeholder="Nama Anda" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="reg-email">Email</Label>
                <Input id="reg-email" type="email" autoComplete="email" placeholder="email@domain.com" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="reg-password">Kata sandi</Label>
                <Input id="reg-password" type="password" autoComplete="new-password" placeholder="Min. 8 karakter, huruf + angka" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>
              {serverError && (
                <p role="alert" className="text-sm text-destructive font-medium">
                  {serverError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mendaftar...
                  </>
                ) : (
                  "Daftar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
  );
}
