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
    const host = root.current;
    if (!host) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pacman = host.querySelector('[data-chase="pacman"]');
    const ghosts = [...host.querySelectorAll('[data-chase="ghost"]')];
    const powerPellet = host.querySelector('[data-chase="power"]');

    let frame = 0;
    let last = 0;
    let point = { x: 48, y: 180 };
    let target = { ...point };
    let trail = [];
    let powerPoint = null;
    let powerArmed = false;
    let powerUntil = 0;
    let nextPowerAt = performance.now() + 7000 + Math.random() * 9000;

    const randomPoint = () => ({
      x: 28 + Math.random() * Math.max(1, window.innerWidth - 72),
      y: 110 + Math.random() * Math.max(1, window.innerHeight - 170),
    });

    const sampleAt = (wanted) =>
      trail.findLast((sample) => sample.time <= wanted) || trail[0] || point;

    const place = (element, sample, offsetY = 0, faceLeft = false) => {
      if (!element || !sample) return;
      element.style.transform =
        `translate3d(${sample.x}px, ${sample.y + offsetY}px, 0)`;
      const face = element.querySelector(".vi-pac-hunter");
      if (face) face.style.transform = faceLeft ? "scaleX(-1)" : "scaleX(1)";
    };

    const hidePower = () => {
      powerArmed = false;
      powerPoint = null;
      if (powerPellet) powerPellet.hidden = true;
    };

    const armPower = (now) => {
      powerPoint = randomPoint();
      powerArmed = true;
      target = { ...powerPoint };
      if (powerPellet) {
        powerPellet.hidden = false;
        powerPellet.style.transform =
          `translate3d(${powerPoint.x}px, ${powerPoint.y}px, 0)`;
      }
      nextPowerAt = now + 12000 + Math.random() * 12000;
    };

    const setPowerMode = (active) => {
      host.classList.toggle("is-power-mode", active);
    };

    target = randomPoint();

    const tick = (now) => {
      if (reducedMotion.matches || document.hidden) {
        last = now;
        frame = requestAnimationFrame(tick);
        return;
      }

      const powered = now < powerUntil;
      if (!powered && host.classList.contains("is-power-mode")) {
        setPowerMode(false);
        nextPowerAt = now + 9000 + Math.random() * 15000;
      }

      if (!powered && !powerArmed && now >= nextPowerAt) armPower(now);

      const elapsed = last ? Math.min(now - last, 64) / 1000 : 0;
      last = now;
      const dx = target.x - point.x;
      const dy = target.y - point.y;
      const distance = Math.hypot(dx, dy);
      const speed = powered ? 96 : 76;
      const step = Math.min(distance, speed * elapsed);

      if (distance < 8) {
        if (powerArmed && powerPoint) {
          hidePower();
          powerUntil = now + 6500 + Math.random() * 3500;
          setPowerMode(true);
        }
        target = randomPoint();
      } else {
        point = {
          x: point.x + (dx / distance) * step,
          y: point.y + (dy / distance) * step,
        };
      }

      trail.push({ ...point, time: now, left: dx < 0 });
      trail = trail.filter((sample) => now - sample.time < 3200);

      if (now < powerUntil) {
        // Power mode: blue ghosts flee in a line and Pac-Man follows them.
        ghosts.forEach((ghost, index) => {
          const sample = sampleAt(now - index * 150);
          place(ghost, sample, 0, sample.left);
        });
        const pacSample = sampleAt(now - 720);
        place(pacman, pacSample, 0, pacSample.left);
      } else {
        // Normal mode: Pac-Man runs first and the phantoms chase in a line.
        const pacSample = sampleAt(now);
        place(pacman, pacSample, 0, pacSample.left);
        ghosts.forEach((ghost, index) => {
          const sample = sampleAt(now - 420 - index * 210);
          place(ghost, sample, 0, sample.left);
        });
      }

      frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      point = {
        x: Math.min(point.x, Math.max(28, window.innerWidth - 40)),
        y: Math.min(point.y, Math.max(110, window.innerHeight - 40)),
      };
      target = randomPoint();
      trail = [];
      if (powerArmed) {
        hidePower();
        nextPowerAt = performance.now() + 5000 + Math.random() * 9000;
      }
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
      <span className="vi-power-pellet" data-chase="power" hidden />
      <span className="vi-ambient-hunter" data-chase="pacman">
        <span className="vi-pac-hunter" />
      </span>
      <span className="vi-ambient-ghost" data-chase="ghost">
        <Ghost size={16} tone="violet" />
      </span>
      <span className="vi-ambient-ghost" data-chase="ghost">
        <Ghost size={16} tone="cyan" />
      </span>
      <span className="vi-ambient-ghost" data-chase="ghost">
        <Ghost size={16} tone="pink" />
      </span>
    </div>
  );
}
