export const CHANGELOG=[
 {sha:"40d336e",date:"28 sep",title:"Diferencias sin costo ya no parecen balanceadas",body:"Si una pieza tiene diferencia pero su costo falta o es contradictorio, se marca como SIN VALORAR en vez de convertirla en $0."},
 {sha:"5547a65",date:"28 sep",title:"Cortes para las juntas",body:"Se agregó historial local para comparar cortes. La comparación solo debe usarse cuando los archivos y reglas sean compatibles."},
 {sha:"54e576f",date:"28 sep",title:"Más confianza en costos y evidencia",body:"Se reforzó la revisión de costos y la trazabilidad para distinguir resultados confirmados de datos incompletos."},
 {sha:"5be785c",date:"25 sep",title:"Estado de datos explorable",body:"Los indicadores de datos permiten abrir los registros que hay detrás y revisar alertas desde el tablero."},
];
function Bell(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;}
export {Bell};
export default function NotificationCenter({open,onClose}){
 if(!open)return null;
 return <div className="vi-drawer-backdrop fixed inset-0 z-[140] bg-black/55" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose?.();}}>
  <aside className="vi-drawer-panel"><div className="sticky top-0 z-10 px-5 py-5"><div className="flex items-start justify-between gap-4">
   <div><p className="vi-eyebrow">NOTIFICACIONES</p><h2 className="mt-1 text-xl font-black">Cambios recientes</h2><p className="mt-1 text-[11px]">Qué cambió y por qué importa, sin lenguaje de programación.</p></div>
   <button type="button" className="vi-button" onClick={onClose}>CERRAR</button>
  </div></div><div className="vi-notification-list">{CHANGELOG.map((item)=><article className="vi-notification-item" key={item.sha}>
   <header><strong>{item.title}</strong><time>{item.date}</time></header><p>{item.body}</p><code>Cambio {item.sha}</code>
  </article>)}</div></aside>
 </div>;
}
