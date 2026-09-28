import { useState } from "react";
export default function BotControlModal({open,onClose}){
 const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
 if(!open)return null;
 const endpoint=String(import.meta.env.VITE_BOT_CONTROL_URL||"").replace(/\/$/,"");
 const start=async()=>{
  if(!endpoint){setMessage("El botón está integrado, pero falta conectar un servicio seguro que pueda ejecutar el bot. GitHub Pages no puede correr Python por sí solo.");return;}
  if(!password){setMessage("Escribe la contraseña de autorización.");return;}
  try{
   setBusy(true);setMessage("Solicitando arranque…");
   const response=await fetch(`${endpoint}/bot/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.message||`HTTP ${response.status}`);
   setMessage(data.message||"Bot iniciado.");setPassword("");
  }catch(error){setMessage(`No se pudo iniciar el bot: ${error.message}`);}finally{setBusy(false);}
 };
 return <div className="vi-drawer-backdrop fixed inset-0 z-[145] bg-black/55" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose?.();}}>
  <aside className="vi-drawer-panel"><div className="sticky top-0 z-10 px-5 py-5"><div className="flex justify-between gap-4">
   <div><p className="vi-eyebrow">CONTROL 4WALL</p><h2 className="mt-1 text-xl font-black">Ejecutar bot</h2><p className="mt-1 text-[11px]">La autorización se valida fuera del navegador; la contraseña no se guarda en GitHub.</p></div>
   <button className="vi-button" type="button" onClick={onClose}>CERRAR</button>
  </div></div><div className="vi-bot-form">
   <div className="vi-bot-status">Este botón requiere un controlador autorizado en el equipo o servidor donde vive el bot. La página pública nunca contiene la contraseña.</div>
   <label>CONTRASEÑA DE AUTORIZACIÓN<input className="vi-input" type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter")start();}}/></label>
   <button className="vi-button vi-button-primary" type="button" disabled={busy} onClick={start}>{busy?"INICIANDO…":"▶ INICIAR BOT 4WALL"}</button>
   {message&&<p className="vi-bot-status" role="status">{message}</p>}
  </div></aside>
 </div>;
}
