'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import Welcome from './welcome';
import Store from './store';
export default function AuthShell(){
 const [session,setSession]=useState<any>(null),[role,setRole]=useState(''),[ready,setReady]=useState(false),[modal,setModal]=useState(false),[mode,setMode]=useState('login'),[error,setError]=useState(''),[info,setInfo]=useState(''),[busy,setBusy]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[otp,setOtp]=useState(''),[factor,setFactor]=useState(''),[qr,setQr]=useState(''),[secret,setSecret]=useState(''),[factors,setFactors]=useState<any[]>([]),[requested,setRequested]=useState('team'),[security,setSecurity]=useState(false);
 async function check(){
  const {data:{session:s}}=await supabase.auth.getSession();setSession(s);
  if(!s){setReady(false);setRole('');return;}
  const access=await supabase.rpc('melec_access');
  if(access.error||!access.data){setReady(false);setError('Votre adresse n’est pas encore autorisée. Contactez l’administrateur du magasin.');setMode('blocked');setModal(true);return;}
  setRole(access.data);
  const aal=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const list=await supabase.auth.mfa.listFactors();
  if(aal.error||list.error){setError('Impossible de vérifier Authenticator. Réessayez.');setReady(false);setModal(true);return;}
  setFactors(list.data.totp);setQr('');setSecret('');setOtp('');
  if(aal.data.currentLevel==='aal2'&&aal.data.nextLevel==='aal2'){setReady(true);setModal(false);return;}
  setReady(false);setModal(true);
  if(list.data.totp.length){setFactor(list.data.totp[0].id);setMode('verify');}else{setFactor('');setMode('enroll');}
 }
 useEffect(()=>{check();const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){setMode('password');setModal(true);setReady(false);}else setTimeout(()=>check(),0);});return()=>subscription.unsubscribe();},[]);
 function open(kind:string){setRequested(kind);setMode('login');setError('');setInfo('');setModal(true);}
 async function logout(){await supabase.auth.signOut();setReady(false);setSession(null);setRole('');setSecurity(false);setModal(false);setPassword('');setOtp('');}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setInfo('');try{
  if(mode==='signup'){const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.href.split('#')[0]}});if(error)throw error;setInfo('Compte créé. Consultez votre e-mail pour confirmer votre adresse, puis connectez-vous.');setPassword('');setMode('login');}
  else if(mode==='login'){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw Error('Adresse e-mail ou mot de passe incorrect, ou adresse non confirmée.');setPassword('');await check();}
  else if(mode==='reset'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.href.split('#')[0]});if(error)throw error;setInfo('Si cette adresse possède un compte, vous recevrez un lien de réinitialisation.');}
  else if(mode==='password'){const {error}=await supabase.auth.updateUser({password});if(error)throw error;setPassword('');await logout();open('team');setInfo('Mot de passe modifié. Reconnectez-vous.');}
  else{const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code:otp});if(error)throw Error('Code Authenticator incorrect ou expiré.');setSecurity(false);await check();}
 }catch(e:any){setError(e.message);}finally{setBusy(false);}}
 async function enroll(){setBusy(true);setError('');try{
  const list=await supabase.auth.mfa.listFactors();if(list.error)throw list.error;
  for(const f of list.data.all.filter(x=>x.factor_type==='totp'&&x.status==='unverified')){const r=await supabase.auth.mfa.unenroll({factorId:f.id});if(r.error)throw r.error;}
  const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'MELECGEST '+new Date().toLocaleDateString('fr-FR')});if(error)throw error;
  setFactor(data.id);setQr(data.totp.qr_code);setSecret(data.totp.secret);setMode('verify');setOtp('');
 }catch(e:any){setError(e.message);}finally{setBusy(false);}}
 async function remove(id:string){setBusy(true);setError('');try{const {error}=await supabase.auth.mfa.unenroll({factorId:id});if(error)throw error;await supabase.auth.refreshSession();setSecurity(false);await check();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <>{ready?<><div className="account-bar"><span>{role==='admin'?'Administrateur':'Équipe'} · {session?.user.email}</span><div><button className="quiet" onClick={()=>{setSecurity(true);setMode('security');setError('');setModal(true);}}>Sécurité</button><button className="quiet logout-button" onClick={logout}>Déconnexion</button></div></div><Store role={role}/></>:<div className="app is-home"><Welcome online={true} status="Accès sécurisé · Authenticator" onAdmin={()=>open('admin')} onEnter={()=>open('team')}/></div>}
 {modal&&<div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" aria-label="Fermer" disabled={busy} onClick={()=>{setModal(false);setSecurity(false);}}>×</button>
 <h2 id="auth-title">{mode==='security'?'Sécurité du compte':mode==='verify'?'Validation Authenticator':mode==='enroll'?'Configurer Authenticator':mode==='signup'?'Créer votre compte':mode==='reset'?'Mot de passe oublié':mode==='password'?'Nouveau mot de passe':mode==='blocked'?'Accès en attente':requested==='admin'?'Connexion administrateur':'Connexion équipe'}</h2>
 {mode==='blocked'?<><p className="modal-subtitle">Seules les adresses autorisées par l’administrateur peuvent accéder au magasin.</p><button className="quiet" onClick={logout}>Se déconnecter</button></>:mode==='security'?<><p className="modal-subtitle">Ajoutez votre nouvel appareil avant de retirer l’ancien. Sans Authenticator actif, le magasin sera verrouillé.</p>{factors.map(f=><div className="factor-row" key={f.id}><span>{f.friendly_name||'Authenticator'}</span><button className="quiet" disabled={busy} onClick={()=>remove(f.id)}>Retirer cet appareil</button></div>)}<button className="primary submit" disabled={busy} onClick={enroll}>Ajouter un appareil</button></>:mode==='enroll'?<><p className="modal-subtitle">Installez Google Authenticator, Microsoft Authenticator ou une application compatible. La double authentification est obligatoire pour l’équipe et l’administrateur.</p><button className="primary submit" disabled={busy} onClick={enroll}>{busy?'Préparation…':'Afficher mon QR code'}</button></>:<form onSubmit={submit}>
 {['login','signup','reset'].includes(mode)&&<label>Adresse e-mail<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {['login','signup','password'].includes(mode)&&<label>Mot de passe<input type="password" required minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 {mode==='signup'&&<p className="help">12 caractères minimum. Votre adresse doit être autorisée par l’administrateur pour accéder au magasin.</p>}
 {mode==='verify'&&<>{qr&&<div className="mfa-setup"><p>Scannez ce QR code dans votre application Authenticator.</p><img src={qr.startsWith('data:')?qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr)} alt="QR code personnel Authenticator"/><details><summary>Saisir la clé manuellement</summary><code>{secret}</code></details></div>}<p className="modal-subtitle">Saisissez le code à six chiffres de votre application Authenticator.</p><label>Code Authenticator<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/></label></>}
 <button className="primary submit" disabled={busy}>{busy?'Vérification…':mode==='signup'?'Créer mon compte':mode==='reset'?'Recevoir un lien':mode==='password'?'Enregistrer':'Continuer'}</button>
 {mode==='login'&&<div className="auth-links"><button type="button" className="text-button" onClick={()=>{setMode('signup');setError('');}}>Première connexion : créer un compte</button><button type="button" className="text-button" onClick={()=>{setMode('reset');setError('');}}>Mot de passe oublié</button></div>}
 {['signup','reset'].includes(mode)&&<button type="button" className="text-button" onClick={()=>{setMode('login');setError('');}}>Retour à la connexion</button>}
 </form>}
 {error&&<p className="form-error" role="alert">{error}</p>}{info&&<p className="help-box" role="status">{info}</p>}{session&&!ready&&mode!=='blocked'&&<button className="text-button" onClick={logout}>Annuler et se déconnecter</button>}
 </section></div>}
 </>;
}
