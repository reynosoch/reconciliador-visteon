import { REFERENCE_SOURCE_TYPES } from "../../../domain/sourceCatalog.js";

export const SOURCE_CONFIG = [
  {
    type: REFERENCE_SOURCE_TYPES.SCANS,
    label: "Escaneos 4Wall",
    description: "Físico manual. Solo sustituye al bot cuando tú lo cargas.",
    topic: "source:scans",
    short: "4WALL",
    suggested: "4wSc*.csv",
    scope: "FÍSICO",
  },
  {
    type: REFERENCE_SOURCE_TYPES.AREAS,
    label: "Áreas 4Wall",
    description: "Traduce cada área escaneada a Localidad QAD.",
    topic: "source:areas",
    short: "ÁREAS",
    suggested: "4Wall-Area.csv",
    scope: "REFERENCIA",
  },
  {
    type: REFERENCE_SOURCE_TYPES.QAD,
    label: "Inventario QAD",
    description: "Congelado esperado por Part Number y localidad.",
    topic: "source:qad",
    short: "QAD",
    suggested: "Congelado QAD 3.2*.csv",
    scope: "REFERENCIA",
  },
  {
    type: REFERENCE_SOURCE_TYPES.ISPBB,
    label: "ISPBB",
    description: "Define oficialmente qué Part Numbers son Phantom.",
    topic: "source:ispbb",
    short: "ISPBB",
    suggested: "ISPBB*.csv",
    scope: "REFERENCIA",
  },
  {
    type: REFERENCE_SOURCE_TYPES.COST,
    label: "Cost Part",
    description: "Costo total y Status para valorar diferencias.",
    topic: "source:cost",
    short: "COST",
    suggested: "Cost Part*.csv",
    scope: "REFERENCIA",
  },
  {
    type: REFERENCE_SOURCE_TYPES.BOM,
    label: "BOM",
    description: "Parent → Component y Usage. Se agrega de forma incremental.",
    topic: "source:bom",
    short: "BOM",
    suggested: "BOM*.txt / .csv / .xlsx",
    scope: "BOM",
  },
];

export const CONFIG_BY_TYPE = Object.fromEntries(
  SOURCE_CONFIG.map((config) => [config.type, config]),
);

export const SESSION_SOURCE_CONFIG = SOURCE_CONFIG.filter(
  (config) => config.type !== REFERENCE_SOURCE_TYPES.BOM,
);

