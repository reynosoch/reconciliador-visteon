import { useEffect, useId, useRef } from "react";
import { safeReadJson, safeWriteJson } from "../../services/browserStorage.js";

const POSITION_KEY = "visteon.ui.mykePosition.v1";
const EDGE_GAP = 10;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function MykeGhost({ className = "", watching = false }) {
  const gradient = useId();
  const svgRef = useRef(null);

  useEffect(() => {
    const button = svgRef.current?.closest(".vi-myke-launcher");
    if (!button) return undefined;

    let position = safeReadJson(POSITION_KEY, {
      side: "left",
      yRatio: 0.76,
    }).value;
    if (!position || !["left", "right"].includes(position.side)) {
      position = { side: "left", yRatio: 0.76 };
    }
    let drag = null;
    let blockClick = false;

    const placeAtEdge = () => {
      const rect = button.getBoundingClientRect();
      const verticalRange = Math.max(
        0,
        window.innerHeight - rect.height - EDGE_GAP * 2,
      );
      const ratio = clamp(Number(position.yRatio) || 0, 0, 1);
      button.style.top = `${EDGE_GAP + verticalRange * ratio}px`;
      button.style.bottom = "auto";
      if (position.side === "right") {
        button.style.left = "auto";
        button.style.right = `${EDGE_GAP}px`;
      } else {
        button.style.left = `${EDGE_GAP}px`;
        button.style.right = "auto";
      }
      button.dataset.side = position.side;
    };

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const rect = button.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        moved: false,
      };
      button.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      blockClick = true;
      button.classList.add("is-dragging");
      const rect = button.getBoundingClientRect();
      const maxLeft = Math.max(EDGE_GAP, window.innerWidth - rect.width - EDGE_GAP);
      const maxTop = Math.max(EDGE_GAP, window.innerHeight - rect.height - EDGE_GAP);
      button.style.left = `${clamp(drag.left + dx, EDGE_GAP, maxLeft)}px`;
      button.style.right = "auto";
      button.style.top = `${clamp(drag.top + dy, EDGE_GAP, maxTop)}px`;
      button.style.bottom = "auto";
    };

    const finishDrag = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      button.releasePointerCapture?.(event.pointerId);
      const moved = drag.moved;
      drag = null;
      button.classList.remove("is-dragging");
      if (!moved) return;

      const rect = button.getBoundingClientRect();
      const side = rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right";
      const verticalRange = Math.max(
        1,
        window.innerHeight - rect.height - EDGE_GAP * 2,
      );
      position = {
        side,
        yRatio: clamp((rect.top - EDGE_GAP) / verticalRange, 0, 1),
      };
      safeWriteJson(POSITION_KEY, position);
      requestAnimationFrame(placeAtEdge);
    };

    const preventClickAfterDrag = (event) => {
      if (!blockClick) return;
      blockClick = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    const onResize = () => requestAnimationFrame(placeAtEdge);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerup", finishDrag);
    button.addEventListener("pointercancel", finishDrag);
    button.addEventListener("click", preventClickAfterDrag, true);
    window.addEventListener("resize", onResize);
    requestAnimationFrame(placeAtEdge);

    return () => {
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerup", finishDrag);
      button.removeEventListener("pointercancel", finishDrag);
      button.removeEventListener("click", preventClickAfterDrag, true);
      window.removeEventListener("resize", onResize);
      button.classList.remove("is-dragging");
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={`vi-myke-ghost ${watching ? "is-watching" : ""} ${className}`}
      viewBox="0 0 96 104"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="20"
          y1="12"
          x2="78"
          y2="94"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffc27f" />
          <stop offset=".55" stopColor="#f5821f" />
          <stop offset="1" stopColor="#cc5a00" />
        </linearGradient>
      </defs>
      <ellipse
        className="vi-myke-shadow"
        cx="48"
        cy="98"
        rx="24"
        ry="4"
        fill="#020f18"
        opacity=".3"
      />
      <g className="vi-myke-float">
        <path
          d="M16 48C16 25 29 10 48 10s32 15 32 38v34c0 5-4 8-8 4l-8-7-8 8c-4 4-8 4-12 0l-8-8-8 7c-5 4-12 1-12-5V48Z"
          fill={`url(#${gradient})`}
          stroke="#ffd8ad"
          strokeWidth="1.5"
        />
        <path
          d="M25 36c3-10 10-16 19-18"
          stroke="white"
          strokeOpacity=".52"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <g className="vi-myke-eyes">
          <ellipse cx="36" cy="46" rx="7" ry="9" fill="#f7fbfd" />
          <ellipse cx="60" cy="46" rx="7" ry="9" fill="#f7fbfd" />
          <g className="vi-myke-pupils">
            <circle cx="37" cy="47" r="3" fill="#0b3043" />
            <circle cx="61" cy="47" r="3" fill="#0b3043" />
          </g>
        </g>
        <path
          d="M42 62c3 4 9 4 12 0"
          stroke="#173a4d"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="39" y="70" width="18" height="7" rx="3.5" fill="#123c50" />
        <path
          d="m45 72 3 3 3-3"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
