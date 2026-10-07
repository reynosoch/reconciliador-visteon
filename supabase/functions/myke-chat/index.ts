import { createMykeHandler } from './handler.mjs';
import { MYKE_ORIGINS } from './runtime.mjs';
import knowledge from './knowledge.generated.json' with { type: 'json' };
import projectContext from './project-context.generated.json' with { type: 'json' };
Deno.serve(createMykeHandler({
  provider: Deno.env.get('MYKE_PROVIDER') || 'gemini',
  apiKey: Deno.env.get('MYKE_GEMINI_API_KEY') || Deno.env.get('MYKE_API_KEY') || Deno.env.get('GEMINI_API_KEY'),
  model: Deno.env.get('MYKE_GEMINI_MODEL') || Deno.env.get('MYKE_MODEL') || 'gemini-3.8-flash',
  apiBaseUrl: Deno.env.get('MYKE_API_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta',
  copilotSecret: Deno.env.get('MYKE_COPILOT_DIRECT_LINE_SECRET'),
  copilotEndpoint: Deno.env.get('MYKE_COPILOT_DIRECT_LINE_ENDPOINT') || 'https://directline.botframework.com/v3/directline',
  allowedOrigins: [...new Set([...MYKE_ORIGINS,...(Deno.env.get('MYKE_ALLOWED_ORIGINS') || '').split(',').map(s=>s.trim()).filter(s=>MYKE_ORIGINS.includes(s))])],
  publishableKeys: [Deno.env.get('MYKE_PUBLIC_APP_KEY')].filter(Boolean),
  knowledge, projectContext,
}));
