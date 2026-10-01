import { access, readdir } from "node:fs/promises";
import path from "node:path";

const forbiddenFiles = [
  "src/App.legacy.backup.jsx",
  "codigo_completo.txt",
  "src/assets/react.svg",
  "src/assets/vite.svg",
  "src/assets/hero.png",
  "simulador.py",
  "src/components/FinancialKpis.jsx",
  "src/components/ReconciliationTable.jsx",
  "public/icons.svg",
  "src/components/shell/BomCloudStatus.jsx",
  "public/favicon.svg",
  "PROJECT_CONTEXT.md",
  "SECURITY_REVIEW.md",
  "BOT_CONTROL_SETUP.md",
  "supabase/bom-protected-setup.sql",
  "supabase/bom-verify-transaction.sql",
  "supabase/bom-enable-no-login.sql",
  "supabase/bom-delete-no-login.sql",
];

const junkNamePatterns = [
  /\.bak$/i,
  /\.old$/i,
  /\.orig$/i,
  /~$/,
  /\.legacy\./i,
  /\.backup\./i,
];

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (["node_modules", "dist", ".git", ".temp"].includes(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(base, absolute).replaceAll("\\", "/");
    if (entry.isDirectory()) results.push(...(await walk(absolute, base)));
    else results.push(relative);
  }
  return results;
}

const violations = [];

for (const file of forbiddenFiles) {
  if (await exists(file)) violations.push(file);
}

for (const file of await walk("src")) {
  if (junkNamePatterns.some((pattern) => pattern.test(file))) {
    violations.push(`src/${file}`);
  }
}

if (violations.length) {
  throw new Error(
    `Repo cleanup verification failed. Remove legacy/backup artifacts:\n- ${[...new Set(violations)].join("\n- ")}`,
  );
}

console.log("Repo hygiene OK");
