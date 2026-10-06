// Diagnose an incomplete checkout before Vite attempts to transform the AI worker.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
try {
  require.resolve("@huggingface/transformers");
} catch {
  console.error(`Myke necesita una dependencia que falta en node_modules.
Detén Vite y ejecuta en esta carpeta (PowerShell):
  $env:ONNXRUNTIME_NODE_INSTALL="skip"
  npm.cmd ci
  npm.cmd run dev
En bash: ONNXRUNTIME_NODE_INSTALL=skip npm ci
Esto instala el runtime; el modelo solo se descarga al activar la IA.`);
  process.exitCode = 1;
}
