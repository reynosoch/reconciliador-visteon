import { rawScanObject } from "../../domain/scanView.js";
import { useEffect, useMemo, useState } from "react";
import ExportFormatDialog from "../shell/ExportFormatDialog.jsx";
import {
  PAGE_SIZE,
  VIEW_TITLES,
  clean,
  count,
  downloadComparison,
  getView,
  letter,
  scanColumns,
  scanViewRows,
  sourceFile,
} from "./dataInspectionSupport.js";

function SheetTable({ title, fileName: sheetFileName, rows, columns, emptyMessage }) {
  const visible = rows.slice(0, 120);
  return (
    <section className="vi-dual-sheet">
      <div className="vi-dual-sheet-title">
        <div>
          <strong>{title}</strong>
          <small title={sheetFileName}>{sheetFileName || "Fuente sin nombre"}</small>
        </div>
        <span>{count(rows.length)} filas</span>
      </div>
      <div className="vi-dual-sheet-scroll">
        <table className="vi-inspection-table vi-excel-grid">
          <thead>
            <tr className="vi-excel-letters">
              <th className="vi-excel-corner" />
              {columns.map((column, index) => <th key={column.key}>{letter(index)}</th>)}
            </tr>
            <tr className="vi-excel-fields">
              <th className="vi-excel-row-number">#</th>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={index}>
                <th className="vi-excel-row-number">{index + 2}</th>
                {columns.map((column) => <td key={column.key}>{String(row[column.key] ?? "—")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="vi-dual-empty">{emptyMessage}</div>}
      </div>
    </section>
  );
}

function FindingEvidenceView({
  finding,
  scanRows,
  referenceRows,
  reconciliation,
  sources,
  onClose,
  onExport,
}) {
  const pn = clean(finding?.partNumber);
  const qadRows = (referenceRows.qad || []).filter((row) => clean(row["Item Number"]) === pn);
  const physicalRows = scanRows.filter((row) => clean(row.numero_parte) === pn || clean(rawScanObject(row)["Número Parte QAD"]) === pn);
  const costRows = (referenceRows.cost || []).filter((row) => clean(row["Item Number"]) === pn);
  const bomRows = (referenceRows.bom || []).filter((row) => clean(row.Component) === pn || clean(row["Component"]) === pn);
  const areaNames = new Set(physicalRows.map((row) => clean(row.area_escaneo)).filter(Boolean));
  const areaRows = (referenceRows.areas || []).filter((row) => areaNames.has(clean(row.Nombre)));
  const item = reconciliation.find((row) => clean(row.partNumber) === pn);
  const names = {
    scans: sourceFile(sources, "scans", "4Wall · snapshot Supabase DEV"),
    qad: sourceFile(sources, "qad", "QAD"),
    cost: sourceFile(sources, "cost", "Cost Part"),
    bom: sourceFile(sources, "bom", "BOM"),
    areas: sourceFile(sources, "areas", "4Wall-Area"),
  };

  let left = { title: "QAD", fileName: names.qad, rows: qadRows, columns: [{label:"Part Number",key:"Item Number"},{label:"Localidad",key:"Location"},{label:"Cantidad",key:"Quantity On Hand"},{label:"Sitio",key:"Site"}] };
  let right = { title: "4Wall", fileName: names.scans, rows: scanViewRows(physicalRows), columns: scanColumns(physicalRows) };
  let message = "";

  if (finding?.ruleCode === "NO_PHYSICAL") {
    message = physicalRows.length
      ? "Hay filas 4Wall para este PN; revise por qué el motor no las reconoce como físico válido."
      : "QAD tiene saldo para este PN y el snapshot 4Wall actual no contiene una fila física reconocida. Esto no confirma pérdida: el conteo puede seguir pendiente.";
  } else if (finding?.ruleCode === "UNEXPECTED") {
    message = qadRows.length
      ? "Hay filas QAD, pero su saldo total evaluado es cero. Compare localidad y Site antes de clasificar el material."
      : "Hay físico 4Wall, pero el archivo QAD filtrado no contiene este PN.";
  } else if (finding?.ruleCode === "UNVALUED") {
    left = { title: "Cost Part", fileName: names.cost, rows: costRows, columns: [{label:"Part Number",key:"Item Number"},{label:"Cost Total",key:"Cost Total"},{label:"Status",key:"Status"},{label:"Site",key:"Site"}] };
    right = { title: "Conciliación", fileName: "Resultado calculado por el reconciliador", rows: item ? [{partNumber:item.partNumber,netPieces:item.financial?.netPieces,costState:item.master?.costState,netUsd:item.master?.hasCost?item.financial?.netUsd:"SIN VALORAR"}] : [], columns:[{label:"Part Number",key:"partNumber"},{label:"Diferencia piezas",key:"netPieces"},{label:"Estado costo",key:"costState"},{label:"NET USD",key:"netUsd"}] };
    message = "La diferencia en piezas existe, pero falta un costo válido y no contradictorio para convertirla a dólares.";
  } else if (finding?.ruleCode === "UNMAPPED_AREA") {
    left = { title: "4Wall", fileName: names.scans, rows: scanViewRows(physicalRows), columns: scanColumns(physicalRows) };
    right = { title: "Diccionario 4Wall-Area", fileName: names.areas, rows: areaRows, columns:[{label:"Área 4Wall",key:"Nombre"},{label:"Localidad QAD",key:"Localidad QAD"},{label:"Área General",key:"Área General"}] };
    message = "Compare el nombre del área de 4Wall contra el diccionario. Si no existe una Localidad QAD válida, el motor conserva UNMAPPED.";
  } else if (finding?.ruleCode === "BOM_REVIEW") {
    left = { title: "BOM", fileName: names.bom, rows: bomRows, columns:[{label:"Padre",key:"Parent Item"},{label:"Componente",key:"Component"},{label:"Usage",key:"Usage"},{label:"Site",key:"Site"}] };
    right = { title: "4Wall", fileName: names.scans, rows: scanViewRows(physicalRows), columns: scanColumns(physicalRows) };
    message = "La relación BOM sirve para investigar; por sí sola no crea físico ni modifica el NET.";
  } else if (finding?.ruleCode === "LOCATION_CANDIDATE") {
    message = "Las dos fuentes se muestran lado a lado. Use el diccionario 4Wall-Area para comprobar que el área física corresponda a la misma Localidad QAD antes de inferir un movimiento.";
  } else {
    message = finding?.whatFound || "Compare las fuentes que alimentan este hallazgo.";
  }

  return (
    <section className="vi-inspection vi-excel-viewer vi-dual-evidence" id="vi-data-inspection">
      <div className="vi-excel-titlebar">
        <div className="vi-excel-appmark">X</div>
        <div>
          <strong>EVIDENCIA · {finding?.partNumber}</strong>
          <span>{finding?.ruleCode || "Hallazgo"}</span>
        </div>
        <div className="vi-excel-title-actions">
          <button
            type="button"
            className="vi-excel-export"
            onClick={() => onExport?.({
              title: `Evidencia ${finding?.partNumber || "comparación"}`,
              fileName: `evidencia-${finding?.partNumber || "comparacion"}`,
              summary: message,
              sheets: [left, right],
            })}
          >
            ↓ DESCARGAR
          </button>
          <button type="button" className="vi-excel-back" onClick={onClose}>
            <span aria-hidden="true">←</span>
            <strong>VOLVER AL HALLAZGO</strong>
          </button>
        </div>
      </div>
      <div className="vi-excel-readonly-note">
        <strong>SOLO LECTURA</strong>
        <span>Este visor no modifica archivos. Si necesitas cambiar datos, corrige el archivo original y vuelve a cargarlo en Fuentes.</span>
      </div>
      <div className="vi-evidence-alert">
        <strong>Qué está pasando</strong>
        <span>{message}</span>
      </div>
      <div className="vi-evidence-sources">
        <span>COMPARACIÓN</span>
        <strong>{left.fileName || left.title}</strong>
        <i>↔</i>
        <strong>{right.fileName || right.title}</strong>
      </div>
      <div className="vi-dual-grid">
        <SheetTable {...left} emptyMessage={`No hay filas de ${left.title} para este Part Number.`} />
        <SheetTable {...right} emptyMessage={`No hay filas de ${right.title} para este Part Number.`} />
      </div>
    </section>
  );
}

export default function DataInspectionPanel({
  view, onClose, onSelectPart, scanRows = [], diagnostics,
  reconciliation = [], referenceRows, sources, engineSources, referencesReady = false,
  initialQuery = "", findingContext = null,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(0);
  const [exportPayload, setExportPayload] = useState(null);
  const [exportBusy, setExportBusy] = useState("");

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

  const runExport = async (format) => {
    if (!exportPayload || exportBusy) return;
    setExportBusy(format);
    try {
      await downloadComparison(exportPayload, format);
      setExportPayload(null);
    } finally {
      setExportBusy("");
    }
  };

  if (view === "findingEvidence" && findingContext) {
    return (
      <>
        <FindingEvidenceView
          finding={findingContext}
          scanRows={scanRows}
          referenceRows={referenceRows}
          reconciliation={reconciliation}
          sources={sources}
          onClose={onClose}
          onExport={setExportPayload}
        />
        <ExportFormatDialog
          open={Boolean(exportPayload)}
          busy={exportBusy}
          onSelect={runExport}
          onClose={() => {
            if (!exportBusy) setExportPayload(null);
          }}
        />
      </>
    );
  }

  if (!view) return null;

  const openPart = (row) => {
    const pn = row.partNumber || row.numero_parte || row["Item Number"] || row["Component"];
    const item = parts.get(clean(pn));
    if (item) onSelectPart?.(item);
  };

  return (
    <>
    <section className="vi-inspection vi-excel-viewer" id="vi-data-inspection" aria-label={VIEW_TITLES[view]}>
      <div className="vi-excel-titlebar">
        <div className="vi-excel-appmark">X</div>
        <div>
          <strong>VISOR DE DATOS</strong>
          <span>{VIEW_TITLES[view]}</span>
        </div>
        <div className="vi-excel-title-actions">
          <button
            type="button"
            className="vi-excel-export"
            onClick={() => setExportPayload({
              title: VIEW_TITLES[view],
              fileName: VIEW_TITLES[view],
              summary: viewData.description,
              sheets: [{ title: VIEW_TITLES[view], rows: filtered, columns: viewData.columns }],
            })}
          >
            ↓ DESCARGAR
          </button>
          <button type="button" className="vi-icon-close vi-excel-close" onClick={onClose} aria-label="Cerrar visor">×</button>
        </div>
      </div>
      <div className="vi-excel-ribbon">
        <span>INICIO</span><span>DATOS</span><span>REVISIÓN</span>
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
      <div className="vi-excel-readonly-note">
        <strong>SOLO LECTURA</strong>
        <span>Para modificar esta información, cambia el archivo original y vuelve a subirlo en Fuentes.</span>
      </div>
      <p className="vi-inspection-description">{viewData.description}</p>
      <div className="vi-inspection-scroll vi-excel-grid-wrap">
        <table className="vi-inspection-table vi-excel-grid">
          <thead>
            <tr className="vi-excel-letters">
              <th className="vi-excel-corner" />
              {viewData.columns.map((column, index) => <th key={column.key}>{letter(index)}</th>)}
            </tr>
            <tr className="vi-excel-fields">
              <th className="vi-excel-row-number">#</th>
              {viewData.columns.map((column) => <th className={column.used ? "is-source-used" : ""} key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const pn = row.partNumber || row.numero_parte || row["Item Number"] || row["Component"];
              const clickable = parts.has(clean(pn));
              const absoluteRow = currentPage * PAGE_SIZE + index + 2;
              return (
                <tr key={`${view}-${absoluteRow}`}>
                  <th className="vi-excel-row-number" scope="row">{absoluteRow}</th>
                  {viewData.columns.map((column) => (
                    <td className={column.used ? "is-source-used" : ""} key={column.key}>
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
        {!visible.length && <p className="vi-inspection-empty">No hay registros para esta selección.</p>}
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
    <ExportFormatDialog
      open={Boolean(exportPayload)}
      busy={exportBusy}
      onSelect={runExport}
      onClose={() => {
        if (!exportBusy) setExportPayload(null);
      }}
    />
    </>
  );
}
