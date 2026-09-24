// src/components/visual/PacmanGlyphs.jsx
import React from "react";
export function PacDot({
 size = 10,
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
 size = 18,
 tone = "violet",
 className = "",
}) {
 return (
<span
     className={`ghost-sprite ghost-${tone} ${className}`}
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
     className={`pac-pellet-rail ${muted ? "pac-pellet-rail-muted" : ""} ${className}`}
   />
 );
}
export function GhostChaseLine({
 className = "",
}) {
 return (
<div className={`ghost-chase-line ${className}`}>
<div className="ghost-chase-track">
<div className="ghost-chase-pellets" />
<div className="ghost-pack">
<Ghost size={15} tone="cyan" />
<Ghost size={15} tone="violet" />
<Ghost size={15} tone="rose" />
</div>
<div className="pac-dot-runner">
<PacDot size={10} />
</div>
</div>
</div>
 );
}