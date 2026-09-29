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
      if (motion.matches || document.hidden || !root.current) {
        last = now;
        frame = requestAnimationFrame(tick);
        return;
      }
      const elapsed = last ? Math.min(now - last, 64) / 1000 : 0;
      last = now;
      const dx = target.x - point.x;
      const dy = target.y - point.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, 82 * elapsed);
      if (distance < 2) target = randomPoint();
      else {
        point = {
          x: point.x + (dx / distance) * step,
          y: point.y + (dy / distance) * step,
        };
      }
      trail.push({ ...point, time: now, left: dx < 0 });
      trail = trail.filter((sample) => now - sample.time < 2600);

      const sprites = [...root.current.children];
      // Los fantasmas van delante; Pac-Man con poder los persigue.
      sprites.forEach((sprite, index) => {
        const delay = index === sprites.length - 1 ? 520 : index * 115;
        const wanted = now - delay;
        const sample =
          trail.findLast((candidate) => candidate.time <= wanted) || trail[0];
        if (!sample) return;
        const offsetY = index < sprites.length - 1 ? (index - 1) * 9 : 0;
        sprite.style.transform =
          `translate3d(${sample.x}px, ${sample.y + offsetY}px, 0)`;
        if (index === sprites.length - 1) {
          const pac = sprite.firstElementChild;
          if (pac) pac.style.transform = sample.left ? "scaleX(-1)" : "scaleX(1)";
        }
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
      className="vi-ambient-chase vi-random-chase vi-power-chase"
      aria-hidden="true"
    >
      <span className="vi-ambient-ghost vi-frightened-ghost">
        <Ghost size={16} tone="power" />
      </span>
      <span className="vi-ambient-ghost vi-frightened-ghost">
        <Ghost size={16} tone="power" />
      </span>
      <span className="vi-ambient-ghost vi-frightened-ghost">
        <Ghost size={16} tone="power" />
      </span>
      <span className="vi-ambient-hunter vi-powered-hunter">
        <span className="vi-pac-hunter" />
      </span>
    </div>
  );
}
