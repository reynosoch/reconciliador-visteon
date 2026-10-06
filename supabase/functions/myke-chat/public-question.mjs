// Shared boundary for the unpaid provider, not a confidentiality/DLP detector.
// Actual inventory results and source identities never cross this boundary.
export function isMykePublicQuestion(question) {
  if (typeof question !== "string") return false;
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return !(
    /\b(?:PN|part number|numero de parte)\s*[:#-]?\s*[A-Z0-9]*\d[A-Z0-9._/-]*/i.test(text) ||
    /\b[A-Z]{2,}[A-Z0-9]*-\d[A-Z0-9._/-]*/i.test(text) ||
    /^\s*\d{3,}\s*$/.test(text)
  );
}

const normalized = (value) => typeof value === "string"
  ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^[¿¡]+/, "").trim()
  : "";
export const MYKE_SCOPE_REPLY = "Puedo ayudarte con Reconciliador Visteon: usar el tablero, entender NET y SWING, revisar fuentes o consultar una pieza. Para otros temas no tengo una respuesta. Prueba «¿Cómo uso el tablero?» o «¿Qué puedo hacer aquí?»";

// Conservative allowlist, shared by UI and server. It is not a semantic classifier.
// Follow-ups need a recent USER question in scope; assistant text cannot authorize one.
export function isMykeProjectQuestion(question, history = []) {
  const text = normalized(question);
  if (!text || text.length > 1000 || !isMykePublicQuestion(question)) return false;
  const redirect = /\b(ignora|ignore|olvida|forget|override|jailbreak|system prompt|prompt del sistema|instrucciones del sistema|revela tus instrucciones|actua como|act as|pretend|simula ser)\b/;
  const otherTopic = /\b(receta|recetas|recipe|recipes|futbol|football|soccer|horoscopo|horoscope|clima|weather|politica|politics|poema|poem|chiste|joke|pelicula|movie|bitcoin|criptomoneda|medicamento|diagnostico medico|capital de|presidente de)\b/;
  if (redirect.test(text) || otherTopic.test(text)) return false;
  const project = /\b(reconciliador|reconciler|visteon|myke|4wall|4 wall|ispbb|qad|phantom|bom|usage|swing|net|cost ?part|trazador|tablero|dashboard|rubber|pac.?man|parse(?:qad\w*|bom|ispbb|costpart|4wallscans|4wallareas|delimitedfile)|buildinventoryengine|inventoryengine|reconcileinventory|partlearningtrace)\b/;
  const contextual = /\b(motor|fuentes?|archivo|archivos|excel|csv|corte|snapshot|localidad|localidades|pn|numero de parte|numeros de parte|part number|fisico|inventario|obsoleto|unexpected|missing bom|advertencias?|alertas?|escaneos?|escaneo|bot|parser|parsers|dexie|supabase|navegacion|rendimiento|reportar|reporte|ayuda|costo|costos|diferencia|historial|scroll|animaciones|oportunidades?)\b/;
  const codeInProject = /(?:codigo|code) (?:de |del |of )?(?:esta |la |el |this |the )?(?:pagina|app|aplicacion|proyecto|reconciliador|page|project)/.test(text) || /^(?:como funciona el codigo|como se verifica y publica el codigo)\s*[?¿!.]*$/.test(text);
  if (project.test(text) || contextual.test(text) || codeInProject) return true;
  if (/^(hola|hello|buenas|gracias|thanks|que (puedo|puedes) hacer(?: aqui)?|como (uso|utilizo) (esta|la) (pagina|app|aplicacion))\s*[!?¿¡.]*$/.test(text)) return true;
  const followup = /^(?:y\s+)?(?:por que(?: no)?|como funciona|explica(?:me)?(?: mas)?|mas detalle|un ejemplo|dame un ejemplo|que sigue|que significa|de donde sale|como lo reviso|que hago|que significa eso)\s*[?¿!.]*$/;
  if (!followup.test(text)) return false;
  return (Array.isArray(history) ? history : []).slice(-6).some((message) =>
    message?.role === "user" && typeof message.content === "string" &&
    isMykePublicQuestion(message.content) &&
    !redirect.test(normalized(message.content)) && !otherTopic.test(normalized(message.content)) &&
    (project.test(normalized(message.content)) || contextual.test(normalized(message.content))),
  );
}
