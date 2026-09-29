const DEFAULT_TOLERANCE = { default: 0, PCS: 0 };
function resolveTolerance(config,item){if(typeof config==="number")return Math.max(0,n(config));const unit=clean(item?.master?.unitOfMeasure)||"default";return Math.max(0,n(config?.[unit]??config?.default??0));}
const DEFAULT_THRESHOLDS = { netPieces: 1000, netUsd: 10000 };

const clean = (value) => String(value ?? "").trim().toUpperCase();
const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function stableId(campaignId, ruleCode, partNumber, locations = []) {
  const loc = [...new Set(locations.map(clean).filter(Boolean))].sort().join("+") || "ALL";
  return [clean(campaignId) || "SIN-CAMPANA", ruleCode, clean(partNumber) || "SIN-PN", loc].join(":");
}
function valuationState(item) {
  const state = item?.master?.costState;
  if (state === "CONFLICT") return "COSTO_CONTRADICTORIO";
  if (state === "INVALID") return "COSTO_INVALIDO";
  if (!item?.master?.hasCost) return "SIN_COSTO";
  return "VALORADO";
}
function countState(item) {
  return ["PENDIENTE","EN_PROCESO","CERRADO"].includes(item?.countState) ? item.countState : "DESCONOCIDO";
}
function validLocation(location) {
  const value = clean(location);
  return Boolean(value) && value !== "UNMAPPED" && value !== "NO_LOCATION";
}
function baseFinding({campaignId,ruleCode,category,item,locations=[],tags=[],whatFound,possibleExplanation,nextAction,evidence=[],locationAnalysis=null}) {
  const valuation = valuationState(item);
  return {
    id: stableId(campaignId, ruleCode, item.partNumber, locations),
    campaignId: clean(campaignId) || "",
    ruleCode,
    category,
    partNumber: item.partNumber,
    locations: [...new Set(locations.map(clean).filter(Boolean))],
    tags: [...new Set(tags)],
    netPieces: n(item.financial?.netPieces),
    netUsd: valuation === "VALORADO" ? n(item.financial?.netUsd) : null,
    valuationState: valuation,
    countState: countState(item),
    evidence,
    locationAnalysis,
    whatFound,
    possibleExplanation,
    nextAction,
    firstDetected: null,
    lastDetected: null,
  };
}
export function buildDiscrepancyFindings({
  reconciliation = [],
  sources = {},
  campaignId = "",
  quantityTolerance = DEFAULT_TOLERANCE,
  previousSnapshot = null,
  snapshotComparable = false,
  unusualThresholds = DEFAULT_THRESHOLDS,
} = {}) {
  const findings = [];

  const byPart = new Map(reconciliation.map((item) => [item.partNumber, item]));

  for (const item of reconciliation) {
    const tolerance = resolveTolerance(quantityTolerance,item);
    const physical = n(item.physical?.total);
    const qad = n(item.qad?.total);
    const netPieces = n(item.financial?.netPieces);
    const costState = valuationState(item);
    const swingRows = item.trace?.swingByLocation || [];
    const mappedRows = swingRows.filter((row) => validLocation(row.location));
    const coverageIncomplete = swingRows.some((row) => !validLocation(row.location)) || item.flags?.hasUnmappedPhysicalLocation;
    const locationsWithDelta = mappedRows.filter((row) => Math.abs(n(row.delta)) > tolerance).map((row) => row.location);

    if (Math.abs(netPieces) > tolerance) {
      findings.push(baseFinding({
        campaignId, ruleCode:"QTY_DIFF", category:"CANTIDAD", item, locations:locationsWithDelta,
        tags:["DIFERENCIA DE CANTIDAD"],
        whatFound:`Físico ${physical} vs QAD ${qad}; diferencia ${netPieces} piezas. Tolerancia aplicada: ±${tolerance}.`,
        possibleExplanation:"Puede corresponder a conteo pendiente, diferencia real o una regla operativa aún no confirmada.",
        nextAction:"Revisar el Part Number y su evidencia por localidad antes de clasificar la diferencia.",
        evidence:[{source:"4Wall",detail:`Físico reconocido: ${physical}`},{source:"QAD 3.2",detail:`Cantidad On Hand: ${qad}`}],
      }));
    }

    if (qad > tolerance && physical <= tolerance) {
      findings.push(baseFinding({
        campaignId, ruleCode:"NO_PHYSICAL", category:"CANTIDAD", item,
        tags:["SIN FÍSICO REGISTRADO"],
        whatFound:`QAD tiene ${qad} piezas y no hay físico reconocido en el corte actual.`,
        possibleExplanation:"El material puede seguir pendiente de conteo. Este hallazgo no confirma una pérdida.",
        nextAction:"Confirmar estado/cierre del conteo y revisar las localidades QAD antes de tratarlo como faltante.",
        evidence:[{source:"QAD 3.2",detail:`Saldo positivo: ${qad}`},{source:"4Wall",detail:"Sin físico registrado en este reporte."}],
      }));
    }

    if (physical > tolerance && qad === 0) {
      const qadKind = item.flags?.qadPresent ? "PN presente en QAD con saldo total cero" : "PN ausente del archivo QAD filtrado";
      findings.push(baseFinding({
        campaignId, ruleCode:"UNEXPECTED", category:"CANTIDAD", item, locations:locationsWithDelta,
        tags:["INESPERADO"],
        whatFound:`Hay ${physical} piezas físicas y QAD total es 0. ${qadKind}.`,
        possibleExplanation:"Puede ser material inesperado, una diferencia de alcance o un registro que requiere validación.",
        nextAction:"Confirmar el PN en QAD, el Site y las localidades antes de clasificarlo.",
        evidence:[{source:"4Wall",detail:`Físico: ${physical}`},{source:"QAD 3.2",detail:qadKind}],
      }));
    }

    const positives = mappedRows.filter((row) => n(row.delta) > tolerance);
    const negatives = mappedRows.filter((row) => n(row.delta) < -tolerance);
    const surplus = positives.reduce((sum,row)=>sum+n(row.delta),0);
    const shortage = negatives.reduce((sum,row)=>sum+Math.abs(n(row.delta)),0);
    const compensable = Math.min(surplus, shortage);
    if (surplus > 0 && shortage > 0) {
      const candidateLocations = [...positives,...negatives].map((row)=>row.location);
      findings.push(baseFinding({
        campaignId, ruleCode:"LOCATION_CANDIDATE", category:"UBICACION", item, locations:candidateLocations,
        tags:["POSIBLE UBICACIÓN", ...(coverageIncomplete?["COBERTURA INCOMPLETA"]:[])],
        whatFound:`Hay sobrantes locales por ${surplus} piezas y faltantes locales por ${shortage}. Hasta ${compensable} piezas son potencialmente compensables entre localidades.`,
        possibleExplanation:"La distribución por localidad merece revisión; esto no demuestra un traslado y no modifica NET ni SWING.",
        nextAction:"Comparar las localidades candidatas y confirmar el movimiento/ubicación con una fuente operativa válida.",
        evidence:mappedRows.filter((row)=>Math.abs(n(row.delta))>tolerance).map((row)=>({source:"4Wall vs QAD",detail:`${row.location}: físico ${n(row.physicalQty)}, QAD ${n(row.qadQty)}, delta ${n(row.delta)}`})),
        locationAnalysis:{surplus,shortage,compensable,coverageIncomplete,rows:mappedRows.filter((row)=>Math.abs(n(row.delta))>tolerance).map((row)=>({location:row.location,physicalQty:n(row.physicalQty),qadQty:n(row.qadQty),delta:n(row.delta)}))},
      }));
    }

    if (costState !== "VALORADO" && (Math.abs(netPieces) > tolerance || n(item.financial?.swingPieces) > tolerance)) {
      findings.push(baseFinding({
        campaignId, ruleCode:"UNVALUED", category:"SIN_VALORAR", item, locations:locationsWithDelta,
        tags:["SIN VALORAR"],
        whatFound:"Existe una diferencia en piezas, pero no hay un costo confiable para convertirla a dinero.",
        possibleExplanation: costState === "COSTO_CONTRADICTORIO" ? "Cost Part contiene filas contradictorias para el PN." : costState === "COSTO_INVALIDO" ? "Cost Total está vacío o no es numérico." : "No se encontró un costo válido para el PN.",
        nextAction:"Revisar el costo en Cost Part antes de calcular la diferencia en dólares.",
        evidence:[{source:"Cost Part",detail:`Estado de valoración: ${costState}`}],
      }));
    }

    if (item.flags?.hasUnmappedPhysicalLocation || item.flags?.hasInvalidQadLocation) {
      const badRows = swingRows.filter((row)=>!validLocation(row.location));
      findings.push(baseFinding({
        campaignId, ruleCode:"UNMAPPED_AREA", category:"CALIDAD", item, locations:badRows.map((row)=>row.location),
        tags:["ÁREA / LOCALIDAD SIN MAPEO"],
        whatFound:"Parte del físico o del detalle QAD no tiene una localidad válida para comparar.",
        possibleExplanation:"El área puede no existir en el diccionario o existir con Localidad QAD vacía.",
        nextAction:"Corregir/confirmar el diccionario de áreas antes de interpretar la distribución por localidad.",
        evidence:[{source:"4Wall-Area",detail:`Áreas observadas: ${(item.physical?.areas||[]).join(", ") || "sin nombre"}`}],
      }));
    }

    if (item.flags?.hasBomReference && Math.abs(netPieces) > tolerance) {
      const refs = item.trace?.bomReferences || [];
      const evidence = refs.slice(0,8).map((ref)=>{
        const parent = byPart.get(ref.parentPart);
        const parentEvidence = parent ? `padre físico ${n(parent.physical?.directTotal)}; escaneos ${n(parent.physical?.scanCount)}` : "padre sin evidencia en la conciliación actual";
        return {source:"BOM",detail:`Padre ${ref.parentPart} → ${item.partNumber}; nivel ${ref.rawLevel || ref.level || "?"}; Usage ${n(ref.usage)}; Site ${ref.site || "?"}; ${parentEvidence}`};
      });
      findings.push(baseFinding({
        campaignId, ruleCode:"BOM_REVIEW", category:"CALIDAD", item,
        tags:["REVISAR BOM"],
        whatFound:"El PN con diferencia aparece como componente en el BOM cargado.",
        possibleExplanation:"La relación BOM sirve como pista de investigación. Una coincidencia por sí sola no crea físico ni ajusta el NET.",
        nextAction:"Revisar relación, nivel, Site, Usage y evidencia real del padre antes de cualquier ajuste.",
        evidence,
      }));
    }
  }

  if (snapshotComparable && previousSnapshot?.parts) {
    const previous = new Map(previousSnapshot.parts.map((p)=>[p.partNumber,p]));
    for (const item of reconciliation) {
      const old = previous.get(item.partNumber);
      if (!old) continue;
      const pieceChange = n(item.financial?.netPieces) - n(old.netPieces);
      const currentUsd = item.master?.hasCost ? n(item.financial?.netUsd) : null;
      const usdChange = currentUsd === null || old.netUsd === null ? null : currentUsd - n(old.netUsd);
      if (Math.abs(pieceChange) >= n(unusualThresholds.netPieces) || (usdChange !== null && Math.abs(usdChange) >= n(unusualThresholds.netUsd))) {
        findings.push(baseFinding({
          campaignId, ruleCode:"UNUSUAL_CHANGE", category:"CAMBIO", item,
          tags:["CAMBIO INUSUAL"],
          whatFound:`Cambio contra corte comparable: ${pieceChange} piezas${usdChange===null?"":`; ${usdChange.toLocaleString("en-US",{style:"currency",currency:"USD"})}`}.`,
          possibleExplanation:"Supera un criterio configurable de revisión; no implica duplicación ni error por sí solo.",
          nextAction:"Comparar los reportes y revisar si hubo un nuevo conteo o una corrección.",
          evidence:[{source:"Historial",detail:`Criterio de revisión: |Δ piezas| ≥ ${n(unusualThresholds.netPieces)} o |Δ USD| ≥ ${n(unusualThresholds.netUsd)}.`}],
        }));
      }
    }
  }

  return findings.sort((a,b)=>{
    if (a.valuationState === "VALORADO" && b.valuationState !== "VALORADO") return -1;
    if (b.valuationState === "VALORADO" && a.valuationState !== "VALORADO") return 1;
    return Math.abs(n(b.netUsd)) - Math.abs(n(a.netUsd));
  });
}

export function groupFindingsByPart(findings = []) {
  const map = new Map();
  for (const finding of findings) {
    if (!map.has(finding.partNumber)) map.set(finding.partNumber,{partNumber:finding.partNumber,netUsd:finding.netUsd,netPieces:finding.netPieces,tags:[],locations:[],findings:[]});
    const row=map.get(finding.partNumber);
    row.findings.push(finding);
    row.tags=[...new Set([...row.tags,...finding.tags])];
    row.locations=[...new Set([...row.locations,...finding.locations])];
    if (row.netUsd === null && finding.netUsd !== null) row.netUsd=finding.netUsd;
  }
  return [...map.values()].sort((a,b)=>Math.abs(n(b.netUsd))-Math.abs(n(a.netUsd)));
}

export function buildSnapshot({campaignId="",rows=[],references=[],rulesVersion="",snapshotMeta=null,valid=false}={}) {
  return {
    id: snapshotMeta?.snapshotId || snapshotMeta?.consistencyToken || String(Date.now()),
    campaignId: clean(campaignId),
    rulesVersion,
    valid:Boolean(valid),
    savedAt:new Date().toISOString(),
    snapshotMeta,
    references,
    parts:rows.map((item)=>({partNumber:item.partNumber,netPieces:n(item.financial?.netPieces),netUsd:item.master?.hasCost?n(item.financial?.netUsd):null,swingPieces:n(item.financial?.swingPieces)})),
  };
}

export function snapshotsComparable(previous,current) {
  if (!previous || !current) return {ok:false,reason:"No existe un corte anterior."};
  if (!previous.valid || !current.valid) return {ok:false,reason:"Faltan datos completos en uno de los reportes."};
  if (!previous.campaignId || previous.campaignId !== current.campaignId) return {ok:false,reason:"Los resultados pertenecen a inventarios diferentes."};
  if (previous.rulesVersion !== current.rulesVersion) return {ok:false,reason:"Cambió la forma de calcular los resultados."};
  const oldRefs=new Map((previous.references||[]).map((r)=>[r.type,r.fingerprint]));
  const same=(current.references||[]).every((r)=>r.fingerprint && oldRefs.get(r.type)===r.fingerprint);
  if (!same) return {ok:false,reason:"Los archivos de referencia cambiaron."};
  if (previous.snapshotMeta?.complete !== true || current.snapshotMeta?.complete !== true) return {ok:false,reason:"No sabemos si se descargó el reporte completo."};
  return {ok:true,reason:""};
}
