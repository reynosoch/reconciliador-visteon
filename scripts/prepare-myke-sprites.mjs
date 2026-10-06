import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Original code-authored pixel art. Each row is a pose, each column a frame.
export const spritePoses = ["idle", "welcome", "typing", "reading", "dragging", "landing", "thinking", "sleeping", "success", "sad"];
export function buildMykeSprites() {
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  // Original white/lilac pixel ghost, adapted to the reference silhouette; no glass or costume.
  const outline = "M18 6h12v2h5v3h4v5h2v18h2v7h-3v5h-4v3h-5v-4h-4v5h-6v-4h-5v3h-5v-3H7v-5H5v-8h3V17h3v-6h4V8h3z";
  const body = `<path fill="#20213b" d="${outline}"/>` + '<path fill="#f9fbff" d="M18 8h12v2h5v3h3v5h1v17h2v6h-3v4h-3v2h-2v-4h-8v5h-2v-4h-7v3h-3v-3H9v-5H7v-4h3V18h3v-5h4v-3h1z"/>' + '<path fill="#c5c7f5" d="M36 20h3v15h2v6h-3v4h-3v2h-2v-4h-3v-6h3v-5h3zM10 33h3v6h3v5h-3v-1H9v-4H7v-4h3zM18 42h5v6h-2v-3h-3z"/>' + rect(13, 17, 2, 12, "#ffffff") + rect(34, 34, 2, 6, "#e1e2ff");
  const frames = spritePoses.map((pose, row) => Array.from({ length: 8 }, (_, frame) => {
    const bob = [0, -1, -1, 0, 1, 1, 0, 0][frame];
    const lift = pose === "welcome" || pose === "success" ? [0, -2, -3, -2, 0, 1, 0, 0][frame] : pose === "landing" ? [1, 2, 1, -1, -2, -1, 0, 0][frame] : pose === "sleeping" ? 2 : bob;
    const shift = pose === "dragging" ? [0, 1, 2, 1, 0, -1, -2, -1][frame] : 0;
    const closed = pose === "sleeping" || (pose === "idle" && frame === 6);
    const gaze = ["reading", "thinking"].includes(pose) ? (frame < 4 ? -1 : 1) : pose === "dragging" ? Math.sign(shift) : pose === "typing" ? (frame < 4 ? -1 : 1) : 0;
    const eyes = closed ? rect(15, 27, 5, 2, "#252139") + rect(28, 27, 5, 2, "#252139") : [15, 28].map((x) => rect(x + 1, 20, 4, 2, "#252139") + rect(x, 22, 6, 10, "#252139") + rect(x + 1, 32, 4, 2, "#252139") + rect(x + 2 + gaze, pose === "typing" ? 26 : 23, 2, 5, "#fcfcff") + rect(x + 2 + gaze, 30, 1, 2, "#9690d9")).join("");
    const mouth = pose === "sad" ? rect(22, 38, 4, 1, "#252139") + rect(21, 39, 1, 1, "#252139") + rect(26, 39, 1, 1, "#252139") : pose === "success" || pose === "welcome" ? rect(22, 35, 1, 2, "#252139") + rect(23, 37, 3, 1, "#252139") + rect(26, 35, 1, 2, "#252139") : rect(23, 36, 3, 2, "#252139");
    const dots = pose === "thinking" ? `<g transform="rotate(${frame * 45} 24 25)"><path d="M5 19v-5h5M38 36h5v-5" fill="none" stroke="#f5821f" stroke-width="2"/></g>` : "";
    const sparkle = pose === "success" && frame < 5 ? rect(3, 15, 1, 5, "#ffd277") + rect(1, 17, 5, 1, "#ffd277") + rect(44, 27, 1, 5, "#ffd277") + rect(42, 29, 5, 1, "#ffd277") : "";
    const sleep = pose === "sleeping" ? '<path d="M36 2h5l-5 4h5" stroke="#a1c8d9" fill="none"/>' : "";
    return `<g transform="translate(${frame * 48} ${row * 52})">${rect(14, 50, 23, 1, "#12384b")}<g transform="translate(${shift} ${lift})"><use href="#body"/>${eyes}${mouth}</g>${dots}${sparkle}${sleep}</g>`;
  }).join("")).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="520" viewBox="0 0 384 520" shape-rendering="crispEdges"><title>Myke · fantasma blanco/lila original · 10 poses, 8 cuadros</title><defs><g id="body">${body}</g></defs>${frames}</svg>\n`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = new URL("../public/myke/myke-sprites.svg", import.meta.url);
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== buildMykeSprites()) throw new Error("Myke sprite is stale; run node scripts/prepare-myke-sprites.mjs");
    console.log("Myke sprite OK: original 8 × 10 atlas, no external asset dependency.");
  } else writeFileSync(target, buildMykeSprites());
}
