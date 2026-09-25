// src/domain/reconcileInventory.js
import {
 normalizePartNumber,
 safeNumber,
} from "./normalize";

function cloneLocationMap(source) {
 const result = new Map();
 if (!(source instanceof Map)) {
   return result;
 }
 for (const [location, qty] of source.entries()) {
   result.set(location, safeNumber(qty));
 }
 return result;
}

function addToLocation(map, location, quantity) {
 const key = String(location || "UNMAPPED")
   .trim()
   .toUpperCase();
 const previous = map.get(key) ?? 0;
 map.set(
   key,
   previous + safeNumber(quantity)
 );
}

function sumLocationMap(map) {
 let total = 0;
 if (!(map instanceof Map)) {
   return total;
 }
 for (const qty of map.values()) {
   total += safeNumber(qty);
 }
 return total;
}

/**
* Calcula SWING comparando localidad contra localidad.
*
* Ejemplo:
*
* Físico:
* ZWHSE = 0
* ZWIP  = 100
*
* QAD:
* ZWHSE = 100
* ZWIP  = 0
*
* SWING = |0 - 100| + |100 - 0|
*       = 200
*
* NO se divide entre dos.
*/
function calculateSwing(
 physicalLocations,
 qadLocations
) {
 const allLocations = new Set([
   ...physicalLocations.keys(),
   ...qadLocations.keys(),
 ]);
 let swingPieces = 0;
 const detail = [];
 for (const location of allLocations) {
   const physicalQty =
     safeNumber(
       physicalLocations.get(location)
     );
   const qadQty =
     safeNumber(
       qadLocations.get(location)
     );
   const delta =
     physicalQty - qadQty;
   const absoluteDelta =
     Math.abs(delta);
   swingPieces += absoluteDelta;
   detail.push({
     location,
     physicalQty,
     qadQty,
     delta,
     swingPieces:
       absoluteDelta,
   });
 }
 return {
   swingPieces,
   detail,
 };
}

/**
* Clasificación para UI.
*
* NO modifica cálculos.
* Solo ayuda al dashboard.
*/
function getFinancialStatus({
 netUsd,
 swingUsd,
 isObsolete,
 obsoleteGainUsd,
 isUnexpectedMaterial,
 physicalTotal,
 qadTotal,
}) {
 if (
   isObsolete &&
   obsoleteGainUsd > 0
 ) {
   return "OBSOLETE_GAIN";
 }
 if (isUnexpectedMaterial) {
   return "UNEXPECTED";
 }
 if (
   physicalTotal === 0 &&
   qadTotal > 0
 ) {
   return "MISSING_PHYSICAL";
 }
 if (netUsd < 0) {
   return "LOSS";
 }
 if (netUsd > 0) {
   return "GAIN";
 }
 if (swingUsd > 0) {
   return "SWING";
 }
 return "BALANCED";
}

/**
* Une:
*
* - 4Wall físico
* - QAD 3.2 congelado
* - ISPBB / Phantom
* - Cost Part
* - Ajustes BOM
*
* Este archivo contiene las reglas financieras.
*
* React NO debe recalcular nada de esto.
*/
export function reconcileInventory({
 physical,
 qad,
 planning,
 costs,
 phantomAdjustments,
}) {
 const physicalMap =
   physical?.byPart ?? new Map();
 const qadMap =
   qad?.byPart ?? new Map();
 const planningMap =
   planning?.byPart ?? new Map();
 const costMap =
   costs?.byPart ?? new Map();
 const phantomMap =
   phantomAdjustments?.byPart ??
   phantomAdjustments ??
   new Map();

 /**
  * Una pieza aparece en reconciliación
  * si existe:
  *
  * - físicamente
  * - en QAD
  * - o fue generada por explosión BOM
  *
  * No metemos las 95k piezas de Cost Part
  * solamente porque existan en el catálogo.
  */
 const allPartNumbers =
   new Set([
     ...physicalMap.keys(),
     ...qadMap.keys(),
     ...phantomMap.keys(),
   ]);

 const result = [];

 for (
   const rawPartNumber
   of allPartNumbers
 ) {
   const partNumber =
     normalizePartNumber(
       rawPartNumber
     );
   if (!partNumber) {
     continue;
   }

   const physicalItem =
     physicalMap.get(partNumber);
   const qadItem =
     qadMap.get(partNumber);
   const planningItem =
     planningMap.get(partNumber);
   const costItem =
     costMap.get(partNumber);
   const phantomAdjustment =
     phantomMap.get(partNumber);

   // ---------------------------------
   // 1. FÍSICO DIRECTO 4WALL
   // ---------------------------------
   const directPhysicalLocations =
     cloneLocationMap(
       physicalItem?.locations
     );
   const physicalDirectTotal =
     physicalItem
       ? safeNumber(
           physicalItem.physicalTotal
         )
       : sumLocationMap(
           directPhysicalLocations
         );

   // ---------------------------------
   // 2. AJUSTE BOM / PHANTOM
   // ---------------------------------
   const physicalLocations =
     cloneLocationMap(
       directPhysicalLocations
     );
   const bomContribution =
     safeNumber(
       phantomAdjustment
         ?.totalContribution ??
       phantomAdjustment
         ?.quantity ??
       0
     );

   /**
    * Por defecto una contribución BOM
    * representa material en proceso.
    *
    * El archivo explodeBom.js que haremos
    * después podrá entregar byLocation
    * explícitamente.
    */
   if (
     phantomAdjustment
       ?.byLocation instanceof Map
   ) {
     for (
       const [
         location,
         quantity
       ]
       of phantomAdjustment
         .byLocation
         .entries()
     ) {
       addToLocation(
         physicalLocations,
         location,
         quantity
       );
     }
   } else if (
     bomContribution !== 0
   ) {
     addToLocation(
       physicalLocations,
       "ZWIP",
       bomContribution
     );
   }

   const physicalTotal =
     sumLocationMap(
       physicalLocations
     );

   // ---------------------------------
   // 3. QAD CONGELADO 3.2
   // ---------------------------------
   const qadLocations =
     cloneLocationMap(
       qadItem?.locations
     );
   const qadTotal =
     qadItem
       ? safeNumber(
           qadItem.qadTotal
         )
       : sumLocationMap(
           qadLocations
         );

   // ---------------------------------
   // 4. COSTO FINANCIERO
   // ---------------------------------
   const unitCost =
     safeNumber(
       costItem?.costTotal
     );
   const hasCost =
     Boolean(costItem) &&
     Number.isFinite(unitCost);

   // ---------------------------------
   // 5. NET
   // ---------------------------------
   const netPieces =
     physicalTotal -
     qadTotal;
   const netUsd =
     netPieces *
     unitCost;

   /**
    * Separamos pérdidas y ganancias
    * para las juntas de Finanzas.
    *
    * loss queda negativa.
    * gain queda positiva.
    */
   const grossLossUsd =
     netUsd < 0
       ? netUsd
       : 0;
   const grossGainUsd =
     netUsd > 0
       ? netUsd
       : 0;

   // ---------------------------------
   // 6. SWING
   // ---------------------------------
   const swing =
     calculateSwing(
       physicalLocations,
       qadLocations
     );
   const swingPieces =
     swing.swingPieces;
   const swingUsd =
     swingPieces *
     unitCost;

   // ---------------------------------
   // 7. PHANTOM
   // ---------------------------------
   /**
    * La única fuente autoritativa
    * para Phantom es ISPBB.
    */
   const phantomKnown =
     Boolean(planningItem);
   const isPhantom =
     planningItem
       ?.phantom === true;

   // ---------------------------------
   // 8. OBSOLETO
   // ---------------------------------
   /**
    * Status financiero viene
    * de Cost Part Browse.
    */
   const isObsolete =
     costItem
       ?.isObsolete === true;
   /**
    * Solo se aísla cuando:
    *
    * OBSOLETE
    * y
    * físico > QAD
    */
   const obsoleteGainUsd =
     isObsolete &&
     netUsd > 0
       ? netUsd
       : 0;

   // ---------------------------------
   // 9. EXCEPCIONES
   // ---------------------------------
   const isUnexpectedMaterial =
     qadTotal === 0 &&
     physicalTotal > 0;
   const isMissingPhysical =
     physicalTotal === 0 &&
     qadTotal > 0;
   const hasUnmappedPhysicalLocation =
     physicalLocations.has(
       "UNMAPPED"
     );

   // ---------------------------------
   // 10. ESTADO PARA UI
   // ---------------------------------
   const financialStatus =
     getFinancialStatus({
       netUsd,
       swingUsd,
       isObsolete,
       obsoleteGainUsd,
       isUnexpectedMaterial,
       physicalTotal,
       qadTotal,
     });

   result.push({
     partNumber,

     // ==============================
     // FÍSICO
     // ==============================
     physical: {
       directTotal:
         physicalDirectTotal,
       bomContribution,
       total:
         physicalTotal,
       locations:
         physicalLocations,
       directLocations:
         directPhysicalLocations,
       scanCount:
         physicalItem
           ?.scanCount ?? 0,
       areas:
         physicalItem
           ?.areas
         ? Array.from(
             physicalItem.areas
           )
         : [],
     },

     // ==============================
     // QAD
     // ==============================
     qad: {
       total:
         qadTotal,
       locations:
         qadLocations,
       invMasterQty:
         safeNumber(
           qadItem
             ?.invMasterQty
         ),
       detailVsInvMasterDelta:
         safeNumber(
           qadItem
             ?.detailVsInvMasterDelta
         ),
       itemType:
         qadItem
           ?.itemType ?? "",
       status:
         qadItem
           ?.status ?? "",
     },

     // ==============================
     // MAESTROS
     // ==============================
     master: {
       unitCost,
       hasCost,
       costStatus:
         costItem
           ?.status ?? "",
       planningStatus:
         planningItem
           ?.status ?? "",
       description:
         costItem
           ?.description ??
         planningItem
           ?.description ??
         "",
       isObsolete,
       phantomKnown,
       isPhantom,
     },

     // ==============================
     // FINANZAS
     // ==============================
     financial: {
       netPieces,
       netUsd,
       grossLossUsd,
       grossGainUsd,
       swingPieces,
       swingUsd,
       obsoleteGainUsd,
     },

     // ==============================
     // ALERTAS
     // ==============================
     flags: {
       financialStatus,
       isUnexpectedMaterial,
       isMissingPhysical,
       isObsolete,
       isPhantom,
       phantomKnown,
       hasCost,
       hasUnmappedPhysicalLocation,
       hasBomAdjustment:
         bomContribution !== 0,
     },

     // ==============================
     // AUDITORÍA / TRACE
     // ==============================
     trace: {
       swingByLocation:
         swing.detail,
       bomSources:
         phantomAdjustment
           ?.sources ?? [],
       sourceRows:
         physicalItem
           ?.sourceRows ?? [],
     },
   });
 }

 /**
  * De entrada dejamos ordenada la tabla
  * por exposición financiera absoluta.
  *
  * $5,000 faltantes aparece antes
  * que 1,000 tornillos de $0.01.
  */
 result.sort(
   (a, b) =>
     Math.abs(
       b.financial.netUsd
     ) -
     Math.abs(
       a.financial.netUsd
     )
 );

 return result;
}

/**
* KPIs globales para la portada.
*
* Esto es lo que usaremos en las juntas
* de cada ~2 horas.
*/
export function calculateFinancialSummary(
 reconciliation = [],
 options = {}
) {
 const {
   criticalUsdThreshold = 10000,
 } = options;

 let netUsd = 0;
 let grossLossUsd = 0;
 let grossGainUsd = 0;
 let swingUsd = 0;
 let obsoleteGainUsd = 0;
 let physicalQty = 0;
 let qadQty = 0;
 let phantomCount = 0;
 let phantomAdjustedUsd = 0;
 let unexpectedCount = 0;
 let criticalCount = 0;
 let unmappedLocationCount = 0;
 let missingCostCount = 0;
 let qadOnlyCount = 0;
 let qadOnlyExposureUsd = 0;
 let qadOnlyMissingCostCount = 0;

 for (
   const item
   of reconciliation
 ) {
   netUsd +=
     item.financial.netUsd;
   grossLossUsd +=
     item.financial.grossLossUsd;
   grossGainUsd +=
     item.financial.grossGainUsd;
   swingUsd +=
     item.financial.swingUsd;
   obsoleteGainUsd +=
     item.financial
       .obsoleteGainUsd;
   physicalQty +=
     item.physical.total;
   qadQty +=
     item.qad.total;

   if (
     item.flags.isPhantom
   ) {
     phantomCount++;
   }

   if (
     item.flags.hasBomAdjustment
   ) {
     phantomAdjustedUsd +=
       item.physical
         .bomContribution *
       item.master.unitCost;
   }

   if (
     item.flags
       .isUnexpectedMaterial
   ) {
     unexpectedCount++;
   }

   if (
     Math.abs(
       item.financial.netUsd
     ) >=
     criticalUsdThreshold
   ) {
     criticalCount++;
   }

   if (
     item.flags
       .hasUnmappedPhysicalLocation
   ) {
     unmappedLocationCount++;
   }

   if (
     !item.master.hasCost
   ) {
     missingCostCount++;
   }
   // Intraday visibility only: QAD-only parts may not have been audited yet.
   // Keep the existing financial calculation pending Finance's decision.
   if (item.flags.isMissingPhysical) {
     qadOnlyCount++;
     qadOnlyExposureUsd += Math.abs(item.financial.netUsd);
     if (!item.master.hasCost) qadOnlyMissingCostCount++;
   }
 }

 return {
   netUsd,
   grossLossUsd,
   grossGainUsd,
   swingUsd,
   obsoleteGainUsd,
   physicalQty,
   qadQty,
   phantomCount,
   phantomAdjustedUsd,
   unexpectedCount,
   criticalCount,
   unmappedLocationCount,
   missingCostCount,
   qadOnlyCount,
   qadOnlyExposureUsd,
   qadOnlyMissingCostCount,
   totalParts:
     reconciliation.length,
   criticalUsdThreshold,
 };
}
