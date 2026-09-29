// src/components/visual/PacmanGlyphs.jsx
import { useEffect, useRef } from "react";

export function PacDot({ size = 8, className = "" }) {
  return (
    <span
      className={`pac-dot ${className}`}
      style={{
        width: size,
        height: size,
      }}
      aria-hidden="true"
    />
  );
}

export function Ghost({ size = 16, tone = "violet", className = "" }) {
  return (
    <span
      className={`
       ghost-sprite
       ghost-${tone}
       ${className}
     `}
      style={{
        width: size,
        height: size,
      }}
      aria-hidden="true"
    >
      <span className="ghost-eye ghost-eye-left" />
      <span className="ghost-eye ghost-eye-right" />
      <span className="ghost-foot ghost-foot-a" />
      <span className="ghost-foot ghost-foot-b" />
      <span className="ghost-foot ghost-foot-c" />
    </span>
  );
}

export function PelletRail({ muted = false, className = "" }) {
  return (
    <div
      className={`
       pac-pellet-rail
       ${muted ? "pac-pellet-rail-muted" : ""}
       ${className}
     `}
    />
  );
}

export function AmbientChase() {
  const root = useRef(null);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    let last = 0;
    let point = { x: 40, y: 180 };
    let target = point;
    let trail = [];
    const randomPoint = () => ({
      x: 24 + Math.random() * Math.max(1, window.innerWidth - 60),
      y: 100 + Math.random() * Math.max(1, window.innerHeight - 140),
    });
    target = randomPoint();
    const tick = (now) => {
      if (motion.matches || document.hidden) {
        last = now;
        frame = requestAnimationFrame(tick);
        return;
      }
      const elapsed = last ? Math.min(now - last, 64) / 1000 : 0;
      last = now;
      const dx = target.x - point.x,
        dy = target.y - point.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, 65 * elapsed);
      if (distance < 2) target = randomPoint();
      else
        point = {
          x: point.x + (dx / distance) * step,
          y: point.y + (dy / distance) * step,
        };
      trail.push({ ...point, time: now, left: dx < 0 });
      trail = trail.filter((p) => now - p.time < 2100);
      [...root.current.children].forEach((sprite, index) => {
        const wanted = now - index * 450;
        const p = trail.findLast((p) => p.time <= wanted) || trail[0];
        sprite.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        if (index === 0)
          sprite.firstElementChild.style.transform = p.left
            ? "scaleX(-1)"
            : "scaleX(1)";
      });
      frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      point = {
        x: Math.min(point.x, window.innerWidth - 30),
        y: Math.min(point.y, window.innerHeight - 30),
      };
      target = randomPoint();
      trail = [];
    };
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <div
      ref={root}
      className="vi-ambient-chase vi-random-chase"
      aria-hidden="true"
    >
      <span className="vi-ambient-hunter">
        <span className="vi-pac-hunter" />
      </span>
      <span className="vi-ambient-ghost">
        <Ghost size={16} tone="violet" />
      </span>
      <span className="vi-ambient-ghost">
        <Ghost size={16} tone="cyan" />
      </span>
      <span className="vi-ambient-ghost">
        <Ghost size={16} tone="pink" />
      </span>
    </div>
  );
}
