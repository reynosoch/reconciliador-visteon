import { Suspense, useEffect, useState } from "react";

// Load on first use; retain the component afterwards so search/selection survives closing.
export default function DeferredPanel({ open, children }) {
  const [visited, setVisited] = useState(false);
  useEffect(() => {
    if (open) setVisited(true);
  }, [open]);
  if (!open && !visited) return null;
  return (
    <Suspense
      fallback={
        <div className="vi-panel-loading" role="status">
          Abriendo panel…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
