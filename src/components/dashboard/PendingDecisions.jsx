export const DEPARTMENT_QUESTIONS = [
  {
    id: "close",
    q: "¿Qué dato de 4Wall confirma que terminó el conteo?",
    why: "Una localidad QAD puede reunir varias áreas de 4Wall.",
    example:
      "Cerrar una de tres áreas no confirma que toda la localidad terminó.",
    need: "Nombre del estado o reporte de cierre y cómo reconocer todas las áreas terminadas.",
  },
  {
    id: "scope",
    q: "¿Cuáles son los códigos de Francia, Paso y CUU?",
    why: "Se acordó incluir toda la planta y esos lugares. Necesitamos relacionarlos con los códigos de los archivos.",
    example: "Un nombre de almacén puede aparecer con otro código en QAD.",
    need: "Listado de sitios y localidades. El filtro QAD actual sigue en 179A, tipos PP/MP/FP; confirmar cómo cubre el alcance acordado.",
  },
  {
    id: "freeze",
    q: "¿El reporte oficial es 3.2 o 3.12?",
    why: "El archivo de prueba dice 3.2 y las notas de la junta dicen 3.12. El oficial llega el día del inventario.",
    example:
      "No debemos presentar una prueba como el inventario congelado oficial.",
    need: "Nombre y columnas del reporte oficial y su hora de corte.",
  },
  {
    id: "bom-version",
    q: "Si cambia un BOM ya guardado, ¿qué versión usamos?",
    why: "Acumulamos BOM, pero dos versiones del mismo ensamble no deben sumarse.",
    example: "Un BOM anterior dice 4 tornillos y uno nuevo dice 5.",
    need: "Quién confirma la versión vigente. Mientras tanto se conserva la anterior y se avisa del conflicto.",
  },
  {
    id: "phantom-source",
    q: "¿Confirmamos ISPBB cuando el BOM dice otra cosa?",
    why: "El ejemplo de la junta marca el escaneo como phantom, pero Parent Phantom del BOM dice NO.",
    example:
      "ISPBB YES activa el cálculo; dentro del BOM solo se usan componentes M=NO y F=.2.",
    need: "Validar esa diferencia y el ejemplo de la fila 7, que suma un escaneo directo de un componente phantom.",
  },
  {
    id: "shared",
    q: "¿Los BOM cargados deben aparecer en ambas computadoras?",
    why: "Por ahora la colección BOM se guarda en cada navegador.",
    example:
      "Un BOM cargado por una persona no aparece automáticamente en el equipo de otra.",
    need: "Confirmar el almacenamiento compartido y quién puede agregar o cambiar versiones.",
  },
  {
    id: "cost",
    q: "¿Cómo validamos los costos en cero?",
    why: "Todo está en USD. Un costo cero no demuestra que no haya inventario.",
    example: "Puede haber material contado con costo pendiente de negociar.",
    need: "Quién confirma estos casos. Se muestran dos decimales, conservando toda la precisión para calcular.",
  },
];
