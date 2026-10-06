import { buildMykeLocalMessages, getMykeLocalSupport } from "./mykeLocalContext.js";
export const MYKE_LOCAL_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";

// Optional inference runs in a dedicated worker, including on CPUs without WebGPU.
export async function createMykeLocalSession({
  signal, onProgress = () => {}, navigatorLike = globalThis.navigator,
  workerFactory = async () => {
    const { default: LocalWorker } = await import("./mykeLocal.worker.js?worker");
    signal?.throwIfAborted();
    return new LocalWorker();
  },
  loadContext = async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}myke/project-context.generated.json`, { signal });
    if (!response.ok) throw new Error("No se pudo cargar la documentación de Myke.");
    return response.json();
  },
} = {}) {
  signal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(300000)]);
  signal.throwIfAborted();
  const support = getMykeLocalSupport(navigatorLike);
  if (!support.supported) throw new Error(support.message);
  const adapter = await navigatorLike.gpu.requestAdapter().catch(() => null);
  if (!adapter?.features.has("shader-f16")) throw new Error("La GPU de este equipo no es compatible con el modelo local. Las guías siguen disponibles.");
  let worker, sequence = 0, disposed = false;
  const dispose = () => { disposed = true; worker?.terminate(); worker = undefined; };
  const rpc = (type, payload, operationSignal, progress = () => {}) => {
    operationSignal.throwIfAborted();
    if (!worker || disposed) return Promise.reject(new Error("Activa de nuevo la IA en este equipo."));
    const id = ++sequence, target = worker;
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        target.removeEventListener("message", receive);
        target.removeEventListener("error", fail);
        operationSignal.removeEventListener("abort", abort);
      };
      const receive = (event) => {
        const message = event.data;
        if (message?.id !== id) return;
        if (message.type === "progress") { progress(message.progress); return; }
        cleanup();
        if (message.type === "error") reject(new Error(message.error));
        else resolve(message.text);
      };
      const fail = () => { cleanup(); dispose(); reject(new Error("El equipo no pudo iniciar la IA. La guía sigue disponible.")); };
      const abort = () => { cleanup(); dispose(); reject(operationSignal.reason || new DOMException("Canceled", "AbortError")); };
      target.addEventListener("message", receive);
      target.addEventListener("error", fail);
      operationSignal.addEventListener("abort", abort, { once: true });
      try { target.postMessage({ id, type, ...payload }); } catch { fail(); }
    });
  };
  try {
    const context = await loadContext();
    signal.throwIfAborted();
    worker = await workerFactory();
    signal.throwIfAborted();
    await rpc("load", { model: MYKE_LOCAL_MODEL }, signal, onProgress);
    return {
      dispose,
      async generate({ question, history, topics, topicIds, signal: querySignal }) {
        const messages = buildMykeLocalMessages({ question, history, topics, topicIds, context });
        querySignal = AbortSignal.any([...(querySignal ? [querySignal] : []), AbortSignal.timeout(120000)]);
        return rpc("generate", { messages }, querySignal);
      },
    };
  } catch (error) {
    dispose();
    if (signal.aborted) throw error;
    throw new Error("No se pudo preparar la IA local: " + error.message + " Puedes seguir con las preguntas frecuentes.", { cause: error });
  }
}
