import {useState} from 'react';
import {botApi,getInventoryClient} from '../../services/botControl.js';

export default function InventoryLogin({onAuthenticated}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const submit=async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{
      const client=getInventoryClient();if(!client)throw Error('Falta configurar Supabase.');
      const {error:failure}=await client.auth.signInWithPassword({email:email.trim(),password});
      setPassword('');if(failure)throw Error('No pudimos iniciar sesión. Revisa tu cuenta de operador.');
      const context=await botApi('session');
      onAuthenticated?.(context);
    }catch(failure){setPassword('');setError(failure.message);}finally{setBusy(false);}
  };
  return <form className="vi-bot-password" onSubmit={submit}>
    <label>Correo de la cuenta<input className="vi-input" type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} required/></label>
    <label>Contraseña de la cuenta<input className="vi-input" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required/></label>
    <button className="vi-button vi-button-primary" disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button>
    {error && <p role="alert">{error}</p>}
    <small>La sesión pertenece a este navegador. Las credenciales 4Wall se escriben únicamente en el runner corporativo.</small>
  </form>;
}
