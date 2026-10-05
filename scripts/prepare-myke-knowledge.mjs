import { readFileSync, writeFileSync } from "node:fs";
import { buildMykeKnowledge } from "../src/domain/mykeOrganization.js";
const target = new URL(
  "../supabase/functions/myke-chat/knowledge.generated.json",
  import.meta.url,
);
const { topics } = buildMykeKnowledge(
  readFileSync(new URL("../README.md", import.meta.url), "utf8"),
);
const content =
  JSON.stringify(
    {
      topics: topics.map(({ id, title, paragraphs, keywords, sources }) => ({
        id,
        title,
        paragraphs,
        keywords,
        sources,
      })),
    },
    null,
    2,
  ) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== content)
    throw new Error("Myke knowledge is stale: run npm run myke:knowledge");
  console.log(
    "Myke server knowledge matches canonical README (no internal roles).",
  );
} else writeFileSync(target, content);
