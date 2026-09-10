import Database from "better-sqlite3";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const dbPath = resolve(process.env.DATABASE_PATH || "./data/app.db");
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const migrationsDir = resolve("./drizzle");
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of migrations) {
  const sql = readFileSync(resolve(migrationsDir, file), "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  let applied = 0;
  for (const statement of statements) {
    try {
      db.exec(statement);
      applied++;
    } catch (error) {
      if (/already exists/i.test(error.message)) continue;
      console.error(`Migration failed in ${file}:\n${statement}\n`);
      throw error;
    }
  }
  console.log(`${file}: ${applied}/${statements.length} statements applied`);
}

db.close();
console.log(`Database ready at ${dbPath}`);
