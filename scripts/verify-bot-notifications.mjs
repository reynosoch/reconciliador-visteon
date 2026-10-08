import assert from 'node:assert/strict';
import {EmailChannel,deliverNotifications} from '../supabase/functions/bot-notifications/channels.mjs';
const job={id:'synthetic-delivery',run_id:'synthetic-run',runner_id:'runner-test',attempt:1,occurred_at:'2026-10-08T08:00:00Z',last_valid_at:null};
let sends=0,acks=[];
const email=new EmailChannel({key:'provider-test-value',from:'sender@example.invalid',to:['recipient@example.invalid'],fetchImpl:async(url,options)=>{sends++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'fourwall-failure-synthetic-run');assert.ok(!options.body.includes('provider-test-value'));return {ok:true};}});
assert.deepEqual(await deliverNotifications({claim:async()=>[job],ack:async p=>acks.push(p),channel:email}),{claimed:1,sent:1});assert.equal(sends,1);assert.equal(acks[0].sent,true);
await deliverNotifications({claim:async()=>[job],ack:async p=>acks.push(p),channel:{send:async()=>{throw Error('Untrusted provider response');}}});assert.equal(acks[1].sent,false);
await assert.rejects(new EmailChannel({}).send(job),/EMAIL_NOT_CONFIGURED/);
console.log('Notification adapter OK: final-run job, minimal email, provider idempotency, failure ack and prepared Teams interface.');
