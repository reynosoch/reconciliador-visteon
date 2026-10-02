import { parseDelimitedFile } from "../parsers/parseDelimitedFile.js";
import {
  REFERENCE_REQUIRED_FIELDS,
  REFERENCE_SOURCE_TYPES,
} from "../hooks/useReferenceFiles.js";

const NAME_RULES = [
  [REFERENCE_SOURCE_TYPES.SCANS, /(^4wsc|escaneos|4wall.*scan|scan.*4wall)/i],
  [REFERENCE_SOURCE_TYPES.AREAS, /(4wall.*area|area.*4wall)/i],
  [REFERENCE_SOURCE_TYPES.ISPBB, /(ispbb|50[._ -]?1[._ -]?4[._ -]?22)/i],
  [REFERENCE_SOURCE_TYPES.COST, /(cost.*part|part.*cost)/i],
  [REFERENCE_SOURCE_TYPES.BOM, /(bom|50[._ -]?13[._ -]?8[._ -]?16)/i],
  [REFERENCE_SOURCE_TYPES.QAD, /(qad.*3[._ -]?(?:12|2)|congelado.*qad|inventory.*detail)/i],
];

const DETECTION_ORDER = [
  REFERENCE_SOURCE_TYPES.SCANS,
  REFERENCE_SOURCE_TYPES.AREAS,
  REFERENCE_SOURCE_TYPES.QAD,
  REFERENCE_SOURCE_TYPES.ISPBB,
  REFERENCE_SOURCE_TYPES.BOM,
  REFERENCE_SOURCE_TYPES.COST,
];

function hasSchema(fields, groups) {
  const set = new Set((fields || []).map((field) => String(field).trim()));
  return groups.every((group) => group.some((field) => set.has(field)));
}

async function detectJsonBom(file) {
  if (!/\.json$/i.test(file.name || "")) return false;
  try {
    const value = JSON.parse(await file.text());
    const row = Array.isArray(value?.rows) ? value.rows.find(Boolean) : null;
    return Boolean(
      row &&
      Object.hasOwn(row, "Parent Item") &&
      Object.hasOwn(row, "Component") &&
      Object.hasOwn(row, "Usage"),
    );
  } catch {
    return false;
  }
}

export async function detectInventorySource(file) {
  if (!file) return null;

  const name = String(file.name || "");
  for (const [type, rule] of NAME_RULES) {
    if (rule.test(name)) return { type, confidence: "name" };
  }

  if (await detectJsonBom(file)) {
    return { type: REFERENCE_SOURCE_TYPES.BOM, confidence: "schema" };
  }

  for (const type of DETECTION_ORDER) {
    try {
      const parsed = await parseDelimitedFile(file, {
        requiredFields: REFERENCE_REQUIRED_FIELDS[type],
      });
      if (hasSchema(parsed.fields, REFERENCE_REQUIRED_FIELDS[type])) {
        return { type, confidence: "schema" };
      }
    } catch {
      // Try the next known source schema.
    }
  }

  return null;
}
