export const PRODUCT_UPDATES = [
  {
    id: "2026-10-01-logic-scroll",
    date: "01 OCT 2026",
    title: "Trazabilidad y experiencia de uso",
    summary: "Cambios recientes del reconciliador para entender mejor la lógica y trabajar sin perder contexto.",
    items: [
      "Nuevo Trazador de pieza: explica 4Wall → localidad QAD → ISPBB/Phantom → BOM → Cost Part → NET → SWING → clasificación.",
      "El trazador exige las fuentes necesarias antes de explicar una pieza, para no presentar conclusiones parciales como definitivas.",
      "Fuentes permite eliminar un BOM con confirmación y flujo preparado para borrar primero en Supabase y después en la copia local.",
      "Snapshot actual visible de forma discreta en el menú y al final del dashboard.",
      "Notificaciones abre el detalle de la pieza como drawer y permite regresar sin perder el contexto.",
      "Visor de evidencia con nombres reales de archivos, apariencia tipo Excel, solo lectura y exportación XLSX/CSV/TXT.",
      "Favicon azul en localhost y naranja en GitHub Pages para distinguir rápidamente el entorno.",
      "Scroll simplificado para priorizar el gesto nativo del touchpad y conservar únicamente el efecto elástico de borde.",
    ],
  },
];
