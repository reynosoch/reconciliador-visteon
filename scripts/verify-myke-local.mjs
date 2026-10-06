import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMykeLocalSession, MYKE_LOCAL_MODEL } from "../src/services/mykeLocalAI.js";
import { createMykeLocalWorkerHandler } from "../src/services/mykeLocalWorkerRuntime.js";
import { buildMykeLocalMessages, getMykeLocalSupport } from "../src/services/mykeLocalContext.js";
import { isMykeProjectQuestion } from "../supabase/functions/myke-chat/public-question.mjs";
const context = JSON.parse(readFileSync(new URL("../public/myke/project-context.generated.json", import.meta.url)));
assert.deepEqual(context, JSON.parse(readFileSync(new URL("../supabase/functions/myke-chat/project-context.generated.json", import.meta.url))));
const { topics } = JSON.parse(readFileSync(new URL("../supabase/functions/myke-chat/knowledge.generated.json", import.meta.url)));
for (const topic of topics) assert.equal(isMykeProjectQuestion(topic.title), true, topic.title);
const messages = buildMykeLocalMessages({ question: "¿Por qué SWING no se divide entre dos?", topics, topicIds: ["swing"], context });
assert.ok(messages[0].content.includes("SWING")); assert.ok(messages[0].content.length < 4600);
assert.ok(messages[0].content.includes("No calcules dinero"));
assert.throws(() => buildMykeLocalMessages({ question: "PN: CASO-001", topics, context }), /Reconciliador/);
assert.throws(() => buildMykeLocalMessages({ question: "Dame una receta", topics, context }), /Reconciliador/);
let terminated = 0, requests = 0, record, output = [{ generated_text: "Revisa fuentes del motor." }], tokenLength = 8;
const pipeline = Object.assign(async (input, options) => { requests++; record = { input, options }; return output; }, { tokenizer: { encode: () => Array(tokenLength) } });
const navigatorLike = { userAgentData: { brands: [{ brand: "Google Chrome" }] }, gpu: { requestAdapter: async () => ({ features: new Set(["shader-f16"]) }) } };
assert.equal(getMykeLocalSupport(navigatorLike).supported, true);
assert.equal(getMykeLocalSupport({ ...navigatorLike, userAgentData: { brands: [{ brand: "Microsoft Edge" }] } }).supported, true);
assert.equal(getMykeLocalSupport({ userAgent: "Firefox/140" }).supported, false);
assert.equal(getMykeLocalSupport({ userAgent: "Chrome/140" }).supported, false);
await assert.rejects(createMykeLocalSession({ navigatorLike: { userAgent: "Safari/600" }, loadContext: () => { throw Error("must not load"); } }), /solo.*Chrome/);
await assert.rejects(createMykeLocalSession({
  navigatorLike: { ...navigatorLike, gpu: { requestAdapter: async () => ({ features: new Set() }) } },
  loadContext: () => { throw Error("must not load before GPU check"); },
}), /GPU de este equipo/);
const env = { backends: { onnx: { wasm: {} } } };
const makeWorker = () => {
  const listeners = new Map();
  const worker = {
    addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    terminate: () => { terminated++; listeners.clear(); },
    postMessage: (message) => { queueMicrotask(() => handle(message)); },
  };
  const handle = createMykeLocalWorkerHandler({
    gpu: navigatorLike.gpu, send: (data) => { for (const fn of listeners.get("message") || []) fn({ data }); },
    loadRuntime: async () => ({ env, pipeline: async (task, model, options) => {
      assert.equal(task, "text-generation"); assert.equal(model, MYKE_LOCAL_MODEL);
      assert.equal(options.device, "webgpu"); assert.equal(options.dtype, "q4f16");
      options.progress_callback({ file: "model", loaded: 50, total: 100 }); return pipeline;
    } }),
  });
  return worker;
};
const fixture = { navigatorLike, workerFactory: makeWorker, loadContext: async () => context };
const progress = [];
const session = await createMykeLocalSession({ ...fixture, onProgress: (value) => progress.push(value) });
assert.deepEqual(progress, [50]); assert.equal(env.backends.onnx.wasm.numThreads, 1);
const query = { question: "¿Qué es SWING?", topics, topicIds: ["swing"], history: [] };
assert.equal(await session.generate(query), "Revisa fuentes del motor.");
assert.equal(record.options.max_new_tokens, 96); assert.equal(record.options.do_sample, false);
await assert.rejects(session.generate({ ...query, question: "Dame una receta" }), /Reconciliador/);
assert.equal(requests, 1);
output = [{ generated_text: [{ role: "assistant", content: "Respuesta de chat." }] }];
assert.equal(await session.generate(query), "Respuesta de chat.");
tokenLength = 96; await assert.rejects(session.generate(query), /No se pudo completar/);
session.dispose(); await assert.rejects(session.generate(query), /Activa de nuevo/); assert.equal(terminated, 1);
const stop = new AbortController();
const idleWorker = () => ({ addEventListener: () => {}, removeEventListener: () => {}, postMessage: () => {}, terminate: () => terminated++ });
const loading = createMykeLocalSession({ ...fixture, workerFactory: idleWorker, signal: stop.signal });
await new Promise((resolve) => setTimeout(resolve, 0)); stop.abort();
await assert.rejects(loading, { name: "AbortError" }); assert.equal(terminated, 2);
const failing = createMykeLocalSession({ ...fixture, loadContext: async () => { throw Error("No documentation"); } });
await assert.rejects(failing, /document/);
console.log("Myke local OK: source parity, all FAQs, exact-block retrieval, scope/PN isolation, Chrome/Edge gate, GPU-only, progress, string/chat output, truncation refusal, cancellation and worker release. Lifecycle mocked; real inference is reported separately.");
