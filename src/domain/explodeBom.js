// src/domain/explodeBom.js
import {
 normalizePartNumber,
 safeNumber,
} from "./normalize";

function addQuantity(
 map,
 location,
 quantity
) {
 const key =
   String(location || "UNMAPPED")
     .trim()
     .toUpperCase();
 const previous =
   map.get(key) ?? 0;
 map.set(
   key,
   previous + safeNumber(quantity)
 );
}

function sumMap(map) {
 let total = 0;
 if (!(map instanceof Map)) {
   return total;
 }
 for (const value of map.values()) {
   total += safeNumber(value);
 }
 return total;
}

/**
* Crea el objeto de ajuste de una pieza Phantom.
*/
function createAdjustment(
 partNumber
) {
 return {
   partNumber,
   totalContribution: 0,
   byLocation: new Map(),
   sources: [],
   warnings: [],
 };
}

/**
* Explosión BOM física.
*
* Ejemplo:
*
* 4Wall encuentra:
*
* Parent ABC
* R10-2 = 100 piezas
*
* BOM:
*
* ABC -> PHANTOM-XYZ
* Usage = 2
*
* Resultado:
*
* PHANTOM-XYZ
* R10-2 = +200 piezas físicas
*
*
* IMPORTANTE:
*
* - ISPBB es la fuente autoritativa para Phantom.
* - BOM entrega Parent / Component / Usage.
* - NO identificamos Phantoms por prefijo.
* - NO usamos Grossed up Usage.
* - NO hacemos recursión todavía.
*/
export function explodeBom({
 physical,
 bom,
 planning,
 targetParts = null,
}) {
 const physicalMap =
   physical?.byPart ?? new Map();
 const bomByParent =
   bom?.byParent ?? new Map();
 const planningMap =
   planning?.byPart ?? new Map();

 /**
  * Opcionalmente permite explotar solamente
  * ciertos números de parte.
  *
  * Esto nos servirá después cuando Finanzas
  * quiera investigar un Phantom específico.
  */
 const targetSet =
   targetParts
     ? new Set(
         targetParts.map(
           normalizePartNumber
         )
       )
     : null;

 const byPart = new Map();
 const mismatches = [];
 let scannedParentsWithBom = 0;
 let totalRelationsProcessed = 0;
 let totalContributedPieces = 0;

 // ==================================================
 // RECORREMOS LOS PART NUMBERS FÍSICOS DE 4WALL
 // ==================================================
 for (
   const [
     parentPartRaw,
     physicalParent
   ]
   of physicalMap.entries()
 ) {
   const parentPart =
     normalizePartNumber(
       parentPartRaw
     );
   if (!parentPart) {
     continue;
   }

   const relations =
     bomByParent.get(parentPart);
   /**
    * Si ese PN escaneado no es Parent
    * dentro del BOM cargado, no hacemos nada.
    */
   if (
     !relations ||
     !relations.some((relation) => relation.level === 1)
   ) {
     continue;
   }

   scannedParentsWithBom++;

   const parentLocations =
     physicalParent
       ?.locations instanceof Map
       ? physicalParent.locations
       : new Map();

   /**
    * Si por alguna razón no llegaron
    * localidades, dejamos fallback del total.
    */
   const parentTotal =
     physicalParent
       ?.physicalTotal ??
     sumMap(parentLocations);

   for (
     const relation
     of relations
   ) {
     // This engine is deliberately single-level. The export also contains
     // flattened descendants whose Usage is relative to another assembly.
     if (relation.level !== 1) {
       continue;
     }
     const componentPart =
       normalizePartNumber(
         relation.componentPart
       );
     if (!componentPart) {
       continue;
     }

     // ==============================================
     // ISPBB: PHANTOM AUTORITATIVO
     // ==============================================
     const planningItem =
       planningMap.get(
         componentPart
       );

     const phantomKnown =
       Boolean(planningItem);

     const isPhantom =
       planningItem
         ?.phantom === true;

     /**
      * Si ISPBB no lo marca Phantom,
      * NO generamos ajuste.
      */
     if (!isPhantom) {
       continue;
     }

     /**
      * Si estamos investigando una lista
      * específica de partes.
      */
     if (
       targetSet &&
       !targetSet.has(
         componentPart
       )
     ) {
       continue;
     }

     // ==============================================
     // USAGE DEL BOM
     // ==============================================
     const usage =
       safeNumber(
         relation.usage
       );

     if (usage <= 0) {
       continue;
     }

     // ==============================================
     // VALIDACIÓN BOM vs ISPBB
     // ==============================================
     const bomReportedPhantom =
       relation
         .componentPhantomReported === true;

     /**
      * Guardamos inconsistencias,
      * pero ISPBB sigue ganando.
      */
     if (
       phantomKnown &&
       bomReportedPhantom !==
         isPhantom
     ) {
       mismatches.push({
         parentPart,
         componentPart,
         ispbbPhantom:
           isPhantom,
         bomPhantom:
           bomReportedPhantom,
       });
     }

     // ==============================================
     // OBTENEMOS / CREAMOS AJUSTE
     // ==============================================
     if (
       !byPart.has(
         componentPart
       )
     ) {
       byPart.set(
         componentPart,
         createAdjustment(
           componentPart
         )
       );
     }

     const adjustment =
       byPart.get(
         componentPart
       );

     // ==============================================
     // EXPLOSIÓN POR LOCALIDAD
     // ==============================================
     if (
       parentLocations.size > 0
     ) {
       for (
         const [
           location,
           parentQtyRaw
         ]
         of parentLocations.entries()
       ) {
         const parentQty =
           safeNumber(
             parentQtyRaw
           );

         const contribution =
           parentQty *
           usage;

         if (
           contribution === 0
         ) {
           continue;
         }

         addQuantity(
           adjustment.byLocation,
           location,
           contribution
         );

         adjustment
           .totalContribution +=
           contribution;

         totalContributedPieces +=
           contribution;

         adjustment.sources.push({
           parentPart,
           componentPart,
           location,
           scannedParentQty:
             parentQty,
           usage,
           contribution,
           parentDescription:
             relation
               .parentDescription ??
             "",
           componentDescription:
             relation
               .componentDescription ??
             "",
           bomLevel:
             relation.level ?? null,
           ispbbPhantom:
             true,
           bomReportedPhantom,
         });
       }
     } else {
       /**
        * Fallback solamente para no perder
        * completamente el dato si un import
        * viniera sin localidades.
        *
        * Lo marcamos UNMAPPED.
        */
       const contribution =
         safeNumber(
           parentTotal
         ) *
         usage;

       if (
         contribution !== 0
       ) {
         addQuantity(
           adjustment.byLocation,
           "UNMAPPED",
           contribution
         );

         adjustment
           .totalContribution +=
           contribution;

         totalContributedPieces +=
           contribution;

         adjustment.sources.push({
           parentPart,
           componentPart,
           location:
             "UNMAPPED",
           scannedParentQty:
             safeNumber(
               parentTotal
             ),
           usage,
           contribution,
           parentDescription:
             relation
               .parentDescription ??
             "",
           componentDescription:
             relation
               .componentDescription ??
             "",
           bomLevel:
             relation.level ?? null,
           ispbbPhantom:
             true,
           bomReportedPhantom,
           warning:
             "Parent sin localidad física.",
         });
       }
     }

     totalRelationsProcessed++;
   }
 }

 // ==================================================
 // VALIDACIONES FINALES
 // ==================================================
 for (
   const adjustment
   of byPart.values()
 ) {
   const calculatedTotal =
     sumMap(
       adjustment.byLocation
     );

   if (
     Math.abs(
       calculatedTotal -
       adjustment.totalContribution
     ) > 0.000001
   ) {
     adjustment.warnings.push(
       "La suma por localidad no coincide con totalContribution."
     );
   }
 }

 return {
   byPart,
   totalAdjustedParts:
     byPart.size,
   scannedParentsWithBom,
   totalRelationsProcessed,
   totalContributedPieces,
   phantomDefinitionMismatches:
     mismatches,
 };
}
