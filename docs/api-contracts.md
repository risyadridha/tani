# TaniHub — API Contract (Sprint 2–3, backend target)

## Auth (Sprint 3 — IMPLEMENTED, file persistence)

Sesi opaque via cookie `tanihub_session` (HttpOnly, SameSite=Lax, Secure saat
production, 7 hari). Rate limit 10 req/menit/IP untuk register/login
(single-instance, in-memory). Error generik untuk login (tanpa enumerasi).

### POST /api/auth/register — 201, tanpa auth
Body: `{ name, email, password }` (email dinormalisasi lowercase, UNIQUE).
Response: `{ data: { id, name, email, role, status, createdAt } }` — tanpa hash.
Error: `400/422` validasi, `409 EMAIL_TAKEN`, `429 RATE_LIMITED`.

### POST /api/auth/login — 200, tanpa auth
Body: `{ email, password }`. Response sama. Error: `401 INVALID_CREDENTIALS`
(generik untuk: tidak ada, salah, suspended), `429`.

### POST /api/auth/logout — 200, auth opsional
Hapus sesi server + cookie. Response: `{ data: { ok: true } }`.

### GET /api/auth/me — 200, butuh sesi valid
Response safe user. `401 UNAUTHENTICATED` bila tanpa/kedaluwarsa/di-suspend/dihapus.

## Orders (kontrak Sprint 2 — IMPLEMENTED Sprint 4)

`POST /api/orders` (transaksi: lock stok → validasi → harga server → order+items+snapshot → stok → inv-tx → payment/shipment pending → COMMIT) • `GET /api/orders` (scope buyer) • `GET /api/orders/:id` (buyer/farmer pemilik, selain itu 404) • `PATCH /api/orders/:id/status` (peran + mesin, buyer/farmer dicoba berurutan) • `POST /api/orders/:id/pay` (mock, idempotent) • `GET /api/farmer/orders` (scope farmer, `actionOnly`).

## Products / Inventory / Seller / Farmers (IMPLEMENTED Sprint 4)

`GET /api/products` (publik, `?mine=true` milik farmer) • `POST /api/products` (farmer, produk+inventory atomik) • `GET/PATCH/DELETE /api/products/:id` (ownership di WHERE; DELETE 409 bila ber-riwayat) • `GET /api/inventory`, `GET /api/inventory/:productId`, `POST /api/inventory/:productId/adjust` (tercatat, anti-negatif) • `GET/POST /api/seller/applications`, `POST /:id/submit`, `PATCH /:id/review` (admin; approve = transaksi aplikasi→farmer+role) • `GET /api/farmers`, `GET /api/farmers/:id`, `GET /api/seller/status` (gate UI).

Prototype saat ini belum punya backend; kontrak ini yang akan diimplementasikan
backend (Next.js/API → Service → MySQL di `docs/mysql-schema.sql`).
Shape response konsisten: `{ data }` sukses, `{ error: { code, message } }` gagal.

## Auth
Semua endpoint memakai authenticated identity (bearer/session).
`buyerId`/`farmerId` diambil dari identity — TIDAK PERNAH dari body.

## Orders

### POST /api/orders — buat order dari cart
Request (frontend hanya kirim ID + qty + opsi; HARGA dihitung server):
```json
{
  "items": [{ "productId": "prod-1", "quantity": 20 }],
  "address": { "fullName": "...", "phone": "...", "email": "...", "province": "...", "city": "...", "district": "...", "village": "...", "address": "...", "postalCode": "12345", "notes": "..." },
  "courier": "jne",
  "courierService": "REG",
  "paymentMethod": "va",
  "idempotencyKey": "idem-abc123"
}
```
Response `201`: `{ "data": { "groupId": "GRP-...", "orderIds": ["ORD-..."] } }`
Error: `400 EMPTY_CART | INVALID_QUANTITY | BELOW_MIN_ORDER`,
`404 PRODUCT_NOT_FOUND`, `409 PRODUCT_INACTIVE | INSUFFICIENT_STOCK | DUPLICATE_IDEMPOTENCY` (kembalikan order lama),
`401/403` auth.
Server: transaksi DB (validasi → harga authoritative → insert → kurangi stok → payment+shipment pending → COMMIT).

### GET /api/orders — order milik buyer
Query: `?status=&page=&limit=` → `200 { data: Order[], meta: { page, limit, total } }`.
Hanya `buyer_id = authenticatedUser.id`.

### GET /api/orders/:id — detail satu order
`200 { data: Order }`; `404` bila tidak ada/bukan miliknya.

### PATCH /api/orders/:id/status — transisi status
```json
{ "to": "confirmed" }
```
Server validasi `canTransitionOrderStatus` + peran (farmer vs buyer, §7 domain).
Error: `409 ILLEGAL_TRANSITION`, `403 FORBIDDEN` (bukan pemilik).

### POST /api/orders/:id/cancel — pintasan buyer
Hanya bila transisi buyer `→ cancelled` valid; selain itu `409`.

### GET /api/farmer/orders — inbox farmer
Query: `?status=&page=&limit=`; hanya `farmer_id` milik farmer login.
Detail memakai `GET /api/orders/:id` (dengan cek kepemilikan farmer).

## Payments (mock → gateway)
- `POST /api/orders/:id/pay` (prototype: tandai lunas; production: buat transaksi gateway, JANGAN terima `amount`/`status` dari client).
- Webhook gateway → update `payments.status` + `orders` bila perlu. Kartu/CVV tidak pernah menyentuh DB aplikasi.

## Error shape
```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Stok \"Cabai\" tidak mencukupi (tersisa 5 kg)." } }
```
Kode stabil untuk i18n frontend; pesan aman untuk user (tanpa SQL/stack/secret).
