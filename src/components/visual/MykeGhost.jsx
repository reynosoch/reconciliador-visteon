import { useId } from "react";

export default function MykeGhost({ className = "" }) {
  const gradient = useId();
  return (
    <svg
      className={`vi-myke-ghost ${className}`}
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
          <stop stopColor="#f4fcff" />
          <stop offset=".55" stopColor="#b7d9e6" />
          <stop offset="1" stopColor="#599eb8" />
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
          stroke="#def4fd"
          strokeWidth="1.5"
        />
        <path
          d="M25 36c3-10 10-16 19-18"
          stroke="white"
          strokeOpacity=".65"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <g className="vi-myke-eyes">
          <ellipse cx="36" cy="46" rx="5.5" ry="8" fill="#0c3548" />
          <ellipse cx="60" cy="46" rx="5.5" ry="8" fill="#0c3548" />
          <circle cx="38" cy="43" r="1.8" fill="white" />
          <circle cx="62" cy="43" r="1.8" fill="white" />
        </g>
        <path
          d="M42 61c3 4 9 4 12 0"
          stroke="#22536b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="39" y="70" width="18" height="7" rx="3.5" fill="#f5821f" />
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
