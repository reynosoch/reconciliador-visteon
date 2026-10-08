import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
async function walk(dir){const output=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())output.push(...await walk(path));else output.push(path);}return output;}
for(const file of await walk('dist')){
 if(!/\.(?:js|html|json|map)$/.test(file))continue;
 const body=await readFile(file,'utf8');
 assert.ok(!/sb_secret_[A-Za-z0-9_-]{12,}/.test(body),`Privileged key in ${file}`);
 for(const jwt of body.matchAll(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)){
  let claims;try{claims=JSON.parse(Buffer.from(jwt[1],'base64url'));}catch{continue;}
  assert.notEqual(claims.role,'service_role',`Privileged JWT in ${file}`);
 }
 assert.ok(!/BOT_CONTROL_PASSWORD|VITE_BOT_CONTROL_URL/.test(body),`Retired control in ${file}`);
}
console.log('Frontend bundle security OK: no privileged keys, service-role JWT or retired local control.');
