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

/**
* Referencia Pac-Man low-key.
*
* Los Phantoms avanzan primero y el punto
* amarillo va detrás de ellos lentamente.
*/
export function MenuChaseRail({
 className = "",
}) {
 return (
<div
     className={`
       menu-chase
       ${className}
     `}
     aria-hidden="true"
>
<div className="menu-chase-pellets" />
<div className="menu-chase-ghosts">
<Ghost
         size={10}
         tone="cyan"
       />
<Ghost
         size={10}
         tone="violet"
       />
<Ghost
         size={10}
         tone="rose"
       />
</div>
<div className="menu-chase-player">
<PacDot
         size={7}
       />
</div>
</div>
 );
}