import { readFile } from "node:fs/promises";

const readme = await readFile("README.md", "utf8");
const startMarker = "<!-- AGENT_CONTEXT_START -->";
const endMarker = "<!-- AGENT_CONTEXT_END -->";
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);

if (start < 0 || end < 0 || end <= start) {
  throw new Error("README agent context markers are missing or invalid.");
}

const context = readme
  .slice(start + startMarker.length, end)
  .trim();

process.stdout.write(context + "\n");
