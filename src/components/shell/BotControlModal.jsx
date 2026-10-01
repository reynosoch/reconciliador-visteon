import { useEffect, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";

export default function BotControlModal({ open, onClose, onStatusChange }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const requestRef = useRef(false);
  const endpoint = String(import.meta.env.VITE_BOT_CONTROL_URL || "").replace(/\/$/, "");

  const call = async (path) => {
    const response = await fetch(endpoint + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || ("HTTP " + response.status));
    return data;
  };

  const publishStatus = (next) => {
    setStatus(next);
    onStatusChange?.(next);
    return next;
  };

  const refreshStatus = async () => {
    if (!endpoint || !password) return;
    try {
      publishStatus(await call("/bot/status"));
    } catch {
      // Un fallo consultando estado no se convierte en éxito.
    }
  };

  useEffect(() => {
    if (!open || !endpoint || !password) return;
    refreshStatus();
    const id = setInterval(refreshStatus, 3000);
    return () => clearInterval(id);
  }, [open, endpoint, password]);

  const runAction = async (path) => {
    if (requestRef.current) return;
    if (!endpoint) {
      setMessage("Falta conectar el controlador seguro del bot. GitHub Pages no ejecuta Python por sí solo.");
      return;
    }
    if (!password) {
      setMessage("Escribe la contraseña de autorización.");
      return;
    }

    requestRef.current = true;
    setBusy(true);
    setMessage(path === "/bot/stop" ? "Solicitando paro seguro…" : "Enviando solicitud…");

    try {
      const data = await call(path);
      publishStatus(data);
      setMessage(
        path === "/bot/stop"
          ? data.state === "already_stopped"
            ? "El bot ya estaba detenido."
            : "Bot detenido. Ya puedes usar escaneos 4Wall manuales."
          : data.state === "already_running"
            ? "El proceso ya estaba ejecutándose."
            : "Solicitud aceptada. Esto todavía NO significa que los nuevos datos estén disponibles.",
      );
      await refreshStatus();
    } catch (error) {
      setMessage("No se aceptó la solicitud: " + error.message);
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  };

  if (!open) return null;

  const snap = status?.lastSnapshot;
  const running = status?.processState === "running";

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-drawer-backdrop fixed inset-0 z-[145] bg-black/55"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <aside className="vi-drawer-panel">
          <div className="sticky top-0 z-10 px-5 py-5">
            <div className="flex justify-between gap-4">
              <div>
                <p className="vi-eyebrow">CONTROL 4WALL · DEV</p>
                <h2 className="mt-1 text-xl font-black">Bot de escaneo</h2>
                <p className="mt-1 text-[11px]">
                  El estado de proceso y el snapshot publicado son cosas distintas.
                </p>
              </div>
              <button className="vi-icon-close" onClick={onClose} aria-label="Cerrar bot">×</button>
            </div>
          </div>

          <div className="vi-bot-form">
            <div className="vi-bot-status">
              La contraseña autoriza iniciar, consultar o detener el proceso. No se guarda en esta página.
            </div>

            <label>
              CONTRASEÑA DE AUTORIZACIÓN
              <input
                className="vi-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runAction("/bot/start");
                }}
              />
            </label>

            <div className="vi-bot-actions">
              <button
                className="vi-button vi-button-primary"
                disabled={busy || running}
                onClick={() => runAction("/bot/start")}
              >
                ▶ INICIAR BOT
              </button>
              <button
                className="vi-button vi-button-danger-soft"
                disabled={busy || !running}
                onClick={() => runAction("/bot/stop")}
              >
                ■ DETENER BOT
              </button>
              <button
                className="vi-button"
                disabled={busy || !password}
                onClick={refreshStatus}
              >
                CONSULTAR ESTADO
              </button>
            </div>

            {message && <p className="vi-bot-status" role="status">{message}</p>}

            {status && (
              <div className="vi-bot-state">
                <strong>Proceso: {status.processState || status.state || "desconocido"}</strong>
                <span>{status.pid ? ("PID " + status.pid) : "Sin PID activo"}</span>
                {snap ? (
                  <>
                    <strong>Último reporte: {snap.result || "desconocido"}</strong>
                    <span>ID {snap.snapshotId || "—"} · {snap.rowCount ?? "—"} filas</span>
                    <span>
                      Extraído {snap.extractedAt ? new Date(snap.extractedAt).toLocaleString("es-MX") : "—"}
                      {" · "}
                      Publicado {snap.publishedAt ? new Date(snap.publishedAt).toLocaleString("es-MX") : "—"}
                    </span>
                  </>
                ) : (
                  <span>Aún no hay resultado de publicación reportado por el extractor.</span>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </OverlayPortal>
  );
}
