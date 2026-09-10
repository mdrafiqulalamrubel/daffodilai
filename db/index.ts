import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const dbPath = resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || "./data/app.db");
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export { sqlite };

/** Mirrors the subset of the Cloudflare D1 API the route handlers call: prepare().bind().first()/.all()/.run(), and a top-level batch(). */
function statement(sql: string, args: unknown[] = []) {
  return {
    bind(...values: unknown[]) {
      return statement(sql, values);
    },
    async first<T = Record<string, unknown>>(): Promise<T | null> {
      return (sqlite.prepare(sql).get(...args) as T | undefined) ?? null;
    },
    async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
      return { results: sqlite.prepare(sql).all(...args) as T[] };
    },
    async run(): Promise<{ success: true; meta: { changes: number } }> {
      const r = sqlite.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(r.changes) } };
    },
  };
}

export function getDb() {
  return {
    prepare(sql: string) {
      return statement(sql);
    },
    async batch<T>(statements: { run(): Promise<T> }[]): Promise<T[]> {
      const pending = sqlite.transaction(() => statements.map((s) => s.run()))();
      return Promise.all(pending);
    },
  };
}
