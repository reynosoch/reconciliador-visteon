import MeetingPriorities from "./components/dashboard/MeetingPriorities.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
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
import OverlayPortal, { forceUnlockPageScroll } from "./components/shell/OverlayPortal.jsx";
import MainMenu, { AnimationOnlyView } from "./components/shell/MainMenu";
import DevFeedback from "./components/shell/DevFeedback";
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
  const mobileSwipeStart = useRef(null);
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
    [focusFindingOrigin, setFocusFindingOrigin] = useState(null),
    [notificationReturnToken, setNotificationReturnToken] = useState(0),
    [botRunning, setBotRunning] = useState(false),
    [previousCut, setPreviousCut] = useState(null),
    [identity, setIdentity] = useState(initial),
    [warning, setWarning] = useState(""),
    [confirmNew, setConfirmNew] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [animationOnly, setAnimationOnly] = useState(false);
  const references = useReferenceFiles(),
    inventory = useInventoryEngine({
      manualScans: references.manualScans,
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
              sourceFiles: references.sources,
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
        references.sources,
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
    const overlayOpen =
      sourcesOpen ||
      Boolean(selectedPart) ||
      Boolean(helpTopic) ||
      notificationsOpen ||
      botOpen ||
      confirmNew ||
      menuOpen ||
      Boolean(activeDataView);

    if (!overlayOpen) {
      forceUnlockPageScroll();
    }
  }, [
    sourcesOpen,
    selectedPart,
    helpTopic,
    notificationsOpen,
    botOpen,
    confirmNew,
    menuOpen,
    activeDataView,
  ]);
  useEffect(() => {
    const endpoint = String(import.meta.env.VITE_BOT_CONTROL_URL || "").replace(/\/$/, "");
    if (!endpoint) return undefined;
    let cancelled = false;
    let controller = null;
    const readBotStatus = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(endpoint + "/bot/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) {
          setBotRunning(data?.processState === "running");
        }
      } catch (error) {
        if (!cancelled && error?.name !== "AbortError") {
          // El estado del bot es auxiliar; un controlador inaccesible no bloquea el dashboard.
        }
      }
    };
    void readBotStatus();
    const timer = window.setInterval(readBotStatus, 5000);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(timer);
    };
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
  useEffect(() => {
    const start = (event) => {
      if (window.innerWidth > 760 || sourcesOpen || notificationsOpen || botOpen || helpTopic || selectedPart || menuOpen || animationOnly) return;
      const touch = event.touches?.[0];
      if (!touch || touch.clientX < window.innerWidth - 28) return;
      mobileSwipeStart.current = { x: touch.clientX, y: touch.clientY };
    };
    const end = (event) => {
      const origin = mobileSwipeStart.current;
      mobileSwipeStart.current = null;
      if (!origin) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const dx = touch.clientX - origin.x;
      const dy = Math.abs(touch.clientY - origin.y);
      if (dx < -58 && dy < 70) setMenuOpen(true);
    };
    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchend", end, { passive: true });
    return () => {
      removeEventListener("touchstart", start);
      removeEventListener("touchend", end);
    };
  }, [sourcesOpen, notificationsOpen, botOpen, helpTopic, selectedPart, menuOpen, animationOnly]);
  const saveIdentity = (n) => {
      setIdentity(n);
      if (!safeWriteJson(KEY, n).ok) setWarning(STORAGE_WARNING);
    },
    returnToNotifications = () => {
      setNotificationTab("OPERATIVAS");
      setNotificationReturnToken((value) => value + 1);
      setNotificationsOpen(true);
    },
    openExcelForFinding = (finding, context = {}) => {
      setDataNavigation({
        finding,
        returnY:
          document.querySelector(".vi-shell")?.scrollTop ?? window.scrollY,
        origin: context.origin || null,
      });
      setActiveDataView("findingEvidence");
    },
    closeDataInspection = () => {
      const returnY = dataNavigation?.returnY;
      const origin = dataNavigation?.origin;
      setActiveDataView(null);
      setDataNavigation(null);
      if (origin === "notifications") {
        returnToNotifications();
      } else if (Number.isFinite(returnY)) {
        requestAnimationFrame(() => {
          const scroller = document.querySelector(".vi-shell");
          if (scroller) {
            scroller.scrollTo({ top: returnY, behavior: "smooth" });
          } else {
            window.scrollTo({ top: returnY, behavior: "smooth" });
          }
        });
      }
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
      {!animationOnly && <CommandHeader
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
      />}
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
          scanState={inventory.connectionStatus?.state}
          onHelp={setHelpTopic}
          activeView={activeDataView}
          onSelect={(view) => {
            setDataNavigation(null);
            setActiveDataView(view);
          }}
        />
        {activeDataView && (
          <OverlayPortal onClose={closeDataInspection}>
            <div
              className="vi-data-modal-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeDataInspection();
              }}
            >
              <div
                className="vi-data-modal-window"
                role="dialog"
                aria-modal="true"
                aria-label="Revisión y comparación de datos"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <DataInspectionPanel
                  view={activeDataView}
                  onClose={closeDataInspection}
                  onSelectPart={setSelectedPart}
                  initialQuery={dataNavigation?.finding?.partNumber || ""}
                  findingContext={dataNavigation?.finding || null}
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
              </div>
            </div>
          </OverlayPortal>
        )}
        <FinancialGrid
          summary={inventory.summary}
          ready={displayReady}
          onHelp={setHelpTopic}
        />
        <MeetingPriorities rows={inventory.reconciliation} ready={displayReady} onSelectPart={setSelectedPart} onOpenSources={() => setSourcesOpen(true)} />
        <DiscrepancyFindingsPanel
          findings={findings}
          evaluationValid={valid}
          evaluationReason={reason}
          focusFindingId={focusFindingId}
          focusFindingOrigin={focusFindingOrigin}
          onFocusHandled={() => {
            setFocusFindingId(null);
            setFocusFindingOrigin(null);
          }}
          onReturnToNotifications={returnToNotifications}
          onOpenExcel={openExcelForFinding}
          inventoryName={identity.name}
          lastUpdated={inventory.lastUpdated}
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
        botRunning={botRunning}
        onHelp={setHelpTopic}
        onClose={() => setSourcesOpen(false)}
      />}
      {!animationOnly && <PartDetailDrawer
        item={selectedPart}
        onHelp={setHelpTopic}
        onClose={() => setSelectedPart(null)}
      />}
      {!animationOnly && <HelpDrawer
        topic={helpTopic}
        sources={references.sources}
        onClose={() => setHelpTopic(null)}
      />}
      {!animationOnly && <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        findings={base}
        evaluationValid={valid}
        inventoryId={identity.id}
        initialTab={notificationTab}
        returnPulse={notificationReturnToken}
        onOpenFinding={(id) => {
          setFocusFindingOrigin("notifications");
          setFocusFindingId(id);
        }}
        onCountChange={setNotificationCount}
        onOperationalStateChange={setOperationalState}
        onPersistenceError={setWarning}
      />}
      {!animationOnly && <BotControlModal
        open={botOpen}
        onClose={() => setBotOpen(false)}
        onStatusChange={(status) =>
          setBotRunning(status?.processState === "running")
        }
      />}
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
      <DevFeedback inventoryId={identity.id} />
    </div>
  );
}
