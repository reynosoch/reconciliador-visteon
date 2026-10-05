import { createMykeHandler } from "./handler.mjs";
import knowledge from "./knowledge.generated.json" with { type: "json" };

import projectContext from "./project-context.generated.json" with { type: "json" };

Deno.serve(
  createMykeHandler({
    apiKey: Deno.env.get("MYKE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY"),
    accessCode: Deno.env.get("MYKE_ACCESS_CODE"),
    allowedOrigins: (Deno.env.get("MYKE_ALLOWED_ORIGINS") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    model: Deno.env.get("MYKE_GEMINI_MODEL") || "gemini-3.8-flash",
    freeTierConfirmed: Deno.env.get("MYKE_GEMINI_FREE_TIER_CONFIRMED") === "true",
    knowledge,
    projectContext,
  }),
);
