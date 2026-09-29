import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { currentAlerts } from "../src/domain/visibleAlerts.js";

// Start with the exact native IndexedDB schema shipped before Dexie.
const cut = { id: "old-cut", campaignId: "INV", parts: [{ partNumber: "PN1", netUsd: -50 }] };
await new Promise((resolve, reject) => {
  const request = indexedDB.open("visteon-inventory-ui", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("state");
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const db = request.result, tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put([cut], "cuts:INV");
    tx.objectStore("state").put({ OLD: { id: "OLD", active: true, read: true, partNumber: "PN1" } }, "alerts:INV");
    tx.oncomplete = () => { db.close(); resolve(); };
  };
});
const { browserDb, idbGet, idbSet, loadAlerts, saveAlerts, archiveLegacyStorage } = await import("../src/services/browserStorage.js");
assert.deepEqual((await idbGet("cuts:INV")).value, [cut], "Dexie preserves old cuts");
assert.equal((await loadAlerts("INV")).OLD.read, true, "read state survives migration");
assert.equal(await browserDb.state.get("alerts:INV"), undefined);
const many = Object.fromEntries(Array.from({ length: 16000 }, (_, i) => [`INV:${i}`, { id: `INV:${i}`, active: true, read: false, partNumber: `P${i}`, ruleCode: "QTY_DIFF" }]));
await saveAlerts("INV", many);
assert.equal(Object.keys(await loadAlerts("INV")).length, 16000);
await saveAlerts("OTHER", { OTHER: { id: "OTHER", active: true } });
assert.equal(Object.keys(await loadAlerts("INV")).length, 16000, "campaigns stay isolated");
assert.equal(currentAlerts(many, [], false).length, 0, "no current alerts without files");
assert.equal(currentAlerts(many, [{ id: "INV:1" }], true).length, 1, "only current findings count");
assert.equal(currentAlerts(many, [{ id: "INV:1" }], false).length, 0, "failed evaluations do not surface history");
const data = new Map([["visteon.inventory.operationalAlerts.v1", JSON.stringify(many)]]);
globalThis.localStorage = { getItem: k => data.get(k) ?? null, removeItem: k => data.delete(k) };
await archiveLegacyStorage();
assert.equal(data.size, 0);
assert.equal(Object.keys(await browserDb.state.get("legacy:visteon.inventory.operationalAlerts.v1")).length, 16000);
await archiveLegacyStorage();
const put = browserDb.state.put;
browserDb.state.put = async () => { throw new DOMException("full", "QuotaExceededError"); };
assert.equal((await idbSet("new", [cut])).ok, false, "quota failure is returned, not thrown into React");
browserDb.state.put = put;
assert.deepEqual((await idbGet("cuts:INV")).value, [cut], "failed writes leave saved cuts intact");
browserDb.close();
console.log("Dexie: legacy migration, 16k alerts, isolation, no-files bell and failed-write recovery OK");
