// src/domain/inventoryEngine.js
import {
 parse4WallAreas,
} from "../parsers/parse4WallAreas";
import {
 parse4WallScans,
} from "../parsers/parse4WallScans";
import {
 parseQad32,
} from "../parsers/parseQad32";
import {
 parseISPBB,
} from "../parsers/parseISPBB";
import {
 parseBom,
} from "../parsers/parseBom";
import {
 parseCostPart,
} from "../parsers/parseCostPart";
import {
 explodeBom,
} from "./explodeBom";
import {
 reconcileInventory,
 calculateFinancialSummary,
} from "./reconcileInventory";

/**
* MOTOR PRINCIPAL DEL INVENTARIO
*
* Recibe las filas ya leídas de:
*
* - 4Wall Areas
* - 4Wall Scans
* - QAD 3.2
* - ISPBB
* - BOM
* - Cost Part
*
* Y regresa:
*
* - parsers normalizados
* - explosión Phantom
* - conciliación completa
* - KPIs financieros
* - diagnósticos
*/
export function buildInventoryEngine({
 areaRows = [],
 scanRows = [],
 qadRows = [],
 ispbbRows = [],
 bomRows = [],
 costRows = [],
 options = {},
}) {
 const {
   site = "179A",
   criticalUsdThreshold = 10000,
   filterQadItemTypes = true,
 } = options;

 // ==================================================
 // 1. DICCIONARIO DE ÁREAS 4WALL
 // ==================================================
 const areas =
   parse4WallAreas(
     areaRows
   );

 // ==================================================
 // 2. FÍSICO 4WALL
 // ==================================================
 const physical =
   parse4WallScans(
     scanRows,
     areas
   );

 // ==================================================
 // 3. QAD 3.2 CONGELADO
 // ==================================================
 const qad =
   parseQad32(
     qadRows,
     {
       site,
       filterItemTypes:
         filterQadItemTypes,
     }
   );

 // ==================================================
 // 4. ISPBB / PHANTOMS
 // ==================================================
 const planning =
   parseISPBB(
     ispbbRows,
     {
       site,
     }
   );

 // ==================================================
 // 5. BOM
 // ==================================================
 const bom =
   parseBom(
     bomRows
   );

 // ==================================================
 // 6. COST PART
 // ==================================================
 const costs =
   parseCostPart(
     costRows
   );

 // ==================================================
 // 7. EXPLOSIÓN DE PHANTOMS
 // ==================================================
 const phantomAdjustments =
   explodeBom({
     physical,
     bom,
     planning,
   });

 // ==================================================
 // 8. RECONCILIACIÓN
 // ==================================================
 const reconciliation =
   reconcileInventory({
     physical,
     qad,
     planning,
     costs,
     phantomAdjustments,
   });

 // ==================================================
 // 9. RESUMEN FINANCIERO
 // ==================================================
 const summary =
   calculateFinancialSummary(
     reconciliation,
     {
       criticalUsdThreshold,
     }
   );

 // ==================================================
 // 10. DIAGNÓSTICOS
 // ==================================================
 const diagnostics =
   buildDiagnostics({
     areas,
     physical,
     qad,
     planning,
     bom,
     costs,
     phantomAdjustments,
     reconciliation,
   });

 return {
   reconciliation,
   summary,
   diagnostics,
   sources: {
     areas,
     physical,
     qad,
     planning,
     bom,
     costs,
     phantomAdjustments,
   },
 };
}

/**
* Diagnósticos técnicos y funcionales.
*
* Esto después alimentará una pantalla:
*
* "Estado de las fuentes"
*
* para saber si algo salió mal antes
* de confiar en los dólares.
*/
function buildDiagnostics({
 areas,
 physical,
 qad,
 planning,
 bom,
 costs,
 phantomAdjustments,
 reconciliation,
}) {
 const partsWithoutCost = [];
 const partsWithoutPlanningDefinition = [];
 const unexpectedMaterial = [];
 const unmappedParts = [];
 const invMasterDifferences = [];

 for (
   const item
   of reconciliation
 ) {
   // --------------------------------------
   // SIN COSTO
   // --------------------------------------
   if (
     !item.master.hasCost
   ) {
     partsWithoutCost.push(
       item.partNumber
     );
   }

   // --------------------------------------
   // SIN DEFINICIÓN PHANTOM ISPBB
   // --------------------------------------
   if (
     !item.master.phantomKnown
   ) {
     partsWithoutPlanningDefinition.push(
       item.partNumber
     );
   }

   // --------------------------------------
   // QAD = 0 Y HAY FÍSICO
   // --------------------------------------
   if (
     item.flags
       .isUnexpectedMaterial
   ) {
     unexpectedMaterial.push({
       partNumber:
         item.partNumber,
       physical:
         item.physical.total,
       netUsd:
         item.financial.netUsd,
     });
   }

   // --------------------------------------
   // ÁREA 4WALL SIN MAPEO
   // --------------------------------------
   if (
     item.flags
       .hasUnmappedPhysicalLocation
   ) {
     unmappedParts.push({
       partNumber:
         item.partNumber,
       quantity:
         item.physical
           .locations
           .get(
             "UNMAPPED"
           ) ?? 0,
       areas:
         item.physical.areas,
     });
   }

   // --------------------------------------
   // QAD DETAIL vs INV MASTER
   // --------------------------------------
   const deltaInvMaster =
     item.qad
       .detailVsInvMasterDelta;
   if (
     Math.abs(
       deltaInvMaster
     ) > 0.000001
   ) {
     invMasterDifferences.push({
       partNumber:
         item.partNumber,
       detailTotal:
         item.qad.total,
       invMasterQty:
         item.qad.invMasterQty,
       difference:
         deltaInvMaster,
     });
   }
 }

 return {
   // ======================================
   // FUENTES
   // ======================================
   sources: {
     areaCount:
       areas.totalAreas,
     mappedAreaCount:
       areas.totalMapped,
     unmappedAreaCount:
       areas.totalUnmapped,
     scanCount:
       physical.scanCount,
     physicalPartCount:
       physical.byPart.size,
     qadPartCount:
       qad.totalParts,
     ispbbPartCount:
       planning.totalParts,
     ispbbPhantomCount:
       planning.totalPhantoms,
     bomRelationCount:
       bom.totalRelations,
     bomParentCount:
       bom.totalParents,
     bomComponentCount:
       bom.totalComponents,
     costPartCount:
       costs.totalParts,
     obsoleteCatalogCount:
       costs.obsoleteParts,
   },

   // ======================================
   // ALERTAS
   // ======================================
   warnings: {
     unmappedAreaNames:
       physical
         .unmappedAreaNames,
     partsWithoutCost,
     partsWithoutPlanningDefinition,
     unexpectedMaterial,
     unmappedParts,
     invMasterDifferences,
     phantomDefinitionMismatches:
       phantomAdjustments
         .phantomDefinitionMismatches,
   },

   // ======================================
   // PHANTOMS
   // ======================================
   phantom: {
     scannedParentsWithBom:
       phantomAdjustments
         .scannedParentsWithBom,
     adjustedParts:
       phantomAdjustments
         .totalAdjustedParts,
     relationsProcessed:
       phantomAdjustments
         .totalRelationsProcessed,
     contributedPieces:
       phantomAdjustments
         .totalContributedPieces,
   },
 };
}