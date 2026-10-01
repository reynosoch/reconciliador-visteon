import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const cssPath = "src/styles/pacman.css";
const css = await readFile(cssPath, "utf8");
const sourceFiles = (await walk("src")).filter((file) => !file.endsWith(".css"));
sourceFiles.push("index.html");
const source = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");

const classes = [...new Set([...css.matchAll(/\.((?:vi)-[A-Za-z0-9_-]+)/g)].map((match) => match[1]))].sort();
const unused = classes.filter((name) => !source.includes(name));

console.log(`Custom CSS audit: ${classes.length} vi-* classes, ${unused.length} not referenced outside CSS.`);
if (unused.length) console.log(unused.join("\n"));
