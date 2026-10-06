const poses = {
  idle: ["vi-myke-idle", 0, 3.2],
  welcome: ["vi-myke-welcome", 1, 1.2],
  typing: ["vi-myke-typing", 2, 0.9],
  reading: ["vi-myke-reading", 3, 2.4],
  dragging: ["vi-myke-dragging", 4, 0.7],
  landing: ["vi-myke-landing", 5, 0.45],
  thinking: ["vi-myke-thinking", 6, 1.4],
  sleeping: ["vi-myke-sleeping", 7, 4],
  success: ["vi-myke-success", 8, 1.2],
};
export default function MykeGhost({ className = "", pose = "idle", gaze = 0 }) {
  const [poseClass, row, duration] = poses[pose] || poses.idle;
  return (
    <span
      className={`vi-myke-ghost ${poseClass} ${className}`}
      aria-hidden="true"
      data-pose={pose}
      style={{
        "--vi-myke-row": row,
        "--vi-myke-duration": `${duration}s`,
        "--vi-myke-gaze": `${Math.max(-1, Math.min(1, gaze)) * 2}px`,
      }}
    >
      <span
        className="vi-myke-sprite"
        style={{ backgroundImage: `url("${import.meta.env.BASE_URL}myke/myke-sprites.svg")` }}
      />
    </span>
  );
}
