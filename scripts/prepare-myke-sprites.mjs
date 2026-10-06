import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Original code-authored pixel art. Each row is a pose, each column a frame.
export const spritePoses = ["idle", "welcome", "typing", "reading", "dragging", "landing", "thinking", "sleeping", "success", "sad"];
export function buildMykeSprites() {
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  // Navy shell, orange energy rim and a quiet Visteon V; original stepped silhouette.
  const body = '<path fill="#071e31" d="M16 8h16v3h6v5h4v26h-5v5h-7v-4h-5v5h-7v-4h-5v3H6V20h3v-6h7z"/>' + '<path fill="#f5821f" d="M16 10h16v3h5v5h3v22h-5v5h-4v-5h-7v5h-5v-5h-5v3H8V21h3v-5h5z"/>' + '<path fill="#164860" d="M17 12h14v3h5v6h2v17h-5v4h-2v-4h-8v4h-3v-4h-6v2h-4V23h3v-6h4z"/>' + rect(15, 17, 20, 17, "#082b42") + rect(16, 13, 5, 2, "#79b4c3") + rect(11, 24, 2, 9, "#286c83") + '<path fill="#9ac8d5" d="M22 40h2l2 3 2-3h2l-4 6z"/>';
  const frames = spritePoses.map((pose, row) => Array.from({ length: 8 }, (_, frame) => {
    const bob = [0, -1, -1, 0, 1, 1, 0, 0][frame];
    const lift = pose === "welcome" || pose === "success" ? [0, -2, -3, -2, 0, 1, 0, 0][frame] : pose === "landing" ? [1, 2, 1, -1, -2, -1, 0, 0][frame] : pose === "sleeping" ? 2 : bob;
    const shift = pose === "dragging" ? [0, 1, 2, 1, 0, -1, -2, -1][frame] : 0;
    const closed = pose === "sleeping" || (pose === "idle" && frame === 6);
    const gaze = ["reading", "thinking"].includes(pose) ? (frame < 4 ? -1 : 1) : pose === "dragging" ? Math.sign(shift) : pose === "typing" ? (frame < 4 ? -1 : 1) : 0;
    const eyes = closed ? rect(17, 31, 6, 2, "#17394b") + rect(29, 31, 6, 2, "#17394b") : [17, 29].map((x) => rect(x, 23, 7, 10, "#bceaf1") + rect(x + 2 + gaze, pose === "typing" ? 28 : 25, 3, 5, "#17394b") + rect(x + 2 + gaze, pose === "typing" ? 28 : 25, 1, 1, "#ffffff")).join("");
    const mouth = pose === "sad" ? rect(22, 40, 2, 1, "#f5821f") + rect(24, 38, 4, 2, "#f5821f") + rect(28, 40, 2, 1, "#f5821f") : rect(22, 35, 2, 2, "#f5821f") + rect(24, 37, 4, 1, "#f5821f") + rect(28, 35, 2, 2, "#f5821f");
    const dots = pose === "thinking" ? `<g transform="rotate(${frame * 45} 24 25)"><path d="M5 19v-5h5M38 36h5v-5" fill="none" stroke="#f5821f" stroke-width="2"/></g>` : "";
    const sparkle = pose === "success" && frame < 5 ? rect(3, 15, 1, 5, "#ffd277") + rect(1, 17, 5, 1, "#ffd277") + rect(44, 27, 1, 5, "#ffd277") + rect(42, 29, 5, 1, "#ffd277") : "";
    const sleep = pose === "sleeping" ? '<path d="M36 2h5l-5 4h5" stroke="#a1c8d9" fill="none"/>' : "";
    return `<g transform="translate(${frame * 48} ${row * 52})">${rect(14, 50, 23, 1, "#12384b")}<g transform="translate(${shift} ${lift})"><use href="#body"/>${eyes}${mouth}</g>${dots}${sparkle}${sleep}</g>`;
  }).join("")).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="520" viewBox="0 0 384 520" shape-rendering="crispEdges"><title>Myke · sprite original sin gorra · 10 poses, 8 cuadros</title><defs><g id="body">${body}</g></defs>${frames}</svg>\n`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = new URL("../public/myke/myke-sprites.svg", import.meta.url);
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== buildMykeSprites()) throw new Error("Myke sprite is stale; run node scripts/prepare-myke-sprites.mjs");
    console.log("Myke sprite OK: original 8 × 10 atlas, no external asset dependency.");
  } else writeFileSync(target, buildMykeSprites());
}
