import { normalizeText } from './normalize.js';
import { getMykeCasualIntent, normalizeMykeLanguage, isMykeProjectQuestion } from '../../supabase/functions/myke-chat/public-question.mjs';
import { answerMyke, buildMykeLiveAnswer, extractPartNumber } from './mykeKnowledge.js';
import { validateMykeRuntime, cleanMykeText } from '../../supabase/functions/myke-chat/runtime.mjs';
const normalized = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const date = v => {if(!v)return null;const d=new Date(v);return Number.isFinite(d.getTime()) ? d.toISOString() : null;};
const finite = v => Number.isFinite(v) ? v : null;
const limit = v => Math.max(1,Math.min(10,Number.isFinite(v) ? Math.floor(v) : 3));
const fields = item => item ? {
  partNumber:item.partNumber,found:true,status:item.flags.financialStatus,
  physical:item.physical.total,directPhysical:item.physical.directTotal,bomContribution:item.physical.bomContribution,qad:item.qad.total,
  difference:item.financial.netPieces,unitCost:item.master.hasCost ? finite(item.master.unitCost) : null,
  net:item.master.hasCost ? finite(item.financial.netUsd) : null,swing:item.master.hasCost ? finite(item.financial.swingUsd) : null,
  grossLoss:item.master.hasCost ? finite(item.financial.grossLossUsd) : null,grossGain:item.master.hasCost ? finite(item.financial.grossGainUsd) : null,
  phantom:item.master.phantomKnown ? item.master.isPhantom : null,obsolete:item.master.isObsolete,unexpected:item.flags.isUnexpectedMaterial,
  missingBom:item.flags.missingBom,emptyBom:item.flags.emptyBom,hasCost:item.master.hasCost,costState:item.master.costState,
  locationCount:item.trace.swingByLocation.length,bomSourceCount:item.trace.bomSources.length,bomRelationCount:item.trace.bomReferences.length,
} : null;
// Read engine objects only. No parsers, recomputation, fetch, database or write API.
export function createMykeReadTools(context = {}) {
  const rows=context.reconciliation || [];
  const find=pn=>rows.find(row=>row.partNumber===normalizeText(pn));
  const getPartFinancials=pn=>{const value=fields(find(pn));return value ? {...value,bomRelationCount:context.engineSources?.bom?.byParent?.get(normalizeText(pn))?.length ?? value.bomRelationCount} : {partNumber:normalizeText(pn),found:false};};
  const getPartLocations=pn=>(find(pn)?.trace.swingByLocation || []).slice(0,12).map(row=>({location:cleanMykeText(row.location,160),physicalQty:finite(row.physicalQty),qadQty:finite(row.qadQty),delta:finite(row.delta),swingPieces:finite(row.swingPieces),swingUsd:finite(row.swingUsd)}));
  const getPartBom=pn=>(context.engineSources?.bom?.byParent?.get(normalizeText(pn)) || find(pn)?.trace.bomSources || []).slice(0,8).map(row=>({parentPart:row.parentPart,componentPart:row.componentPart,location:row.location ? cleanMykeText(row.location,160) : null,usage:finite(row.usage),contribution:finite(row.contribution),bomLevel:String(row.bomLevel ?? row.rawLevel ?? row.level ?? '')}));
  const getSourceStatus=()=>['scans','qad','areas','ispbb','bom','cost'].map(type=>{const source=context.sources?.[type];const auto=type==='scans' && !source?.loaded && context.scanReady;return {type,loaded:Boolean(source?.loaded || auto),rowCount:source?.loaded ? source.rows?.length ?? null : auto ? context.snapshotMeta?.rowCount ?? null : null,fileName:source?.loaded ? cleanMykeText(source.fileName,160) : null,loadedAt:date(source?.loadedAt),extractedAt:auto ? date(context.snapshotMeta?.extractedAt) : null,freshness:'unknown'};});
  const getReconciliationSummary=()=>Object.fromEntries(['netUsd','swingUsd','grossLossUsd','grossGainUsd','physicalQty','qadQty','unvaluedPartCount','missingCostCount'].map(k=>[k,finite(context.summary?.[k])]).concat([['totalParts',rows.length]]));
  const getMissingBoms=()=> (context.engineSources?.phantomAdjustments?.missingBoms || []).slice(0,10).map(x=>({parentPart:x.parentPart,scannedQuantity:x.scannedQuantity}));
  const getDataQuality=()=>({partsWithoutCost:context.diagnostics?.warnings?.partsWithoutCost?.length ?? null,unknownPhantom:context.diagnostics?.warnings?.partsWithoutPlanningDefinition?.length ?? null,unmappedParts:context.diagnostics?.warnings?.unmappedParts?.length ?? null,missingBoms:context.engineSources?.phantomAdjustments?.missingBoms?.length ?? null,findings:context.findings?.length ?? null,incomplete:getSourceStatus().some(s=>!s.loaded) || Boolean(context.loading || context.error) || (!context.sources?.scans?.loaded && context.snapshotMeta?.complete!==true)});
  const rank=(sign,n)=>[...rows].filter(r=>r.master.hasCost && Number.isFinite(r.financial.netUsd) && (sign<0 ? r.financial.netUsd<0 : r.financial.netUsd>0)).sort((a,b)=>sign<0 ? a.financial.netUsd-b.financial.netUsd : b.financial.netUsd-a.financial.netUsd).slice(0,limit(n)).map(fields);
  return Object.freeze({getReconciliationSummary,getTopLosses:n=>rank(-1,n),getTopGains:n=>rank(1,n),getTopSwing:n=>[...rows].filter(r=>r.master.hasCost && Number.isFinite(r.financial.swingUsd)).sort((a,b)=>b.financial.swingUsd-a.financial.swingUsd).slice(0,limit(n)).map(fields),getPriorityFindings:()=>buildMykeLiveAnswer('attention',context).sections.map(r=>({partNumber:r.pn,fact:cleanMykeText(r.fact,160),interpretation:cleanMykeText(r.interpretation,160),next:cleanMykeText(r.next,160)})),getPartTrace:pn=>({...getPartFinancials(pn),locations:getPartLocations(pn),bomSources:getPartBom(pn)}),getPartFinancials,getPartLocations,getPartPhysical:pn=>getPartFinancials(pn),getPartQad:pn=>getPartFinancials(pn),getPartPhantomInfo:pn=>getPartFinancials(pn),getPartBom,getPartObsoleteInfo:pn=>getPartFinancials(pn),getPartUnexpectedInfo:pn=>getPartFinancials(pn),getMissingBoms,getSourceStatus,getLoadedSources:()=>getSourceStatus().filter(s=>s.loaded),getDataQuality,explainMetric:(metric,topics=[])=>topics.find(t=>t.id===normalized(metric)) || null});
}

export const normalizeMykeQuestion = normalizeMykeLanguage;
const reasoning = text => /\b(?:por que|porque|patron|sospechos\w*|analiz\w*|compar\w*|en comun|parece|crees|rar[oa]\w*|revisarias|revisaria|antes de la junta|mas facil|mas sencillo|no (?:lo )?entendi|que piensas|que opinas|explicame (?:este resultado|lo anterior)|expl[i]?camelo)\b/.test(text);
export function routeMykeQuestion({question,conversation=[],uiContext={},inventoryContext={},organization}) {
  const text=normalizeMykeQuestion(question);
  const last=conversation.filter(m=>m.memory).at(-1)?.memory || {};
  let parts=[];
  const result=(route,intent,tools=[],extra={})=>({route,intent,confidence:route==='ai' ? 0.7 : 0.98,
    entities:{partNumbers:parts,...(parts.length===1 ? {partNumber:parts[0]} : {})},tools,limit:5,
    complexity:/compar|patron|en comun|analisis completo/.test(text) ? 'complex' : 'normal',...extra});
  const casual=getMykeCasualIntent(question);
  if(casual)return result('casual',casual);
  const wireHistory=conversation.filter(m=>m.role==='you').slice(-6).map(m=>({role:'user',content:m.text}));
  if(!isMykeProjectQuestion(question,wireHistory,uiContext.selectedPartNumber || uiContext.selectedFinding?.partNumber || last.parts?.length ? {part:{}} : null))return result('out_of_scope','scope');
  const known=new Set((inventoryContext.reconciliation || []).map(r=>r.partNumber));
  const candidates=question.match(/[a-z0-9._/-]+/gi) || [];
  const extracted=extractPartNumber(question);
  const explicit=[...new Set([
    ...candidates.map(normalizeText).filter(pn=>known.has(pn)),
    ...(extracted ? [normalizeText(extracted)] : []),
    ...candidates.filter(pn=>/-/.test(pn) && /\d/.test(pn) && /[a-z]/i.test(pn)).map(normalizeText),
    ...(/^\d{3,}$/.test(text) ? [text] : []),
  ])].slice(0,10);
  const uiPart=uiContext.selectedPartNumber || uiContext.selectedFinding?.partNumber || '';
  const list=last.listParts?.length ? last.listParts : last.parts || [];
  const ordinal=text.match(/\b(?:la|el) (primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa])\b/)?.[1];
  const rankingRequest=/top.*(?:perdid|peores|faltant|gananc|sobrant|swing)|mayor (?:perdida|ganancia|swing)|(?:perdida|ganancia) mas grande|peores piezas/.test(text);
  const plural=/\b(?:esas|esos|anteriores|perdidas|hallazgos|comparalas|comparalos)\b/.test(text);
  const singular=/\b(?:esa|ese|esta|este|pieza|pn|esto|eso|aqui|anterior|arriba|entonces|explicamelo)\b/.test(text);
  const followup=singular || plural || Boolean(ordinal) || reasoning(text) || /^(?:y )?(?:no entendi|mira esto|por que|entonces)$/.test(text);
  if(explicit.length)parts=explicit;
  else if(ordinal){const index={primera:0,primero:0,primer:0,segunda:1,segundo:1,tercera:2,tercero:2,cuarta:3,cuarto:3,quinta:4,quinto:4}[ordinal];parts=list[index] ? [list[index]] : [];}
  else if(plural && !rankingRequest)parts=list;
  else if(followup && !rankingRequest){
    const nearby=/\b(?:aqui|esta pieza|este pn|mira esto)\b/.test(text);
    const refersBack=/\b(?:esa|ese|eso|anterior|arriba|entonces|explicamelo)\b/.test(text);
    const selected=uiPart && (nearby || !refersBack) ? uiPart : last.selectedPart || uiPart || (last.parts?.length===1 ? last.parts[0] : '');
    parts=selected ? [normalizeText(selected)] : last.intent==='knowledge' ? [] : last.parts || [];
  }
  const documentation=/funciona.*(?:motor|reconciliador)|arquitectura|codigo/.test(text) && !explicit.length && !/\b(?:esa|ese|esta pieza|este pn)\b/.test(text);
  if(documentation)parts=[];
  const n=text.match(/\b(?:top|las|los|dame)\s*(\d{1,2})\b/)?.[1];
  const requestedLimit=n ? limit(Number(n)) : /mayor|mas grande/.test(text) ? 1 : 5;
  const canonical=organization?.topics.some(t=>normalizeMykeQuestion(t.title)===text);
  const local=organization ? answerMyke(question,organization,last.topicIds || [],[]) : null;
  const definition=!explicit.length && !/que pedo con.*corte/.test(text) && (/por que.*(?:level|divide|dividen|regla)/.test(text) || /^(?:que es|que significa|como funciona|como se calcula|explicame el|explicame swing|no entiendo phantom|que pedo con|net$|swing$)/.test(text) || /(?:net|swing) como se calcula/.test(text));
  const engineQuery=/top|mayor|peores piezas|missing bom|bom.*falt|(?:fuentes?|archivos?).*(?:falt|carg|desactual|actualiz)|(?:falt|carg).*(?:fuentes?|archivos?)|calidad|sin costo|costo invalido|requieren revision|requieren atencion|prioridades|como vamos|como va el corte|resum|estado actual|reconciliacion actual|que pedo con.*corte/.test(text);
  if(local?.topicIds?.length && (canonical || definition || !engineQuery && !parts.length && !reasoning(text))){parts=[];return result('knowledge','knowledge',['explainMetric']);}
  if(ordinal && !parts.length)return result('engine','clarify',[]);
  if(parts.length>1 && !plural && !explicit.length && !reasoning(text))return result('engine','clarify',[]);
  if(parts.length)return result(reasoning(text) || parts.length>1 ? 'ai' : 'engine','part',['getPartTrace']);
  if(/top.*(?:perdid|peores|faltant)|mayor perdida|perdida mas grande|peores piezas/.test(text))return result('engine','losses',['getTopLosses'],{limit:requestedLimit});
  if(/top.*(?:gananc|sobrant)|mayor ganancia|ganancia mas grande/.test(text))return result('engine','gains',['getTopGains'],{limit:requestedLimit});
  if(/top.*swing|mayor swing/.test(text))return result('engine','swing',['getTopSwing'],{limit:requestedLimit});
  if(/missing bom|boms? faltantes|faltan? bom/.test(text))return result('engine','missing_boms',['getMissingBoms']);
  if(/(?:archivos?|fuentes?).*(?:falt|carg|desactual|actualiz)|(?:falt|carg).*(?:archivos?|fuentes?)/.test(text))return result('engine','sources',['getSourceStatus','getLoadedSources']);
  if(/calidad|sin costo|costo invalido/.test(text))return result('engine','quality',['getDataQuality']);
  if(/requieren revision|requieren atencion|prioridades/.test(text))return result('engine','priorities',['getPriorityFindings']);
  if(/como vamos|como va el corte|resum|estado actual|reconciliacion actual|que pedo con.*corte/.test(text))return result('engine','summary',['getReconciliationSummary','getDataQuality']);
  if(last.intent==='knowledge' && last.topicIds?.length && /^(?:no entendi|no entiendo|y eso|entonces|explicamelo)$/.test(text))return result('knowledge','simplify',['explainMetric']);
  if(/(?:esta|este|esa|ese) (?:pieza|pn)|^(?:y )?(?:esa|ese|mira esto|no entendi)$/.test(text))return result('engine','clarify',[]);
  if(reasoning(text) || followup && last.intent)return result('ai',last.intent==='knowledge' || documentation ? 'knowledge' : 'summary',last.intent==='knowledge' || documentation ? ['explainMetric'] : ['getReconciliationSummary','getPriorityFindings']);
  if(local?.kind==='answer')return result('knowledge','knowledge',['explainMetric']);
  // A project question without an exact template falls through once, with current engine context when relevant.
  const live=/corte|resultad|inventario|diferencia|perdida|swing|net|esto|aqui/.test(text);
  return result('ai',live ? 'summary' : 'knowledge',live ? ['getReconciliationSummary','getPriorityFindings'] : ['explainMetric']);
}
export function buildMykeRuntime(question,context={},previousPart='',options={}) {
  const route=options.route || routeMykeQuestion({question,inventoryContext:context,uiContext:{selectedPartNumber:previousPart},...options});
  const tools=createMykeReadTools(context);
  if(['knowledge','simplify','clarify'].includes(route.intent) || ['casual','out_of_scope'].includes(route.route))return {route,runtime:null};
  const runtime={version:1,intent:route.intent,tools:route.tools,snapshot:{complete:context.sources?.scans?.loaded ? true : context.snapshotMeta?.complete ?? null,ageKnown:context.snapshotMeta?.ageKnown ?? null,extractedAt:date(context.snapshotMeta?.extractedAt),publishedAt:date(context.snapshotMeta?.publishedAt),loading:Boolean(context.loading),hasError:Boolean(context.error)},sources:tools.getSourceStatus(),quality:tools.getDataQuality()};
  const parts=route.entities?.partNumbers || [];
  if(parts.length===1)runtime.part=tools.getPartTrace(parts[0]);
  if(parts.length>1)runtime.selectedParts=parts.slice(0,10).map(pn=>({...tools.getPartTrace(pn),locations:tools.getPartLocations(pn).slice(0,3),bomSources:tools.getPartBom(pn).slice(0,2)}));
  if(['losses','gains','swing'].includes(route.intent))runtime.topParts=route.intent==='losses' ? tools.getTopLosses(route.limit) : route.intent==='gains' ? tools.getTopGains(route.limit) : tools.getTopSwing(route.limit);
  if(parts.length)runtime.findings=(context.findings || []).filter(f=>parts.includes(f.partNumber)).slice(0,10).map(f=>({partNumber:f.partNumber,fact:cleanMykeText(f.whatFound,160),interpretation:cleanMykeText(f.possibleExplanation,160),next:cleanMykeText(f.nextAction,160)}));
  if(route.intent==='summary')runtime.summary=tools.getReconciliationSummary();
  if(['summary','priorities'].includes(route.intent))runtime.findings=tools.getPriorityFindings();
  if(route.intent==='missing_boms'){runtime.missingBoms=tools.getMissingBoms();runtime.missingBomCount=context.engineSources?.phantomAdjustments?.missingBoms?.length ?? null;}
  return {route,runtime:validateMykeRuntime(runtime)};
}
