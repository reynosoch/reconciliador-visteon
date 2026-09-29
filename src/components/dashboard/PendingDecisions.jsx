export const DEPARTMENT_QUESTIONS = [
  {
    id: "close",
    q: "¿Cómo sabemos que ya terminaron de contar un área?",
    why: "Si todavía no cuentan una pieza, puede aparecer como faltante.",
    example:
      "QAD dice 100 piezas y aún no hay escaneos: quizá todavía no pasan por esa área.",
    need: "Quién avisa que terminó el conteo y dónde lo registra.",
  },
  {
    id: "scope",
    q: "¿Qué almacenes y áreas vamos a incluir?",
    why: "Necesitamos comparar los mismos lugares en 4Wall y QAD.",
    example: "El material de un almacén externo podría revisarse por separado.",
    need: "Lista de áreas incluidas y cuáles se mostrarán aparte.",
  },
  {
    id: "freeze",
    q: "¿Qué reporte de QAD usaremos como punto de partida?",
    why: "Si después se mueve material, eso puede explicar una diferencia.",
    example: "Sale material después de descargar QAD, pero antes de contarlo.",
    need: "Hora del reporte y cómo vamos a revisar entradas, salidas y movimientos posteriores.",
  },
  {
    id: "cost",
    q: "¿Confirmamos que usaremos Cost Total para el costo de cada pieza?",
    why: "Todos los importes están en dólares. Falta confirmar qué costo aplicar y qué hacer si viene vacío o en cero.",
    example: "Una diferencia de 10 piezas a $5 cada una representa $50.",
    need: "Reporte de costos aprobado y cómo revisar costos vacíos o en cero.",
  },
  {
    id: "swing",
    q: "¿Cómo debemos interpretar SWING en las juntas?",
    why: "Necesitamos que el número de la pantalla signifique exactamente lo mismo que usa Finanzas.",
    example:
      "Faltan 10 piezas en un lugar y sobran 10 en otro. La fórmula actual suma ambas diferencias: 20 piezas.",
    need: "Un ejemplo resuelto y los lugares que debemos comparar.",
  },
  {
    id: "bom",
    q: "¿Cómo debemos tratar un phantom durante el inventario?",
    why: "Algunas piezas se calculan a partir del ensamble que las contiene.",
    example:
      "Si contamos 10 ensambles y cada uno contiene 2 componentes, serían 20 componentes. Hay que revisar si ya se contaron por separado.",
    need: "Un ensamble, sus componentes y el resultado correcto para ese caso.",
  },
  {
    id: "records",
    q: "Cuando vuelven a contar, ¿se reemplaza el dato anterior?",
    why: "Necesitamos evitar sumar dos veces el mismo material.",
    example:
      "Primero registran 100 piezas y después corrigen a 95. Debemos saber cuál conteo usar.",
    need: "Cómo reconocer una corrección y cuál registro queda vigente.",
  },
  {
    id: "thresholds",
    q: "¿A partir de cuántos dólares una diferencia debe investigarse en la junta?",
    why: "Necesitamos un límite claro para ordenar primero las diferencias que Finanzas considera importantes. Este límite solo prioriza la revisión; no cambia el cálculo.",
    example:
      "Por ejemplo: definir si se investigan primero diferencias mayores a $100, $500, $1,000 u otro monto, y si el límite cambia según el área.",
    need: "Monto exacto en dólares que activa la revisión, si existe más de un nivel de prioridad y qué área o puesto atiende cada caso.",
  },
];
