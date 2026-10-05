import ScrollEffects from "./components/visual/ScrollEffects.jsx";
import { AmbientChase } from "./components/visual/PacmanGlyphs.jsx";
import MeetingPriorities from "./components/dashboard/MeetingPriorities.jsx";
import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DeferredPanel from "./components/shell/DeferredPanel.jsx";
import MykeGhost from "./components/visual/MykeGhost.jsx";
import CommandHeader from "./components/shell/CommandHeader";
import DataHealthBar from "./components/dashboard/DataHealthBar";
import FinancialGrid from "./components/dashboard/FinancialGrid";
import CutHistoryPanel, {
  RULES_VERSION,
} from "./components/dashboard/CutHistoryPanel";
import DiscrepancyFindingsPanel from "./components/dashboard/DiscrepancyFindingsPanel";
import InventoryWorkspace from "./components/dashboard/InventoryWorkspace";
import PartDetailDrawer from "./components/detail/PartDetailDrawer";
import HelpDrawer from "./components/help/HelpDrawer";
import NotificationCenter from "./components/shell/NotificationCenter";
import ConfirmDialog from "./components/shell/ConfirmDialog";
import OverlayPortal from "./components/shell/OverlayPortal.jsx";
import { forceUnlockPageScroll } from "./services/overlayScroll.js";
import MainMenu from "./components/shell/MainMenu";
import DevFeedback from "./components/shell/DevFeedback";
import SystemFooter from "./components/shell/SystemFooter.jsx";
import {
  REFERENCE_SOURCE_LABELS,
  useReferenceFiles,
} from "./hooks/useReferenceFiles";
import { useInventoryEngine } from "./hooks/useInventoryEngine";
import { useBotRunningStatus } from "./hooks/useBotRunningStatus.js";
import { useMobileMenuSwipe } from "./hooks/useMobileMenuSwipe.js";
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
const SourcesDrawer = lazy(
  () => import("./components/shell/SourcesDrawer.jsx"),
);
const BotControlModal = lazy(
  () => import("./components/shell/BotControlModal.jsx"),
);
const DataInspectionPanel = lazy(
  () => import("./components/dashboard/DataInspectionPanel.jsx"),
);
const PartLogicTracer = lazy(
  () => import("./components/shell/PartLogicTracer.jsx"),
);
const EngineGuideDrawer = lazy(
  () => import("./components/shell/EngineGuideDrawer.jsx"),
);
const MykePanel = lazy(() => import("./components/shell/MykePanel.jsx"));
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
  } catch {
    // Storage can be blocked; keep the generated inventory id fallback.
  }
  return { id: old || newId(), name: old || "Inventario actual" };
}
export default function App() {
  const [pacmanEnabled, setPacmanEnabled] = useState(
    () => safeReadJson("visteon.ui.pacman.v1", true).value !== false,
  );
  const [reduceAnimations, setReduceAnimations] = useState(
    () => safeReadJson("visteon.ui.reduceAnimations.v1", false).value === true,
  );
  useEffect(() => {
    safeWriteJson("visteon.ui.pacman.v1", pacmanEnabled);
  }, [pacmanEnabled]);
  useEffect(() => {
    safeWriteJson("visteon.ui.reduceAnimations.v1", reduceAnimations);
    document.body.classList.toggle(
      "vi-performance-motion-off",
      reduceAnimations,
    );
    return () => document.body.classList.remove("vi-performance-motion-off");
  }, [reduceAnimations]);
  const [lightGlass, setLightGlass] = useState(
    () => safeReadJson("visteon.ui.lightGlass.v1", false).value === true,
  );
  useEffect(() => {
    safeWriteJson("visteon.ui.lightGlass.v1", lightGlass);
    document.body.classList.toggle("vi-performance-light-glass", lightGlass);
    return () => document.body.classList.remove("vi-performance-light-glass");
  }, [lightGlass]);
  const shellRef = useRef(null);
  const mainMotionRef = useRef(null);
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
    [previousCut, setPreviousCut] = useState(null),
    [identity, setIdentity] = useState(initial),
    [warning, setWarning] = useState(""),
    [confirmNew, setConfirmNew] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [logicTracerOpen, setLogicTracerOpen] = useState(false),
    [engineGuideOpen, setEngineGuideOpen] = useState(false),
    [mykeOpen, setMykeOpen] = useState(false),
    [feedbackOpen, setFeedbackOpen] = useState(false),
    [animationLabOpen, setAnimationLabOpen] = useState(false),
    [detailFromNotifications, setDetailFromNotifications] = useState(false);
  const [botRunning, setBotRunning] = useBotRunningStatus();
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
      logicTracerOpen ||
      engineGuideOpen ||
      mykeOpen ||
      feedbackOpen ||
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
    logicTracerOpen,
    engineGuideOpen,
    mykeOpen,
    feedbackOpen,
    activeDataView,
  ]);
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
  const mobileMenuBlocked = Boolean(
    sourcesOpen ||
    notificationsOpen ||
    botOpen ||
    helpTopic ||
    selectedPart ||
    menuOpen ||
    engineGuideOpen ||
    mykeOpen ||
    feedbackOpen ||
    logicTracerOpen,
  );
  useMobileMenuSwipe({ disabled: mobileMenuBlocked, setOpen: setMenuOpen });
  const openPartFromNotification = (alert) => {
    const item = inventory.reconciliation.find(
      (row) => row.partNumber === alert?.partNumber,
    );

    if (!item) {
      setFocusFindingOrigin("notifications");
      setFocusFindingId(alert?.id || null);
      setNotificationsOpen(false);
      return;
    }

    setDetailFromNotifications(true);
    setSelectedPart(item);
    window.setTimeout(() => setNotificationsOpen(false), 110);
  };

  const backToNotificationsFromPart = () => {
    setSelectedPart(null);
    setDetailFromNotifications(false);
    setNotificationTab("OPERATIVAS");
    setNotificationReturnToken((value) => value + 1);
    setNotificationsOpen(true);
  };

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
            scroller.scrollTo({ top: returnY, behavior: "auto" });
          } else {
            window.scrollTo({ top: returnY, behavior: "auto" });
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
  useEffect(() => {
    if (!animationLabOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented)
        setAnimationLabOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [animationLabOpen]);

  if (animationLabOpen) {
    return (
      <div
        className="vi-animation-lab"
        role="dialog"
        aria-modal="true"
        aria-label="Laboratorio de animación Pac-Man"
      >
        <AmbientChase />
        <button
          type="button"
          className="vi-animation-lab-close"
          onClick={() => setAnimationLabOpen(false)}
          aria-label="Cerrar laboratorio de animación"
          title="Volver al dashboard"
        >
          ×
        </button>
        <DevFeedback
          key="feedback"
          inventoryId={identity.id}
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
        />
      </div>
    );
  }

  return (
    <div className="vi-shell vi-rubber-viewport" ref={shellRef}>
      <div className="vi-footer-underlay" aria-hidden="true" />
      {pacmanEnabled && !reduceAnimations && <AmbientChase />}
      <CommandHeader
        connectionStatus={inventory.connectionStatus}
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
        scrollViewportRef={shellRef}
      />
      {warning && <div className="vi-persistence-warning">{warning}</div>}
      {
        <div className="vi-rubber-clip">
          <div className="vi-rubber-content" ref={mainMotionRef}>
            <main className="vi-main">
              <section className="vi-intro">
                <div>
                  <p className="vi-eyebrow">PLANTA 179A / INVENTARIO FÍSICO</p>
                  <h1>
                    Control de inventario
                    <span className="vi-title-stop">.</span>
                  </h1>
                  <p className="vi-intro-description">
                    Diferencias entre 4Wall y QAD para investigar durante el
                    día. Los archivos actuales son de prueba.
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
                      if (event.target === event.currentTarget)
                        closeDataInspection();
                    }}
                  >
                    <div
                      className="vi-data-modal-window"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Revisión y comparación de datos"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <DeferredPanel open={Boolean(activeDataView)}>
                        <DataInspectionPanel
                          view={activeDataView}
                          onClose={closeDataInspection}
                          onSelectPart={setSelectedPart}
                          initialQuery={
                            dataNavigation?.finding?.partNumber || ""
                          }
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
                      </DeferredPanel>
                    </div>
                  </div>
                </OverlayPortal>
              )}
              <FinancialGrid
                summary={inventory.summary}
                ready={displayReady}
                onHelp={setHelpTopic}
              />
              <MeetingPriorities
                rows={inventory.reconciliation}
                ready={displayReady}
                onSelectPart={setSelectedPart}
                onOpenSources={() => setSourcesOpen(true)}
              />
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
            </main>
            <SystemFooter
              referenceStatus={references.status}
              connectionStatus={inventory.connectionStatus}
              diagnostics={inventory.diagnostics}
              snapshotMeta={inventory.snapshotMeta}
              scanCount={inventory.scanCount}
              lastUpdated={inventory.lastUpdated}
            />
          </div>
        </div>
      }
      <ScrollEffects viewportRef={shellRef} contentRef={mainMotionRef} />
      <DeferredPanel open={sourcesOpen}>
        <SourcesDrawer
          open={sourcesOpen}
          sources={references.sources}
          status={references.status}
          loadFile={references.loadFile}
          deleteBomFile={references.deleteBomFile}
          clearFile={references.clearFile}
          botRunning={botRunning}
          onHelp={setHelpTopic}
          onClose={() => setSourcesOpen(false)}
        />
      </DeferredPanel>
      {
        <PartDetailDrawer
          item={selectedPart}
          onHelp={setHelpTopic}
          fromNotifications={detailFromNotifications}
          onBackToNotifications={backToNotificationsFromPart}
          onClose={() => {
            setSelectedPart(null);
            setDetailFromNotifications(false);
          }}
        />
      }
      {
        <HelpDrawer
          topic={helpTopic}
          sources={references.sources}
          onClose={() => setHelpTopic(null)}
        />
      }
      {
        <NotificationCenter
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          findings={base}
          evaluationValid={valid}
          inventoryId={identity.id}
          initialTab={notificationTab}
          returnPulse={notificationReturnToken}
          missingSources={references.status.missingSources.map(
            (key) => REFERENCE_SOURCE_LABELS[key] || key,
          )}
          onOpenFinding={openPartFromNotification}
          onCountChange={setNotificationCount}
          onOperationalStateChange={setOperationalState}
          onPersistenceError={setWarning}
        />
      }
      <DeferredPanel open={botOpen}>
        <BotControlModal
          open={botOpen}
          onClose={() => setBotOpen(false)}
          onStatusChange={(status) =>
            setBotRunning(status?.processState === "running")
          }
        />
      </DeferredPanel>
      {
        <ConfirmDialog
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
        />
      }
      <MainMenu
        pacmanEnabled={pacmanEnabled}
        reduceAnimations={reduceAnimations}
        lightGlass={lightGlass}
        onToggleLightGlass={() => setLightGlass((value) => !value)}
        onOpenMyke={() => setMykeOpen(true)}
        onTogglePacman={() => setPacmanEnabled((enabled) => !enabled)}
        onToggleReduceAnimations={() =>
          setReduceAnimations((enabled) => !enabled)
        }
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenBot={() => setBotOpen(true)}
        botRunning={botRunning}
        onOpenLogicTracer={() => setLogicTracerOpen(true)}
        onOpenEngineGuide={() => setEngineGuideOpen(true)}
        onOpenAnimationLab={() => setAnimationLabOpen(true)}
        snapshotMeta={inventory.snapshotMeta}
        scanCount={inventory.scanCount}
        lastUpdated={inventory.lastUpdated}
      />
      <DeferredPanel open={logicTracerOpen}>
        <PartLogicTracer
          open={logicTracerOpen}
          onClose={() => setLogicTracerOpen(false)}
          reconciliation={inventory.reconciliation}
          sources={references.sources}
          scanReady={Boolean(
            inventory.lastUpdated && inventory.snapshotMeta?.complete,
          )}
          snapshotMeta={inventory.snapshotMeta}
          scanRows={inventory.scanRows}
          engineSources={inventory.engine.sources}
          findings={findings}
          reduceAnimations={reduceAnimations}
        />
      </DeferredPanel>
      <DeferredPanel open={engineGuideOpen}>
        <EngineGuideDrawer
          open={engineGuideOpen}
          onClose={() => setEngineGuideOpen(false)}
          onOpenTracer={() => setLogicTracerOpen(true)}
          sources={references.sources}
          scanRows={inventory.scanRows}
          scanReady={Boolean(
            inventory.lastUpdated && inventory.snapshotMeta?.complete,
          )}
          snapshotMeta={inventory.snapshotMeta}
          reduceAnimations={reduceAnimations}
        />
      </DeferredPanel>
      <DeferredPanel open={mykeOpen}>
        <MykePanel
          open={mykeOpen}
          onClose={() => setMykeOpen(false)}
          onOpenEngineGuide={() => setEngineGuideOpen(true)}
          onOpenTracer={() => setLogicTracerOpen(true)}
        />
      </DeferredPanel>
      {createPortal(
        <button
          type="button"
          className="vi-myke-launcher"
          aria-label="Abrir Myke"
          aria-expanded={mykeOpen}
          onClick={() => setMykeOpen(true)}
        >
          <MykeGhost />
          <span>
            Myke<small>Tu organizador</small>
          </span>
        </button>,
        document.body,
      )}
      <DevFeedback
        key="feedback"
        inventoryId={identity.id}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
    </div>
  );
}
