// src/parsers/parseBom.js
import {
 normalizePartNumber,
 normalizeText,
 toBoolean,
 toNumber,
} from "../domain/normalize";

export function parseBom(rows = []) {
 const byParent = new Map();
 const byComponent = new Map();
 const relations = [];
 let ignoredRows = 0;

 for (const row of rows) {
   const parentPart =
     normalizePartNumber(
       row["Parent Item"]
     );
   const componentPart =
     normalizePartNumber(
       row["Component"]
     );
   if (
     !parentPart ||
     !componentPart
   ) {
     ignoredRows++;
     continue;
   }
   const usage =
     toNumber(
       row["Usage"]
     );
   const relation = {
     sequence:
       toNumber(
         row["Seq"] ??
         row["Seq  "]
       ),
     parentPart,
     parentDescription:
       String(
         row[
           "Parent Item Description"
         ] ?? ""
       ).trim(),
     parentPhantomReported:
       toBoolean(
         row["Parent Phantom"]
       ),
     level:
       toNumber(
         row["Level"]
       ),
     componentPart,
     componentDescription:
       String(
         row[
           "Component Description"
         ] ?? ""
       ).trim(),
     usage,
     grossedUpUsage:
       toNumber(
         row["Grossed up Usage"]
       ),
     componentPhantomReported:
       toBoolean(
         row["Comp Phantom"]
       ),
     itemType:
       normalizeText(
         row["Item Type"]
       ),
     partStatus:
       normalizeText(
         row["Part Status"]
       ),
     site:
       normalizeText(
         row["Site"] ??
         row["Site "]
       ),
   };

   relations.push(relation);

   if (!byParent.has(parentPart)) {
     byParent.set(
       parentPart,
       []
     );
   }
   byParent
     .get(parentPart)
     .push(relation);

   if (
     !byComponent.has(
       componentPart
     )
   ) {
     byComponent.set(
       componentPart,
       []
     );
   }
   byComponent
     .get(componentPart)
     .push(relation);
 }

 return {
   relations,
   byParent,
   byComponent,
   totalRelations:
     relations.length,
   totalParents:
     byParent.size,
   totalComponents:
     byComponent.size,
   ignoredRows,
 };
}