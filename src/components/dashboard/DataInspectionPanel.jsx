import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 50;
const count = (value) => new Intl.NumberFormat("es-MX").format(Number(value) || 0);
const clean = (value) => String(value ?? "").trim().toUpperCase();
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

function rawScanObject(row) {
  const raw = row?.raw_record && typeof row.raw_record === "object" ? row.raw_record : {};
  const normalizedFallback = {
    "Número Parte QAD": row?.numero_parte,
    Quantity: row?.cantidad,
    AreaName: row?.area_escaneo,
  };
  return Object.fromEntries(
    FOUR_WALL_COLUMNS.map((key) => [key, raw[key] ?? normalizedFallback[key] ?? ""]),
  );
}

function scanColumns(scanRows = []) {
  const sourceColumns = scanRows.find((row) => row?.source_columns)?.source_columns || {};
  const usedKeys = new Map([
    [String(sourceColumns.part_number || "Número Parte QAD"), "Part Number"],
    [String(sourceColumns.quantity || "Quantity"), "Cantidad"],
    [String(sourceColumns.area || "AreaName"), "Área 4Wall"],
  ]);
  return FOUR_WALL_COLUMNS.map((key) => ({
    key,
    label: usedKeys.has(key) ? `${key}  ★ USADO: ${usedKeys.get(key)}` : key,
    used: usedKeys.has(key),
  }));
}

function scanViewRows(scanRows = []) {
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

function getView(view, { scanRows, diagnostics, reconciliation, referenceRows, sources, referencesReady }) {
  const byPart = { label: "Part Number", key: "partNumber" };
  switch (view) {
    case "overview": {
      const list = [
        { name: "4Wall en vivo", file: "Snapshot de Supabase", rows: scanRows.length, state: scanRows.length ? "DISPONIBLE" : "EN ESPERA" },
        ...[
          ["areas", "Diccionario 4Wall"], ["qad", "QAD 3.2"], ["ispbb", "ISPBB"], ["bom", "BOM"], ["cost", "Cost Part"],
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
        description: scanRows.some((row) => row?.raw_record)
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

function SheetTable({ title, rows, columns, emptyMessage }) {
  const visible = rows.slice(0, 120);
  return (
    <section className="vi-dual-sheet">
      <div className="vi-dual-sheet-title">
        <strong>{title}</strong>
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

function FindingEvidenceView({ finding, scanRows, referenceRows, reconciliation, onClose }) {
  const pn = clean(finding?.partNumber);
  const qadRows = (referenceRows.qad || []).filter((row) => clean(row["Item Number"]) === pn);
  const physicalRows = scanRows.filter((row) => clean(row.numero_parte) === pn || clean(rawScanObject(row)["Número Parte QAD"]) === pn);
  const costRows = (referenceRows.cost || []).filter((row) => clean(row["Item Number"]) === pn);
  const bomRows = (referenceRows.bom || []).filter((row) => clean(row.Component) === pn || clean(row["Component"]) === pn);
  const areaNames = new Set(physicalRows.map((row) => clean(row.area_escaneo)).filter(Boolean));
  const areaRows = (referenceRows.areas || []).filter((row) => areaNames.has(clean(row.Nombre)));
  const item = reconciliation.find((row) => clean(row.partNumber) === pn);

  let left = { title: "QAD 3.2", rows: qadRows, columns: [{label:"Part Number",key:"Item Number"},{label:"Localidad",key:"Location"},{label:"Cantidad",key:"Quantity On Hand"},{label:"Sitio",key:"Site"}] };
  let right = { title: "4Wall", rows: scanViewRows(physicalRows), columns: scanColumns(physicalRows) };
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
    left = { title: "Cost Part", rows: costRows, columns: [{label:"Part Number",key:"Item Number"},{label:"Cost Total",key:"Cost Total"},{label:"Status",key:"Status"},{label:"Site",key:"Site"}] };
    right = { title: "Conciliación", rows: item ? [{partNumber:item.partNumber,netPieces:item.financial?.netPieces,costState:item.master?.costState,netUsd:item.master?.hasCost?item.financial?.netUsd:"SIN VALORAR"}] : [], columns:[{label:"Part Number",key:"partNumber"},{label:"Diferencia piezas",key:"netPieces"},{label:"Estado costo",key:"costState"},{label:"NET USD",key:"netUsd"}] };
    message = "La diferencia en piezas existe, pero falta un costo válido y no contradictorio para convertirla a dólares.";
  } else if (finding?.ruleCode === "UNMAPPED_AREA") {
    left = { title: "4Wall", rows: scanViewRows(physicalRows), columns: scanColumns(physicalRows) };
    right = { title: "Diccionario 4Wall-Area", rows: areaRows, columns:[{label:"Área 4Wall",key:"Nombre"},{label:"Localidad QAD",key:"Localidad QAD"},{label:"Área General",key:"Área General"}] };
    message = "Compare el nombre del área de 4Wall contra el diccionario. Si no existe una Localidad QAD válida, el motor conserva UNMAPPED.";
  } else if (finding?.ruleCode === "BOM_REVIEW") {
    left = { title: "BOM", rows: bomRows, columns:[{label:"Padre",key:"Parent Item"},{label:"Componente",key:"Component"},{label:"Usage",key:"Usage"},{label:"Site",key:"Site"}] };
    right = { title: "4Wall", rows: scanViewRows(physicalRows), columns: scanColumns(physicalRows) };
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
          <button type="button" className="vi-excel-back" onClick={onClose}><span aria-hidden="true">‹</span> REGRESAR</button>
        </div>
      </div>
      <div className="vi-evidence-alert">
        <strong>Qué está pasando</strong>
        <span>{message}</span>
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

  if (view === "findingEvidence" && findingContext) {
    return (
      <FindingEvidenceView
        finding={findingContext}
        scanRows={scanRows}
        referenceRows={referenceRows}
        reconciliation={reconciliation}
        onClose={onClose}
      />
    );
  }

  if (!view) return null;

  const openPart = (row) => {
    const pn = row.partNumber || row.numero_parte || row["Item Number"] || row["Component"];
    const item = parts.get(clean(pn));
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
  );
}
