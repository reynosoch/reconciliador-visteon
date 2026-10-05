import { useCallback, useEffect, useRef, useState } from "react";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import OverlayPortal from "./OverlayPortal.jsx";

export default function BotControlModal({ open, onClose, onStatusChange }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [actionError, setActionError] = useState("");
  const [lastChecked, setLastChecked] = useState(null);
  const statusRequest = useRef(false);
  const requestRef = useRef(false);
  const endpoint = String(import.meta.env.VITE_BOT_CONTROL_URL || "").replace(
    /\/$/,
    "",
  );

  const call = useCallback(
    async (path) => {
      const response = await fetch(endpoint + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message || "HTTP " + response.status);
      return data;
    },
    [endpoint, password],
  );

  const publishStatus = useCallback(
    (next) => {
      setStatus(next);
      setConnectionError("");
      setLastChecked(new Date());
      onStatusChange?.(next);
      return next;
    },
    [onStatusChange],
  );

  const refreshStatus = useCallback(async () => {
    if (!endpoint || statusRequest.current) return;
    statusRequest.current = true;
    try {
      publishStatus(await call("/bot/status"));
    } catch (error) {
      setConnectionError(
        "No pudimos consultar el controlador: " + error.message,
      );
    } finally {
      statusRequest.current = false;
    }
  }, [endpoint, call, publishStatus]);

  useEffect(() => {
    if (!open || !endpoint) return;
    void refreshStatus();
    const id = setInterval(refreshStatus, 3000);
    return () => clearInterval(id);
  }, [open, endpoint, refreshStatus]);

  const runAction = async (path) => {
    if (requestRef.current) return;
    if (!endpoint) {
      setMessage(
        "Falta conectar el controlador seguro del bot. GitHub Pages no ejecuta Python por sí solo.",
      );
      return;
    }
    if (!password) {
      setMessage("Escribe la contraseña de autorización.");
      return;
    }

    requestRef.current = true;
    setActionError("");
    setBusy(true);
    setMessage(
      path === "/bot/stop" ? "Solicitando paro seguro…" : "Enviando solicitud…",
    );

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
      setActionError(error.message);
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  };

  if (!open) return null;

  const snap = status?.lastSnapshot;
  const running = status?.processState === "running";
  const processError =
    connectionError || actionError || status?.lastLaunchError || "";
  const stateLabel = processError
    ? "ERROR"
    : !endpoint
      ? "SIN CONEXIÓN"
      : !status
        ? "CONSULTANDO"
        : running
          ? "CORRIENDO"
          : "DETENIDO";
  const stateTone = processError ? "error" : running ? "ok" : "review";
  const visualState = busy ? "is-busy" : running ? "is-running" : "is-idle";

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-drawer-backdrop fixed inset-0 z-[145] bg-black/55"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <RubberDrawer
          className="vi-drawer-panel vi-bot-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Bot 4Wall"
        >
          <header className="vi-bot-head">
            <div>
              <p className="vi-eyebrow">AUTOMATIZACIÓN · 4WALL</p>
              <h2>Bot de escaneo</h2>
              <p>
                Control del proceso y lectura del último snapshot reportado.
              </p>
            </div>
            <button
              className="vi-icon-close"
              onClick={onClose}
              aria-label="Cerrar bot"
            >
              ×
            </button>
          </header>

          <div className="vi-bot-body">
            <section className="vi-bot-overview" aria-live="polite">
              <div className="vi-bot-status-line">
                <span>ESTADO DEL PROCESO</span>
                <strong data-tone={stateTone}>{stateLabel}</strong>
              </div>
              <p>
                {processError ||
                  (!endpoint
                    ? "Conecta el controlador del bot para iniciar o detener el proceso."
                    : !status
                      ? "Esperando un estado confirmado por el controlador."
                      : running
                        ? "El extractor está activo. El último archivo publicado se confirma por separado."
                        : "El extractor está en espera. Puedes iniciarlo o cargar escaneos manuales en Fuentes.")}
              </p>
              <dl className="vi-bot-facts">
                <div>
                  <dt>Fuente</dt>
                  <dd>4Wall · extractor automático</dd>
                </div>
                <div>
                  <dt>Última consulta</dt>
                  <dd>
                    {lastChecked
                      ? lastChecked.toLocaleTimeString("es-MX")
                      : "Sin confirmar"}
                  </dd>
                </div>
                <div>
                  <dt>Última publicación</dt>
                  <dd>
                    {snap?.publishedAt
                      ? new Date(snap.publishedAt).toLocaleString("es-MX")
                      : "Sin publicación confirmada"}
                  </dd>
                </div>
              </dl>
            </section>
            <div className={`vi-bot-visual ${visualState}`} aria-hidden="true">
              <div className="vi-bot-machine">
                <span className="vi-bot-machine-face">
                  <i />
                  <i />
                </span>
                <span className="vi-bot-machine-slot" />
              </div>
              <div className="vi-bot-scan-stage">
                <span className="vi-bot-scan-grid" />
                <span className="vi-bot-scan-beam" />
                <span className="vi-bot-scan-part">4WALL</span>
              </div>
              <div className="vi-bot-visual-copy">
                <strong>
                  {busy
                    ? "PROCESANDO"
                    : running
                      ? "ESCANEO ACTIVO"
                      : "BOT EN ESPERA"}
                </strong>
                <span>
                  {running
                    ? "El proceso está corriendo; publicación y proceso se validan por separado."
                    : "La animación es indicativa. El estado real se muestra abajo."}
                </span>
              </div>
            </div>

            <div className="vi-bot-security-note">
              <span aria-hidden="true">⌁</span>
              <p>
                La contraseña autoriza iniciar o detener el proceso.
                <strong> No se guarda en esta página.</strong>
              </p>
            </div>

            <label className="vi-bot-password">
              <span>CONTRASEÑA DE AUTORIZACIÓN</span>
              <input
                className="vi-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !running && !busy)
                    runAction("/bot/start");
                }}
              />
            </label>

            <div className="vi-bot-actions">
              <button
                className="vi-button vi-button-primary"
                disabled={busy || running || !endpoint}
                onClick={() => runAction("/bot/start")}
              >
                ▶ INICIAR BOT
              </button>
              <button
                className="vi-button vi-button-danger-soft"
                disabled={busy || !running || !endpoint}
                onClick={() => runAction("/bot/stop")}
              >
                ■ DETENER BOT
              </button>
              <button
                className="vi-button"
                disabled={busy || !endpoint}
                onClick={refreshStatus}
              >
                CONSULTAR ESTADO
              </button>
            </div>

            {message && (
              <p className="vi-bot-message" role="status">
                {message}
              </p>
            )}

            {status && (
              <section className="vi-bot-state">
                <h3>Último reporte del controlador</h3>
                <div className="vi-bot-state-row">
                  <span>PROCESO CONFIRMADO</span>
                  <strong>
                    {status.processState || status.state || "desconocido"}
                  </strong>
                  <em className={running ? "is-live" : ""}>
                    {connectionError ? "PREVIO" : running ? "LIVE" : "IDLE"}
                  </em>
                </div>
                <div className="vi-bot-state-row">
                  <span>PID</span>
                  <strong>{status.pid || "Sin PID activo"}</strong>
                </div>
                {snap ? (
                  <>
                    <div className="vi-bot-state-row">
                      <span>ÚLTIMO REPORTE</span>
                      <strong data-result={snap.result}>
                        {snap.result === "PUBLISHED"
                          ? "Publicado"
                          : snap.result === "FAILED"
                            ? "Error de publicación"
                            : snap.result || "desconocido"}
                      </strong>
                    </div>
                    <div className="vi-bot-snapshot-meta">
                      <span>ID {snap.snapshotId || "—"}</span>
                      <span>{snap.rowCount ?? "—"} filas</span>
                      <span>
                        Extraído{" "}
                        {snap.extractedAt
                          ? new Date(snap.extractedAt).toLocaleString("es-MX")
                          : "—"}
                      </span>
                      <span>
                        Publicado{" "}
                        {snap.publishedAt
                          ? new Date(snap.publishedAt).toLocaleString("es-MX")
                          : "—"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="vi-bot-no-snapshot">
                    Aún no hay resultado de publicación reportado por el
                    extractor.
                  </p>
                )}
              </section>
            )}
          </div>
        </RubberDrawer>
      </div>
    </OverlayPortal>
  );
}
