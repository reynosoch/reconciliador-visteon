import assert from "node:assert/strict";
import { parseBom } from "../src/parsers/parseBom.js";
import { parseDelimitedFile } from "../src/parsers/parseDelimitedFile.js";
import { explodeBom } from "../src/domain/explodeBom.js";
import { reconcileInventory } from "../src/domain/reconcileInventory.js";
import { mergeBomLibrary } from "../src/domain/bomLibrary.js";
const row = (part, level, phantom, usage) => ({
  "Parent Item": "ASSEMBLY",
  Component: part,
  Level: level,
  "Comp Phantom": phantom,
  Usage: usage,
  "Parent Phantom": "no",
});
const rows = [
  row("SCREW", ".2", "no", "5"),
  row("FRACTION", "0.2", "no", "0.0025"),
  row("ALSO", "0,2", "no", "8"),
  row("DEEP", "..3", "no", "7"),
  row("PHANTOM", ".2", "yes", "6"),
  row("FIRST", "1", "no", "10"),
  row("UNKNOWN", ".2", "", "4"),
  row("BAD", ".2", "no", "oops"),
];
const bom = parseBom(rows),
  planning = {
    byPart: new Map([
      ["ASSEMBLY", { phantom: true }],
      ["ORDINARY", { phantom: false }],
      ["MISSING", { phantom: true }],
    ]),
  };
const scan = (q) => ({
  physicalTotal: q,
  locations: new Map([["ZWHSE", q]]),
  scanCount: 1,
  areas: new Set(),
  sourceRows: [],
});
const physical = {
  byPart: new Map([
    ["ASSEMBLY", scan(48)],
    ["SCREW", scan(7)],
    ["MISSING", scan(4)],
  ]),
};
const adjustments = explodeBom({ physical, bom, planning });
assert.equal(adjustments.byPart.get("SCREW").totalContribution, 240);
assert.equal(adjustments.byPart.get("FRACTION").totalContribution, 0.12);
assert.equal(adjustments.byPart.get("ALSO").totalContribution, 384);
assert.equal(adjustments.byPart.size, 3);
assert.equal(adjustments.missingBoms[0].parentPart, "MISSING");
const reconciled = reconcileInventory({
  physical,
  bom,
  planning,
  phantomAdjustments: adjustments,
  qad: {
    byPart: new Map([
      ["ASSEMBLY", { qadTotal: 90, locations: new Map([["ZWHSE", 90]]) }],
    ]),
  },
  costs: { byPart: new Map() },
});
const parent = reconciled.find((r) => r.partNumber === "ASSEMBLY");
assert.equal(parent.physical.total, 0);
assert.equal(parent.physical.scannedTotal, 48);
assert.equal(parent.qad.total, 90);
assert.equal(parent.flags.phantomQadBalance, true);
assert.equal(
  reconciled.find((r) => r.partNumber === "SCREW").physical.total,
  247,
);
assert.equal(
  reconciled.find((r) => r.partNumber === "MISSING").flags.missingBom,
  true,
);
const empty = explodeBom({
  physical,
  bom: parseBom([row("OTHER", "..3", "no", "1")]),
  planning,
});
assert.equal(empty.emptyBoms[0].parentPart, "ASSEMBLY");
assert.equal(
  explodeBom({ physical, bom, planning: { byPart: new Map() } }).byPart.size,
  0,
);
let library = mergeBomLibrary(undefined, rows, "one.txt", "1");
assert.equal(
  mergeBomLibrary(library, rows, "copy.txt", "2").rows.length,
  rows.length,
);
assert.throws(
  () =>
    mergeBomLibrary(
      library,
      [row("SCREW", ".2", "no", "6")],
      "conflict.txt",
      "3",
    ),
  /cambia BOM/,
);
const more = [{ ...row("X", ".2", "no", "2"), "Parent Item": "NEW" }];
library = mergeBomLibrary(library, more, "two.txt", "4");
assert.equal(library.rows.length, rows.length + 1);
assert.equal(library.files.length, 2);
const text =
  "Parent Item|Component|Level|Comp Phantom|Usage\nASSEMBLY|SCREW|.2|no|5\n";
const parsed = await parseDelimitedFile({
  name: "bom.txt",
  arrayBuffer: async () => new TextEncoder().encode(text).buffer,
});
assert.equal(parsed.delimiter, "|");
assert.equal(parsed.rows.length, 1);
assert.equal(parseBom(parsed.rows).relations[0].eligibleLevel, true);
console.log(
  "Meeting rules OK: .2/NO, fractions, phantom raw scans, unchanged QAD, missing/empty BOM, cumulative imports and conflicts",
);
