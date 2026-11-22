import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const sharp=createRequire(new URL('../apps/api/package.json',import.meta.url))('sharp');
const base=process.env.API_URL||'http://127.0.0.1:3100/api/v1';
function client(){let cookie='',csrf='',logged=false;return {get logged(){return logged;},async login(){csrf=(await this.call('/auth/csrf')).token;await this.call('/auth/dev-session',{name:'养成专项验收'},'POST',201);logged=true;},async remove(){if(logged){await this.call('/me',{},'DELETE');logged=false;}},async call(path,body,method='GET',status=200,key=crypto.randomUUID()){
 const multipart=body instanceof FormData;const res=await fetch(base+path,{method,headers:{cookie,...(!multipart?{'Content-Type':'application/json'}:{}),'X-CSRF-Token':csrf,'Idempotency-Key':key},...(method==='GET'?{}:{body:multipart?body:JSON.stringify(body||{})})});for(const c of res.headers.getSetCookie())cookie=cookie.split('; ').filter(x=>!x.startsWith(c.split('=')[0]+'=')).concat(c.split(';')[0]).join('; ');const data=await res.json();assert.equal(res.status,status,method+' '+path+': '+JSON.stringify(data));return data.data??data;
 }};}
const a=client(),b=client();
try{
 await a.login();assert.equal((await a.call('/me')).activePlan,null);
 const h=await a.call('/habits',{title:' 阅读 ',icon:'book',color:'sage'},'POST',201);assert.equal(h.title,'阅读');
 const photo=new FormData();photo.append('file',new Blob([await sharp({create:{width:32,height:32,channels:3,background:'#344F60'}}).png().toBuffer()],{type:'image/png'}),'test.png');const asset=await a.call('/media',photo,'POST',201);
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const shift=n=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};const path=`/habits/${h.id}/entries/`,body={expectedRevision:0,note:'完成一章',photos:[asset.id]},key=crypto.randomUUID();
 const [one,two]=await Promise.all([a.call(path+date,body,'PUT',200,key),a.call(path+date,body,'PUT',200,key)]);assert.equal(one.id,two.id);assert.equal((await a.call('/habits/'+h.id)).progress.totalDays,1);
 const edited=await a.call(path+date,{expectedRevision:1,note:'完成一章，留下笔记',photos:[asset.id]},'PUT');assert.equal(edited.revision,2);await a.call(path+date,{expectedRevision:1,note:'过期写入'},'PUT',409);await a.call(path+shift(1),{expectedRevision:0},'PUT',422);await a.call(path+'2026-02-30',{expectedRevision:0},'PUT',422);
 await a.call(path+shift(-1),{expectedRevision:0,note:'昨天读过'},'PUT');let detail=await a.call('/habits/'+h.id);assert.equal(detail.progress.totalDays,2);assert.equal(detail.progress.streak,2);assert.equal(detail.entries.length,2);
 const revoked=await a.call(path+date,{expectedRevision:2},'DELETE');detail=await a.call('/habits/'+h.id);assert.equal(detail.progress.totalDays,1);assert.equal(detail.progress.streak,1);await a.call(path+date,{expectedRevision:revoked.revision,note:'重新记下'},'PUT');
 const archived=await a.call('/habits/'+h.id,{expectedRevision:h.revision,archived:true},'PATCH');await a.call(path+shift(-2),{expectedRevision:0},'PUT',409);await a.call('/habits/'+h.id,{expectedRevision:archived.revision,archived:false},'PATCH');
 const exported=await a.call('/me/data-export');assert.equal(exported.habits.length,1);assert.equal(exported.habits[0].entries.length,2);assert.equal(exported.records.length,0);
 await b.login();await b.call('/habits/'+h.id,undefined,'GET',404);await b.call('/habits/'+h.id,{expectedRevision:3,title:'越权'},'PATCH',404);const other=await b.call('/habits',{title:'摄影'},'POST',201);await b.call(`/habits/${other.id}/entries/${date}`,{expectedRevision:0,photos:[asset.id]},'PUT',403);
 await a.remove();await a.call('/me',undefined,'GET',401);console.log('PASS: real DB migration, owned habits, same-key concurrent daily record, edit/conflict, backfill, undo/restore, archive, private photos, export and account deletion');
}finally{await a.remove();await b.remove();}
