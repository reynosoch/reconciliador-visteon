// Copilot Studio's documented Direct Line REST transport, executed only on the server.
// No bot secret, token, inventory or conversation identifiers are returned to the browser.
const origins = new Set(["https://directline.botframework.com","https://europe.directline.botframework.com","https://india.directline.botframework.com"]);
export function validCopilotEndpoint(endpoint) {
  try {const url=new URL(endpoint);return origins.has(url.origin) && url.pathname.replace(/\/$/,"")==="/v3/directline" && !url.search && !url.hash && !url.username && !url.password;}catch{return false;}
}
export async function requestCopilotReply({secret,endpoint="https://directline.botframework.com/v3/directline",text,signal,fetchImpl=fetch,pause=(ms)=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  if(!secret || !validCopilotEndpoint(endpoint))throw new Error("unconfigured");
  const base=endpoint.replace(/\/$/,"");
  const headers={Authorization:`Bearer ${secret}`,"Content-Type":"application/json"};
  const call=async(path,options={})=>{
    signal?.throwIfAborted();
    const result=await fetchImpl(base+path,{...options,headers,signal});
    if(!result.ok)throw new Error(result.status===429 ? "rate" : "provider");
    return result.json();
  };
  const conversation=await call("/conversations",{method:"POST",body:JSON.stringify({})});
  if(typeof conversation.conversationId!=="string" || !conversation.conversationId)throw new Error("provider");
  const path=`/conversations/${encodeURIComponent(conversation.conversationId)}/activities`;
  // Drain greetings before sending so a generic greeting is never presented as the answer.
  let watermark=(await call(path)).watermark;
  const userId=`myke-${crypto.randomUUID()}`;
  const activity={type:"message",from:{id:userId},locale:"es-MX",text};
  if(JSON.stringify(activity).length>200000)throw new Error("context_size");
  const sent=await call(path,{method:"POST",body:JSON.stringify(activity)});
  if(typeof sent.id!=="string")throw new Error("provider");
  for(let poll=0;poll<30;poll++) {
    const data=await call(path+(watermark ? `?watermark=${encodeURIComponent(watermark)}` : ""));
    watermark=data.watermark ?? watermark;
    const replies=(data.activities || []).filter(a=>a.type==="message" && a.from?.id!==userId && typeof a.text==="string" && a.text.trim() && (!a.replyToId || a.replyToId===sent.id));
    if(replies.length){const answer=replies.map(a=>a.text).join("\n\n").trim();if(answer.length>12000)throw new Error("truncated");return answer;}
    await pause(650);signal?.throwIfAborted();
  }
  throw new DOMException("Copilot did not answer in time","TimeoutError");
}
