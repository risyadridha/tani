import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Password hashing dengan scrypt bawaan Node (memory-hard, NIST-approved).
// Dipilih karena zero-dependency dan berjalan di Route Handler Node runtime;
// setara kelas dengan bcrypt untuk tahap ini. Format mandiri ber-version:
//   scrypt$v1$N$r$p$saltB64$hashB64
// ---------------------------------------------------------------------------

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, KEY_LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (err, derived) => {
      if (err || !Buffer.isBuffer(derived)) reject(err ?? new Error("scrypt failed"));
      else resolve(derived);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = await scryptAsync(password, salt);
  return `scrypt$v1$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 7 || parts[0] !== "scrypt" || parts[1] !== "v1") return false;
    const salt = Buffer.from(parts[5], "base64");
    const expected = Buffer.from(parts[6], "base64");
    if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return false;
    const actual = await scryptAsync(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
