// src/components/shell/SourcesDrawer.jsx
import React, {
 useRef,
 useState,
} from "react";
import {
 REFERENCE_SOURCE_TYPES,
} from "../../hooks/useReferenceFiles";

const SOURCE_CONFIG = [
 {
   type:
     REFERENCE_SOURCE_TYPES.AREAS,
   label:
     "4Wall Areas",
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
}) {
 const input =
   useRef(null);

 return (
<div
     className="
       grid
       grid-cols-[1fr_auto]
       gap-3
       py-3.5
       border-b
       border-slate-800/70
     "
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

<span
           className="
             font-mono
             text-[7px]
             text-slate-700
           "
>
           {source?.loaded
             ? "READY"
             : "WAIT"}
</span>
</div>

       {source?.loaded ? (
<>
<p
             className="
               mt-1.5
               font-mono
               text-[8px]
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
               text-[7px]
               text-slate-700
             "
>
             {Number(
               source.rows
                 ?.length || 0
             ).toLocaleString(
               "en-US"
             )}{" "}
             ROWS
</p>
</>
       ) : (
<p
           className="
             mt-1.5
             font-mono
             text-[8px]
             text-slate-700
           "
>
           Example:{" "}
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
           ? "REPLACE"
           : "LOAD"}
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
               Reference Package
</p>
<h2 className="mt-1 text-xl font-black text-white">
               Inventory Sources
</h2>
<p className="mt-1 text-[9px] text-slate-600">
               Select all reference files at once. The dashboard detects each source automatically.
</p>
</div>

<button
             type="button"
             onClick={onClose}
             className="vi-button"
>
             CLOSE
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
               ? "DETECTING FILES..."
               : "LOAD INVENTORY PACKAGE"}
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
               text-[8px]
               font-black
               text-amber-400
             "
>
             FILES NOT RECOGNIZED
</p>
           {unknownFiles.map(
             (file) => (
<p
                 key={file}
                 className="
                   mt-2
                   font-mono
                   text-[8px]
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
           SUGGESTED NAMES
</p>
<div
           className="
             mt-3
             space-y-1.5
             font-mono
             text-[8px]
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
             CLEAR ALL SOURCES
</button>
</div>
       )}
</aside>
</div>
 );
}