-- 004_reviewed_by.sql — catat reviewer aplikasi (audit, bukan FK keras agar
-- riwayat review bertahan bila akun reviewer dihapus).
ALTER TABLE seller_applications
  ADD COLUMN reviewed_by CHAR(36) NULL,
  ADD INDEX idx_seller_app_reviewer (reviewed_by);
