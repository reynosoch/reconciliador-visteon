import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Original code-authored pixel art. Each row is a pose, each column a frame.
export const spritePoses = ["idle", "welcome", "typing", "reading", "dragging", "landing", "thinking", "sleeping", "success", "sad"];
export function buildMykeSprites() {
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const body = '<path fill="#9c481e" d="M14 17h20v3h5v4h3v20h-4v4h-7v-4h-5v4h-7v-4h-5v3H7V25h3v-5h4z"/>' + '<path fill="#f5821f" d="M14 19h20v3h4v4h2v16h-4v4h-4v-4h-7v4h-4v-4h-7v3H9V26h3v-4h2z"/>' + rect(12, 25, 3, 10, "#ffb960") + rect(16, 21, 6, 2, "#ffca7e") + rect(14, 37, 5, 2, "#ed6950") + rect(32, 37, 5, 2, "#ed6950");
  const frames = spritePoses.map((pose, row) => Array.from({ length: 8 }, (_, frame) => {
    const bob = [0, -1, -1, 0, 1, 1, 0, 0][frame];
    const lift = pose === "welcome" || pose === "success" ? [0, -2, -3, -2, 0, 1, 0, 0][frame] : pose === "landing" ? [1, 2, 1, -1, -2, -1, 0, 0][frame] : pose === "sleeping" ? 2 : bob;
    const shift = pose === "dragging" ? [0, 1, 2, 1, 0, -1, -2, -1][frame] : 0;
    const closed = pose === "sleeping" || (pose === "idle" && frame === 6);
    const gaze = ["reading", "thinking"].includes(pose) ? (frame < 4 ? -1 : 1) : pose === "dragging" ? Math.sign(shift) : pose === "typing" ? (frame < 4 ? -1 : 1) : 0;
    const eyes = closed ? rect(17, 31, 6, 2, "#17394b") + rect(29, 31, 6, 2, "#17394b") : [17, 29].map((x) => rect(x, 26, 7, 9, "#fff5dc") + rect(x + 2 + gaze, pose === "typing" ? 30 : 28, 3, 5, "#17394b") + rect(x + 2 + gaze, pose === "typing" ? 30 : 28, 1, 1, "#ffffff")).join("");
    const mouth = pose === "sad" ? rect(22, 40, 2, 1, "#80401f") + rect(24, 38, 4, 2, "#80401f") + rect(28, 40, 2, 1, "#80401f") : rect(22, 38, 2, 2, "#80401f") + rect(24, 40, 4, 1, "#80401f") + rect(28, 38, 2, 2, "#80401f");
    const dots = pose === "thinking" ? [0, 1, 2].map((i) => rect(21 + i * 4, 2, 2, 2, i === frame % 3 ? "#fff5dc" : "#32708a")).join("") : "";
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
