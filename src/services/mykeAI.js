// No provider key in this module. The private access code stays in component memory.
export function getMykeAIConfig(env = import.meta.env || {}) {
  const url =
    env.VITE_MYKE_AI_URL ||
    (env.VITE_SUPABASE_URL
      ? `${env.VITE_SUPABASE_URL}/functions/v1/myke-chat`
      : "");
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      )
    )
      return null;
    return { url, anonKey: env.VITE_SUPABASE_ANON_KEY || "" };
  } catch {
    return null;
  }
}
export function summarizeMykePiece(piece) {
  if (!piece) return null;
  const string = (value) => (value == null ? "" : String(value).slice(0, 160));
  return {
    pn: piece.pn,
    found: piece.found,
    description: piece.description,
    status: piece.status,
    complete: piece.complete,
    explanation: piece.explanation,
    metrics: (piece.metrics || []).map((metric) => ({
      label: metric.label,
      value: metric.value,
      explanation: metric.explanation,
      sources: metric.refs.slice(0, 3).map((ref) => ({
        file: ref.source?.fileName || ref.label,
        rule: ref.rule,
        rows: ref.evidence.slice(0, 3).map((row) => ({
          file: row.origin?.fileName || ref.source?.fileName || "",
          row: row.origin?.rowNumber ?? null,
          sheet: row.origin?.sheetName || "",
          cells: (row.cells || []).slice(0, 6).map((cell) => ({
            column: cell.column,
            original: string(cell.original),
            normalized: string(cell.normalized),
          })),
        })),
      })),
    })),
    warnings: (piece.warnings || []).map(({ title, detail }) => ({
      title,
      detail,
    })),
    actions: (piece.actions || []).map(({ title, detail }) => ({
      title,
      detail,
    })),
  };
}
export async function requestMykeAI({
  question,
  history = [],
  piece = null,
  sourceSummary = [],
  accessCode,
  signal,
  config = getMykeAIConfig(),
  fetchImpl = fetch,
}) {
  if (!config || !accessCode)
    throw new Error(
      "La IA no está conectada. Puedes seguir con la guía local.",
    );
  let response;
  try {
    response = await fetchImpl(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-myke-access-code": accessCode,
        ...(config.anonKey
          ? {
              apikey: config.anonKey,
              Authorization: `Bearer ${config.anonKey}`,
            }
          : {}),
      },
      signal: AbortSignal.any([
        ...(signal ? [signal] : []),
        AbortSignal.timeout(30000),
      ]),
      body: JSON.stringify({
        question: question.slice(0, 1000),
        history: history.slice(-6).map((message) => ({
          role: message.role,
          content: message.content.slice(0, 800),
        })),
        piece,
        sourceSummary: sourceSummary
          .slice(0, 6)
          .map(({ type, label, loaded, identity }) => ({
            type,
            label,
            loaded,
            identity: String(identity || "").slice(0, 240),
          })),
      }),
    });
  } catch (error) {
    if (signal?.aborted || ["AbortError", "TimeoutError"].includes(error.name))
      throw error;
    throw new Error(
      "No pudimos conectar con la IA. La guía local sigue disponible.",
      { cause: error },
    );
  }
  if (!response.ok) {
    const errors = {
      401: "El código de acceso no fue aceptado.",
      403: "Este sitio no tiene permiso para usar el servicio IA.",
      429: "La IA está ocupada; vuelve a intentar en un momento.",
      503: "El servicio IA todavía no está configurado.",
    };
    throw new Error(
      errors[response.status] ||
        "No se pudo consultar la IA. La guía local sigue disponible.",
    );
  }
  const data = await response.json();
  if (typeof data.text !== "string" || !data.text.trim())
    throw new Error(
      "La IA no devolvió una respuesta. Conservamos la guía local.",
    );
  return data.text.slice(0, 12000);
}
