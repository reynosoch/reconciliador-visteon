// src/components/shell/SourcesDrawer.jsx
import React, {
 useRef,
 useState,
} from "react";
import { HelpButton } from "../help/HelpDrawer";
import {
 REFERENCE_SOURCE_TYPES,
} from "../../hooks/useReferenceFiles";

const SOURCE_CONFIG = [
 {
   type:
     REFERENCE_SOURCE_TYPES.AREAS,
   label:
     "Áreas 4Wall",
   description: "Ubica cada área escaneada en QAD.",
   topic: "physical",
   short:
     "AREAS",
   suggested:
     "4Wall-Area.csv",
 },
 {
   type:
     REFERENCE_SOURCE_TYPES.QAD,
   label:
     "QAD 3.2",
   description: "Inventario esperado al detener la planta.",
   topic: "qad",
   short:
     "QAD",
   suggested:
     "Congelado QAD 3.2*.csv",
 },
 {
   type:
     REFERENCE_SOURCE_TYPES.ISPBB,
   label:
     "ISPBB",
   description: "Define qué materiales son Phantom.",
   topic: "phantom",
   short:
     "ISPBB",
   suggested:
     "ISPBB*.csv",
 },
 {
   type:
     REFERENCE_SOURCE_TYPES.BOM,
   label:
     "BOM Export",
   description: "Relaciona padres y componentes.",
   topic: "bomReview",
   short:
     "BOM",
   suggested:
     "BOM*.csv",
 },
 {
   type:
     REFERENCE_SOURCE_TYPES.COST,
   label:
     "Cost Part",
   description: "Costo para valorar las diferencias.",
   topic: "cost",
   short:
     "COST",
   suggested:
     "Cost Part*.csv",
 },
];

async function detectSource(file) {
 const name =
   String(
     file.name || ""
   ).toLowerCase();

 if (
   /4wall.*area|area.*4wall/.test(
     name
   )
 ) {
   return "areas";
 }

 if (
   /ispbb|50[._ -]?1[._ -]?4[._ -]?22/.test(
     name
   )
 ) {
   return "ispbb";
 }

 if (
   /cost.*part|part.*cost/.test(
     name
   )
 ) {
   return "cost";
 }

 if (
   /bom|50[._ -]?13[._ -]?8[._ -]?16/.test(
     name
   )
 ) {
   return "bom";
 }

 if (
   /qad.*3[._ -]?2|congelado.*qad|inventory.*detail/.test(
     name
   )
 ) {
   return "qad";
 }

 try {
   const sample =
     (
       await file
         .slice(0, 6000)
         .text()
     ).toUpperCase();

   if (
     sample.includes(
       "LOCALIDAD QAD"
     ) &&
     sample.includes(
       "NOMBRE"
     )
   ) {
     return "areas";
   }

   if (
     sample.includes(
       "QTY ON HAND - INV MSTR"
     ) &&
     sample.includes(
       "QUANTITY ON HAND"
     )
   ) {
     return "qad";
   }

   if (
     sample.includes(
       "BUYER/PLANNER"
     ) &&
     sample.includes(
       "PHANTOM"
     )
   ) {
     return "ispbb";
   }

   if (
     sample.includes(
       "PARENT ITEM"
     ) &&
     sample.includes(
       "COMPONENT"
     ) &&
     sample.includes(
       "USAGE"
     )
   ) {
     return "bom";
   }

   if (
     sample.includes(
       "COST TOTAL"
     ) &&
     sample.includes(
       "MATERIAL LL"
     )
   ) {
     return "cost";
   }
 } catch {
   // filename detection remains valid fallback
 }

 return null;
}

function SourceLine({
 config,
 source,
 loadFile,
 clearFile,
 onHelp,
}) {
 const input =
   useRef(null);

 return (
<div
     className="vi-source-line grid grid-cols-[1fr_auto] gap-3"
>
<input
       ref={input}
       type="file"
       accept=".csv,.txt"
       className="hidden"
       onChange={async (
         event
       ) => {
         const file =
           event.target
             .files?.[0];
         if (file) {
           await loadFile(
             config.type,
             file
           );
         }
         event.target.value =
           "";
       }}
     />

<div className="min-w-0">
<div className="flex items-center gap-2">
<span
           className={`
             w-1.5
             h-1.5
             rounded-full
             ${
               source?.loaded
                 ? "bg-emerald-400"
                 : source?.error
                   ? "bg-rose-500"
                   : source?.loading
                     ? "bg-amber-400 animate-pulse"
                     : "bg-slate-700"
             }
           `}
         />
<span className="text-xs font-bold text-slate-200">
           {config.label}
</span>
<HelpButton topic={config.topic} onHelp={onHelp} />

<span
           className="
             font-mono
             text-[11px]
             text-slate-700
           "
>
           {source?.loaded
             ? "LISTO"
             : "EN ESPERA"}
</span>
</div>

<p className="vi-source-description">{config.description}</p>

       {source?.loaded ? (
<>
<p
             className="
               mt-1.5
               font-mono
               text-[11px]
               text-slate-500
               truncate
             "
>
             {source.fileName}
</p>
<p
             className="
               mt-1
               font-mono
               text-[11px]
               text-slate-700
             "
>
             {Number(
               source.rows
                 ?.length || 0
             ).toLocaleString(
               "en-US"
             )}{" "}
             FILAS
</p>
</>
       ) : (
<p
           className="
             mt-1.5
             font-mono
             text-[11px]
             text-slate-700
           "
>
           Ejemplo:{" "}
           {config.suggested}
</p>
       )}
</div>

<div className="flex items-center gap-2">
<button
         type="button"
         onClick={() =>
           input.current?.click()
         }
         className="source-mini-button"
>
         {source?.loaded
           ? "REEMPLAZAR"
           : "CARGAR"}
</button>

       {source?.loaded && (
<button
           type="button"
           onClick={() =>
             clearFile(
               config.type
             )
           }
           className="source-clear-button"
           aria-label={`Quitar ${config.label}`}
>
           ×
</button>
       )}
</div>
</div>
 );
}

export default function SourcesDrawer({
 open = false,
 sources,
 status,
 loadFile,
 clearFile,
 clearAll,
 onHelp,
 onClose,
}) {
 const bulkInput =
   useRef(null);

 const [
   unknownFiles,
   setUnknownFiles,
 ] = useState([]);

 const [
   processing,
   setProcessing,
 ] = useState(false);

 if (!open) {
   return null;
 }

 const loaded =
   status?.loadedCount || 0;
 const total =
   status?.totalSources || 5;

 const handleBulkFiles =
   async (event) => {
     const files =
       Array.from(
         event.target.files ||
           []
       );

     if (
       files.length === 0
     ) {
       return;
     }

     setProcessing(true);
     setUnknownFiles([]);

     const unknown = [];

     try {
       for (
         const file of files
       ) {
         const detected =
           await detectSource(
             file
           );

         if (!detected) {
           unknown.push(
             file.name
           );
           continue;
         }

         await loadFile(
           detected,
           file
         );
       }
     } finally {
       setUnknownFiles(
         unknown
       );
       setProcessing(false);
       event.target.value =
         "";
     }
   };

 return (
<div
     className="
       vi-drawer-backdrop
       fixed
       inset-0
       z-[100]
       bg-black/55
       backdrop-blur-[2px]
     "
     onMouseDown={(
       event
     ) => {
       if (
         event.target ===
         event.currentTarget
       ) {
         onClose?.();
       }
     }}
>
<aside
       className="
         vi-drawer-panel
         absolute
         right-0
         top-0
         bottom-0
         w-full
         max-w-[470px]
         bg-[#06111b]
         border-l
         border-slate-700/60
         shadow-[-30px_0_90px_rgba(0,0,0,.5)]
         overflow-y-auto
       "
>
<input
         ref={bulkInput}
         type="file"
         accept=".csv,.txt"
         multiple
         className="hidden"
         onChange={
           handleBulkFiles
         }
       />

<div
         className="
           sticky
           top-0
           z-10
           bg-[#06111b]/95
           backdrop-blur-xl
           border-b
           border-slate-800
           px-5
           py-5
         "
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="vi-eyebrow">
               ARCHIVOS DE REFERENCIA
</p>
<h2 className="mt-1 text-xl font-black text-white">
               Fuentes del inventario
</h2>
<p className="mt-1 text-[11px] text-slate-600">
               Selecciona los cinco archivos juntos; el sistema identifica cada fuente.
</p>
</div>

<button
             type="button"
             onClick={onClose}
             className="vi-button"
>
             CERRAR
</button>
</div>

<button
           type="button"
           disabled={processing}
           onClick={() =>
             bulkInput.current
               ?.click()
           }
           className="
             mt-5
             w-full
             source-package-button
           "
>
<span>
             {processing
               ? "IDENTIFICANDO ARCHIVOS..."
               : "CARGAR ARCHIVOS DE INVENTARIO"}
</span>
<span className="text-orange-300">
             {loaded}/{total}
</span>
</button>

<div
           className="
             mt-3
             grid
             grid-cols-5
             gap-1
           "
>
           {SOURCE_CONFIG.map(
             (item) => (
<div
                 key={
                   item.type
                 }
                 className={`
                   source-progress-node
                   ${
                     sources?.[
                       item.type
                     ]?.loaded
                       ? "source-progress-ready"
                       : ""
                   }
                 `}
>
                 {item.short}
</div>
             )
           )}
</div>
</div>

<div className="px-5">
         {SOURCE_CONFIG.map(
           (config) => (
<SourceLine
               key={
                 config.type
               }
               config={
                 config
               }
               source={
                 sources?.[
                   config.type
                 ] || {}
               }
               loadFile={
                 loadFile
               }
               clearFile={
                 clearFile
               }
               onHelp={onHelp}
             />
           )
         )}
</div>

       {unknownFiles.length >
         0 && (
<div
           className="
             mx-5
             mt-5
             border
             border-amber-500/25
             bg-amber-500/[0.04]
             p-4
           "
>
<p
             className="
               font-mono
               text-[11px]
               font-black
               text-amber-400
             "
>
             ARCHIVOS NO RECONOCIDOS
</p>
           {unknownFiles.map(
             (file) => (
<p
                 key={file}
                 className="
                   mt-2
                   font-mono
                   text-[11px]
                   text-slate-500
                 "
>
                 {file}
</p>
             )
           )}
</div>
       )}

<div
         className="
           mx-5
           mt-5
           p-4
           border
           border-slate-800
           bg-black/10
         "
>
<p className="help-label">
           NOMBRES SUGERIDOS
</p>
<div
           className="
             mt-3
             space-y-1.5
             font-mono
             text-[11px]
             text-slate-600
           "
>
<p>4Wall-Area.csv</p>
<p>Congelado QAD 3.2 09.24.csv</p>
<p>ISPBB 179A 09.24.26.csv</p>
<p>BOM_Extract.csv</p>
<p>Cost Part Browse.csv</p>
</div>
</div>

       {loaded > 0 && (
<div className="p-5">
<button
             type="button"
             onClick={
               clearAll
             }
             className="
               vi-button
               w-full
               text-rose-400
             "
>
             BORRAR TODAS LAS FUENTES
</button>
</div>
       )}
</aside>
</div>
 );
}
