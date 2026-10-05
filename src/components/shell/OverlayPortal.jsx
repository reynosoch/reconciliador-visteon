import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  lockPageScroll,
  unlockPageScroll,
} from "../../services/overlayScroll.js";

export default function OverlayPortal({ children, onClose, className = "" }) {
  const root = useRef(null);
  const [marker] = useState(
    () => `vi-overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const closeRef = useRef(onClose);

  useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const host = root.current;
    const mountedAt = performance.now();
    return () => {
      // A short inert visual snapshot lets the drawer finish its exit after React
      // closes it. It cannot receive input, retain scroll locks or run effects.
      if (
        !host?.querySelector(".vi-rubber-viewport") ||
        performance.now() - mountedAt < 200 ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const snapshot = host.cloneNode(true);
      snapshot.classList.add("vi-overlay-exit");
      snapshot.inert = true;
      snapshot.setAttribute("aria-hidden", "true");
      snapshot
        .querySelectorAll("[id]")
        .forEach((node) => node.removeAttribute("id"));
      const originals = host.querySelectorAll(".vi-rubber-viewport");
      document.body.appendChild(snapshot);
      snapshot
        .querySelectorAll(".vi-rubber-viewport")
        .forEach((node, index) => {
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
      // A nested evidence viewer owns keyboard navigation until it closes.
      const top = [
        ...document.querySelectorAll(".vi-overlay-root:not(.vi-overlay-exit)"),
      ].at(-1);
      if (top !== root.current || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
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
  }, [marker]);

  return createPortal(
    <div ref={root} className={`vi-overlay-root ${className}`}>
      {children}
    </div>,
    document.body,
  );
}
