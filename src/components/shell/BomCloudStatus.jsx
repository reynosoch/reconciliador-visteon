export default function BomCloudStatus({ status, onSync }) {
  const state = status?.state || "pending";
  return (
    <section className="vi-bom-cloud" aria-label="Respaldo compartido de BOM">
      <div className="vi-bom-cloud-heading">
        <div>
          <h3>BOM registrados</h3>
          <p>
            Se comparan por Parent Item antes de guardar. Los BOM idénticos no
            se duplican y solo se agregan los nuevos.
          </p>
        </div>
        <button
          type="button"
          className="vi-button"
          disabled={state === "syncing"}
          onClick={onSync}
        >
          {state === "syncing" ? "SINCRONIZANDO…" : "SINCRONIZAR"}
        </button>
      </div>
      <p role="status" className={`vi-bom-cloud-state is-${state}`}>
        {status?.message || "Preparando respaldo BOM…"}
      </p>
    </section>
  );
}
