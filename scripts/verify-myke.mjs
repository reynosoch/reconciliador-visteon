import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMykeOrganization } from "../src/domain/mykeOrganization.js";
import { answerMyke, extractPartNumber } from "../src/domain/mykeKnowledge.js";
const organization = buildMykeOrganization(
  readFileSync(new URL("../.agents/ROLES.md", import.meta.url), "utf8"),
  readFileSync(new URL("../README.md", import.meta.url), "utf8"),
);
assert.equal(organization.manager.id, "ORCH");
assert.equal(organization.employees.length, 7);
assert.equal(organization.topics.length, 19);
assert.equal(new Set(organization.topics.map((topic) => topic.id)).size, 19);
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
  ["¿Quiénes son los agentes?", "team"],
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
  "Myke OK: actual docs/roles, 19 FAQs, topic retrieval, follow-ups, PN evidence routing and truthful unknowns; no financial calculations.",
);

assert.equal(extractPartNumber("PN: 123456"), "123456");
assert.equal(extractPartNumber("PN que aparece en la lista"), "");
