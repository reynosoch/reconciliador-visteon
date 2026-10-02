export const REFERENCE_SOURCE_TYPES = {
  AREAS: "areas",
  QAD: "qad",
  ISPBB: "ispbb",
  BOM: "bom",
  COST: "cost",
  SCANS: "scans",
};

export const REFERENCE_SOURCE_LABELS = {
  areas: "Áreas 4Wall",
  qad: "Inventario QAD",
  ispbb: "ISPBB / Phantoms",
  bom: "BOM",
  cost: "Cost Part",
  scans: "Escaneos 4Wall",
};

export const REFERENCE_REQUIRED_FIELDS = {
  areas: [["Nombre"], ["Localidad QAD"]],
  qad: [
    ["Item Number"],
    ["Site"],
    ["Location"],
    ["Quantity On Hand"],
    ["Item Type"],
  ],
  ispbb: [["Item Number"], ["Site"], ["Phantom"]],
  bom: [["Parent Item"], ["Component"], ["Usage"], ["Level"], ["Comp Phantom"]],
  cost: [["Item Number"], ["Cost Total"], ["Status"]],
  scans: [
    ["Número Parte QAD", "Numero Parte QAD", "numero_parte", "Numero de parte"],
    ["Quantity", "cantidad"],
    ["AreaName", "area_escaneo"],
  ],
};

export const SOURCE_DETECTION_ORDER = [
  REFERENCE_SOURCE_TYPES.SCANS,
  REFERENCE_SOURCE_TYPES.AREAS,
  REFERENCE_SOURCE_TYPES.QAD,
  REFERENCE_SOURCE_TYPES.ISPBB,
  REFERENCE_SOURCE_TYPES.BOM,
  REFERENCE_SOURCE_TYPES.COST,
];
