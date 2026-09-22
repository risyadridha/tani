import mysql from "mysql2/promise";

// ---------------------------------------------------------------------------
// MySQL pool — satu-satunya jalur database production. Kredensial HANYA dari
// environment (tidak pernah dari browser). Tanpa DATABASE_URL yang valid,
// route data menjawab 503 DB_UNAVAILABLE secara eksplisit (tanpa fallback
// diam-diam ke mock/file).
//
// Dev default menunjuk XAMPP lokal: mysql://root@localhost:3306/tanihub
// ---------------------------------------------------------------------------

let pool: mysql.Pool | null = null;
let misconfigured = false;

function databaseUrl(): string | null {
  const url =
    process.env.DATABASE_URL ?? "mysql://root@localhost:3306/tanihub";
  return url.trim() === "" ? null : url;
}

export function isDbConfigured(): boolean {
  return databaseUrl() !== null && !misconfigured;
}

export function getPool(): mysql.Pool {
  const url = databaseUrl();
  if (!url) {
    misconfigured = true;
    throw new Error("DB_UNAVAILABLE");
  }
  if (!pool) {
    pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
      timezone: "+07:00",
    });
  }
  return pool;
}

export type DbConn = mysql.Pool | mysql.PoolConnection;

// Baris DB generik — akses field memakai str()/num()/bool() di bawah agar
// tidak ada `any` yang lolos ke business logic.
export type DbRow = Record<string, unknown>;

export function str(r: DbRow, key: string): string {
  const v = r[key];
  return typeof v === "string" ? v : "";
}

export function strOrNull(r: DbRow, key: string): string | null {
  const v = r[key];
  return typeof v === "string" ? v : null;
}

export function num(r: DbRow, key: string): number {
  const v = r[key];
  return typeof v === "number" ? v : Number(v ?? 0);
}

export function bool(r: DbRow, key: string): boolean {
  return r[key] === 1 || r[key] === true;
}

export function isoDate(r: DbRow, key: string): string {
  const v = r[key];
  return v instanceof Date ? v.toISOString() : String(v ?? "");
}

export async function query<T = mysql.RowDataPacket[]>(
  conn: DbConn,
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const [rows] = await conn.query<T & mysql.RowDataPacket[][]>(sql, params as never[]);
  return rows as unknown as T;
}

// Untuk INSERT/UPDATE/DELETE — kembalikan affectedRows/insertId.
export async function execute(
  conn: DbConn,
  sql: string,
  params: unknown[] = []
): Promise<{ affectedRows: number; insertId: number }> {
  const [result] = await conn.query<mysql.ResultSetHeader>(sql, params as never[]);
  return { affectedRows: result.affectedRows, insertId: result.insertId };
}

// Escape karakter wildcard LIKE (% _ \) agar input user tak melebar makna.
export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// Transaksi dengan rollback otomatis. Callback menerima koneksi khusus;
// SEMUA query dalam callback wajib memakai koneksi itu (bukan pool).
export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // Rollback terbaik; error asli yang dilempar.
    }
    throw err;
  } finally {
    conn.release();
  }
}
