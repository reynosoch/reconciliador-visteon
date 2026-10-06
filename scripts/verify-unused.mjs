import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SRC = "src";
const ENTRY = "src/main.jsx";
const EXTENSIONS = [".js", ".jsx"];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.posix.join(dir.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) files.push(full);
  }
  return files;
}

function importSpecifiers(source) {
  const found = new Set();
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

function resolveRelative(fromFile, specifier, sourceFiles) {
  if (!specifier.startsWith(".")) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier.split("?")[0]));
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.posix.join(base, "index" + ext)),
  ];
  return candidates.find((candidate) => sourceFiles.has(candidate)) || null;
}

const files = await walk(SRC);
const sourceFiles = new Set(files);
if (!sourceFiles.has(ENTRY)) throw new Error(`Missing source entry: ${ENTRY}`);

const graph = new Map();
for (const file of files) {
  const source = await readFile(file, "utf8");
  const imports = importSpecifiers(source)
    .map((specifier) => resolveRelative(file, specifier, sourceFiles))
    .filter(Boolean);
  graph.set(file, imports);
}

const reachable = new Set();
const stack = [ENTRY];
while (stack.length) {
  const file = stack.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  for (const dependency of graph.get(file) || []) stack.push(dependency);
}

const unused = files.filter((file) => !reachable.has(file)).sort();
if (unused.length) {
  throw new Error(
    `Unused src modules are not reachable from ${ENTRY}:\n- ${unused.join("\n- ")}\n` +
    "Delete them or wire them into the runtime deliberately.",
  );
}

console.log(`Source graph OK: ${reachable.size} runtime modules reachable from ${ENTRY}`);
