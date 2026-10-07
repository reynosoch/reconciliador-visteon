import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createMykeHandler} from '../supabase/functions/myke-chat/handler.mjs';
import {selectMykeChatKnowledge} from '../supabase/functions/myke-chat/context.mjs';
import {validateMykeRuntime,MYKE_ORIGINS} from '../supabase/functions/myke-chat/runtime.mjs';
import {requestCopilotReply,validCopilotEndpoint} from '../supabase/functions/myke-chat/copilot.mjs';
import {getMykeAIConfig,requestMykeAI,chatMyke,createMykeProviderAdapter,createMykeRemoteAdapter,createMykeCostGuard,getMykeTelemetry} from '../src/services/mykeAI.js';
import {buildInventoryEngine} from '../src/domain/inventoryEngine.js';
import {buildMykeKnowledge} from '../src/domain/mykeOrganization.js';
import {extractPartNumber} from '../src/domain/mykeKnowledge.js';
import {createMykeReadTools,routeMykeQuestion,buildMykeRuntime} from '../src/domain/mykeTools.js';
const load=f=>JSON.parse(readFileSync(new URL('../supabase/functions/myke-chat/'+f,import.meta.url)));
const knowledge=load('knowledge.generated.json'),projectContext=load('project-context.generated.json'),organization=buildMykeKnowledge(knowledge);
for(const module of projectContext.modules){const current=readFileSync(new URL('../'+module.path,import.meta.url),'utf8');assert.equal(module.content,current);assert.equal(module.sha256,createHash('sha256').update(current).digest('hex'));assert.match(module.path,/^src\/(domain|parsers|hooks|services)\//);}
assert(projectContext.modules.some(m=>m.path.endsWith('mykeKnowledge.js')));
for(const q of ['motor','trazador evidencia','Phantom BOM','costo','QAD']){const selected=selectMykeChatKnowledge(knowledge,projectContext,q);assert(selected.topics.length<=3);assert(selected.documents.length<=2);assert(selected.modules.length<=2);assert(JSON.stringify(selected).length<24000);}
const parts=['ABC-123','DEF-456','GHI-789','JKL-012','MNO-345','GAIN-100'];
const input={scanRows:parts.map((pn,i)=>({'Número Parte QAD':pn,Quantity:i===5 ? 100 : 10,AreaName:'A'})),qadRows:parts.map((pn,i)=>({'Item Number':pn,Site:'179A','Item Type':'PP',Location:'L2','Quantity On Hand':i===5 ? 1 : 100-i*10})),areaRows:[{Nombre:'A','Localidad QAD':'L1'}],ispbbRows:parts.map(pn=>({'Item Number':pn,Site:'179A',Phantom:'NO'})),costRows:parts.map(pn=>({'Item Number':pn,'Cost Total':4.2,Status:'ACTIVE'})),bomRows:[]};
const engine=buildInventoryEngine(input);
const sources=Object.fromEntries([['scans','scanRows'],['qad','qadRows'],['areas','areaRows'],['ispbb','ispbbRows'],['cost','costRows'],['bom','bomRows']].map(([type,key])=>[type,{loaded:true,rows:input[key],fileName:type+'.csv'}]));
const context={sources,reconciliation:engine.reconciliation,summary:engine.summary,diagnostics:engine.diagnostics,engineSources:engine.sources,findings:[],scanReady:true,snapshotMeta:{complete:true,extractedAt:'2026-10-07T10:00:00Z'}};
const before=JSON.stringify(engine),tools=createMykeReadTools(context),abc=engine.reconciliation.find(r=>r.partNumber==='ABC-123');
assert.equal(tools.getPartFinancials('ABC-123').net,abc.financial.netUsd);assert.equal(tools.getPartFinancials('ABC-123').swing,abc.financial.swingUsd);assert.equal(tools.getPartPhysical('ABC-123').physical,abc.physical.total);assert.equal(tools.getTopLosses(5).length,5);assert.equal(tools.getTopGains(10).length,1);assert.equal(tools.getPartTrace('MISSING-123').found,false);assert.equal(tools.getPartLocations('ABC-123')[0].physicalQty,abc.trace.swingByLocation[0].physicalQty);
for(const q of ['QAD','SWING','4WALL','ISPBB','PHANTOM','BOM','COST','NET'])assert.equal(extractPartNumber(q),'');
for(const q of ['PN: ABC-123','parte ABC-123','pieza ABC-123','qué pasa con ABC-123','ABC-123'])assert.equal(extractPartNumber(q),'ABC-123');
let aiCalls=0,sent=[];
const adapter=createMykeProviderAdapter({send:async args=>{aiCalls++;sent.push(args);return 'El motor muestra diferencias por localidad; revisaría su evidencia.';}});
const guard=()=>createMykeCostGuard({cooldown:0});
const ask=(q,extra={})=>chatMyke({question:q,organization,context,adapter,costGuard:guard(),...extra});
for(const q of ['qué es NET','net?','explícame el net','como funciona NET','net cómo se calcula','explícame SWING','qué pedo con el swing','no entiendo phantom','¿Por qué usamos Level 0.2?','¿Qué archivos necesita el reconciliador?','¿Cómo funciona el motor?','¿De dónde salen los costos?','¿Cómo funciona el trazador?','¿Qué hace el bot?','¿Qué es Gross Loss?','¿Qué es Gross Gain?','¿Qué es BOM?','¿Qué es Usage?','¿Qué es Physical?','¿Qué es 4Wall?','¿Qué es ISPBB?','¿Qué es Obsolete?','¿Qué es Unexpected?','¿Qué significa corte intradía?']){const r=await ask(q);assert.equal(r.route.route,'knowledge',q);assert.equal(r.mode,'local',q);}
assert.equal(aiCalls,0,'COST GUARD: FAQ must never call myke-chat');
for(const q of ['qué archivos faltan','qué fuentes están cargadas','top 5 pérdidas','dame las 10 peores piezas','cuál es la mayor ganancia','top 5 SWING','NET de ABC-123','cuánto Physical tiene ABC-123','ABC-123 es phantom?','ABC-123 es Obsolete?','ABC-123 es Unexpected?','qué localidades tiene ABC-123','tenemos BOM de ABC-123?','cuántos missing BOM tenemos','cómo va el corte','qué piezas requieren revisión']){const r=await ask(q);assert.equal(r.route.route,'engine',q);assert.equal(r.mode,'local',q);}
assert.equal(aiCalls,0,'COST GUARD: deterministic engine queries must never call myke-chat');
for(const q of ['por qué ABC-123 tiene tanta pérdida?','por qué tengo mucho SWING pero poco NET?']){const start=aiCalls;const r=await ask(q);assert.equal(r.mode,'remote',q);assert.equal(aiCalls-start,1);}
assert.equal(sent[0].runtime.part.net,abc.financial.netUsd);assert.equal(sent[1].runtime.summary.netUsd,engine.summary.netUsd);
const top=await ask('top 5 pérdidas');assert.equal(top.memory.parts.length,5);
const history=[{role:'you',text:'top 5 pérdidas'},{role:'myke',...top}];
const follow=await ask('de esas cinco cuál revisarías primero?',{history});assert.equal(follow.route.route,'ai');assert.equal(sent.at(-1).runtime.selectedParts.length,5);assert.equal(aiCalls,3);
const easier=await ask('explícamelo más fácil',{history:[...history,{role:'you',text:'de esas cinco cuál revisarías primero?'},{role:'myke',...follow}]});assert.equal(easier.memory.parts.length,5);assert.equal(sent.at(-1).runtime.selectedParts.length,5);
const phantom=await ask('y esa es phantom?',{history:[{role:'myke',memory:{parts:['ABC-123']}}]});assert.equal(phantom.mode,'local');assert.equal(phantom.answer.pn,'ABC-123');
await ask('por qué sale tan fea?',{uiContext:{selectedPartNumber:'ABC-123'}});assert.equal(sent.at(-1).runtime.part.partNumber,'ABC-123');
assert.equal((await ask('qué es NET',{uiContext:{selectedPartNumber:'ABC-123'}})).route.route,'knowledge');
assert.equal((await ask('y esa es phantom?',{history:[{role:'myke',memory:{parts:['ABC-123','DEF-456'],selectedPart:'DEF-456'}}]})).answer.pn,'DEF-456');
assert.equal((await ask('y esa es phantom?',{history:[{role:'myke',memory:{parts:['ABC-123','DEF-456']}}]})).route.intent,'clarify');
assert.equal((await ask('y la primera es phantom?',{history:[{role:'myke',memory:{parts:['ABC-123','DEF-456']}}]})).answer.pn,'ABC-123');
assert.equal(buildMykeRuntime('que es NET',context,'',{organization}).runtime,null);
assert.throws(()=>validateMykeRuntime({version:1,intent:'part',tools:['deleteInventory']}),/mutation/);
assert.throws(()=>validateMykeRuntime({version:1,intent:'part',tools:[],rawRows:input.scanRows}),/runtime/);
assert.throws(()=>validateMykeRuntime({version:1,intent:'part',tools:[],selectedParts:Array(11).fill({})}),/runtime/);
assert.equal(JSON.stringify(engine),before,'read tools cannot mutate engine');
for(const error of [new DOMException('timeout','TimeoutError'),Error('429'),Error('500'),TypeError('network')]){const r=await ask('por qué ABC-123 tiene tanta pérdida?',{adapter:createMykeProviderAdapter({send:async()=>{throw error;}})});assert.equal(r.mode,'fallback');assert.equal(r.answer.pn,'ABC-123');assert(!r.aiError.includes(error.message));}
const absent=createMykeRemoteAdapter({config:null});assert.equal((await ask('qué es NET',{adapter:absent})).mode,'local');assert.equal((await ask('top 5 pérdidas',{adapter:absent})).mode,'local');assert.equal((await ask('analiza estas pérdidas',{adapter:absent})).mode,'fallback');
const oldCalls=aiCalls;for(const q of ['DELETE inventario','borra BOM','Dame una receta'])await ask(q);assert.equal(aiCalls,oldCalls);
let time=0,count=0;const cachedGuard=createMykeCostGuard({now:()=>time,cooldown:1000});const counted=createMykeProviderAdapter({send:async()=>{count++;return 'Resultado';}});
const cachedAsk=(extra={})=>ask('por qué ABC-123 tiene tanta pérdida?',{adapter:counted,costGuard:cachedGuard,...extra});
assert.equal((await cachedAsk()).cacheHit,false);assert.equal((await cachedAsk()).cacheHit,true);assert.equal(count,1);time=300001;await cachedAsk();assert.equal(count,2);time+=1001;await cachedAsk({context:{...context,snapshotMeta:{...context.snapshotMeta,extractedAt:'2026-10-07T11:00:00Z'}}});assert.equal(count,3);time+=1001;await cachedAsk({context:{...context,reconciliation:engine.reconciliation.map(r=>r.partNumber==='ABC-123' ? {...r,financial:{...r.financial,netUsd:-999}} : r)}});assert.equal(count,4);
const blockedCooldown=await ask('por qué tengo mucho SWING pero poco NET?',{adapter:counted,costGuard:cachedGuard});assert.equal(blockedCooldown.mode,'fallback');assert.equal(count,4);
let release,started;const ready=new Promise(r=>started=r),wait=new Promise(r=>release=r);let dedupCalls=0;const dedupAdapter=createMykeProviderAdapter({send:async()=>{dedupCalls++;started();await wait;return 'Compartido';}});const dedupGuard=guard();const a=ask('analiza estas pérdidas',{adapter:dedupAdapter,costGuard:dedupGuard});await ready;const b=ask('analiza estas pérdidas',{adapter:dedupAdapter,costGuard:dedupGuard});release();await Promise.all([a,b]);assert.equal(dedupCalls,1);
assert(getMykeTelemetry().every(t=>Object.keys(t).sort().join(',')==='cacheHit,latency,route'));
const origin=MYKE_ORIGINS[0],config=getMykeAIConfig({VITE_SUPABASE_URL:'https://fixture.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});
assert.equal(config.url,'https://fixture.supabase.co/functions/v1/myke-chat');assert.equal(getMykeAIConfig({VITE_MYKE_AI_URL:'http://localhost:11434'}),null);assert.equal(getMykeAIConfig({VITE_SUPABASE_URL:'https://evil.test'}),null);
const generated=(text='Confirma las localidades.')=>({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'hidden'},{text}]}}]});
const defaults={apiKey:'fixture-server-key',knowledge,projectContext};
const request=(body={question:'Analiza NET y SWING'},headers={},method='POST')=>new Request('https://fixture.supabase.co/functions/v1/myke-chat',{method,headers:{origin,'content-type':'application/json',...headers},...(method==='POST' ? {body:JSON.stringify(body)} : {})});
let provider=[];const handler=createMykeHandler({...defaults,fetchImpl:async(url,options)=>{provider.push({url,options,body:JSON.parse(options.body)});return Response.json(generated());}});
for(const [body,headers,method,status] of [[{}, {origin:'https://evil.test'},'POST',403],[{}, {},'GET',405],[{}, {},'OPTIONS',204],[{question:''},{},'POST',400],[{question:'x'.repeat(1001)},{},'POST',400],[{question:'x',rawRows:input.scanRows},{},'POST',400],[{question:'x',file:'x'.repeat(24001)},{},'POST',413],[{question:'x'},{'content-type':'text/plain'},'POST',415],[{question:'DELETE inventario'},{},'POST',422],[{question:'Dame una receta'},{},'POST',422],[{question:'NET',history:Array(7).fill({role:'user',content:'NET'})},{},'POST',400],[{question:'NET',runtime:{version:1,intent:'part',tools:['deleteInventory']}},{},'POST',422],[{question:'NET',complexity:'high'},{},'POST',400]])assert.equal((await handler(request(body,headers,method))).status,status);
assert.equal(provider.length,0);
const runtime=buildMykeRuntime('por qué ABC-123 tiene tanta pérdida?',context,'',{organization}).runtime;
const response=await handler(request({question:'por qué ABC-123 tiene tanta pérdida?',runtime,history:[{role:'user',content:'api_key=PRIVATE'}]}));assert.equal(response.status,200);assert.equal((await response.json()).text,'Confirma las localidades.');
const out=provider[0];assert.match(out.url,/gemini-3\.8-flash:generateContent$/);assert.equal(out.options.headers['x-goog-api-key'],defaults.apiKey);assert.equal(out.body.generationConfig.maxOutputTokens,800);assert.equal(out.body.generationConfig.thinkingConfig.thinkingLevel,'LOW');assert(!('tools' in out.body));assert(!JSON.stringify(out.body).includes('PRIVATE'));assert(!JSON.stringify(out.body).includes(defaults.apiKey));assert(!JSON.stringify(out.body).includes('Número Parte QAD'));assert.match(out.body.systemInstruction.parts[0].text,/No recalcules/);
await handler(request({question:'compara NET y SWING',complexity:'complex',detail:true}));assert.equal(provider.at(-1).body.generationConfig.maxOutputTokens,1400);assert.equal(provider.at(-1).body.generationConfig.thinkingConfig.thinkingLevel,'MEDIUM');
for(const allowed of MYKE_ORIGINS){const r=await handler(request({}, {origin:allowed},'OPTIONS'));assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),allowed);}
const keyed=createMykeHandler({...defaults,publishableKeys:['fixture-public']});assert.equal((await keyed(request())).status,401);
for(const override of [{apiKey:''},{apiBaseUrl:'https://evil.test'},{model:'../../bad'},{knowledge:{}},{projectContext:{}}])assert.equal((await createMykeHandler({...defaults,...override})(request())).status,503);
for(const status of [400,401,404,429,500,503]){let calls=0;const h=createMykeHandler({...defaults,fetchImpl:async()=>{calls++;return Response.json({}, {status});}});assert.equal((await h(request())).status,status===429 ? 429 : 502);assert.equal(calls,1);}
for(const [data,code] of [[{candidates:[]},'empty'],[generated('x'.repeat(12001)),'truncated'],[{promptFeedback:{blockReason:'SAFETY'}},'blocked'],[{candidates:[{finishReason:'MAX_TOKENS'}]},'truncated']]){const h=createMykeHandler({...defaults,fetchImpl:async()=>Response.json(data)});assert.equal((await (await h(request())).json()).code,code);}
const timeout=createMykeHandler({...defaults,fetchImpl:async()=>{throw new DOMException('timeout','TimeoutError');}});assert.equal((await (await timeout(request())).json()).code,'timeout');
let clock=0;const rate=createMykeHandler({...defaults,now:()=>clock,fetchImpl:async()=>Response.json(generated())});for(let i=0;i<8;i++)assert.equal((await rate(request())).status,200);assert.equal((await rate(request())).status,429);for(let i=0;i<12;i++)assert.equal((await rate(request(undefined,{'x-real-ip':'fixture-'+i}))).status,200);assert.equal((await rate(request(undefined,{'x-real-ip':'new'}))).status,429);clock=60000;assert.equal((await rate(request())).status,200);
let unblock,entered=0,allStarted;const all=new Promise(r=>allStarted=r),block=new Promise(r=>unblock=r);const concurrent=createMykeHandler({...defaults,fetchImpl:async()=>{if(++entered===4)allStarted();await block;return Response.json(generated());}});const flights=Array.from({length:4},()=>concurrent(request()));await all;assert.equal((await concurrent(request())).status,429);unblock();assert((await Promise.all(flights)).every(r=>r.status===200));
for(const browserOrigin of [MYKE_ORIGINS[0],MYKE_ORIGINS[2]]){let frontendRequests=0;const mock=async(url,opts)=>{frontendRequests++;assert.equal(url,config.url);assert(!('x-myke-access-code' in opts.headers));return createMykeHandler({...defaults,fetchImpl:async()=>Response.json(generated())})(new Request(url,{...opts,headers:{...opts.headers,origin:browserOrigin}}));};assert.equal(await requestMykeAI({question:'analiza NET y SWING',config,runtime,fetchImpl:mock}),'Confirma las localidades.');assert.equal(frontendRequests,1);}
for(const status of [429,500,503])await assert.rejects(requestMykeAI({question:'NET',config,fetchImpl:async()=>new Response(null,{status})}));
const cancel=new AbortController();cancel.abort();await assert.rejects(requestMykeAI({question:'NET',config,signal:cancel.signal,fetchImpl:async(_,opts)=>opts.signal.throwIfAborted()}),{name:'AbortError'});
// Existing deployment script only deploys code; no secrets copied or paid smoke call.
const activation=new URL('../scripts/activate-myke.mjs',import.meta.url).pathname;
const run=env=>spawnSync(process.execPath,[activation],{env:{PATH:process.env.PATH,...env},encoding:'utf8'});
assert.match(run({}).stderr,/SUPABASE_ACCESS_TOKEN/);assert.match(run({SUPABASE_ACCESS_TOKEN:'fixture',VITE_SUPABASE_URL:'https://unrelated.supabase.co'}).stderr,/proyecto/);
const dir=mkdtempSync(join(tmpdir(),'myke-deploy-'));try{const record=join(dir,'commands');writeFileSync(join(dir,'supabase'),`#!${process.execPath}\nrequire('fs').appendFileSync(process.env.CLI_RECORD,JSON.stringify(process.argv.slice(2))+'\\n');if(!process.argv.includes('--help'))process.exit(9);`,{mode:0o700});const result=run({PATH:dir+':'+process.env.PATH,CLI_RECORD:record,SUPABASE_ACCESS_TOKEN:'fixture',VITE_SUPABASE_URL:'https://uukhwkywmnarcfruerpp.supabase.co'});assert.notEqual(result.status,0);const commands=readFileSync(record,'utf8').trim().split('\n').map(JSON.parse);assert.deepEqual(commands[1],['functions','deploy','myke-chat','--project-ref','uukhwkywmnarcfruerpp','--no-verify-jwt']);assert(!readFileSync(record,'utf8').includes('fixture'));}finally{rmSync(dir,{recursive:true,force:true});}
// Preserve the existing server-only Copilot adapter contract without exposing selection to employees.
assert(validCopilotEndpoint('https://directline.botframework.com/v3/directline'));assert(!validCopilotEndpoint('https://evil.test'));let posted=false,copilotCalls=0;
const copilot=createMykeHandler({...defaults,provider:'copilot',copilotSecret:'fixture-copilot-secret',fetchImpl:async(url,opts)=>{copilotCalls++;assert.equal(opts.headers.Authorization,'Bearer fixture-copilot-secret');if(url.endsWith('/conversations'))return Response.json({conversationId:'case/1'});if(opts.method==='POST'){posted=true;return Response.json({id:'q1'});}return Response.json({watermark:'1',activities:posted ? [{type:'message',from:{id:'bot'},replyToId:'q1',text:'Confirma SWING.'}] : []});}});assert.equal((await copilot(request())).status,200);assert.equal(copilotCalls,4);await assert.rejects(requestCopilotReply({secret:'fixture',endpoint:'https://evil.test',text:'NET',fetchImpl:()=>{throw Error('must not call');}}),/unconfigured/);
assert.equal(JSON.stringify(engine),before);
console.log('Myke Hybrid OK: zero-call FAQ/engine cost regression guards, PN/router/memory/UI context, authoritative read tools, bounded whitelist/retrieval, cache/TTL/invalidation/dedup/cooldown, safe telemetry, local fallback, shared localhost/Pages transport, Edge CORS/validation/quota/concurrency/timeouts, Gemini and retained Copilot contracts. All providers mocked; no paid requests.');

// Conversation regressions use the real client -> Edge -> Gemini contract with only HTTP mocked.
// Casual replies, templates and tools must make zero requests to the Edge route.
let conversationalRequests=0,reasoningRequests=0;
const conversationalPayloads=[];
const conversationHandler=createMykeHandler({...defaults,fetchImpl:async(_,opts)=>{
  reasoningRequests++;
  const body=JSON.parse(opts.body);
  const grounding=JSON.parse(body.systemInstruction.parts[0].text.split('CONTEXTO (DATOS):\n')[1]);
  conversationalPayloads.push(grounding.runtime);
  assert(!JSON.stringify(body).includes('Quantity On Hand'));
  return Response.json(generated('Revisaría DEF-456 primero; la causa requiere confirmar las localidades y su evidencia.'));
}});
const conversationAdapter=createMykeRemoteAdapter({config,fetchImpl:async(url,opts)=>{
  conversationalRequests++;
  return conversationHandler(new Request(url,{...opts,headers:{...opts.headers,origin}}));
}});
const casualExamples=['hola','holaa','hey','buenas','qué onda','que onda','q onda','qué rollo','q rollo','qué rollo myke','qué pedo myke','q pedo','andas ahí?','sigues ahí?','qué haces','cómo andas','bro','wey','myke','oye myke','gracias','va','arre','simón','sale','órale','  HOLAAAA, MYKE!!  '];
const localStates=[];
const casualResponses=[];
for(const question of casualExamples){
  const r=await ask(question,{adapter:conversationAdapter,onState:state=>localStates.push(state)});
  assert.equal(r.route.route,'casual',question);
  assert.equal(r.answer.kind,'casual',question);
  assert.equal(r.mode,'local');
  assert.doesNotMatch(r.answer.paragraphs.join(' '),/No encuentro una respuesta respaldada|Estimado usuario/);
  assert.doesNotMatch(r.answer.paragraphs.join(' '),/\p{Extended_Pictographic}/u);
  casualResponses.push(r.answer.paragraphs[0]);
}
assert(new Set(casualResponses).size>3,'casual replies vary locally');
assert.equal(conversationalRequests,0);assert(!localStates.includes('pending'),'no simulated thinking on instant local replies');
const casualRegression=await ask('q rollo myke',{adapter:conversationAdapter});
assert.equal(casualRegression.route.route,'casual');
assert(!casualRegression.answer.paragraphs.includes('No encuentro una respuesta respaldada para esa pregunta en mi ayuda local.'));
for(const question of ['qué pedo con swing','qué pedo con este swing','q es net','hola myke, top 5 pérdidas','top 10 swing','Physical de ABC-123','QAD de ABC-123']){
  const r=await ask(question,{adapter:conversationAdapter});
  assert(['knowledge','engine'].includes(r.route.route),question);
}
assert.equal(conversationalRequests,0);
const thread=[];
const threadGuard=createMykeCostGuard({cooldown:0});
const say=async(question,extra={})=>{
  const r=await chatMyke({question,history:thread.slice(-8),context,organization,adapter:conversationAdapter,costGuard:threadGuard,...extra});
  thread.push({role:'you',text:question},{role:'myke',...r});return r;
};
assert.equal((await say('q rollo myke')).route.route,'casual');
assert.equal((await say('como va el corte?')).route.route,'engine');
assert.equal((await ask('qué pedo con este corte',{adapter:conversationAdapter})).route.route,'engine');
const threadTop=await say('dame top 5 pérdidas');
const actualTop=tools.getTopLosses(5).map(p=>p.partNumber);
assert.deepEqual(threadTop.memory.parts,actualTop);assert.equal(conversationalRequests,0);
const threadAnalysis=await say('de esas cuál revisarías primero y por qué?');
assert.equal(threadAnalysis.route.route,'ai');assert.equal(threadAnalysis.mode,'remote');
assert.equal(conversationalRequests,1);assert.equal(reasoningRequests,1);
assert.deepEqual(conversationalPayloads[0].selectedParts.map(p=>p.partNumber),actualTop);
assert.equal(threadAnalysis.memory.selectedPart,'DEF-456');
const threadPhantom=await say('y esa es phantom?');
assert.equal(threadPhantom.route.route,'engine');assert.equal(threadPhantom.answer.pn,'DEF-456');
assert.equal(conversationalRequests,1);assert.equal(threadPhantom.memory.selectedPart,'DEF-456');
const threadCause=await say('entonces por qué sale así?');
assert.equal(threadCause.mode,'remote');assert.equal(conversationalRequests,2);assert.equal(reasoningRequests,2);
assert.equal(conversationalPayloads[1].part.partNumber,'DEF-456');
assert.equal(conversationalPayloads[1].part.net,tools.getPartFinancials('DEF-456').net);
await say('va');assert.equal(conversationalRequests,2);
assert.equal((await say('y la segunda es obsolete?')).answer.pn,actualTop[1]);assert.equal(conversationalRequests,2);
assert.equal((await say('compáralas')).mode,'remote');assert.equal(conversationalRequests,3);
assert.deepEqual(conversationalPayloads.at(-1).selectedParts.map(p=>p.partNumber),actualTop);
await say('por qué');assert.equal(conversationalRequests,4);assert.equal(conversationalPayloads.at(-1).part.partNumber,'DEF-456');
const outside=await say('quién ganó el mundial?');
assert.equal(outside.route.route,'out_of_scope');assert.equal(outside.answer.kind,'scope');assert.equal(conversationalRequests,4);
assert.equal((await say('qué ves raro aquí?',{uiContext:{selectedPartNumber:'GHI-789',currentSection:'tracer'}})).mode,'remote');
assert.equal(conversationalRequests,5);assert.equal(conversationalPayloads.at(-1).part.partNumber,'GHI-789');
assert.equal((await say('pq está tan fea esta pieza',{uiContext:{selectedPartNumber:'ABC-123'}})).mode,'remote');
assert.equal(conversationalRequests,6);assert.equal(conversationalPayloads.at(-1).part.partNumber,'ABC-123');
assert.equal((await ask('por qué sale tan fea?',{uiContext:{selectedFinding:{partNumber:'ABC-123'}},adapter:conversationAdapter})).mode,'remote');
assert.equal(conversationalRequests,7);assert.equal(conversationalPayloads.at(-1).part.partNumber,'ABC-123');
for(const question of ['esa','y esa?','mira esto','no entendí']){
  const r=await ask(question,{context:{},adapter:conversationAdapter});assert.equal(r.route.intent,'clarify');assert.equal(r.answer.kind,'clarify');
}
assert.equal(conversationalRequests,7,'underspecified references are clarified locally');
const knowledgeReply=await ask('qué es NET');
const simplified=await ask('no entendí',{history:[{role:'you',text:'qué es NET'},{role:'myke',...knowledgeReply}],adapter:conversationAdapter});
assert.equal(simplified.route.route,'knowledge');assert.equal(simplified.answer.kind,'simple');assert.equal(conversationalRequests,7);
const fallbackStates=[];
const offline=await ask('xq está tan mal esta pieza',{uiContext:{selectedPartNumber:'ABC-123'},adapter:createMykeRemoteAdapter({config:null}),onState:s=>fallbackStates.push(s)});
assert.equal(offline.mode,'fallback');assert.equal(offline.answer.pn,'ABC-123');
assert.match(offline.answer.paragraphs.join(' '),/Physical.*QAD.*NET.*SWING/);
assert.doesNotMatch(offline.answer.paragraphs.join(' '),/No encuentro una respuesta respaldada/);
assert(!fallbackStates.includes('pending'),'unconfigured adapter does not simulate an active request');
const noFacts=await ask('qué opinas del reconciliador?',{context:{},adapter:createMykeRemoteAdapter({config:null})});
assert.equal(noFacts.mode,'fallback');assert.doesNotMatch(noFacts.answer.paragraphs.join(' '),/No encuentro una respuesta respaldada/);
assert.equal(extractPartNumber('Qué hace parseQad32.js?'),'','source files must not become invented PNs');
const beforeContextChecks=conversationalRequests;
for(const question of ['top 5 pérdidas','top 10 swing']){
  const r=await ask(question,{history:thread.slice(-8),adapter:conversationAdapter});
  assert.equal(r.route.route,'engine','a new ranking must not reuse the previous selected PN');
}
assert.equal(conversationalRequests,beforeContextChecks);
const updatedSelection=await ask('por qué sale tan fea?',{history:[{role:'myke',memory:{parts:['DEF-456'],selectedPart:'DEF-456'}}],uiContext:{selectedPartNumber:'ABC-123'},adapter:conversationAdapter});
assert.equal(updatedSelection.mode,'remote');assert.equal(conversationalRequests,beforeContextChecks+1);
assert.equal(conversationalPayloads.at(-1).part.partNumber,'ABC-123','current UI selection wins over an older PN for a new question');
const backwardReference=await ask('y esa es phantom?',{history:[{role:'myke',memory:{parts:['DEF-456'],selectedPart:'DEF-456'}}],uiContext:{selectedPartNumber:'ABC-123'},adapter:conversationAdapter});
assert.equal(backwardReference.answer.pn,'DEF-456','explicit anaphora keeps the conversational PN');
assert.equal((await ask('y el segundo es phantom?',{history:[{role:'myke',memory:{parts:actualTop,listParts:actualTop}}],adapter:conversationAdapter})).answer.pn,actualTop[1]);
assert.equal(conversationalRequests,beforeContextChecks+1);
assert.equal(JSON.stringify(engine),before,'full conversation cannot mutate the engine');
console.log('Myke conversation OK: informal casual regression with zero Edge calls, full greeting/summary/top-list/reasoning/Phantom/causal chain, selected PN and preserved list/ordinals, UI tracer/finding context, local clarification/simplification, scoped external rejection and contextual offline fallback. Real client/Edge handlers; provider HTTP mocked.');
