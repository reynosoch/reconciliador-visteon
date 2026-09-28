import {useEffect,useMemo,useState} from "react";
import CommandHeader from "./components/shell/CommandHeader";
import SourcesDrawer from "./components/shell/SourcesDrawer";
import DataHealthBar from "./components/dashboard/DataHealthBar";
import DataInspectionPanel from "./components/dashboard/DataInspectionPanel";
import FinancialGrid from "./components/dashboard/FinancialGrid";
import CutHistoryPanel,{RULES_VERSION} from "./components/dashboard/CutHistoryPanel";
import DiscrepancyFindingsPanel from "./components/dashboard/DiscrepancyFindingsPanel";
import InventoryWorkspace from "./components/dashboard/InventoryWorkspace";
import PartDetailDrawer from "./components/detail/PartDetailDrawer";
import HelpDrawer from "./components/help/HelpDrawer";
import NotificationCenter from "./components/shell/NotificationCenter";
import BotControlModal from "./components/shell/BotControlModal";
import {useReferenceFiles} from "./hooks/useReferenceFiles";
import {useInventoryEngine} from "./hooks/useInventoryEngine";
import {AmbientChase} from "./components/visual/PacmanGlyphs";
import {buildDiscrepancyFindings,buildSnapshot,snapshotsComparable} from "./domain/buildDiscrepancyFindings.js";
import {enrichFindingsWithAlertState} from "./domain/notificationState.js";
const CRITICAL_USD_THRESHOLD=10000,QUANTITY_TOLERANCE={default:0,PCS:0},UNUSUAL_THRESHOLDS={netPieces:1000,netUsd:10000};
const refSignature=(sources={})=>["areas","qad","ispbb","bom","cost"].map(type=>({type,fingerprint:sources[type]?.fingerprint||"",fileName:sources[type]?.fileName||""}));
export default function App(){
 const [sourcesOpen,setSourcesOpen]=useState(false),[selectedPart,setSelectedPart]=useState(null),[helpTopic,setHelpTopic]=useState(null),[activeDataView,setActiveDataView]=useState(null),[notificationsOpen,setNotificationsOpen]=useState(false),[botOpen,setBotOpen]=useState(false),[notificationCount,setNotificationCount]=useState(0),[operationalState,setOperationalState]=useState({}),[focusFindingId,setFocusFindingId]=useState(null),[previousCut,setPreviousCut]=useState(null);
 const [campaignId,setCampaignIdState]=useState(()=>localStorage.getItem("visteon.inventory.campaignId.v1")||"");
 const setCampaignId=(value)=>{setCampaignIdState(value);localStorage.setItem("visteon.inventory.campaignId.v1",value);};
 const references=useReferenceFiles();
 const inventory=useInventoryEngine({areaRows:references.areaRows,qadRows:references.qadRows,ispbbRows:references.ispbbRows,bomRows:references.bomRows,costRows:references.costRows,criticalUsdThreshold:CRITICAL_USD_THRESHOLD,refreshMs:3*60*1000,enabled:true});
 const referencesReady=references.status.allLoaded,liveReady=Boolean(inventory.lastUpdated),displayReady=referencesReady&&liveReady&&Boolean(inventory.diagnostics);
 const evaluationValid=displayReady&&!inventory.loading&&!inventory.error&&inventory.snapshotMeta?.complete===true;
 const currentSnapshot=useMemo(()=>buildSnapshot({campaignId,rows:inventory.reconciliation,references:refSignature(references.sources),rulesVersion:RULES_VERSION,snapshotMeta:inventory.snapshotMeta,valid:evaluationValid}),[campaignId,inventory.reconciliation,inventory.snapshotMeta,evaluationValid,references.sources]);
 const comparison=useMemo(()=>snapshotsComparable(previousCut,currentSnapshot),[previousCut,currentSnapshot]);
 const baseFindings=useMemo(()=>displayReady?buildDiscrepancyFindings({reconciliation:inventory.reconciliation,sources:inventory.engine.sources,campaignId,quantityTolerance:QUANTITY_TOLERANCE,previousSnapshot:previousCut,snapshotComparable:evaluationValid&&comparison.ok,unusualThresholds:UNUSUAL_THRESHOLDS}):[],[displayReady,inventory.reconciliation,inventory.engine.sources,campaignId,previousCut,evaluationValid,comparison.ok]);
 const findings=useMemo(()=>enrichFindingsWithAlertState(baseFindings,operationalState),[baseFindings,operationalState]);
 useEffect(()=>{if(!selectedPart?.partNumber)return;const refreshed=inventory.reconciliation.find(item=>item.partNumber===selectedPart.partNumber);if(refreshed!==selectedPart)setSelectedPart(refreshed||null);},[inventory.reconciliation,selectedPart]);
 const evaluationReason=!referencesReady?"Faltan archivos de referencia válidos.":inventory.loading?"4Wall se está actualizando; espera a que termine.":inventory.error?"La última actualización de 4Wall falló.":!inventory.snapshotMeta?.complete?"No se pudo confirmar un snapshot completo.":"";
 return <div className="vi-shell"><AmbientChase/><CommandHeader connectionStatus={inventory.connectionStatus} scanCount={inventory.scanCount} lastUpdated={inventory.lastUpdated} referenceStatus={references.status} loading={inventory.loading} sourcesOpen={sourcesOpen} onRefresh={inventory.refresh} onToggleSources={()=>setSourcesOpen(v=>!v)} onOpenRules={()=>setHelpTopic("overview")} onOpenNotifications={()=>setNotificationsOpen(true)} onOpenBot={()=>setBotOpen(true)} notificationCount={notificationCount}/>
 <main className="vi-main"><section className="vi-intro" aria-labelledby="page-title"><div><p className="vi-eyebrow">PLANTA 179A / INVENTARIO FÍSICO</p><h1 id="page-title">Control de inventario<span className="vi-title-stop">.</span></h1><p className="vi-intro-description">Diferencias entre 4Wall y QAD para investigar durante el día. Los archivos actuales son de prueba y no representan pérdidas reales de planta.</p></div><div className="vi-intro-action"><span className={`vi-cut-state ${displayReady?"vi-cut-state-ready":""}`}><span className="vi-state-dot"/>{displayReady?"CORTE DISPONIBLE":"ESPERANDO FUENTES"}</span><button className="vi-help-link" onClick={()=>setHelpTopic("overview")}><span className="vi-help-icon">?</span> Cómo leer este corte</button></div></section>
 <DataHealthBar diagnostics={inventory.diagnostics} scanCount={inventory.scanCount} lastUpdated={inventory.lastUpdated} referencesReady={referencesReady} liveReady={liveReady} onHelp={setHelpTopic} activeView={activeDataView} onSelect={setActiveDataView}/>
 {activeDataView&&<DataInspectionPanel key={activeDataView} view={activeDataView} onClose={()=>setActiveDataView(null)} onSelectPart={setSelectedPart} scanRows={inventory.scanRows} diagnostics={inventory.diagnostics} reconciliation={inventory.reconciliation} engineSources={inventory.engine.sources} referenceRows={{areas:references.areaRows,qad:references.qadRows,cost:references.costRows,bom:references.bomRows,ispbb:references.ispbbRows}} sources={references.sources} referencesReady={referencesReady}/>}
 <FinancialGrid summary={inventory.summary} ready={displayReady} onHelp={setHelpTopic}/>
 <DiscrepancyFindingsPanel findings={findings} evaluationValid={evaluationValid} evaluationReason={evaluationReason} focusFindingId={focusFindingId} onFocusHandled={()=>setFocusFindingId(null)}/>
 <CutHistoryPanel canSave={evaluationValid} summary={inventory.summary} scanCount={inventory.scanCount} lastUpdated={inventory.lastUpdated} rows={inventory.reconciliation} sources={references.sources} snapshotMeta={inventory.snapshotMeta} campaignId={campaignId} onCampaignIdChange={setCampaignId} onLatestCut={setPreviousCut}/>
 <InventoryWorkspace rows={inventory.reconciliation} ready={displayReady} onSelectPart={setSelectedPart} onHelp={setHelpTopic}/></main>
 <SourcesDrawer open={sourcesOpen} sources={references.sources} status={references.status} loadFile={references.loadFile} clearFile={references.clearFile} clearAll={references.clearAll} onHelp={setHelpTopic} onClose={()=>setSourcesOpen(false)}/>
 <PartDetailDrawer item={selectedPart} onHelp={setHelpTopic} onClose={()=>setSelectedPart(null)}/><HelpDrawer topic={helpTopic} onClose={()=>setHelpTopic(null)}/>
 <NotificationCenter open={notificationsOpen} onClose={()=>setNotificationsOpen(false)} findings={baseFindings} evaluationValid={evaluationValid&&Boolean(campaignId.trim())} onOpenFinding={setFocusFindingId} onCountChange={setNotificationCount} onOperationalStateChange={setOperationalState}/>
 <BotControlModal open={botOpen} onClose={()=>setBotOpen(false)}/></div>;
}
