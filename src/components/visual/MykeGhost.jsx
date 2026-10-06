import { useEffect, useRef, useState } from "react";

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
  sad: ["vi-myke-sad", 9, 2],
};

export default function MykeGhost({
  className = "",
  pose = "idle",
  gaze = 0,
  thinkingHoldMs = 560,
}) {
  const [visualPose, setVisualPose] = useState(pose);
  const visualPoseRef = useRef(pose);
  const thinkingStartedAt = useRef(0);

  useEffect(() => {
    const updatePose = (next) => {
      visualPoseRef.current = next;
      setVisualPose(next);
    };

    if (pose === "thinking") {
      thinkingStartedAt.current = Date.now();
      updatePose("thinking");
      return undefined;
    }

    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ||
      document.body.classList.contains("vi-performance-motion-off");
    const elapsed = Date.now() - thinkingStartedAt.current;
    const remaining =
      !reducedMotion && visualPoseRef.current === "thinking"
        ? Math.max(0, thinkingHoldMs - elapsed)
        : 0;
    const timer = window.setTimeout(() => updatePose(pose), remaining);
    return () => window.clearTimeout(timer);
  }, [pose, thinkingHoldMs]);

  const [poseClass, row, duration] = poses[visualPose] || poses.idle;
  return (
    <span
      className={`vi-myke-ghost ${poseClass} ${className}`}
      aria-hidden="true"
      data-pose={visualPose}
      style={{
        "--vi-myke-row": row,
        "--vi-myke-duration": `${duration}s`,
        "--vi-myke-gaze-angle": `${Math.max(-1, Math.min(1, gaze)) * 4}deg`,
        "--vi-myke-gaze": `${Math.max(-1, Math.min(1, gaze)) * 2}px`,
      }}
    >
      <span
        className="vi-myke-sprite"
        style={{
          backgroundImage: `url("${import.meta.env.BASE_URL}myke/myke-sprites.svg")`,
        }}
      />
    </span>
  );
}
