// src/parsers/parseCostPart.js
import {
 normalizePartNumber,
 normalizeStatus,
 normalizeText,
 isObsoleteStatus,
 toNumber,
} from "../domain/normalize";

export function parseCostPart(rows = []) {
 const byPart = new Map();
 let acceptedRows = 0;
 let ignoredRows = 0;

 for (const row of rows) {
   const partNumber =
     normalizePartNumber(
       row["Item Number"]
     );
   if (!partNumber) {
     ignoredRows++;
     continue;
   }
   const status =
     normalizeStatus(
       row["Status"]
     );
   const costTotal =
     toNumber(
       row["Cost Total"]
     );
   const item = {
     partNumber,
     site:
       normalizeText(
         row["Site"]
       ),
     description:
       String(
         row["Description"] ?? ""
       ).trim(),
     unitOfMeasure:
       normalizeText(
         row["Unit of Measure"]
       ),
     productLine:
       normalizeText(
         row["Prod Line"]
       ),
     itemType:
       normalizeText(
         row["Item Type"]
       ),
     status,
     isObsolete:
       isObsoleteStatus(status),
     purchaseManufacture:
       normalizeText(
         row["Purchase/Manufacture"]
       ),
     costTotal,
     costBreakdown: {
       material:
         toNumber(
           row["Material"]
         ),
       materialLL:
         toNumber(
           row["Material LL"]
         ),
       subcontract:
         toNumber(
           row["Subcontract"]
         ),
       subcontractLL:
         toNumber(
           row["Subcontract LL"]
         ),
       overhead:
         toNumber(
           row["Overhead"]
         ),
       overheadLL:
         toNumber(
           row["Overhead LL"]
         ),
       labor:
         toNumber(
           row["Labor"]
         ),
       laborLL:
         toNumber(
           row["Labor LL"]
         ),
       burden:
         toNumber(
           row["Burden"]
         ),
       burdenLL:
         toNumber(
           row["Burden LL"]
         ),
     },
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
   obsoleteParts:
     Array.from(
       byPart.values()
     ).filter(
       (item) =>
         item.isObsolete
     ).length,
 };
}