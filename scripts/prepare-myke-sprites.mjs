import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Original code-authored pixel art. Each row is a pose, each column a frame.
export const spritePoses = ["idle", "welcome", "typing", "reading", "dragging", "landing", "thinking", "sleeping", "success", "sad"];

export function buildMykeSprites() {
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const outline = "M19 6h10v2h6v4h4v6h2v28h-5v-4h-4v5h-6v-5h-4v5h-6v-5h-4v4H7V18h2v-6h4V8h6z";
  const shell = "M19 8h10v2h6v4h2v6h2v23h-2v-3h-7v5h-2v-5h-8v5h-2v-5h-7v3H9V20h2v-6h4v-4h4z";
  const eye = (x, pupil) => `${rect(x+1,19,6,2,"#fffaf0")}${rect(x,21,8,10,"#fffaf0")}${rect(x+1,31,6,2,"#fffaf0")}${rect(x+3+pupil,23,4,7,"#135ca5")}${rect(x+4+pupil,24,2,5,"#083a73")}${rect(x+3+pupil,23,2,2,"#d9f4ff")}`;
  const defs = [
    `<g id="body"><path fill="#79360f" d="${outline}"/><path fill="#f5821f" d="${shell}"/><path fill="#dc6817" d="M35 15h2v5h2v23h-2v-3h-7v5h-2v-5h-8v5h-2v-5h-7v-3h24z"/><path fill="#ffb65b" d="M15 12h5v-2h8v2H18v3h-5v6h-2v-5h2v-2h2z"/></g>`,
    `<g id="eyes-l">${eye(12,-1)}${eye(26,-1)}</g>`,
    `<g id="eyes-c">${eye(12,0)}${eye(26,0)}</g>`,
    `<g id="eyes-r">${eye(12,1)}${eye(26,1)}</g>`,
    `<g id="eyes-down" transform="translate(0 2)">${eye(12,0)}${eye(26,0)}</g>`,
    `<g id="eyes-closed">${rect(13,27,6,2,"#062b3d")}${rect(27,27,6,2,"#062b3d")}</g>`,
    `<g id="mouth-neutral">${rect(23,36,3,2,"#062b3d")}</g>`,
    `<g id="mouth-happy">${rect(21,35,1,2,"#062b3d")}${rect(22,37,5,1,"#062b3d")}${rect(27,35,1,2,"#062b3d")}</g>`,
    `<g id="mouth-think">${rect(22,37,5,1,"#062b3d")}${rect(26,38,1,1,"#062b3d")}</g>`,
    `<g id="mouth-sad">${rect(22,39,4,1,"#062b3d")}${rect(21,40,1,1,"#062b3d")}${rect(26,40,1,1,"#062b3d")}</g>`,
    '<g id="think"><circle cx="5" cy="18" r="1.5" fill="#8fdcf0"/><circle cx="43" cy="32" r="1.5" fill="#ffbf7c"/><path d="M6 11v-4h4M38 43h4v-4" fill="none" stroke="#f5821f" stroke-width="2"/></g>',
    '<g id="spark"><path d="M3 15v5M1 17h5" stroke="#ffd277"/><path d="M44 27v5M42 29h5" stroke="#8fdcf0"/></g>',
    '<g id="sleep"><path d="M36 2h5l-5 4h5" stroke="#8fdcf0" fill="none"/></g>',
  ].join("");

  const frameMarkup = (pose, frame, row) => {
    const bob = [0,-1,-2,-1,0,1,1,0][frame];
    const lift = pose === "welcome" || pose === "success"
      ? [0,-2,-4,-3,-1,1,0,0][frame]
      : pose === "landing" ? [2,3,1,-2,-3,-1,0,0][frame]
        : pose === "sleeping" ? 2 : pose === "dragging" ? 0 : bob;
    const shift = 0;
    const closed = pose === "sleeping" || (pose === "idle" && frame === 6);
    const eyeId = closed ? "eyes-closed"
      : pose === "typing" ? "eyes-down"
        : ["reading","thinking"].includes(pose) ? (frame < 4 ? "eyes-l" : "eyes-r")
          : pose === "dragging" ? (shift < 0 ? "eyes-l" : shift > 0 ? "eyes-r" : "eyes-c")
            : "eyes-c";
    const mouthId = pose === "sad" ? "mouth-sad"
      : pose === "welcome" || pose === "success" ? "mouth-happy"
        : pose === "thinking" ? "mouth-think" : "mouth-neutral";

    const extras = [
      pose === "thinking" ? `<use href="#think" transform="rotate(${frame * 45} 24 25)"/>` : "",
      pose === "reading" ? `<circle cx="${7 + (frame % 2)}" cy="12" r="1" fill="#8fdcf0"/><circle cx="${40 - (frame % 2)}" cy="17" r="1" fill="#ffbf7c"/>` : "",

      pose === "success" && frame < 5 ? '<use href="#spark"/>' : "",
      pose === "sleeping" ? '<use href="#sleep"/>' : "",
    ].join("");
    return `<g transform="translate(${frame * 48} ${row * 52})"><g transform="translate(${shift} ${lift})"><use href="#body"/><use href="#${eyeId}"/><use href="#${mouthId}"/></g>${extras}</g>`;
  };

  const frames = spritePoses.map((pose,row) => Array.from({length:8},(_,frame)=>frameMarkup(pose,frame,row)).join("")).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="520" viewBox="0 0 384 520" shape-rendering="crispEdges"><title>Myke · fantasma naranja Visteon · 10 poses, 8 cuadros</title><defs>${defs}</defs>${frames}</svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = new URL("../public/myke/myke-sprites.svg", import.meta.url);
  if (process.argv.includes("--check")) {
    if (readFileSync(target,"utf8") !== buildMykeSprites()) throw new Error("Myke sprite is stale; run node scripts/prepare-myke-sprites.mjs");
    console.log("Myke sprite OK: orange 8 × 10 atlas, no external asset dependency.");
  } else writeFileSync(target, buildMykeSprites());
}
