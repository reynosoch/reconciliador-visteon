import { createMykeHandler } from "./handler.mjs";
import knowledge from "./knowledge.generated.json" with { type: "json" };

Deno.serve(
  createMykeHandler({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
    accessCode: Deno.env.get("MYKE_ACCESS_CODE"),
    allowedOrigins: (Deno.env.get("MYKE_ALLOWED_ORIGINS") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    model: Deno.env.get("MYKE_OPENAI_MODEL") || "gpt-4.1-mini",
    knowledge,
  }),
);
