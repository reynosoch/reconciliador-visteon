import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MykeGhost from "./MykeGhost.jsx";
import { safeReadJson, safeWriteJson } from "../../services/browserStorage.js";

const KEY = "visteon.ui.mykeDock.v1";
const clamp = (value, max) => Math.max(10, Math.min(value, Math.max(10, max)));
function initialDock() {
  const previous = safeReadJson("visteon.ui.mykePosition.v1", null).value;
  const value = safeReadJson(
    KEY,
    previous && ["left", "right"].includes(previous.side)
      ? { edge: previous.side, ratio: previous.yRatio }
      : null,
  ).value;
  return value &&
    ["left", "right", "top", "bottom"].includes(value.edge) &&
    Number.isFinite(value.ratio)
    ? { edge: value.edge, ratio: Math.max(0, Math.min(1, value.ratio)) }
    : { edge: "left", ratio: 1 };
}
export default function MykeMascot({ open, onOpen, onDisable }) {
  const root = useRef(null);
  const [sleeping, setSleeping] = useState(false);
  const [dock, setDock] = useState(initialDock);
  const [position, setPosition] = useState(null);
  const [landing, setLanding] = useState(false);
  const [lean, setLean] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (position || landing || open) return;
    const rest = setTimeout(() => setSleeping(true), 30000);
    return () => clearTimeout(rest);
  }, [position, landing, open]);
  const drag = useRef(null);
  const moved = useRef(false);
  const settle = (point) => {
    const maxX = Math.max(10, window.innerWidth - 122),
      maxY = Math.max(10, window.innerHeight - 142);
    const x = clamp(point.x, maxX),
      y = clamp(point.y, maxY);
    const edge = [
      ["left", x - 10],
      ["right", maxX - x],
      ["top", y - 10],
      ["bottom", maxY - y],
    ].sort((a, b) => a[1] - b[1])[0][0];
    // Reserve the report button's corner, while the other three edges remain reachable.
    const limitX =
      edge === "bottom" ? Math.max(10, window.innerWidth - 280) : maxX;
    const limitY =
      edge === "right" ? Math.max(10, window.innerHeight - 210) : maxY;
    const next = {
      edge,
      ratio:
        edge === "left" || edge === "right"
          ? (Math.min(y, limitY) - 10) / Math.max(1, limitY - 10)
          : (Math.min(x, limitX) - 10) / Math.max(1, limitX - 10),
    };
    setDock(next);
    setPosition(null);
    setLean(0);
    setLanding(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLanding(false), 450);
    safeWriteJson(KEY, next);
  };
  const style = position
    ? { left: position.x, top: position.y }
    : {
        left:
          dock.edge === "left"
            ? "10px"
            : dock.edge === "right"
              ? "calc(100vw - 122px)"
              : `max(10px, calc(10px + (100vw - ${dock.edge === "bottom" ? 290 : 132}px) * ${dock.ratio}))`,
        top:
          dock.edge === "top"
            ? "max(10px, env(safe-area-inset-top))"
            : dock.edge === "bottom"
              ? "max(10px, calc(100dvh - 142px))"
              : `max(10px, calc(10px + (100dvh - ${dock.edge === "right" ? 220 : 152}px) * ${dock.ratio}))`,
      };
  return createPortal(
    <div
      className="vi-myke-dock"
      ref={root}
      style={{ ...style, "--vi-myke-lean": `${lean}deg` }}
      data-edge={dock.edge}
      data-awake={Boolean(position)}
    >
      <button
        type="button"
        className="vi-myke-launcher"
        aria-label="Chatear con Myke"
        title="Arrástrame a un borde o toca para conversar"
        aria-description="Arrástrame a un borde. También puedes moverme con las flechas del teclado."
        aria-expanded={open}
        // The mascot owns this touch gesture; do not also trigger the edge menu swipe.
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        onTouchCancel={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary) return;
          const box = event.currentTarget.getBoundingClientRect();
          drag.current = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            x: box.left,
            y: box.top,
          };
          setSleeping(false);
          clearTimeout(timer.current);
          setLanding(false);
          moved.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const origin = drag.current;
          if (!origin || event.pointerId !== origin.id) return;
          const dx = event.clientX - origin.startX,
            dy = event.clientY - origin.startY;
          if (Math.hypot(dx, dy) > 6) moved.current = true;
          if (moved.current) {
            setLean(Math.max(-14, Math.min(14, dx / 12)));
            setPosition({
              x: clamp(origin.x + dx, window.innerWidth - 122),
              y: clamp(origin.y + dy, window.innerHeight - 142),
            });
          }
        }}
        onPointerUp={(event) => {
          const origin = drag.current;
          if (!origin || event.pointerId !== origin.id) return;
          if (moved.current)
            settle({
              x: origin.x + event.clientX - origin.startX,
              y: origin.y + event.clientY - origin.startY,
            });
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
          moved.current = true;
          setPosition(null);
          setLean(0);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
          setPosition(null);
        }}
        onKeyDown={(event) => {
          const delta = {
            ArrowLeft: [-24, 0],
            ArrowRight: [24, 0],
            ArrowUp: [0, -24],
            ArrowDown: [0, 24],
          }[event.key];
          if (!delta) return;
          event.preventDefault();
          const box = event.currentTarget.getBoundingClientRect();
          setPosition({
            x: clamp(box.left + delta[0], window.innerWidth - 122),
            y: clamp(box.top + delta[1], window.innerHeight - 142),
          });
        }}
        onKeyUp={(event) => {
          if (event.key.startsWith("Arrow") && position) settle(position);
        }}
        onClick={() => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          setSleeping(false);
          onOpen(root.current.getBoundingClientRect());
        }}
      >
        <MykeGhost
          pose={position ? "dragging" : landing ? "landing" : sleeping ? "sleeping" : "idle"}
          gaze={lean / 14}
        />
      </button>
      <button
        type="button"
        className="vi-myke-hide"
        aria-label="Ocultar Myke"
        title="Ocultar Myke; el chat sigue en el menú"
        onClick={onDisable}
      >
        ×
      </button>

    </div>,
    document.body,
  );
}
