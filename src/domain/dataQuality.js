const WARNING_KEYS = [
  "missingBoms",
  "emptyBoms",
  "unmappedAreaNames",
  "partsWithoutCost",
  "unexpectedMaterial",
  "invalidCostRows",
  "duplicateCostParts",
  "phantomDefinitionMismatches",
  "invalidPhysicalQuantityRows",
  "invalidQadQuantityRows",
];

export function countDataWarnings(diagnostics, enabled = true) {
  if (!enabled) return 0;
  const warnings = diagnostics?.warnings || {};
  return WARNING_KEYS.reduce(
    (total, key) => total + (warnings[key]?.length || 0),
    0,
  );
}

export function describeDataQuality(diagnostics, referencesReady = false) {
  if (!referencesReady) {
    return {
      count: 0,
      label: "PENDIENTE",
      detail: "Faltan referencias",
      tone: "pending",
    };
  }

  if (!diagnostics) {
    return {
      count: 0,
      label: "EN ESPERA",
      detail: "Motor sin diagnóstico",
      tone: "pending",
    };
  }

  const count = countDataWarnings(diagnostics, true);
  if (count === 0) {
    return {
      count,
      label: "BUENA",
      detail: "Sin alertas de calidad",
      tone: "good",
    };
  }

  if (count <= 10) {
    return {
      count,
      label: "REVISAR",
      detail: `${count} alertas de calidad`,
      tone: "warning",
    };
  }

  return {
    count,
    label: "ATENCIÓN",
    detail: `${count} alertas de calidad`,
    tone: "error",
  };
}
