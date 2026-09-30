const FOUR_WALL_COLUMNS = [
  "Ticket/FIFO",
  "AreaName",
  "subArea",
  "Escaneador",
  "auditor",
  "Numero de parte",
  "Número Parte QAD",
  "Quantity",
  "Costo Estándar",
  "Costo Total",
  "Responsable",
  "Área General",
  "Fecha agregado",
  "serial",
];
export function rawScanObject(row) {
  const raw = row?.raw_record && typeof row.raw_record === "object" ? row.raw_record : (row ?? {});
  const normalizedFallback = {
    "Número Parte QAD": raw["Numero Parte QAD"] ?? raw["Numero de parte"] ?? row?.numero_parte,
    Quantity: row?.cantidad,
    AreaName: row?.area_escaneo,
  };
  return Object.fromEntries(
    [...new Set([...FOUR_WALL_COLUMNS, ...Object.keys(raw)])].filter(key => !["raw_record", "source_columns"].includes(key)).map((key) => [key, raw[key] ?? normalizedFallback[key] ?? ""]),
  );
}

