import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Original code-authored pixel art. Each row is a pose, each column a frame.
export const spritePoses = ["idle", "welcome", "typing", "reading", "dragging", "landing", "thinking", "sleeping", "success", "sad"];

export function buildMykeSprites() {
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const outline = "M18 6h12v2h5v3h4v5h2v18h2v7h-3v5h-4v3h-5v-4h-4v5h-6v-4h-5v3h-5v-3H7v-5H5v-8h3V17h3v-6h4V8h3z";
  const shell = "M18 8h12v2h5v3h3v5h1v17h2v6h-3v4h-3v2h-2v-4h-8v5h-2v-4h-7v3h-3v-3H9v-5H7v-4h3V18h3v-5h4v-3h1z";
  const eye = (x, pupil) => `${rect(x + 1,20,4,2,"#fff7ef")}${rect(x,22,6,10,"#fff7ef")}${rect(x + 1,32,4,2,"#fff7ef")}${rect(x + 2 + pupil,23,2,7,"#062b3d")}${rect(x + 2 + pupil,24,1,2,"#8fdcf0")}`;
  const defs = [
    `<g id="body"><path fill="#062b3d" d="${outline}"/><path fill="#f5821f" d="${shell}"/><path fill="#c95e08" d="M36 20h3v15h2v6h-3v4h-3v2h-2v-4h-3v-6h3v-5h3zM10 33h3v6h3v5h-3v-1H9v-4H7v-4h3zM18 42h5v6h-2v-3h-3z"/>${rect(13,17,2,12,"#ffbe7a")}${rect(34,34,2,6,"#e36d10")}<path d="M20 13h3l1 3 1-3h3l-4 7z" fill="#07344a" opacity=".9"/></g>`,
    `<g id="eyes-l">${eye(15,-1)}${eye(28,-1)}</g>`,
    `<g id="eyes-c">${eye(15,0)}${eye(28,0)}</g>`,
    `<g id="eyes-r">${eye(15,1)}${eye(28,1)}</g>`,
    `<g id="eyes-down">${rect(16,20,4,2,"#fff7ef")}${rect(15,22,6,10,"#fff7ef")}${rect(16,32,4,2,"#fff7ef")}${rect(17,27,2,5,"#062b3d")}${rect(29,20,4,2,"#fff7ef")}${rect(28,22,6,10,"#fff7ef")}${rect(29,32,4,2,"#fff7ef")}${rect(30,27,2,5,"#062b3d")}</g>`,
    `<g id="eyes-closed">${rect(15,27,5,2,"#062b3d")}${rect(28,27,5,2,"#062b3d")}</g>`,
    `<g id="mouth-neutral">${rect(23,36,3,2,"#062b3d")}</g>`,
    `<g id="mouth-happy">${rect(21,35,1,2,"#062b3d")}${rect(22,37,5,1,"#062b3d")}${rect(27,35,1,2,"#062b3d")}</g>`,
    `<g id="mouth-think">${rect(22,37,5,1,"#062b3d")}${rect(26,38,1,1,"#062b3d")}</g>`,
    `<g id="mouth-sad">${rect(22,39,4,1,"#062b3d")}${rect(21,40,1,1,"#062b3d")}${rect(26,40,1,1,"#062b3d")}</g>`,
    '<g id="think"><circle cx="5" cy="18" r="1.5" fill="#8fdcf0"/><circle cx="43" cy="32" r="1.5" fill="#ffbf7c"/><path d="M6 11v-4h4M38 43h4v-4" fill="none" stroke="#f5821f" stroke-width="2"/></g>',
    '<g id="speed"><path d="M2 23h7M1 31h5" stroke="#ffbf7c" stroke-width="1.5" opacity=".85"/></g>',
    '<g id="spark"><path d="M3 15v5M1 17h5" stroke="#ffd277"/><path d="M44 27v5M42 29h5" stroke="#8fdcf0"/></g>',
    '<g id="sleep"><path d="M36 2h5l-5 4h5" stroke="#8fdcf0" fill="none"/></g>',
  ].join("");

  const frameMarkup = (pose, frame, row) => {
    const bob = [0,-1,-2,-1,0,1,1,0][frame];
    const lift = pose === "welcome" || pose === "success"
      ? [0,-2,-4,-3,-1,1,0,0][frame]
      : pose === "landing" ? [2,3,1,-2,-3,-1,0,0][frame]
        : pose === "sleeping" ? 2 : bob;
    const shift = pose === "dragging" ? [0,2,3,2,0,-2,-3,-2][frame] : 0;
    const closed = pose === "sleeping" || (pose === "idle" && frame === 6);
    const eyeId = closed ? "eyes-closed"
      : pose === "typing" ? "eyes-down"
        : ["reading","thinking"].includes(pose) ? (frame < 4 ? "eyes-l" : "eyes-r")
          : pose === "dragging" ? (shift < 0 ? "eyes-l" : shift > 0 ? "eyes-r" : "eyes-c")
            : "eyes-c";
    const mouthId = pose === "sad" ? "mouth-sad"
      : pose === "welcome" || pose === "success" ? "mouth-happy"
        : pose === "thinking" ? "mouth-think" : "mouth-neutral";
    const shadowWidth = pose === "landing" && frame < 3 ? 28 : pose === "dragging" ? 16 : 23;
    const extras = [
      pose === "thinking" ? `<use href="#think" transform="rotate(${frame * 45} 24 25)"/>` : "",
      pose === "reading" ? `<circle cx="${7 + (frame % 2)}" cy="12" r="1" fill="#8fdcf0"/><circle cx="${40 - (frame % 2)}" cy="17" r="1" fill="#ffbf7c"/>` : "",
      pose === "dragging" ? `<use href="#speed" transform="translate(0 ${frame % 3})"/>` : "",
      pose === "success" && frame < 5 ? '<use href="#spark"/>' : "",
      pose === "sleeping" ? '<use href="#sleep"/>' : "",
    ].join("");
    return `<g transform="translate(${frame * 48} ${row * 52})">${rect(24-shadowWidth/2,50,shadowWidth,1,"#062b3d")}<g transform="translate(${shift} ${lift})"><use href="#body"/><use href="#${eyeId}"/><use href="#${mouthId}"/></g>${extras}</g>`;
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
