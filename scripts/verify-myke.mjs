import { buildMykeSprites, spritePoses } from "./prepare-myke-sprites.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildInventoryEngine } from "../src/domain/inventoryEngine.js";
import { buildMykeOrganization } from "../src/domain/mykeOrganization.js";
import {
  answerMyke,
  extractPartNumber,
  buildMykePartAnswer,
} from "../src/domain/mykeKnowledge.js";
const organization = buildMykeOrganization(
  readFileSync(new URL("../.agents/ROLES.md", import.meta.url), "utf8"),
  readFileSync(new URL("../README.md", import.meta.url), "utf8"),
);
assert.equal(organization.manager.id, "ORCH");
assert.equal(organization.employees.length, 11);
assert.equal(organization.topics.length, 21);
assert.equal(new Set(organization.topics.map((topic) => topic.id)).size, 21);
for (const topic of organization.topics) {
  assert.ok(topic.paragraphs.length > 0);
  assert.ok(!topic.paragraphs.some((paragraph) => paragraph.includes("<!--")));
  assert.ok(
    topic.sources.every((source) =>
      ["scans", "qad", "ispbb", "bom", "cost", "areas"].includes(source),
    ),
  );
}
const response = (question, previous = []) =>
  answerMyke(question, organization, previous);
for (const [question, topic] of [
  ["¿De dónde salen los PN?", "parts"],
  ["¿Cómo funciona el código?", "engine"],
  ["¿Por qué SWING no se divide entre dos?", "swing"],
  ["¿Cómo funciona Phantom?", "phantom"],
  ["¿Qué es un snapshot?", "snapshot"],
  ["¿Qué costo utiliza?", "cost"],
  ["¿Cómo puedo ver fuentes como Excel?", "preview"],
  ["¿Cómo cuidan el rendimiento?", "performance"],
  ["¿Cómo uso el tablero?", "dashboard"],
  ["¿Qué oportunidades de mejora puedo revisar?", "opportunities"],
  ["¿Qué pruebas ejecuta el build?", "delivery"],
])
  assert.ok(response(question).topicIds.includes(topic), question);
assert.deepEqual(response("NET y SWING").topicIds, ["net", "swing"]);
assert.deepEqual(response("Y un ejemplo?", ["phantom"]).topicIds, ["phantom"]);
assert.equal(response("¿Cómo cocino una pizza?").kind, "unknown");
assert.equal(response("Hola!").kind, "greeting");
assert.equal(response("VPTBFF-17C272-AC tiene NET -3492630?").kind, "piece");
assert.equal(
  response("¿Por qué la pieza 123456 tiene ese resultado?").pn,
  "123456",
);
assert.equal(response("¿NET usa $37.12?").kind, "answer");
assert.match(
  organization.topics
    .find((topic) => topic.id === "swing")
    .paragraphs.join(" "),
  /No se divide entre dos/,
);
assert.match(
  organization.topics
    .find((topic) => topic.id === "phantom")
    .paragraphs.join(" "),
  /no es recursiva/,
);
assert.match(
  organization.topics.find((topic) => topic.id === "net").paragraphs.join(" "),
  /Se conserva el signo/,
);
assert.equal(
  answerMyke("swing", buildMykeOrganization("", "")).kind,
  "unknown",
);
console.log(
  "Myke OK: actual docs/roles, 21 FAQs, topic retrieval, follow-ups, current PN results/evidence and truthful unknowns; no financial calculations.",
);

assert.equal(extractPartNumber("PN: 123456"), "123456");
assert.equal(extractPartNumber("PN que aparece en la lista"), "");

assert.ok(
  organization.employees.every((role) => /^#[0-9a-f]{6}$/i.test(role.color)),
);
assert.deepEqual(
  organization.employees
    .filter((role) => ["UI", "DBA", "AUD", "PERF"].includes(role.id))
    .map((role) => role.id),
  ["UI", "DBA", "AUD", "PERF"],
);
assert.deepEqual(response("¿Qué puedo hacer?").topicIds, ["capabilities"]);
const input = {
  scanRows: [{ "Número Parte QAD": "000123", Quantity: 26, AreaName: "A" }],
  areaRows: [{ Nombre: "A", "Localidad QAD": "ZWHSE" }],
  qadRows: [
    {
      "Item Number": "000123",
      Site: "179A",
      "Item Type": "PP",
      Location: "ZWIP",
      "Quantity On Hand": 20,
    },
  ],
  ispbbRows: [{ "Item Number": "000123", Site: "179A", Phantom: "NO" }],
  costRows: [{ "Item Number": "000123", "Cost Total": 4.2, Status: "ACTIVE" }],
};
const sources = Object.fromEntries(
  [
    ["scans", "scanRows"],
    ["areas", "areaRows"],
    ["qad", "qadRows"],
    ["ispbb", "ispbbRows"],
    ["cost", "costRows"],
  ].map(([key, rows]) => [
    key,
    { loaded: true, rows: input[rows], fileName: key + ".csv" },
  ]),
);
const makePiece = (overrides = {}, actualSources = null) => {
  const effective = { ...input, ...overrides };
  const engine = buildInventoryEngine(effective);
  const rowKeys = {
    scans: "scanRows",
    areas: "areaRows",
    qad: "qadRows",
    ispbb: "ispbbRows",
    cost: "costRows",
  };
  const matchingSources = Object.fromEntries(
    Object.entries(sources).map(([type, source]) => [
      type,
      { ...source, rows: effective[rowKeys[type]] },
    ]),
  );
  return buildMykePartAnswer("000123", {
    reconciliation: engine.reconciliation,
    engineSources: engine.sources,
    sources: actualSources || matchingSources,
  });
};
const piece = makePiece();
assert.equal(piece.found, true);
assert.equal(piece.complete, true);
assert.equal(
  piece.metrics.find((metric) => metric.id === "net").value,
  "$25.20",
);
assert.equal(
  piece.metrics.find((metric) => metric.id === "swing").value,
  "$193.20",
); // 26 + 20, never divided by two
assert.equal(
  piece.metrics.find((metric) => metric.id === "physical").value,
  "26",
);
assert.ok(
  piece.metrics
    .find((metric) => metric.id === "qad")
    .refs[0].evidence[0].cells.some(
      (cell) => cell.column === "Quantity On Hand" && cell.original === 20,
    ),
);
assert.ok(piece.warnings.length > 0 && piece.actions.length > 0);
assert.equal(piece.origins[0].reference.source.fileName, "scans.csv");
const unvalued = makePiece(
  { costRows: [] },
  { ...sources, cost: { loaded: false, rows: [] } },
);
assert.equal(unvalued.complete, false);
assert.equal(
  unvalued.metrics.find((metric) => metric.id === "net").value,
  "Sin valorar",
);
assert.equal(
  unvalued.metrics.find((metric) => metric.id === "phantom").value,
  "No",
);
const unknown = makePiece(
  { ispbbRows: [] },
  { ...sources, ispbb: { loaded: false, rows: [] } },
);
assert.equal(
  unknown.metrics.find((metric) => metric.id === "phantom").value,
  "Desconocido",
);
const zero = makePiece({
  costRows: [{ "Item Number": "000123", "Cost Total": 0, Status: "ACTIVE" }],
});
assert.equal(zero.metrics.find((metric) => metric.id === "net").value, "$0.00");
assert.equal(answerMyke("000123", organization).pn, "000123");
assert.equal(answerMyke("ABC", organization, [], ["ABC"]).pn, "ABC");
assert.equal(
  buildMykePartAnswer("ABSENT", {
    reconciliation: buildInventoryEngine(input).reconciliation,
  }).found,
  false,
);
assert.equal(buildMykePartAnswer("000123").found, false);
console.log(
  "Myke piece replies OK: real engine values, absolute locality SWING, actual evidence, leading zeros, absent PN, valid zero cost, unknown Phantom and incomplete/unvalued sources.",
);

assert.equal(extractPartNumber("PN: C"), "C");
assert.equal(extractPartNumber("PN de la lista"), "");

for (const topic of organization.topics)
  assert.deepEqual(
    response(topic.title).topicIds,
    [topic.id],
    `Suggested question: ${topic.title}`,
  );

const invalid = makePiece({
  costRows: [
    { "Item Number": "000123", "Cost Total": "broken", Status: "ACTIVE" },
  ],
});
assert.equal(
  invalid.metrics.find((metric) => metric.id === "net").value,
  "Sin valorar",
);
const phantom = makePiece({
  ispbbRows: [{ "Item Number": "000123", Site: "179A", Phantom: "YES" }],
});
assert.equal(
  phantom.metrics.find((metric) => metric.id === "physical").value,
  "0",
);
assert.equal(
  phantom.metrics.find((metric) => metric.id === "phantom").value,
  "Sí",
);
assert.equal(
  phantom.metrics.find((metric) => metric.id === "missingBom").value,
  "Sí",
);
assert.equal(
  phantom.metrics
    .find((metric) => metric.id === "phantom")
    .refs[0].evidence[0].cells.find((cell) => cell.column === "Phantom")
    .original,
  "YES",
);

assert.ok(!organization.topics.some((topic) => topic.id === "team"));

assert.equal(spritePoses.length, 9);
const sprite = buildMykeSprites();
assert.equal(readFileSync(new URL("../public/myke/myke-sprites.svg", import.meta.url), "utf8"), sprite);
assert.equal((sprite.match(/<use href="#body"/g) || []).length, 72);
assert.ok(!/https?:\/\/(?!www.w3.org)/.test(sprite));
console.log("Myke pixel sprite OK: 72 original frames, 9 poses, reproducible atlas.");
