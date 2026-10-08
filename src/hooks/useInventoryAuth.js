import {useEffect,useState} from 'react';
import {botApi,getInventoryClient} from '../services/botControl.js';

export function useInventoryAuth(){
  const [state,setState]=useState({loading:true,user:null,role:'anon',requireDashboardLogin:false,error:null});
  useEffect(()=>{
    let client;try{client=getInventoryClient();}catch(error){setState(s=>({...s,loading:false,error}));return undefined;}let active=true,sequence=0;
    const apply=async session=>{
      const id=++sequence;
      try{const context=await botApi('session');if(active && id===sequence)setState({loading:false,user:session?.user || null,role:session ? context.role : 'anon',requireDashboardLogin:context.require_dashboard_login,error:null});}
      catch(error){if(active && id===sequence)setState(s=>({...s,loading:false,user:session?.user || null,role:'anon',error}));}
    };
    if(!client){setState(s=>({...s,loading:false}));return undefined;}
    void client.auth.getSession().then(({data})=>apply(data.session));
    // Defer RPC work out of the Auth callback to avoid holding its internal lock.
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>{if(active){window.dispatchEvent(new Event('inventory-auth-changed'));void apply(session);}});});
    const timer=setInterval(()=>{void client.auth.getSession().then(({data})=>apply(data.session));},60000);
    return ()=>{active=false;sequence++;subscription.unsubscribe();clearInterval(timer);};
  },[]);
  return {...state,canOperate:['operator','admin'].includes(state.role),isAdmin:state.role==='admin'};
}
