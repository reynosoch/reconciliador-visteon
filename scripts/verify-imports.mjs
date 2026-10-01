import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseDelimitedFile } from "../src/parsers/parseDelimitedFile.js";
import { rawScanObject } from "../src/domain/scanView.js";
import { combineLibraries, newBomPayload, syncBomLibrary } from "../src/services/bomCloud.js";
import { mergeBomLibrary } from "../src/domain/bomLibrary.js";
const fields = [["Item Number"], ["Cost Total"], ["Status"]];
const book = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([["Título"], [], ["Item Number", "Cost Total", "Status"], [123, 1.23456, "Active"]]);
sheet.A4.z = "000000"; sheet.B4.z = "0.00";
XLSX.utils.book_append_sheet(book, sheet, "Costos");
const file = () => ({name:"cost.xlsx",arrayBuffer:async()=>XLSX.write(book,{bookType:"xlsx",type:"array"})});
const result = await parseDelimitedFile(file(), { requiredFields: fields });
assert.equal(result.rows[0]["Item Number"], "000123");
assert.equal(Number(result.rows[0]["Cost Total"]), 1.23456);
assert.equal(result.convertedTo,"csv");
XLSX.utils.book_append_sheet(book, sheet, "Otros costos");
await assert.rejects(parseDelimitedFile(file(), { requiredFields: fields }), /varias hojas/);
const parsed = await parseDelimitedFile({name:"scan.csv",arrayBuffer:async()=>new TextEncoder().encode('Número Parte QAD,Quantity,AreaName,extra\n00123,12,A1,visible').buffer});
assert.equal(rawScanObject(parsed.rows[0]).Quantity, "12");
assert.equal(rawScanObject(parsed.rows[0])["Número Parte QAD"], "00123");
assert.equal(rawScanObject(parsed.rows[0]).extra, "visible");
assert.equal(rawScanObject({numero_parte:"B",cantidad:8,area_escaneo:"A"}).Quantity,8);
assert.equal(rawScanObject({raw_record:{Quantity:6},cantidad:8}).Quantity,6);
const row = parent => ({"Parent Item":parent,Component:"C",Level:".2","Comp Phantom":"no",Usage:3});
const a = mergeBomLibrary(undefined,[row("A")],"a.txt","hash-a");
const b = mergeBomLibrary(undefined,[row("B")],"b.txt","hash-b");
const merged = combineLibraries(a,b);
assert.equal(merged.rows.length,2); assert.equal(merged.files.length,2);
assert.deepEqual(combineLibraries(merged,b),merged);
const conflict = mergeBomLibrary(undefined,[{...row("A"),Usage:9}],"conflict.txt","hash-c");
assert.throws(()=>combineLibraries(a,conflict),/cambia BOM/);
console.log("Imports OK: XLSX precision and IDs, ambiguous sheets, manual/bot viewer, shared BOM dedupe and conflicts");

assert.equal(newBomPayload(a,merged).incoming.rows.length,1);
assert.equal(newBomPayload(a,merged).incoming.rows[0]["Parent Item"],"B");
assert.equal(newBomPayload(merged,merged).incoming.rows.length,0);
assert.ok(merged.files.every(file=>!file.rows));
let calls=0;
const fakeClient = {
  from() {
    return { select() { return { eq() { return {
      async single() { return { data: { revision:calls, library:calls ? merged : a } }; }
    }; } }; } };
  },
  async rpc(name, payload) {
    assert.equal(name,"merge_inventory_bom");
    assert.equal(payload.incoming_library.rows.length,1);
    calls++;
    return {data:false};
  }
};
assert.deepEqual(await syncBomLibrary(merged,fakeClient),merged);
assert.equal(calls,1);
await syncBomLibrary(merged,{...fakeClient,async rpc(){throw new Error("Duplicate BOM must not issue RPC");}});
const { buildBomWorkbook } = await import("../src/services/exportBomWorkbook.js");
const bomBook = await buildBomWorkbook({ rows:[{...row("000123"),Component:"=TEST",Usage:0.123456,__sourceFile:"bom.txt"}] });
const roundTrip = XLSX.read(XLSX.write(bomBook,{type:"array",bookType:"xlsx"}),{type:"array"});
const bomSheet = roundTrip.Sheets["BOM registrados"];
assert.equal(bomSheet.A2.v,"000123");
assert.equal(bomSheet.B2.v,"=TEST");
assert.equal(bomSheet.B2.f,undefined);
assert.equal(XLSX.utils.sheet_to_json(bomSheet)[0].Usage,0.123456);
assert.equal(XLSX.utils.sheet_to_json(bomSheet)[0].__sourceFile,undefined);
