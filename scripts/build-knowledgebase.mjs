import mammoth from "mammoth";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";

const DOCX_DIR = join(process.cwd(), "public", "knowledgebase_ai_bot");
const WEB_DIR = join(process.cwd(), "lib", "knowledgebase-sources");
const OUT_FILE = join(process.cwd(), "lib", "knowledgebase.json");

function chunkText(text, title, source, maxLen = 700) {
  const paragraphs = text
    .split(/\n{1,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const chunks = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + " " + p).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = (current + " " + p).trim();
    }
  }
  if (current) chunks.push(current.trim());

  return chunks
    .filter((c) => c.length > 25)
    .map((text, i) => ({ id: `${source}-${i}`, source, title, text }));
}

function titleFromFilename(file) {
  return basename(file, extname(file))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function run() {
  const entries = [];

  // 1. Local .docx knowledgebase (product Features & USP documents)
  const docxFiles = readdirSync(DOCX_DIR).filter((f) => f.toLowerCase().endsWith(".docx"));
  for (const file of docxFiles) {
    const full = join(DOCX_DIR, file);
    const { value: text } = await mammoth.extractRawText({ path: full });
    const title = titleFromFilename(file);
    const source = titleFromFilename(file).toLowerCase().replace(/\s+/g, "-");
    entries.push(...chunkText(text, title, source));
    console.log(`Parsed ${file}: ${text.length} chars`);
  }

  // 2. Saved web snapshots (perfecthr.net, eduvas.com)
  const webFiles = readdirSync(WEB_DIR).filter((f) => f.toLowerCase().endsWith(".txt"));
  for (const file of webFiles) {
    const full = join(WEB_DIR, file);
    const text = readFileSync(full, "utf8");
    const title = titleFromFilename(file);
    const source = titleFromFilename(file).toLowerCase().replace(/\s+/g, "-");
    entries.push(...chunkText(text, title, source));
    console.log(`Parsed ${file}: ${text.length} chars`);
  }

  writeFileSync(OUT_FILE, JSON.stringify(entries, null, 1));
  console.log(`\nWrote ${entries.length} chunks to ${OUT_FILE}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
