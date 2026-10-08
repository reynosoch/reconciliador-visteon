import {useEffect,useState} from 'react';
import {watchBotState} from '../services/botControl.js';

export function useBotRunningStatus(){
  const [botRunning,setBotRunning]=useState(false);
  const [botState,setBotState]=useState({data:null,error:null});
  useEffect(()=>watchBotState(next=>{
    const observedAt=Date.now();
    setBotState(previous=>({...previous,...next,observedAt}));
    if(next.data)setBotRunning(next.data.runners.some(r=>r.state!=='OFFLINE' && Boolean(r.active_run_id)));
    if(next.error)setBotRunning(false);
  }),[]);
  return [botRunning,setBotRunning,botState];
}
