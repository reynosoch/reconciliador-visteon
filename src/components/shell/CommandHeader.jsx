import { Bell } from "./NotificationCenter";
function formatTime(date){if(!date)return "—";try{return new Intl.DateTimeFormat("es-MX",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(date));}catch{return "—";}}
function SourceState({label,state,detail,live=false,ready=false,error=false}){return <div className="vi-source-state"><span className={`vi-source-indicator ${live?"is-live":ready?"is-ready":error?"is-error":""}`} aria-hidden="true"/><span className="vi-source-copy"><strong>{label}</strong><small>{state}<span className="vi-source-detail"> · {detail}</span></small></span></div>;}
export default function CommandHeader({connectionStatus,scanCount=0,lastUpdated,referenceStatus,loading=false,sourcesOpen=false,onRefresh,onToggleSources,onOpenRules,onOpenNotifications,onOpenBot,notificationCount=0}){
 const live=connectionStatus?.state==="LIVE";const liveError=connectionStatus?.state==="ERROR";const referencesReady=referenceStatus?.allLoaded===true;const loaded=referenceStatus?.loadedCount||0;const total=referenceStatus?.totalSources||5;
 return <header className="vi-command-header"><div className="vi-header-main">
  <div className="vi-header-brand"><img src={`${import.meta.env.BASE_URL}brand/visteon-logo-white.png`} alt="Visteon" className="vi-brand-logo"/><span className="vi-brand-divider" aria-hidden="true"/><span className="vi-product-name">CONTROL DE INVENTARIO</span></div>
  <div className="vi-header-actions"><span className="vi-fetch-time"><small>ÚLTIMA CONSULTA</small><strong>{formatTime(lastUpdated)}</strong></span>
   <button type="button" onClick={onOpenNotifications} className="vi-button vi-button-light vi-icon-button" aria-label="Abrir notificaciones"><Bell/>{notificationCount>0&&<b className="vi-notification-badge">{notificationCount}</b>}</button>
   <button type="button" onClick={onOpenBot} className="vi-button vi-button-light" aria-label="Control del bot 4Wall">▶ BOT</button>
   <button type="button" onClick={onToggleSources} className={`vi-button vi-button-light ${sourcesOpen?"is-selected":""}`} aria-expanded={sourcesOpen}>FUENTES <span className="vi-button-count">{loaded}/{total}</span></button>
   <button type="button" onClick={onOpenRules} className="vi-button vi-button-light vi-header-help" aria-label="Abrir ayuda y metodología">? <span>AYUDA</span></button>
   <button type="button" disabled={loading} onClick={onRefresh} className="vi-button vi-button-primary">{loading?"ACTUALIZANDO…":"ACTUALIZAR"}</button>
  </div></div>
  <div className="vi-source-ribbon"><div className="vi-source-ribbon-inner"><span className="vi-flow-label">FLUJO DE DATOS</span>
   <SourceState label="4WALL" state={live?"EN VIVO":liveError?"ERROR":"EN ESPERA"} detail={liveError?(connectionStatus?.detail||"No se pudo actualizar"):`${scanCount.toLocaleString("es-MX")} escaneos`} live={live} error={liveError}/>
   <span className="vi-ribbon-flow" aria-hidden="true"/><SourceState label="QAD" state={referencesReady?"CONGELADO":"PENDIENTE"} detail="Planta 179A" ready={referencesReady}/>
   <span className="vi-ribbon-separator" aria-hidden="true"/><SourceState label="REFERENCIAS" state={referencesReady?"LISTAS":referenceStatus?.hasErrors?"REVISAR":`${loaded}/${total} cargadas`} detail="ISPBB · BOM · COST" ready={referencesReady} error={referenceStatus?.hasErrors}/>
  </div></div>
 </header>;
}