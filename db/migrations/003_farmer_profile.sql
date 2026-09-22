-- 003_farmer_profile.sql — kolom profil display-only (bukan otoritas).
-- JSON MariaDB 10.4 = LONGTEXT (tanpa validasi); di-parse di repository.
ALTER TABLE farmers
  ADD COLUMN commodities TEXT NULL COMMENT 'JSON array string',
  ADD COLUMN certifications TEXT NULL COMMENT 'JSON array string',
  ADD COLUMN upcoming_harvests TEXT NULL COMMENT 'JSON array {crop,estimatedDate,estimatedQuantity}';
