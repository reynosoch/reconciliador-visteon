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

const cssFiles = (await walk("src/styles"))
  .filter((file) => file.endsWith(".css"))
  .sort();
const css = (
  await Promise.all(cssFiles.map((file) => readFile(file, "utf8")))
).join("\n");
const sourceFiles = (await walk("src")).filter((file) => !file.endsWith(".css"));
sourceFiles.push("index.html");
const source = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");

const classes = [...new Set([...css.matchAll(/\.((?:vi)-[A-Za-z0-9_-]+)/g)].map((match) => match[1]))].sort();

// DataHealthBar intentionally builds these from the pattern vi-health-${tone}.
const dynamicClasses = new Set([
  "vi-health-frozen",
  "vi-health-live",
  "vi-health-phantom",
  "vi-health-warning",
]);

const unused = classes.filter(
  (name) => !source.includes(name) && !dynamicClasses.has(name),
);

if (unused.length) {
  throw new Error(
    `Unused custom CSS classes found:\n- ${unused.join("\n- ")}\n` +
    "Delete the stale rules or document an intentional dynamic class in this audit.",
  );
}

console.log(
  `Custom CSS audit OK: ${classes.length} vi-* classes across ${cssFiles.length} CSS files; only documented dynamic classes bypass literal lookup.`,
);
