// scripts/migrate.mjs — runner migrasi versioned (node scripts/migrate.mjs).
// Urutan: buat database bila belum ada -> catat schema_migrations ->
// jalankan file *.sql berurutan yang belum tercatat. Idempotent & re-runnable.
import mysql from "mysql2/promise";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "db", "migrations");
const url = process.env.DATABASE_URL ?? "mysql://root@localhost:3306/tanihub";
const u = new URL(url);
const dbName = u.pathname.replace(/^\//, "") || "tanihub";

const admin = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port) || 3306,
  user: decodeURIComponent(u.username) || "root",
  password: decodeURIComponent(u.password) || "",
  multipleStatements: true,
});
await admin.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await admin.end();

const pool = mysql.createPool({ uri: url, waitForConnections: true, connectionLimit: 2, multipleStatements: true });
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
let applied = 0;
for (const file of files) {
  const version = Number(file.split("_")[0]);
  const [[row]] = await pool.query("SELECT version FROM schema_migrations WHERE version = ?", [version]).catch(async (err) => {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (version INT UNSIGNED NOT NULL PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
      return [[undefined]];
    }
    throw err;
  });
  if (row) {
    console.log(`SKIP  ${file} (applied)`);
    continue;
  }
  const sql = readFileSync(join(dir, file), "utf8");
  const conn = await pool.getConnection();
  try {
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (version) VALUES (?)", [version]);
    applied++;
    console.log(`APPLY ${file}`);
  } finally {
    conn.release();
  }
}
await pool.end();
console.log(`done, ${applied} new migration(s)`);
