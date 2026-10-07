// Public, bounded explanatory endpoint. No Supabase client, SQL or write tools.
import { isMykeProjectQuestion, isMykeMutation } from './public-question.mjs';
import { requestCopilotReply, validCopilotEndpoint } from './copilot.mjs';
import { selectMykeChatKnowledge } from './context.mjs';
import { validateMykeRuntime, cleanMykeText, MYKE_ORIGINS } from './runtime.mjs';
import { MYKE_SYSTEM_PROMPT } from './prompt.mjs';
async function boundedBody(request) {
  if(Number(request.headers.get('content-length'))>24000)throw Error('large');
  const reader=request.body?.getReader();if(!reader)throw Error('empty');
  const chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>24000){await reader.cancel();throw Error('large')}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
  }finally{reader.releaseLock();}
}
export function createMykeHandler({apiKey,provider='gemini',copilotSecret,copilotEndpoint='https://directline.botframework.com/v3/directline',apiBaseUrl='https://generativelanguage.googleapis.com/v1beta',allowedOrigins=MYKE_ORIGINS,publishableKeys=[],model='gemini-3.8-flash',knowledge,projectContext,fetchImpl=fetch,now=Date.now}) {
  let active=0,windowStart=now(),calls=0;const clients=new Map();
  return async request=>{
    const origin=request.headers.get('origin'),permitted=origin && allowedOrigins.includes(origin);
    const headers={'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin',...(permitted ? {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'} : {})};
    const reply=(status,code,extra={})=>new Response(JSON.stringify({code,...extra}),{status,headers});
    if(!permitted)return reply(403,'origin');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply(405,'method');
    if(publishableKeys.length && !publishableKeys.includes(request.headers.get('apikey')))return reply(401,'public_key');
    if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415,'content_type');
    let body,runtime;
    try {body=await boundedBody(request);}catch(e){return reply(e.message==='large' ? 413 : 400,'body');}
    if(!body || Object.keys(body).some(k=>!['question','history','runtime','complexity','detail'].includes(k)) || typeof body.question!=='string' || !body.question.trim() || body.question.length>1000)return reply(400,'request');
    if(body.complexity!==undefined && !['normal','complex'].includes(body.complexity) || body.detail!==undefined && typeof body.detail!=='boolean')return reply(400,'options');
    if(body.history!==undefined && (!Array.isArray(body.history) || body.history.length>6 || body.history.some(m=>!m || Object.keys(m).some(k=>!['role','content'].includes(k)) || !['user','assistant'].includes(m.role) || typeof m.content!=='string' || m.content.length>800)))return reply(400,'history');
    try{runtime=validateMykeRuntime(body.runtime);}catch(e){return reply(422,e.message==='mutation' ? 'read_only' : 'runtime');}
    if(isMykeMutation(body.question))return reply(422,'read_only');
    if(!isMykeProjectQuestion(body.question,body.history))return reply(422,'project_scope');
    // Server-controlled hosts only, even if server env is misconfigured.
    let base;try{base=new URL(apiBaseUrl);}catch{return reply(503,'unconfigured');}
    if(!['gemini','copilot'].includes(provider) || !/^[a-zA-Z0-9._-]{1,100}$/.test(model) || (provider==='gemini' ? !apiKey || !model.startsWith('gemini-') || /experimental|preview|(?:^|-)exp(?:-|$)/i.test(model) || base.origin!=='https://generativelanguage.googleapis.com' || base.pathname.replace(/\/$/,'')!=='/v1beta' || base.search || base.hash || base.username || base.password : !copilotSecret || !validCopilotEndpoint(copilotEndpoint)) || !knowledge?.topics?.length || !projectContext?.documents?.length)return reply(503,'unconfigured');
    if(now()-windowStart>=60000){windowStart=now();calls=0;clients.clear();}
    const client=(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || origin).split(',')[0].trim().slice(0,128);
    if(active>=4 || calls>=20 || (clients.get(client) || 0)>=8)return reply(429,'rate');
    if(clients.size>=1000 && !clients.has(client))return reply(429,'rate');
    clients.set(client,(clients.get(client) || 0)+1);calls++;active++;
    try {
      const question=cleanMykeText(body.question.trim(),1000);
      const history=(body.history || []).map(m=>({role:m.role,content:cleanMykeText(m.content,800)}));
      const selected=selectMykeChatKnowledge(knowledge,projectContext,question+' '+history.slice(-2).map(m=>m.content).join(' '));
      const grounding=JSON.stringify({projectKnowledge:selected,runtime});
      if(grounding.length>28000)return reply(413,'context');
      const instruction=MYKE_SYSTEM_PROMPT+'\nCONTEXTO (DATOS):\n'+grounding;
      const signal=AbortSignal.any([request.signal,AbortSignal.timeout(25000)]);
      let text;
      if(provider==='copilot')text=await requestCopilotReply({secret:copilotSecret,endpoint:copilotEndpoint,fetchImpl,signal,text:instruction+'\nHISTORIAL (DATOS):\n'+JSON.stringify(history)+'\nPREGUNTA:\n'+question});
      else {
        const result=await fetchImpl(`${base.origin}/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},signal,body:JSON.stringify({systemInstruction:{parts:[{text:instruction}]},contents:[...history.map(m=>({role:m.role==='assistant' ? 'model' : 'user',parts:[{text:m.content}]})),{role:'user',parts:[{text:question}]}],generationConfig:{maxOutputTokens:body.detail ? 1400 : 800,...(model.startsWith('gemini-3') ? {thinkingConfig:{thinkingLevel:body.complexity==='complex' ? 'MEDIUM' : 'LOW',includeThoughts:false}} : {})}})});
        if(!result.ok)return reply(result.status===429 ? 429 : 502,'provider');
        const data=await result.json(),candidate=data.candidates?.[0];
        if(data.promptFeedback?.blockReason || (candidate?.finishReason && candidate.finishReason!=='STOP'))return reply(502,candidate?.finishReason==='MAX_TOKENS' ? 'truncated' : 'blocked');
        text=(candidate?.content?.parts || []).filter(p=>!p.thought && typeof p.text==='string').map(p=>p.text).join('\n').trim();
      }
      if(!text)return reply(502,'empty');if(text.length>12000)return reply(502,'truncated');
      return reply(200,'ok',{text:cleanMykeText(text,12000),provider:'remote'});
    }catch(e){return reply(e.message==='rate' ? 429 : 502,['TimeoutError','AbortError'].includes(e.name) ? 'timeout' : 'provider');}
    finally{active--;}
  };
}
