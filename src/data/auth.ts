import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth domain — Sprint 3. Satu enum role, satu enum status (tanpa banyak
// boolean). Kolom selaras 1:1 dengan tabel `users` di docs/mysql-schema.sql.
// ---------------------------------------------------------------------------

export type UserRole = "buyer" | "farmer" | "admin";
export type UserStatus = "active" | "suspended";

// Safe user: satu-satunya bentuk user yang boleh keluar dari server.
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  buyer: "Pembeli",
  farmer: "Petani",
  admin: "Admin",
};

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email wajib diisi")
  .max(190, "Email terlalu panjang")
  .email("Email tidak valid")
  .transform((v) => v.toLowerCase());

export const registerSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter").max(100, "Nama terlalu panjang"),
  email: emailSchema,
  // Minimum jujur untuk prototype: 8 char + ada huruf dan angka.
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(128, "Kata sandi terlalu panjang")
    .regex(/[A-Za-z]/, "Kata sandi harus mengandung huruf")
    .regex(/[0-9]/, "Kata sandi harus mengandung angka"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Kata sandi wajib diisi").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
