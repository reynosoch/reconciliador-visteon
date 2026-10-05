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
      row.__sourceFile || source?.fileName || "Snapshot 4Wall publicado",
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
          letter: columnLetter(
            keys.indexOf(c.column) + (origin.firstColumn || 0),
          ),
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
      label,
      loaded: Boolean(source?.loaded || remote),
      identity: remote
        ? `Snapshot 4Wall de Supabase${snapshotMeta?.snapshotId ? " · " + snapshotMeta.snapshotId : " · ID no disponible"}`
        : files?.length
          ? [...new Set(files)].join(" · ")
          : source?.fileName || "Archivo no disponible",
    };
  });
}

// Called only for the selected PN. Reads normalized parser decisions and engine results;
// it does not recompute NET, SWING, explosions or the financial classification.
export function buildPartLearningTrace({
  item,
  engineSources = {},
  sources = {},
  scanRows = [],
  scanReady = false,
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
    : { rows: scanRows, fileName: "", loaded: scanReady };
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
    "El archivo manual reemplaza al snapshot; nunca se mezclan.",
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
  const readiness = [
    ["scans", "4Wall", Boolean(scannedSource.loaded)],
    ["areas", "Áreas", Boolean(sources.areas?.loaded)],
    ["ispbb", "ISPBB", Boolean(sources.ispbb?.loaded)],
    ["bom", "BOM", Boolean(sources.bom?.loaded)],
    ["qad", "QAD", Boolean(sources.qad?.loaded)],
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
    [!m.hasCost, `Costo ${m.costState}`],
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
      general: "NET piezas = Physical Total − QAD Total",
      substitution: `${qty(p.total)} − ${qty(q.total)} = ${qty(f.netPieces)} piezas`,
    },
    netUsd: {
      general: "NET USD = NET piezas × Unit Cost",
      substitution: valued
        ? `${qty(f.netPieces)} × $${precision(m.unitCost)} = ${usd(f.netUsd)}`
        : "Sin costo confiable: se conservan las piezas y no se valida un USD 0.",
    },
    swing: {
      general:
        "SWING USD = Σ ABS(Physical(localidad) − QAD(localidad)) × Unit Cost",
      substitution: valued
        ? `${qty(f.swingPieces)} × $${precision(m.unitCost)} = ${usd(f.swingUsd)}`
        : `${qty(f.swingPieces)} piezas de SWING; sin valorar.`,
    },
    physical: {
      general: "Physical Total = directo reconocido + aportaciones BOM",
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
      "Físico 4Wall",
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
      "Es la fuente autoritativa; los prefijos no participan.",
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
            ? "Aportaciones calculadas por explodeBom"
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
      "QAD congelado",
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
        : `Costo ${m.costState}`,
      "Usar el mismo costo en NET y cada localidad de SWING.",
      [cost],
      valued && !item.flags.zeroCost ? "ok" : "review",
    ),
    step(
      "net",
      "NET · diferencia total",
      "Physical Total − QAD Total",
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
      "Estado financiero y flags del dominio",
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
  const conclusion = [
    complete
      ? "Resultado del corte actual."
      : `Caso parcial: falta ${requiredMissing.map(([, label]) => label).join(", ")}. Los resultados son provisionales.`,
    `La pieza tiene ${qty(p.total)} unidades físicas reconocidas contra ${qty(q.total)} en QAD; diferencia de ${qty(f.netPieces)} piezas.`,
    valued
      ? `El NET es ${usd(f.netUsd)} y el SWING es ${usd(f.swingUsd)}, suma absoluta por localidad sin dividir entre dos.`
      : "El NET y SWING en USD no están valorados porque falta un costo confiable.",
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
