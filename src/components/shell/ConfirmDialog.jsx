import OverlayPortal from "./OverlayPortal.jsx";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Salir sin guardar",
  cancelLabel = "Seguir aquí",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <OverlayPortal onClose={busy ? undefined : onCancel}>
      <div className="vi-global-overlay">
        <div className="vi-confirm-card" role="dialog" aria-modal="true">
          <p className="vi-eyebrow">CONFIRMACIÓN</p>
          <h2>{title}</h2>
          <p>{message}</p>
          <div className="vi-confirm-actions">
            <button className="vi-button" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
            <button className="vi-button vi-button-primary" disabled={busy} onClick={onConfirm}>
              {busy ? "PROCESANDO…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
