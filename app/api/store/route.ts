import { env } from 'cloudflare:workers';
export const dynamic='force-dynamic';
const db=()=> (env as any).DB;
const json=(v:any,status=200,headers:any={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(s:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
async function password(code:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
async function admin(req:Request){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)melec_admin=([^;]+)/)?.[1];return token && await db().prepare('SELECT id FROM sessions WHERE id=? AND expires>?').bind(await digest(token),Date.now()).first();}
function str(v:any,max=160){if(typeof v!=='string'||v.length>max)throw new Error('Texte invalide ou trop long.');return v.trim();}
function num(v:any,min=0){if(!Number.isSafeInteger(v)||v<min||v>10000000)throw new Error('Quantité invalide.');return v;}
export async function GET(req:Request){try{const [items,movements,s]=await Promise.all([db().prepare('SELECT * FROM items ORDER BY name').all(),db().prepare('SELECT m.*,i.name,i.ref,i.unit FROM movements m JOIN items i ON i.id=m.item_id ORDER BY created DESC LIMIT 200').all(),db().prepare('SELECT email,name,address,logo FROM settings WHERE id=1').first()]);const totals=await db().prepare("SELECT item_id, SUM(CASE WHEN kind='in' THEN quantity ELSE 0 END) AS incoming, SUM(CASE WHEN kind='out' THEN quantity ELSE 0 END) AS outgoing FROM movements GROUP BY item_id").all();return json({items:items.results,movements:movements.results,totals:totals.results,settings:s?{name:s.name,address:s.address,logo:s.logo}:null,configured:!!s,admin:!!await admin(req)});}catch{return json({error:'Connexion à la base de données indisponible.'},503);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin') && req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origine refusée.'},403);
 const b:any=await req.json(),d=db();
 if(b.action==='setup'||b.action==='login'){
  const email=str(b.email,254).toLowerCase(),code=str(b.code,128);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||code.length<8)throw new Error('Saisissez une adresse e-mail valide et un code de 8 caractères minimum.');
  const existing=await d.prepare('SELECT * FROM settings WHERE id=1').first();
  if(b.action==='setup'){if(existing)return json({error:'L’administration est déjà configurée.'},409);const salt=crypto.randomUUID();await d.prepare('INSERT INTO settings(id,email,salt,hash) VALUES(1,?,?,?)').bind(email,salt,await password(code,salt)).run();}
  else{const a=await d.prepare('SELECT * FROM attempts WHERE id=1').first();if(a?.until>Date.now())return json({error:'Trop de tentatives. Réessayez dans une minute.'},429);const computed=await password(code,existing?.salt||'invalid');if(!existing||email!==existing.email||computed!==existing.hash){await d.prepare('INSERT INTO attempts(id,count,until) VALUES(1,1,0) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until>0 AND until<? THEN 1 ELSE count+1 END,until=CASE WHEN count>=4 AND NOT(until>0 AND until<?) THEN ? ELSE 0 END').bind(Date.now(),Date.now(),Date.now()+60000).run();return json({error:'Adresse e-mail ou code incorrect.'},401);}}
  const token=crypto.randomUUID()+crypto.randomUUID();await d.batch([d.prepare('INSERT OR REPLACE INTO attempts(id,count,until) VALUES(1,0,0)'),d.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),d.prepare('INSERT INTO sessions(id,expires) VALUES(?,?)').bind(await digest(token),Date.now()+3600000)]);return json({ok:true},200,{'Set-Cookie':`melec_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${new URL(req.url).protocol==='https:'?'; Secure':''}`});
 }
 if(b.action==='logout'){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)melec_admin=([^;]+)/)?.[1];if(token)await d.prepare('DELETE FROM sessions WHERE id=?').bind(await digest(token)).run();return json({ok:true},200,{'Set-Cookie':'melec_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
 if(b.action==='settings'||b.action==='code'){
  if(!await admin(req))return json({error:'Déverrouillez l’administration.'},403);
  if(b.action==='code'){const code=str(b.code,128);if(code.length<8)throw new Error('Le code doit contenir au moins 8 caractères.');const salt=crypto.randomUUID();await d.batch([d.prepare('UPDATE settings SET salt=?,hash=? WHERE id=1').bind(salt,await password(code,salt)),d.prepare('DELETE FROM sessions')]);return json({ok:true});}
  const logo=str(b.logo||'',400000);if(logo&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(logo))throw new Error('Logo invalide.');await d.prepare('UPDATE settings SET name=?,address=?,logo=? WHERE id=1').bind(str(b.name),str(b.address,800),logo).run();return json({ok:true});
 }
 if(b.action==='item'){
  const id=crypto.randomUUID(),stock=num(b.stock),threshold=num(b.threshold),values=[str(b.ref),str(b.name),str(b.type),str(b.category),str(b.supplier),str(b.unit,30),str(b.location),threshold];if(values.slice(0,6).some(x=>!x))throw new Error('Complétez les champs obligatoires.');
  await d.batch([d.prepare('INSERT INTO items(id,ref,name,type,category,supplier,unit,location,threshold,stock) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,...values,stock),...(stock?[d.prepare('INSERT INTO movements(id,item_id,kind,quantity,note,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,'in',stock,'Stock initial',new Date().toISOString())]:[])]);return json({ok:true});
 }
 if(b.action==='edit'){const values=[str(b.ref),str(b.name),str(b.type),str(b.category),str(b.supplier),str(b.unit,30),str(b.location),num(b.threshold)];if(values.slice(0,6).some(x=>!x))throw new Error('Complétez les champs obligatoires.');const result=await d.prepare('UPDATE items SET ref=?,name=?,type=?,category=?,supplier=?,unit=?,location=?,threshold=? WHERE id=?').bind(...values,str(b.id)).run();if(!result.meta.changes)throw new Error('Article introuvable.');return json({ok:true});}
 if(b.action==='movement'){
  const id=str(b.id),q=num(b.quantity,1),kind=b.kind;if(!['in','out'].includes(kind))throw new Error('Mouvement invalide.');const mid=crypto.randomUUID(),note=str(b.note||'',400);
  const r=await d.batch([d.prepare("INSERT INTO movements(id,item_id,kind,quantity,note,created) SELECT ?,id,?,?,?,? FROM items WHERE id=? AND (?='in' OR stock>=?) AND (?='out' OR stock+?<=10000000)").bind(mid,kind,q,note,new Date().toISOString(),id,kind,q,kind,q),d.prepare('UPDATE items SET stock=stock+? WHERE id=? AND EXISTS(SELECT 1 FROM movements WHERE id=?)').bind(kind==='in'?q:-q,id,mid)]);if(!r[0].meta.changes)return json({error:'Stock insuffisant, quantité trop élevée ou article introuvable.'},409);return json({ok:true});
 }
 return json({error:'Action inconnue.'},400);
 }catch(e:any){return json({error:/UNIQUE/.test(e.message)?'Cette référence existe déjà.':e.message||'Impossible d’enregistrer.'},400);}}

