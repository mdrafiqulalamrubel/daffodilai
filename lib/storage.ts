import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";

const root = resolve(/* turbopackIgnore: true */ process.env.UPLOADS_DIR || "./data/uploads");

function pathFor(key: string) {
  const target = resolve(root, /* turbopackIgnore: true */ key);
  if (!target.startsWith(root)) throw new Error("Invalid storage key");
  return target;
}

export function storage() {
  return {
    async put(key: string, bytes: Uint8Array) {
      const path = pathFor(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    },
    async get(key: string): Promise<{ body: ReadableStream } | null> {
      const path = pathFor(key);
      try {
        const stream = createReadStream(path);
        await new Promise<void>((res, rej) => {
          stream.once("open", () => res());
          stream.once("error", rej);
        });
        return { body: Readable.toWeb(stream) as ReadableStream };
      } catch {
        return null;
      }
    },
    async delete(key: string) {
      await rm(pathFor(key), { force: true });
    },
  };
}
