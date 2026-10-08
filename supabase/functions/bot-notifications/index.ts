import {EmailChannel,deliverNotifications} from './channels.mjs';
Deno.serve(async request=>{
  const expected=Deno.env.get('BOT_NOTIFICATION_CRON_SECRET');
  if(request.method!=='POST' || !expected || request.headers.get('Authorization')!==`Bearer ${expected}`)return new Response('Unauthorized',{status:401});
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(url!=='https://uukhwkywmnarcfruerpp.supabase.co' || !key)return new Response('Wrong project',{status:503});
  const channel=new EmailChannel({key:Deno.env.get('RESEND_API_KEY'),from:Deno.env.get('BOT_EMAIL_FROM'),to:(Deno.env.get('BOT_EMAIL_TO') || '').split(',').filter(Boolean),dashboardUrl:Deno.env.get('BOT_DASHBOARD_URL')});
  // Missing provider configuration leaves the outbox untouched for later activation.
  if(!channel.key || !channel.from || !channel.to.length)return new Response('Email not configured',{status:503});
  const rpc=async(op:string,p:object={})=>{
    const result=await fetch(url+'/rest/v1/rpc/bot_notification_delivery',{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({op,p}),signal:AbortSignal.timeout(15000)});
    if(!result.ok)throw Error('DELIVERY_QUEUE_ERROR');return result.json();
  };
  try{return Response.json(await deliverNotifications({claim:()=>rpc('claim'),ack:(p:object)=>rpc('ack',p),channel}));}
  catch{return new Response('Delivery unavailable',{status:503});}
});
