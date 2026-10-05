import { normalizeQadLocation, normalizeText } from "./normalize.js";
import { scanEvidenceObject } from "./scanView.js";

const qty = (value) =>
  Number(value ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 8 });
const usd = (value) =>
  value == null
    ? "Sin valorar"
    : Number(value).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
const precision = (value) => String(value ?? 0);
export const RECONCILIATION_FORMULAS = Object.freeze({
  netPieces: "NET piezas = físico reconocido − QAD congelado",
  netUsd: "NET USD = diferencia total en piezas × costo unitario",
  swing:
    "SWING USD = suma de diferencias absolutas por localidad × costo unitario",
  physical:
    "Físico reconocido = escaneos directos aceptados + componentes recibidos por BOM",
});
const STATUS = {
  UNVALUED: "Sin valorar",
  OBSOLETE_GAIN: "Sobrante obsoleto",
  UNEXPECTED: "Material inesperado",
  MISSING_PHYSICAL: "Sin físico registrado",
  LOSS: "NET negativo · por revisar",
  GAIN: "NET positivo · por revisar",
  SWING: "Diferencia por localidad",
  BALANCED: "Balanceado",
};
export function columnLetter(index) {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
}
// CSV/TXT line starts and XLSX row coordinates come from the reader, never index+2.
// Older BOM libraries and remote snapshots explicitly fall back to a collection position.
export function sourceOrigin(source, sourceIndex) {
  const row = source?.rows?.[sourceIndex];
  if (!row)
    return {
      fileName: source?.fileName || "Fuente no disponible",
      rowNumber: null,
      sheetName: "",
    };
  if (row.__provenance) return row.__provenance;
  const matchingFiles =
    source?.files?.filter((f) => f.fileName === row.__sourceFile) || [];
  const file = matchingFiles.length === 1 ? matchingFiles[0] : null;
  if (file?.rowOrigins?.length) {
    let fileIndex = 0;
    for (let i = 0; i < sourceIndex; i++)
      if (source.rows[i].__sourceFile === row.__sourceFile) fileIndex++;
    if (file.rowOrigins[fileIndex]) return file.rowOrigins[fileIndex];
  }
  return {
    fileName:
      row.__sourceFile ||
      source?.fileName ||
      "Fuente cargada sin nombre de archivo",
    sheetName: source?.sheetName || "",
    rowNumber: null,
    firstColumn: 0,
  };
}
const column = (raw, alternatives) =>
  alternatives.find((k) => Object.hasOwn(raw, k)) || alternatives[0];
function reference(type, source, entries, rule, label) {
  const rows = source?.rows || [];
  const evidence = entries
    .filter((e) => rows[e.sourceIndex])
    .map((e) => {
      const raw =
        type === "scans"
          ? scanEvidenceObject(rows[e.sourceIndex])
          : rows[e.sourceIndex];
      const keys = Object.keys(raw).filter((k) => !k.startsWith("__"));
      const origin = sourceOrigin(source, e.sourceIndex);
      return {
        ...e,
        origin,
        cells: e.cells.map((c) => ({
          ...c,
          original: raw[c.column] ?? null,
          letter:
            keys.indexOf(c.column) >= 0
              ? columnLetter(keys.indexOf(c.column) + (origin.firstColumn || 0))
              : "",
        })),
      };
    });
  return { type, label, source: source || { rows: [] }, evidence, rule };
}
const cell = (column, normalized, reason) => ({ column, normalized, reason });
const entry = (sourceIndex, cells, note = "Usada por el motor") => ({
  sourceIndex,
  cells,
  note,
});

// Mirrors the engine's PN universe by reading its accepted maps, including
// zero-quantity entries. Reference catalogs alone never create a candidate.
export function getPartEntryOrigins(item, engineSources = {}) {
  const pn = item.partNumber;
  return [
    [
      "scans",
      "4Wall",
      engineSources.physical?.byPart?.has(pn) ?? item.flags.physicalPresent,
    ],
    ["qad", "QAD", engineSources.qad?.byPart?.has(pn) ?? item.flags.qadPresent],
    [
      "bom",
      "BOM de Phantom",
      engineSources.phantomAdjustments?.byPart?.has(pn) ??
        item.flags.hasBomAdjustment,
    ],
  ]
    .filter(([, , present]) => present)
    .map(([type, label]) => ({ type, label }));
}

export function getTracerSourceInventory(
  sources = {},
  scanReady = false,
  snapshotMeta = null,
) {
  return [
    ["scans", "4Wall"],
    ["qad", "QAD"],
    ["bom", "BOM"],
    ["areas", "Áreas"],
    ["ispbb", "ISPBB"],
    ["cost", "Cost Part"],
  ].map(([type, label]) => {
    const source = sources[type];
    const remote = type === "scans" && !source?.loaded && scanReady;
    const files = source?.files?.map((file) => file.fileName).filter(Boolean);
    return {
      type,
      label:
        type === "scans"
          ? source?.loaded
            ? "4Wall · archivo manual"
            : "4Wall · automático del bot"
          : type === "qad"
            ? "QAD 3.2 · inventario congelado"
            : label,
      loaded: Boolean(source?.loaded || remote),
      identity: remote
        ? `Copia publicada del bot${snapshotMeta?.snapshotId ? " · " + snapshotMeta.snapshotId : " · identificador no disponible"}`
        : files?.length
          ? [...new Set(files)].join(" · ")
          : source?.fileName || "Archivo no disponible",
    };
  });
}

// Choose contrasting real cases, rather than a list of largest losses only.
// Ranking reads existing engine results; it does not calculate any money.
export function getRecommendedPartCases(reconciliation = []) {
  const categories = [
    [
      "net",
      "Mayor diferencia total",
      (r) => r.master.hasCost && r.financial.netUsd !== 0,
    ],
    [
      "swing",
      "Mayor diferencia por localidad",
      (r) => r.master.hasCost && r.financial.swingUsd > 0,
    ],
    ["planning", "Phantom por confirmar", (r) => !r.master.phantomKnown],
    [
      "phantom",
      "Padre Phantom",
      (r) => r.master.isPhantom && r.physical.scanCount > 0,
    ],
    ["bom", "Componente que recibe BOM", (r) => r.flags.hasBomAdjustment],
    ["qad", "QAD con conteo pendiente", (r) => r.flags.isMissingPhysical],
    ["unexpected", "Material inesperado", (r) => r.flags.isUnexpectedMaterial],
    ["cost", "Costo por revisar", (r) => !r.master.hasCost],
    [
      "balanced",
      "Un caso balanceado",
      (r) =>
        r.flags.financialStatus === "BALANCED" &&
        r.master.hasCost &&
        r.master.phantomKnown,
    ],
  ];
  const selected = new Set(),
    cases = [];
  for (const [id, reason, matches] of categories) {
    let best = null,
      score = -1;
    for (const item of reconciliation) {
      if (selected.has(item.partNumber) || !matches(item)) continue;
      const rank =
        id === "swing"
          ? item.financial.swingUsd
          : item.master.hasCost
            ? Math.abs(item.financial.netUsd)
            : Math.abs(item.financial.netPieces);
      if (rank > score) {
        best = item;
        score = rank;
      }
    }
    if (best) {
      selected.add(best.partNumber);
      cases.push({ id, reason, item: best });
    }
  }
  return cases;
}

export function buildPartCatalogSource(
  reconciliation = [],
  engineSources = {},
  inputSources = [],
) {
  const inputs = new Map(inputSources.map((r) => [r.type, r]));
  const rows = reconciliation.map((item) => {
    const origins = getPartEntryOrigins(item, engineSources);
    const source = (type) => {
      if (!origins.some((r) => r.type === type)) return "No incorporó este PN";
      if (type === "bom") {
        const names = [
          ...new Set(
            (
              engineSources.phantomAdjustments?.byPart?.get(item.partNumber)
                ?.sources || []
            )
              .map((r) => r.sourceFile)
              .filter(Boolean),
          ),
        ];
        if (names.length) return names.join(" · ");
        return `Biblioteca activa: ${inputs.get(type)?.identity || "Archivo no disponible"}; archivo exacto no registrado en el cálculo`;
      }
      return inputs.get(type)?.identity || "Archivo no disponible";
    };
    return {
      PN: item.partNumber,
      Descripción: item.master.description || "Sin descripción",
      "Aparece por": origins
        .map((r) => inputs.get(r.type)?.label || r.label)
        .join(" + "),
      "Fuente 4Wall": source("scans"),
      "Fuente QAD congelado": source("qad"),
      "Fuente BOM": source("bom"),
      "Físico reconocido": item.physical.total,
      "QAD congelado": item.qad.total,
      "NET USD": item.master.hasCost ? item.financial.netUsd : "Sin valorar",
      "SWING USD": item.master.hasCost
        ? item.financial.swingUsd
        : "Sin valorar",
    };
  });
  return {
    fileName: "Lista de PN del resultado actual",
    rows,
    fields: Object.keys(rows[0] || {}),
    loaded: true,
  };
}

// Called only for the selected PN. Reads normalized parser decisions and engine results;
// it does not recompute NET, SWING, explosions or the financial classification.
export function buildPartLearningTrace({
  item,
  engineSources = {},
  sources = {},
  scanRows = [],
  scanReady = false,
  snapshotMeta = null,
  findings = [],
} = {}) {
  if (!item) return null;
  const pn = item.partNumber,
    s = engineSources || {},
    f = item.financial,
    m = item.master,
    p = item.physical,
    q = item.qad;
  const scannedSource = sources.scans?.loaded
    ? sources.scans
    : {
        rows: scanRows,
        fileName: snapshotMeta?.fileName || "Copia 4Wall publicada por el bot",
        loaded: scanReady,
      };
  const inputs = getTracerSourceInventory(sources, scanReady, snapshotMeta);
  const incoming = item.trace.bomSources || [];
  const parentParts = [...new Set(incoming.map((r) => r.parentPart))];
  const scanParts = [pn, ...parentParts];
  const scanEntries = scanParts.flatMap((part) =>
    (s.physical?.byPart.get(part)?.sourceRows || []).map((r) => {
      const raw = scannedSource.rows[r.sourceIndex] || {},
        view = scanEvidenceObject(raw);
      const cols = raw.source_columns || {};
      return entry(
        r.sourceIndex,
        [
          cell(
            cols.part_number ||
              column(view, [
                "Número Parte QAD",
                "Numero Parte QAD",
                "Numero de parte",
                "numero_parte",
              ]),
            part,
            "PN normalizado: trim + mayúsculas",
          ),
          cell(
            cols.area || column(view, ["AreaName", "area_escaneo"]),
            r.areaName,
            "Área usada para buscar el catálogo",
          ),
          cell(
            cols.quantity || column(view, ["Quantity", "cantidad"]),
            r.quantity,
            part === pn
              ? "Cantidad escaneada; ISPBB decide si aporta directo"
              : `Cantidad del padre ${part}; alimenta BOM`,
          ),
        ],
        part === pn
          ? "Escaneo del PN seleccionado"
          : `Escaneo del padre Phantom ${part}`,
      );
    }),
  );
  const scans = reference(
    "scans",
    scannedSource,
    scanEntries,
    "El archivo manual reemplaza a la copia publicada por el bot; las dos fuentes nunca se suman juntas.",
    "4Wall",
  );
  const mappings = scanParts.flatMap(
    (part) => s.physical?.byPart.get(part)?.sourceRows || [],
  );
  const areaNames = [...new Set(mappings.map((r) => r.areaName))];
  const areaEntries = areaNames.flatMap((area) => {
    const a = s.areas?.byArea.get(area);
    return a
      ? [
          entry(a.sourceIndex, [
            cell(
              "Nombre",
              a.areaName,
              "Coincidencia exacta después de normalizar el área",
            ),
            cell(
              "Localidad QAD",
              a.qadLocation || "UNMAPPED",
              "Solo WHSE se traduce a ZWHSE; vacío queda UNMAPPED",
            ),
          ]),
        ]
      : [];
  });
  const areas = reference(
    "areas",
    sources.areas,
    areaEntries,
    "Área 4Wall → catálogo → Localidad QAD. Sin catálogo: UNMAPPED.",
    "Áreas 4Wall",
  );
  const planningEntries = scanParts.flatMap((part) => {
    const r = s.planning?.byPart.get(part);
    return r
      ? [
          entry(
            r.sourceIndex,
            [
              cell("Item Number", part, "PN que se consulta"),
              cell("Site", r.site, "Filtro de planta 179A"),
              cell(
                "Phantom",
                r.phantom ? "YES" : "NO",
                "Decisión real del parser ISPBB; sin prefijos",
              ),
            ],
            part === pn
              ? "Definición seleccionada por ISPBB"
              : "Definición del padre que generó la aportación",
          ),
        ]
      : [];
  });
  const ispbb = reference(
    "ispbb",
    sources.ispbb,
    planningEntries,
    "ISPBB filtrado por Site 179A; la última fila aceptada del PN determina su definición.",
    "ISPBB",
  );
  const relationMap = new Map();
  for (const r of s.bom?.byParent.get(pn) || [])
    relationMap.set(r.sourceIndex, r);
  for (const contribution of incoming) {
    const r = s.bom?.relations?.find(
      (r) => r.sourceIndex === contribution.sourceIndex,
    );
    if (r) relationMap.set(r.sourceIndex, r);
  }
  const bomEntries = [...relationMap.values()].map((r) =>
    entry(
      r.sourceIndex,
      [
        cell(
          "Parent Item",
          r.parentPart,
          "Padre escaneado; ISPBB debe definirlo como Phantom YES",
        ),
        cell("Component", r.componentPart, "PN que recibe la aportación"),
        cell(
          "Level",
          r.eligibleLevel ? ".2 elegible" : `${r.rawLevel} excluido`,
          "Solo .2 / 0.2 / 0,2; no multiplicar por 0.2",
        ),
        cell(
          "Comp Phantom",
          r.componentPhantomReported === false
            ? "NO"
            : r.componentPhantomReported === true
              ? "YES"
              : "Desconocido",
          "Solo NO se acepta",
        ),
        cell("Usage", r.usage, "Multiplicador real; no Grossed up Usage"),
      ],
      !m.isPhantom && r.parentPart === pn
        ? "Referencia: este padre NO genera explosión"
        : r.eligibleLevel && r.componentPhantomReported === false && r.usage > 0
          ? "Relación elegible; requiere escaneo del padre"
          : "Fila excluida por la regla vigente",
    ),
  );
  const bom = reference(
    "bom",
    sources.bom,
    bomEntries,
    "Phantom YES → Level .2 + Comp Phantom NO + Usage > 0. No recursivo; conserva localidad del padre.",
    "BOM",
  );
  const qadEntries = (s.qad?.byPart.get(pn)?.sourceIndices || []).map((i) => {
    const raw = sources.qad?.rows?.[i] || {};
    return entry(i, [
      cell("Item Number", pn, "PN del congelado"),
      cell("Site", normalizeText(raw.Site), "Solo 179A"),
      cell(
        "Item Type",
        normalizeText(raw["Item Type"]),
        "Universo vigente PP / MP / FP",
      ),
      cell(
        "Location",
        normalizeQadLocation(raw.Location) || "NO_LOCATION",
        "Localidad exacta contra físico",
      ),
      cell(
        "Quantity On Hand",
        Number(String(raw["Quantity On Hand"]).replace(/[,$]/g, "")),
        "Qty OH aceptada; se suma por PN y localidad",
      ),
    ]);
  });
  const qad = reference(
    "qad",
    sources.qad,
    qadEntries,
    "QAD conserva su saldo incluso si ISPBB dice Phantom. Site 179A; PP/MP/FP.",
    "QAD 3.2",
  );
  const costEntries = (s.costs?.byPart.get(pn)?.sourceIndices || []).map((i) =>
    entry(
      i,
      [
        cell("Item Number", pn, "Identificador financiero"),
        cell(
          "Cost Total",
          m.hasCost ? m.unitCost : m.costState,
          "Costo usado con precisión original; conflicto/inválido no se valora",
        ),
        cell(
          "Status",
          m.costStatus,
          "OBSOLETE se toma de Cost Part, no de ISPBB",
        ),
      ],
      m.costState === "CONFLICT"
        ? "Duplicados contradictorios: costo no confiable"
        : "Fila de costo revisada por el parser",
    ),
  );
  const cost = reference(
    "cost",
    sources.cost,
    costEntries,
    "Duplicados contradictorios invalidan el costo. Costo cero se conserva y se advierte.",
    "Cost Part",
  );
  // Description follows the same nullish precedence as reconcileInventory:
  // an existing empty Cost Part description does not fall back to ISPBB.
  const descriptionSource = s.costs?.byPart.has(pn) ? "cost" : "ispbb";
  const descriptionIndex =
    descriptionSource === "cost"
      ? s.costs.byPart.get(pn).sourceIndices?.[0]
      : s.planning?.byPart.get(pn)?.sourceIndex;
  const descriptionRef = reference(
    descriptionSource,
    sources[descriptionSource],
    descriptionIndex != null &&
      Object.hasOwn(
        sources[descriptionSource]?.rows?.[descriptionIndex] || {},
        "Description",
      )
      ? [
          entry(descriptionIndex, [
            cell(
              "Description",
              m.description,
              "Descripción seleccionada por el motor: Cost Part primero; ISPBB solo si no existe Cost Part",
            ),
          ]),
        ]
      : [],
    "La descripción viene de Cost Part; ISPBB solo si no existe registro Cost Part. Una descripción vacía se conserva.",
    descriptionSource === "cost"
      ? "Descripción · Cost Part"
      : "Descripción · ISPBB",
  );
  for (const ref of [scans, areas, ispbb, bom, qad, cost]) {
    const input = inputs.find((r) => r.type === ref.type);
    ref.label = input?.label || ref.label;
    ref.identity = input?.identity || "Archivo no disponible";
  }
  const readiness = [
    ["scans", scans.label, Boolean(scannedSource.loaded)],
    ["areas", "Áreas", Boolean(sources.areas?.loaded)],
    ["ispbb", "ISPBB", Boolean(sources.ispbb?.loaded)],
    ["bom", "BOM", Boolean(sources.bom?.loaded)],
    ["qad", qad.label, Boolean(sources.qad?.loaded)],
    ["cost", "Costo", Boolean(sources.cost?.loaded)],
  ];
  const requiredMissing = readiness.filter(
    ([key, , loaded]) =>
      !loaded && (key !== "bom" || m.isPhantom || incoming.length),
  );
  const complete = requiredMissing.length === 0;
  const status = STATUS[item.flags.financialStatus] || "Por revisar";
  const alertLabels = [
    [item.flags.missingBom, "Falta BOM"],
    [item.flags.emptyBom, "BOM sin filas aplicables"],
    [!m.phantomKnown, "Sin definición ISPBB"],
    [item.flags.phantomQadBalance, "Phantom con saldo QAD"],
    [item.flags.zeroCost, "Costo cero"],
    [
      !m.hasCost,
      m.costState === "CONFLICT"
        ? "Costos contradictorios"
        : m.costState === "INVALID"
          ? "Costo inválido"
          : "Costo no disponible",
    ],
    [item.flags.hasUnmappedPhysicalLocation, "Área sin mapeo"],
    [item.flags.hasInvalidQadLocation, "QAD sin localidad"],
    [item.flags.isMissingPhysical, "Sin físico registrado; conteo pendiente"],
    [item.flags.isUnexpectedMaterial, "Material inesperado"],
  ]
    .filter(([yes]) => yes)
    .map(([, label]) => label);
  const pnFindings = findings.filter((r) => r.partNumber === pn);
  const valued = m.hasCost;
  const formulas = {
    netPieces: {
      general: RECONCILIATION_FORMULAS.netPieces,
      substitution: `${qty(p.total)} − ${qty(q.total)} = ${qty(f.netPieces)} piezas`,
    },
    netUsd: {
      general: RECONCILIATION_FORMULAS.netUsd,
      substitution: valued
        ? `${qty(f.netPieces)} × $${precision(m.unitCost)} = ${usd(f.netUsd)}`
        : "Sin costo confiable: se conservan las piezas y no se valida un USD 0.",
    },
    swing: {
      general: RECONCILIATION_FORMULAS.swing,
      substitution: valued
        ? `${qty(f.swingPieces)} × $${precision(m.unitCost)} = ${usd(f.swingUsd)}`
        : `${qty(f.swingPieces)} piezas de SWING; sin valorar.`,
    },
    physical: {
      general: RECONCILIATION_FORMULAS.physical,
      substitution: `${qty(p.directTotal)} + ${qty(p.bomContribution)} = ${qty(p.total)} piezas`,
    },
  };
  const outgoing = [
    ...new Set((s.bom?.byParent.get(pn) || []).map((r) => r.componentPart)),
  ].flatMap((part) =>
    (s.phantomAdjustments?.byPart.get(part)?.sources || []).filter(
      (r) => r.parentPart === pn,
    ),
  );
  const contributions = [
    ...incoming.map((r) => ({ ...r, direction: "Recibe" })),
    ...outgoing.map((r) => ({ ...r, direction: "Genera" })),
  ];
  const step = (
    id,
    title,
    search,
    found,
    why,
    result,
    next,
    refs,
    tone = "ok",
  ) => ({ id, title, search, found, why, result, next, refs, tone });
  const steps = [
    step(
      "physical",
      scans.label,
      `PN ${pn}${parentParts.length ? " y padres " + parentParts.join(", ") : ""}`,
      `${qty(p.scannedTotal)} piezas escaneadas del PN; ${p.scanCount} registros.`,
      "Un escaneo todavía no equivale a físico reconocido.",
      p.scanCount ? "Escaneos localizados" : "Sin escaneo directo de este PN",
      "Buscar el área de cada escaneo en el catálogo.",
      [scans],
      p.scanCount ? "ok" : "review",
    ),
    step(
      "mapping",
      "Área → Localidad QAD",
      areaNames.length ? areaNames.join(", ") : "Áreas de los escaneos",
      mappings.length
        ? `${areaNames.length} áreas; localidades: ${[...new Set(mappings.map((r) => r.qadLocation))].join(", ")}.`
        : "Sin escaneos que mapear.",
      "SWING compara localidades QAD, no nombres de área 4Wall.",
      item.flags.hasUnmappedPhysicalLocation
        ? "Hay UNMAPPED; revisar catálogo"
        : "Mapeo del físico disponible",
      "Conservar esta localidad al reconocer directo o explotar BOM.",
      [areas, scans],
      item.flags.hasUnmappedPhysicalLocation || !sources.areas?.loaded
        ? "review"
        : "ok",
    ),
    step(
      "phantom",
      "ISPBB → Phantom",
      `Item Number ${pn} · Site 179A`,
      m.phantomKnown
        ? `Phantom = ${m.isPhantom ? "YES" : "NO"}.`
        : "PN sin definición ISPBB.",
      "Este archivo decide si la pieza es Phantom; no se adivina por el inicio del PN.",
      m.isPhantom
        ? "El escaneo del padre aporta cero directo"
        : m.phantomKnown
          ? "El escaneo aporta físico directo"
          : "El motor conserva directo provisional; requiere revisión",
      "YES busca BOM; NO conserva directo. Revisar también los padres que aportan a este PN.",
      [ispbb],
      m.phantomKnown && sources.ispbb?.loaded ? "ok" : "review",
    ),
    step(
      "bom",
      "BOM / Usage",
      `Parent Item ${pn} o padres que generan ${pn}`,
      `${qty(p.bomContribution)} piezas recibidas; ${outgoing.length} aportaciones generadas a componentes.`,
      "Usage transforma escaneos del padre en componentes; la localidad se hereda.",
      item.flags.missingBom
        ? "Falta BOM"
        : item.flags.emptyBom
          ? "BOM existe sin filas aplicables"
          : contributions.length
            ? "Componentes calculados con el BOM válido"
            : "Sin aportación BOM calculada",
      "Sumar solo las aportaciones del motor al físico directo reconocido.",
      [bom, ispbb, scans],
      item.flags.missingBom || item.flags.emptyBom ? "review" : "ok",
    ),
    step(
      "recognized",
      "Físico reconocido",
      "Directo aceptado + aportaciones de componentes",
      formulas.physical.substitution,
      "El NET usa físico reconocido, no el total bruto del escaneo.",
      `${qty(p.total)} piezas físicas reconocidas`,
      "Comparar este total y sus localidades contra QAD.",
      [scans, bom],
    ),
    step(
      "qad",
      qad.label,
      `Item Number ${pn} · 179A · PP/MP/FP`,
      `${qty(q.total)} piezas; ${q.locations.size} localidades.`,
      "El congelado es la base esperada. Un Phantom con saldo QAD abre alerta; no se reescribe a cero.",
      item.flags.qadPresent
        ? "PN presente en el QAD aceptado"
        : "PN ausente del QAD aceptado",
      "Conservar total y localidades para NET y SWING.",
      [qad],
      sources.qad?.loaded && !item.flags.phantomQadBalance ? "ok" : "review",
    ),
    step(
      "cost",
      "Cost Part / Status",
      `Item Number ${pn} · Cost Total · Status`,
      `${valued ? usd(m.unitCost) : "Sin costo confiable"} · ${m.costStatus || "Sin Status"}.`,
      "Valora piezas en USD y define obsolescencia; usa precisión original.",
      valued
        ? item.flags.zeroCost
          ? "Costo cero: revisar"
          : "Costo válido del motor"
        : m.costState === "CONFLICT"
          ? "Costos contradictorios"
          : m.costState === "INVALID"
            ? "Costo inválido"
            : "Costo no disponible",
      "Usar el mismo costo en NET y cada localidad de SWING.",
      [cost],
      valued && !item.flags.zeroCost ? "ok" : "review",
    ),
    step(
      "net",
      "NET · diferencia total",
      "Físico reconocido − QAD congelado",
      formulas.netPieces.substitution,
      "Conserva el signo. Durante el conteo, una diferencia no es una pérdida final confirmada.",
      valued ? usd(f.netUsd) : "Sin valorar",
      "Revisar distribución por localidad aunque NET sea cero.",
      [scans, bom, qad, cost],
      valued ? "ok" : "review",
    ),
    step(
      "swing",
      "SWING · localidad por localidad",
      "ABS(físico − QAD) en cada localidad",
      `${qty(f.swingPieces)} piezas; ${valued ? usd(f.swingUsd) : "sin valorar"}.`,
      "Suma todas las diferencias absolutas. No se divide entre 2 ni confirma un traslado.",
      f.swingPieces
        ? "Distribución distinta: por investigar"
        : "Sin diferencia por localidad",
      "Combinar resultado financiero y alertas sin duplicar NET.",
      [scans, areas, bom, qad, cost],
      f.swingPieces ? "review" : "ok",
    ),
    step(
      "final",
      "Clasificación y alertas",
      "Resultado y advertencias de las reglas del reconciliador",
      `${status}. ${alertLabels.length} advertencias del motor.`,
      "Las etiquetas explican el caso; no vuelven a sumar su impacto.",
      complete ? status : "Caso parcial · " + status,
      "Investigar las fuentes señaladas y volver a conciliar.",
      [ispbb, bom, cost, qad],
      !complete || alertLabels.length || f.netPieces || f.swingPieces
        ? "review"
        : "ok",
    ),
  ];
  const physicalRefs =
    incoming.length || m.isPhantom ? [scans, ispbb, bom] : [scans, ispbb];
  const financialRefs = [...physicalRefs, qad, cost];
  const swingRefs = [...physicalRefs, areas, qad, cost];
  const metric = (
    id,
    label,
    value,
    explanation,
    refs,
    stepId,
    warning = "",
    calculation = [],
  ) => ({ id, label, value, explanation, refs, stepId, warning, calculation });
  const summaryDetails = [
    metric(
      "physical",
      "Físico (Physical)",
      qty(p.total),
      `Sale de ${scans.label}: ${qty(p.scannedTotal)} piezas escaneadas de este PN. El sistema reconoce ${qty(p.directTotal)} directamente y recibe ${qty(p.bomContribution)} mediante BOM. ISPBB decide qué escaneos aportan directo.`,
      physicalRefs,
      "recognized",
      !sources.ispbb?.loaded || !m.phantomKnown
        ? "Phantom pendiente: físico provisional"
        : "",
      [formulas.physical],
    ),
    metric(
      "qad",
      "QAD congelado",
      qty(q.total),
      `Suma de Quantity On Hand de las filas aceptadas en ${qad.identity}. Solo planta 179A y tipos PP / MP / FP. ${item.flags.qadPresent ? "El PN está en este archivo." : "No se encontró el PN en las filas aceptadas."} No es el inventario actualizado en vivo.`,
      [qad],
      "qad",
      !sources.qad?.loaded ? "Falta el archivo QAD" : "",
    ),
    metric(
      "cost",
      "Costo",
      valued ? usd(m.unitCost) : "Sin valorar",
      valued
        ? `Sale de Cost Total en ${cost.identity}. El motor usa $${precision(m.unitCost)} por pieza. El resumen lo redondea a dos decimales; calcular a mano con ese redondeo puede cambiar el importe final.`
        : "Cost Part no aporta un costo confiable para este PN. No se presenta USD 0 como si la diferencia no costara nada.",
      [cost],
      "cost",
      !valued ? "Revisar Cost Part" : item.flags.zeroCost ? "Costo cero" : "",
    ),
    metric(
      "net",
      "NET USD",
      valued ? usd(f.netUsd) : "Sin valorar",
      "Compara el físico reconocido total con el QAD congelado total y multiplica esa diferencia por el costo original de Cost Part. Conserva el signo: negativo es menor físico; positivo es mayor físico. Durante el conteo es una diferencia por revisar.",
      financialRefs,
      "net",
      !complete ? "Resultado provisional" : "",
      [formulas.netPieces, formulas.netUsd],
    ),
    metric(
      "swing",
      "SWING USD",
      valued ? usd(f.swingUsd) : "Sin valorar",
      "Compara físico y QAD en cada localidad, toma cada diferencia sin signo y suma sus importes usando el costo original. Mide cuánto difieren los saldos locales; no afirma cuántas piezas se trasladaron ni se suma al NET como otra pérdida.",
      swingRefs,
      "swing",
      item.flags.hasUnmappedPhysicalLocation || item.flags.hasInvalidQadLocation
        ? "Localidades por confirmar"
        : !complete
          ? "Resultado provisional"
          : "",
      [formulas.swing],
    ),
    metric(
      "phantom",
      "Phantom",
      m.phantomKnown ? (m.isPhantom ? "Sí" : "No") : "Desconocido",
      m.phantomKnown
        ? "Sale del campo Phantom de ISPBB para la planta 179A. YES significa que el padre se convierte en componentes con BOM; NO permite reconocer sus escaneos directamente."
        : "No hay una definición aceptada de este PN en ISPBB para 179A. Desconocido no significa NO: revisa el archivo y su planta antes de confirmar el físico.",
      [ispbb],
      "phantom",
      !m.phantomKnown ? "Falta definición del PN" : "",
    ),
    metric(
      "obsolete",
      "Obsoleto",
      s.costs?.byPart.has(pn) ? (m.isObsolete ? "Sí" : "No") : "Desconocido",
      "Sale de Status en Cost Part. Solo el estado OBSOLETE activa esta etiqueta; no se deduce de ISPBB ni del número de parte.",
      [cost],
      "cost",
      !s.costs?.byPart.has(pn) ? "No hay registro Cost Part" : "",
    ),
    metric(
      "unexpected",
      "Material inesperado",
      item.flags.isUnexpectedMaterial ? "Sí" : "No",
      "La regla del motor marca material inesperado cuando QAD total es cero y el físico reconocido es mayor que cero. Revisa ambas fuentes: un QAD faltante también puede volver provisional esta lectura.",
      [...physicalRefs, qad],
      "final",
      !sources.qad?.loaded ? "QAD pendiente" : "",
    ),
    metric(
      "missingBom",
      "Falta BOM",
      item.flags.missingBom ? "Sí" : "No",
      item.flags.missingBom
        ? "ISPBB define un padre escaneado como Phantom y no se encontró su BOM."
        : item.flags.emptyBom
          ? "Existe BOM, pero no tiene filas que cumplan Level .2 / 0.2, Comp Phantom NO y Usage válido."
          : !m.phantomKnown
            ? "El motor no activó esta alerta. Primero hay que confirmar Phantom en ISPBB; este No no valida que el PN tenga el BOM correcto."
            : "El motor no detectó un padre Phantom escaneado sin BOM. Para el directo de un PN que no es Phantom, BOM no es obligatorio.",
      [ispbb, bom, scans],
      "bom",
      item.flags.missingBom || item.flags.emptyBom || !m.phantomKnown
        ? "Revisar definición y BOM"
        : "",
    ),
  ];
  const warnings = [];
  const warn = (condition, id, title, detail, refs, stepId) => {
    if (condition) warnings.push({ id, title, detail, refs, stepId });
  };
  warn(
    !complete,
    "sources",
    "Faltan fuentes del caso",
    `Falta: ${requiredMissing.map(([, label]) => label).join(", ")}. Los ceros y el resultado pueden cambiar al cargarlas.`,
    requiredMissing.map(
      ([key]) => ({ scans, areas, ispbb, bom, qad, cost })[key],
    ),
    "physical",
  );
  warn(
    !m.phantomKnown,
    "planning",
    "Phantom desconocido",
    "ISPBB no tiene una definición aceptada para este PN en 179A; el físico conservado requiere confirmación.",
    [ispbb, scans],
    "phantom",
  );
  warn(
    item.flags.missingBom || item.flags.emptyBom,
    "bom",
    item.flags.missingBom ? "Falta BOM" : "BOM sin filas aplicables",
    "Revisa el padre, Usage, Level .2 / 0.2 y Comp Phantom NO. No se inventan componentes faltantes.",
    [bom, ispbb, scans],
    "bom",
  );
  warn(
    !valued || item.flags.zeroCost,
    "cost",
    valued ? "Costo cero" : "Costo por revisar",
    summaryDetails.find((r) => r.id === "cost").explanation,
    [cost],
    "cost",
  );
  warn(
    item.flags.hasUnmappedPhysicalLocation || item.flags.hasInvalidQadLocation,
    "mapping",
    "Área o localidad sin confirmar",
    "Una ubicación no se pudo comparar correctamente. Revisa el área del escaneo, su equivalencia y la localidad QAD.",
    [scans, areas, qad],
    "mapping",
  );
  warn(
    item.flags.phantomQadBalance,
    "phantomQad",
    "Phantom con saldo QAD",
    "ISPBB indica Phantom YES, pero el QAD congelado tiene saldo. El reconciliador conserva ese saldo para revisarlo; no lo borra.",
    [ispbb, qad],
    "qad",
  );
  warn(
    item.flags.isMissingPhysical,
    "count",
    "Conteo físico pendiente",
    "Hay saldo QAD y no hay físico reconocido en esta lectura. Puede faltar conteo; no confirma una pérdida.",
    [scans, qad, bom],
    "physical",
  );
  warn(
    item.flags.isUnexpectedMaterial,
    "unexpected",
    "Material inesperado",
    "Hay físico reconocido y QAD total cero. Confirma PN, planta y archivo QAD antes de clasificarlo.",
    [...physicalRefs, qad],
    "final",
  );
  warn(
    f.netPieces !== 0,
    "net",
    "Diferencia total",
    `${formulas.netPieces.substitution}. ${valued ? formulas.netUsd.substitution : "Todavía sin valorar."}`,
    financialRefs,
    "net",
  );
  warn(
    f.swingPieces > 0,
    "swing",
    "Diferencias por localidad",
    `${formulas.swing.substitution}. Revisa el desglose por localidad; no demuestra un traslado.`,
    swingRefs,
    "swing",
  );
  const coveredFindingCodes = new Set([
    "MISSING_BOM",
    "EMPTY_BOM",
    "PHANTOM_QAD",
    "ZERO_COST",
    "QTY_DIFF",
    "NO_PHYSICAL",
    "UNEXPECTED",
    "LOCATION_CANDIDATE",
    "UNVALUED",
    "UNMAPPED_AREA",
  ]);
  const extraFindings = pnFindings.filter(
    (finding) => !coveredFindingCodes.has(finding.ruleCode),
  );
  for (const finding of extraFindings) {
    const refs =
      finding.ruleCode === "BOM_REVIEW"
        ? [bom, ispbb, scans, qad]
        : financialRefs;
    warnings.push({
      id: finding.id || finding.ruleCode,
      title: finding.tags?.[0] || "Hallazgo por revisar",
      detail: `${finding.whatFound} ${finding.possibleExplanation ? "Posible explicación: " + finding.possibleExplanation : ""}${finding.ruleCode === "UNUSUAL_CHANGE" ? " La copia anterior no está en este visor; las fuentes de abajo son las actuales." : ""}`,
      refs,
      stepId: finding.ruleCode === "BOM_REVIEW" ? "bom" : "final",
    });
  }
  const actionPlan = [];
  const action = (condition, id, title, detail, refs, stepId) => {
    if (condition) actionPlan.push({ id, title, detail, refs, stepId });
  };
  action(
    !complete,
    "sources",
    "Completar las fuentes",
    "Carga los archivos faltantes y confirma que el QAD congelado corresponda al inventario que estás revisando.",
    warnings.find((r) => r.id === "sources")?.refs || [],
    "physical",
  );
  action(
    !m.phantomKnown || item.flags.phantomQadBalance,
    "planning",
    "Confirmar Phantom en ISPBB",
    "Busca el PN en ISPBB de 179A. Si no existe o conserva saldo QAD siendo Phantom, confirma la definición con el responsable; no cambies el saldo para forzar un resultado.",
    [ispbb, qad],
    "phantom",
  );
  action(
    item.flags.hasUnmappedPhysicalLocation || item.flags.hasInvalidQadLocation,
    "mapping",
    "Confirmar las localidades",
    "Compara AreaName con el catálogo de áreas y su Localidad QAD. Corrige la fuente confirmada antes de interpretar SWING.",
    [scans, areas, qad],
    "mapping",
  );
  action(
    item.flags.missingBom || item.flags.emptyBom,
    "bom",
    "Revisar el BOM del padre",
    "Pide o revisa el BOM de ese PN, su Usage y las filas elegibles. Reimporta el archivo confirmado; no uses cantidades supuestas.",
    [bom, ispbb, scans],
    "bom",
  );
  action(
    !valued || item.flags.zeroCost,
    "cost",
    "Confirmar el costo original",
    "Revisa Cost Total, Status y duplicados en Cost Part. Confirma el costo con el departamento antes de valorar la diferencia.",
    [cost],
    "cost",
  );
  action(
    f.netPieces !== 0 || item.flags.isMissingPhysical,
    "count",
    "Revisar el conteo del PN",
    "Confirma si las áreas ya terminaron el conteo, revisa los tickets y cantidades originales y valida cualquier repetición antes de corregirla. El NET actual no prueba una pérdida final.",
    [...physicalRefs, qad],
    "recognized",
  );
  action(
    f.swingPieces > 0,
    "locations",
    "Comparar localidad por localidad",
    "Localiza los saldos que difieren en la tabla de SWING y confirma la ubicación con evidencia operativa. Solo ajusta un registro o movimiento cuando se haya comprobado; una compensación no demuestra un traslado.",
    swingRefs,
    "swing",
  );
  action(
    m.isObsolete,
    "obsolete",
    "Confirmar el estado obsoleto",
    "Revisa Status en Cost Part y confirma con el departamento el tratamiento del material; la etiqueta no autoriza un ajuste.",
    [cost],
    "cost",
  );
  for (const finding of extraFindings)
    action(
      Boolean(finding.nextAction),
      finding.id || finding.ruleCode,
      finding.tags?.[0] || "Revisar el hallazgo",
      finding.nextAction,
      finding.ruleCode === "BOM_REVIEW"
        ? [bom, ispbb, scans, qad]
        : financialRefs,
      finding.ruleCode === "BOM_REVIEW" ? "bom" : "final",
    );
  action(
    true,
    "verify",
    actionPlan.length
      ? "Volver a comparar después de validar"
      : "Confirmar que el caso está completo",
    actionPlan.length
      ? "Después de corregir las fuentes confirmadas, vuelve a calcular y verifica NET, SWING y advertencias. Esto es un plan de revisión; no ejecuta ajustes ni movimientos."
      : "Verifica que las fuentes correspondan al mismo inventario y que el conteo haya concluido. Un balance de esta lectura no confirma por sí solo el cierre.",
    [scans, qad, cost],
    "final",
  );
  const swingExplanation =
    "SWING no se divide entre dos porque mide la suma de las diferencias de cada localidad, no las piezas de un traslado. Si una localidad tiene sobrante y otra faltante, ambas diferencias participan. Dividir entre dos reduciría esa métrica. NET compara totales; SWING compara ubicaciones. No se suman como dos pérdidas distintas.";
  const conclusion = [
    complete
      ? "Resultado del corte actual."
      : `Caso parcial: falta ${requiredMissing.map(([, label]) => label).join(", ")}. Los resultados son provisionales.`,
    `La pieza tiene ${qty(p.total)} unidades físicas reconocidas contra ${qty(q.total)} en QAD; diferencia de ${qty(f.netPieces)} piezas.`,
    valued
      ? `El NET es ${usd(f.netUsd)} y el SWING es ${usd(f.swingUsd)}, suma absoluta por localidad sin dividir entre dos.`
      : "El NET y SWING en USD no están valorados porque falta un costo confiable.",
    valued
      ? `NET viene de ${scans.label}${incoming.length ? " + componentes BOM" : ""}, ${qad.label} (${qad.identity}) y Cost Part (${cost.identity}): ${formulas.netUsd.substitution}. Costo original: $${precision(m.unitCost)}; el resumen lo redondea a dos decimales.`
      : "",
    `SWING usa esas mismas fuentes, el catálogo de áreas y las localidades detalladas: ${formulas.swing.substitution}.`,
    swingExplanation,
    m.phantomKnown
      ? m.isPhantom
        ? `ISPBB define Phantom YES: sus ${qty(p.scannedTotal)} piezas escaneadas no aportan directo al padre; BOM genera componentes elegibles con Usage.`
        : "ISPBB define Phantom NO; sus escaneos se reconocen directamente."
      : "ISPBB no define este PN; el directo conservado por el motor necesita revisión.",
    incoming.length
      ? `Este PN recibe ${qty(p.bomContribution)} piezas mediante BOM de ${parentParts.join(", ")}, usando Usage y localidad de origen.`
      : "",
    item.flags.isMissingPhysical
      ? "Sin físico registrado durante el conteo no significa pérdida final confirmada."
      : "",
    alertLabels.length ? `Revisar: ${alertLabels.join("; ")}.` : "",
  ].filter(Boolean);
  return {
    pn,
    description: m.description,
    origin: {
      routes: getPartEntryOrigins(item, s).map((origin) => ({
        ...origin,
        label: { scans, qad, bom }[origin.type].label,
        reference: { scans, qad, bom }[origin.type],
        explanation:
          origin.type === "scans"
            ? "Este PN tiene un escaneo aceptado en 4Wall, incluso si la cantidad es cero. ISPBB decide después si ese físico se reconoce directamente."
            : origin.type === "qad"
              ? "Este PN aparece en QAD aceptado por Site 179A y tipo PP / MP / FP, incluso si todavía no hay escaneo."
              : `Este PN fue generado como componente por BOM de ${parentParts.join(", ") || "un padre Phantom"}. No implica que se haya escaneado directamente.`,
      })),
      descriptionReference: descriptionRef,
    },
    readiness,
    complete,
    status,
    steps,
    formulas,
    contributions,
    alertLabels,
    findings: pnFindings,
    conclusion,
    summaryDetails,
    warnings,
    actionPlan,
    swingExplanation,
    inputs,
    snapshotExplanation:
      "Snapshot significa una copia de los escaneos guardada en un momento concreto. En el modo automático, el bot publica esa copia y la app lee sus registros. Al llegar una nueva publicación pueden cambiar los resultados. El archivo manual reemplaza esa lectura; no se suman las dos.",
    summary: [
      ["Physical", qty(p.total)],
      ["QAD", qty(q.total)],
      ["Costo", valued ? usd(m.unitCost) : "Sin valorar"],
      ["NET USD", valued ? usd(f.netUsd) : "Sin valorar"],
      ["SWING USD", valued ? usd(f.swingUsd) : "Sin valorar"],
      ["Phantom", m.phantomKnown ? (m.isPhantom ? "Sí" : "No") : "Desconocido"],
      ["Obsoleto", m.isObsolete ? "Sí" : "No"],
      ["Unexpected", item.flags.isUnexpectedMaterial ? "Sí" : "No"],
      ["Missing BOM", item.flags.missingBom ? "Sí" : "No"],
    ],
  };
}
