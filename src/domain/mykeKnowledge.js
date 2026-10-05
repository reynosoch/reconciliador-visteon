// Knowledge comes from the repository documents, not financial calculations or external AI.
const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const stopWords = new Set(
  "que como cual cuales donde viene vienen sale salen por para los las del una uno con hay ese esa esto esta este quiero saber dime puede puedes tiene tengo porque significa explica explicame funciona sobre todo todos cuando hace hacer un el la de en y o es se me mi al a si no".split(
    " ",
  ),
);
export const mykeSearchWords = (value) =>
  normalize(value)
    .match(/[a-z0-9]+/g)
    ?.filter((word) => !stopWords.has(word)) || [];

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
        /\d/.test(token) && /[A-Z]/.test(token) && !STOP_PART_TOKENS.has(token),
    ) || ""
  );
}

export function answerMyke(question, organization, previousTopicIds = []) {
  const input = normalize(question).trim();
  const tokens = [...new Set(mykeSearchWords(input))];
  const pn =
    extractPartNumber(question) ||
    String(question).match(/\b(?:pieza|parte)\s+(\d{4,})\b/i)?.[1];
  if (
    /^(hola|buenas|buenos dias|buenas tardes|hey|gracias|muchas gracias)[!.?\s]*$/.test(
      input,
    )
  ) {
    return {
      kind: "greeting",
      paragraphs: [
        "¡Hola! Soy Myke. Puedo explicarte cómo funciona el reconciliador y su código, de dónde salen sus datos y qué revisar ante una diferencia. Pregúntame o elige una pregunta frecuente.",
      ],
      topicIds: [],
    };
  }
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
        `Para explicar ${pn.toUpperCase()} con cifras y filas reales, abre el trazador y busca ese PN. No tomaré los números escritos en el chat como resultados del inventario.`,
        "Ahí puedes ver su físico, QAD, costo, NET, SWING y alertas con evidencia de cada paso.",
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
