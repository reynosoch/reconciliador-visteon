import { createMykeHandler } from "./handler.mjs";
import knowledge from "./knowledge.generated.json" with { type: "json" };

import projectContext from "./project-context.generated.json" with { type: "json" };

Deno.serve(
  createMykeHandler({
    provider: Deno.env.get("MYKE_PROVIDER") || "gemini",
    copilotSecret: Deno.env.get("MYKE_COPILOT_DIRECT_LINE_SECRET"),
    copilotEndpoint: Deno.env.get("MYKE_COPILOT_DIRECT_LINE_ENDPOINT") || "https://directline.botframework.com/v3/directline",
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
