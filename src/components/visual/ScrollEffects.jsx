import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from "motion/react";

const TOP_RUBBER_MAX_PX = 54;
const TOP_RUBBER_CURVE = 122;
const BOTTOM_RUBBER_MAX_PX = 62;
const BOTTOM_RUBBER_CURVE = 108;
const RAW_LIMIT = 300;
const WHEEL_RELEASE_MS = 46;
const MOMENTUM_GUARD_MS = 90;
const MOMENTUM_GUARD_DELTA = 2.4;

const SPRING = {
  stiffness: 520,
  damping: 34,
  mass: 0.55,
  restDelta: 0.05,
  restSpeed: 0.55,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const rubberDistance = (distance) => {
  const bottom = distance < 0;
  const max = bottom ? BOTTOM_RUBBER_MAX_PX : TOP_RUBBER_MAX_PX;
  const curve = bottom ? BOTTOM_RUBBER_CURVE : TOP_RUBBER_CURVE;
  return (
    Math.sign(distance) *
    max *
    (1 - Math.exp(-Math.abs(distance) / curve))
  );
};

/**
 * Native scrolling owns the middle of the gesture.
 * Motion only springs the clipped content when the viewport reaches an edge.
 */
export default function ScrollEffects({ viewportRef, contentRef }) {
  const viewportId = useId();
  const railRef = useRef(null);
  const thumbRef = useRef(null);
  const metricsRef = useRef({
    extent: 0,
    track: 0,
    thumbSize: 0,
    pull: 0,
  });

  const reduceMotion = useReducedMotion();
  const pullTarget = useMotionValue(0);
  const pullSpring = useSpring(pullTarget, SPRING);

  const paintThumb = useCallback(() => {
    const viewport = viewportRef.current;
    const rail = railRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !rail || !thumb) return;

    const { extent, track, thumbSize, pull } = metricsRef.current;
    const compressed = Math.max(18, thumbSize - Math.abs(pull) * 0.3);
    const fraction = extent
      ? clamp(viewport.scrollTop / extent, 0, 1)
      : 0;
    const y = fraction * Math.max(0, track - compressed);

    thumb.style.height = `${compressed.toFixed(2)}px`;
    thumb.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
    rail.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
  }, [viewportRef]);

  useMotionValueEvent(pullSpring, "change", (latest) => {
    const content = contentRef.current;
    const rail = railRef.current;
    if (!content || !rail) return;

    const pull = Math.abs(latest) < 0.025 ? 0 : latest;
    metricsRef.current.pull = pull;

    if (pull === 0) {
      content.style.removeProperty("transform");
      content.style.removeProperty("transform-origin");
      content.style.removeProperty("will-change");
      rail.classList.remove("is-pulling");
    } else {
      const maxPull = pull < 0 ? BOTTOM_RUBBER_MAX_PX : TOP_RUBBER_MAX_PX;
      const stretch = 1 + Math.min(maxPull, Math.abs(pull)) / 6200;
      content.style.willChange = "transform";
      content.style.transformOrigin = pull > 0 ? "center top" : "center bottom";
      content.style.transform =
        `translate3d(0,${pull.toFixed(3)}px,0) scaleY(${stretch.toFixed(5)})`;
      rail.classList.add("is-pulling");
    }

    paintThumb();
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const rail = railRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !content || !rail || !thumb) return undefined;

    if (!viewport.id) viewport.id = viewportId;
    rail.setAttribute("aria-controls", viewport.id);

    let raw = 0;
    let timer = 0;
    let thumbFrame = 0;
    let touch = null;
    let drag = null;
    let height = 0;
    let lastReleaseAt = 0;
    const shell = viewport.classList.contains("vi-shell");
    rail.classList.toggle("vi-page-scroll-rail", shell);

    const scheduleThumb = () => {
      if (thumbFrame) return;
      thumbFrame = requestAnimationFrame(() => {
        thumbFrame = 0;
        paintThumb();
      });
    };

    const measure = () => {
      const rect = viewport.getBoundingClientRect();
      height = viewport.clientHeight;
      const extent = Math.max(0, viewport.scrollHeight - height);
      const track = Math.max(0, rect.height - 24);
      const thumbSize = Math.min(
        track,
        Math.max(36, (track * height) / Math.max(1, viewport.scrollHeight)),
      );

      metricsRef.current.extent = extent;
      metricsRef.current.track = track;
      metricsRef.current.thumbSize = thumbSize;

      rail.style.top = `${rect.top + 12}px`;
      rail.style.left = `${rect.right - 13}px`;
      rail.style.height = `${track}px`;
      rail.hidden = extent <= 1;
      scheduleThumb();
    };

    const jumpToRest = () => {
      clearTimeout(timer);
      timer = 0;
      raw = 0;
      pullTarget.jump(0);
      pullSpring.jump(0);
      metricsRef.current.pull = 0;
      content.style.removeProperty("transform");
      content.style.removeProperty("transform-origin");
      content.style.removeProperty("will-change");
      rail.classList.remove("is-pulling");
      scheduleThumb();
    };

    const release = () => {
      clearTimeout(timer);
      timer = 0;
      touch = null;
      raw = 0;
      lastReleaseAt = performance.now();

      if (reduceMotion) {
        jumpToRest();
      } else {
        pullTarget.set(0);
      }
    };

    const reset = () => {
      raw = 0;
      if (reduceMotion) jumpToRest();
      else pullTarget.set(0);
    };

    const atEdge = (delta) => {
      const extent = metricsRef.current.extent;
      return (
        extent > 1 &&
        ((delta > 0 && viewport.scrollTop <= 1) ||
          (delta < 0 && viewport.scrollTop >= extent - 1))
      );
    };

    const nestedScroller = (target) => {
      let node = target instanceof Element ? target : null;
      while (node && node !== viewport) {
        if (
          node.scrollHeight > node.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(node).overflowY)
        ) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const pullBy = (delta, mode = "touch") => {
      if (reduceMotion) return false;

      clearTimeout(timer);
      timer = 0;

      if (raw && Math.sign(raw) !== Math.sign(delta)) raw = 0;

      const bounded = clamp(delta, -120, 120);
      if (mode === "wheel") {
        // Trackpads emit uneven momentum packets. Decay prior energy and feed
        // the spring a stable target instead of exposing every packet visually.
        const gain = bounded < 0 ? 1.28 : 1.18;
        raw = raw * 0.7 + bounded * gain;
      } else {
        raw += bounded;
      }

      raw = clamp(raw, -RAW_LIMIT, RAW_LIMIT);
      pullTarget.set(rubberDistance(raw));
      return true;
    };

    const wheel = (event) => {
      if (
        event.ctrlKey ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
        nestedScroller(event.target)
      ) {
        return;
      }

      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      const delta = -event.deltaY * unit;

      if (!atEdge(delta)) {
        if (Math.abs(metricsRef.current.pull) > 0.05) reset();
        return;
      }

      // Ignore tiny trailing momentum packets just after release. Without this
      // guard they can wake the spring again and create the visible "tremble".
      if (
        performance.now() - lastReleaseAt < MOMENTUM_GUARD_MS &&
        Math.abs(delta) < MOMENTUM_GUARD_DELTA
      ) {
        return;
      }

      if (pullBy(delta, "wheel")) {
        timer = window.setTimeout(release, WHEEL_RELEASE_MS);
      }
    };

    const startTouch = (event) => {
      clearTimeout(timer);
      timer = 0;
      raw = 0;

      if (event.touches.length !== 1 || nestedScroller(event.target)) {
        touch = null;
        return;
      }

      const t = event.touches[0];
      touch = { x: t.clientX, y: t.clientY };
    };

    const moveTouch = (event) => {
      if (!touch || event.touches.length !== 1) {
        release();
        return;
      }

      const t = event.touches[0];
      const dy = t.clientY - touch.y;
      const dx = t.clientX - touch.x;
      touch = { x: t.clientX, y: t.clientY };

      if (Math.abs(dx) > Math.abs(dy)) return;

      if (atEdge(dy) && !reduceMotion) {
        if (event.cancelable) event.preventDefault();
        pullBy(dy, "touch");
      } else if (Math.abs(metricsRef.current.pull) > 0.05) {
        reset();
      }
    };

    const scroll = (event) => {
      if (event.target !== viewport) return;
      const { extent, pull } = metricsRef.current;
      if (
        viewport.scrollTop > 1 &&
        viewport.scrollTop < extent - 1 &&
        Math.abs(pull) > 0.05
      ) {
        reset();
      }
      scheduleThumb();
    };

    const pointerDown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      reset();
      rail.focus({ preventScroll: true });

      const { extent, track, thumbSize } = metricsRef.current;
      const rect = rail.getBoundingClientRect();
      if (event.target !== thumb) {
        viewport.scrollTop =
          ((event.clientY - rect.top - thumbSize / 2) /
            Math.max(1, track - thumbSize)) *
          extent;
      }

      drag = { y: event.clientY, top: viewport.scrollTop };
      rail.setPointerCapture(event.pointerId);
    };

    const pointerMove = (event) => {
      if (!drag) return;
      const { extent, track, thumbSize } = metricsRef.current;
      viewport.scrollTop =
        drag.top +
        ((event.clientY - drag.y) * extent) /
          Math.max(1, track - thumbSize);
    };

    const pointerEnd = () => {
      drag = null;
    };

    const key = (event) => {
      const moves = {
        ArrowDown: 48,
        ArrowUp: -48,
        PageDown: height * 0.85,
        PageUp: -height * 0.85,
      };

      if (event.key in moves) {
        event.preventDefault();
        viewport.scrollTop += moves[event.key];
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        viewport.scrollTop =
          event.key === "Home" ? 0 : metricsRef.current.extent;
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);

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
    viewport.addEventListener("animationend", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("blur", release);

    measure();

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(thumbFrame);
      observer.disconnect();

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
      viewport.removeEventListener("animationend", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("blur", release);

      pullTarget.jump(0);
      pullSpring.jump(0);
      content.style.removeProperty("transform");
      content.style.removeProperty("transform-origin");
      content.style.removeProperty("will-change");
    };
  }, [
    viewportRef,
    contentRef,
    viewportId,
    reduceMotion,
    pullTarget,
    pullSpring,
    paintThumb,
  ]);

  return createPortal(
    <div
      ref={railRef}
      className="vi-scroll-rail"
      role="scrollbar"
      tabIndex={0}
      aria-label="Desplazar contenido"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <div ref={thumbRef} className="vi-scroll-thumb" />
    </div>,
    document.body,
  );
}

export function RubberDrawer({ children, className = "", ...props }) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  return (
    <>
      <aside
        {...props}
        ref={viewportRef}
        className={`${className} vi-rubber-viewport`}
      >
        <div className="vi-rubber-clip">
          <div className="vi-rubber-content" ref={contentRef}>
            {children}
          </div>
        </div>
      </aside>
      <ScrollEffects viewportRef={viewportRef} contentRef={contentRef} />
    </>
  );
}
