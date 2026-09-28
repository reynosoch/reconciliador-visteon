const DECISIONS=[
 {q:"¿Cuándo un Part Number sin escaneo debe contar como pérdida?",rule:"Hoy QAD sin físico entra como pérdida preliminar.",effect:"Puede inflar pérdida y NET antes de terminar el conteo.",ask:"Un caso real y el momento exacto en que Finanzas lo considera faltante."},
 {q:"¿Qué localidades entran al NET financiero de planta?",rule:"Hoy se conservan y suman las localidades exactas del corte.",effect:"Externos, docks, holds u otras localidades pueden cambiar el alcance.",ask:"Lista oficial de localidades incluidas/excluidas y su agrupación."},
 {q:"¿Cost Total es el costo oficial y está expresado en USD?",rule:"Hoy Cost Part → Cost Total valora diferencias; costo ausente o contradictorio queda SIN VALORAR.",effect:"Define si los importes pueden llamarse impacto USD oficial.",ask:"Confirmar fuente, moneda y tratamiento de Cost Total = 0."},
 {q:"¿Qué relaciones BOM aplican al inventario 179A?",rule:"Hoy solo una relación directa con padre escaneado y componente Phantom de ISPBB puede aportar físico derivado.",effect:"El archivo de prueba contiene más de un Site; no se decide por intuición.",ask:"Caso real padre→componente, Site aplicable y cantidad esperada."},
 {q:"¿Qué localidades forman el SWING oficial?",rule:"Hoy SWING suma |Físico(localidad) − QAD(localidad)| y no divide entre 2.",effect:"Cambiar el grupo de localidades cambia SWING.",ask:"Ejemplo aprobado de SWING con sus localidades incluidas."},
];
export default function PendingDecisions(){
 return <details className="vi-pending-decisions">
  <summary className="vi-pending-summary"><span>DECISIONES PENDIENTES CON FINANZAS</span><b>{DECISIONS.length} PENDIENTES</b></summary>
  <div className="vi-pending-grid">{DECISIONS.map((item,index)=><details className="vi-decision-card" key={item.q} open={index===0}>
   <summary>{item.q}<span>PENDIENTE DE CONFIRMAR</span></summary>
   <div className="vi-decision-body"><p><strong>Regla actual:</strong> {item.rule}</p><p><strong>Efecto:</strong> {item.effect}</p><p><strong>Fuente / ejemplo solicitado:</strong> {item.ask}</p></div>
  </details>)}</div>
 </details>;
}
