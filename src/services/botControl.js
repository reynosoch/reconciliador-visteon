import {createClient} from '@supabase/supabase-js';
import {prepareFourwallSnapshot,buildFourwallBatches} from '../domain/fourwallSync.js';

const url=import.meta.env?.VITE_SUPABASE_URL;
const key=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;
let client;
export function getInventoryClient(){
  if(!url || !key)return null;
  if(url.replace(/\/$/,'')!=='https://uukhwkywmnarcfruerpp.supabase.co' || !key.startsWith('sb_publishable_') && !key.startsWith('eyJ'))throw Error('Configuración del proyecto Supabase incorrecta.');
  if(key.startsWith('eyJ')){try{if(JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role!=='anon')throw Error();}catch{throw Error('La configuración solo admite una clave pública.');}}
  if(!client)client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'visteon.inventory.auth.v1'}});
  return client;
}
const errors={LOGIN_REQUIRED:'Inicia sesión para continuar.',OPERATOR_REQUIRED:'Esta acción requiere operador o administrador.',ADMIN_REQUIRED:'Esta acción requiere administrador.',ACTIVE_RUN:'Hay un corte activo. Espera a que termine; Pause no lo aborta.',RUNNER_NOT_REGISTERED:'Todavía no hay un runner registrado.',RUN_LEASE_EXPIRED:'El intento perdió su permiso de publicación. CURRENT sigue intacto.',RUNNER_IDENTITY_REQUIRED:'Esta identidad no tiene permiso para esa operación.',IDEMPOTENCY_CONFLICT:'La solicitud ya tiene otro resultado.',PGRST202:'La migración del runner todavía no está aplicada.'};
export async function botApi(op,p={},options={}){
  const connection=options.client || getInventoryClient();
  if(!connection)throw new Error('Falta la configuración pública de Supabase.');
  let request=connection.rpc('bot_api',{op,p});
  request=request.abortSignal(options.signal || AbortSignal.timeout(45000));
  const {data,error}=await request;
  if(error){const failure=new Error(errors[error.message] || errors[error.code] || 'No pudimos completar la operación. El último corte válido sigue activo.');failure.code=error.message in errors ? error.message : error.code;throw failure;}
  return data;
}
export const sendBotCommand=(runnerId,action)=>botApi('command',{runner_id:runnerId,action,id:crypto.randomUUID()});
export function watchBotState(callback,{client:connection,intervalMs=5000}={}){
  try{connection ??= getInventoryClient();}catch(error){callback({error});return ()=>{};}
  let stopped=false,inflight=false,lastGeneration=null;
  const read=async()=>{if(stopped || inflight)return;inflight=true;try{const data=await botApi('state',{}, {client:connection});if(!stopped){callback({data,error:null});const source=data.sources?.find(s=>s.plant==='CUU');if(source && lastGeneration!==null && source.generation!==lastGeneration)window.dispatchEvent(new Event('fourwall-current-changed'));if(source)lastGeneration=source.generation;}}catch(error){if(!stopped)callback({error});}finally{inflight=false;}};
  void read();const timer=setInterval(read,intervalMs);
  const channel=connection?.channel('inventory-bot-state').on('postgres_changes',{event:'*',schema:'public',table:'bot_source_state'},read).on('postgres_changes',{event:'INSERT',schema:'public',table:'bot_notifications'},read).subscribe();
  return ()=>{stopped=true;clearInterval(timer);if(channel)void connection.removeChannel(channel);};
}
async function readManifest(runnerId){
  for(let attempt=0;attempt<2;attempt++){
    let generation=null,rows=[],offset=0;
    while(true){const page=await botApi('manifest',{runner_id:runnerId,offset});generation ??= page.generation;if(page.generation!==generation)break;rows.push(...page.records);if(page.records.length<2000)return {generation,rows};offset+=2000;}
  }
  throw new Error('CURRENT cambió durante la lectura. Reintenta; no se publicó el archivo.');
}
export async function publishManualFourwall(rows,{complete=true,runnerId}={}){
  const runId=crypto.randomUUID();
  const run=await botApi('begin_manual',{runner_id:runnerId,run_id:runId,trigger:complete ? 'MANUAL_FULL_UPLOAD' : 'MANUAL_PARTIAL_UPLOAD'});
  const base={run_id:runId,lease_token:run.lease_token};
  let finalized=false;
  const timer=setInterval(()=>{void botApi('touch_run',base).catch(()=>{});},30000);
  try{
    const state=await botApi('state');
    const runner=state.runners.find(r=>r.id===runnerId),source=state.sources.find(s=>s.plant===runner.plant && s.source_system===runner.source_system);
    // Full configuration is available only to operators through the authenticated manifest operation.
    const config=await botApi('manifest',{runner_id:runnerId,offset:0});
    const snapshot=await prepareFourwallSnapshot(rows,{complete,previousCount:source.row_count,dateOrder:config.date_order,minRowRatio:config.min_row_ratio ?? 0.1,maxRows:config.max_rows ?? 100000,maxQuantity:config.max_quantity ?? 1e9});
    for(let attempt=0;attempt<2;attempt++){
      const current=await readManifest(runnerId);
      await botApi('reset_stage',base);
      for(const batch of buildFourwallBatches(snapshot,current.rows))await botApi('stage',{...base,rows:batch});
      const receipt=await botApi('publish',{...base,expected_generation:current.generation,rows_seen:snapshot.rows_seen,snapshot_hash:snapshot.snapshot_hash,export_complete:complete,extracted_at:null});
      if(receipt.status==='STALE_GENERATION')continue;
      finalized=true;
      if(receipt.status!=='SUCCESS')throw new Error('El corte fue rechazado. El último CURRENT válido sigue activo; revisa identidad, cantidades y configuración.');
      window.dispatchEvent(new Event('fourwall-current-changed'));
      return receipt;
    }
    throw new Error('CURRENT cambió durante la publicación. Reintenta; no se mezclaron versiones.');
  }catch(error){
    if(!finalized){try{const receipt=await botApi('receipt',base);if(receipt.status==='SUCCESS'){window.dispatchEvent(new Event('fourwall-current-changed'));return receipt;}await botApi('fail',{...base,error_type:error.name==='FourWallValidationError' ? error.code.includes('AMBIGUOUS') ? 'AMBIGUOUS_IDENTITY' : 'QUALITY_GATE' : 'PUBLICATION_ERROR',step:'validate'});}catch{/* Server lease cleanup resolves an unacknowledged upload. */}}
    if(error.name==='FourWallValidationError')throw new Error(`El archivo no pasó la validación (${error.code}). Revisa Ticket/FIFO, columnas, cantidades, fechas y si el corte está completo. CURRENT anterior sigue activo.`,{cause:error});
    throw error;
  }finally{clearInterval(timer);}
}
