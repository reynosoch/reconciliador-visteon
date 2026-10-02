import { useEffect, useRef } from "react";

export function useMobileMenuSwipe({ disabled = false, setOpen }) {
  const startRef = useRef(null);

  useEffect(() => {
    const start = (event) => {
      if (window.innerWidth > 760 || disabled) return;
      const touch = event.touches?.[0];
      if (!touch || touch.clientX < window.innerWidth - 28) return;
      startRef.current = { x: touch.clientX, y: touch.clientY };
    };
    const end = (event) => {
      const origin = startRef.current;
      startRef.current = null;
      if (!origin) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const dx = touch.clientX - origin.x;
      const dy = Math.abs(touch.clientY - origin.y);
      if (dx < -58 && dy < 70) setOpen?.(true);
    };

    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchend", end, { passive: true });
    return () => {
      removeEventListener("touchstart", start);
      removeEventListener("touchend", end);
    };
  }, [disabled, setOpen]);
}
