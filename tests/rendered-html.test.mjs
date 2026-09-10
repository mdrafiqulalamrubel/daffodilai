import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("production build serves the public homepage", async () => {
  const root = resolve(import.meta.dirname, "..");
  const dir = await mkdtemp(join(tmpdir(), "dai-start-"));
  const port = 4100 + (process.pid % 400);

  const child = spawn(
    process.execPath,
    [join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    {
      cwd: root,
      env: {
        ...process.env,
        DATABASE_PATH: join(dir, "app.db"),
        UPLOADS_DIR: join(dir, "uploads"),
        AUTH_SECRET: "test-secret-not-for-production",
        SITE_URL: `http://localhost:${port}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));

  try {
    const deadline = Date.now() + 30000;
    while (!/Ready in|started server/i.test(out)) {
      if (Date.now() > deadline) throw new Error("next start did not become ready:\n" + out);
      if (child.exitCode !== null) throw new Error("next start exited early:\n" + out);
      await new Promise((r) => setTimeout(r, 200));
    }

    const response = await fetch(`http://localhost:${port}/`, {
      headers: { accept: "text/html" },
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /Daffodil AI/);
    assert.match(html, /<script type="application\/ld\+json">/);
  } finally {
    child.kill();
    await rm(dir, { recursive: true, force: true });
  }
});
