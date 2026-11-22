import assert from 'node:assert/strict';
let cookie='',csrf='',logged=false;
async function call(path,body,method='GET',expected=200){
 const res=await fetch((process.env.API_URL||'http://127.0.0.1:3100/api/v1')+path,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':crypto.randomUUID()},...(method==='GET'?{}:{body:JSON.stringify(body||{})})});
 for(const c of res.headers.getSetCookie())cookie=cookie.split('; ').filter(x=>!x.startsWith(c.split('=')[0]+'=')).concat(c.split(';')[0]).join('; ');
 const data=await res.json();assert.equal(res.status,expected,method+' '+path+': '+JSON.stringify(data));return data.data??data;
}
try{
 const c=await call('/auth/csrf');csrf=c.token;
 await call('/auth/dev-session',{name:'食材功能验收'},'POST',201);logged=true;
 let me=await call('/me');const all=await call('/meals');
 // Derive a complete shopping list from the installed recipe versions, preserving existing seed data.
 const breakfast=all.find(m=>m.kind==='HOME'&&m.slots.includes('breakfast')&&m.minutes<=30);
 const lunch=all.find(m=>m.kind==='HOME'&&m.slots.includes('lunch')&&m.slots.includes('dinner')&&m.minutes<=30);
 assert(breakfast&&lunch,'Seed at least one breakfast and one lunch/dinner recipe before this check.');
 const names=[...new Set([...breakfast.ingredients,...lunch.ingredients].map(i=>i.name))];
 await call('/me/preferences',{...me.preferences,scene:'home',availableIngredients:names,preferredIngredients:[lunch.ingredients[0].name],ingredientMode:'only',expectedRevision:me.preferencesRevision},'PUT');
 me=await call('/me');assert.deepEqual(me.preferences.availableIngredients,names);
 const list=await call('/meals?recommended=true&slot=lunch');assert(list.length>0);assert(list.every(m=>m.ingredients.every(i=>names.includes(i.name))));
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const draft=await call('/plan-drafts',{startDate:date,durationDays:7},'POST',201);
 const plan=await call('/plans/'+draft.id);assert(plan.items.filter(i=>i.slot!=='workout').every(i=>i.snapshot.ingredients.every(n=>names.includes(n.name))));
 const pool=await call('/draw-pools',{slot:'lunch'},'POST',201);assert(pool.candidates.every(m=>m.ingredients.every(i=>names.includes(i.name))));
 await call('/me/preferences',{...me.preferences,availableIngredients:[],expectedRevision:me.preferencesRevision},'PUT',422);
 await call('/me/preferences',{...me.preferences,availableIngredients:null,expectedRevision:me.preferencesRevision},'PUT',422);
 await call('/me/preferences',{...me.preferences,availableIngredients:['芦笋'],expectedRevision:me.preferencesRevision},'PUT');
 await call('/draw-pools/'+pool.id+'/draws',{},'POST',409);
 assert.equal((await call('/meals?recommended=true&slot=lunch')).length,0);
 const current=await call('/me');
 const legacy={scene:current.preferences.scene,minutes:current.preferences.minutes,budget:current.preferences.budget,allergens:[],dislikes:[],workoutDays:[],expectedRevision:current.preferencesRevision};
 await call('/me/preferences',legacy,'PUT');
 assert.deepEqual((await call('/me')).preferences.availableIngredients,['芦笋']);
 assert.equal((await call('/plans/'+draft.id)).items.length,plan.items.length);
 console.log('PASS: API persistence, strict recommendation/plan/pool, input validation, stale pools and legacy client preservation');
}finally{if(logged)await call('/me',{},'DELETE');}
