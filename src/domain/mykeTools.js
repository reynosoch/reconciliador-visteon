import { normalizeText } from './normalize.js';
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

export const normalizeMykeQuestion = v => normalized(v).replace(/[^a-z0-9-]+/g,' ').trim().replace(/\s+/g,' ');
const reasoning = text => /por que|porque|patron|sospechos|analiz|compar|en comun|parece|crees|raro|revisarias|revisaria|antes de la junta|mas facil|mas sencillo|lo de arriba|no lo entendi|explicame este resultado/.test(text);
export function routeMykeQuestion({question,conversation=[],uiContext={},inventoryContext={},organization}) {
  const text=normalizeMykeQuestion(question);
  const last=conversation.filter(m=>m.memory).at(-1)?.memory || {};
  const known=(inventoryContext.reconciliation || []).filter(r=>text.split(/\s+/).some(t=>normalizeText(t)===r.partNumber)).map(r=>r.partNumber);
  const extracted=extractPartNumber(question);
  const explicit=[...new Set([...known,...(extracted ? [normalizeText(extracted)] : []),...(question.match(/\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b/gi) || []).map(normalizeText)])].slice(0,10);
  const referential=Boolean(uiContext.selectedPartNumber) && reasoning(text) || /esa|ese|esta|este|anteriores|esas|esas cinco|primera|arriba|comparalas|explicamelo|entonces|por que sale/.test(text);
  let parts=explicit.length ? explicit : referential ? last.parts || (uiContext.selectedPartNumber ? [uiContext.selectedPartNumber] : []) : [];
  if(/la primera/.test(text))parts=parts.slice(0,1);
  else if(!explicit.length && /(?:esa|ese)\b/.test(text) && !/esas|esos/.test(text) && last.selectedPart)parts=[last.selectedPart];
  const limitAsked=text.match(/\b(?:top|las|los|dame)\s*(\d{1,2})\b/)?.[1];
  const n=limitAsked ? limit(Number(limitAsked)) : /mayor|mas grande/.test(text) ? 1 : 5;
  const result=(route,intent,tools=[],extra={})=>({route,intent,confidence:route==='ai' ? 0.7 : 0.98,entities:{partNumbers:parts,...(parts.length===1 ? {partNumber:parts[0]} : {})},tools,limit:n,complexity:/compar|patron|en comun|analisis completo/.test(text) ? 'complex' : 'normal',...extra});
  // Explicit definitions and existing FAQ variants always stay local, including causal rule explanations.
  const definition=!explicit.length && (/por que.*(?:level|divide|dividen|regla)/.test(text) || /^(que es|que significa|como funciona|como se calcula|explicame el|explicame swing|no entiendo phantom|que pedo con|net$|swing$)/.test(text) || /(?:net|swing) como se calcula/.test(text));
  const engineQuery=/top|mayor|peores piezas|missing bom|bom.*falt|(?:fuentes?|archivos?).*(?:falt|carg|desactual|actualiz)|(?:falt|carg).*(?:fuentes?|archivos?)|calidad|sin costo|costo invalido|requieren revision|requieren atencion|prioridades|como vamos|como va el corte|resum|estado actual|reconciliacion actual/.test(text);
  const canonical=organization?.topics.some(t=>normalizeMykeQuestion(t.title)===text);
  const local=organization ? answerMyke(question,organization,last.topicIds || [],[]) : null;
  if(local?.topicIds?.length && (canonical || definition || !engineQuery && !parts.length && !reasoning(text))){parts=[];return result('knowledge','knowledge',['explainMetric']);}
  if(parts.length>1 && !reasoning(text) && /(?:esa|ese|esta|este)\b/.test(text))return result('engine','clarify',[]);
  if(parts.length)return result(reasoning(text) || parts.length>1 ? 'ai' : 'engine','part',['getPartTrace']);
  if(reasoning(text)) {
    parts=explicit.length ? explicit : referential || /esas|perdidas|hallazgos/.test(text) ? last.parts || [] : [];
    return result('ai',parts.length ? 'parts' : last.intent==='knowledge' && referential ? 'knowledge' : 'summary',parts.length ? ['getPartTrace'] : ['getReconciliationSummary','getPriorityFindings']);
  }
  if(/top.*(?:perdid|peores|faltant)|mayor perdida|perdida mas grande|peores piezas/.test(text))return result('engine','losses',['getTopLosses']);
  if(/top.*(?:gananc|sobrant)|mayor ganancia|ganancia mas grande/.test(text))return result('engine','gains',['getTopGains']);
  if(/top.*swing|mayor swing/.test(text))return result('engine','swing',['getTopSwing']);
  if(/missing bom|boms? faltantes|faltan? bom/.test(text))return result('engine','missing_boms',['getMissingBoms']);
  if(/(?:archivos?|fuentes?).*(?:falt|carg|desactual|actualiz)|(?:falt|carg).*(?:archivos?|fuentes?)/.test(text))return result('engine','sources',['getSourceStatus','getLoadedSources']);
  if(/calidad|sin costo|costo invalido/.test(text))return result('engine','quality',['getDataQuality']);
  if(/requieren revision|requieren atencion|prioridades/.test(text))return result('engine','priorities',['getPriorityFindings']);
  if(/como vamos|como va el corte|resum|estado actual|reconciliacion actual/.test(text))return result('engine','summary',['getReconciliationSummary','getDataQuality']);
  if(local && ['greeting','answer'].includes(local.kind))return result('knowledge','knowledge',['explainMetric']);
  return result('ai','knowledge',['explainMetric']);
}
export function buildMykeRuntime(question,context={},previousPart='',options={}) {
  const route=options.route || routeMykeQuestion({question,inventoryContext:context,uiContext:{selectedPartNumber:previousPart},...options});
  const tools=createMykeReadTools(context);
  if(route.intent==='knowledge')return {route,runtime:null};
  const runtime={version:1,intent:route.intent,tools:route.tools,snapshot:{complete:context.sources?.scans?.loaded ? true : context.snapshotMeta?.complete ?? null,ageKnown:context.snapshotMeta?.ageKnown ?? null,extractedAt:date(context.snapshotMeta?.extractedAt),publishedAt:date(context.snapshotMeta?.publishedAt),loading:Boolean(context.loading),hasError:Boolean(context.error)},sources:tools.getSourceStatus(),quality:tools.getDataQuality()};
  const parts=route.entities?.partNumbers || [];
  if(parts.length===1)runtime.part=tools.getPartTrace(parts[0]);
  if(parts.length>1)runtime.selectedParts=parts.slice(0,10).map(pn=>({...tools.getPartTrace(pn),locations:tools.getPartLocations(pn).slice(0,3),bomSources:tools.getPartBom(pn).slice(0,2)}));
  if(['losses','gains','swing'].includes(route.intent))runtime.topParts=route.intent==='losses' ? tools.getTopLosses(route.limit) : route.intent==='gains' ? tools.getTopGains(route.limit) : tools.getTopSwing(route.limit);
  if(route.intent==='summary')runtime.summary=tools.getReconciliationSummary();
  if(['summary','priorities'].includes(route.intent))runtime.findings=tools.getPriorityFindings();
  if(route.intent==='missing_boms'){runtime.missingBoms=tools.getMissingBoms();runtime.missingBomCount=context.engineSources?.phantomAdjustments?.missingBoms?.length ?? null;}
  return {route,runtime:validateMykeRuntime(runtime)};
}
