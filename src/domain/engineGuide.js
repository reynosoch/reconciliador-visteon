import { buildInventoryEngine } from "./inventoryEngine.js";
import {
  buildPartLearningTrace,
  RECONCILIATION_FORMULAS,
} from "./partLearningTrace.js";

// These illustrative cases use the production engine. They are never mixed
// into the loaded inventory and never presented as evidence of a real PN.
function example(id, title, description, scans, qadQty, useBom = false) {
  const rows = {
    scans,
    areas: [
      { Nombre: "Almacén", "Localidad QAD": "WHSE" },
      { Nombre: "Proceso", "Localidad QAD": "ZWIP" },
    ],
    qad: [
      {
        "Item Number": "EJEMPLO-C",
        Site: "179A",
        "Item Type": "PP",
        Location: "ZWHSE",
        "Quantity On Hand": qadQty,
      },
    ],
    ispbb: [
      { "Item Number": "EJEMPLO-C", Site: "179A", Phantom: "NO" },
      { "Item Number": "EJEMPLO-P", Site: "179A", Phantom: "YES" },
    ],
    cost: [{ "Item Number": "EJEMPLO-C", "Cost Total": 4.2, Status: "ACTIVE" }],
    bom: useBom
      ? [
          {
            "Parent Item": "EJEMPLO-P",
            Component: "EJEMPLO-C",
            Level: ".2",
            "Comp Phantom": "NO",
            Usage: 10,
          },
        ]
      : [],
  };
  const engine = buildInventoryEngine({
    scanRows: rows.scans,
    areaRows: rows.areas,
    qadRows: rows.qad,
    ispbbRows: rows.ispbb,
    costRows: rows.cost,
    bomRows: rows.bom,
  });
  const item = engine.reconciliation.find((r) => r.partNumber === "EJEMPLO-C");
  const sources = Object.fromEntries(
    Object.entries(rows).map(([type, rows]) => [
      type,
      {
        rows,
        loaded: true,
        fileName: "Ejemplo didáctico · datos de demostración",
      },
    ]),
  );
  const trace = buildPartLearningTrace({
    item,
    engineSources: engine.sources,
    sources,
  });
  return {
    id,
    title,
    description,
    item,
    formulas: trace.formulas,
    locations: item.trace.swingByLocation,
    contributions: trace.contributions,
    physical: trace.summaryDetails.find((r) => r.id === "physical").value,
    qad: trace.summaryDetails.find((r) => r.id === "qad").value,
    net: trace.summaryDetails.find((r) => r.id === "net").value,
    swing: trace.summaryDetails.find((r) => r.id === "swing").value,
  };
}

export function buildEngineGuide() {
  return {
    formulas: RECONCILIATION_FORMULAS,
    sources: [
      {
        type: "scans",
        purpose:
          "Qué PN se escaneó, cuántas piezas y en qué área. Se usa el archivo manual o la lectura del bot; nunca ambos.",
      },
      {
        type: "areas",
        purpose:
          "Traduce el nombre del área 4Wall a una localidad QAD. Área y localidad no son lo mismo.",
      },
      {
        type: "qad",
        purpose:
          "Inventario congelado: cuántas piezas esperaba el sistema por PN y localidad. Planta 179A; tipos PP / MP / FP.",
      },
      {
        type: "ispbb",
        purpose:
          "Decide si el PN es Phantom. YES genera componentes; NO permite reconocer escaneos directos.",
      },
      {
        type: "bom",
        purpose:
          "Lista los componentes de cada padre y Usage: cuántos componentes corresponden a una pieza del padre.",
      },
      {
        type: "cost",
        purpose:
          "Aporta Cost Total para los dólares y Status para saber si el PN es obsoleto.",
      },
    ],
    stages: [
      {
        id: "raw",
        title: "Recibe los archivos",
        technical: "RAW",
        input: "4Wall, QAD congelado, áreas, ISPBB, BOM y Cost Part.",
        result:
          "Conserva las filas originales y, cuando existen, archivo, hoja y número de fila.",
        why: "Permite regresar al dato original cuando un resultado necesita explicación.",
        notes: [
          "Una copia o snapshot es el conjunto de escaneos publicado en un momento concreto por el bot.",
          "4Wall manual reemplaza la lectura automática. No se mezclan cantidades de los dos.",
        ],
        modules: [
          "parsers/parseDelimitedFile.js",
          "hooks/useReferenceFiles.js",
        ],
      },
      {
        id: "parsers",
        title: "Lee y revisa los datos",
        technical: "PARSERS",
        input: "Encabezados y valores de cada fila.",
        result:
          "Identifica PN, cantidades, áreas, costo y filas que cumplen las reglas de cada fuente.",
        why: "Una fila presente en un archivo no siempre participa en el cálculo.",
        notes: [
          "QAD acepta planta 179A y tipos PP / MP / FP.",
          "Si una cantidad no es válida, no se convierte silenciosamente en un conteo de cero.",
          "Duplicados de costo contradictorios dejan el PN sin valorar.",
        ],
        modules: [
          "parsers/parse4WallScans.js",
          "parsers/parseQad32.js",
          "parsers/parseISPBB.js",
          "parsers/parseCostPart.js",
        ],
      },
      {
        id: "normalized",
        title: "Pone los datos en el mismo idioma",
        technical: "NORMALIZED",
        input: "PN, áreas y localidades de las filas aceptadas.",
        result:
          "Limpia espacios, unifica mayúsculas y relaciona Área 4Wall con Localidad QAD.",
        why: "Se comparan localidades exactas; los nombres de área 4Wall no son la clave de QAD.",
        notes: [
          "Solo se confirma WHSE → ZWHSE como equivalencia de localidad.",
          "Sin equivalencia, el material queda señalado como área sin mapeo; no se adivina una ubicación.",
          "ISPBB y Cost Part enriquecen el PN; sus catálogos completos no crean candidatos por sí solos.",
        ],
        modules: ["domain/normalize.js", "parsers/parse4WallAreas.js"],
      },
      {
        id: "domain",
        title: "Reconoce el físico y los componentes",
        technical: "DOMAIN ENGINE",
        input: "Escaneos aceptados + definición Phantom + BOM.",
        result:
          "Un PN no Phantom aporta directo. Un padre Phantom aporta a sus componentes con Usage y conserva la localidad de origen.",
        why: "Evita sumar el padre y sus componentes como si fueran cantidades independientes del mismo material.",
        notes: [
          "Phantom sale de ISPBB, nunca del prefijo del PN.",
          "Solo BOM Level .2 / 0.2, Comp Phantom NO y Usage válido mayor que cero.",
          "No usa Grossed up Usage ni recorre BOM de otros componentes de forma recursiva.",
          "Un Phantom conserva el saldo que exista en QAD y genera una advertencia para revisarlo.",
        ],
        modules: ["domain/inventoryEngine.js", "domain/explodeBom.js"],
      },
      {
        id: "reconciliation",
        title: "Compara cantidades y dólares",
        technical: "RECONCILIATION",
        input:
          "Físico reconocido por localidad, QAD congelado y costo original.",
        result:
          "Calcula NET total, SWING por localidad y etiquetas como obsoleto, material inesperado o BOM faltante.",
        why: "NET muestra la diferencia total. SWING muestra diferencias de distribución aunque el total coincida.",
        notes: [
          "SWING suma todas las diferencias absolutas; no se divide entre dos y no demuestra un traslado.",
          "Costo conserva su precisión original. El resumen lo muestra a dos decimales.",
          "Sin costo confiable: diferencia en piezas disponible y dólares sin valorar.",
          "Sin físico registrado durante el conteo no significa pérdida final confirmada.",
        ],
        modules: [
          "domain/reconcileInventory.js",
          "domain/buildDiscrepancyFindings.js",
        ],
      },
      {
        id: "ui",
        title: "Muestra el resultado y su evidencia",
        technical: "UI",
        input: "Resultados y advertencias ya calculados.",
        result:
          "Dashboard, trazador, visor Excel y plan de revisión presentan el mismo cálculo con sus fuentes.",
        why: "La pantalla explica lo que calculó el motor; no vuelve a calcular NET, SWING o Phantom.",
        notes: [
          "Las advertencias orientan una revisión; no autorizan ajustes de inventario.",
          "Los detalles de una celda explican valor original, valor usado y regla aplicada.",
          "Los visores paginan las filas para mantener cómoda la lectura.",
        ],
        modules: [
          "components/shell/PartLogicTracer.jsx",
          "components/shell/SourcePreviewModal.jsx",
        ],
      },
    ],
    examples: [
      example(
        "net",
        "Diferencia total",
        "Hay más físico que QAD en la misma localidad: NET y SWING reflejan esa diferencia.",
        [
          {
            "Número Parte QAD": "EJEMPLO-C",
            Quantity: 26,
            AreaName: "Almacén",
          },
        ],
        20,
      ),
      example(
        "location",
        "Mismo total, distinta localidad",
        "Hay 20 piezas físicas en proceso, pero QAD espera 20 en almacén. NET es cero y SWING incluye ambas localidades.",
        [
          {
            "Número Parte QAD": "EJEMPLO-C",
            Quantity: 20,
            AreaName: "Proceso",
          },
        ],
        20,
      ),
      example(
        "phantom",
        "Componentes de un Phantom",
        "Dos padres Phantom con Usage 10 aportan 20 componentes. Se suman a los 6 componentes escaneados directamente.",
        [
          { "Número Parte QAD": "EJEMPLO-P", Quantity: 2, AreaName: "Almacén" },
          { "Número Parte QAD": "EJEMPLO-C", Quantity: 6, AreaName: "Almacén" },
        ],
        20,
        true,
      ),
    ],
  };
}
