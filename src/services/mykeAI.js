import { isMykeProjectQuestion, isMykeMutation, MYKE_SCOPE_REPLY } from '../../supabase/functions/myke-chat/public-question.mjs';
import { cleanMykeText, validateMykeRuntime } from '../../supabase/functions/myke-chat/runtime.mjs';
import { answerMyke, answerMykeInContext, buildMykeCasualAnswer, buildMykeLiveAnswer } from '../domain/mykeKnowledge.js';
import { buildMykeRuntime, routeMykeQuestion, normalizeMykeQuestion } from '../domain/mykeTools.js';

// Both dev and Pages derive exactly the same remote Edge route. No provider URL/key.
export function getMykeAIConfig(env = import.meta.env || {}) {
  try {
    const base=new URL(env.VITE_SUPABASE_URL);
    if(base.protocol!=='https:' || !/^[a-z0-9]+\.supabase\.co$/.test(base.hostname) || base.username || base.password || base.search || base.hash || !['','/'].includes(base.pathname))return null;
    return {url:`${base.origin}/functions/v1/myke-chat`,anonKey:env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''};
  } catch {return null;}
}
export async function requestMykeAI({question,history=[],runtime=null,complexity='normal',detail=false,signal,config=getMykeAIConfig(),fetchImpl=fetch}) {
  if(!config)throw Error('El servicio IA todavía no está configurado. La ayuda local sigue disponible.');
  if(typeof question!=='string' || !question.trim() || question.length>1000)throw Error('Escribe una pregunta de hasta 1000 caracteres.');
  if(isMykeMutation(question))throw Error('Myke solo consulta y explica; no modifica inventario, archivos ni Supabase.');
  if(!isMykeProjectQuestion(question,history,runtime))throw Error(MYKE_SCOPE_REPLY);
  const safeRuntime=validateMykeRuntime(runtime);
  const recent=(Array.isArray(history) ? history : []).filter(m=>m && ['user','assistant'].includes(m.role) && typeof m.content==='string').slice(-6).map(m=>({role:m.role,content:cleanMykeText(m.content,800)}));
  let response;
  try {
    response=await fetchImpl(config.url,{method:'POST',headers:{'Content-Type':'application/json',...(config.anonKey ? {apikey:config.anonKey} : {})},signal:AbortSignal.any([...(signal ? [signal] : []),AbortSignal.timeout(30000)]),body:JSON.stringify({question:cleanMykeText(question,1000),history:recent,runtime:safeRuntime,complexity,detail})});
  } catch(error) {
    if(signal?.aborted || ['AbortError','TimeoutError'].includes(error.name))throw error;
    throw Error('No pudimos conectar con la IA. La ayuda local sigue disponible.',{cause:error});
  }
  if(!response.ok){const errors={401:'La configuración pública del servicio debe revisarse.',403:'Este sitio no tiene permiso para usar el servicio IA.',429:'El servicio IA alcanzó su cuota o está ocupado. Intenta más tarde.',422:'Myke solo consulta y explica el reconciliador.',503:'El servicio IA todavía no está configurado.'};throw Error(errors[response.status] || 'No se pudo consultar la IA. La ayuda local sigue disponible.');}
  const data=await response.json();
  if(typeof data.text!=='string' || !data.text.trim() || data.text.length>12000)throw Error('La IA no devolvió una respuesta válida. La ayuda local sigue disponible.');
  return data.text;
}
// Kept as a test/transport injection seam, never used to select a provider in React.
export function createMykeProviderAdapter({send,name='IA del reconciliador'}={}) {
  return {name,configured:typeof send==='function',async generate(args){
    if(!isMykeProjectQuestion(args.question,args.history,args.runtime))throw Error(MYKE_SCOPE_REPLY);
    if(isMykeMutation(args.question))throw Error('Myke solo consulta y explica.');
    if(typeof send!=='function')throw Error('El servicio IA no está conectado.');
    const text=await send({...args,question:cleanMykeText(args.question,1000),history:(args.history || []).slice(-6),runtime:validateMykeRuntime(args.runtime)});
    if(typeof text!=='string' || !text.trim())throw Error('No llegó una respuesta respaldada del servicio.');return text.slice(0,12000);
  }};
}
export function createMykeRemoteAdapter({config=getMykeAIConfig(),fetchImpl=fetch}={}) {
  return createMykeProviderAdapter({...(config ? {send:args=>requestMykeAI({...args,config,fetchImpl})} : {})});
}

const telemetry=[];
export const getMykeTelemetry = () => telemetry.map(row=>({...row}));
const recordRoute=(route,start,cacheHit=false)=>{telemetry.push({route,latency:Math.max(0,Date.now()-start),cacheHit});if(telemetry.length>100)telemetry.shift();};
if(import.meta.env?.DEV)globalThis.mykeCostTelemetry=getMykeTelemetry;
// Memory-only cache: no prompts, inventory or provider credentials are persisted/logged.
export function createMykeCostGuard({now=Date.now,ttl=300000,cooldown=1000}={}) {
  const cached=new Map(),pending=new Map();let started=-Infinity,active=0,revision=null;
  return {async run({key,context,generate,signal}) {
    signal?.throwIfAborted();
    const current=[context.reconciliation,context.sources,context.snapshotMeta,context.findings,context.summary];
    if(!revision || current.some((v,i)=>v!==revision[i])){cached.clear();revision=current;}
    const hit=cached.get(key);
    if(hit && now()-hit.time<ttl)return {text:hit.text,cacheHit:true};
    if(pending.has(key)){const text=await pending.get(key);signal?.throwIfAborted();return {text,cacheHit:true};}
    if(active || now()-started<cooldown)throw Error('Espera un momento para otro análisis. La información local sigue disponible.');
    started=now();active++;
    const flight=Promise.resolve().then(generate);pending.set(key,flight);
    try {const text=await flight;signal?.throwIfAborted();if(revision===current || current.every((v,i)=>v===revision[i]))cached.set(key,{text,time:now()});while(cached.size>40)cached.delete(cached.keys().next().value);return {text,cacheHit:false};}
    finally{pending.delete(key);active--;}
  }};
}
const guards=new WeakMap();
const guardFor=adapter=>{if(!guards.has(adapter))guards.set(adapter,createMykeCostGuard());return guards.get(adapter);};
const usd=v=>Number.isFinite(v) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v) : 'sin valorar';
function engineAnswer(route,runtime,context,answer) {
  if(route.intent==='clarify')return {kind:'clarify',topicIds:[],paragraphs:[route.entities.partNumbers.length ? `¿Cuál pieza quieres revisar: ${route.entities.partNumbers.join(', ')}? Puedes indicar el PN o decir «la primera» o «la segunda».` : 'Dime qué quieres revisar: un PN, el corte o un resultado de arriba. Todavía no tengo una pieza identificada para esa referencia.']};
  if(route.entities.partNumber) {
    const p=runtime.part;
    return {...answer,kind:'piece',pn:route.entities.partNumber,paragraphs:[p.found ? `${p.partNumber} tiene ${p.physical} piezas en Physical y ${p.qad} en QAD. La diferencia calculada es ${p.difference} piezas; NET ${usd(p.net)} y SWING ${usd(p.swing)}. ${p.net===null ? 'Falta un costo válido para valorar.' : p.net<0 ? 'El motor clasifica el NET como pérdida provisional; no confirma su causa.' : p.net>0 ? 'El motor muestra un sobrante provisional.' : 'Los totales coinciden; revisa las localidades y sus fuentes.'}` : `No encuentro ${p.partNumber} en el corte actual. No puedo confirmar sus cifras ni clasificación.`]};
  }
  if(['losses','gains','swing','missing_boms'].includes(route.intent)) {
    const rows=runtime.topParts || runtime.missingBoms || [];
    return {kind:'live',topicIds:[],paragraphs:[runtime.quality.incomplete ? 'Datos provisionales: faltan fuentes o el corte está en actualización.' : 'Resultados del motor; requieren validación operativa.',route.intent==='missing_boms' ? `BOM faltantes: ${runtime.missingBomCount ?? 'sin dato'}.` : `Estos son los ${rows.length} resultados disponibles por ${route.intent==='losses' ? 'mayor pérdida' : route.intent==='gains' ? 'mayor ganancia' : 'mayor SWING'}.`],sections:rows.map(r=>({title:r.partNumber || r.parentPart,pn:r.partNumber || r.parentPart,fact:r.net == null ? `Físico escaneado: ${r.scannedQuantity ?? 'sin dato'}.` : `NET ${usd(r.net)}; SWING ${usd(r.swing)}; Physical ${r.physical}; QAD ${r.qad}.`,interpretation:'No confirma una pérdida final ni su causa.',next:'Abre el trazador y confirma las fuentes.'})),actions:[{label:'Ver fuentes',action:'sources'}]};
  }
  if(runtime?.selectedParts)return {kind:'live',topicIds:[],paragraphs:['Datos calculados de las piezas seleccionadas.'],sections:runtime.selectedParts.map(p=>({title:p.partNumber,pn:p.partNumber,fact:p.found ? `NET ${usd(p.net)}; SWING ${usd(p.swing)}; Physical ${p.physical}; QAD ${p.qad}.` : 'PN ausente del corte actual.',interpretation:'La causa requiere evidencia.',next:'Revisa las localidades y el trazador.'}))};
  return buildMykeLiveAnswer(route.intent==='sources' ? 'sources' : route.intent==='summary' ? 'summary' : 'attention',context);
}

function conversationalMemory(route,runtime,answer,last) {
  const parts=route.entities.partNumbers.length ? route.entities.partNumbers : runtime?.topParts?.map(p=>p.partNumber) || runtime?.findings?.map(p=>p.partNumber) || [];
  const listParts=runtime?.topParts || parts.length>1 ? parts : last.listParts || (last.parts?.length>1 ? last.parts : []);
  return {parts:parts.slice(0,10),listParts:listParts.slice(0,10),intent:route.intent,topicIds:(answer.topicIds || []).slice(0,3),...(parts.length===1 ? {selectedPart:parts[0]} : {})};
}
function contextualFallback(answer,context) {
  if(answer.kind!=='unknown')return {...answer,paragraphs:['No pude completar el análisis. Esto sí está disponible en la página:',...answer.paragraphs]};
  if(context.reconciliation?.length)return {...buildMykeLiveAnswer('summary',context),paragraphs:['No pude completar el análisis. El motor sí tiene estos resultados:',...buildMykeLiveAnswer('summary',context).paragraphs]};
  return {kind:'fallback',topicIds:[],paragraphs:['No pude completar el análisis y todavía no tengo resultados del motor para esta consulta. Dime qué tema o PN quieres revisar; la ayuda y las fuentes locales siguen disponibles.']};
}
export async function chatMyke({question,history=[],context={},uiContext={},organization={topics:[]},signal,adapter=createMykeRemoteAdapter(),costGuard=guardFor(adapter),onState=()=>{}}) {
  const start=Date.now();signal?.throwIfAborted();
  const last=history.filter(m=>m.memory).at(-1)?.memory || {};
  const route=routeMykeQuestion({question,conversation:history,uiContext,inventoryContext:context,organization});
  if(isMykeMutation(question) || route.route==='out_of_scope') {
    recordRoute('out_of_scope',start);
    return {answer:{kind:'scope',topicIds:[],paragraphs:[isMykeMutation(question) ? 'Myke solo consulta y explica. Para cambios utiliza los controles existentes del sistema.' : MYKE_SCOPE_REPLY]},mode:'local',route:{...route,route:'out_of_scope'},memory:last};
  }
  if(route.route==='casual') {
    recordRoute('casual',start);
    return {answer:buildMykeCasualAnswer(route.intent),mode:'local',route,memory:{...last,parts:(last.parts || []).slice(0,10),topicIds:(last.topicIds || []).slice(0,3)}};
  }
  let recent=history.filter((m,i)=>m.mode==='remote' || m.role==='you' && !(['knowledge','casual','out_of_scope'].includes(history[i+1]?.route?.route) || ['bug','casual','scope'].includes(history[i+1]?.answer?.kind))).slice(-6).map(m=>({role:m.role==='you' ? 'user' : 'assistant',content:cleanMykeText(m.text || m.aiText,800)}));
  let answer=route.route==='knowledge' ? answerMyke(question,organization,last.topicIds) : answerMykeInContext(question,organization,history,context);
  if(route.intent==='simplify') {
    const topic=organization.topics.find(t=>last.topicIds?.includes(t.id));
    if(topic)answer={kind:'simple',topicIds:[topic.id],paragraphs:[topic.paragraphs[0]],sources:topic.sources};
  }
  let runtime=null,memory=conversationalMemory(route,runtime,answer,last);
  try {
    if(route.route==='engine' || route.route==='ai' && route.intent!=='knowledge') {
      runtime=buildMykeRuntime(question,context,'',{route}).runtime;
      answer=engineAnswer(route,runtime,context,answer);
    }
    memory=conversationalMemory(route,runtime,answer,last);
    if(route.route!=='ai' || answer.kind==='bug'){recordRoute(route.route==='engine' ? 'engine' : 'knowledge',start);return {answer,mode:'local',route,memory};}
    if(route.intent==='knowledge') {
      const topic=organization.topics.find(t=>last.topicIds?.includes(t.id));
      if(topic){recent=[...recent,{role:'user',content:cleanMykeText(topic.title,800)}].slice(-6);memory.topicIds=[topic.id];}
    }
    const key=JSON.stringify([normalizeMykeQuestion(question),runtime,route.complexity,/(?:esa|ese|esto|eso|arriba|facil|anterior|comparalas|por que|porque|entonces)/.test(normalizeMykeQuestion(question)) ? recent : []]);
    const result=await costGuard.run({key,context,signal,generate:()=>{
      // Thinking begins only when the guard starts an actual remote call, never on local/cache/cooldown replies.
      if(adapter.configured!==false)onState('pending');
      return adapter.generate({question,history:recent,runtime,complexity:route.complexity,detail:/paso a paso|detalle|explica todo|analisis completo/.test(normalizeMykeQuestion(question)),signal});
    }});
    signal?.throwIfAborted();onState('responding');recordRoute('ai',start,result.cacheHit);
    const mentioned=memory.parts.filter(pn=>result.text.toUpperCase().includes(pn));
    if(mentioned.length===1)memory.selectedPart=mentioned[0];
    return {answer,aiText:result.text,aiProvider:'IA del reconciliador',mode:'remote',route,memory,cacheHit:result.cacheHit};
  } catch(error) {
    if(signal?.aborted)throw error;
    onState('fallback');recordRoute('fallback',start);
    return {answer:contextualFallback(answer,context),mode:'fallback',aiError:'La causa no la puedo confirmar con este análisis. Puedes revisar las localidades y la evidencia del trazador.',route,memory};
  }
}
