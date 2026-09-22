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
import { loginSchema, type LoginInput } from "@/data/auth";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";

function safeReturnTo(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/marketplace";
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = async (values: LoginInput) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setServerError(null);
    const res = await login(values);
    setIsSubmitting(false);
    if (!res.ok) {
      setServerError(res.message ?? "Gagal masuk.");
      return;
    }
    router.push(safeReturnTo(searchParams.get("returnTo")));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Masuk ke TaniHub</CardTitle>
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link
                href={`/register${searchParams.get("returnTo") ? `?returnTo=${encodeURIComponent(searchParams.get("returnTo") as string)}` : ""}`}
                className="text-primary hover:underline"
              >
                Daftar
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
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" autoComplete="email" placeholder="email@domain.com" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="login-password">Kata sandi</Label>
                <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" {...form.register("password")} />
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
                    Memeriksa...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
  );
}
