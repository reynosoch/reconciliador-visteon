import { useMemo, useState } from "react";

const PAGE_SIZE = 50;
const count = (value) => new Intl.NumberFormat("es-MX").format(value);

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
    ...(warnings.phantomDefinitionMismatches || []).map((item) => ({
      category: "PHANTOM POR REVISAR", partNumber: item.componentPart,
      detail: `Padre ${item.parentPart}: ISPBB y BOM no coinciden sobre la definición Phantom.`,
    })),
  ];
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
        rows: list, description: "El número de filas corresponde a cada archivo o snapshot recibido. Selecciona una fuente en la barra para ver sus registros.",
        columns: [{ label: "Fuente", key: "name" }, { label: "Archivo / sistema", key: "file" }, { label: "Filas", key: "rows" }, { label: "Estado", key: "state" }],
      };
    }
    case "scans":
      return {
        rows: scanRows,
        description: "Snapshot actual de 4Wall. Cada fila representa un escaneo recibido; el bot puede corregir o retirar filas en la siguiente consulta.",
        columns: [{ label: "ID", key: "id" }, { label: "Part Number", key: "numero_parte" }, { label: "Cantidad", key: "cantidad" }, { label: "Área escaneada", key: "area_escaneo" }],
      };
    case "alerts":
      return {
        rows: referencesReady ? warningRows(diagnostics?.warnings) : [],
        description: referencesReady ? "Estas son las entradas incluidas en el contador de alertas. Una pieza puede tener más de un motivo; abre el Part Number para investigarla." : "Carga los cinco archivos de referencia para revisar alertas completas.",
        columns: [{ label: "Motivo", key: "category" }, byPart, { label: "Detalle", key: "detail" }],
      };
    case "areas":
      return {
        rows: referenceRows.areas,
        description: "Diccionario oficial que relaciona el área escaneada en 4Wall con su localidad QAD. Una localidad desconocida queda como UNMAPPED.",
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
        description: "Relaciones del BOM cargado. El multiplicador utilizado por el motor es Usage; la presencia de una relación no confirma un conteo físico.",
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
        description: "Part Numbers sin físico reconocido que aparecen como componentes en el BOM. La relación sirve para investigar; no modifica NET.",
        columns: [byPart, { label: "QAD", key: "qad" }, { label: "NET USD", key: "netUsd" }],
      };
    default:
      return { rows: [], columns: [], description: "" };
  }
}

export default function DataInspectionPanel({
  view, onClose, onSelectPart, scanRows = [], diagnostics,
  reconciliation = [], referenceRows, sources, engineSources, referencesReady = false,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
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
    <section className="vi-inspection" id="vi-data-inspection" aria-label={VIEW_TITLES[view]}>
      <div className="vi-inspection-head">
        <div>
          <p className="vi-eyebrow">EXPLORAR DATOS / {view === "alerts" ? "REVISIÓN" : "FUENTE"}</p>
          <h2>{VIEW_TITLES[view]} <span>{count(viewData.rows.length)}</span></h2>
        </div>
        <button type="button" className="vi-inspection-close" onClick={onClose} aria-label="Cerrar datos y volver al dashboard">CERRAR <span aria-hidden="true">×</span></button>
      </div>
      <p className="vi-inspection-description">{viewData.description}</p>
      <div className="vi-inspection-tools">
        <label htmlFor="vi-data-search">Buscar en esta vista</label>
        <input id="vi-data-search" className="vi-input" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Part Number, localidad, área o motivo..." />
        <span>{count(filtered.length)} resultados</span>
      </div>
      <div className="vi-inspection-scroll">
        <table className="vi-inspection-table">
          <thead><tr>{viewData.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>
            {visible.map((row, index) => {
              const pn = row.partNumber || row.numero_parte || row["Item Number"] || row["Component"];
              const clickable = parts.has(String(pn || "").trim().toUpperCase());
              return <tr key={`${view}-${currentPage * PAGE_SIZE + index}`}>
                {viewData.columns.map((column) => <td key={column.key}>
                  {clickable && (column.key === "partNumber" || column.key === "numero_parte" || column.key === "Item Number")
                    ? <button type="button" className="vi-inspection-part" onClick={() => openPart(row)}>{String(row[column.key] ?? "—")}</button>
                    : String(row[column.key] ?? "—")}
                </td>)}
              </tr>;
            })}
          </tbody>
        </table>
        {!visible.length && <p className="vi-inspection-empty">No hay registros para esta selección. Comprueba las fuentes cargadas o cambia la búsqueda.</p>}
      </div>
      {filtered.length > PAGE_SIZE && <div className="vi-inspection-pages">
        <span>Mostrando {count(currentPage * PAGE_SIZE + 1)}–{count(Math.min((currentPage + 1) * PAGE_SIZE, filtered.length))} de {count(filtered.length)}</span>
        <div>
          <button type="button" className="vi-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>ANTERIOR</button>
          <span>Página {currentPage + 1} / {lastPage + 1}</span>
          <button type="button" className="vi-button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>SIGUIENTE</button>
        </div>
      </div>}
    </section>
  );
}
