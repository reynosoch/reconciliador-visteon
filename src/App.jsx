// src/App.jsx
import React, {
 useState,
} from "react";
import CommandHeader from "./components/shell/CommandHeader";
import SourcesDrawer from "./components/shell/SourcesDrawer";
import DataHealthBar from "./components/dashboard/DataHealthBar";
import FinancialGrid from "./components/dashboard/FinancialGrid";
import InventoryWorkspace from "./components/dashboard/InventoryWorkspace";
import PartDetailDrawer from "./components/detail/PartDetailDrawer";
import HelpDrawer from "./components/help/HelpDrawer";
import {
 PacDot,
 PelletRail,
} from "./components/visual/PacmanGlyphs";
import {
 useReferenceFiles,
} from "./hooks/useReferenceFiles";
import {
 useInventoryEngine,
} from "./hooks/useInventoryEngine";
const CRITICAL_USD_THRESHOLD =
 10000;
export default function App() {
 const [
   sourcesOpen,
   setSourcesOpen,
 ] = useState(false);
 const [
   selectedPart,
   setSelectedPart,
 ] = useState(null);
 const [
   helpTopic,
   setHelpTopic,
 ] = useState(null);
 const references =
   useReferenceFiles();
 const inventory =
   useInventoryEngine({
     areaRows:
       references.areaRows,
     qadRows:
       references.qadRows,
     ispbbRows:
       references.ispbbRows,
     bomRows:
       references.bomRows,
     costRows:
       references.costRows,
     criticalUsdThreshold:
       CRITICAL_USD_THRESHOLD,
     refreshMs:
       3 * 60 * 1000,
     enabled: true,
   });
 const referencesReady =
   references.status
     .allLoaded;
 const liveReady =
   Boolean(
     inventory.lastUpdated
   );
 const engineReady =
   Boolean(
     inventory.diagnostics
   );
 const ready =
   referencesReady &&
   liveReady &&
   engineReady;
 return (
<div className="vi-shell">
<CommandHeader
       connectionStatus={
         inventory.connectionStatus
       }
       scanCount={
         inventory.scanCount
       }
       lastUpdated={
         inventory.lastUpdated
       }
       referenceStatus={
         references.status
       }
       loading={
         inventory.loading
       }
       sourcesOpen={
         sourcesOpen
       }
       onRefresh={
         inventory.refresh
       }
       onToggleSources={() =>
         setSourcesOpen(
           (value) =>
             !value
         )
       }
       onOpenRules={() =>
         setHelpTopic(
           "overview"
         )
       }
     />
<main
       className="
         max-w-[1750px]
         mx-auto
         px-4
         sm:px-6
         py-4
       "
>
<section
         className="
           grid
           grid-cols-1
           lg:grid-cols-[auto_1fr_auto]
           lg:items-center
           gap-4
           mb-3
         "
>
<div>
<p className="vi-eyebrow">
             Plant 179A //
             Physical Inventory
</p>
<h1
             className="
               mt-0.5
               text-3xl
               sm:text-4xl
               font-black
               tracking-[-0.045em]
               text-white
               vi-glow-title
             "
>
             Inventory
<span className="text-orange-500">
               {" "}
               Control
</span>
</h1>
</div>
<div
           className="
             hidden
             lg:flex
             items-center
             gap-3
             px-5
           "
>
<PacDot
             size={10}
           />
<PelletRail
             muted
             className="flex-1"
           />
</div>
<div className="flex items-center gap-2">
<span
             className={`
               vi-tag
               ${
                 ready
                   ? "vi-tag-gain"
                   : "vi-tag-swing"
               }
             `}
>
             {ready
               ? "ENGINE READY"
               : "WAITING DATA"}
</span>
<button
             type="button"
             onClick={() =>
               setHelpTopic(
                 "overview"
               )
             }
             className="
               inline-flex
               items-center
               justify-center
               w-7
               h-7
               rounded-full
               border
               border-slate-700
               text-xs
               font-black
               text-slate-400
               hover:text-orange-300
               hover:border-orange-500/40
             "
>
             ?
</button>
</div>
</section>
<section className="mb-3">
<DataHealthBar
           diagnostics={
             inventory.diagnostics
           }
           scanCount={
             inventory.scanCount
           }
           lastUpdated={
             inventory.lastUpdated
           }
           referencesReady={
             referencesReady
           }
           liveReady={
             liveReady
           }
         />
</section>
<section className="mb-3">
<FinancialGrid
           summary={
             inventory.summary
           }
           ready={
             ready
           }
           onHelp={
             setHelpTopic
           }
         />
</section>
<InventoryWorkspace
         rows={
           inventory.reconciliation
         }
         ready={
           ready
         }
         onSelectPart={
           setSelectedPart
         }
         onHelp={
           setHelpTopic
         }
       />
</main>
<SourcesDrawer
       open={
         sourcesOpen
       }
       sources={
         references.sources
       }
       status={
         references.status
       }
       loadFile={
         references.loadFile
       }
       clearFile={
         references.clearFile
       }
       clearAll={
         references.clearAll
       }
       onClose={() =>
         setSourcesOpen(
           false
         )
       }
     />
<PartDetailDrawer
       item={
         selectedPart
       }
       onClose={() =>
         setSelectedPart(
           null
         )
       }
     />
<HelpDrawer
       topic={
         helpTopic
       }
       onClose={() =>
         setHelpTopic(
           null
         )
       }
     />
</div>
 );
}