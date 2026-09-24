// src/parsers/parse4WallAreas.js
import {
 normalizeText,
 normalizeQadLocation,
} from "../domain/normalize";
export function parse4WallAreas(rows = []) {
 const byArea = new Map();
 const unmapped = [];
 const all = [];
 for (const row of rows) {
   const id = row["Id"] ?? null;
   const areaName = normalizeText(
     row["Nombre"]
   );
   if (!areaName) {
     continue;
   }
   const rawQadLocation = normalizeText(
     row["Localidad QAD"]
   );
   const qadLocation = normalizeQadLocation(
     rawQadLocation
   );
   const item = {
     id,
     areaName,
     description: String(
       row["Descripcion"] ?? ""
     ).trim(),
     rawQadLocation,
     qadLocation,
     responsible: String(
       row["Responsable"] ?? ""
     ).trim(),
     generalArea: normalizeText(
       row["Área General"]
     ),
     labels: String(
       row["Etiquetas"] ?? ""
     ).trim(),
     mapped: Boolean(qadLocation),
   };
   all.push(item);
   byArea.set(areaName, item);
   if (!qadLocation) {
     unmapped.push(item);
   }
 }
 return {
   byArea,
   all,
   unmapped,
   totalAreas: all.length,
   totalMapped: all.length - unmapped.length,
   totalUnmapped: unmapped.length,
 };
}

/**
* Busca una AreaName de 4Wall dentro
* del catálogo oficial.
*
* Si no existe, NO ADIVINAMOS.
*/
export function resolve4WallArea(
 areaName,
 areaCatalog
) {
 const normalizedArea = normalizeText(areaName);
 if (!normalizedArea) {
   return {
     found: false,
     areaName: "",
     qadLocation: null,
   };
 }
 const result =
   areaCatalog?.byArea?.get(normalizedArea);
 if (!result) {
   return {
     found: false,
     areaName: normalizedArea,
     qadLocation: null,
   };
 }
 return {
   found: true,
   ...result,
 };
}