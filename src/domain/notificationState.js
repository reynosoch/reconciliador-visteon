export const ALERT_STORAGE_KEY="visteon.inventory.operationalAlerts.v1";
export const READ_NEWS_KEY="visteon.inventory.readNews.v1";

export function syncOperationalAlerts(previous={},findings=[],now=new Date().toISOString(),evaluationValid=false){
  if(!evaluationValid) return {state:previous,active:Object.values(previous).filter(x=>x.active),newIds:[],resolvedIds:[],evaluationValid:false};
  const next={...previous};const current=new Set(findings.map(f=>f.id));const newIds=[];const resolvedIds=[];
  for(const finding of findings){
    const old=next[finding.id];
    if(!old){next[finding.id]={id:finding.id,partNumber:finding.partNumber,ruleCode:finding.ruleCode,active:true,read:false,firstSeen:now,lastSeen:now};newIds.push(finding.id);}
    else next[finding.id]={...old,partNumber:finding.partNumber,ruleCode:finding.ruleCode,active:true,lastSeen:now};
  }
  for(const [id,item] of Object.entries(next)){
    if(item.active&&!current.has(id)){next[id]={...item,active:false,resolvedAt:now};resolvedIds.push(id);}
  }
  return {state:next,active:Object.values(next).filter(x=>x.active),newIds,resolvedIds,evaluationValid:true};
}
export function enrichFindingsWithAlertState(findings=[],state={}){
  return findings.map(f=>({...f,firstDetected:state[f.id]?.firstSeen||null,lastDetected:state[f.id]?.lastSeen||null}));
}
