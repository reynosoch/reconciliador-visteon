import { normalizePartNumber, safeNumber } from "./normalize.js";

// Junta 29/09: el escaneo phantom se convierte SOLO a componentes NO de nivel .2.
// No recorrer descendientes ni usar Grossed up Usage. Conservar localidad y origen.
export function explodeBom({ physical, bom, planning, targetParts = null }) {
  const byPart = new Map(),
    missingBoms = [],
    emptyBoms = [],
    mismatches = [];
  const targets = targetParts
    ? new Set(targetParts.map(normalizePartNumber))
    : null;
  let scannedParentsWithBom = 0,
    totalRelationsProcessed = 0,
    totalContributedPieces = 0;
  for (const [parentPart, scan] of physical?.byPart ?? []) {
    if (planning?.byPart.get(parentPart)?.phantom !== true) continue;
    const relations = bom?.byParent.get(parentPart);
    if (!relations?.length) {
      missingBoms.push({ parentPart, scannedQuantity: scan.physicalTotal });
      continue;
    }
    scannedParentsWithBom++;
    if (relations.some((r) => r.parentPhantomReported === false))
      mismatches.push({
        parentPart,
        componentPart: parentPart,
        ispbbPhantom: true,
        bomPhantom: false,
      });
    const eligible = relations.filter(
      (r) =>
        r.eligibleLevel &&
        r.componentPhantomReported === false &&
        Number.isFinite(r.usage) &&
        r.usage > 0,
    );
    if (!eligible.length)
      emptyBoms.push({ parentPart, scannedQuantity: scan.physicalTotal });
    for (const relation of eligible) {
      const componentPart = relation.componentPart;
      if (targets && !targets.has(componentPart)) continue;
      if (!byPart.has(componentPart))
        byPart.set(componentPart, {
          partNumber: componentPart,
          totalContribution: 0,
          byLocation: new Map(),
          sources: [],
          warnings: [],
        });
      const adjustment = byPart.get(componentPart);
      const locations = scan.locations?.size
        ? scan.locations
        : new Map([["UNMAPPED", scan.physicalTotal]]);
      for (const [location, qty] of locations) {
        const contribution = safeNumber(qty) * relation.usage;
        adjustment.byLocation.set(
          location,
          (adjustment.byLocation.get(location) ?? 0) + contribution,
        );
        adjustment.totalContribution += contribution;
        totalContributedPieces += contribution;
        adjustment.sources.push({
          parentPart,
          componentPart,
          location,
          scannedParentQty: qty,
          usage: relation.usage,
          contribution,
          parentDescription: relation.parentDescription,
          componentDescription: relation.componentDescription,
          bomLevel: relation.rawLevel,
          ispbbPhantom: planning?.byPart.get(componentPart)?.phantom === true,
          bomReportedPhantom: false,
          sourceFile: relation.sourceFile,
        });
      }
      totalRelationsProcessed++;
    }
  }
  return {
    byPart,
    missingBoms,
    emptyBoms,
    totalAdjustedParts: byPart.size,
    scannedParentsWithBom,
    totalRelationsProcessed,
    totalContributedPieces,
    phantomDefinitionMismatches: mismatches,
  };
}
