import {getInventoryClient} from './botControl.js';
const SUPABASE_URL=import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;
function validateConfig(){if(!SUPABASE_URL)throw new Error("Falta VITE_SUPABASE_URL en .env.local");if(!SUPABASE_ANON_KEY)throw new Error("Falta una clave pública de Supabase en .env.local");}
async function authHeaders(extra={}){const client=getInventoryClient();const session=client ? (await client.auth.getSession()).data.session : null;return {apikey:SUPABASE_ANON_KEY,...(/^eyJ/.test(SUPABASE_ANON_KEY) ? {Authorization:`Bearer ${SUPABASE_ANON_KEY}`} : {}),...(session ? {Authorization:`Bearer ${session.access_token}`} : {}),...extra};}
async function fetchSignature(signal){
 const response=await fetch(`${SUPABASE_URL}/rest/v1/escaneos_4wall?select=id&order=id.desc&limit=1`,{headers:await authHeaders({Prefer:"count=exact","Range-Unit":"items",Range:"0-0"}),signal});
 if(!response.ok)throw new Error(`Supabase signature HTTP ${response.status}`);
 const rows=await response.json();const range=response.headers.get("content-range")||"";const totalMatch=range.match(/\/(\d+)$/);
 return {maxId:rows?.[0]?.id??null,rowCount:totalMatch?Number(totalMatch[1]):null};
}
const CURRENT_COLUMNS="id,record_id,numero_parte,cantidad,area_escaneo,raw_record,source_columns,source_record_id,row_hash,last_seen_at,missing_count";
const CURRENT_SCOPE="&source_system=eq.4wall&plant=eq.CUU";
async function fetchPages(signal,pageSize,{modern=false,hashes=false}={}){
 const allRows=[];let from=0;
 while(true){const to=from+pageSize-1;const endpoint=`${SUPABASE_URL}/rest/v1/escaneos_4wall?select=${hashes ? "record_id,row_hash" : modern ? CURRENT_COLUMNS : "*"}&order=id.asc${modern ? CURRENT_SCOPE : ""}`;
  const response=await fetch(endpoint,{method:"GET",headers:await authHeaders({"Range-Unit":"items",Range:`${from}-${to}`}),signal});
  if(!response.ok){throw new Error(`No pudimos leer CURRENT (HTTP ${response.status}).`);}
  const chunk=await response.json();if(!Array.isArray(chunk))throw new Error("Supabase regresó una respuesta inesperada.");allRows.push(...chunk);if(chunk.length<pageSize)break;from+=pageSize;
 }
 return allRows;
}
async function fetchLegacy4WallScans({signal,pageSize=1000,maxConsistencyRetries=1}={}){
 validateConfig();
 for(let attempt=0;attempt<=maxConsistencyRetries;attempt++){
  const before=await fetchSignature(signal);const rows=await fetchPages(signal,pageSize);const after=await fetchSignature(signal);
  const stable=before.maxId===after.maxId&&(before.rowCount===null||after.rowCount===null||before.rowCount===after.rowCount);
  if(stable){
   const fetchedAt=new Date();return {rows,count:rows.length,fetchedAt,snapshotMeta:{snapshotId:null,consistencyToken:`legacy:${after.maxId??"empty"}:${after.rowCount??rows.length}`,extractedAt:null,publishedAt:null,result:"QUERY_OK",rowCount:rows.length,complete:true,coordinatedRead:true,ageKnown:false,note:"La consulta fue estable durante la paginación; el esquema actual no expone snapshotId ni hora real de extracción."}};
  }
 }
 throw new Error("4Wall cambió mientras se descargaban las páginas. Se descartó el corte para no mezclar snapshots.");
}
let currentCache=null;
async function sourceVersion(signal){
 const response=await fetch(`${SUPABASE_URL}/rest/v1/bot_source_state?select=generation,content_version,row_count,complete,last_publication_run_id,extracted_at,published_at&source_system=eq.4wall&plant=eq.CUU`,{headers:await authHeaders(),signal});
 if(response.status===404)return null; // Existing installation before the new migration: read only.
 if(!response.ok)throw new Error(`No pudimos leer la versión de 4Wall (HTTP ${response.status}).`);
 return (await response.json())[0] || null;
}
async function fetchCurrentDelta(signal,pageSize){
 if(!currentCache || currentCache.rows.some(row=>!row.record_id))return fetchPages(signal,pageSize,{modern:true});
 const hashes=await fetchPages(signal,pageSize,{modern:true,hashes:true});
 const previous=new Map(currentCache.rows.map(row=>[row.record_id,row]));
 const changed=hashes.filter(row=>!previous.has(row.record_id) || previous.get(row.record_id).row_hash!==row.row_hash);
 if(changed.length>hashes.length/2)return fetchPages(signal,pageSize,{modern:true});
 for(let offset=0;offset<changed.length;offset+=100){
  const ids=changed.slice(offset,offset+100).map(row=>row.record_id);
  if(ids.some(id=>!/^[-a-f0-9]{36}$/i.test(id)))throw new Error('CURRENT devolvió una identidad inválida.');
  const response=await fetch(`${SUPABASE_URL}/rest/v1/escaneos_4wall?select=${CURRENT_COLUMNS}&record_id=in.(${ids.join(',')})${CURRENT_SCOPE}`,{headers:await authHeaders(),signal});
  if(!response.ok)throw new Error(`No pudimos leer los cambios de CURRENT (HTTP ${response.status}).`);
  for(const row of await response.json())previous.set(row.record_id,row);
 }
 return hashes.map(row=>previous.get(row.record_id)); // absent UUIDs leave the cache without history copies.
}
export async function fetch4WallScans({signal,pageSize=1000,maxConsistencyRetries=2}={}){
 validateConfig();
 for(let attempt=0;attempt<=maxConsistencyRetries;attempt++){
  const before=await sourceVersion(signal);
  if(!before)return fetchLegacy4WallScans({signal,pageSize,maxConsistencyRetries});
  const rows=currentCache?.version===before.content_version ? currentCache.rows : await fetchCurrentDelta(signal,pageSize);
  const after=await sourceVersion(signal);
  if(after && before.content_version===after.content_version && rows.length===after.row_count && rows.every(Boolean)){
   currentCache={version:after.content_version,rows};
   return {rows,count:rows.length,fetchedAt:new Date(),snapshotMeta:{snapshotId:after.last_publication_run_id,consistencyToken:`current:${after.content_version}`,extractedAt:after.extracted_at,publishedAt:after.published_at,result:'QUERY_OK',rowCount:rows.length,complete:after.complete,coordinatedRead:true,ageKnown:Boolean(after.extracted_at),source:'4wall'}};
  }
 }
 throw new Error('CURRENT cambió durante la lectura. El corte anterior sigue activo; no se mezclaron páginas.');
}
export function clear4WallCache(){currentCache=null;}
export async function checkSupabaseConnection({signal}={}){validateConfig();const response=await fetch(`${SUPABASE_URL}/rest/v1/escaneos_4wall?select=id&limit=1`,{headers:await authHeaders(),signal});return response.ok;}


export async function submitDevelopmentFeedback(payload,{signal}={}){
 signal ??= AbortSignal.timeout(20000);
 validateConfig();
 const response=await fetch(`${SUPABASE_URL}/rest/v1/development_feedback`,{
  method:"POST",
  headers:await authHeaders({"Content-Type":"application/json",Prefer:"return=minimal"}),
  body:JSON.stringify(payload),
  signal,
 });
 if(!response.ok){
  const detail=await response.text().catch(()=>"");
  if(response.status===404 || detail.includes("PGRST205")){
   throw new Error("El buzón de reportes todavía no está habilitado en la base de datos. No se borró lo que escribiste.");
  }
  if (response.status === 401 || response.status === 403) throw new Error("El buzón no tiene permiso para recibir reportes. Pide revisar su configuración en Supabase; tu texto sigue aquí.");
  throw new Error(`No pudimos enviar el reporte (HTTP ${response.status}). No se borró lo que escribiste.`);
 }
 return {ok:true};
}
