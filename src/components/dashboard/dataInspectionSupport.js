import { rawScanObject } from "../../domain/scanView.js";

export const PAGE_SIZE = 50;
export const count = (value) => new Intl.NumberFormat("es-MX").format(Number(value) || 0);
export const clean = (value) => String(value ?? "").trim().toUpperCase();
export const letter = (index) => {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

const fileName = (value, fallback = "fuente") => String(value || fallback);
const fileBase = (value) =>
  fileName(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .slice(0, 90) || "comparacion";
const safeSheetName = (value) =>
  String(value || "Datos").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Datos";
export const sourceFile = (sources, key, fallback) => {
  if (key === "bom" && Array.isArray(sources?.bom?.files) && sources.bom.files.length) {
    return sources.bom.files.map((item) => item.fileName).join(" + ");
  }
  return sources?.[key]?.fileName || fallback;
};
const exportRows = (sheet) =>
  (sheet.rows || []).map((row) =>
    Object.fromEntries(
      (sheet.columns || []).map((column) => [column.label, row?.[column.key] ?? ""]),
    ),
  );

function downloadBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadComparison(payload, format) {
  const sheets = payload?.sheets || [];
  const base = fileBase(payload?.fileName || payload?.title || "comparacion");

  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new();
    if (payload?.summary) {
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet([{ Resumen: payload.summary }]),
        "Resumen",
      );
    }
    sheets.forEach((sheet, index) => {
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(exportRows(sheet)),
        safeSheetName(sheet.title || `Hoja ${index + 1}`),
      );
    });
    XLSX.writeFile(book, `${base}.xlsx`, { compression: true });
    return;
  }

  const separator = format === "txt" ? "\t" : ",";
  const quote = (value) => {
    const text = String(value ?? "");
    if (format === "txt") return text.replace(/\t/g, " ");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const sections = [];
  if (payload?.summary) sections.push(`RESUMEN: ${payload.summary}`);
  sheets.forEach((sheet) => {
    const columns = sheet.columns || [];
    sections.push(
      [
        `[${sheet.title || "Datos"}]`,
        columns.map((column) => quote(column.label)).join(separator),
        ...(sheet.rows || []).map((row) =>
          columns.map((column) => quote(row?.[column.key] ?? "")).join(separator),
        ),
      ].join("\n"),
    );
  });
  downloadBlob(
    sections.join("\n\n"),
    `${base}.${format}`,
    format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8",
  );
}

export const VIEW_TITLES = {
  overview: "Fuentes cargadas",
  scans: "Escaneos 4Wall",
  alerts: "Alertas del corte",
  areas: "Diccionario de áreas 4Wall",
  qad: "Inventario QAD",
  cost: "Cost Part",
  bom: "Relaciones BOM",
  parents: "Padres BOM escaneados",
  bomReview: "Material para revisar en BOM",
  ispbb: "Definiciones ISPBB",
  phantoms: "Phantoms definidos en ISPBB",
  reconciliationExcel: "Conciliación por localidad",
  findingEvidence: "Evidencia del hallazgo",
};

function warningRows(warnings = {}) {
  return [
    ...(warnings.missingBoms || []).map(x=>({category:'FALTA BOM',partNumber:x.parentPart,detail:`Escaneado: ${x.scannedQuantity}. Agregar su BOM.`})),
    ...(warnings.emptyBoms || []).map(x=>({category:'BOM SIN FILAS APLICABLES',partNumber:x.parentPart,detail:'No hay componentes NO de nivel .2 con Usage válido.'})),
    ...(warnings.unmappedAreaNames || []).map((area) => ({ category: "ÁREA SIN MAPEO", partNumber: "", detail: area })),
    ...(warnings.partsWithoutCost || []).map((partNumber) => ({ category: "SIN COSTO", partNumber, detail: "Cost Part no tiene costo para este Part Number." })),
    ...(warnings.unexpectedMaterial || []).map((item) => ({ category: "QAD ESPERABA 0", partNumber: item.partNumber, detail: `Físico ${item.physical} · NET ${Number(item.netUsd || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}` })),
    ...(warnings.invalidCostRows || []).map((item) => ({ category: "COSTO INVÁLIDO", partNumber: item.partNumber, detail: `Fila ${item.rowNumber} · Site ${item.site || "?"} · Cost Total no numérico/vacío.` })),
    ...(warnings.duplicateCostParts || []).map((item) => ({ category: "COST PART DUPLICADO", partNumber: item.partNumber, detail: `Sites: ${item.firstSite || "?"} / ${item.duplicateSite || "?"}.` })),
    ...(warnings.phantomDefinitionMismatches || []).map((item) => ({ category: "PHANTOM POR REVISAR", partNumber: item.componentPart, detail: `Padre ${item.parentPart}: ISPBB y BOM no coinciden.` })),
    ...(warnings.invalidPhysicalQuantityRows || []).map((item) => ({ category: "CANTIDAD 4WALL INVÁLIDA", partNumber: item.partNumber, detail: `Fila ${item.rowNumber}: cantidad inválida.` })),
    ...(warnings.invalidQadQuantityRows || []).map((item) => ({ category: "CANTIDAD QAD INVÁLIDA", partNumber: item.partNumber, detail: `Fila ${item.rowNumber}: Quantity On Hand inválido.` })),
  ];
}

const FOUR_WALL_COLUMNS = [
  "Ticket/FIFO",
  "AreaName",
  "subArea",
  "Escaneador",
  "auditor",
  "Numero de parte",
  "Número Parte QAD",
  "Quantity",
  "Costo Estándar",
  "Costo Total",
  "Responsable",
  "Área General",
  "Fecha agregado",
  "serial",
];


export function scanColumns(scanRows = []) {
  const sourceColumns = scanRows.find((row) => row?.source_columns)?.source_columns || {};
  const usedKeys = new Map([
    [String(sourceColumns.part_number || "Número Parte QAD"), "Part Number"],
    [String(sourceColumns.quantity || "Quantity"), "Cantidad"],
    [String(sourceColumns.area || "AreaName"), "Área 4Wall"],
  ]);
  return [...new Set([...FOUR_WALL_COLUMNS, ...scanRows.flatMap(row => Object.keys(rawScanObject(row)))])].map((key) => ({
    key,
    label: usedKeys.has(key) ? `${key}  ★ USADO: ${usedKeys.get(key)}` : key,
    used: usedKeys.has(key),
  }));
}

export function scanViewRows(scanRows = []) {
  return scanRows.map((row) => rawScanObject(row));
}

function reconciliationLocationRows(reconciliation = []) {
  const result = [];
  for (const item of reconciliation) {
    const sourceRows = item.trace?.sourceRows || [];
    for (const row of item.trace?.swingByLocation || []) {
      const matchedAreas = [...new Set(
        sourceRows
          .filter((source) => clean(source.qadLocation) === clean(row.location))
          .map((source) => source.areaName)
          .filter(Boolean),
      )];
      result.push({
        partNumber: item.partNumber,
        area4Wall: matchedAreas.join(" | ") || "Sin área física para esta localidad",
        location: row.location,
        physical: row.physicalQty,
        qad: row.qadQty,
        delta: row.delta,
        swing: row.swingPieces,
        unitCost: item.master?.hasCost ? item.master?.unitCost : "SIN COSTO",
        netUsd: item.master?.hasCost ? item.financial?.netUsd : "SIN VALORAR",
        status: item.flags?.financialStatus || "",
      });
    }
  }
  return result;
}

export function getView(view, { scanRows, diagnostics, reconciliation, referenceRows, sources, referencesReady }) {
  const byPart = { label: "Part Number", key: "partNumber" };
  switch (view) {
    case "overview": {
      const list = [
        {
          name: sources?.scans?.loaded ? "4Wall · archivo manual" : "4Wall · snapshot DEV",
          file: sources?.scans?.loaded ? sources.scans.fileName : "Supabase · bot automático no operativo",
          rows: scanRows.length,
          state: sources?.scans?.loaded ? "CARGADO MANUALMENTE" : scanRows.length ? "DATOS DEV" : "EN ESPERA",
        },
        ...[
          ["areas", "Diccionario 4Wall"], ["qad", "QAD"], ["ispbb", "ISPBB"], ["bom", "BOM"], ["cost", "Cost Part"],
        ].map(([key, name]) => ({
          name, file: sources?.[key]?.fileName || "Archivo pendiente",
          rows: sources?.[key]?.rows?.length || 0,
          state: sources?.[key]?.loaded ? "CARGADO" : "PENDIENTE",
        })),
      ];
      return {
        rows: list,
        description: "Resumen de las fuentes recibidas por el dashboard.",
        columns: [{ label: "Fuente", key: "name" }, { label: "Archivo / sistema", key: "file" }, { label: "Filas", key: "rows" }, { label: "Estado", key: "state" }],
      };
    }
    case "scans": {
      const rows = scanViewRows(scanRows);
      return {
        rows,
        description: sources?.scans?.loaded ? `Archivo manual: ${sources.scans.fileName}. Estas son las cantidades que usa el comparativo; el bot está en pausa.` : scanRows.some((row) => row?.raw_record)
          ? "Vista del archivo 4Wall conservado por el pipeline. Las columnas con ★ USADO alimentan Part Number, cantidad o área en la conciliación."
          : "El snapshot actual solo conserva las columnas publicadas por el pipeline anterior. Cuando el bot publique raw_record se mostrará aquí el archivo original completo y se marcarán las columnas usadas.",
        columns: scanColumns(scanRows),
      };
    }
    case "alerts":
      return {
        rows: referencesReady ? warningRows(diagnostics?.warnings) : [],
        description: referencesReady ? "Entradas incluidas en el contador de alertas." : "Carga los cinco archivos de referencia.",
        columns: [{ label: "Motivo", key: "category" }, byPart, { label: "Detalle", key: "detail" }],
      };
    case "areas":
      return {
        rows: referenceRows.areas,
        description: "Diccionario que convierte Área 4Wall en Localidad QAD.",
        columns: [{ label: "ID", key: "Id" }, { label: "Área 4Wall", key: "Nombre" }, { label: "Localidad QAD", key: "Localidad QAD" }, { label: "Área general", key: "Área General" }],
      };
    case "qad":
      return {
        rows: referenceRows.qad,
        description: "Archivo QAD cargado; Quantity On Hand es la cantidad usada por localidad.",
        columns: [{ label: "Part Number", key: "Item Number" }, { label: "Sitio", key: "Site" }, { label: "Localidad", key: "Location" }, { label: "Cantidad", key: "Quantity On Hand" }, { label: "Tipo", key: "Item Type" }],
      };
    case "cost":
      return {
        rows: referenceRows.cost,
        description: "Archivo Cost Part cargado; Cost Total es el costo candidato para valorar.",
        columns: [{ label: "Part Number", key: "Item Number" }, { label: "Status", key: "Status" }, { label: "Cost Total", key: "Cost Total" }, { label: "Sitio", key: "Site" }],
      };
    case "bom":
      return {
        rows: referenceRows.bom,
        description: "Solo Level .2 / 0.2 y Comp Phantom NO aportan cantidades mediante Usage.",
        columns: [{ label: "Padre", key: "Parent Item" }, { label: "Componente", key: "Component" }, { label: "Usage", key: "Usage" }, { label: "Phantom componente", key: "Comp Phantom" }, { label: "Archivo origen", key: "__sourceFile" }, { label: "Nivel", key: "Level" }, { label: "Sitio", key: "Site" }],
      };
    case "ispbb":
      return {
        rows: referenceRows.ispbb,
        description: "Archivo ISPBB; el campo Phantom es la fuente de definición Phantom.",
        columns: [{ label: "Part Number", key: "Item Number" }, { label: "Phantom", key: "Phantom" }, { label: "Status", key: "Status" }, { label: "Tipo", key: "Item Type" }, { label: "Sitio", key: "Site" }],
      };
    case "phantoms":
      return {
        rows: Array.from(diagnostics?.planning?.byPart?.values() || []).filter((item) => item.phantom),
        description: "Ítems definidos como Phantom por ISPBB.",
        columns: [byPart, { label: "Descripción", key: "description" }, { label: "Status", key: "status" }, { label: "Sitio", key: "site" }],
      };
    case "parents":
      return {
        rows: Array.from(diagnostics?.physical?.byPart?.values() || []).filter((item) => diagnostics?.planning?.byPart?.get(item.partNumber)?.phantom === true && diagnostics?.bom?.byParent?.has(item.partNumber)),
        description: "Escaneos phantom con un BOM disponible. Solo se calculan componentes NO de nivel .2.",
        columns: [byPart, { label: "Escaneos", key: "scanCount" }, { label: "Cantidad física", key: "physicalTotal" }],
      };
    case "bomReview":
      return {
        rows: reconciliation.filter((item) => item.flags?.isMissingPhysical && item.flags?.hasBomReference).map((item) => ({ partNumber: item.partNumber, qad: item.qad?.total, netUsd: item.financial?.netUsd })),
        description: "PN sin físico reconocido que aparecen como componentes en BOM.",
        columns: [byPart, { label: "QAD", key: "qad" }, { label: "NET USD", key: "netUsd" }],
      };
    case "reconciliationExcel":
      return {
        rows: reconciliationLocationRows(reconciliation),
        description: "Área 4Wall se traduce a Localidad QAD con el diccionario 4Wall-Area. Delta = Físico − QAD.",
        columns: [
          byPart,
          { label: "Área 4Wall", key: "area4Wall" },
          { label: "Localidad QAD", key: "location" },
          { label: "Físico 4Wall", key: "physical" },
          { label: "QAD", key: "qad" },
          { label: "Delta", key: "delta" },
          { label: "SWING piezas", key: "swing" },
          { label: "Costo unitario", key: "unitCost" },
          { label: "NET USD del PN", key: "netUsd" },
          { label: "Estado", key: "status" },
        ],
      };
    default:
      return { rows: [], columns: [], description: "" };
  }
}

