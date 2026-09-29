import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function OverlayPortal({ children, onClose }) {
  const root = useRef(null);
  const token = useRef(`vi-overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const marker = token.current;
    const currentState =
      history.state && typeof history.state === "object" ? history.state : {};
    history.pushState({ ...currentState, viOverlay: marker }, "");

    const pop = (event) => {
      if (event.state?.viOverlay !== marker) closeRef.current?.();
    };

    const key = (event) => {
      if (event.key === "Escape") {
        history.back();
        return;
      }
      if (event.key === "Tab" && root.current) {
        const nodes = [
          ...root.current.querySelectorAll(
            'button,[href],input,[tabindex]:not([tabindex="-1"])',
          ),
        ].filter((node) => !node.disabled);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    addEventListener("popstate", pop);
    document.addEventListener("keydown", key);
    setTimeout(
      () => root.current?.querySelector("button,input,[tabindex]")?.focus(),
      0,
    );

    return () => {
      document.body.style.overflow = oldOverflow;
      removeEventListener("popstate", pop);
      document.removeEventListener("keydown", key);
      if (history.state?.viOverlay === marker) history.back();
    };
  }, []);

  return createPortal(<div ref={root}>{children}</div>, document.body);
}
