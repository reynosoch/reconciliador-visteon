// src/parsers/parseISPBB.js
import {
 normalizePartNumber,
 normalizeSite,
 normalizeText,
 toBoolean,
 toNumber,
} from "../domain/normalize";

export function parseISPBB(
 rows = [],
 options = {}
) {
 const {
   site = "179A",
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
   const partNumber =
     normalizePartNumber(
       row["Item Number"]
     );
   if (!partNumber) {
     ignoredRows++;
     continue;
   }
   const item = {
     partNumber,
     site: rowSite,
     location:
       normalizeText(
         row["Location"]
       ),
     description:
       String(
         row["Description"] ?? ""
       ).trim(),
     status:
       normalizeText(
         row["Status"]
       ),
     itemType:
       normalizeText(
         row["Item Type"]
       ),
     phantom:
       toBoolean(
         row["Phantom"]
       ),
     buyerPlanner:
       String(
         row["Buyer/Planner"] ?? ""
       ).trim(),
     purchaseManufacture:
       normalizeText(
         row["Purchase/Manufacture"]
       ),
     orderPolicy:
       normalizeText(
         row["Order Policy"]
       ),
     orderMultiple:
       toNumber(
         row["Order Multiple"]
       ),
   };
   byPart.set(
     partNumber,
     item
   );
   acceptedRows++;
 }

 return {
   byPart,
   acceptedRows,
   ignoredRows,
   totalParts:
     byPart.size,
   totalPhantoms:
     Array.from(
       byPart.values()
     ).filter(
       (item) => item.phantom
     ).length,
 };
}