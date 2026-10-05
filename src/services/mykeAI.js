import { isMykePublicQuestion } from "../../supabase/functions/myke-chat/public-question.mjs";

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
export async function requestMykeAI({
  question,
  history = [],
  accessCode,
  signal,
  config = getMykeAIConfig(),
  fetchImpl = fetch,
}) {
  if (!config || !accessCode)
    throw new Error(
      "La IA no está conectada. Puedes seguir con la guía local.",
    );
  if (!isMykePublicQuestion(question))
    throw new Error(
      "Las consultas de piezas se resuelven con el motor local; no se envían a Gemini.",
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
        history: history
          .filter((message) => isMykePublicQuestion(message.content))
          .slice(-6)
          .map((message) => ({
            role: message.role,
            content: message.content.slice(0, 800),
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
      429: "Gemini alcanzó su cuota o está ocupado. La guía local sigue disponible; intenta más tarde.",
      422: "Esta consulta se mantiene local para proteger los datos de las piezas.",
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
