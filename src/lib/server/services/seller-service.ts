import { randomUUID } from "node:crypto";
import { getPool, withTransaction } from "@/lib/server/db";
import { farmerRepository, sellerApplicationRepository } from "@/lib/server/repositories/farmer-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";

// ---------------------------------------------------------------------------
// Seller service: pengajuan terikat user + approval menciptakan Farmer dan
// menaikkan role — dalam SATU transaksi (tidak ada farmer tanpa user valid,
// tidak ada role tanpa farmer).
// ---------------------------------------------------------------------------

export async function approveApplication(
  applicationId: string,
  reviewerUserId: string
): Promise<{ ok: boolean; error?: string; farmerId?: string }> {
  return withTransaction(async (conn) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (await sellerApplicationRepository.findById(conn, applicationId)) as any;
    if (!app) return { ok: false, error: "Pengajuan tidak ditemukan." };
    if (app.status !== "under_review") {
      return { ok: false, error: "Hanya pengajuan under_review yang dapat direview." };
    }
    const user = await userRepository.findById(conn, app.user_id as string);
    if (!user || user.status !== "active") {
      return { ok: false, error: "User tidak valid." };
    }
    const existing = await farmerRepository.findByUserId(conn, app.user_id as string);
    if (existing) return { ok: false, error: "User sudah memiliki farmer." };

    const ok = await sellerApplicationRepository.review(conn, applicationId, true, null, reviewerUserId);
    if (!ok) return { ok: false, error: "Gagal memperbarui pengajuan." };
    const farmerId = randomUUID();
    await farmerRepository.insert(conn, {
      id: farmerId,
      userId: app.user_id as string,
      farmName: app.farm_name as string,
      location: app.farm_location as string,
      description: app.description as string,
      farmSize: (app.farm_size as string | null) ?? null,
      memberSince: new Date().getFullYear(),
    });
    await userRepository.setRole(conn, app.user_id as string, "farmer");
    return { ok: true, farmerId };
  });
}

export async function rejectApplication(
  applicationId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  if (reason.trim().length < 5) return { ok: false, error: "Alasan minimal 5 karakter." };
  const ok = await sellerApplicationRepository.review(getPool(), applicationId, false, reason.trim());
  if (!ok) return { ok: false, error: "Pengajuan tidak ditemukan atau bukan under_review." };
  return { ok: true };
}
