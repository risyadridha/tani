// scripts/make-hash.mjs — DEV ONLY: cetak hash scrypt format app untuk seeding.
// Run: node scripts/make-hash.mjs "Password123" (jangan commit output).
import { randomBytes, scrypt } from "node:crypto";

const password = process.argv[2] ?? "TaniSeed123";
const salt = randomBytes(16);
scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, derived) => {
  if (err) throw err;
  console.log(`scrypt$v1$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`);
});
