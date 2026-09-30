import { useState } from "react";
import { bomClient } from "../../services/bomCloud.js";
export default function BomCloudStatus({ status, onSync }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const login = async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!bomClient) throw new Error("Falta configurar Supabase en esta instalación.");
      const result = await bomClient.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw new Error("No pudimos iniciar sesión. Revisa tu correo y contraseña.");
      setPassword("");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="vi-bom-cloud" aria-label="Respaldo compartido de BOM">
    <h3>Respaldo de BOM</h3>
    <p>Los archivos se juntan y se comparan antes de guardarlos. Si una parte tiene dos versiones distintas, te avisamos.</p>
    <p role="status" className={`vi-bom-cloud-state is-${status?.state || "pending"}`}>{status?.message || "Abriendo respaldo local…"}</p>
    {status?.email ? <div className="vi-bom-cloud-actions"><span>{status.email}</span><button className="vi-button" disabled={status.state === "syncing"} onClick={onSync}>Revisar respaldo</button><button className="vi-button" onClick={async () => { const result = await bomClient.auth.signOut(); if (result.error) setError("No pudimos cerrar la sesión. Reintenta."); }}>Cerrar sesión</button></div> :
      <form onSubmit={login}><label>Correo del equipo<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label><button className="vi-button" disabled={busy}>{busy ? "Entrando…" : "Conectar respaldo"}</button><small>Usa una cuenta autorizada en Supabase. Puedes seguir trabajando con la copia local mientras tanto.</small></form>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
