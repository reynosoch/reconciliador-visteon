// Deterministic retrieval from build-verified public sources; no database/vector service.
const words = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) || [];
const baselineModules = new Set(["inventoryEngine.js", "reconcileInventory.js", "explodeBom.js", "normalize.js"]);
const baselineDocuments = new Set(["Arquitectura", "Reglas financieras actuales", "Costos y calidad de datos"]);
export function selectProjectContext(context, question) {
  const tokens = new Set(words(question).filter((word) => word.length > 2 || ["pn", "pp", "mp", "fp"].includes(word)));
  const score = (value) => words(value).reduce((sum, word) => sum + (tokens.has(word) ? 1 : 0), 0);
  const extraModules = context.modules
    .filter((module) => !baselineModules.has(module.path.split("/").at(-1)))
    .map((module) => ({ module, score: score(module.path + " " + module.keywords) }))
    .filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((entry) => entry.module);
  const extraDocuments = context.documents
    .filter((doc) => !baselineDocuments.has(doc.heading))
    .map((doc) => ({ doc, score: score(doc.heading) }))
    .filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map((entry) => entry.doc);
  const selected = {
    documents: [...context.documents.filter((doc) => baselineDocuments.has(doc.heading)), ...extraDocuments],
    modules: context.modules.filter((module) => baselineModules.has(module.path.split("/").at(-1))),
    availableModules: context.modules.map((module) => module.path),
  };
  if (JSON.stringify(selected).length > 120000)
    throw new Error("Core Myke context exceeds the request budget; review the generated sources.");
  // Whole modules only: never clip a formula or omit a condition in a code fragment.
  for (const module of extraModules) {
    const candidate = { ...selected, modules: [...selected.modules, module] };
    if (JSON.stringify(candidate).length <= 120000) selected.modules.push(module);
  }
  return selected;
}
