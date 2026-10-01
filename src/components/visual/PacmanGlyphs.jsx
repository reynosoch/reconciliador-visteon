// src/components/visual/PacmanGlyphs.jsx
import { useEffect, useRef } from "react";

export function PacDot({ size = 8, className = "" }) {
  return (
    <span
      className={`pac-dot ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function Ghost({ size = 16, tone = "violet", className = "" }) {
  return (
    <span
      className={`ghost-sprite ghost-${tone} ${className}`}
      style={{ width: size, height: size }}
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
      className={`pac-pellet-rail ${muted ? "pac-pellet-rail-muted" : ""} ${className}`}
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
    const pellets = [...host.querySelectorAll('[data-chase="power"]')];
    const fruits = [...host.querySelectorAll('[data-chase="fruit"]')];
    const score = host.querySelector('[data-chase="score"]');

    let frame = 0;
    let last = 0;
    let lastPaint = 0;
    let pauseUntil = 0;
    let point = { x: 48, y: 180 };
    let target = { ...point };
    let trail = [];
    let powerUntil = 0;
    let targetPellet = null;
    let nextPowerAt = performance.now() + 5000 + Math.random() * 7000;
    let scoreUntil = 0;

    const randomPoint = () => ({
      x: 28 + Math.random() * Math.max(1, window.innerWidth - 78),
      y: 105 + Math.random() * Math.max(1, window.innerHeight - 165),
    });

    const setPosition = (element, p) => {
      if (!element || !p) return;
      element.dataset.x = String(p.x);
      element.dataset.y = String(p.y);
      element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    };

    const readPosition = (element) => ({
      x: Number(element?.dataset.x) || 0,
      y: Number(element?.dataset.y) || 0,
    });

    const scatterDecorations = () => {
      pellets.forEach((pellet) => {
        pellet.hidden = false;
        setPosition(pellet, randomPoint());
      });
      fruits.forEach((fruit) => {
        fruit.hidden = false;
        setPosition(fruit, randomPoint());
      });
    };

    const sampleAt = (wanted) =>
      trail.findLast((sample) => sample.time <= wanted) || trail[0] || point;

    const place = (element, sample, faceLeft = false) => {
      if (!element || !sample) return;
      element.style.transform = `translate3d(${sample.x}px, ${sample.y}px, 0)`;
      const face = element.querySelector(".vi-pac-hunter");
      if (face) face.style.transform = faceLeft ? "scaleX(-1)" : "scaleX(1)";
    };

    const setPowerMode = (active) => {
      host.classList.toggle("is-power-mode", active);
    };

    const showScore = (p, value = "+100") => {
      if (!score) return;
      score.textContent = value;
      score.style.transform = `translate3d(${p.x}px, ${p.y - 12}px, 0)`;
      score.classList.remove("is-visible");
      void score.offsetWidth;
      score.classList.add("is-visible");
      scoreUntil = performance.now() + 1000;
    };

    const choosePower = () => {
      const available = pellets.filter((pellet) => !pellet.hidden);
      if (!available.length) {
        scatterDecorations();
      }
      const candidates = pellets.filter((pellet) => !pellet.hidden);
      targetPellet = candidates[Math.floor(Math.random() * candidates.length)] || null;
      if (targetPellet) target = readPosition(targetPellet);
    };

    const eatPower = (now) => {
      if (!targetPellet) return;
      const pelletPoint = readPosition(targetPellet);
      targetPellet.hidden = true;
      showScore(pelletPoint, "+50");
      targetPellet = null;
      powerUntil = now + 6500 + Math.random() * 3000;
      setPowerMode(true);
      nextPowerAt = powerUntil + 5000 + Math.random() * 9000;
      target = randomPoint();
    };

    const checkFruit = (now) => {
      for (const fruit of fruits) {
        if (fruit.hidden) continue;
        const p = readPosition(fruit);
        if (Math.hypot(point.x - p.x, point.y - p.y) < 20) {
          fruit.hidden = true;
          showScore(p, "+100");
          window.setTimeout(() => {
            if (!host.isConnected) return;
            setPosition(fruit, randomPoint());
            fruit.hidden = false;
          }, 3500 + Math.random() * 3500);
          break;
        }
      }
      if (score && now > scoreUntil) score.classList.remove("is-visible");
    };

    const chooseRoamTarget = () => {
      const visibleFruit = fruits.filter((fruit) => !fruit.hidden);
      if (visibleFruit.length && Math.random() < 0.28) {
        target = readPosition(visibleFruit[Math.floor(Math.random() * visibleFruit.length)]);
      } else {
        target = randomPoint();
      }
    };

    scatterDecorations();
    chooseRoamTarget();

    const tick = (now) => {
      if (reducedMotion.matches || document.hidden || now < pauseUntil) {
        last = now;
        frame = requestAnimationFrame(tick);
        return;
      }
      if (lastPaint && now - lastPaint < 34) {
        frame = requestAnimationFrame(tick);
        return;
      }
      lastPaint = now;

      const powered = now < powerUntil;
      if (!powered && host.classList.contains("is-power-mode")) {
        setPowerMode(false);
      }
      if (!powered && !targetPellet && now >= nextPowerAt) choosePower();

      const elapsed = last ? Math.min(now - last, 64) / 1000 : 0;
      last = now;
      const dx = target.x - point.x;
      const dy = target.y - point.y;
      const distance = Math.hypot(dx, dy);
      const speed = powered ? 104 : 78;
      const step = Math.min(distance, speed * elapsed);

      if (distance < 9) {
        if (targetPellet) {
          eatPower(now);
        } else {
          chooseRoamTarget();
        }
      } else {
        point = {
          x: point.x + (dx / distance) * step,
          y: point.y + (dy / distance) * step,
        };
      }

      checkFruit(now);
      trail.push({ ...point, time: now, left: dx < 0 });
      trail = trail.filter((sample) => now - sample.time < 4200);

      if (now < powerUntil) {
        // Frightened mode: blue phantoms stay well ahead and Pac-Man hunts them.
        ghosts.forEach((ghost, index) => {
          const sample = sampleAt(now - index * 380);
          place(ghost, sample, sample.left);
        });
        const pacSample = sampleAt(now - 1050);
        place(pacman, pacSample, pacSample.left);
      } else {
        // Normal mode: Pac-Man flees and phantoms follow with visible spacing.
        const pacSample = sampleAt(now);
        place(pacman, pacSample, pacSample.left);
        ghosts.forEach((ghost, index) => {
          const sample = sampleAt(now - 650 - index * 420);
          place(ghost, sample, sample.left);
        });
      }

      frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      point = {
        x: Math.min(point.x, Math.max(28, window.innerWidth - 40)),
        y: Math.min(point.y, Math.max(105, window.innerHeight - 40)),
      };
      targetPellet = null;
      chooseRoamTarget();
      trail = [];
      scatterDecorations();
      nextPowerAt = performance.now() + 4000 + Math.random() * 7000;
    };

    const pauseForScroll = () => {
      pauseUntil = performance.now() + 190;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("wheel", pauseForScroll, { passive: true });
    window.addEventListener("touchmove", pauseForScroll, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("wheel", pauseForScroll);
      window.removeEventListener("touchmove", pauseForScroll);
    };
  }, []);

  return (
    <div ref={root} className="vi-ambient-chase vi-random-chase" aria-hidden="true">
      <span className="vi-power-pellet" data-chase="power" />
      <span className="vi-power-pellet" data-chase="power" />
      <span className="vi-power-pellet" data-chase="power" />

      <span className="vi-arcade-fruit vi-fruit-cherry" data-chase="fruit">●●</span>
      <span className="vi-arcade-fruit vi-fruit-orange" data-chase="fruit">●</span>
      <span className="vi-arcade-fruit vi-fruit-berry" data-chase="fruit">◆</span>
      <span className="vi-arcade-score" data-chase="score">+100</span>

      <span className="vi-ambient-hunter" data-chase="pacman">
        <span className="vi-pac-hunter" />
      </span>
      <span className="vi-ambient-ghost" data-chase="ghost">
        <Ghost size={17} tone="violet" />
      </span>
      <span className="vi-ambient-ghost" data-chase="ghost">
        <Ghost size={17} tone="cyan" />
      </span>
      <span className="vi-ambient-ghost" data-chase="ghost">
        <Ghost size={17} tone="pink" />
      </span>
    </div>
  );
}
