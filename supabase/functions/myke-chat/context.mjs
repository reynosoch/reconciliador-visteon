// Deterministic, compact retrieval from build-verified sources; no vector database.
const words = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) || [];
export function selectMykeChatKnowledge(knowledge, context, question) {
  const tokens=new Set(words(question));
  const score=value=>words(value).reduce((n,w)=>n+(tokens.has(w) ? 1 : 0),0);
  const topics=(knowledge.topics || []).map(t=>({t,score:score(t.title+' '+t.keywords.join(' '))})).sort((a,b)=>b.score-a.score).slice(0,3).map(({t})=>({id:t.id,title:t.title,paragraphs:t.paragraphs.slice(0,2),sources:t.sources}));
  const {documents:docs,modules,operatingModel}=selectProjectContext(context,question);
  return {topics,documents:docs,modules,operatingModel};
}
export function selectProjectContext(context,question){
  const tokens=new Set(words(question));
  const score=value=>words(value).reduce((n,w)=>n+(tokens.has(w) ? 1 : 0),0);
  const docs=(context.documents || []).map(d=>({d,score:score(d.heading)})).sort((a,b)=>b.score-a.score).slice(0,2).map(({d})=>({path:d.path,heading:d.heading,excerpt:d.content.split(/\n\s*\n/).slice(0,3).join('\n\n').slice(0,2200)}));
  const modules=(context.modules || []).map(m=>({m,score:score(m.path+' '+m.keywords)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,2).map(({m})=>({path:m.path,sha256:m.sha256,excerpt:m.content.slice(0,1800),partial:true}));
  return {documents:docs,modules,operatingModel:context.operatingModel};
}
