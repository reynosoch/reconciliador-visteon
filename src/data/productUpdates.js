export const PRODUCT_UPDATES = [
  {
    id: "2026-10-02-sources-workspace",
    date: "02 OCT 2026",
    title: "Fuentes universales y BOM Focus",
    summary: "Fuentes ahora funciona como un workspace compacto para cargar, revisar, reemplazar y quitar archivos sin perder control del origen.",
    items: [
      "Entrada universal con selección múltiple y drag & drop para TXT, CSV, XLSX y respaldos BOM JSON.",
      "Detección por nombre o por columnas: QAD, Áreas, ISPBB, Cost, BOM y 4Wall pueden mezclarse en una sola carga.",
      "El bot 4Wall solo bloquea escaneos manuales; las demás referencias siguen disponibles durante su ejecución.",
      "Cada fuente cargada conserva vista previa y acciones explícitas para reemplazar o quitar sin tocar las fórmulas del motor.",
      "BOM conserva biblioteca incremental, archivos individuales y borrado controlado; BOM Focus permite revisar un Parent Item exacto sin ruido.",
    ],
  },
  {
    id: "2026-10-01-motion-lab",
    date: "01 OCT 2026",
    title: "Scroll, Pac-Man y LAB visual",
    summary: "La experiencia del dashboard ahora conserva movimiento continuo y transiciones físicas más suaves.",
    items: [
      "Rubber band con spring de Motion: más sensible, sin vibración y con regreso limpio en los bordes.",
      "Flujo de datos se repliega al bajar y reaparece al subir con la misma sensación de resorte.",
      "Pac-Man continúa animándose durante scroll, touchpad y rubber band.",
      "Paneles principales usan vidrio suave: un poco más opacos y con blur ligero para ver el ambiente sin perder lectura.",
      "Nueva sección LAB en el menú con Ver animación, que oculta temporalmente todo el dashboard y deja solo Pac-Man.",
    ],
  },
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
