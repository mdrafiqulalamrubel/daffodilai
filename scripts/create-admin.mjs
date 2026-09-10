import Database from "better-sqlite3";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD, then re-run: npm run create-admin");
  process.exit(1);
}
if (password.length < 10) {
  console.error("ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

// Matches lib/auth.ts's hashPassword() format exactly (salt:hash hex, scrypt).
function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const dbPath = resolve(process.env.DATABASE_PATH || "./data/app.db");
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

const now = new Date().toISOString();
const passwordHash = hashPassword(password);
const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);

if (existing) {
  db.prepare("UPDATE users SET password_hash=? WHERE email=?").run(passwordHash, email);
  console.log(`Updated password for existing admin user: ${email}`);
} else {
  db.prepare(
    "INSERT INTO users(id,email,password_hash,created_at) VALUES (?,?,?,?)",
  ).run(randomUUID(), email, passwordHash, now);
  console.log(`Created admin user: ${email}`);
}

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
if (!adminEmails.includes(email)) {
  console.warn(
    `Note: ${email} is not listed in ADMIN_EMAILS, so it won't get platform-admin / auto-Owner rights until it is.`,
  );
}

db.close();
