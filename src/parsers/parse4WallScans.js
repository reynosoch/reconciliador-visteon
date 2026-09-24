// src/parsers/parse4WallScans.js
import {
 normalizePartNumber,
 normalizeText,
 toNumber,
} from "../domain/normalize";
import {
 resolve4WallArea,
} from "./parse4WallAreas";

function getPartNumber(row) {
 return normalizePartNumber(
   row["Número Parte QAD"] ??
   row["Numero Parte QAD"] ??
   row.numero_parte ??
   row["Numero de parte"] ??
   ""
 );
}

function getQuantity(row) {
 return toNumber(
   row["Quantity"] ??
   row.cantidad ??
   0
 );
}

function getArea(row) {
 return normalizeText(
   row["AreaName"] ??
   row.area_escaneo ??
   ""
 );
}

export function parse4WallScans(
 rows = [],
 areaCatalog
) {
 const byPart = new Map();
 const unmappedAreaNames = new Set();
 let scanCount = 0;
 let totalPhysicalQty = 0;
 for (const row of rows) {
   const partNumber = getPartNumber(row);
   const quantity = getQuantity(row);
   const areaName = getArea(row);
   if (!partNumber) {
     continue;
   }
   if (!Number.isFinite(quantity)) {
     continue;
   }
   const areaInfo = resolve4WallArea(
     areaName,
     areaCatalog
   );
   if (!areaInfo.found) {
     unmappedAreaNames.add(areaName);
   }
   const qadLocation =
     areaInfo.qadLocation ?? "UNMAPPED";
   if (!byPart.has(partNumber)) {
     byPart.set(partNumber, {
       partNumber,
       physicalTotal: 0,
       locations: new Map(),
       areas: new Set(),
       scanCount: 0,
       standardCost4Wall: 0,
       sourceRows: [],
     });
   }
   const part = byPart.get(partNumber);
   part.physicalTotal += quantity;
   part.scanCount += 1;
   part.areas.add(areaName);
   const previousLocationQty =
     part.locations.get(qadLocation) ?? 0;
   part.locations.set(
     qadLocation,
     previousLocationQty + quantity
   );
   // Este costo NO será el oficial.
   // Solo lo conservamos para validación contra QAD Cost Part.
   const standardCost = toNumber(
     row["Costo Estándar"] ?? 0
   );
   if (standardCost > 0) {
     part.standardCost4Wall =
       standardCost;
   }
   // Trazabilidad.
   part.sourceRows.push({
     ticket:
       row["Ticket/FIFO"] ?? null,
     areaName,
     qadLocation,
     quantity,
     scannedBy:
       row["Escaneador"] ?? null,
     auditor:
       row["auditor"] ?? null,
     date:
       row["Fecha agregado"] ?? null,
   });
   scanCount += 1;
   totalPhysicalQty += quantity;
 }
 return {
   byPart,
   scanCount,
   totalPhysicalQty,
   unmappedAreaNames:
     Array.from(unmappedAreaNames),
   unmappedAreaCount:
     unmappedAreaNames.size,
 };
}