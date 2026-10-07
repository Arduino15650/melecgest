import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5187';
async function get(){const r=await fetch(origin+'/api/store');assert.equal(r.status,200);return r.json();}
async function post(body,cookie=''){const r=await fetch(origin+'/api/store',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const ref='TEST-'+Date.now();
assert.equal((await post({action:'item',ref,name:'Disjoncteur test 16 A',type:'Protection électrique',category:'Habitat',supplier:'Schneider Electric',unit:'pièce',location:'Test local',stock:10,threshold:3})).status,200);
const item=(await get()).items.find(i=>i.ref===ref);assert.ok(item);
assert.equal((await post({action:'item',ref,name:'Doublon',type:'Protection électrique',category:'Habitat',supplier:'Schneider Electric',unit:'pièce',location:'',stock:0,threshold:3})).status,400);
const results=await Promise.all([post({action:'movement',id:item.id,kind:'out',quantity:7,note:'Sortie simultanée A'}),post({action:'movement',id:item.id,kind:'out',quantity:7,note:'Sortie simultanée B'})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
let state=await get();assert.equal(state.items.find(i=>i.id===item.id).stock,3);
assert.equal((await post({action:'movement',id:item.id,kind:'in',quantity:5,note:'Réception test'})).status,200);
assert.equal((await post({action:'movement',id:item.id,kind:'out',quantity:-2})).status,400);
state=await get();assert.equal(state.items.find(i=>i.id===item.id).stock,8);const t=state.totals.find(t=>t.item_id===item.id);assert.equal(t.incoming,15);assert.equal(t.outgoing,7);
assert.equal((await post({action:'settings',name:'Test',address:'Test',logo:''})).status,403);
if(!state.configured){const email='test-admin@example.test',code=crypto.randomUUID();const setup=await post({action:'setup',email,code});assert.equal(setup.status,200);assert.ok(setup.cookie);assert.equal((await post({action:'settings',name:'Établissement de test local',address:'Adresse de test',logo:''},setup.cookie)).status,200);assert.equal((await post({action:'setup',email,code})).status,409);assert.equal((await post({action:'logout'},setup.cookie)).status,200);assert.equal((await post({action:'settings',name:'Interdit',address:'Test',logo:''},setup.cookie)).status,403);assert.equal((await post({action:'login',email,code})).status,200);for(let n=0;n<5;n++)assert.equal((await post({action:'login',email,code:'wrong-password'})).status,401);assert.equal((await post({action:'login',email,code})).status,429);}
console.log('PASS: création, référence unique, concurrence des sorties, stock non négatif, compteurs, validation, administration protégée, verrouillage et limitation des tentatives. Données de test locales uniquement.');
