-- 002_farmer_ratings.sql — agregat display petani (bukan uang, bukan otoritas).
ALTER TABLE farmers
  ADD COLUMN rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  ADD COLUMN review_count INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN completed_orders INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN response_rate TINYINT UNSIGNED NOT NULL DEFAULT 100;
