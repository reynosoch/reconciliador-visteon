// src/parsers/parseCostPart.js
import {
 normalizePartNumber,
 normalizeStatus,
 normalizeText,
 isObsoleteStatus,
 toNumber,
} from "../domain/normalize";

function parseCostValue(value) {
 const raw = String(value ?? "").trim();
 if (!raw) {
   return { value: 0, valid: false, raw };
 }
 const negativeParentheses =
   raw.startsWith("(") && raw.endsWith(")");
 const cleaned = raw
   .replace(/,/g, "")
   .replace(/\$/g, "")
   .replace(/%/g, "")
   .replace(/\(/g, "")
   .replace(/\)/g, "")
   .trim();
 const parsed = Number(cleaned);
 if (!Number.isFinite(parsed)) {
   return { value: 0, valid: false, raw };
 }
 return {
   value: negativeParentheses ? -Math.abs(parsed) : parsed,
   valid: true,
   raw,
 };
}

export function parseCostPart(rows = []) {
 const byPart = new Map();
 const duplicateParts = [];
 const duplicateSeen = new Set();
 const conflictingDuplicateSeen = new Set();
 const invalidCostRows = [];
 const sites = new Set();
 let acceptedRows = 0;
 let ignoredRows = 0;
 let zeroCostRows = 0;

 rows.forEach((row, index) => {
   const partNumber = normalizePartNumber(row["Item Number"]);
   if (!partNumber) {
     ignoredRows++;
     return;
   }

   const site = normalizeText(row["Site"]);
   if (site) sites.add(site);

   const status = normalizeStatus(row["Status"]);
   const parsedCost = parseCostValue(row["Cost Total"]);
   if (!parsedCost.valid) {
     invalidCostRows.push({
       rowNumber: index + 2,
       partNumber,
       site,
       rawCost: parsedCost.raw,
     });
   } else if (parsedCost.value === 0) {
     zeroCostRows++;
   }

   const item = {
     partNumber,
     site,
     description: String(row["Description"] ?? "").trim(),
     unitOfMeasure: normalizeText(row["Unit of Measure"]),
     productLine: normalizeText(row["Prod Line"]),
     itemType: normalizeText(row["Item Type"]),
     status,
     isObsolete: isObsoleteStatus(status),
     purchaseManufacture: normalizeText(row["Purchase/Manufacture"]),
     costTotal: parsedCost.value,
     hasValidCost: parsedCost.valid,
     rawCostTotal: parsedCost.raw,
     costBreakdown: {
       material: toNumber(row["Material"]),
       materialLL: toNumber(row["Material LL"]),
       subcontract: toNumber(row["Subcontract"]),
       subcontractLL: toNumber(row["Subcontract LL"]),
       overhead: toNumber(row["Overhead"]),
       overheadLL: toNumber(row["Overhead LL"]),
       labor: toNumber(row["Labor"]),
       laborLL: toNumber(row["Labor LL"]),
       burden: toNumber(row["Burden"]),
       burdenLL: toNumber(row["Burden LL"]),
     },
   };

   const existing = byPart.get(partNumber);
   if (existing) {
     if (!duplicateSeen.has(partNumber)) {
       duplicateSeen.add(partNumber);
       duplicateParts.push({
         partNumber,
         firstSite: existing.site,
         duplicateSite: site,
         firstCost: existing.costTotal,
         duplicateCost: item.costTotal,
       });
     }
     const conflicts =
       existing.site !== item.site ||
       existing.status !== item.status ||
       existing.hasValidCost !== item.hasValidCost ||
       existing.costTotal !== item.costTotal;
     if (conflicts) conflictingDuplicateSeen.add(partNumber);
     // Deterministic rule: keep the first row. Never silently let a later
     // duplicate replace the financial source.
     acceptedRows++;
     return;
   }

   byPart.set(partNumber, item);
   acceptedRows++;
 });

 return {
   byPart,
   acceptedRows,
   ignoredRows,
   totalParts: byPart.size,
   obsoleteParts: Array.from(byPart.values()).filter((item) => item.isObsolete).length,
   sites: Array.from(sites).sort(),
   invalidCostRows,
   invalidCostCount: invalidCostRows.length,
   zeroCostRows,
   duplicateParts,
   duplicatePartCount: duplicateSeen.size,
   conflictingDuplicatePartCount: conflictingDuplicateSeen.size,
 };
}
