// Secrets enter only through the runner/server environment; never CLI arguments or artifacts.
import { validCopilotEndpoint } from "../supabase/functions/myke-chat/copilot.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const project = "uukhwkywmnarcfruerpp";
const origin = "https://reynosoch.github.io";
const url = `https://${project}.supabase.co`;
const env = process.env;
const provider=env.MYKE_PROVIDER || "gemini";
if(!["copilot","gemini"].includes(provider))throw new Error("Proveedor no permitido.");
const values = {
  MYKE_PROVIDER: provider,
  MYKE_ACCESS_CODE: env.MYKE_ACCESS_CODE,
  MYKE_ALLOWED_ORIGINS: origin,
  ...(provider === "copilot" ? {
    MYKE_COPILOT_DIRECT_LINE_SECRET:env.MYKE_COPILOT_DIRECT_LINE_SECRET,
    MYKE_COPILOT_DIRECT_LINE_ENDPOINT:env.MYKE_COPILOT_DIRECT_LINE_ENDPOINT || "https://directline.botframework.com/v3/directline",
  } : {
    MYKE_GEMINI_API_KEY:env.MYKE_GEMINI_API_KEY,
    MYKE_GEMINI_MODEL:"gemini-3.8-flash",
    MYKE_GEMINI_FREE_TIER_CONFIRMED:"true",
  }),
};
if(provider === "gemini" && env.MYKE_GEMINI_FREE_TIER_CONFIRMED !== "true")
  throw new Error("Confirma primero el nivel gratuito y la ausencia de facturación en AI Studio.");
for (const name of ["SUPABASE_ACCESS_TOKEN", provider === "copilot" ? "MYKE_COPILOT_DIRECT_LINE_SECRET" : "MYKE_GEMINI_API_KEY", "MYKE_ACCESS_CODE"])
  if (!env[name] || /[\r\n]/.test(env[name])) throw new Error(`Falta o es inválido el secreto ${name}.`);
if(provider === "copilot" && !validCopilotEndpoint(values.MYKE_COPILOT_DIRECT_LINE_ENDPOINT))throw new Error("Endpoint Direct Line no permitido.");
if (env.MYKE_ACCESS_CODE.length < 24 || env.MYKE_ACCESS_CODE.length > 256)
  throw new Error("MYKE_ACCESS_CODE debe tener de 24 a 256 caracteres.");
if (env.VITE_SUPABASE_URL !== url || !env.VITE_SUPABASE_ANON_KEY)
  throw new Error("La configuración pública no corresponde al proyecto autorizado del reconciliador.");
const temporary = mkdtempSync(join(tmpdir(), "myke-secrets-"));
try {
  const file = join(temporary, "server.env");
  writeFileSync(file, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { mode: 0o600 });
  execFileSync("supabase", ["secrets", "set", "--env-file", file, "--project-ref", project], { stdio: "inherit" });
  execFileSync("supabase", ["functions", "deploy", "myke-chat", "--project-ref", project], { stdio: "inherit" });
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
const response = await fetch(`${url}/functions/v1/myke-chat`, {
  method: "POST",
  headers: {
    origin,
    apikey: env.VITE_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "x-myke-access-code": env.MYKE_ACCESS_CODE,
  },
  body: JSON.stringify({ question: "Explica brevemente cómo el motor obtiene NET y por qué SWING no se divide entre dos." }),
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Myke fue desplegado, pero la prueba real respondió HTTP ${response.status}; revisa secretos, JWT, cuota y permisos.`);
const result = await response.json();
if (typeof result.text !== "string" || !result.text.trim())
  throw new Error("La prueba real no devolvió texto; no se declara la conexión activa.");
console.log("Myke desplegado en el proyecto autorizado; una pregunta pública obtuvo respuesta real del proveedor configurado. No se enviaron datos de inventario.");
