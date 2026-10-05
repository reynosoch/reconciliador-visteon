import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseDelimitedFile } from "../src/parsers/parseDelimitedFile.js";
import { mergeBomLibrary } from "../src/domain/bomLibrary.js";
import {
  buildPartLearningTrace,
  sourceOrigin,
} from "../src/domain/partLearningTrace.js";
import { buildSourcePreview } from "../src/domain/sourceEvidence.js";
import { buildInventoryEngine } from "../src/domain/inventoryEngine.js";
const file = (name, text) => ({
  name,
  arrayBuffer: async () => new TextEncoder().encode(text).buffer,
});
const parse = async (name, text) => ({
  ...(await parseDelimitedFile(file(name, text))),
  loaded: true,
});
const sources = {
  scans: await parse(
    "4wSc.csv",
    "Número Parte QAD,Quantity,AreaName\nP,2,A\nC,6,B\nBAD,broken,A\n",
  ),
  areas: await parse(
    "4Wall-Area.csv",
    "Nombre,Localidad QAD\nA,WHSE\nB,ZWIP\n",
  ),
  ispbb: await parse(
    "ISPBB.csv",
    "Item Number,Site,Phantom\nP,179A,YES\nC,179A,NO\nC,OTHER,YES\n",
  ),
  qad: await parse(
    "QAD.csv",
    "Item Number,Site,Item Type,Location,Quantity On Hand\nC,179A,PP,ZWHSE,20\nP,179A,PP,ZWIP,3\nC,OTHER,PP,ZWIP,999\nC,179A,TOOL,ZWIP,999\n",
  ),
  cost: await parse(
    "Cost.csv",
    "Item Number,Cost Total,Status\nC,4.20,OBSOLETE\nP,3,ACTIVE\n",
  ),
};
const parsedBom = await parse(
  "BOM.txt",
  "Parent Item|Component|Level|Comp Phantom|Usage\nP|C|.2|NO|10\nP|IGNORED|1|NO|99\nP|PHANTOM|.2|YES|99\n",
);
const lib = mergeBomLibrary(undefined, parsedBom.rows, "BOM.txt", "hash");
sources.bom = { ...lib, loaded: true, fields: parsedBom.fields };
const engine = buildInventoryEngine({
  scanRows: sources.scans.rows,
  areaRows: sources.areas.rows,
  ispbbRows: sources.ispbb.rows,
  bomRows: lib.rows,
  qadRows: sources.qad.rows,
  costRows: sources.cost.rows,
});
const component = engine.reconciliation.find((item) => item.partNumber === "C"),
  parent = engine.reconciliation.find((item) => item.partNumber === "P");
assert.equal(component.physical.total, 26);
assert.equal(component.financial.netPieces, 6);
assert.ok(Math.abs(component.financial.netUsd - 25.2) < 1e-9);
assert.equal(component.financial.swingPieces, 6);
assert.ok(Math.abs(component.financial.swingUsd - 25.2) < 1e-9);
assert.deepEqual(
  component.trace.swingByLocation.map((row) => Number(row.swingUsd.toFixed(2))),
  [25.2, 0],
);
assert.equal(parent.qad.total, 3);
assert.equal(parent.physical.directTotal, 0);
assert.equal(parent.flags.phantomQadBalance, true);
// A relocated balance must retain both absolute location deltas, without halving.
const movedEngine = buildInventoryEngine({
  scanRows: [{ "Número Parte QAD": "C", Quantity: 26, AreaName: "B" }],
  areaRows: sources.areas.rows,
  ispbbRows: sources.ispbb.rows,
  qadRows: sources.qad.rows,
  costRows: sources.cost.rows,
});
const moved = movedEngine.reconciliation.find(
  (item) => item.partNumber === "C",
);
assert.equal(moved.financial.swingPieces, 46);
assert.ok(Math.abs(moved.financial.swingUsd - 193.2) < 1e-9);
const makeTrace = (item = component, extra = {}) =>
  buildPartLearningTrace({
    item,
    sources,
    engineSources: engine.sources,
    scanRows: sources.scans.rows,
    ...extra,
  });
const trace = makeTrace();
assert.equal(trace.complete, true);
assert.equal(trace.steps.length, 10);
assert.equal(trace.status, "Sobrante obsoleto");
assert.match(trace.formulas.netPieces.substitution, /26 − 20 = 6/);
assert.match(trace.formulas.netUsd.substitution, /6 × \$4.2 = \$25.20/);
assert.equal(trace.contributions[0].contribution, 20);
assert.equal(trace.steps[0].refs[0].evidence.length, 2); // direct component and generating parent
assert.deepEqual(
  trace.steps
    .find((step) => step.id === "qad")
    .refs[0].evidence.map((row) => row.sourceIndex),
  [0],
);
assert.deepEqual(
  trace.steps
    .find((step) => step.id === "phantom")
    .refs[0].evidence.map((row) => row.sourceIndex),
  [1, 0],
);
assert.equal(
  trace.steps.find((step) => step.id === "mapping").refs[0].evidence[1].cells[1]
    .original,
  "WHSE",
);
assert.equal(
  trace.steps.find((step) => step.id === "mapping").refs[0].evidence[1].cells[1]
    .normalized,
  "ZWHSE",
);
assert.equal(makeTrace(parent).contributions.length, 1);
assert.equal(
  makeTrace(parent).steps.find((step) => step.id === "bom").refs[0].evidence
    .length,
  3,
); // ignored BOM rows remain inspectable
assert.equal(sourceOrigin(sources.bom, 0).rowNumber, 2);
assert.equal(sourceOrigin(sources.bom, 1).rowNumber, 3);
assert.ok(!Object.hasOwn(lib.rows[0], "__provenance"));
const equalBom = mergeBomLibrary(
  lib,
  parsedBom.rows,
  "another.txt",
  "other-hash",
);
assert.equal(equalBom.rows.length, 3); // provenance cannot create a false BOM conflict
const ref = trace.steps.find((step) => step.id === "qad").refs[0];
const preview = buildSourcePreview({
  source: ref.source,
  config: { type: ref.type },
  evidence: ref.evidence,
});
assert.equal(preview.entries.filter((row) => row.evidence).length, 1);
assert.equal(preview.entries[0].origin.rowNumber, 2);
assert.ok(preview.usedColumns.has("Quantity On Hand"));
assert.ok(!preview.columns.includes("__provenance"));
assert.equal(
  buildSourcePreview({
    source: { rows: [] },
    evidence: [{ sourceIndex: 99, cells: [] }],
  }).entries.length,
  0,
);
const old = buildSourcePreview({
  source: {
    rows: [{ "Parent Item": "P", Component: "C", __sourceFile: "legacy.txt" }],
  },
  config: { type: "bom" },
});
assert.equal(old.entries[0].origin.rowNumber, null); // no fabricated row index
const noCost = structuredClone(component);
noCost.master.hasCost = false;
noCost.master.costState = "MISSING";
noCost.flags.financialStatus = "UNVALUED";
const missing = makeTrace(noCost, {
  sources: { ...sources, cost: { loaded: false, rows: [] } },
});
assert.equal(missing.complete, false);
assert.equal(
  missing.summary.find(([key]) => key === "NET USD")[1],
  "Sin valorar",
);
assert.match(missing.conclusion.join(" "), /provisionales/);
assert.match(missing.formulas.netUsd.substitution, /no se valida un USD 0/);
const missingBomEngine = buildInventoryEngine({
  scanRows: sources.scans.rows,
  areaRows: sources.areas.rows,
  ispbbRows: sources.ispbb.rows,
  qadRows: sources.qad.rows,
  costRows: sources.cost.rows,
});
const missingBom = missingBomEngine.reconciliation.find(
  (item) => item.partNumber === "P",
);
assert.equal(missingBom.flags.missingBom, true);
assert.match(
  buildPartLearningTrace({
    item: missingBom,
    engineSources: missingBomEngine.sources,
    sources: { ...sources, bom: { loaded: false, rows: [] } },
  }).steps.find((step) => step.id === "bom").result,
  /Falta BOM/,
);
// Prove explanations consume engine results rather than silently recalculating them.
const sentinels = structuredClone(component);
sentinels.financial.netUsd = 123.45;
sentinels.financial.swingUsd = 987.65;
assert.match(makeTrace(sentinels).formulas.netUsd.substitution, /123.45/);
assert.match(makeTrace(sentinels).conclusion.join(" "), /987.65/);
const book = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ["Título"],
  [],
  ["Item Number", "Cost Total", "Status"],
  ["00123", 0.0042, "ACTIVE"],
  [],
  ["00456", 2, "OBSOLETE"],
]);
XLSX.utils.book_append_sheet(book, sheet, "Costos reales");
const excel = await parseDelimitedFile(
  {
    name: "real.xlsx",
    arrayBuffer: async () =>
      XLSX.write(book, { type: "array", bookType: "xlsx" }),
  },
  { requiredFields: [["Item Number"], ["Cost Total"], ["Status"]] },
);
assert.deepEqual(
  excel.rows.map((row) => row.__provenance.rowNumber),
  [4, 6],
);
assert.equal(excel.rows[0].__provenance.sheetName, "Costos reales");
const multiline = await parse(
  "multi.csv",
  'Item Number,Description\r\n\r\nC,"two\r\nlines"\r\nD,last\r\n',
);
assert.deepEqual(
  multiline.rows.map((row) => row.__provenance.rowNumber),
  [3, 5],
);
assert.equal(buildPartLearningTrace({ item: null }), null);
console.log(
  "Tracer OK: domain formulas, accepted-row provenance, direct/derived BOM, missing sources/cost/BOM, legacy coordinates, XLSX blanks and multiline CSV.",
);
