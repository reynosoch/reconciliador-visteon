// src/components/visual/PacmanGlyphs.jsx
import React from "react";

export function PacDot({
 size = 8,
 className = "",
}) {
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

export function Ghost({
 size = 16,
 tone = "violet",
 className = "",
}) {
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

export function PelletRail({
 muted = false,
 className = "",
}) {
 return (
<div
     className={`
       pac-pellet-rail
       ${
         muted
           ? "pac-pellet-rail-muted"
           : ""
       }
       ${className}
     `}
   />
 );
}

export function AmbientChase() {
 return (
  <div className="vi-ambient-chase" aria-hidden="true">
   <span className="vi-ambient-ghost"><Ghost size={16} tone="violet" /></span>
   <span className="vi-ambient-hunter"><span className="vi-pac-hunter" /></span>
  </div>
 );
}
