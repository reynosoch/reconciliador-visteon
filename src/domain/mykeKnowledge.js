const clean = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9.$/ _-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const MYKE_FAQ = [
  {
    id: "purpose",
    question: "¿Para qué sirve el reconciliador?",
    patterns: ["para que sirve", "que hace el reconciliador", "reconciliador", "objetivo"],
    answer:
      "Compara el físico de 4Wall contra el QAD congelado durante el inventario. Prioriza el impacto en USD, conserva el detalle por localidad y usa ISPBB, BOM y Cost Part para explicar por qué existe una diferencia.",
    source: "README · Objetivo operativo",
    action: { type: "engine", label: "Ver flujo del motor" },
  },
  {
    id: "net",
    question: "¿Qué es NET?",
    patterns: ["net", "diferencia total", "perdida neta", "ganancia neta"],
    answer:
      "NET es la diferencia total del PN: Físico total − QAD total. En dólares, esa diferencia se multiplica por el costo unitario y conserva su signo. Un NET negativo y uno positivo no deben interpretarse por sí solos como una pérdida o ganancia final confirmada.",
    source: "README · Reglas financieras actuales",
    action: { type: "tracer", label: "Ver NET paso a paso" },
  },
  {
    id: "swing",
    question: "¿Qué es SWING?",
    patterns: ["swing", "localidad incorrecta", "ubicacion incorrecta", "material movido"],
    answer:
      "SWING mide material que existe pero está distribuido en localidades distintas a QAD. Se suma ABS(Físico(localidad) − QAD(localidad)) × costo para cada localidad. La regla vigente no divide el resultado entre 2.",
    source: "README · Reglas financieras actuales",
    action: { type: "tracer", label: "Ver SWING de un PN" },
  },
  {
    id: "phantom",
    question: "¿Qué es un Phantom?",
    patterns: ["phantom", "fantasma", "phantoms", "comp phantom"],
    answer:
      "Un Phantom es un ítem cuya clasificación autoritativa viene de ISPBB. El reconciliador no lo identifica por prefijos. Cuando aplica BOM, usa las relaciones aceptadas para explicar la cantidad física reconocida sin inventar inventario.",
    source: "README · Phantom / BOM",
    action: { type: "data", view: "phantoms", label: "Ver Phantoms cargados" },
  },
  {
    id: "bom",
    question: "¿Cómo usa la BOM?",
    patterns: ["bom", "usage", "grossed up", "level .2", "level 0.2", "explosion"],
    answer:
      "La BOM usa Usage, únicamente Level .2 / 0.2 y Comp Phantom = NO. No usa Grossed up Usage, no aplica prefijos para decidir Phantom y no hace explosión recursiva. La BOM aporta evidencia y componentes según esas reglas vigentes.",
    source: "README · Phantom / BOM",
    action: { type: "data", view: "bom", label: "Ver BOM cargada" },
  },
  {
    id: "obsolete",
    question: "¿Qué significa obsoleto?",
    patterns: ["obsoleto", "obsolete", "obsoletos"],
    answer:
      "La condición OBSOLETE viene de Cost Part. Si un PN obsoleto tiene Físico > QAD puede aparecer una ganancia obsoleta; aun así, esa diferencia sigue formando parte del NET y debe investigarse con su evidencia.",
    source: "README · Reglas financieras actuales",
    action: { type: "data", view: "cost", label: "Ver Cost Part" },
  },
  {
    id: "unexpected",
    question: "¿Qué es material inesperado?",
    patterns: ["inesperado", "unexpected", "qad 0", "qad=0", "sin qad"],
    answer:
      "Material inesperado significa QAD = 0 y Físico > 0. Es una señal para investigar el origen del material; no es una instrucción automática para ajustar QAD.",
    source: "README · Reglas financieras actuales",
    action: { type: "tracer", label: "Revisar un PN inesperado" },
  },
  {
    id: "no-physical",
    question: "¿Qué significa “Sin físico registrado”?",
    patterns: ["sin fisico", "fisico 0", "fisico=0", "qad positivo", "no escaneado"],
    answer:
      "Durante el conteo, QAD > 0 y Físico = 0 se muestra como “Sin físico registrado”. No se confirma como pérdida final porque todavía puede faltar el escaneo o la evidencia del área.",
    source: "README · Reglas financieras actuales",
    action: { type: "tracer", label: "Seguir un PN sin físico" },
  },
  {
    id: "mapping",
    question: "¿Cómo se relacionan áreas 4Wall y localidades QAD?",
    patterns: ["area", "areas", "localidad", "localidades", "unmapped", "whse", "zwhse", "mapeo"],
    answer:
      "El área de 4Wall pasa por el catálogo 4Wall-Area para obtener la localidad QAD. La única normalización confirmada es WHSE → ZWHSE. Si no existe un mapeo confirmado, el reconciliador conserva UNMAPPED para que se revise.",
    source: "README · Áreas / localidades",
    action: { type: "data", view: "areas", label: "Ver catálogo de áreas" },
  },
  {
    id: "sources",
    question: "¿Qué archivos necesita el reconciliador?",
    patterns: ["archivos", "fuentes", "que necesito cargar", "que cargar", "datos necesita"],
    answer:
      "El corte usa 4Wall escaneos, catálogo de áreas 4Wall↔QAD, QAD congelado, ISPBB, BOM y Cost Part. El físico manual y el automático no se mezclan: se usa una sola fuente de escaneos vigente.",
    source: "README · Fuentes de datos",
    action: { type: "data", view: "overview", label: "Ver estado de datos" },
  },
  {
    id: "4wall",
    question: "¿Qué aporta 4Wall?",
    patterns: ["4wall", "escaneos", "fisico", "conteo manual", "bot 4wall"],
    answer:
      "4Wall aporta el físico observado: Part Number, cantidad y área/localidad de los escaneos aceptados. Puede venir del archivo manual o del snapshot automático, pero esas dos rutas no se combinan entre sí.",
    source: "README · Fuentes de datos",
    action: { type: "data", view: "scans", label: "Ver escaneos 4Wall" },
  },
  {
    id: "qad",
    question: "¿Qué aporta QAD?",
    patterns: ["qad", "congelado", "saldo sistema", "inventario sistema"],
    answer:
      "QAD aporta el saldo congelado contra el que se compara el físico. El reconciliador conserva el detalle por localidad para calcular NET global y explicar SWING por ubicación.",
    source: "README · Fuentes de datos",
    action: { type: "data", view: "qad", label: "Ver QAD" },
  },
  {
    id: "ispbb",
    question: "¿Qué aporta ISPBB?",
    patterns: ["ispbb", "item site planning", "buyer browse", "planeacion"],
    answer:
      "ISPBB es la fuente autoritativa para saber si un ítem es Phantom y aporta información de planeación del ítem. Esa clasificación se usa antes de aplicar las reglas BOM.",
    source: "README · Fuentes de datos",
    action: { type: "data", view: "ispbb", label: "Ver ISPBB" },
  },
  {
    id: "cost",
    question: "¿Qué aporta Cost Part?",
    patterns: ["cost part", "costo", "cost total", "usd", "valoracion"],
    answer:
      "Cost Part aporta el costo usado para valorar diferencias en USD y la condición de obsolescencia documentada por el proyecto. Si falta costo, el reconciliador debe mostrar el caso sin inventar un valor.",
    source: "README · Fuentes de datos",
    action: { type: "data", view: "cost", label: "Ver Cost Part" },
  },
  {
    id: "snapshot",
    question: "¿Qué es un snapshot?",
    patterns: ["snapshot", "corte", "ultimo corte", "consultado", "publicado"],
    answer:
      "Un snapshot es una copia de los escaneos de un momento concreto. Sirve para comparar ese físico con el QAD congelado. La hora en que la app consulta datos no demuestra por sí sola cuándo se extrajo el reporte original.",
    source: "README · Metadatos de snapshot",
    action: { type: "engine", label: "Ver cómo entra al motor" },
  },
  {
    id: "alerts",
    question: "¿Cómo funcionan las alertas?",
    patterns: ["alerta", "alertas", "hallazgos", "discrepancias", "notificaciones"],
    answer:
      "Las alertas son hallazgos para investigar durante el inventario. Conservan IDs estables por inventario y separan problemas operativos o de calidad de datos de una pérdida final confirmada.",
    source: "README · Discrepancias por investigar",
    action: { type: "data", view: "alerts", label: "Ver alertas de datos" },
  },
  {
    id: "tracer",
    question: "¿Para qué sirve el trazador de pieza?",
    patterns: ["trazador", "trazar", "part number", "pn", "origen de cada dato"],
    answer:
      "El trazador sigue un PN desde sus fuentes hasta el resultado: físico reconocido, mapeo de localidad, Phantom/BOM, QAD, costo, NET, SWING y hallazgos. También muestra la evidencia original disponible para cada paso.",
    source: "README · Trazador de pieza / aprendizaje",
    action: { type: "tracer", label: "Abrir trazador de pieza" },
  },
  {
    id: "architecture",
    question: "¿Dónde vive la lógica del reconciliador?",
    patterns: ["codigo", "logica", "motor", "arquitectura", "formula", "calculo", "como funciona"],
    answer:
      "Las reglas del inventario viven en el motor de dominio. La interfaz presenta resultados y navegación, pero no debe volver a calcular NET, SWING, Phantom/BOM ni las demás reglas financieras.",
    source: "README · Arquitectura",
    action: { type: "engine", label: "Ver guía del motor" },
  },
  {
    id: "myke",
    question: "¿Qué puede hacer Myke?",
    patterns: ["myke", "que puedes hacer", "ayuda", "equipo", "agentes"],
    answer:
      "Puedo explicar las reglas y fuentes documentadas del reconciliador, llevarte al visor de datos, abrir el trazador de una pieza y mostrar el equipo del proyecto. Este chat es ayuda local: no modifica inventario, no ejecuta el bot y no inventa respuestas fuera de la documentación.",
    source: "Ayuda local · Myke",
    action: { type: "faq", label: "Ver las 19 preguntas" },
  },
];

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
]);

export function extractPartNumber(message) {
  const normalized = clean(message);
  const explicit = normalized.match(
    /\b(?:PN|PART NUMBER|NUMERO DE PARTE)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})\b/,
  );
  if (explicit?.[1] && !STOP_PART_TOKENS.has(explicit[1])) return explicit[1];
  const candidates = normalized.match(/\b[A-Z0-9][A-Z0-9._/-]{4,}\b/g) || [];
  return (
    candidates.find(
      (token) =>
        /\d/.test(token) &&
        /[A-Z]/.test(token) &&
        !STOP_PART_TOKENS.has(token),
    ) || ""
  );
}

function scoreFaq(entry, normalized) {
  return entry.patterns.reduce((score, pattern) => {
    const candidate = clean(pattern);
    if (!candidate || !normalized.includes(candidate)) return score;
    return score + (candidate.includes(" ") ? 6 : Math.min(5, candidate.length / 2));
  }, 0);
}

export function answerMykeQuestion(message) {
  const normalized = clean(message);
  const partNumber = extractPartNumber(message);
  if (partNumber) {
    return {
      id: "part-number",
      answer: `Puedo seguir ${partNumber} en el trazador y mostrar de dónde sale cada cantidad, localidad, costo, NET, SWING y alerta disponible.`,
      source: "Trazador de pieza · evidencia del corte actual",
      action: {
        type: "tracer",
        label: `Abrir ${partNumber} en el trazador`,
        partNumber,
      },
    };
  }

  let best = null;
  let bestScore = 0;
  for (const entry of MYKE_FAQ) {
    const score = scoreFaq(entry, normalized);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  if (best && bestScore >= 2) return best;
  return {
    id: "unknown",
    answer:
      "No encontré una respuesta respaldada para esa pregunta. Puedo ayudarte con NET, SWING, Phantom, BOM, obsoletos, archivos, 4Wall, QAD, ISPBB, costos, localidades, snapshots, alertas, el trazador o cómo funciona el motor.",
    source: "Sin coincidencia en la ayuda documentada",
    action: { type: "faq", label: "Ver preguntas frecuentes" },
  };
}
