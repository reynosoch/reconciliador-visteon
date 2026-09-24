// src/parsers/parseQad32.js
import {
 normalizePartNumber,
 normalizeQadLocation,
 normalizeSite,
 normalizeText,
 toNumber,
} from "../domain/normalize";

const DEFAULT_ITEM_TYPES =
 new Set(["PP", "MP", "FP"]);

export function parseQad32(
 rows = [],
 options = {}
) {
 const {
   site = "179A",
   filterItemTypes = true,
 } = options;
 const targetSite =
   normalizeSite(site);
 const byPart = new Map();
 let acceptedRows = 0;
 let ignoredRows = 0;
 for (const row of rows) {
   const rowSite =
     normalizeSite(row["Site"]);
   if (
     targetSite &&
     rowSite !== targetSite
   ) {
     ignoredRows++;
     continue;
   }
   const itemType =
     normalizeText(row["Item Type"]);
   if (
     filterItemTypes &&
     !DEFAULT_ITEM_TYPES.has(itemType)
   ) {
     ignoredRows++;
     continue;
   }
   const partNumber =
     normalizePartNumber(
       row["Item Number"]
     );
   if (!partNumber) {
     ignoredRows++;
     continue;
   }
   const location =
     normalizeQadLocation(
       row["Location"]
     ) || "NO_LOCATION";
   const quantity =
     toNumber(
       row["Quantity On Hand"]
     );
   const invMasterQty =
     toNumber(
       row["Qty On Hand - Inv Mstr"]
     );
   if (!byPart.has(partNumber)) {
     byPart.set(partNumber, {
       partNumber,
       site: rowSite,
       itemType,
       status:
         normalizeText(row["Status"]),
       locations: new Map(),
       qadTotal: 0,
       qadWarehouse: 0,
       qadWip: 0,
       invMasterQty,
       inventoryStatuses:
         new Set(),
     });
   }
   const item =
     byPart.get(partNumber);
   const oldQty =
     item.locations.get(location) ?? 0;
   item.locations.set(
     location,
     oldQty + quantity
   );
   item.qadTotal += quantity;
   if (location === "ZWHSE") {
     item.qadWarehouse += quantity;
   }
   if (location === "ZWIP") {
     item.qadWip += quantity;
   }
   const inventoryStatus =
     normalizeText(
       row["Inventory Status"]
     );
   if (inventoryStatus) {
     item.inventoryStatuses.add(
       inventoryStatus
     );
   }
   if (
     item.invMasterQty === 0 &&
     invMasterQty !== 0
   ) {
     item.invMasterQty =
       invMasterQty;
   }
   acceptedRows++;
 }

 // Información de diagnóstico.
 for (const item of byPart.values()) {
   item.detailVsInvMasterDelta =
     item.qadTotal -
     item.invMasterQty;
 }

 return {
   byPart,
   acceptedRows,
   ignoredRows,
   totalParts:
     byPart.size,
 };
}