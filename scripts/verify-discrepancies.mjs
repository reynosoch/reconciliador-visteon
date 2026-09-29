import assert from "node:assert/strict";
import {parseCostPart} from "../src/parsers/parseCostPart.js";
import {parse4WallAreas} from "../src/parsers/parse4WallAreas.js";
import {parse4WallScans} from "../src/parsers/parse4WallScans.js";
import {buildDiscrepancyFindings,groupFindingsByPart,snapshotsComparable} from "../src/domain/buildDiscrepancyFindings.js";
import {syncOperationalAlerts} from "../src/domain/notificationState.js";

const dollar=String.fromCharCode(36);
const costs=parseCostPart([
 {"Item Number":"EMPTY","Cost Total":"","Status":"ACTIVE","Site":"1795"},
 {"Item Number":"DOLLAR","Cost Total":dollar,"Status":"ACTIVE","Site":"1795"},
 {"Item Number":"OK","Cost Total":dollar+"2.50","Status":"ACTIVE","Site":"1795"},
 {"Item Number":"CONFLICT","Cost Total":"10","Status":"ACTIVE","Site":"1795"},
 {"Item Number":"CONFLICT","Cost Total":"11","Status":"ACTIVE","Site":"1795"},
]);
assert.equal(costs.byPart.get("EMPTY").hasValidCost,false);
assert.equal(costs.byPart.get("DOLLAR").hasValidCost,false);
assert.equal(costs.byPart.get("OK").costTotal,2.5);
assert.equal(costs.byPart.get("CONFLICT").costConflict,true);

const item=(pn,physical,qad,physLoc,qadLoc,hasCost=true,qadPresent=true)=>({partNumber:pn,physical:{total:physical,directTotal:physical,scanCount:physical?1:0,areas:["A"]},qad:{total:qad},master:{hasCost,costState:hasCost?"VALID":"MISSING"},financial:{netPieces:physical-qad,netUsd:hasCost?(physical-qad)*2:0,swingPieces:0},flags:{qadPresent,hasUnmappedPhysicalLocation:false,hasInvalidQadLocation:false,hasBomReference:false},trace:{swingByLocation:[...new Set([...Object.keys(physLoc),...Object.keys(qadLoc)])].map(location=>({location,physicalQty:physLoc[location]||0,qadQty:qadLoc[location]||0,delta:(physLoc[location]||0)-(qadLoc[location]||0)})),bomReferences:[]}});
const unexpected=item("UNEXPECTED",5,0,{ZWHSE:5},{},false,false);
let findings=buildDiscrepancyFindings({campaignId:"TEST",reconciliation:[unexpected]});
assert(findings.some(f=>f.ruleCode==="UNEXPECTED"));
assert(findings.some(f=>f.ruleCode==="UNVALUED"));

const pure=item("PURE",80,100,{ZWHSE:80},{ZWHSE:100});
findings=buildDiscrepancyFindings({campaignId:"TEST",reconciliation:[pure]});
assert(!findings.some(f=>f.ruleCode==="LOCATION_CANDIDATE"));

const moved=item("MOVE",80,100,{ZWIP:80,ZWHSE:0},{ZWIP:0,ZWHSE:100});
findings=buildDiscrepancyFindings({campaignId:"TEST",reconciliation:[moved]});
const candidate=findings.find(f=>f.ruleCode==="LOCATION_CANDIDATE");
assert(candidate&&candidate.whatFound.includes("80 piezas"));
assert.equal(candidate.locationAnalysis.surplus,80);
assert.equal(candidate.locationAnalysis.shortage,100);
assert.equal(candidate.locationAnalysis.compensable,80);
assert.equal(candidate.locationAnalysis.rows.length,2);
assert.equal(moved.financial.netPieces,-20);
const grouped=groupFindingsByPart(findings);
assert.equal(grouped.filter(r=>r.partNumber==="MOVE").length,1);

const areas=parse4WallAreas([{"Nombre":"AREA-X","Localidad QAD":""}]);
const scans=parse4WallScans([{"Número Parte QAD":"P1","Quantity":"3","AreaName":"AREA-X"}],areas);
assert(scans.unmappedAreaNames.includes("AREA-X"));
assert.equal(scans.byPart.get("P1").locations.get("UNMAPPED"),3);
const invalid=parse4WallScans([{"Número Parte QAD":"P2","Quantity":"NOPE","AreaName":"AREA-X"}],areas);
assert.equal(invalid.invalidQuantityCount,1);
assert.equal(invalid.scanCount,0);

const prev={valid:true,campaignId:"C1",rulesVersion:"R",references:[{type:"qad",fingerprint:"A"}],snapshotMeta:{complete:true}};
const current={...prev,references:[{type:"qad",fingerprint:"B"}]};
assert.equal(snapshotsComparable(prev,current).ok,false);
let synced=syncOperationalAlerts({},[{id:"A",partNumber:"P",ruleCode:"Q"}],"2026-01-01T00:00:00Z",true);
synced=syncOperationalAlerts(synced.state,[{id:"A",partNumber:"P",ruleCode:"Q"}],"2026-01-01T00:03:00Z",true);
assert.equal(Object.keys(synced.state).length,1);
assert.equal(synced.newIds.length,0);
const unavailable=syncOperationalAlerts(synced.state,[],"2026-01-01T00:06:00Z",false);
assert.equal(unavailable.state.A.active,true);
console.log("Discrepancy verification OK");
