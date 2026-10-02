export const unitMoney = value => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(value);

export const FILTERS = [
 {
   id: "ALL",
   label: "TODOS",
 },
 {
   id: "LOSS",
   label: "PÉRDIDA",
 },
 {
   id: "GAIN",
   label: "GANANCIA",
 },
 {
   id: "HAS_SWING",
   label: "CON SWING",
 },
 {
   id: "UNEXPECTED",
   label: "QAD 0",
 },
 {
   id: "OBSOLETE_GAIN",
   label: "OBSOLETO +",
 },
 {
   id: "PHANTOM",
   label: "PHANTOM",
 },
 {
   id: "BOM_REVIEW",
   label: "REVISAR BOM",
 },
 {
   id: "UNVALUED",
   label: "SIN VALORAR",
 },
];

export const STATUS_LABELS = {
 LOSS: "PÉRDIDA", GAIN: "GANANCIA", OBSOLETE_GAIN: "OBSOLETO +",
 UNEXPECTED: "INESPERADO", MISSING_PHYSICAL: "SIN FÍSICO",
 SWING: "SWING", UNVALUED: "SIN VALORAR", BALANCED: "BALANCEADO",
};

export function money(value) {
 return new Intl.NumberFormat(
   "en-US",
   {
     style: "currency",
     currency: "USD",
     maximumFractionDigits: 0,
     minimumFractionDigits: 0,
   }
 ).format(
   Number(value) || 0
 );
}

export function number(value) {
 return new Intl.NumberFormat(
   "en-US",
   {
     maximumFractionDigits: 2,
   }
 ).format(
   Number(value) || 0
 );
}

export function moneyTone(value) {
 const n =
   Number(value) || 0;
 if (n < 0) {
   return "vi-money-loss";
 }
 if (n > 0) {
   return "vi-money-gain";
 }
 return "text-slate-500";
}

