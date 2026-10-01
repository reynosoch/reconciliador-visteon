function time(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function shortId(value) {
  const text = String(value || "SIN SNAPSHOT");
  return text.length > 34 ? `${text.slice(0, 18)}…${text.slice(-10)}` : text;
}

export default function SnapshotStamp({
  snapshotMeta,
  scanCount = 0,
  lastUpdated,
  compact = false,
  className = "",
}) {
  const id = snapshotMeta?.snapshotId || snapshotMeta?.consistencyToken || "SIN SNAPSHOT";
  const rows = snapshotMeta?.rowCount ?? scanCount;
  const state = snapshotMeta?.complete ? "CORTE ESTABLE" : "EN DESARROLLO";

  return (
    <div className={`vi-snapshot-stamp ${compact ? "is-compact" : ""} ${className}`}>
      <span className="vi-snapshot-dot" aria-hidden="true" />
      <div className="vi-snapshot-copy">
        <small>SNAPSHOT ACTUAL</small>
        <strong title={String(id)}>{shortId(id)}</strong>
      </div>
      <div className="vi-snapshot-meta">
        <span>{Number(rows || 0).toLocaleString("es-MX")} filas</span>
        <span>{time(lastUpdated)}</span>
        <em>{state}</em>
      </div>
    </div>
  );
}
