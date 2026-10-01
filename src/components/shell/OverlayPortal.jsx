import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

let overlayLockCount = 0;
let previousBodyOverflow = "";
let previousBodyOverscroll = "";
let previousHtmlOverscroll = "";

function lockPageScroll() {
  if (overlayLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyOverscroll = document.body.style.overscrollBehavior;
    previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
  }

  overlayLockCount += 1;
  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehavior = "none";
  document.documentElement.style.overscrollBehavior = "none";
  document.body.classList.add("vi-overlay-open");
}

function unlockPageScroll() {
  overlayLockCount = Math.max(0, overlayLockCount - 1);
  if (overlayLockCount !== 0) return;

  document.body.style.overflow = previousBodyOverflow;
  document.body.style.overscrollBehavior = previousBodyOverscroll;
  document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
  document.body.classList.remove("vi-overlay-open");
}

export default function OverlayPortal({ children, onClose }) {
  const root = useRef(null);
  const token = useRef(`vi-overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    lockPageScroll();

    const marker = token.current;
    let pushed = false;
    const currentState =
      history.state && typeof history.state === "object" ? history.state : {};

    // Delay the history entry one task. React StrictMode mounts/cleans effects once
    // in development; delaying prevents that probe from immediately popping a real drawer.
    const historyTimer = setTimeout(() => {
      history.pushState({ ...currentState, viOverlay: marker }, "");
      pushed = true;
    }, 0);

    const pop = (event) => {
      if (pushed && event.state?.viOverlay !== marker) closeRef.current?.();
    };

    const key = (event) => {
      if (event.key === "Escape") {
        if (pushed && history.state?.viOverlay === marker) history.back();
        else closeRef.current?.();
        return;
      }

      if (event.key === "Tab" && root.current) {
        const nodes = [
          ...root.current.querySelectorAll(
            'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
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
    const focusTimer = setTimeout(
      () =>
        root.current
          ?.querySelector("button,input,select,textarea,[tabindex]")
          ?.focus(),
      0,
    );

    return () => {
      clearTimeout(historyTimer);
      clearTimeout(focusTimer);
      unlockPageScroll();
      removeEventListener("popstate", pop);
      document.removeEventListener("keydown", key);
      if (pushed && history.state?.viOverlay === marker) history.back();
    };
  }, []);

  return createPortal(<div ref={root}>{children}</div>, document.body);
}
