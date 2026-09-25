import { useState } from "react";
import CommandHeader from "./components/shell/CommandHeader";
import SourcesDrawer from "./components/shell/SourcesDrawer";
import DataHealthBar from "./components/dashboard/DataHealthBar";
import DataInspectionPanel from "./components/dashboard/DataInspectionPanel";
import FinancialGrid from "./components/dashboard/FinancialGrid";
import InventoryWorkspace from "./components/dashboard/InventoryWorkspace";
import PartDetailDrawer from "./components/detail/PartDetailDrawer";
import HelpDrawer from "./components/help/HelpDrawer";
import { useReferenceFiles } from "./hooks/useReferenceFiles";
import { useInventoryEngine } from "./hooks/useInventoryEngine";
import { AmbientChase } from "./components/visual/PacmanGlyphs";

const CRITICAL_USD_THRESHOLD = 10000;

export default function App() {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [helpTopic, setHelpTopic] = useState(null);
  const [activeDataView, setActiveDataView] = useState(null);
  const references = useReferenceFiles();
  const inventory = useInventoryEngine({
    areaRows: references.areaRows,
    qadRows: references.qadRows,
    ispbbRows: references.ispbbRows,
    bomRows: references.bomRows,
    costRows: references.costRows,
    criticalUsdThreshold: CRITICAL_USD_THRESHOLD,
    refreshMs: 3 * 60 * 1000,
    enabled: true,
  });

  const referencesReady = references.status.allLoaded;
  const liveReady = Boolean(inventory.lastUpdated);
  const ready = referencesReady && liveReady && Boolean(inventory.diagnostics);

  return (
    <div className="vi-shell">
      <AmbientChase />
      <CommandHeader
        connectionStatus={inventory.connectionStatus}
        scanCount={inventory.scanCount}
        lastUpdated={inventory.lastUpdated}
        referenceStatus={references.status}
        loading={inventory.loading}
        sourcesOpen={sourcesOpen}
        onRefresh={inventory.refresh}
        onToggleSources={() => setSourcesOpen((value) => !value)}
        onOpenRules={() => setHelpTopic("overview")}
      />

      <main className="vi-main">
        <section className="vi-intro" aria-labelledby="page-title">
          <div>
            <p className="vi-eyebrow">PLANTA 179A <span aria-hidden="true">/</span> INVENTARIO FÍSICO</p>
            <h1 id="page-title">Control de inventario<span className="vi-title-stop">.</span></h1>
            <p className="vi-intro-description">Diferencias entre 4Wall y QAD, ordenadas por su impacto financiero para revisar durante el día.</p>
          </div>
          <div className="vi-intro-action">
            <span className={`vi-cut-state ${ready ? "vi-cut-state-ready" : ""}`}>
              <span className="vi-state-dot" aria-hidden="true" />
              {ready ? "CORTE DISPONIBLE" : "ESPERANDO FUENTES"}
            </span>
            <button type="button" className="vi-help-link" onClick={() => setHelpTopic("overview")}>
              <span className="vi-help-icon" aria-hidden="true">?</span> Cómo leer este corte
            </button>
          </div>
        </section>

        <DataHealthBar
          diagnostics={inventory.diagnostics}
          scanCount={inventory.scanCount}
          lastUpdated={inventory.lastUpdated}
          referencesReady={referencesReady}
          liveReady={liveReady}
          onHelp={setHelpTopic}
          activeView={activeDataView}
          onSelect={setActiveDataView}
        />
        {activeDataView && <DataInspectionPanel
          key={activeDataView}
          view={activeDataView}
          onClose={() => setActiveDataView(null)}
          onSelectPart={setSelectedPart}
          scanRows={inventory.scanRows}
          diagnostics={inventory.diagnostics}
          reconciliation={inventory.reconciliation}
          engineSources={inventory.engine.sources}
          referenceRows={{ areas: references.areaRows, qad: references.qadRows, cost: references.costRows, bom: references.bomRows, ispbb: references.ispbbRows }}
          sources={references.sources}
          referencesReady={referencesReady}
        />}
        <FinancialGrid summary={inventory.summary} ready={ready} onHelp={setHelpTopic} />
        <InventoryWorkspace
          rows={inventory.reconciliation}
          ready={ready}
          onSelectPart={setSelectedPart}
          onHelp={setHelpTopic}
        />
      </main>

      <SourcesDrawer
        open={sourcesOpen}
        sources={references.sources}
        status={references.status}
        loadFile={references.loadFile}
        clearFile={references.clearFile}
        clearAll={references.clearAll}
        onHelp={setHelpTopic}
        onClose={() => setSourcesOpen(false)}
      />
      <PartDetailDrawer item={selectedPart} onHelp={setHelpTopic} onClose={() => setSelectedPart(null)} />
      <HelpDrawer topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </div>
  );
}
