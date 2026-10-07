// Shared, exact wire schema. Raw rows, files, SQL and mutation requests are rejected.
export const MYKE_READ_TOOLS = Object.freeze(['getReconciliationSummary','getTopLosses','getTopGains','getTopSwing','getPriorityFindings','getPartTrace','getPartFinancials','getPartLocations','getPartPhysical','getPartQad','getPartPhantomInfo','getPartBom','getPartObsoleteInfo','getPartUnexpectedInfo','getMissingBoms','getSourceStatus','getLoadedSources','getDataQuality','explainMetric']);
export const MYKE_ORIGINS = Object.freeze(['http://localhost:5173','http://127.0.0.1:5173','https://reynosoch.github.io']);
export const cleanMykeText = (value, limit = 800) => String(value ?? '').replace(/(?:bearer\s+\S+|(?:password|contrase[nñ]a|api[_ -]?key|secret|token)\s*[:=]\s*\S+)/gi,'[dato privado omitido]').replace(/AIza[A-Za-z0-9_-]{35}|sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[dato privado omitido]').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,limit);
const object = (v, keys) => { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) throw Error('runtime'); };
const scalar = (v, type) => { if (v !== null && (typeof v !== type || (type === 'number' && !Number.isFinite(v)) || (type === 'string' && v.length > 160))) throw Error('runtime'); return type === 'string' && v !== null ? cleanMykeText(v,160) : v; };
const record = (v, spec) => {object(v,Object.keys(spec));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,scalar(x,spec[k])]));};
const list = (v,max,fn) => {if(!Array.isArray(v)||v.length>max)throw Error('runtime');return v.map(fn);};
const partSpec={partNumber:'string',found:'boolean',status:'string',physical:'number',directPhysical:'number',bomContribution:'number',qad:'number',difference:'number',unitCost:'number',net:'number',swing:'number',grossLoss:'number',grossGain:'number',phantom:'boolean',obsolete:'boolean',unexpected:'boolean',missingBom:'boolean',emptyBom:'boolean',hasCost:'boolean',costState:'string',locationCount:'number',bomSourceCount:'number',bomRelationCount:'number'};
const locationSpec={location:'string',physicalQty:'number',qadQty:'number',delta:'number',swingPieces:'number',swingUsd:'number'};
const bomSpec={parentPart:'string',componentPart:'string',location:'string',usage:'number',contribution:'number',bomLevel:'string'};
const sourceSpec={type:'string',loaded:'boolean',rowCount:'number',fileName:'string',loadedAt:'string',extractedAt:'string',freshness:'string'};
export function validateMykeRuntime(value) {
  if (value == null) return null;
  object(value,['version','intent','tools','snapshot','sources','summary','quality','part','topParts','missingBoms','missingBomCount','selectedParts','findings']);
  if(value.version!==1 || typeof value.intent!=='string' || value.intent.length>32)throw Error('runtime');
  const result={version:1,intent:cleanMykeText(value.intent,32)};
  result.tools=list(value.tools ?? [],20,v=>{if(!MYKE_READ_TOOLS.includes(v))throw Error('mutation');return v;});
  if(value.snapshot)result.snapshot=record(value.snapshot,{complete:'boolean',ageKnown:'boolean',extractedAt:'string',publishedAt:'string',loading:'boolean',hasError:'boolean'});
  if(value.sources)result.sources=list(value.sources,6,v=>{const s=record(v,sourceSpec);if(!['scans','qad','areas','ispbb','bom','cost'].includes(s.type))throw Error('runtime');return s;});
  if(value.summary)result.summary=record(value.summary,{netUsd:'number',swingUsd:'number',grossLossUsd:'number',grossGainUsd:'number',physicalQty:'number',qadQty:'number',unvaluedPartCount:'number',missingCostCount:'number',totalParts:'number'});
  if(value.quality)result.quality=record(value.quality,{partsWithoutCost:'number',unknownPhantom:'number',unmappedParts:'number',missingBoms:'number',findings:'number',incomplete:'boolean'});
  const part = v => {object(v,[...Object.keys(partSpec),'locations','bomSources']);const p=record(Object.fromEntries(Object.entries(v).filter(([k])=>!['locations','bomSources'].includes(k))),partSpec);if(v.locations)p.locations=list(v.locations,12,x=>record(x,locationSpec));if(v.bomSources)p.bomSources=list(v.bomSources,8,x=>record(x,bomSpec));return p;};
  if(value.part)result.part=part(value.part);
  if(value.selectedParts)result.selectedParts=list(value.selectedParts,10,part);
  if(value.findings)result.findings=list(value.findings,10,v=>record(v,{partNumber:'string',fact:'string',interpretation:'string',next:'string'}));
  if(value.topParts)result.topParts=list(value.topParts,10,v=>record(v,partSpec));
  if(value.missingBoms)result.missingBoms=list(value.missingBoms,10,v=>record(v,{parentPart:'string',scannedQuantity:'number'}));
  if(value.missingBomCount!==undefined)result.missingBomCount=scalar(value.missingBomCount,'number');
  if(JSON.stringify(result).length>14000)throw Error('runtime_size');
  return result;
}
