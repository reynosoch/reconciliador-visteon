import Papa from "papaparse";
import {
  REFERENCE_REQUIRED_FIELDS,
  REFERENCE_SOURCE_TYPES,
  SOURCE_DETECTION_ORDER,
} from "../domain/sourceCatalog.js";

const NAME_RULES = [
  [REFERENCE_SOURCE_TYPES.SCANS, /(^4wsc|escaneos|4wall.*scan|scan.*4wall)/i],
  [REFERENCE_SOURCE_TYPES.AREAS, /(4wall.*area|area.*4wall)/i],
  [REFERENCE_SOURCE_TYPES.ISPBB, /(ispbb|50[._ -]?1[._ -]?4[._ -]?22)/i],
  [REFERENCE_SOURCE_TYPES.COST, /(cost.*part|part.*cost)/i],
  [REFERENCE_SOURCE_TYPES.BOM, /(bom|50[._ -]?13[._ -]?8[._ -]?16)/i],
  [REFERENCE_SOURCE_TYPES.QAD, /(qad.*3[._ -]?(?:12|2)|congelado.*qad|inventory.*detail)/i],
];

function decode(buffer) {
  const bytes = new Uint8Array(buffer);
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("�")
    ? new TextDecoder("windows-1252").decode(bytes)
    : utf8;
}

function rowMatches(row, groups) {
  const fields = new Set(
    (row || []).map((value) => String(value ?? "").trim()),
  );
  return groups.every((group) => group.some((field) => fields.has(field)));
}

function detectFromMatrices(matrices) {
  for (const type of SOURCE_DETECTION_ORDER) {
    const required = REFERENCE_REQUIRED_FIELDS[type];
    const found = matrices.some((matrix) =>
      matrix
        .slice(0, 50)
        .some((row) => rowMatches(row, required)),
    );
    if (found) return type;
  }
  return null;
}

async function inspectJson(file) {
  if (!/\.json$/i.test(file.name || "")) return null;
  try {
    const value = JSON.parse(await file.text());
    const row = Array.isArray(value?.rows) ? value.rows.find(Boolean) : null;
    if (
      row &&
      Object.hasOwn(row, "Parent Item") &&
      Object.hasOwn(row, "Component") &&
      Object.hasOwn(row, "Usage")
    ) {
      return REFERENCE_SOURCE_TYPES.BOM;
    }
  } catch {
    // Unknown JSON is simply not a supported inventory source.
  }
  return null;
}

async function inspectXlsx(file) {
  const XLSX = await import("xlsx");
  const bytes = await file.arrayBuffer();
  const book = XLSX.read(bytes, { type: "array", cellText: true });
  const matrices = book.SheetNames.map((name) =>
    XLSX.utils.sheet_to_json(book.Sheets[name], {
      header: 1,
      raw: true,
      defval: "",
      blankrows: false,
    }),
  );
  return detectFromMatrices(matrices);
}

async function inspectDelimited(file) {
  const text = decode(await file.arrayBuffer());
  const parsed = Papa.parse(text, {
    header: false,
    delimiter: "",
    skipEmptyLines: true,
  });
  return detectFromMatrices([parsed.data || []]);
}

export async function detectInventorySource(file) {
  if (!file) return null;

  const name = String(file.name || "");
  for (const [type, rule] of NAME_RULES) {
    if (rule.test(name)) return { type, confidence: "name" };
  }

  const jsonType = await inspectJson(file);
  if (jsonType) return { type: jsonType, confidence: "schema" };

  try {
    const type = /\.xlsx$/i.test(name)
      ? await inspectXlsx(file)
      : await inspectDelimited(file);

    return type ? { type, confidence: "schema" } : null;
  } catch {
    return null;
  }
}
