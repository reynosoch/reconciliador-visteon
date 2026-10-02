import { useMemo } from "react";
import { Ghost } from "../visual/PacmanGlyphs";
import { HelpButton } from "../help/HelpDrawer";
import { money, moneyTone } from "./inventoryWorkspaceSupport.js";

function ObsoleteIcon() {
 return (
<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
<path d="M4 8.5A8 8 0 0 1 18.5 6"/><path d="M18.5 3v3h-3"/>
<path d="M20 15.5A8 8 0 0 1 5.5 18"/><path d="M5.5 21v-3h3"/>
<path d="M9 9h6v6H9z"/>
</svg>
 );
}

export default function InventoryRadar({
 rows,
 onSelectPart,
 onHelp,
}) {
 const ghosts = useMemo(
   () => rows
     .filter((item) => item?.master?.isPhantom === true)
     .sort((a,b) => Math.abs(Number(b?.financial?.netUsd)||0)-Math.abs(Number(a?.financial?.netUsd)||0))
     .slice(0,6),
   [rows]
 );
 const obsolete = useMemo(
   () => rows
     .filter((item) => item?.flags?.isObsolete === true && Number(item?.financial?.obsoleteGainUsd || 0) > 0)
     .sort((a,b) => Number(b?.financial?.obsoleteGainUsd||0)-Number(a?.financial?.obsoleteGainUsd||0))
     .slice(0,6),
   [rows]
 );

 const list = (items, empty) => items.length ? (
<div className="space-y-1">
 {items.map((item) => (
<button
  type="button"
  key={item.partNumber}
  onClick={() => onSelectPart?.(item)}
  className="vi-radar-row"
>
<span className="vi-radar-pn">{item.partNumber}</span>
<span className={`vi-money text-[11px] ${moneyTone(item?.financial?.netUsd)}`}>
 {money(item?.financial?.netUsd)}
</span>
</button>
 ))}
</div>
 ) : <p className="vi-radar-empty">{empty}</p>;

 return (
<aside className="vi-radar-stack">
<section className="vi-radar-card vi-liquid-mini">
<header className="vi-radar-card-head">
<div className="flex items-center gap-2">
<Ghost size={15} tone="violet" />
<span>PHANTOM RADAR</span>
</div>
<HelpButton topic="phantomRadar" onHelp={onHelp}/>
</header>
<p className="vi-radar-caption">Phantoms con las mayores diferencias en dólares.</p>
<div className="vi-radar-card-body">{list(ghosts,"No hay phantoms para mostrar.")}</div>
</section>

<section className="vi-radar-card vi-liquid-mini vi-obsolete-radar">
<header className="vi-radar-card-head">
<div className="flex items-center gap-2">
<span className="vi-obsolete-icon"><ObsoleteIcon/></span>
<span>OBSOLETOS +</span>
</div>
<HelpButton topic="obsoleteRadar" onHelp={onHelp}/>
</header>
<p className="vi-radar-caption">Material obsoleto con sobrante en dólares.</p>
<div className="vi-radar-card-body">{list(obsolete,"No hay obsoletos con sobrante.")}</div>
</section>
</aside>
 );
}

