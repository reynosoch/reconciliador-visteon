import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const RUBBER_MAX_PX = 54;
const RUBBER_CURVE = 155;
const FOLLOW_TAU_MS = 14;
const RETURN_TAU_MS = 22;
const WHEEL_RELEASE_MS = 28;
const RAW_LIMIT = 340;

const rubberDistance = (distance) =>
  Math.sign(distance) * RUBBER_MAX_PX * (1 - Math.exp(-Math.abs(distance) / RUBBER_CURVE));

/** Native scrolling in the middle; only the clipped content moves at an edge. */
export default function ScrollEffects({ viewportRef, contentRef }) {
  const viewportId = useId();
  const railRef = useRef(null);
  const thumbRef = useRef(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const rail = railRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !content || !rail || !thumb) return;
    if (!viewport.id) viewport.id = viewportId;
    rail.setAttribute("aria-controls", viewport.id);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let raw = 0, pull = 0, targetPull = 0, frame = 0, timer = 0;
    let previousTime = 0, touch = null, drag = null;
    let extent = 0, height = 0, track = 0, thumbSize = 0;
    const shell = viewport.classList.contains("vi-shell");
    rail.classList.toggle("vi-page-scroll-rail", shell);

    const measure = () => {
      const rect = viewport.getBoundingClientRect();
      height = viewport.clientHeight;
      extent = Math.max(0, viewport.scrollHeight - height);
      track = Math.max(0, rect.height - 24);
      thumbSize = Math.min(track, Math.max(36, track * height / Math.max(1, viewport.scrollHeight)));
      rail.style.top = `${rect.top + 12}px`;
      rail.style.left = `${rect.right - 13}px`;
      rail.style.height = `${track}px`;
      rail.hidden = extent <= 1;
      schedule();
    };
    const paint = (time) => {
      frame = 0;
      const dt = previousTime ? Math.min(34, Math.max(0, time - previousTime)) : 16;
      previousTime = time;

      const tau = Math.abs(targetPull) > 0.01 ? FOLLOW_TAU_MS : RETURN_TAU_MS;
      const follow = 1 - Math.exp(-dt / tau);
      pull += (targetPull - pull) * follow;

      if (Math.abs(targetPull - pull) < 0.12) {
        pull = targetPull;
        if (targetPull === 0) raw = 0;
      }

      if (Math.abs(pull) > 0.01) {
        content.style.transformOrigin = pull > 0 ? "center top" : "center bottom";
        content.style.transform = `translate3d(0,${pull.toFixed(3)}px,0) scaleY(${(1 + Math.abs(pull) / 4300).toFixed(5)})`;
      } else {
        pull = 0;
        content.style.removeProperty("transform");
        content.style.removeProperty("transform-origin");
      }

      const compressed = Math.max(18, thumbSize - Math.abs(pull) * 0.42);
      const fraction = extent ? Math.max(0, Math.min(1, viewport.scrollTop / extent)) : 0;
      const y = fraction * (track - compressed);
      thumb.style.height = `${compressed.toFixed(2)}px`;
      thumb.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
      rail.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
      rail.classList.toggle("is-pulling", Math.abs(pull) > 0.5);

      if (Math.abs(targetPull - pull) >= 0.12) schedule();
    };
    function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
    const release = () => {
      clearTimeout(timer);
      timer = 0;
      touch = null;
      raw = 0;
      targetPull = 0;
      previousTime = performance.now();
      schedule();
    };
    const reset = () => {
      clearTimeout(timer);
      timer = 0;
      raw = 0;
      pull = 0;
      targetPull = 0;
      previousTime = 0;
      schedule();
    };
    const atEdge = (delta) => extent > 1 &&
      ((delta > 0 && viewport.scrollTop <= 1) ||
       (delta < 0 && viewport.scrollTop >= extent - 1));
    const nestedScroller = (target) => {
      let node = target instanceof Element ? target : null;
      while (node && node !== viewport) {
        if (node.scrollHeight > node.clientHeight + 1 &&
            /auto|scroll/.test(getComputedStyle(node).overflowY)) return true;
        node = node.parentElement;
      }
      return false;
    };
    const pullBy = (delta, mode = "touch") => {
      if (reduced.matches) return;
      clearTimeout(timer);
      timer = 0;

      if (raw && Math.sign(raw) !== Math.sign(delta)) raw = 0;

      // Wheel momentum arrives in uneven packets. Accumulate a damped target,
      // then let requestAnimationFrame interpolate the visible motion.
      const contribution = mode === "wheel" ? delta * 0.48 : delta;
      raw = Math.max(-RAW_LIMIT, Math.min(RAW_LIMIT, raw + contribution));
      targetPull = rubberDistance(raw);
      schedule();
    };
    const wheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
          nestedScroller(event.target)) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      const delta = -event.deltaY * unit;
      if (atEdge(delta)) {
        pullBy(delta, "wheel");
        timer = setTimeout(release, WHEEL_RELEASE_MS);
      } else if (pull) reset();
    };
    const startTouch = (event) => {
      reset();
      if (event.touches.length !== 1 || nestedScroller(event.target)) return;
      const t = event.touches[0];
      touch = { x: t.clientX, y: t.clientY };
    };
    const moveTouch = (event) => {
      if (!touch || event.touches.length !== 1) { release(); return; }
      const t = event.touches[0], dy = t.clientY - touch.y, dx = t.clientX - touch.x;
      touch = { x: t.clientX, y: t.clientY };
      if (Math.abs(dx) > Math.abs(dy)) return;
      if (atEdge(dy) && !reduced.matches) {
        if (event.cancelable) event.preventDefault();
        pullBy(dy);
      } else if (pull) reset();
    };
    const scroll = (event) => {
      if (event.target !== viewport) return;
      if (viewport.scrollTop > 1 && viewport.scrollTop < extent - 1 && pull) reset();
      schedule();
    };
    const pointerDown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      reset();
      rail.focus({ preventScroll: true });
      const rect = rail.getBoundingClientRect();
      if (event.target !== thumb) viewport.scrollTop =
        ((event.clientY - rect.top - thumbSize / 2) / Math.max(1, track - thumbSize)) * extent;
      drag = { y: event.clientY, top: viewport.scrollTop };
      rail.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event) => {
      if (drag) viewport.scrollTop = drag.top +
        (event.clientY - drag.y) * extent / Math.max(1, track - thumbSize);
    };
    const pointerEnd = () => { drag = null; };
    const key = (event) => {
      const moves = { ArrowDown: 48, ArrowUp: -48, PageDown: height * .85, PageUp: -height * .85 };
      if (event.key in moves) { event.preventDefault(); viewport.scrollTop += moves[event.key]; }
      else if (event.key === "Home" || event.key === "End") {
        event.preventDefault(); viewport.scrollTop = event.key === "Home" ? 0 : extent;
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport); observer.observe(content);
    viewport.addEventListener("scroll", scroll, { passive: true });
    viewport.addEventListener("wheel", wheel, { passive: true });
    viewport.addEventListener("touchstart", startTouch, { passive: true });
    viewport.addEventListener("touchmove", moveTouch, { passive: false });
    viewport.addEventListener("touchend", release, { passive: true });
    viewport.addEventListener("touchcancel", release, { passive: true });
    rail.addEventListener("pointerdown", pointerDown);
    rail.addEventListener("pointermove", pointerMove);
    rail.addEventListener("pointerup", pointerEnd);
    rail.addEventListener("lostpointercapture", pointerEnd);
    rail.addEventListener("keydown", key);
    reduced.addEventListener("change", reset);
    viewport.addEventListener("animationend", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("blur", release);
    measure();
    return () => {
      clearTimeout(timer); cancelAnimationFrame(frame); observer.disconnect();
      viewport.removeEventListener("scroll", scroll);
      viewport.removeEventListener("wheel", wheel);
      viewport.removeEventListener("touchstart", startTouch);
      viewport.removeEventListener("touchmove", moveTouch);
      viewport.removeEventListener("touchend", release);
      viewport.removeEventListener("touchcancel", release);
      rail.removeEventListener("pointerdown", pointerDown);
      rail.removeEventListener("pointermove", pointerMove);
      rail.removeEventListener("pointerup", pointerEnd);
      rail.removeEventListener("lostpointercapture", pointerEnd);
      rail.removeEventListener("keydown", key);
      reduced.removeEventListener("change", reset);
      viewport.removeEventListener("animationend", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("blur", release);
      content.style.removeProperty("transform");
      content.style.removeProperty("transform-origin");
    };
  }, [viewportRef, contentRef, viewportId]);

  return createPortal(
    <div ref={railRef} className="vi-scroll-rail" role="scrollbar"
      tabIndex={0} aria-label="Desplazar contenido" aria-orientation="vertical"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
      <div ref={thumbRef} className="vi-scroll-thumb" />
    </div>, document.body,
  );
}

export function RubberDrawer({ children, className = "", ...props }) {
  const viewportRef = useRef(null), contentRef = useRef(null);
  return <>
    <aside {...props} ref={viewportRef} className={`${className} vi-rubber-viewport`}>
      <div className="vi-rubber-clip">
        <div className="vi-rubber-content" ref={contentRef}>{children}</div>
      </div>
    </aside>
    <ScrollEffects viewportRef={viewportRef} contentRef={contentRef} />
  </>;
}
