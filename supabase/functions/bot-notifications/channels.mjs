// Server-only channel interface. Teams can implement send(job) without changing publication.
export class EmailChannel {
  constructor({key,from,to,dashboardUrl,fetchImpl=fetch}){this.key=key;this.from=from;this.to=to;this.dashboardUrl=dashboardUrl;this.fetch=fetchImpl;}
  async send(job){
    if(!this.key || !this.from || !this.to?.length)throw Error('EMAIL_NOT_CONFIGURED');
    const text=`4Wall automatic sync failed\nRunner: ${job.runner_id}\nHora: ${job.occurred_at}\nÚltimo corte válido: ${job.last_valid_at || 'No confirmado'}\nEl último CURRENT válido sigue activo.\n${this.dashboardUrl || ''}`;
    const response=await this.fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json','Idempotency-Key':`fourwall-failure-${job.run_id}`},body:JSON.stringify({from:this.from,to:this.to,subject:'4Wall automatic sync failed',text}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('EMAIL_DELIVERY_FAILED');
  }
}
export async function deliverNotifications({claim,ack,channel}){
  const jobs=await claim();let sent=0;
  for(const job of jobs){let delivered=false;try{await channel.send(job);delivered=true;sent++;}catch{/* Never log provider responses or keys. */}await ack({id:job.id,attempt:job.attempt,sent:delivered});}
  return {claimed:jobs.length,sent};
}
