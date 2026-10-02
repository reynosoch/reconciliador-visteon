import { RubberDrawer } from "../visual/ScrollEffects.jsx";
// src/components/help/HelpDrawer.jsx
import OverlayPortal from "../shell/OverlayPortal.jsx";
import { HELP, sourceHelpInfo } from "./helpContent.js";
export function HelpButton({
 topic,
 onHelp,
 className = "",
}) {
 const openHelp = (event) => {
   event.stopPropagation();
   onHelp?.(topic);
 };
 return (
<span
     role="button"
     tabIndex={0}
     onClick={openHelp}
     onKeyDown={(event) => {
       if (
         event.key === "Enter" ||
         event.key === " "
       ) {
         event.preventDefault();
         openHelp(event);
       }
     }}
     title="¿De dónde sale este dato?"
     aria-label="Explicar el origen y cálculo de este dato"
     className={`vi-help-trigger ${className}`}
>
     ?
</span>
 );
}
export default function HelpDrawer({
 topic,
 sources,
 onClose,
}) {
 if (!topic) {
   return null;
 }
 const info =
   sourceHelpInfo(topic, sources) ||
   HELP[topic] ||
   HELP.overview;
 return (
<OverlayPortal onClose={onClose}>
<div
     className="vi-drawer-backdrop fixed inset-0 z-[120] bg-black/55 backdrop-blur-[2px]"
     onMouseDown={(event) => {
       if (
         event.target ===
         event.currentTarget
       ) {
         onClose?.();
       }
     }}
>
<RubberDrawer
       className="
         vi-drawer-panel
         absolute
         top-0
         right-0
         bottom-0
         w-full
         max-w-[470px]
         bg-[#06111b]
         border-l
         border-slate-700/60
         shadow-[-30px_0_90px_rgba(0,0,0,.45)]
         overflow-y-auto
       "
>
<div
         className="
           sticky
           top-0
           z-10
           bg-[#06111b]/95
           backdrop-blur-xl
           px-6
           py-5
           border-b
           border-slate-800
         "
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="vi-eyebrow">
               {info.eyebrow}
</p>
<h2 className="mt-1 text-xl font-black text-white vi-glow-title">
               {info.title}
</h2>
</div>
<button type="button" onClick={onClose} className="vi-icon-close" aria-label="Cerrar ayuda">×</button>
</div>
</div>
<div className="p-6">
<p className="text-sm leading-relaxed text-slate-300">
           <strong className="help-label block mb-2">QUÉ SIGNIFICA</strong>
           {info.description}
</p>
<section className="mt-7">
<p className="help-label">
             FUENTE
</p>
<div className="help-block">
             {info.source}
</div>
</section>
<section className="mt-5">
<p className="help-label">
             {info.methodLabel || "CÓMO SE CALCULA"}
</p>
<pre className="help-formula">
             {info.formula}
</pre>
</section>
<section className="mt-5">
<p className="help-label">
             OBSERVACIONES / DETALLES
</p>
<div className="space-y-3 mt-3">
             {info.notes.map(
               (note, index) => (
<div
                   key={index}
                   className="flex gap-3"
>
<span className="text-yellow-400 mt-[2px]">
                     •
</span>
<p className="text-sm leading-relaxed text-slate-300">{note}</p>
</div>
               )
             )}
</div>
</section>
</div>
</RubberDrawer>
</div>
</OverlayPortal>
 );
}
