// src/domain/normalize.js
/**
* Convierte cualquier valor a texto limpio y en mayúsculas.
*
* Ejemplos:
* " zwip "  -> "ZWIP"
* null      -> ""
* undefined -> ""
*/
export function normalizeText(value) {
 if (value === null || value === undefined) {
   return "";
 }
 return String(value)
   .trim()
   .toUpperCase();
}

/**
* Normaliza números de parte provenientes de QAD o 4Wall.
*
* IMPORTANTE:
* No quitamos guiones ni otros caracteres porque forman
* parte real del Part Number.
*/
export function normalizePartNumber(value) {
 return normalizeText(value);
}

/**
* Normaliza el Site.
*
* Ejemplo:
* 179a -> 179A
*/
export function normalizeSite(value) {
 return normalizeText(value);
}

/**
* Normaliza localidades QAD.
*
* Regla confirmada:
* En 4Wall el diccionario puede traer WHSE,
* mientras QAD utiliza ZWHSE.
*
* NO intentamos adivinar ninguna otra localidad.
*/
export function normalizeQadLocation(value) {
 const location = normalizeText(value);
 if (!location) {
   return "";
 }
 if (location === "WHSE") {
   return "ZWHSE";
 }
 return location;
}

/**
* Convierte valores provenientes de Excel/CSV/QAD a Number.
*
* Soporta:
* "1,430.0"       -> 1430
* "$37.122468"    -> 37.122468
* "(125.50)"      -> -125.50
* ""              -> 0
* null            -> 0
*/
export function toNumber(value) {
 if (value === null || value === undefined || value === "") {
   return 0;
 }
 if (typeof value === "number") {
   return Number.isFinite(value) ? value : 0;
 }
 let text = String(value).trim();
 if (!text) {
   return 0;
 }
 const isNegativeParentheses =
   text.startsWith("(") &&
   text.endsWith(")");
 text = text
   .replace(/,/g, "")
   .replace(/\$/g, "")
   .replace(/%/g, "")
   .replace(/\(/g, "")
   .replace(/\)/g, "")
   .trim();
 const number = Number(text);
 if (!Number.isFinite(number)) {
   return 0;
 }
 return isNegativeParentheses
   ? -Math.abs(number)
   : number;
}

/**
* Convierte campos Yes / No provenientes de QAD.
*
* Ejemplos:
* Yes -> true
* YES -> true
* Y   -> true
* 1   -> true
*
* No  -> false
*/
export function toBoolean(value) {
 if (typeof value === "boolean") {
   return value;
 }
 const text = normalizeText(value);
 return [
   "YES",
   "Y",
   "TRUE",
   "1",
   "SI",
   "SÍ"
 ].includes(text);
}

/**
* Normaliza Status provenientes de QAD.
*
* Ejemplos:
* "obsolete " -> "OBSOLETE"
* "discont"    -> "DISCONT"
*/
export function normalizeStatus(value) {
 return normalizeText(value);
}

/**
* Nos permite identificar explícitamente
* ganancias de material OBSOLETE.
*
* Esta función NO decide el impacto financiero.
* Solo responde si el status es OBSOLETE.
*/
export function isObsoleteStatus(value) {
 return normalizeStatus(value) === "OBSOLETE";
}

/**
* Evita divisiones, cálculos o visualizaciones
* con valores NaN / Infinity.
*/
export function safeNumber(value, fallback = 0) {
 const number = Number(value);
 return Number.isFinite(number)
   ? number
   : fallback;
}