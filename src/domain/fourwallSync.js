import contract from '../../fourwall_contract.json' with {type:'json'};

export const FOURWALL_CONTRACT = contract;
const encoder = new TextEncoder();
const tidy = value => String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
const sensitive = /password|passwd|contrase[nñ]a|cookie|authorization|access.?token|refresh.?token|service.?role|api.?key/i;
export class FourWallValidationError extends Error {
  constructor(code) { super(code); this.name='FourWallValidationError'; this.code=code; }
}
export function canonicalNumber(value, required=false) {
  const text=tidy(value).replace(/,/g,'');
  if(!text && !required)return '';
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))throw new FourWallValidationError('INVALID_NUMBER');
  const number=Number(text);
  if(!Number.isFinite(number) || Math.abs(number)>1e12)throw new FourWallValidationError('INVALID_NUMBER');
  const [mantissa,exponent='0']=text.toLowerCase().replace(/^[+-]/,'').split('e');
  const [whole,fraction='']=mantissa.split('.');
  const digits=whole+fraction,point=whole.length+Number(exponent);
  if(Math.abs(Number(exponent))>20)throw new FourWallValidationError('INVALID_NUMBER');
  const expanded=point<=0 ? '0.'+'0'.repeat(-point)+digits : point>=digits.length ? digits+'0'.repeat(point-digits.length) : digits.slice(0,point)+'.'+digits.slice(point);
  const [integer,decimal='']=expanded.split('.');
  const fixed=(integer.replace(/^0+/,'')||'0')+(decimal.replace(/0+$/,'') ? '.'+decimal.replace(/0+$/,'') : '');
  return number<0 && fixed!=='0' ? '-'+fixed : fixed;
}
export function canonicalDate(value,dateOrder=null) {
  if(value==null || tidy(value)==='')return '';
  if(value instanceof Date){if(!Number.isFinite(value.getTime()))throw new FourWallValidationError('INVALID_DATE');return value.toISOString().replace(/\.000Z$/,'Z');}
  let text=tidy(value);
  // Excel's 1900 serial system. No timezone is inferred from the machine.
  if(typeof value==='number')return new Date(Date.UTC(1899,11,30)+Math.round(value*86400000)).toISOString().replace(/\.000Z$/,'Z');
  const local=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(local){
    const a=Number(local[1]),b=Number(local[2]);
    const order=dateOrder || (a>12 ? 'DMY' : b>12 ? 'MDY' : null);
    if(!['DMY','MDY'].includes(order))throw new FourWallValidationError('AMBIGUOUS_DATE');
    const month=order==='DMY' ? b : a,day=order==='DMY' ? a : b;
    text=`${local[3]}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(local[4]||0).padStart(2,'0')}:${local[5]||'00'}:${local[6]||'00'}Z`;
    const dt=new Date(text);
    if(dt.getUTCMonth()+1!==month || dt.getUTCDate()!==day)throw new FourWallValidationError('INVALID_DATE');
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(text))text+='T00:00:00Z';
  else if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text))text=text.replace(' ','T')+'Z';
  if(!/^\d{4}-\d{2}-\d{2}T/.test(text) || !Number.isFinite(Date.parse(text)))throw new FourWallValidationError('INVALID_DATE');
  const [year,month,day]=text.slice(0,10).split('-').map(Number);
  const calendar=new Date(Date.UTC(year,month-1,day));
  if(calendar.getUTCFullYear()!==year || calendar.getUTCMonth()+1!==month || calendar.getUTCDate()!==day)throw new FourWallValidationError('INVALID_DATE');
  return new Date(text).toISOString().replace(/\.000Z$/,'Z');
}
export async function fourwallHash(prefix,values) {
  const packed=prefix+values.map(value=>`${encoder.encode(String(value)).length}:${value}`).join('');
  const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(packed));
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function normalizeFourwallRecord(row,{dateOrder=null}={}) {
  if(row?.__fourwallImport?.ambiguousHeader)throw new FourWallValidationError('AMBIGUOUS_COLUMN');
  if(row?.__fourwallImport?.formula)throw new FourWallValidationError('FORMULA_EXPORT');
  if(row?.__fourwallImport?.unsafeIdentifier)throw new FourWallValidationError('NUMERIC_ID_UNSAFE');
  if(!row || typeof row!=='object' || Array.isArray(row))throw new FourWallValidationError('INVALID_ROW');
  if(Object.keys(row).some(key=>sensitive.test(key)))throw new FourWallValidationError('UNSAFE_COLUMN');
  const canonical=[],sourceColumns={};
  for(const field of contract.fields){
    const present=field.aliases.filter(name=>row[name]!=null);
    if(present.length>1 && new Set(present.map(name=>tidy(row[name]))).size>1)throw new FourWallValidationError('AMBIGUOUS_COLUMN');
    const column=present[0],value=column ? row[column] : null;
    if(['ticket','serial','part','part_original'].includes(field.key) && typeof value==='number' && (!Number.isInteger(value) || Math.abs(value)>=1e15))throw new FourWallValidationError('NUMERIC_ID_UNSAFE');
    let text=field.kind==='number' ? canonicalNumber(value,field.required) : field.kind==='date' ? canonicalDate(value,dateOrder) : tidy(value);
    if(field.kind==='upper')text=text.toUpperCase();
    if(field.required && !text)throw new FourWallValidationError('REQUIRED_FIELD');
    if(text.length>512)throw new FourWallValidationError('FIELD_TOO_LONG');
    canonical.push(text);if(column)sourceColumns[field.key]=column;
  }
  if(!canonical[0])throw new FourWallValidationError('MISSING_TICKET');
  const raw=Object.fromEntries(Object.entries(row).filter(([key])=>!key.startsWith('__')).map(([key,value])=>[key,value instanceof Date ? value.toISOString() : value ?? null]));
  if(Object.values(raw).some(value=>value!==null && typeof value==='object'))throw new FourWallValidationError('INVALID_ROW');
  if(encoder.encode(JSON.stringify(raw)).length>16384)throw new FourWallValidationError('ROW_TOO_LARGE');
  return {canonical,row_hash:await fourwallHash('4wall-row-v1|',canonical),source_record_id:canonical[0],numero_parte:canonical[6],cantidad:Number(canonical[7]),area_escaneo:canonical[1],raw_record:raw,source_columns:{part_number:sourceColumns.part,quantity:sourceColumns.quantity,area:sourceColumns.area}};
}
export async function prepareFourwallSnapshot(rows,{complete=true,dateOrder=null,previousCount=0,minRowRatio=0.1,maxRows=100000,maxQuantity=1e9,exportComplete=true}={}) {
  if(!Array.isArray(rows) || !rows.length || rows.length>maxRows)throw new FourWallValidationError('INVALID_ROW_COUNT');
  if(complete && (!exportComplete || previousCount>0 && rows.length<previousCount*minRowRatio))throw new FourWallValidationError('INCOMPLETE_EXPORT');
  const normalized=[];
  // Bounded windows prevent 100k concurrent digest promises.
  for(let start=0;start<rows.length;start+=250)normalized.push(...await Promise.all(rows.slice(start,start+250).map(row=>normalizeFourwallRecord(row,{dateOrder}))));
  const counts=new Map();for(const row of normalized)counts.set(row.source_record_id,(counts.get(row.source_record_id)||0)+1);
  const identities=new Set();
  for(const row of normalized){
    if(Math.abs(row.cantidad)>maxQuantity)throw new FourWallValidationError('QUANTITY_LIMIT');
    const collision=counts.get(row.source_record_id)>1;
    if(collision && (!row.canonical[3] || !row.canonical[12]))throw new FourWallValidationError('AMBIGUOUS_IDENTITY');
    row.identity_mode=collision ? 'composite' : 'ticket';
    row.composite_key=await fourwallHash('4wall-composite-v1|',[row.canonical[0],row.canonical[6],row.canonical[12],row.canonical[3]]);
    row.source_identity=collision ? row.composite_key : await fourwallHash('4wall-ticket-v1|',[row.source_record_id]);
    if(identities.has(row.source_identity))throw new FourWallValidationError('AMBIGUOUS_IDENTITY');
    identities.add(row.source_identity);
  }
  const snapshot_hash=await fourwallHash('4wall-snapshot-v1|',normalized.map(row=>row.source_identity+':'+row.row_hash).sort());
  return {records:normalized,snapshot_hash,rows_seen:normalized.length,complete};
}
export function buildFourwallBatches(snapshot,currentState=[],batchSize=250) {
  const hashes=new Set(currentState.map(row=>row.row_hash));
  const records=snapshot.records.map((row,position)=>({...row,position,raw_record:hashes.has(row.row_hash) ? null : row.raw_record}));
  const batches=[];for(let i=0;i<records.length;i+=batchSize)batches.push(records.slice(i,i+batchSize));return batches;
}
