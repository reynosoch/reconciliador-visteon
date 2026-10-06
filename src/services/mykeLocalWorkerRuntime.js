import { isMykeProjectQuestion } from "../../supabase/functions/myke-chat/public-question.mjs";
export function createMykeLocalWorkerHandler({
  send, gpu = globalThis.navigator?.gpu, loadRuntime = () => import("@huggingface/transformers"),
} = {}) {
  let generator, busy = false;
  return async ({ id, type, model, messages }) => {
    if (busy) { send({ id, type: "error", error: "Myke está atendiendo otra pregunta." }); return; }
    busy = true;
    try {
      if (type === "load") {
        if (!gpu || !(await gpu.requestAdapter().catch(() => null))?.features.has("shader-f16")) throw new Error("GPU unavailable");
        // WebGPU only, per product scope. WASM helpers use one thread.
        const { pipeline, env } = await loadRuntime();
        env.allowLocalModels = false;
        env.backends.onnx.wasm.numThreads = 1;
        const files = new Map();
        generator = await pipeline("text-generation", model, {
          dtype: "q4f16", device: "webgpu",
          revision: "cc5cc01a65cc3ff17bdb73a7de33d879f62599b0",
          progress_callback: (report) => {
            if (report.file && report.total) files.set(report.file, { loaded: report.loaded || 0, total: report.total });
            let loaded = 0, total = 0;
            for (const file of files.values()) { loaded += file.loaded; total += file.total; }
            send({ id, type: "progress", progress: total ? Math.min(99, Math.round(100 * loaded / total)) : 0 });
          },
        });
        send({ id, type: "ready" });
      } else if (type === "generate") {
        if (!generator || !Array.isArray(messages) || !isMykeProjectQuestion(messages.at(-1)?.content, messages.slice(1, -1))) throw new Error("Solo respondo preguntas sobre Reconciliador Visteon.");
        const output = await generator(messages, { max_new_tokens: 96, do_sample: false, return_full_text: false });
        const generated = output?.[0]?.generated_text;
        const text = typeof generated === "string" ? generated : generated?.at(-1)?.role === "assistant" ? generated.at(-1).content : "";
        if (typeof text !== "string" || !text.trim() || generator.tokenizer.encode(text).length >= 92) throw new Error("La IA no terminó una respuesta completa. Conservamos la guía y las fuentes.");
        send({ id, type: "result", text: text.slice(0, 5000) });
      } else throw new Error("Solicitud no reconocida.");
    } catch {
      // Do not copy runtime exceptions that might echo prompts or source contents.
      send({ id, type: "error", error: "No se pudo completar la IA local. Revisa conexión y memoria o sigue con la guía y las fuentes." });
    } finally { busy = false; }
  };
}
