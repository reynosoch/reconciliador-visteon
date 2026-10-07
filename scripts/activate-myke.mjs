// Deploy code only. Provider secrets are set exclusively in Supabase Dashboard.
import { execFileSync } from 'node:child_process';
import { MYKE_ORIGINS } from '../supabase/functions/myke-chat/runtime.mjs';
const project='uukhwkywmnarcfruerpp';
const url=`https://${project}.supabase.co`;
if(!process.env.SUPABASE_ACCESS_TOKEN)throw Error('Falta SUPABASE_ACCESS_TOKEN para desplegar el proyecto autorizado.');
if(process.env.VITE_SUPABASE_URL!==url)throw Error('La configuración pública no corresponde al proyecto autorizado del reconciliador.');
execFileSync('supabase',['functions','deploy','--help'],{stdio:'ignore'});
execFileSync('supabase',['functions','deploy','myke-chat','--project-ref',project,'--no-verify-jwt'],{stdio:'inherit'});
for(const origin of MYKE_ORIGINS){
 const response=await fetch(`${url}/functions/v1/myke-chat`,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'apikey,content-type'},signal:AbortSignal.timeout(10000)});
 if(response.status!==204 || response.headers.get('access-control-allow-origin')!==origin)throw Error(`Falló CORS para ${origin}; no se declara lista la ruta.`);
}
console.log('Código Myke desplegado y CORS comprobado para localhost/Pages. No se llamó al LLM; su secreto/configuración se valida con la primera consulta del usuario.');
