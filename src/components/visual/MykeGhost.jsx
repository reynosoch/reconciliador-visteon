import { useId } from "react";
const poses = {
  idle: "vi-myke-idle",
  welcome: "vi-myke-welcome",
  typing: "vi-myke-typing",
  reading: "vi-myke-reading",
  dragging: "vi-myke-dragging",
  landing: "vi-myke-landing",
};
export default function MykeGhost({
  className = "",
  pose = "idle",
  gaze = 0,
  color = "#f5821f",
}) {
  const gradient = useId();
  return (
    <svg
      className={`vi-myke-ghost ${poses[pose] || poses.idle} ${className}`}
      viewBox="0 0 96 104"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="20"
          y1="12"
          x2="76"
          y2="94"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff1de" />
          <stop offset=".55" stopColor={color} stopOpacity=".75" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <ellipse
        className="vi-myke-shadow"
        cx="48"
        cy="98"
        rx="22"
        ry="3"
        fill="#020f18"
        opacity=".2"
      />
      <g className="vi-myke-float">
        <path
          d="M14 49c0-24 14-37 34-37s34 13 34 37v29c0 8-5 13-12 8-4-3-6-3-10 1-7 7-17 7-24 0-4-4-6-4-10-1-7 5-12 0-12-8V49Z"
          fill={`url(#${gradient})`}
          stroke="#fff1de"
          strokeWidth="1.5"
        />
        <path
          d="M15 57c-7 0-10 5-9 9M81 55c6-1 9-6 8-10"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M25 33c3-7 9-12 16-14"
          stroke="white"
          strokeOpacity=".5"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <g>
          <path
            d="M15 72l9-7 14 4 10 5 10-5 14-4 9 7-5 11-8-4v9H28v-9l-8 4-5-11Z"
            fill="#124258"
            stroke="#73a4b5"
            strokeWidth="1.2"
          />
          <path
            d="M37 69l11 5-6 6-8-9M59 69l-11 5 6 6 8-9"
            fill="#1e5b72"
            stroke="#a5c9d3"
            strokeWidth="1"
          />
          <path d="M48 75v11" stroke="#75a5b7" strokeWidth="1" />
          <circle cx="48" cy="79" r="1" fill="#e7f4f7" />
          <text
            x="64"
            y="80"
            textAnchor="middle"
            fill="#fff8ef"
            fontSize="5.5"
            fontFamily="Arial, sans-serif"
            fontWeight="700"
          >
            visteon
          </text>
        </g>
        <ellipse cx="25" cy="61" rx="7" ry="4" fill="#ed8559" opacity=".45" />
        <ellipse cx="71" cy="61" rx="7" ry="4" fill="#ed8559" opacity=".45" />
        <g className="vi-myke-eyes">
          <ellipse cx="34" cy="47" rx="9" ry="11" fill="#fffaf2" />
          <ellipse cx="62" cy="47" rx="9" ry="11" fill="#fffaf2" />
          <g
            className="vi-myke-pupils"
            style={{
              transform: `translate(${Math.max(-1, Math.min(1, gaze)) * 3}px, ${pose === "typing" ? 2 : 0}px)`,
            }}
          >
            <ellipse cx="35" cy="48" rx="4" ry="5" fill="#153749" />
            <ellipse cx="61" cy="48" rx="4" ry="5" fill="#153749" />
            <circle cx="36" cy="46" r="1.5" fill="white" />
            <circle cx="62" cy="46" r="1.5" fill="white" />
          </g>
        </g>
        <path
          d="M42 64c2 5 10 5 12 0"
          stroke="#714127"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
