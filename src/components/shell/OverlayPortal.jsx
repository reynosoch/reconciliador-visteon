import { useEffect, useLayoutEffect, useRef } from "react";
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

export function forceUnlockPageScroll() {
  overlayLockCount = 0;
  document.body.style.overflow = "";
  document.body.style.overscrollBehavior = "";
  document.documentElement.style.overscrollBehavior = "";
  document.body.classList.remove("vi-overlay-open");
}

export default function OverlayPortal({ children, onClose }) {
  const root = useRef(null);
  const token = useRef(`vi-overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const host = root.current;
    const mountedAt = performance.now();
    return () => {
      // A short inert visual snapshot lets the drawer finish its exit after React
      // closes it. It cannot receive input, retain scroll locks or run effects.
      if (!host?.querySelector(".vi-rubber-viewport") ||
          performance.now() - mountedAt < 200 ||
          matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const snapshot = host.cloneNode(true);
      snapshot.classList.add("vi-overlay-exit");
      snapshot.inert = true;
      snapshot.setAttribute("aria-hidden", "true");
      snapshot.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      const originals = host.querySelectorAll(".vi-rubber-viewport");
      document.body.appendChild(snapshot);
      snapshot.querySelectorAll(".vi-rubber-viewport").forEach((node, index) => {
        node.scrollTop = originals[index]?.scrollTop || 0;
      });
      const timer = setTimeout(() => snapshot.remove(), 160);
      snapshot.addEventListener("animationend", (event) => {
        if (event.target !== snapshot) return;
        clearTimeout(timer);
        snapshot.remove();
      });
    };
  }, []);

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

  return createPortal(<div ref={root} className="vi-overlay-root">{children}</div>, document.body);
}
