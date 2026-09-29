import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 50;
const count = (value) => new Intl.NumberFormat("es-MX").format(value);
const letter = (index) => {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

const VIEW_TITLES = {
  overview: "Fuentes cargadas",
  scans: "Escaneos 4Wall",
  alerts: "Alertas del corte",
  areas: "Diccionario de áreas 4Wall",
  qad: "Inventario QAD 3.2",
  cost: "Cost Part",
  bom: "Relaciones BOM",
  parents: "Padres BOM escaneados",
  bomReview: "Material para revisar en BOM",
  ispbb: "Definiciones ISPBB",
  phantoms: "Phantoms definidos en ISPBB",
  reconciliationExcel: "Conciliación por localidad",
};

function warningRows(warnings = {}) {
  return [
    ...(warnings.unmappedAreaNames || []).map((area) => ({
      category: "ÁREA SIN MAPEO", partNumber: "", detail: area,
    })),
    ...(warnings.partsWithoutCost || []).map((partNumber) => ({
      category: "SIN COSTO", partNumber, detail: "Cost Part no tiene costo para este Part Number.",
    })),
    ...(warnings.unexpectedMaterial || []).map((item) => ({
      category: "QAD ESPERABA 0", partNumber: item.partNumber,
      detail: `Físico ${item.physical} · NET ${Number(item.netUsd || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
    })),
    ...(warnings.invalidCostRows || []).map((item) => ({
      category: "COSTO INVÁLIDO", partNumber: item.partNumber,
      detail: `Fila ${item.rowNumber} · Site ${item.site || "?"} · Cost Total no numérico/vacío. No se valora como USD 0.`,
    })),
    ...(warnings.duplicateCostParts || []).map((item) => ({
      category: "COST PART DUPLICADO", partNumber: item.partNumber,
      detail: `Se conserva la primera fila y se alerta el duplicado. Sites: ${item.firstSite || "?"} / ${item.duplicateSite || "?"}.`,
    })),
    ...(warnings.phantomDefinitionMismatches || []).map((item) => ({
      category: "PHANTOM POR REVISAR", partNumber: item.componentPart,
      detail: `Padre ${item.parentPart}: ISPBB y BOM no coinciden sobre la definición Phantom.`,
    })),
    ...(warnings.invalidPhysicalQuantityRows || []).map((item) => ({
      category: "CANTIDAD 4WALL INVÁLIDA", partNumber: item.partNumber,
      detail: `Fila ${item.rowNumber}: la cantidad no se convirtió silenciosamente a cero.`,
    })),
    ...(warnings.invalidQadQuantityRows || []).map((item) => ({
      category: "CANTIDAD QAD INVÁLIDA", partNumber: item.partNumber,
      detail: `Fila ${item.rowNumber}: Quantity On Hand no es numérico/válido.`,
    })),
  ];
}

function reconciliationLocationRows(reconciliation = []) {
  const result = [];
  for (const item of reconciliation) {
    const rows = item.trace?.swingByLocation || [];
    if (!rows.length) {
      result.push({
        partNumber: item.partNumber,
        location: "—",
        physical: item.physical?.total ?? 0,
        qad: item.qad?.total ?? 0,
        delta: item.financial?.netPieces ?? 0,
        swing: item.financial?.swingPieces ?? 0,
        unitCost: item.master?.hasCost ? item.master?.unitCost : "SIN COSTO",
        netUsd: item.master?.hasCost ? item.financial?.netUsd : "SIN VALORAR",
        status: item.flags?.financialStatus || "",
      });
      continue;
    }
    for (const row of rows) {
      result.push({
        partNumber: item.partNumber,
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

function getView(view, { scanRows, diagnostics, reconciliation, referenceRows, sources, referencesReady }) {
  const byPart = { label: "Part Number", key: "partNumber" };
  switch (view) {
    case "overview": {
      const list = [
        { name: "4Wall en vivo", file: "Snapshot de Supabase", rows: scanRows.length, state: scanRows.length ? "DISPONIBLE" : "EN ESPERA", target: "scans" },
        ...[
          ["areas", "Diccionario 4Wall"], ["qad", "QAD 3.2"], ["ispbb", "ISPBB"],
          ["bom", "BOM"], ["cost", "Cost Part"],
        ].map(([key, name]) => ({
          name, file: sources?.[key]?.fileName || "Archivo pendiente",
          rows: sources?.[key]?.rows?.length || 0,
          state: sources?.[key]?.loaded ? "CARGADO" : "PENDIENTE",
          target: key,
        })),
      ];
      return {
        rows: list, description: "El número de filas corresponde a cada archivo o reporte recibido. Este visor muestra los datos como una hoja de cálculo para poder rastrear cada registro.",
        columns: [{ label: "Fuente", key: "name" }, { label: "Archivo / sistema", key: "file" }, { label: "Filas", key: "rows" }, { label: "Estado", key: "state" }],
      };
    }
    case "scans":
      return {
        rows: scanRows,
        description: "Snapshot actual de 4Wall. Cada fila representa un registro recibido; el bot puede corregir o retirar filas en la siguiente consulta.",
        columns: [{ label: "ID", key: "id" }, { label: "Part Number", key: "numero_parte" }, { label: "Cantidad", key: "cantidad" }, { label: "Área escaneada", key: "area_escaneo" }],
      };
    case "alerts":
      return {
        rows: referencesReady ? warningRows(diagnostics?.warnings) : [],
        description: referencesReady ? "Entradas incluidas en el contador de alertas. Una pieza puede tener más de un motivo." : "Carga los cinco archivos de referencia para revisar alertas completas.",
        columns: [{ label: "Motivo", key: "category" }, byPart, { label: "Detalle", key: "detail" }],
      };
    case "areas":
      return {
        rows: referenceRows.areas,
        description: "Diccionario que relaciona el área escaneada en 4Wall con su localidad QAD. Una localidad desconocida queda como UNMAPPED.",
        columns: [{ label: "ID", key: "Id" }, { label: "Área", key: "Nombre" }, { label: "Localidad QAD", key: "Localidad QAD" }, { label: "Área general", key: "Área General" }],
      };
    case "qad":
      return {
        rows: referenceRows.qad,
        description: "Filas del archivo QAD cargado. La cantidad local es Quantity On Hand; esta vista conserva las filas originales.",
        columns: [{ label: "Part Number", key: "Item Number" }, { label: "Sitio", key: "Site" }, { label: "Localidad", key: "Location" }, { label: "Cantidad", key: "Quantity On Hand" }, { label: "Tipo", key: "Item Type" }],
      };
    case "cost":
      return {
        rows: referenceRows.cost,
        description: "Filas originales de Cost Part. Cost Total es el costo candidato para la valuación financiera.",
        columns: [{ label: "Part Number", key: "Item Number" }, { label: "Status", key: "Status" }, { label: "Cost Total", key: "Cost Total" }, { label: "Sitio", key: "Site" }],
      };
    case "bom":
      return {
        rows: referenceRows.bom,
        description: "Relaciones del BOM cargado. El multiplicador utilizado por el motor es Usage; una relación no confirma conteo físico.",
        columns: [{ label: "Padre", key: "Parent Item" }, { label: "Componente", key: "Component" }, { label: "Usage", key: "Usage" }, { label: "Nivel", key: "Level" }, { label: "Sitio", key: "Site" }],
      };
    case "ispbb":
      return {
        rows: referenceRows.ispbb,
        description: "Definiciones originales de ISPBB; esta fuente confirma Phantom solo donde existe el ítem.",
        columns: [{ label: "Part Number", key: "Item Number" }, { label: "Phantom", key: "Phantom" }, { label: "Status", key: "Status" }, { label: "Tipo", key: "Item Type" }, { label: "Sitio", key: "Site" }],
      };
    case "phantoms":
      return {
        rows: Array.from(diagnostics?.planning?.byPart?.values() || []).filter((item) => item.phantom),
        description: "Ítems del ISPBB cargado cuyo campo Phantom dice YES. No se infiere por el prefijo.",
        columns: [byPart, { label: "Descripción", key: "description" }, { label: "Status", key: "status" }, { label: "Sitio", key: "site" }],
      };
    case "parents":
      return {
        rows: Array.from(diagnostics?.physical?.byPart?.values() || []).filter((item) => diagnostics?.bom?.byParent?.get(item.partNumber)?.some((relation) => relation.level === 1)),
        description: "Padres que tienen escaneo físico y una relación directa de nivel 1 en el BOM cargado.",
        columns: [byPart, { label: "Escaneos", key: "scanCount" }, { label: "Cantidad física", key: "physicalTotal" }],
      };
    case "bomReview":
      return {
        rows: reconciliation.filter((item) => item.flags?.isMissingPhysical && item.flags?.hasBomReference).map((item) => ({
          partNumber: item.partNumber, qad: item.qad?.total, netUsd: item.financial?.netUsd,
        })),
        description: "Part Numbers sin físico reconocido que aparecen como componentes en BOM. Es una pista de investigación; no modifica NET.",
        columns: [byPart, { label: "QAD", key: "qad" }, { label: "NET USD", key: "netUsd" }],
      };
    case "reconciliationExcel":
      return {
        rows: reconciliationLocationRows(reconciliation),
        description: "Vista de investigación por localidad. Físico y QAD se comparan en la misma fila; Delta = Físico − QAD. Esta vista no mueve material ni cambia los cálculos.",
        columns: [
          byPart,
          { label: "Localidad", key: "location" },
          { label: "Físico", key: "physical" },
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

export default function DataInspectionPanel({
  view, onClose, onSelectPart, scanRows = [], diagnostics,
  reconciliation = [], referenceRows, sources, engineSources, referencesReady = false,
  initialQuery = "", originFindingId = null, onBackToFinding,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setQuery(initialQuery || "");
    setPage(0);
  }, [view, initialQuery]);

  const viewData = useMemo(() => getView(view, {
    scanRows, diagnostics: { ...diagnostics, ...engineSources },
    reconciliation, referenceRows, sources, referencesReady,
  }), [view, scanRows, diagnostics, reconciliation, referenceRows, sources, engineSources, referencesReady]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return viewData.rows;
    return viewData.rows.filter((row) => viewData.columns.some((column) =>
      String(row[column.key] ?? "").toUpperCase().includes(q)
    ));
  }, [query, viewData]);

  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const parts = useMemo(() => new Map(reconciliation.map((item) => [item.partNumber, item])), [reconciliation]);

  if (!view) return null;

  const openPart = (row) => {
    const pn = row.partNumber || row.numero_parte || row["Item Number"] || row["Component"];
    const item = parts.get(String(pn || "").trim().toUpperCase());
    if (item) onSelectPart?.(item);
  };

  return (
    <section className="vi-inspection vi-excel-viewer" id="vi-data-inspection" aria-label={VIEW_TITLES[view]}>
      <div className="vi-excel-titlebar">
        <div className="vi-excel-appmark">X</div>
        <div>
          <strong>VISOR DE DATOS</strong>
          <span>{VIEW_TITLES[view]}</span>
        </div>
        <div className="vi-excel-title-actions">
          {originFindingId && (
            <button
              type="button"
              className="vi-excel-back"
              onClick={() => onBackToFinding?.(originFindingId)}
            >
              ← REGRESAR A DISCREPANCIA
            </button>
          )}
          <button type="button" className="vi-excel-close" onClick={onClose}>
            CERRAR ×
          </button>
        </div>
      </div>

      <div className="vi-excel-ribbon">
        <span>INICIO</span>
        <span>DATOS</span>
        <span>REVISIÓN</span>
        <b>{count(viewData.rows.length)} FILAS</b>
      </div>

      <div className="vi-excel-formula">
        <span className="vi-excel-namebox">{query ? "FILTRO" : "A1"}</span>
        <span className="vi-excel-fx">fx</span>
        <input
          id="vi-data-search"
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(0); }}
          placeholder="Buscar Part Number, localidad, área, motivo..."
          aria-label="Buscar en esta hoja"
        />
      </div>

      <p className="vi-inspection-description">{viewData.description}</p>

      <div className="vi-inspection-scroll vi-excel-grid-wrap">
        <table className="vi-inspection-table vi-excel-grid">
          <thead>
            <tr className="vi-excel-letters">
              <th className="vi-excel-corner" />
              {viewData.columns.map((column, index) => (
                <th key={column.key}>{letter(index)}</th>
              ))}
            </tr>
            <tr className="vi-excel-fields">
              <th className="vi-excel-row-number">#</th>
              {viewData.columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const pn = row.partNumber || row.numero_parte || row["Item Number"] || row["Component"];
              const clickable = parts.has(String(pn || "").trim().toUpperCase());
              const absoluteRow = currentPage * PAGE_SIZE + index + 2;
              return (
                <tr key={`${view}-${absoluteRow}`}>
                  <th className="vi-excel-row-number" scope="row">{absoluteRow}</th>
                  {viewData.columns.map((column) => (
                    <td key={column.key}>
                      {clickable && (column.key === "partNumber" || column.key === "numero_parte" || column.key === "Item Number")
                        ? <button type="button" className="vi-inspection-part" onClick={() => openPart(row)}>{String(row[column.key] ?? "—")}</button>
                        : String(row[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <p className="vi-inspection-empty">
            No hay registros para esta selección. Cambia el filtro o comprueba las fuentes cargadas.
          </p>
        )}
      </div>

      <div className="vi-excel-statusbar">
        <div className="vi-excel-sheet-tab">{VIEW_TITLES[view]}</div>
        <span>{count(filtered.length)} resultados</span>
        {filtered.length > PAGE_SIZE && (
          <div className="vi-inspection-pages">
            <button type="button" className="vi-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>ANTERIOR</button>
            <span>Página {currentPage + 1} / {lastPage + 1}</span>
            <button type="button" className="vi-button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>SIGUIENTE</button>
          </div>
        )}
      </div>
    </section>
  );
}
