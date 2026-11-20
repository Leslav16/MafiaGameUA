import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Passwords and keys: stored hashed, compared in constant time, ids hard to guess. */

/** A random id of the given number of bytes, safe in URLs. */
export const newId = (bytes: number) => randomBytes(bytes).toString("base64url");

/** The host password is never kept as typed: only a salted scrypt hash. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const got = scryptSync(password, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(got, Buffer.from(hash, "hex"));
}

/** Compares two strings in constant time, so the answer's speed gives nothing away. */
export function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
