import assert from "node:assert/strict";
import { parseCostPart } from "../src/parsers/parseCostPart.js";
import { reconcileInventory, calculateFinancialSummary } from "../src/domain/reconcileInventory.js";

const costs=parseCostPart([
 {"Item Number":"EMPTY","Cost Total":"","Status":"ACTIVE","Site":"1795"},
 {"Item Number":"CURRENCY","Cost Total":String.fromCharCode(36)+"1,234.50","Status":"ACTIVE","Site":"1795"},
 {"Item Number":"CONFLICT","Cost Total":"10","Status":"ACTIVE","Site":"1795"},
 {"Item Number":"CONFLICT","Cost Total":"11","Status":"ACTIVE","Site":"1795"}
]);
assert.equal(costs.byPart.get("EMPTY").hasValidCost,false);
assert.equal(costs.byPart.get("CURRENCY").costTotal,1234.5);
assert.equal(costs.byPart.get("CONFLICT").hasValidCost,false);
assert.equal(costs.byPart.get("CONFLICT").costConflict,true);

const physical={byPart:new Map([
 ["UNCOSTED",{physicalTotal:10,locations:new Map([["ZWHSE",10]]),scanCount:1,areas:new Set(["A"]),sourceRows:[]}],
 ["SWING",{physicalTotal:100,locations:new Map([["ZWIP",100]]),scanCount:1,areas:new Set(["B"]),sourceRows:[]}]
])};
const qad={byPart:new Map([
 ["UNCOSTED",{qadTotal:5,locations:new Map([["ZWHSE",5]])}],
 ["SWING",{qadTotal:100,locations:new Map([["ZWHSE",100]])}]
])};
const rows=reconcileInventory({
 physical,qad,planning:{byPart:new Map()},
 costs:{byPart:new Map([["SWING",{hasValidCost:true,costTotal:1,status:"ACTIVE",isObsolete:false}]])},
 bom:{byComponent:new Map()},phantomAdjustments:new Map()
});
const unvalued=rows.find(x=>x.partNumber==="UNCOSTED");
const swing=rows.find(x=>x.partNumber==="SWING");
assert.equal(unvalued.flags.financialStatus,"UNVALUED");
assert.equal(unvalued.financial.netPieces,5);
assert.equal(unvalued.financial.netUsd,0);
assert.equal(swing.financial.swingPieces,200);
const summary=calculateFinancialSummary(rows);
assert.equal(summary.unvaluedPartCount,1);
assert.equal(summary.swingPieces,205);
console.log("Finance verification OK");
