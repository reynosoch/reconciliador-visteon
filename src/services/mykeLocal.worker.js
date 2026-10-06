import { createMykeLocalWorkerHandler } from "./mykeLocalWorkerRuntime.js";
const handle = createMykeLocalWorkerHandler({ send: (message) => self.postMessage(message) });
self.onmessage = (event) => handle(event.data);
