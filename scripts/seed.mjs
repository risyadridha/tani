// scripts/seed.mjs — seed dev dari mockFarmers/mockProducts ke MySQL.
// DEV ONLY (password seed terdokumentasi di bawah; jangan dipakai production).
// Idempotent via email guard. Run: node scripts/seed.mjs
import mysql from "mysql2/promise";
import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SEED_PASSWORD = "TaniSeed123";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL ?? "mysql://root@localhost:3306/tanihub";

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, derived) => {
      if (err) reject(err);
      else resolve(`scrypt$v1$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`);
    });
  });
}

// ⬆ Format hash identik dengan src/lib/server/password.ts
// (scrypt$v1$N$r$p$saltB64$hashB64).

// Ambil mock tanpa TS: parse ringan dari file sumber (id/name penting saja).
const productsSrc = readFileSync(join(root, "src/data/products.ts"), "utf8");
const farmersSrc = readFileSync(join(root, "src/data/farmers.ts"), "utf8");

const pool = mysql.createPool({ uri: url, waitForConnections: true, connectionLimit: 2 });

async function ensureUser(name, email, role) {
  const [[existing]] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing) return existing.id;
  const id = randomUUID();
  await pool.query(
    "INSERT INTO users (id, name, email, phone, password_hash, role, status) VALUES (?, ?, ?, '', ?, ?, 'active')",
    [id, name, email, await hashPassword(SEED_PASSWORD), role]
  );
  return id;
}

await ensureUser("Admin TaniHub", "admin@tanihub.id", "admin");

async function ensureFarmer(fid, fallbackName, fallbackLocation) {
  const [[existing]] = await pool.query("SELECT id FROM farmers WHERE id = ? LIMIT 1", [fid]);
  if (existing) return;
  const userId = await ensureUser(fallbackName, `${fid}@seed.local`, "farmer");
  await pool.query(
    `INSERT INTO farmers (id, user_id, farm_name, location, description, farm_size, avatar_url, verified, member_since)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 2024)`,
    [fid, userId, fallbackName, fallbackLocation, `Petani ${fallbackName} dari ${fallbackLocation}.`, null, null]
  );
}

const farmerBlocks = [...farmersSrc.matchAll(/id:\s*"(farmer-\d+)",\s*name:\s*"([^"]+)",[\s\S]{0,400}?location:\s*"([^"]+)"/g)];
for (const [, fid, name, location] of farmerBlocks) {
  const email = `${fid}@seed.local`;
  const userId = await ensureUser(name, email, "farmer");
  const [[fExisting]] = await pool.query("SELECT id FROM farmers WHERE id = ? LIMIT 1", [fid]);
  if (!fExisting) {
    await pool.query(
      `INSERT INTO farmers (id, user_id, farm_name, location, description, farm_size, avatar_url, verified, member_since)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [fid, userId, name, location, `Petani ${name} dari ${location}.`, null, null, 2024]
    );
  }
}

// Farmer yang hanya ada di products.ts (tanpa profil mock) tetap butuh baris
// farmers demi FK — data minimal yang jujur dari produknya sendiri.
const prodFarmerIds = [...productsSrc.matchAll(/farmerId:\s*"(farmer-\d+)"/g)].map((m) => m[1]);
for (const fid of [...new Set(prodFarmerIds)]) {
  const idx = productsSrc.indexOf(`farmerId: "${fid}"`);
  const window = productsSrc.slice(Math.max(0, idx - 800), idx + 800);
  const name = (window.match(/farmerName:\s*"([^"]+)"/) || [])[1] || "Petani";
  const loc = (window.match(/location:\s*"([^"]+)"/) || [])[1] || "-";
  await ensureFarmer(fid, name, loc);
}

const prodBlocks = [...productsSrc.matchAll(/\{\s*id:\s*"(prod-\d+)",\s*name:\s*"([^"]+)",[\s\S]{0,900}?grade:\s*"([ABC])",\s*price:\s*(\d+),\s*unit:\s*"([^"]+)",\s*minOrder:\s*(\d+),\s*stock:\s*(\d+),\s*location:\s*"([^"]+)",\s*farmerId:\s*"([^"]+)",/g)];
let n = 0;
for (const m of prodBlocks) {
  const [, pid, name, grade, price, unit, minOrder, stock, location, farmerId] = m;
  const block = productsSrc.slice(m.index, m.index + 1200);
  const descMatch = block.match(/description:\s*"([^"]{0,200})/);
  const imgMatch = block.match(/images:\s*\[\s*"([^"]+)"/);
  const catMatch = block.match(/category:\s*"([^"]+)"/);
  const imageUrl = imgMatch?.[1] ?? "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80";
  const category = catMatch?.[1] ?? "Sayuran";
  const [[existing]] = await pool.query("SELECT id FROM products WHERE id = ? LIMIT 1", [pid]);
  if (existing) continue;
  await pool.query(
    `INSERT INTO products (id, farmer_id, name, category, description, image_url, grade, price, unit, min_order, status, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [pid, farmerId, name, category, (descMatch?.[1] ?? name).slice(0, 300), imageUrl, grade, Number(price), unit, Number(minOrder), location]
  );
  await pool.query("INSERT INTO inventory (product_id, quantity, unit) VALUES (?, ?, ?)", [pid, Number(stock), unit]);
  await pool.query(
    `INSERT INTO inventory_transactions (id, product_id, quantity_change, resulting_stock, reason, actor_id)
     VALUES (?, ?, ?, ?, 'INITIAL: seed', 'system')`,
    [randomUUID(), pid, Number(stock), Number(stock)]
  );
  n++;
}
await pool.end();

// Rating + profil agregat dari mock (display saja) — idempotent.
{
  const pool2 = mysql.createPool({ uri: url, waitForConnections: true, connectionLimit: 2 });
  const prodRate = [...productsSrc.matchAll(/id:\s*"(prod-\d+)"[\s\S]{0,2500}?rating:\s*([\d.]+),\s*reviewCount:\s*(\d+)/g)];
  for (const [, pid, rating, rc] of prodRate) {
    await pool2.query("UPDATE products SET rating = ?, review_count = ? WHERE id = ?", [Number(rating), Number(rc), pid]);
  }
  const farmBlocks = [...farmersSrc.matchAll(/id:\s*"(farmer-\d+)"([\s\S]{0,2200}?)(?=\n  \},\n  \{|\n  \}\n\];)/g)];
  for (const [, fid, body] of farmBlocks) {
    const pick = (re) => (body.match(re) || [])[1];
    const strArr = (key) => {
      const m = body.match(new RegExp(key + ":\\s*\\[([^\\]]*)\\]", "s"));
      if (!m) return [];
      return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    };
    const harvests = [...body.matchAll(/\{\s*crop:\s*"([^"]+)",\s*estimatedDate:\s*"([^"]+)",\s*estimatedQuantity:\s*"([^"]+)"\s*\}/g)]
      .map((h) => ({ crop: h[1], estimatedDate: h[2], estimatedQuantity: h[3] }));
    await pool2.query(
      "UPDATE farmers SET rating = ?, review_count = ?, completed_orders = ?, response_rate = ?, commodities = ?, certifications = ?, upcoming_harvests = ? WHERE id = ?",
      [Number(pick(/rating:\s*([\d.]+)/) ?? 0), Number(pick(/reviewCount:\s*(\d+)/) ?? 0),
       Number(pick(/completedOrders:\s*(\d+)/) ?? 0), Number(pick(/responseRate:\s*(\d+)/) ?? 100),
       JSON.stringify(strArr("commodities")), JSON.stringify(strArr("certifications")),
       JSON.stringify(harvests), fid]
    );
  }
  await pool2.end();
}
console.log(`seed done: farmers=${farmerBlocks.length}, new products=${n} (password seed: ${SEED_PASSWORD})`);
