import { execFileSync } from "node:child_process";

const WORKFLOW = "deploy-pages.yml";
const BRANCH = "main";
const API_VERSION = "2022-11-28";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function getRepo() {
  const remote = run("git", ["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!match) {
    throw new Error(`No pude identificar owner/repo desde origin: ${remote}`);
  }
  return { owner: match[1], name: match[2] };
}

function getCredentialToken() {
  try {
    const output = execFileSync("git", ["credential", "fill"], {
      encoding: "utf8",
      input: "protocol=https\nhost=github.com\n\n",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const fields = Object.fromEntries(
      output
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
    return fields.password || "";
  } catch {
    return "";
  }
}

function getGhToken() {
  try {
    return run("gh", ["auth", "token"]);
  } catch {
    return "";
  }
}

async function github(token, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "visteon-inventory-reconciler-deploy",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitHub API ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 400)}` : ""}`,
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const { owner, name } = getRepo();

const branch = run("git", ["branch", "--show-current"]);
if (branch !== BRANCH) {
  throw new Error(
    `Deploy cancelado: estás en la rama "${branch || "(detached)"}". Cambia a "${BRANCH}" antes de publicar.`,
  );
}

const status = run("git", ["status", "--porcelain"]);
if (status) {
  console.log("Aviso: tienes cambios locales sin commit. Pages publicará origin/main, no esos cambios locales.");
}

const token = getGhToken() || getCredentialToken();
if (!token) {
  throw new Error(
    "No encontré una credencial de GitHub disponible. Haz un git pull/push autenticado una vez y vuelve a ejecutar npm.cmd run deploy.",
  );
}

const before = Date.now();
console.log(`Publicando ${owner}/${name} desde ${BRANCH} con GitHub Pages Actions…`);

await github(
  token,
  `/repos/${owner}/${name}/actions/workflows/${WORKFLOW}/dispatches`,
  {
    method: "POST",
    body: JSON.stringify({ ref: BRANCH }),
    headers: { "Content-Type": "application/json" },
  },
);

let runInfo = null;
for (let attempt = 0; attempt < 30; attempt += 1) {
  const data = await github(
    token,
    `/repos/${owner}/${name}/actions/workflows/${WORKFLOW}/runs?branch=${BRANCH}&event=workflow_dispatch&per_page=5`,
  );
  runInfo = data.workflow_runs?.find(
    (item) => new Date(item.created_at).getTime() >= before - 5000,
  );
  if (runInfo) break;
  await sleep(2000);
}

if (!runInfo) {
  throw new Error(
    "GitHub aceptó el deploy, pero no pude localizar el workflow recién creado. Revisa Actions.",
  );
}

console.log(`Workflow: ${runInfo.html_url}`);

while (runInfo.status !== "completed") {
  await sleep(4000);
  runInfo = await github(
    token,
    `/repos/${owner}/${name}/actions/runs/${runInfo.id}`,
  );
  process.stdout.write(
    `\rEstado: ${runInfo.status.padEnd(12)} · ${runInfo.name || "GitHub Pages"}        `,
  );
}

process.stdout.write("\n");

if (runInfo.conclusion !== "success") {
  throw new Error(
    `Deploy terminó con estado "${runInfo.conclusion}". Revisa: ${runInfo.html_url}`,
  );
}

console.log("Deploy completado correctamente.");
console.log(`Pages: https://${owner}.github.io/${name}/`);
