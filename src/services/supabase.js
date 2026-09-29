const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
function validateConfig(){if(!SUPABASE_URL)throw new Error("Falta VITE_SUPABASE_URL en .env.local");if(!SUPABASE_ANON_KEY)throw new Error("Falta VITE_SUPABASE_ANON_KEY en .env.local");}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,...extra};}
async function fetchSignature(signal){
 const response=await fetch(`${SUPABASE_URL}/rest/v1/escaneos_4wall?select=id&order=id.desc&limit=1`,{headers:authHeaders({Prefer:"count=exact","Range-Unit":"items",Range:"0-0"}),signal});
 if(!response.ok)throw new Error(`Supabase signature HTTP ${response.status}`);
 const rows=await response.json();const range=response.headers.get("content-range")||"";const totalMatch=range.match(/\/(\d+)$/);
 return {maxId:rows?.[0]?.id??null,rowCount:totalMatch?Number(totalMatch[1]):null};
}
async function fetchPages(signal,pageSize){
 const allRows=[];let from=0;
 while(true){const to=from+pageSize-1;const endpoint=`${SUPABASE_URL}/rest/v1/escaneos_4wall?select=*&order=id.asc`;
  const response=await fetch(endpoint,{method:"GET",headers:authHeaders({"Range-Unit":"items",Range:`${from}-${to}`}),signal});
  if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`Supabase HTTP ${response.status}: ${detail}`);}
  const chunk=await response.json();if(!Array.isArray(chunk))throw new Error("Supabase regresó una respuesta inesperada.");allRows.push(...chunk);if(chunk.length<pageSize)break;from+=pageSize;
 }
 return allRows;
}
export async function fetch4WallScans({signal,pageSize=1000,maxConsistencyRetries=1}={}){
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
export async function checkSupabaseConnection({signal}={}){validateConfig();const response=await fetch(`${SUPABASE_URL}/rest/v1/escaneos_4wall?select=id&limit=1`,{headers:authHeaders(),signal});return response.ok;}


export async function submitDevelopmentFeedback(payload,{signal}={}){
 validateConfig();
 const response=await fetch(`${SUPABASE_URL}/rest/v1/development_feedback`,{
  method:"POST",
  headers:authHeaders({"Content-Type":"application/json",Prefer:"return=minimal"}),
  body:JSON.stringify(payload),
  signal,
 });
 if(!response.ok){
  const detail=await response.text().catch(()=>"");
  if(response.status===404||detail.includes("development_feedback")){
   throw new Error("El buzón de reportes todavía no está habilitado en la base de datos. No se borró lo que escribiste.");
  }
  throw new Error(`No pudimos enviar el reporte (HTTP ${response.status}). No se borró lo que escribiste.`);
 }
 return {ok:true};
}
