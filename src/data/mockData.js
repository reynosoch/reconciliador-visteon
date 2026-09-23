export const archivosFuente = [
 {
   nombre: "4wall-Area(5) - Diccionario de nombres 4wall y QAD",
   tipo: "4Wall",
   estado: "Procesado",
 },
 {
   nombre: "Congelado QAD 3.2 09 10",
   tipo: "QAD",
   estado: "Procesado",
 },
 {
   nombre: "Reporte de Escaneos (Bot Playwright)",
   tipo: "4Wall en Vivo",
   estado: "Sincronizando...",
 }
];
export const cortesInventario = [
 { hora: "08:00", impactoUsd: -820000, varPlantaPzas: -4200, investigados: 0 },
 { hora: "10:00", impactoUsd: -1050000, varPlantaPzas: -5800, investigados: 12 },
 { hora: "12:00", impactoUsd: -920000, varPlantaPzas: -4900, investigados: 25 },
 { hora: "14:00", impactoUsd: -680000, varPlantaPzas: -3500, investigados: 38 },
 { hora: "16:00", impactoUsd: -510000, varPlantaPzas: -2700, investigados: 51 },
];
export const inventarioMock = [
 // NÚMEROS DE PARTE REALES EXTRAÍDOS DE 4WALL VISTEON
 {
   pn: "P247537BFKAAAB",
   almacen: 0, piso: 0, dsv: 0, qad: 66000,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 0.037470,
 },
 {
   pn: "P522019BFAAX00",
   almacen: 0, piso: 0, dsv: 0, qad: 7500,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 0.042153,
 },
 {
   pn: "P447062DFDEX04",
   almacen: 0, piso: 0, dsv: 0, qad: 10000,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 0.025251,
 },
 {
   pn: "P770094DF50001",
   almacen: 0, piso: 0, dsv: 0, qad: 4000,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 3.614610,
 },
 {
   pn: "PL110045BFDMCAC",
   almacen: 0, piso: 0, dsv: 0, qad: 280000,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 0.000305,
 },
 {
   pn: "PL60193BF20X02",
   almacen: 0, piso: 0, dsv: 0, qad: 4000,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 0.010172,
 },
 {
   pn: "P410252CFDEX01",
   almacen: 0, piso: 0, dsv: 0, qad: 1600,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 0.124628,
 },
 // Dejamos un Phantom y un Obsoleto falsos solo para que puedas demostrar el funcionamiento de los botones de colores en la junta
 {
   pn: "VPRLXF-OBSOLETO",
   almacen: 0, piso: 0, dsv: 0, qad: 1900,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 50,
 },
 {
   pn: "P7-PHANTOM-TEST",
   almacen: 0, piso: 0, dsv: 0, qad: 1000,
   varAlmacen: 0, varPiso: 0, varDsv: 0, varPlanta: 0, varUsd: 0, costo: 80,
 }
];