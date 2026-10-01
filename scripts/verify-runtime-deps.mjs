import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const files = await walk("src");
const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
const unused = Object.keys(pkg.dependencies || {}).filter((dependency) => {
  const escaped = dependency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`[\\"\']${escaped}(?:/[^\\"\']*)?[\\"\']`);
  return !pattern.test(source);
});

if (unused.length) {
  throw new Error(
    `Runtime dependencies declared but not imported from src/:\n- ${unused.join("\n- ")}\n` +
    "Remove them or move tooling-only packages to devDependencies.",
  );
}

console.log(`Runtime dependency audit OK: ${Object.keys(pkg.dependencies || {}).length} direct packages are used by src/.`);
