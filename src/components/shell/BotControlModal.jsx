import {useEffect,useRef,useState} from "react";
import {RubberDrawer} from "../visual/ScrollEffects.jsx";
import OverlayPortal from "./OverlayPortal.jsx";
import InventoryLogin from "./InventoryLogin.jsx";
import {botApi,getInventoryClient,sendBotCommand} from "../../services/botControl.js";

const timestamp=value=>value ? new Date(value).toLocaleString("es-MX") : "Sin confirmar";
export default function BotControlModal({open,onClose,botState,auth,onOpenSources}){
  const [runnerId,setRunnerId]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[login,setLogin]=useState(false);
  const [history,setHistory]=useState([]),[diagnostics,setDiagnostics]=useState(null),[interval,setIntervalMinutes]=useState(30);
  const [userId,setUserId]=useState(""),[role,setRole]=useState("operator"),[machineId,setMachineId]=useState("runner-cuu-4wall-01"),[machineUser,setMachineUser]=useState("");
  const [quality,setQuality]=useState(null),[userActive,setUserActive]=useState(true);
  const pending=useRef(null),flight=useRef(false);
  const data=botState?.data,runners=data?.runners || [],runner=runners.find(r=>r.id===runnerId) || runners[0];
  const source=data?.sources?.find(s=>s.source_system===runner?.source_system && s.plant===runner?.plant);
  const attempt=data?.last_attempts?.find(r=>r.runner_id===runner?.id);
  const running=Boolean(runner?.active_run_id) && runner?.state!=="OFFLINE";
  const configuredInterval=runner?.interval_minutes;
  useEffect(()=>{if(configuredInterval)setIntervalMinutes(configuredInterval);},[configuredInterval]);
  useEffect(()=>{if(auth?.user)setLogin(false);},[auth?.user]);
  const execute=async action=>{
    if(flight.current || !runner)return;
    flight.current=true;setBusy(true);setMessage("");
    try{
      const result=await sendBotCommand(runner.id,action);
      setMessage(action==="RUN_NOW" ? result.status==="PENDING" ? "Orden pendiente, válida por 10 minutos. Si ya hay un corte activo, se ejecutará después." : "Orden registrada." : action==="PAUSE" ? "Pause registrado. El corte activo termina antes de quedar en pausa." : "Resume registrado. Se reanuda el horario configurado.");
    }catch(error){setMessage(error.message);}finally{flight.current=false;setBusy(false);}
  };
  const action=command=>{
    if(!auth?.user){pending.current=command;setLogin(true);return;}
    if(!auth.canOperate){setMessage("Tu cuenta viewer puede consultar; el control requiere operator o admin.");return;}
    void execute(command);
  };
  const adminAction=async(op,p)=>{
    if(flight.current)return;flight.current=true;setBusy(true);
    try{await botApi(op,p);setMessage("Configuración guardada y auditada.");}catch(error){setMessage(error.message);}finally{flight.current=false;setBusy(false);}
  };
  if(!open)return null;
  const failure=botState?.error?.message || (["FAILED","REJECTED","INTERRUPTED"].includes(attempt?.status) ? "Falló la actualización automática de 4Wall. El último corte válido sigue activo. Puedes reintentar o cargar el archivo manualmente." : "");
  return <OverlayPortal onClose={onClose}>
    <div className="vi-drawer-backdrop fixed inset-0 z-[145] bg-black/55" onMouseDown={event=>{if(event.target===event.currentTarget)onClose?.();}}>
      <RubberDrawer className="vi-drawer-panel vi-bot-drawer" role="dialog" aria-modal="true" aria-label="Bot 4Wall">
        <header className="vi-bot-head"><div><p className="vi-eyebrow">AUTOMATIZACIÓN · 4WALL</p><h2>Bot de escaneo</h2><p>Control remoto por Supabase. El runner trabaja en la laptop corporativa.</p></div><button className="vi-icon-close" onClick={onClose} aria-label="Cerrar bot">×</button></header>
        <div className="vi-bot-body">
          <section className="vi-bot-overview" aria-live="polite">
            <div className="vi-bot-status-line"><span>ESTADO DEL RUNNER</span><strong data-tone={failure ? "error" : runner?.state==="OFFLINE" ? "review" : "ok"}>{runner?.state || (botState?.error ? "SIN CONEXIÓN" : "CONSULTANDO")}</strong></div>
            {runners.length>1 && <label>Runner<select className="vi-input" value={runner?.id || ""} onChange={event=>setRunnerId(event.target.value)}>{runners.map(r=><option key={r.id}>{r.id}</option>)}</select></label>}
            <p className="vi-bot-no-snapshot">{failure || (runner ? runner.paused ? "En pausa. Run now permite un corte puntual; Pause permanece hasta Resume." : "Proceso, último intento y corte válido se confirman por separado." : "Todavía no hay un runner registrado. Se necesita la migración y una identidad técnica autorizada.")}</p>
            <dl className="vi-bot-facts">
              <div><dt>Runner</dt><dd>{runner?.id || "Sin registro"}</dd></div>
              <div><dt>Último heartbeat</dt><dd>{runner?.heartbeat_at ? `Hace ${Math.max(0,Math.round(((botState.observedAt || 0)-Date.parse(runner.heartbeat_at))/1000))} s · ${timestamp(runner.heartbeat_at)}` : "Sin confirmar"}</dd></div>
              <div><dt>Último corte válido</dt><dd>{timestamp(source?.published_at)}</dd></div>
              <div><dt>Extraído</dt><dd>{timestamp(source?.extracted_at)}</dd></div>
              <div><dt>Último intento</dt><dd>{attempt?.status || "Sin intentos"} · {timestamp(attempt?.started_at)}</dd></div>
              <div><dt>Próximo corte</dt><dd>{runner?.paused ? "En pausa" : timestamp(runner?.next_run_at)}</dd></div>
              {attempt?.next_attempt_at && <div><dt>Próximo reintento</dt><dd>{timestamp(attempt.next_attempt_at)}</dd></div>}
            </dl>
          </section>
          <div className={`vi-bot-visual ${busy ? "is-busy" : running ? "is-running" : "is-idle"}`} aria-hidden="true">
            <div className="vi-bot-machine"><span className="vi-bot-machine-face"><i/><i/></span><span className="vi-bot-machine-slot"/></div>
            <div className="vi-bot-scan-stage"><span className="vi-bot-scan-grid"/><span className="vi-bot-scan-beam"/><span className="vi-bot-scan-part">4WALL</span></div>
            <div className="vi-bot-visual-copy"><strong>{running ? "CORTE ACTIVO" : "BOT EN ESPERA"}</strong><span>El último corte válido permanece aunque falle el siguiente.</span></div>
          </div>
          <div className="vi-bot-security-note"><span aria-hidden="true">⌁</span><p>{auth?.user ? `Sesión ${auth.role} en este navegador.` : "Consulta pública. Las acciones requieren una cuenta de operador."}<strong> La contraseña 4Wall nunca se escribe aquí.</strong></p></div>
          {login && <InventoryLogin onAuthenticated={context=>{setLogin(false);const command=pending.current;pending.current=null;if(command && ["operator","admin"].includes(context.role))void execute(command);else setMessage("Sesión iniciada. Esta cuenta solo puede consultar.");}}/>}
          <div className="vi-bot-actions">
            <button className="vi-button vi-button-primary" disabled={busy || !runner || Boolean(auth?.user && !auth.canOperate)} onClick={()=>action("RUN_NOW")}>RUN NOW</button>
            <button className="vi-button vi-button-danger-soft" disabled={busy || !runner || runner?.paused || Boolean(auth?.user && !auth.canOperate)} onClick={()=>action("PAUSE")}>PAUSE</button>
            <button className="vi-button" disabled={busy || !runner || !runner?.paused || Boolean(auth?.user && !auth.canOperate)} onClick={()=>action("RESUME")}>RESUME</button>
            <button className="vi-button" onClick={onOpenSources}>Cargar archivo manual</button>
            {!auth?.user && <button className="vi-button" onClick={()=>setLogin(true)}>Iniciar sesión</button>}
            {auth?.user && <button className="vi-button" onClick={()=>{void getInventoryClient()?.auth.signOut();}}>Cerrar sesión</button>}
          </div>
          {message && <p className="vi-bot-message" role="status">{message}</p>}
          {attempt && <section className="vi-bot-state"><h3>Métricas del último intento</h3><div className="vi-bot-snapshot-meta">
            {[["Vistas",attempt.rows_seen],["Nuevas",attempt.rows_inserted],["Modificadas",attempt.rows_updated],["Sin cambio",attempt.rows_unchanged],["Eliminadas",attempt.rows_removed],["Rechazadas",attempt.rows_rejected],["Duración ms",attempt.duration_ms]].map(([label,value])=><div className="vi-bot-state-row" key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}
          </div></section>}
          {auth?.user && <details className="vi-bot-state"><summary>Historial</summary><button className="vi-button" onClick={()=>{void botApi("history",{runner_id:runner?.id}).then(result=>setHistory(result.runs)).catch(error=>setMessage(error.message));}}>Consultar</button>{history.map(run=><p key={run.id}>{timestamp(run.started_at)} · {run.status} · {run.rows_seen ?? "—"} vistas / {run.rows_inserted ?? "—"} nuevas / {run.rows_updated ?? "—"} modificadas</p>)}</details>}
          {auth?.isAdmin && <details className="vi-bot-state"><summary>Administración</summary>
            <label>Intervalo (minutos)<input className="vi-input" type="number" min="1" max="1440" value={interval} onChange={event=>setIntervalMinutes(Number(event.target.value))}/></label>
            <button className="vi-button" disabled={busy || !runner} onClick={()=>adminAction("config",{runner_id:runner.id,interval_minutes:interval})}>Guardar intervalo</button>
            <button className="vi-button" disabled={busy || !runner} onClick={()=>adminAction("config",{runner_id:runner.id,enabled:!runner.enabled})}>{runner?.enabled ? 'Deshabilitar horario' : 'Habilitar horario'}</button>
            <button className="vi-button" disabled={busy || !runner} onClick={()=>adminAction("config",{runner_id:runner.id,active:false,enabled:false})}>Revocar runner</button>
            <button className="vi-button" disabled={busy || !runner} onClick={()=>adminAction("config",{runner_id:runner.id,active:true})}>Reactivar identidad runner</button>
            <button className="vi-button" disabled={busy || !runner} onClick={()=>{void botApi("manifest",{runner_id:runner.id,offset:0}).then(result=>setQuality({...result,runner_id:runner.id})).catch(error=>setMessage(error.message));}}>Leer límites actuales</button>
            {quality?.runner_id===runner?.id && <div>
              <label>Ratio mínimo de filas (0–1)<input className="vi-input" type="number" min="0" max="1" step="0.01" value={quality.min_row_ratio} onChange={event=>setQuality(q=>({...q,min_row_ratio:Number(event.target.value)}))}/></label>
              <label>Máximo de filas<input className="vi-input" type="number" value={quality.max_rows} onChange={event=>setQuality(q=>({...q,max_rows:Number(event.target.value)}))}/></label>
              <label>Máxima cantidad absoluta<input className="vi-input" type="number" value={quality.max_quantity} onChange={event=>setQuality(q=>({...q,max_quantity:Number(event.target.value)}))}/></label>
              <label>Fechas locales<select className="vi-input" value={quality.date_order || ""} onChange={event=>setQuality(q=>({...q,date_order:event.target.value}))}><option value="">Rechazar fechas ambiguas</option><option value="DMY">Día / mes / año</option><option value="MDY">Mes / día / año</option></select></label>
              <button className="vi-button" disabled={busy} onClick={()=>adminAction("config",{runner_id:runner.id,min_row_ratio:quality.min_row_ratio,max_rows:quality.max_rows,max_quantity:quality.max_quantity,date_order:quality.date_order || null})}>Guardar límites</button>
            </div>}
            <button className="vi-button" disabled={busy} onClick={()=>adminAction("settings",{require_dashboard_login:!auth.requireDashboardLogin})}>{auth.requireDashboardLogin ? 'Permitir consulta pública' : 'Exigir login al reconciliador'}</button>
            <button className="vi-button" onClick={()=>{void botApi("diagnostics").then(setDiagnostics).catch(error=>setMessage(error.message));}}>Ver detalle técnico</button>
            {diagnostics && <pre>{JSON.stringify(diagnostics,null,2)}</pre>}
            <label>UUID de usuario<input className="vi-input" value={userId} onChange={event=>setUserId(event.target.value)}/></label>
            <select className="vi-input" value={role} onChange={event=>setRole(event.target.value)}>{["viewer","operator","admin"].map(value=><option key={value}>{value}</option>)}</select>
            <label><input type="checkbox" checked={userActive} onChange={event=>setUserActive(event.target.checked)}/> Rol activo</label>
            <button className="vi-button" disabled={busy || !userId} onClick={()=>adminAction("set_role",{user_id:userId,role,active:userActive})}>Asignar rol</button>
            <label>ID runner<input className="vi-input" value={machineId} onChange={event=>setMachineId(event.target.value)}/></label>
            <label>UUID de cuenta técnica dedicada<input className="vi-input" value={machineUser} onChange={event=>setMachineUser(event.target.value)}/></label>
            <button className="vi-button" disabled={busy || !machineUser} onClick={()=>adminAction("register",{runner_id:machineId,auth_user_id:machineUser,plant:"CUU"})}>Registrar runner</button>
          </details>}
        </div>
      </RubberDrawer>
    </div>
  </OverlayPortal>;
}
