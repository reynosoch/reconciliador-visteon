import { buildPartLearningTrace } from "./partLearningTrace.js";
import { getMykeCasualIntent, normalizeMykeLanguage } from "../../supabase/functions/myke-chat/public-question.mjs";
import { normalizeText } from "./normalize.js";

// Knowledge comes from documents; piece replies consume the existing domain trace.
const normalize = normalizeMykeLanguage;
const stopWords = new Set(
  "que como cual cuales donde viene vienen sale salen por para los las del una uno con hay ese esa esto esta este quiero saber dime puede puedes tiene tengo porque significa explica explicame funciona sobre todo todos cuando hace hacer un el la de en y o es se me mi al a si no".split(
    " ",
  ),
);
export const mykeSearchWords = (value) =>
  normalize(value)
    .match(/[a-z0-9]+/g)
    ?.filter((word) => !stopWords.has(word)).map(word=>({costos:"costo",costs:"cost",coste:"costo",obsoletos:"obsoleto",usos:"usage",bruta:"gross",brutas:"gross"}[word] || word)) || [];

const clean = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9.$/ _-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP_PART_TOKENS = new Set([
  "4WALL",
  "QAD",
  "ISPBB",
  "SWING",
  "PHANTOM",
  "PHANTOMS",
  "SNAPSHOT",
  "BOM",
  "COST",
  "QUE",
  "LOS",
  "DEL",
  "POR",
  "CON",
  "SON",
  "MIS",
  "ESA",
  "ESTA",
  "PIEZA",
  "NUMERO",
  "PART",
  "NUMBER",
  "LISTA",
  "NUMEROS",
  "PN",
  ...[...stopWords].map((word) => word.toUpperCase()),
]);

export function extractPartNumber(message) {
  const normalized = clean(message);
  const explicit = normalized.match(
    /\b(?:PN|PART NUMBER|NUMERO DE PARTE)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]*)\b/,
  );
  if (explicit?.[1] && !STOP_PART_TOKENS.has(explicit[1])) return explicit[1];
  const candidates = normalized.match(/\b[A-Z0-9][A-Z0-9._/-]{4,}\b/g) || [];
  return (
    candidates.find(
      (token) =>
        /\d/.test(token) && /[A-Z]/.test(token) && !/\.(?:M?JS|JSX|TSX?)$/.test(token) && !STOP_PART_TOKENS.has(token),
    ) || ""
  );
}

const casualReplies = {
  greeting:["Qué rollo. Aquí ando. Pásame un PN, una diferencia o dime qué parte del corte quieres revisar.","Qué onda. Podemos revisar las pérdidas, SWING, Phantom o lo que te esté brincando del corte.","Aquí ando. ¿Revisamos una pieza o cómo va el corte?"],
  presence:["Aquí sigo. Dime qué estás viendo y lo revisamos.","Presente. Pásame un PN o dime qué te brinca del corte."],
  thanks:["Va. Si algo más te brinca, seguimos por ahí.","Sale. Aquí sigo para la siguiente pieza."],
  acknowledge:["Arre. Seguimos cuando quieras.","Va. Pásame lo siguiente que quieras revisar."],
};
const casualCursor = new Map();
export function buildMykeCasualAnswer(intent) {
  const pool=casualReplies[intent] || casualReplies.presence;
  const cursor=casualCursor.get(intent) || 0;
  casualCursor.set(intent,(cursor+1)%pool.length);
  return {kind:'casual',intent,paragraphs:[pool[cursor]],topicIds:[]};
}

export function answerMyke(
  question,
  organization,
  previousTopicIds = [],
  partNumbers = [],
) {
  const input = normalize(question).trim();
  const tokens = [...new Set(mykeSearchWords(input))];
  const pn =
    partNumbers.find((part) => part === normalizeText(question)) ||
    extractPartNumber(question) ||
    (/^\d{3,}$/.test(input) ? input : "") ||
    String(question).match(/\b(?:pieza|parte)\s+(\d{4,})\b/i)?.[1];
  const casual=getMykeCasualIntent(question);
  if(casual)return buildMykeCasualAnswer(casual);
  const questionKey = (value) =>
    normalize(value)
      .replace(/[¿?¡!]/g, "")
      .trim();
  const suggested = organization.topics.find(
    (topic) => questionKey(topic.title) === questionKey(question),
  );
  if (suggested)
    return { kind: "answer", paragraphs: [], topicIds: [suggested.id] };
  const ranked = organization.topics
    .map((topic, index) => ({
      topic,
      index,
      score: tokens.reduce(
        (sum, token) =>
          sum +
          (topic.keywords.includes(token)
            ? organization.topics.filter((other) =>
                other.keywords.includes(token),
              ).length === 1
              ? 4
              : 1
            : 0),
        0,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let matches = ranked
    .filter((entry) => entry.score >= Math.max(2, ranked[0]?.score * 0.55))
    .slice(0, 3)
    .map((entry) => entry.topic);
  if (!matches.length && ranked[0]?.score > 0) matches = [ranked[0].topic];
  if (
    !matches.length &&
    /^(y |mas |otro |otra |explica|detall|ejemplo|continua)/.test(input)
  )
    matches = previousTopicIds
      .map((id) => organization.topics.find((topic) => topic.id === id))
      .filter(Boolean)
      .slice(0, 2);
  if (pn)
    return {
      kind: "piece",
      paragraphs: [
        `Revisemos ${pn.toUpperCase()} en los datos cargados. Las cifras de abajo vienen del motor; no de los números escritos en tu pregunta.`,
      ],
      topicIds: matches.map((topic) => topic.id),
      pn: pn.toUpperCase(),
    };
  if (matches.length)
    return {
      kind: "answer",
      paragraphs: [],
      topicIds: matches.map((topic) => topic.id),
    };
  return {
    kind: "unknown",
    paragraphs: [
      "No encuentro una respuesta respaldada para esa pregunta en mi ayuda local. Puedo explicar el motor, archivos, Phantom, NET, SWING, alertas, bot y funcionamiento del código. Prueba indicando uno de esos temas o elige una pregunta frecuente.",
      "Para revisar un error concreto, usa Reportar con el mensaje y el área afectada. No compartas claves ni contraseñas.",
    ],
    topicIds: [],
  };
}

// Only builds evidence for the requested PN. No alternate calculation engine.
export function buildMykePartAnswer(
  pn,
  { reconciliation = [], ...context } = {},
) {
  const item = reconciliation.find(
    (row) => row.partNumber === normalizeText(pn),
  );
  if (!item)
    return {
      found: false,
      pn: normalizeText(pn),
      explanation: `No encuentro ${normalizeText(pn)} en el corte actual. Puede faltar una fuente, el PN puede no estar en 4Wall/QAD o la copia del corte estar incompleta. Un PN que solo está en Cost Part o ISPBB no entra por sí solo a la lista. Abre Fuentes para confirmar archivos y escaneos.`,
    };
  const trace = buildPartLearningTrace({ item, ...context });
  return {
    found: true,
    pn: trace.pn,
    description: trace.description,
    status: trace.status,
    complete: trace.complete,
    metrics: trace.summaryDetails,
    origins: trace.origin.routes,
    explanation: trace.conclusion.slice(0, 3).join(" "),
    warnings: trace.warnings,
    actions: trace.actionPlan,
  };
}

// Intent and live evidence extend retrieval; they never re-run reconciliation.
export function getMykeIntent(question) {
  const text = normalize(question);
  if (/(?:no (?:funciona|abre|deja|carga|sirve|responde)|se (?:congela|traba|cierra)|pantalla (?:blanca|negra)|bug|error de|boton.*(?:falla|roto)|sale.*error|error (?:al|cuando)|falla|failed to|descuadr|se rompe)/.test(text)) return "bug";
  if (/(?:archivo.*(?:falta|necesito)|(?:falta|faltan).*archivo|fuente.*(?:falta|pendiente))/.test(text)) return "sources";
  if (/(?:como vamos|resum|para la junta|estado (?:actual|del corte))/.test(text)) return "summary";
  if (/(?:revisar(?:ias|ia)?|reviso|prioridad|primero|requieren atencion|esto esta raro|tanta diferencia|much[ao] diferencia|sale.*diferencia|por que.*diferencia)/.test(text)) return "attention";
  if (/(?:facil|sencillo|sin tecnic|no entiendo|no entendi)/.test(text)) return "simple";
  if (/(?:despues|siguiente paso)/.test(text)) return "next";
  return "knowledge";
}
const formatUSD = (value) => Number.isFinite(value) ? new Intl.NumberFormat("en-US", {style:"currency", currency:"USD"}).format(value) : "sin valorar";
export function buildMykeLiveAnswer(intent, context = {}) {
  const { sources = {}, scanReady = false, snapshotMeta, reconciliation = [], summary, findings = [], diagnostics, botRunning = false } = context;
  const sourceTypes = ["scans", "qad", "areas", "ispbb", "bom", "cost"];
  const labels = {scans:"Escaneos 4Wall",qad:"QAD congelado",areas:"Áreas 4Wall",ispbb:"ISPBB",bom:"BOM",cost:"Cost Part"};
  const missing = sourceTypes.filter((type) => !sources[type]?.loaded && !(type === "scans" && scanReady));
  const incomplete = missing.length > 0 || (!sources.scans?.loaded && snapshotMeta?.complete !== true) || context.loading || Boolean(context.error);
  const warning = incomplete ? "El corte está incompleto o en actualización. Estas cifras son provisionales; no confirman una pérdida final." : "Las fuentes del corte están disponibles. El conteo todavía debe validarse con el equipo de inventario.";
  const facts = [warning];
  if (missing.length) facts.push(`Faltan: ${missing.map((type) => labels[type]).join(", ")}.`);
  if (context.error) facts.push("La actualización tiene un problema. Abre el estado de datos antes de interpretar resultados.");
  if (intent === "sources") {
    facts.push(missing.length ? "Carga esos archivos en Fuentes; no sustituyas ISPBB ni el costo por el nombre de la pieza." : "No detecto archivos pendientes. Si una pieza falla, revisa sus filas, costos y relaciones BOM en el trazador.");
    return {kind:"live", paragraphs:facts, topicIds:[], sources:sourceTypes, actions:[{label:"Abrir Fuentes", action:"sources"}], incomplete};
  }
  facts.push(`${reconciliation.length} PN reconciliados. 4Wall: ${sources.scans?.loaded ? "archivo manual" : "copia publicada del bot"}. Bot: ${botRunning ? "corriendo" : "sin ejecución confirmada"}.`);
  if (diagnostics?.sources?.scanCount != null) facts.push(`${diagnostics.sources.scanCount} escaneos reconocidos por el motor.`);
  if (summary && reconciliation.length) facts.push(`NET ${formatUSD(summary.netUsd)} · SWING ${formatUSD(summary.swingUsd)}. Valores ya calculados por el motor; pendientes sin costo: ${summary.unvaluedPartCount ?? summary.missingCostCount ?? "sin dato"}.`);
  else facts.push("Todavía no hay resultados reconciliados que pueda interpretar.");
  // Quality precedes magnitude; amounts and explanations are the existing findings.
  const priority = {SIN_COSTO:0,COSTO_INVALIDO:0,COSTO_CONTRADICTORIO:0};
  const candidates = [...findings].sort((a,b) => (priority[a.valuationState] ?? 1) - (priority[b.valuationState] ?? 1) || Math.abs(b.netUsd ?? 0) - Math.abs(a.netUsd ?? 0));
  const selected = []; const seen = new Set();
  for (const finding of candidates) {
    if (seen.has(finding.partNumber)) continue;
    seen.add(finding.partNumber); selected.push(finding); if (selected.length === 3) break;
  }
  const sections = selected.map((finding) => ({title:finding.partNumber, fact:finding.whatFound, interpretation:finding.possibleExplanation || "Requiere revisar la evidencia; no puedo confirmar una causa.", next:finding.nextAction || "Abre el trazador y confirma las fuentes.", pn:finding.partNumber}));
  let interpretation = "NET compara el total; SWING compara cada localidad. Una diferencia puede venir de conteo pendiente, ubicación o calidad de fuentes; por sí sola no prueba pérdida.";
  if (summary && summary.netUsd === 0 && summary.swingUsd > 0) interpretation = "El NET calculado es cero y hay SWING: los totales coinciden, pero existe diferencia por localidad. Conviene revisar el mapeo y las localidades antes de concluir faltante físico.";
  return {kind:"live", paragraphs:facts, topicIds:[], sources:sourceTypes, incomplete,
    sections, blocks:[{label:"INTERPRETACIÓN",text:interpretation},{label:"SIGUIENTE PASO",text:missing.length ? "Completa las fuentes antes de priorizar dólares." : selected.length ? "Empieza por los casos de abajo: calidad de costo primero y después magnitud del NET calculado. También revisa SWING y sus localidades en el trazador." : "No hay hallazgos disponibles en esta vista. Revisa calidad de fuentes y abre una pieza para confirmar su evidencia."}],
    actions:[{label:"Ver fuentes",action:"sources"},{label:"Abrir alertas",action:"alerts"}],
  };
}
export function answerMykeInContext(question, organization, history = [], context = {}) {
  const last = history.filter((m) => m.role === "myke").at(-1)?.answer;
  const pn = extractPartNumber(question) || (/^\d{3,}$/.test(question.trim()) ? question.trim() : "");
  const intent = getMykeIntent(question);
  if (/\b(recetas?|pizza|futbol|horoscopo|clima|politica|bitcoin|poema|pelicula|jailbreak)\b/.test(normalize(question))) return {kind:"unknown",paragraphs:["Puedo ayudarte con esta página y su inventario. Para ese otro tema no tengo una respuesta respaldada."],topicIds:[]};
  if (intent === "bug") return {kind:"bug", paragraphs:["Eso suena más a un problema del sistema que a una diferencia de inventario. ¿Quieres que prepare un reporte? Te mostraré el contenido antes de enviarlo."], topicIds:[], problem:question};
  if (pn) return {...answerMyke(question, organization, last?.topicIds, context.reconciliation?.map((item) => item.partNumber)), pn:normalizeText(pn), kind:"piece"};
  if (last?.pn && (intent === "next" || /(?:este phantom|esta pieza|esta diferencia|por que sale|de donde sale)/.test(normalize(question)))) return {kind:"piece",pn:last.pn,paragraphs:["Revisemos esta pieza con sus fuentes y los resultados ya calculados."],topicIds:[]};
  if (["summary","attention","sources","next"].includes(intent)) return buildMykeLiveAnswer(intent,context);
  if (intent === "simple" && last) {
    if (last.kind === "piece") return {kind:"piece",pn:last.pn,paragraphs:["Vamos por partes: compara físico y QAD; después revisa las localidades y las fuentes de cada cifra."],topicIds:[]};
    if (last.kind === "live") return buildMykeLiveAnswer("attention",context);
    if (last.kind === "help") return {...last, paragraphs:[last.paragraphs[0]], blocks:last.blocks?.filter((block) => block.label !== "MÉTODO DEL MOTOR"), simple:true};
    const first = organization.topics.find((topic) => last.topicIds?.includes(topic.id));
    if (first) return {kind:"simple",paragraphs:[first.paragraphs[0]],topicIds:[first.id],sources:first.sources};
  }
  const naturalQuestion = /como (?:uso|utilizo|se usa).*(?:pagina|aplicacion|app)/.test(normalize(question)) ? "¿Cómo uso el tablero?" : question;
  const answer = answerMyke(naturalQuestion,organization,last?.topicIds,context.reconciliation?.map((item) => item.partNumber));
  return answer;
}
export function buildMykeHelpAnswer(info, topic, context = {}) {
  const name = String(topic).toLowerCase();
  const types = name.startsWith("source:") ? [name.slice(7)] : /phantom|bom/.test(name) ? ["scans","ispbb","bom"] : /cost|obsolete/.test(name) ? ["cost"] : /qad/.test(name) ? ["qad"] : ["scans","areas","qad","cost"];
  return {kind:"help",title:info.title,paragraphs:[info.description],topicIds:[],sources:types,
    blocks:[{label:"DE DÓNDE SALE",text:info.source},{label:info.methodLabel || "MÉTODO DEL MOTOR",text:info.formula},{label:"QUÉ REVISAR",text:info.notes?.slice(0,3).join(" ")}].filter((b) => b.text),
    pn:context.pn || null, actions:[{label:"Ver evidencia",action:"evidence"},{label:"Qué revisar después",question:"¿Qué debería revisar primero?"}],
  };
}
export function buildMykeChips(context = {}, last) {
  const live = buildMykeLiveAnswer("sources",context);
  return [{label:"Cómo uso el tablero",question:"¿Cómo uso el tablero?"},
    {label:live.incomplete ? "Qué archivo falta" : "Qué revisar primero",question:live.incomplete ? "¿Qué archivo me falta?" : "¿Qué revisarías tú?"},
    {label:"Resume para la junta",question:"Resume para la junta"},
    ...(last ? [{label:"Explícamelo fácil",question:"Explícame esto fácil"},{label:"Qué revisar después",question:"¿Qué revisar después?"}] : [])];
}
const redact = (value) => String(value || "").replace(/(?:bearer\s+\S+|(?:password|contrase[nñ]a|api[_ -]?key|secret|token)\s*[:=]\s*\S+)/gi,"[dato privado omitido]").slice(0,3000);
export function buildMykeFeedbackDraft(problem, {topic="Myke",pn=""} = {}) {
  const text = normalize(problem);
  const area = /scroll|congela|traba/.test(text) ? "Scroll / rubber-band" : /visor|excel/.test(text) ? "Visor Excel / evidencia" : /fuente|archivo|carga/.test(text) ? "Fuentes de referencia" : /bot/.test(text) ? "Bot escaneo 4Wall" : /trazador/.test(text) ? "Trazador de pieza" : "Myke / organización virtual";
  return {type:"Bug",area,problem:redact(problem),action:"",expected:"",topic:redact(topic),pn:redact(pn)};
}
export function buildMykeFeedbackPayload(report, {inventoryId=null,pathname="/",width,height} = {}) {
  if (!report?.problem?.trim() || !report?.action?.trim() || !report?.expected?.trim()) throw new Error("Completa qué estabas haciendo y qué esperabas que ocurriera.");
  return {report_type:"Bug",app_area:report.area,opportunity:`${redact(report.problem)}\nAcción: ${redact(report.action)}${report.pn ? `\nPN: ${redact(report.pn)}` : ""}`.slice(0,4000),expected_logic:redact(report.expected),screenshot_data_url:null,
    page_path:String(pathname).split(/[?#]/)[0],inventory_id:inventoryId,viewport:{width,height,view:redact(report.topic)}};
}
