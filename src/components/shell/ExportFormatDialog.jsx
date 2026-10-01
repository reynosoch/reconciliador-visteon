import OverlayPortal from "./OverlayPortal.jsx";

const OPTIONS = [
  ["xlsx", "EXCEL .XLSX", "Libro con hojas separadas cuando aplica."],
  ["csv", "CSV", "Texto tabular compatible con Excel."],
  ["txt", "TXT", "Texto delimitado para revisión rápida."],
];

export default function ExportFormatDialog({
  open,
  title = "¿Cómo quieres descargarlo?",
  detail = "Elige el formato. La información exportada es una copia de solo lectura.",
  busy = "",
  onSelect,
  onClose,
}) {
  if (!open) return null;

  return (
    <OverlayPortal onClose={busy ? undefined : onClose}>
      <div className="vi-global-overlay vi-export-overlay" onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onClose?.();
      }}>
        <section className="vi-export-dialog" role="dialog" aria-modal="true" aria-label={title}>
          <div className="vi-export-dialog-head">
            <div>
              <p className="vi-eyebrow">EXPORTAR COMPARACIÓN</p>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
            <button type="button" className="vi-icon-close" disabled={Boolean(busy)} onClick={onClose} aria-label="Cerrar exportación">×</button>
          </div>
          <div className="vi-export-options">
            {OPTIONS.map(([format, label, description]) => (
              <button
                type="button"
                key={format}
                disabled={Boolean(busy)}
                className="vi-export-option"
                onClick={() => onSelect?.(format)}
              >
                <strong>{busy === format ? "GENERANDO…" : label}</strong>
                <span>{description}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </OverlayPortal>
  );
}
