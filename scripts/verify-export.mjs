import { exportInventoryWorkbook } from "../src/services/exportInventoryWorkbook.js";

let capturedBlob = null;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const originalDocument = globalThis.document;
URL.createObjectURL = (blob) => { capturedBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};
globalThis.document = {
  body: { appendChild() {} },
  createElement() { return { href: "", download: "", click() {}, remove() {} }; },
};

const item = {
  partNumber: "TEST-PN",
  physical: { total: 100, directTotal: 100, bomContribution: 0, scanCount: 1, areas: ["AREA-1"] },
  qad: { total: 90 },
  master: { description: "Verification", hasCost: true, unitCost: 2, costState: "VALID" },
  financial: { netPieces: 10, netUsd: 20, grossLossUsd: 0, grossGainUsd: 20, swingPieces: 10, swingUsd: 20 },
  flags: { financialStatus: "GAIN", isObsolete: false, isPhantom: false, isUnexpectedMaterial: false, isMissingPhysical: false, hasUnmappedPhysicalLocation: false, hasBomReference: false },
  trace: { swingByLocation: [{ location: "ZWHSE", physicalQty: 100, qadQty: 90, delta: 10, swingPieces: 10 }] },
};

try {
  const result = await exportInventoryWorkbook({
    inventory: { name: "Verification" },
    summary: { netUsd: 20, grossLossUsd: 0, grossGainUsd: 20, swingUsd: 20, swingPieces: 10, phantomCount: 0, unvaluedPartCount: 0, qadOnlyCount: 0, unexpectedCount: 0, totalParts: 1 },
    rows: [item],
    findings: [],
    scanRows: [{ id: 1, numero_parte: "TEST-PN", cantidad: 100, area_escaneo: "AREA-1" }],
    sources: {},
    snapshotMeta: { complete: true },
    lastUpdated: new Date("2026-09-29T12:00:00Z"),
  });
  if (!capturedBlob) throw new Error("No XLSX blob was generated");
  const bytes = new Uint8Array(await capturedBlob.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) throw new Error("Generated file is not a ZIP/XLSX container");
  if (result.sheets !== 7) throw new Error(`Expected 7 sheets, got ${result.sheets}`);
  console.log(`Excel export verification OK · ${bytes.length} bytes · ${result.sheets} sheets`);
} finally {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  globalThis.document = originalDocument;
}
