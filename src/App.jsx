import { useEffect, useMemo, useState } from "react";
import CommandHeader from "./components/shell/CommandHeader";
import SourcesDrawer from "./components/shell/SourcesDrawer";
import DataHealthBar from "./components/dashboard/DataHealthBar";
import DataInspectionPanel from "./components/dashboard/DataInspectionPanel";
import FinancialGrid from "./components/dashboard/FinancialGrid";
import CutHistoryPanel, {
  RULES_VERSION,
} from "./components/dashboard/CutHistoryPanel";
import DiscrepancyFindingsPanel from "./components/dashboard/DiscrepancyFindingsPanel";
import InventoryWorkspace from "./components/dashboard/InventoryWorkspace";
import PartDetailDrawer from "./components/detail/PartDetailDrawer";
import HelpDrawer from "./components/help/HelpDrawer";
import NotificationCenter from "./components/shell/NotificationCenter";
import BotControlModal from "./components/shell/BotControlModal";
import ConfirmDialog from "./components/shell/ConfirmDialog";
import MainMenu, { AnimationOnlyView } from "./components/shell/MainMenu";
import { useReferenceFiles } from "./hooks/useReferenceFiles";
import { useInventoryEngine } from "./hooks/useInventoryEngine";
import { AmbientChase } from "./components/visual/PacmanGlyphs";
import {
  buildDiscrepancyFindings,
  buildSnapshot,
  snapshotsComparable,
} from "./domain/buildDiscrepancyFindings.js";
import { enrichFindingsWithAlertState } from "./domain/notificationState.js";
import {
  safeReadJson,
  safeWriteJson,
  archiveLegacyStorage,
  STORAGE_WARNING,
} from "./services/browserStorage.js";
const KEY = "visteon.inventory.activeInventory.v2",
  newId = () => crypto.randomUUID?.() || "inv-" + Date.now(),
  sig = (s) =>
    ["areas", "qad", "ispbb", "bom", "cost"].map((type) => ({
      type,
      fingerprint: s[type]?.fingerprint || "",
    }));
function initial() {
  const s = safeReadJson(KEY, null).value;
  if (s?.id) return s;
  let old = "";
  try {
    old = localStorage.getItem("visteon.inventory.campaignId.v1") || "";
  } catch {}
  return { id: old || newId(), name: old || "Inventario actual" };
}
export default function App() {
  const [sourcesOpen, setSourcesOpen] = useState(false),
    [selectedPart, setSelectedPart] = useState(null),
    [helpTopic, setHelpTopic] = useState(null),
    [activeDataView, setActiveDataView] = useState(null),
    [dataNavigation, setDataNavigation] = useState(null),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [notificationTab, setNotificationTab] = useState("OPERATIVAS"),
    [botOpen, setBotOpen] = useState(false),
    [notificationCount, setNotificationCount] = useState(0),
    [operationalState, setOperationalState] = useState({}),
    [focusFindingId, setFocusFindingId] = useState(null),
    [previousCut, setPreviousCut] = useState(null),
    [identity, setIdentity] = useState(initial),
    [warning, setWarning] = useState(""),
    [confirmNew, setConfirmNew] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [animationOnly, setAnimationOnly] = useState(false);
  const references = useReferenceFiles(),
    inventory = useInventoryEngine({
      areaRows: references.areaRows,
      qadRows: references.qadRows,
      ispbbRows: references.ispbbRows,
      bomRows: references.bomRows,
      costRows: references.costRows,
      criticalUsdThreshold: 10000,
      refreshMs: 180000,
      enabled: true,
    }),
    referencesReady = references.status.allLoaded,
    displayReady =
      referencesReady &&
      Boolean(inventory.lastUpdated) &&
      Boolean(inventory.diagnostics),
    valid =
      displayReady &&
      !references.status.loadingCount &&
      !inventory.loading &&
      !inventory.error &&
      inventory.snapshotMeta?.complete === true,
    current = useMemo(
      () =>
        buildSnapshot({
          campaignId: identity.id,
          rows: inventory.reconciliation,
          references: sig(references.sources),
          rulesVersion: RULES_VERSION,
          snapshotMeta: inventory.snapshotMeta,
          valid,
        }),
      [
        identity.id,
        inventory.reconciliation,
        inventory.snapshotMeta,
        valid,
        references.sources,
      ],
    ),
    cmp = useMemo(
      () => snapshotsComparable(previousCut, current),
      [previousCut, current],
    ),
    base = useMemo(
      () =>
        displayReady
          ? buildDiscrepancyFindings({
              reconciliation: inventory.reconciliation,
              sources: inventory.engine.sources,
              campaignId: identity.id,
              quantityTolerance: { default: 0, PCS: 0 },
              previousSnapshot: previousCut,
              snapshotComparable: valid && cmp.ok,
              unusualThresholds: { netPieces: 1000, netUsd: 10000 },
            })
          : [],
      [
        displayReady,
        inventory.reconciliation,
        inventory.engine.sources,
        identity.id,
        previousCut,
        valid,
        cmp.ok,
      ],
    ),
    findings = useMemo(
      () => enrichFindingsWithAlertState(base, operationalState),
      [base, operationalState],
    );
  useEffect(() => {
    if (!safeWriteJson(KEY, identity).ok) setWarning(STORAGE_WARNING);
  }, [identity]);
  useEffect(() => {
    archiveLegacyStorage().catch(() => setWarning(STORAGE_WARNING));
  }, []);
  useEffect(() => {
    if (selectedPart?.partNumber) {
      const r = inventory.reconciliation.find(
        (x) => x.partNumber === selectedPart.partNumber,
      );
      if (r !== selectedPart) setSelectedPart(r || null);
    }
  }, [inventory.reconciliation, selectedPart]);
  useEffect(() => {
    if (!references.status.loadedCount && !warning) return;
    const h = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [references.status.loadedCount, warning]);
  const saveIdentity = (n) => {
      setIdentity(n);
      if (!safeWriteJson(KEY, n).ok) setWarning(STORAGE_WARNING);
    },
    openExcelForFinding = (partNumber, findingId) => {
      setDataNavigation({ partNumber, findingId });
      setActiveDataView("reconciliationExcel");
      setTimeout(() => document.getElementById("vi-data-inspection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    },
    backToFinding = (findingId) => {
      setActiveDataView(null);
      setDataNavigation(null);
      setFocusFindingId(findingId);
      setTimeout(() => document.querySelector(".vi-findings")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    },
    reason = !referencesReady
      ? "Faltan archivos de referencia válidos."
      : inventory.loading
        ? "4Wall se está actualizando."
        : inventory.error
          ? "La última actualización de 4Wall falló."
          : !inventory.snapshotMeta?.complete
            ? "No se confirmó un corte de datos completo."
            : "";
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
        onToggleSources={() => setSourcesOpen((v) => !v)}
        onOpenRules={() => setHelpTopic("overview")}
        onOpenNotifications={() => {
          setNotificationTab("OPERATIVAS");
          setNotificationsOpen(true);
        }}
        onOpenBot={() => setBotOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        notificationCount={notificationCount}
      />
      {animationOnly && <AnimationOnlyView onClose={() => setAnimationOnly(false)} />}
      {!animationOnly && warning && <div className="vi-persistence-warning">{warning}</div>}
      {!animationOnly && <main className="vi-main">
        <section className="vi-intro">
          <div>
            <p className="vi-eyebrow">PLANTA 179A / INVENTARIO FÍSICO</p>
            <h1>
              Control de inventario<span className="vi-title-stop">.</span>
            </h1>
            <p className="vi-intro-description">
              Diferencias entre 4Wall y QAD para investigar durante el día. Los
              archivos actuales son de prueba.
            </p>
          </div>
        </section>
        <DataHealthBar
          diagnostics={inventory.diagnostics}
          scanCount={inventory.scanCount}
          lastUpdated={inventory.lastUpdated}
          referencesReady={referencesReady}
          liveReady={Boolean(inventory.lastUpdated)}
          onHelp={setHelpTopic}
          activeView={activeDataView}
          onSelect={(view) => {
            setDataNavigation(null);
            setActiveDataView(view);
          }}
        />
        {activeDataView && (
          <DataInspectionPanel
            view={activeDataView}
            onClose={() => {
              setActiveDataView(null);
              setDataNavigation(null);
            }}
            onSelectPart={setSelectedPart}
            initialQuery={dataNavigation?.partNumber || ""}
            originFindingId={dataNavigation?.findingId || null}
            onBackToFinding={backToFinding}
            scanRows={inventory.scanRows}
            diagnostics={inventory.diagnostics}
            reconciliation={inventory.reconciliation}
            engineSources={inventory.engine.sources}
            referenceRows={{
              areas: references.areaRows,
              qad: references.qadRows,
              cost: references.costRows,
              bom: references.bomRows,
              ispbb: references.ispbbRows,
            }}
            sources={references.sources}
            referencesReady={referencesReady}
          />
        )}
        <FinancialGrid
          summary={inventory.summary}
          ready={displayReady}
          onHelp={setHelpTopic}
        />
        <DiscrepancyFindingsPanel
          findings={findings}
          evaluationValid={valid}
          evaluationReason={reason}
          focusFindingId={focusFindingId}
          onFocusHandled={() => setFocusFindingId(null)}
          onOpenExcel={openExcelForFinding}
        />
        <CutHistoryPanel
          canSave={valid}
          summary={inventory.summary}
          scanCount={inventory.scanCount}
          lastUpdated={inventory.lastUpdated}
          rows={inventory.reconciliation}
          findings={findings}
          scanRows={inventory.scanRows}
          diagnostics={inventory.diagnostics}
          sources={references.sources}
          snapshotMeta={inventory.snapshotMeta}
          inventory={identity}
          onLatestCut={setPreviousCut}
          onPersistenceError={setWarning}
        />
        <InventoryWorkspace
          rows={inventory.reconciliation}
          ready={displayReady}
          onSelectPart={setSelectedPart}
          onHelp={setHelpTopic}
        />
      </main>}
      {!animationOnly && <SourcesDrawer
        open={sourcesOpen}
        sources={references.sources}
        status={references.status}
        loadFile={references.loadFile}
        clearFile={references.clearFile}
        clearAll={references.clearAll}
        onHelp={setHelpTopic}
        onClose={() => setSourcesOpen(false)}
      />}
      {!animationOnly && <PartDetailDrawer
        item={selectedPart}
        onHelp={setHelpTopic}
        onClose={() => setSelectedPart(null)}
      />}
      {!animationOnly && <HelpDrawer topic={helpTopic} onClose={() => setHelpTopic(null)} />}
      {!animationOnly && <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        findings={base}
        evaluationValid={valid}
        inventoryId={identity.id}
        initialTab={notificationTab}
        onOpenFinding={setFocusFindingId}
        onCountChange={setNotificationCount}
        onOperationalStateChange={setOperationalState}
        onPersistenceError={setWarning}
      />}
      {!animationOnly && <BotControlModal open={botOpen} onClose={() => setBotOpen(false)} />}
      {!animationOnly && <ConfirmDialog
        open={confirmNew}
        title="¿Crear otro inventario?"
        message="Los cortes y alertas del inventario actual se conservarán. Los archivos que están solo en memoria no se copian."
        confirmLabel="Crear inventario"
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false);
          saveIdentity({ id: newId(), name: "Nuevo inventario" });
          setPreviousCut(null);
          setOperationalState({});
        }}
      />}
      <MainMenu open={menuOpen} onClose={() => setMenuOpen(false)} onAnimationOnly={() => setAnimationOnly(true)} />
    </div>
  );
}
