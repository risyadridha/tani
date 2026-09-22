-- 001_init.sql — TaniHub core schema (Sprint 4).
-- Uang = INT UNSIGNED (Rupiah tanpa subunit; konsisten dengan prototype
-- integer. DECIMAL(15,2) sengaja TIDAK dipakai: pecahan rupiah tidak ada dan
-- float/decimal desimal mengundang rounding pada domain ini).
-- Engine InnoDB (transaksi + row locking). Charset utf8mb4.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INT UNSIGNED NOT NULL PRIMARY KEY,
  applied_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  phone         VARCHAR(20)  NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('buyer','farmer','admin') NOT NULL DEFAULT 'buyer',
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64)  NOT NULL PRIMARY KEY COMMENT 'sha256(token); token asli tak disimpan',
  user_id    CHAR(36)  NOT NULL,
  expires_at TIMESTAMP  NOT NULL,
  created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS farmers (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  user_id      CHAR(36)      NOT NULL,
  farm_name    VARCHAR(100)  NOT NULL,
  location     VARCHAR(120)  NOT NULL,
  description  VARCHAR(500)  NOT NULL DEFAULT '',
  farm_size    VARCHAR(50)   NULL,
  avatar_url   VARCHAR(500)  NULL,
  verified     TINYINT(1)    NOT NULL DEFAULT 0,
  member_since YEAR          NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_farmers_user (user_id),
  CONSTRAINT fk_farmers_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seller_applications (
  id               CHAR(36) NOT NULL PRIMARY KEY,
  user_id          CHAR(36) NOT NULL,
  full_name        VARCHAR(100) NOT NULL,
  phone            VARCHAR(20)  NOT NULL,
  email            VARCHAR(190) NULL,
  location         VARCHAR(120) NOT NULL,
  farm_name        VARCHAR(100) NOT NULL,
  farm_location    VARCHAR(120) NOT NULL,
  commodities      VARCHAR(200) NOT NULL,
  description      VARCHAR(500) NOT NULL,
  farm_size        VARCHAR(50)  NULL,
  status           ENUM('draft','submitted','under_review','approved','rejected')
                   NOT NULL DEFAULT 'draft',
  rejection_reason VARCHAR(500) NULL,
  submitted_at     TIMESTAMP NULL,
  reviewed_at      TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_seller_app_user_status (user_id, status),
  CONSTRAINT fk_seller_app_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id         CHAR(36)      NOT NULL PRIMARY KEY,
  farmer_id  CHAR(36)      NOT NULL,
  name       VARCHAR(100)  NOT NULL,
  category   VARCHAR(60)   NOT NULL,
  description VARCHAR(1000) NOT NULL,
  image_url  VARCHAR(2000) NOT NULL COMMENT 'URL unsplash atau data:image (prototype)',
  grade      ENUM('A','B','C') NOT NULL,
  price      INT UNSIGNED  NOT NULL COMMENT 'Rupiah; > 0',
  unit       VARCHAR(20)   NOT NULL,
  min_order  INT UNSIGNED  NOT NULL COMMENT '> 0',
  status     ENUM('draft','active','inactive') NOT NULL DEFAULT 'draft',
  location   VARCHAR(120)  NOT NULL,
  rating     DECIMAL(2,1)   NOT NULL DEFAULT 0.0 COMMENT 'agregat display; bukan uang',
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_farmer_status (farmer_id, status),
  INDEX idx_products_category (category),
  CONSTRAINT fk_products_farmer FOREIGN KEY (farmer_id) REFERENCES farmers (id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_products_price CHECK (price > 0),
  CONSTRAINT ck_products_min_order CHECK (min_order > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory (
  product_id CHAR(36)    NOT NULL PRIMARY KEY,
  quantity   INT         NOT NULL DEFAULT 0,
  unit       VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_inventory_qty CHECK (quantity >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  product_id      CHAR(36)     NOT NULL,
  quantity_change INT          NOT NULL COMMENT '+masuk, -keluar; <> 0',
  resulting_stock INT          NOT NULL,
  reason          VARCHAR(200) NOT NULL,
  actor_id        CHAR(36)     NOT NULL,
  reference_id    VARCHAR(64)  NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inv_tx_product (product_id, created_at),
  CONSTRAINT fk_inv_tx_product FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_inv_tx_change CHECK (quantity_change <> 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  group_id        CHAR(36) NOT NULL,
  buyer_id        CHAR(36) NOT NULL,
  farmer_id       CHAR(36) NOT NULL,
  farmer_name     VARCHAR(100) NOT NULL COMMENT 'snapshot',
  status          ENUM('pending','confirmed','processing','packed','shipped','delivered','completed','cancelled')
                  NOT NULL DEFAULT 'pending',
  subtotal        INT UNSIGNED NOT NULL,
  shipping_fee    INT UNSIGNED NOT NULL,
  service_fee     INT UNSIGNED NOT NULL,
  total           INT UNSIGNED NOT NULL,
  ship_name       VARCHAR(100) NOT NULL,
  ship_phone      VARCHAR(20)  NOT NULL,
  ship_email      VARCHAR(190) NOT NULL DEFAULT '',
  ship_province   VARCHAR(60)  NOT NULL,
  ship_city       VARCHAR(60)  NOT NULL,
  ship_district   VARCHAR(60)  NOT NULL,
  ship_village    VARCHAR(60)  NOT NULL,
  ship_address    VARCHAR(300) NOT NULL,
  ship_postal_code CHAR(5)     NOT NULL,
  ship_notes      VARCHAR(200) NULL,
  courier         VARCHAR(40)  NOT NULL,
  courier_service VARCHAR(40)  NOT NULL,
  payment_method  VARCHAR(40)  NOT NULL,
  idempotency_key VARCHAR(64)  NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_idempotency (idempotency_key),
  INDEX idx_orders_buyer (buyer_id, created_at),
  INDEX idx_orders_farmer (farmer_id, status, created_at),
  INDEX idx_orders_group (group_id),
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_orders_farmer FOREIGN KEY (farmer_id) REFERENCES farmers (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id             CHAR(36)      NOT NULL PRIMARY KEY,
  order_id       CHAR(36)      NOT NULL,
  product_id     CHAR(36)      NOT NULL,
  name_snapshot  VARCHAR(100)  NOT NULL,
  image_snapshot VARCHAR(2000) NOT NULL,
  price_snapshot INT UNSIGNED  NOT NULL,
  unit           VARCHAR(20)   NOT NULL,
  quantity       INT UNSIGNED  NOT NULL,
  subtotal       INT UNSIGNED  NOT NULL,
  INDEX idx_items_order (order_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_status_history (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id   CHAR(36)        NOT NULL,
  status     VARCHAR(20)     NOT NULL,
  actor      ENUM('farmer','buyer','system') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_history (order_id, created_at),
  CONSTRAINT fk_status_history FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id                    CHAR(36) NOT NULL PRIMARY KEY,
  order_id              CHAR(36) NOT NULL,
  status                ENUM('pending','paid','failed','expired','refunded')
                        NOT NULL DEFAULT 'pending',
  amount                INT UNSIGNED NOT NULL,
  method                VARCHAR(40)  NOT NULL,
  transaction_reference VARCHAR(100) NULL,
  paid_at               TIMESTAMP NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payments_order (order_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shipments (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  order_id        CHAR(36) NOT NULL,
  courier         VARCHAR(40) NOT NULL,
  service         VARCHAR(40) NOT NULL,
  tracking_number VARCHAR(64) NULL,
  status          ENUM('pending','picked_up','in_transit','delivered','failed')
                  NOT NULL DEFAULT 'pending',
  shipping_cost   INT UNSIGNED NOT NULL,
  shipped_at      TIMESTAMP NULL,
  delivered_at    TIMESTAMP NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipments_order (order_id),
  UNIQUE KEY uq_shipments_tracking (tracking_number),
  CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;
