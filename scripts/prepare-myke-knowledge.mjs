import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildMykeKnowledge } from "../src/domain/mykeOrganization.js";
const root = new URL("../", import.meta.url);
const readme = readFileSync(new URL("README.md", root), "utf8");
const { topics } = buildMykeKnowledge(readme);
const publicHeadings = new Set([
  "Objetivo operativo", "Estado actual", "Arquitectura", "Fuentes de datos",
  "Reglas financieras actuales", "Discrepancias por investigar", "Costos y calidad de datos",
  "Inventarios, cortes e historial", "Preguntas pendientes con el departamento", "Bot 4Wall",
  "Metadatos de snapshot", "Desarrollo local", "Variables del frontend", "Despliegue",
  "Diseño", "Principios que no deben romperse", "Pendientes técnicos/funcionales",
  "UX de investigación y trazabilidad", "Acuerdos de la junta del 29 de septiembre de 2026",
  "Preguntas de lógica para próxima revisión", "Myke Hybrid Intelligence",
]);
const hash = (content) => createHash("sha256").update(content).digest("hex");
const documents = [...readme.matchAll(/^## (.+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
  .filter(([, heading]) => publicHeadings.has(heading))
  .map(([, heading, body]) => ({ path: "README.md", heading, sha256: hash(body), content: body.trim() }));
const moduleKeywords = {
  "normalize.js": "normalizar espacios mayusculas localidad area",
  "inventoryEngine.js": "motor fisico manual bot snapshot area phantom flujo",
  "reconcileInventory.js": "net swing qad costo comparar localidad clasificacion inesperado obsoleto",
  "explodeBom.js": "phantom bom usage level componente explosion recursivo",
  "partLearningTrace.js": "trazador evidencia pn numero parte lista recomendado filas formula resumen",
  "engineGuide.js": "lab explorar recorrido ejemplo motor",
  "buildDiscrepancyFindings.js": "advertencia alerta discrepancia oportunidad investigar prioridad hipotesis",
  "dataQuality.js": "costo faltante invalido calidad",
  "sourceEvidence.js": "evidencia excel fuente fila columna original normalizado",
  "bomLibrary.js": "bom biblioteca acumulativo guardar respaldo versiones",
  "scanView.js": "scan escaneo visor",
  "sourceCatalog.js": "fuentes catalogo archivos",
  "parse4WallScans.js": "4wall scan escaneo manual quantity areaname",
  "parse4WallAreas.js": "4wall area localidad relacion mapa",
  "parseQad32.js": "qad congelado frozen qty site itemtype filtrar",
  "parseISPBB.js": "ispbb phantom yes no prefijo",
  "parseBom.js": "bom usage level comp phantom parent component",
  "parseCostPart.js": "costpart cost part costo status precio invalido conflicto",
  "parseDelimitedFile.js": "csv excel xlsx separador archivo lectura",
  "useInventoryEngine.js": "motor snapshot manual bot reemplazar historia",
  "useReferenceFiles.js": "fuentes cargar archivo leer bom referencia",
  "sourceDetection.js": "archivo detectar encabezado columnas formato",
  "exportInventoryWorkbook.js": "exportar excel financiero reporte",
  "browserStorage.js": "guardar preferencias local almacenamiento",
};
// Only public application modules. No credentials, inventories or internal staff docs.
const paths = [
  ...["src/domain", "src/parsers"].flatMap((dir) =>
    readdirSync(new URL(dir, root)).filter((file) => file.endsWith(".js") && !file.startsWith("myke"))
      .map((file) => `${dir}/${file}`)),
  "src/hooks/useInventoryEngine.js", "src/hooks/useReferenceFiles.js",
  "src/services/sourceDetection.js", "src/services/exportInventoryWorkbook.js",
  "src/services/browserStorage.js", "src/domain/mykeKnowledge.js",
].sort();
const modules = paths.map((path) => {
  const content = readFileSync(new URL(path, root), "utf8");
  return { path, sha256: hash(content), keywords: moduleKeywords[path.split("/").at(-1)] || "", content };
});
const generated = {
  "knowledge.generated.json": {
    topics: topics.map(({ id, title, paragraphs, keywords, sources }) => ({ id, title, paragraphs, keywords, sources })),
  },
  "project-context.generated.json": { version: 1, documents, modules, operatingModel: {
    source: ".agents/AGENTS.md", principles: readFileSync(new URL(".agents/AGENTS.md", root), "utf8").split("## Engineering boundaries\n")[1].split("## Evidence, safety")[0].trim().split(/\n\s*\n/).slice(0, 2),
  } },
};
for (const [file, value] of Object.entries(generated)) {
  const targets = [new URL(`supabase/functions/myke-chat/${file}`, root)];
  if (file === "project-context.generated.json") targets.push(new URL(`public/myke/${file}`, root));
  const content = JSON.stringify(value, null, 2) + "\n";
  if (Buffer.byteLength(content) > 350000) throw new Error(`Myke context too large: ${file}`);
  for (const target of targets) {
    if (process.argv.includes("--check")) {
      if (readFileSync(target, "utf8") !== content)
        throw new Error(`Myke context is stale: ${file}; run npm run myke:knowledge`);
    } else writeFileSync(target, content);
  }
}
console.log(`Myke public context synchronized: ${topics.length} questions, ${documents.length} README sections, ${modules.length} actual modules. Internal organization and inventory excluded.`);
