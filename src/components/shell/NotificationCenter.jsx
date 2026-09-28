import {useEffect,useMemo,useState} from "react";
import {ALERT_STORAGE_KEY,READ_NEWS_KEY,syncOperationalAlerts} from "../../domain/notificationState.js";
export const CHANGELOG=[
 {id:"app:discrepancy-findings-v1",date:"28 sep",title:"Discrepancias por investigar",body:"La junta ahora separa diferencias de cantidad, posibles ubicaciones, calidad de datos y casos sin valorar."},
 {id:"app:snapshot-safety-v1",date:"28 sep",title:"Cortes más seguros",body:"Ya no se compara ni guarda un corte vigente mientras las fuentes están cargando o fallaron."},
 {id:"app:finance-review-v1",date:"28 sep",title:"Diferencias sin costo visibles",body:"Una diferencia sin costo confiable se muestra como SIN VALORAR y no como cero real."},
 {id:"app:data-inspection-v1",date:"25 sep",title:"Estado de datos explorable",body:"Los indicadores de datos permiten abrir los registros disponibles detrás del tablero."},
];
export function Bell(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;}
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}};
export default function NotificationCenter({open,onClose,findings=[],evaluationValid=false,onOpenFinding,onCountChange,onOperationalStateChange}){
 const [tab,setTab]=useState("OPERATIVAS"),[operational,setOperational]=useState(()=>readJson(ALERT_STORAGE_KEY,{})),[readNews,setReadNews]=useState(()=>new Set(readJson(READ_NEWS_KEY,[])));
 useEffect(()=>{const synced=syncOperationalAlerts(operational,findings,new Date().toISOString(),evaluationValid);if(synced.state!==operational){setOperational(synced.state);if(evaluationValid)localStorage.setItem(ALERT_STORAGE_KEY,JSON.stringify(synced.state));}onOperationalStateChange?.(synced.state);},[findings,evaluationValid]);
 const active=useMemo(()=>Object.values(operational).filter(x=>x.active),[operational]);
 const unreadNews=CHANGELOG.filter(x=>!readNews.has(x.id)).length,unreadAlerts=active.filter(x=>!x.read).length;
 useEffect(()=>{onCountChange?.(unreadNews+unreadAlerts);},[unreadNews,unreadAlerts,onCountChange]);
 const markNewsRead=()=>{const next=new Set(CHANGELOG.map(x=>x.id));setReadNews(next);localStorage.setItem(READ_NEWS_KEY,JSON.stringify([...next]));};
 useEffect(()=>{if(open&&tab==="NOVEDADES")markNewsRead();},[open,tab]);
 const openAlert=(alert)=>{const next={...operational,[alert.id]:{...alert,read:true}};setOperational(next);localStorage.setItem(ALERT_STORAGE_KEY,JSON.stringify(next));onOperationalStateChange?.(next);onOpenFinding?.(alert.id);onClose?.();};
 if(!open)return null;
 return <div className="vi-drawer-backdrop fixed inset-0 z-[140] bg-black/55" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.();}}><aside className="vi-drawer-panel"><div className="sticky top-0 z-10 px-5 py-5"><div className="flex justify-between gap-4"><div><p className="vi-eyebrow">CAMPANA</p><h2 className="mt-1 text-xl font-black">Notificaciones</h2><p className="mt-1 text-[11px]">El estado de lectura es local a este navegador; no se sincroniza entre equipos.</p></div><button className="vi-button" onClick={onClose}>CERRAR</button></div><div className="vi-notification-tabs"><button className={tab==="OPERATIVAS"?"is-active":""} onClick={()=>setTab("OPERATIVAS")}>ALERTAS OPERATIVAS <b>{unreadAlerts}</b></button><button className={tab==="NOVEDADES"?"is-active":""} onClick={()=>setTab("NOVEDADES")}>NOVEDADES <b>{unreadNews}</b></button></div></div>
 {tab==="NOVEDADES"?<div className="vi-notification-list">{CHANGELOG.map(item=><article className="vi-notification-item" key={item.id}><header><strong>{item.title}</strong><time>{item.date}</time></header><p>{item.body}</p></article>)}</div>:<div className="vi-notification-list">{!evaluationValid&&<div className="vi-bot-status">Las fuentes no pueden evaluarse ahora. Las alertas anteriores no se marcan como resueltas.</div>}{active.length===0?<p className="vi-notification-empty">No hay alertas operativas activas registradas.</p>:active.map(alert=><button className="vi-operational-alert" key={alert.id} onClick={()=>openAlert(alert)}><strong>{alert.partNumber}</strong><span>{alert.ruleCode.replaceAll("_"," ")}</span><small>{alert.read?"VISTA":"NUEVA"} · detectada {new Date(alert.firstSeen).toLocaleString("es-MX")}</small></button>)}</div>}
 </aside></div>;
}
