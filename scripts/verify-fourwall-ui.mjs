import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom',define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://uukhwkywmnarcfruerpp.supabase.co'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('sb_publishable_synthetic_test')},plugins:[{name:'bot-dom-shell-test',enforce:'pre',load(id){
 if(id.endsWith('/OverlayPortal.jsx'))return 'export default function Portal({children}){return children;}';
 if(id.endsWith('/ScrollEffects.jsx'))return 'import {createElement} from "react";export function RubberDrawer({children,...props}){return createElement("section",props,children);}';
}}]});
const originalFetch=globalThis.fetch;
try{
 const {default:Bot}=await server.ssrLoadModule('/src/components/shell/BotControlModal.jsx');
 const state={observedAt:Date.parse('2026-10-08T08:00:15Z'),data:{runners:[{id:'runner-test',plant:'CUU',source_system:'4wall',enabled:true,state:'PAUSED',paused:true,interval_minutes:30,heartbeat_at:'2026-10-08T08:00:00Z'}],sources:[{plant:'CUU',source_system:'4wall',published_at:'2026-10-08T07:30:00Z'}],last_attempts:[{runner_id:'runner-test',id:'run-test',status:'FAILED',rows_seen:10,rows_inserted:0,rows_updated:0,rows_unchanged:10,rows_removed:0}]}};
 for(const role of ['anon','viewer','operator','admin']){
  const html=renderToStaticMarkup(createElement(Bot,{open:true,botState:state,auth:{user:role==='anon' ? null : {id:'human'},role,canOperate:['operator','admin'].includes(role),isAdmin:role==='admin'}}));
  assert.match(html,/Hace 15 s/);assert.match(html,/último corte válido sigue activo/);
  assert.equal(html.includes('Asignar rol'),role==='admin');
  if(role==='viewer')assert.match(html,/<button[^>]*disabled=""[^>]*>RUN NOW/);
  if(role==='operator')assert.match(html,/<button[^>]*>RUN NOW/);
 }
 assert.equal(renderToStaticMarkup(createElement(Bot,{open:false})), '');
 const {default:Sources}=await server.ssrLoadModule('/src/components/shell/SourcesDrawer.jsx');
 const html=renderToStaticMarkup(createElement(Sources,{open:true,sources:{scans:{loaded:true,fileName:'synthetic.csv',rows:[]}},status:{},runners:[{id:'runner-test'}]}));
 assert.ok(html.indexOf('ENTRADA UNIVERSAL')<html.indexOf('Publicar 4Wall manual'),'existing upload flow stays first');assert.match(html,/Carga parcial \/ corrección/);
 const api=await server.ssrLoadModule('/src/services/supabase.js');
 let version=1,pageCalls=0,metadataCalls=0;
 const rows=Array.from({length:2001},(_,id)=>({id,record_id:`00000000-0000-4000-8000-${String(id).padStart(12,'0')}`,row_hash:'hash-'+id,numero_parte:'PN-'+id,cantidad:1,area_escaneo:'A'}));
 globalThis.fetch=async(url,options)=>{
  if(url.includes('/bot_source_state?')){metadataCalls++;return new Response(JSON.stringify([{generation:version,content_version:version,row_count:rows.length,complete:true,published_at:'2026-10-08T08:00:00Z'}]));}
  assert.ok(url.includes('/escaneos_4wall?'));pageCalls++;if(url.includes('record_id=in.')){const ids=url.match(/record_id=in\.\(([^)]+)\)/)[1].split(',');return new Response(JSON.stringify(rows.filter(row=>ids.includes(row.record_id))));}const [start,end]=options.headers.Range.split('-').map(Number);return new Response(JSON.stringify(rows.slice(start,end+1).map(row=>url.includes('select=record_id,row_hash') ? {record_id:row.record_id,row_hash:row.row_hash} : row)));
 };
 const first=await api.fetch4WallScans();assert.equal(first.count,2001);assert.equal(pageCalls,3);
 const cached=await api.fetch4WallScans();assert.equal(cached.rows,first.rows);assert.equal(pageCalls,3,'unchanged version never downloads CURRENT again');
 version++;rows[0]={...rows[0],cantidad:2,row_hash:'changed-hash'};const updated=await api.fetch4WallScans();assert.equal(updated.rows[0].cantidad,2);assert.equal(pageCalls,7,'same IDs/count must reload only hashes and changed rows');assert.equal(metadataCalls,6);
}finally{globalThis.fetch=originalFetch;await server.close();}
console.log('4Wall UI/read OK: real Bot/Sources renders, roles, failure/metrics, preserved upload flow and version cache without full polling (DOM shells mocked).');
