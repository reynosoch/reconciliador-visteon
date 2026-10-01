export default function BomCloudStatus({ status, onSync }) {
  return <section className="vi-bom-cloud" aria-label="Respaldo compartido de BOM">
    <h3>BOM registrados</h3>
    <p>El respaldo es automático. Comparamos cada BOM: los repetidos se ignoran y solo agregamos los nuevos. Si cambia una versión existente, te avisamos.</p>
    <p role="status" className={`vi-bom-cloud-state is-${status?.state || "pending"}`}>{status?.message || "Abriendo respaldo local…"}</p>
    <button type="button" className="vi-button" disabled={status?.state === "syncing"} onClick={onSync}>{status?.state === "syncing" ? "COMPARANDO…" : "REINTENTAR RESPALDO"}</button>
  </section>;
}
