import {habitInputError,habitEntryError,habitView} from '../../api/src/habits-domain';
import {getWorkout,workoutKeys,workoutPreferenceError,workoutSnapshot} from '../../api/src/workouts';
import {signDetails} from '../../api/src/sign-design';
import {fixtures} from '../../api/src/fixtures';
import {defaults,normalizePreferences,planPreferences,ingredientPreferenceError,rankMeals,cookingPool,mealReason,eligible,today,addDays,weekStart,stats,groceries,reconcileGroceries,isDate} from '../../api/src/domain';
import {renderOfflineSign} from './offline-sign';
const KEY='lightnook-offline-v1';
type Store={schemaVersion:1;revision:number;user:any;loggedIn:boolean;preferences:any;preferencesRevision:number;meals:any[];plans:any[];items:any[];records:any[];favorites:string[];pools:any[];draws:any[];groceries:any[];reports:any[];assets:any[];habits:any[];habitEntries:any[];idempotency:Record<string,any>};
const initial=():Store=>({schemaVersion:1,revision:0,user:null,loggedIn:false,preferences:{...defaults},preferencesRevision:0,meals:[],plans:[],items:[],records:[],favorites:[],pools:[],draws:[],groceries:[],reports:[],assets:[],habits:[],habitEntries:[],idempotency:{}});
function error(status:number,code:string,message:string):never{throw Object.assign(new Error(message),{status,code});}
function read():Store{const raw=localStorage.getItem(KEY);if(!raw)return initial();try{const s=JSON.parse(raw);if(s.schemaVersion!==1)throw Error();s.preferences=normalizePreferences(s.preferences);for(const key of ['habits','habitEntries']){if(s[key]===undefined)s[key]=[];if(!Array.isArray(s[key]))throw Error();}return s;}catch{error(422,'LOCAL_DATA_INVALID','本机数据无法读取。请先导出原始备份，再尝试恢复，不会自动清空。');}}
function persist(s:Store,expectedRevision?:number){if(expectedRevision!==undefined){const raw=localStorage.getItem(KEY),actual=raw?JSON.parse(raw).revision:0;if(actual!==expectedRevision)error(409,'REVISION_CONFLICT','另一个页面已更新本机数据，请刷新后再试');}try{s.revision++;localStorage.setItem(KEY,JSON.stringify(s));}catch{error(507,'STORAGE_FULL','本机存储空间不足，记录尚未保存。请先导出备份并清理图片后重试。');}}
const id=()=>crypto.randomUUID();
const publicMeals=fixtures.map(m=>({...m,id:`local-${m.slug}-v1`,mealId:`local-${m.slug}`,version:1,meal:{id:`local-${m.slug}`,ownerId:null,published:true}}));
function allMeals(s:Store){return [...publicMeals,...s.meals];}
function meal(s:Store,mealId:string){const m=allMeals(s).find(m=>m.id===mealId);if(!m)error(404,'NOT_FOUND','餐单不存在');return m;}
function item(s:Store,itemId:string){const i=s.items.find(i=>i.id===itemId);if(!i)error(404,'NOT_FOUND','安排不存在');return i;}
function activeRecords(s:Store,itemId?:string){return s.records.filter(r=>!r.revokedAt&&(!itemId||r.itemId===itemId));}
function plan(s:Store,planId:string){const p=s.plans.find(p=>p.id===planId);if(!p)error(404,'NOT_FOUND','计划不存在');return {...p,items:s.items.filter(i=>i.planId===p.id).map(i=>({...i,records:activeRecords(s,i.id)}))};}
function day(s:Store,date:string){const p=s.plans.find(p=>p.status==='ACTIVE')||s.plans.find(p=>p.startDate<=date&&p.endDate>=date&&p.status==='ENDED');const items=p?s.items.filter(i=>i.planId===p.id&&i.date===date).map(i=>({...i,records:activeRecords(s,i.id)})):[];const records=activeRecords(s).filter(r=>r.date===date);return {date,plan:p||null,items,records,stats:stats(items,records)};}
function changed(s:Store,date:string){s.reports.forEach(r=>{if(r.startDate<=date&&r.endDate>=date)r.stale=true;});}
function revision(resource:any,n:number){if(resource.revision!==n)error(409,'REVISION_CONFLICT','内容已经变化，请刷新后再确认');}
function randomIndex(n:number){const buf=new Uint32Array(1),limit=Math.floor(2**32/n)*n;do{crypto.getRandomValues(buf);}while(buf[0]>=limit);return buf[0]%n;}
function checkDate(d:string){if(!isDate(d))error(422,'INVALID_DATE','请选择有效日期');return d;}
async function reportView(s:Store,r:any){if(!r)error(404,'NOT_FOUND','签卡不存在');const asset=s.assets.find(a=>a.id===r.snapshot.photoAssetId);return {...r,url:await renderOfflineSign(r.snapshot,asset?.url)};}

async function dispatch(s:Store,path:string,method:string,b:any,options:RequestInit):Promise<any>{
 const url=new URL(path,'http://offline.local'),p=url.pathname,q=url.searchParams;
 if(p==='/auth/csrf')return {token:'offline',devAuth:true,offline:true};
 if(p==='/health')return {ok:true,mode:'offline'};
 if(p==='/auth/dev-session'&&method==='POST'){s.user ||= {id:id(),name:b.name||'小间',createdAt:new Date().toISOString()};s.loggedIn=true;return {userId:s.user.id};}
 if(p==='/auth/session'&&method==='DELETE'){s.loggedIn=false;return {ok:true};}
 if(p==='/auth/otp'||p==='/auth/sessions')error(503,'OFFLINE_AUTH','离线版不发送短信，请使用本机账号');
 if(!s.loggedIn)error(401,'UNAUTHORIZED','先开始你的本机日常');
 if(p==='/me'&&method==='GET')return {...s.user,preferences:s.preferences,preferencesRevision:s.preferencesRevision,activePlan:s.plans.find(p=>p.status==='ACTIVE')||null,demo:true,offline:true};
 if(p==='/me'&&method==='DELETE'){Object.assign(s,initial());return {ok:true};}
 if(p==='/me/data-export')return {app:'lightnook',schemaVersion:1,exportedAt:new Date().toISOString(),data:s};
 if(p==='/habits'&&method==='GET')return s.habits.map(h=>habitView(h,s.habitEntries.filter(e=>e.habitId===h.id)));
 if(p==='/habits'&&method==='POST'){const issue=habitInputError(b,true);if(issue)error(422,'INVALID_HABIT',issue);if(s.habits.length>=100)error(422,'HABIT_LIMIT','最多保留 100 个事项');const habit={id:id(),userId:s.user.id,title:b.title.trim(),icon:b.icon||'plant',color:b.color||'blue',archived:false,revision:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};s.habits.push(habit);return habit;}
 const habitMatch=p.match(/^\/habits\/([^/]+)(?:\/entries\/([^/]+))?$/);
 if(habitMatch){const h=s.habits.find(h=>h.id===habitMatch[1]);if(!h)error(404,'NOT_FOUND','事项不存在');const date=habitMatch[2];
  if(!date){if(method==='GET')return habitView(h,s.habitEntries.filter(e=>e.habitId===h.id),true);if(method==='PATCH'){const issue=habitInputError(b);if(issue)error(422,'INVALID_HABIT',issue);revision(h,b.expectedRevision);for(const key of ['title','icon','color','archived'])if(b[key]!==undefined)h[key]=key==='title'?b[key].trim():b[key];h.revision++;h.updatedAt=new Date().toISOString();return h;}}
  else{const old=s.habitEntries.find(e=>e.habitId===h.id&&e.date===date);
   if(method==='PUT'){const issue=habitEntryError(date,b);if(issue)error(422,'INVALID_HABIT_ENTRY',issue);if(h.archived)error(409,'HABIT_ARCHIVED','恢复事项后再继续记录');if((old?.revision||0)!==b.expectedRevision)error(409,'REVISION_CONFLICT','这天的记录已变化，请刷新');if((b.photos||[]).some((id:string)=>!s.assets.some(a=>a.id===id&&a.purpose==='PHOTO')))error(403,'INVALID_PHOTO','照片不可用');const e=old||{id:id(),habitId:h.id,date,revision:0,createdAt:new Date().toISOString()};Object.assign(e,{note:(b.note||'').trim(),photos:b.photos||[],revokedAt:null,revision:e.revision+1,updatedAt:new Date().toISOString()});if(!old)s.habitEntries.push(e);return e;}
   if(method==='DELETE'){if(!old)error(404,'NOT_FOUND','这天还没有记录');revision(old,b.expectedRevision);if(!old.revokedAt){old.revokedAt=new Date().toISOString();old.revision++;old.updatedAt=new Date().toISOString();}return old;}
  }
 }
 if(p==='/me/preferences'&&method==='PUT'){
   if(s.preferencesRevision!==b.expectedRevision)error(409,'REVISION_CONFLICT','偏好已变化，请刷新后确认');
   if(!['home','mixed','outside'].includes(b.scene)||!Number.isFinite(b.minutes)||b.minutes<5||b.minutes>120||!Number.isFinite(b.budget)||b.budget<500)error(422,'INVALID_INPUT','偏好设置不正确');
   const allergens=['peanut','milk','egg','soy','fish','shellfish','gluten','nuts'];if(!Array.isArray(b.allergens)||b.allergens.some((a:string)=>!allergens.includes(a))||!Array.isArray(b.workoutDays)||b.workoutDays.some((n:number)=>!Number.isInteger(n)||n<0||n>6))error(422,'INVALID_INPUT','过敏或运动日设置不正确');
   const {expectedRevision,...input}=b;const issue=ingredientPreferenceError({...s.preferences,...input})||workoutPreferenceError({...s.preferences,...input});if(issue)error(422,'INVALID_INGREDIENTS',issue);const prefs=normalizePreferences({...s.preferences,...input});s.preferences=prefs;s.preferencesRevision++;return {preferences:prefs,revision:s.preferencesRevision};
 }
 if(p==='/meals'&&method==='GET'){const selected=allMeals(s).filter(m=>(!q.get('q')||m.title.includes(q.get('q')!))&&(!q.get('slot')||m.slots.includes(q.get('slot')!))&&(!q.get('scene')||q.get('scene')==='mixed'||(q.get('scene')==='home'?m.kind==='HOME':m.kind==='OUTSIDE'))&&(q.get('favorites')!=='true'||s.favorites.includes(m.mealId))&&(q.get('recommended')!=='true'||eligible(m,s.preferences,undefined,q.get('scene')||undefined))).map(m=>({...m,reason:mealReason(m,s.preferences)}));return q.get('recommended')==='true'?rankMeals(selected,s.preferences):selected;}
 if(p==='/meals'&&method==='POST'){
   if(!b.title?.trim()||b.title.length>30||!['HOME','OUTSIDE'].includes(b.kind)||!Number.isFinite(b.minutes)||b.minutes<0||!Number.isFinite(b.costCents))error(422,'INVALID_INPUT','请检查餐单信息');
   const m={...b,id:id(),mealId:id(),art:'tofu',description:'我的私人餐单，配料信息待核对。',ingredients:[],steps:[],sources:[],allergens:[],allergenKnown:false,nutrition:{estimated:true,calories:null,protein:null,label:'未录入营养数据'}};s.meals.push(m);return m;
 }
 let match=p.match(/^\/meals\/([^/]+)$/);if(match)return meal(s,match[1]);
 match=p.match(/^\/me\/favorites\/([^/]+)$/);if(match){const mealId=match[1];if(!allMeals(s).some(m=>m.mealId===mealId))error(404,'NOT_FOUND','餐单不存在');s.favorites=s.favorites.filter(m=>m!==mealId);if(method==='PUT')s.favorites.push(mealId);return {favorite:method==='PUT'};}
 if(p==='/plan-drafts'){
   checkDate(b.startDate);if(b.startDate<today()||![7,14,21].includes(b.durationDays))error(422,'INVALID_DATE','请检查计划开始日与周期');
   let pref;try{pref=planPreferences(s.preferences,b.ingredientSource,b.ingredients);}catch(e){error(422,'INVALID_INGREDIENTS',(e as Error).message);}
   const pools=['breakfast','lunch','dinner'].map(slot=>cookingPool(allMeals(s).filter(m=>m.slots.includes(slot)&&eligible(m,pref)),pref));
   if(pools.some(p=>!p.length))error(422,'NO_ELIGIBLE_MEALS','部分餐次没有合适的餐食，请调整常买食材、食材使用方式、时间或预算；过敏条件会继续保留');
   const p={id:id(),userId:s.user.id,startDate:b.startDate,endDate:addDays(b.startDate,b.durationDays-1),timeZone:'Asia/Shanghai',status:'DRAFT',revision:1,preferencesRevision:s.preferencesRevision};s.plans.push(p);
   let workoutIndex=0;for(let d=0;d<b.durationDays;d++){const date=addDays(b.startDate,d);for(let j=0;j<3;j++){const m=pools[j][(d+j)%pools[j].length];s.items.push({id:id(),planId:p.id,date,slot:['breakfast','lunch','dinner'][j],mealVersionId:m.id,snapshot:m,disposition:'SCHEDULED',revision:1});}if(s.preferences.workoutDays.includes(new Date(date+'T12:00:00Z').getUTCDay()))s.items.push({id:id(),planId:p.id,date,slot:'workout',snapshot:workoutSnapshot(pref.workoutTypes,workoutIndex++),disposition:'SCHEDULED',revision:1});}return p;
 }
 match=p.match(/^\/plans\/([^/]+)$/);if(match)return plan(s,match[1]);
 match=p.match(/^\/plans\/([^/]+)\/(activate|end)$/);if(match){const plan=s.plans.find(p=>p.id===match![1]);if(!plan)error(404,'NOT_FOUND','计划不存在');revision(plan,b.expectedRevision);if(match[2]==='activate'){if(plan.status!=='DRAFT'||s.plans.some(p=>p.status==='ACTIVE'))error(409,'ACTIVE_PLAN_EXISTS','你已有进行中的计划');if(plan.preferencesRevision!==s.preferencesRevision)error(409,'PREFERENCES_CHANGED','偏好已变化，请重新生成');plan.status='ACTIVE';}else plan.status='ENDED';plan.revision++;return plan;}
 if(p==='/today')return day(s,checkDate(q.get('date')||today()));
 if(p==='/calendar'){
   const from=checkDate(q.get('from')||today()),to=checkDate(q.get('to')||today());if(to<from||to>addDays(from,62))error(422,'INVALID_RANGE','日期范围不正确');const validPlans=s.plans.filter(p=>['ACTIVE','ENDED'].includes(p.status)).map(p=>p.id);const days=[];for(let d=from;d<=to;d=addDays(d,1)){const items=s.items.filter(i=>validPlans.includes(i.planId)&&i.date===d),records=activeRecords(s).filter(r=>r.date===d);days.push({date:d,...stats(items,records),future:d>today()});}return days;
 }
 match=p.match(/^\/plan-items\/([^/]+)$/);if(match){const i=item(s,match[1]);if(method==='PATCH'){revision(i,b.expectedRevision);if(i.date<today()||i.slot!=='workout'||activeRecords(s,i.id).length||!['SCHEDULED','EXCUSED'].includes(b.disposition))error(409,'ITEM_LOCKED','此任务不能这样调整');i.disposition=b.disposition;i.revision++;changed(s,i.date);}return {...i,records:activeRecords(s,i.id),plan:plan(s,i.planId)};}
 match=p.match(/^\/plan-items\/([^/]+)\/replace$/);if(match){const i=item(s,match[1]),m=meal(s,b.mealVersionId);revision(i,b.expectedRevision);if(i.date<today()||activeRecords(s,i.id).length)error(409,'RECORDED_ITEM','已完成或过去的任务，请更正实际记录');if(!m.slots.includes(i.slot)||!eligible(m,s.preferences))error(422,'PREFERENCES_CHANGED','餐单不符合当前条件');if(b.drawId){const d=s.draws.find(d=>d.id===b.drawId),pool=s.pools.find(p=>p.id===d?.poolId);if(!pool||pool.preferencesRevision!==s.preferencesRevision||pool.expiresAt<Date.now()||d.mealVersionId!==m.id)error(409,'POOL_EXPIRED','候选条件已更新，请重新抽取');}i.snapshot=m;i.mealVersionId=m.id;i.revision++;s.plans.find(p=>p.id===i.planId).revision++;return i;}
 match=p.match(/^\/plan-items\/([^/]+)\/record$/);if(match){
   const i=item(s,match[1]);revision(i,b.expectedItemRevision);const at=new Date(b.occurredAt);if(!Number.isFinite(at.getTime())||at.getTime()>Date.now()+300000||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(at)!==i.date)error(422,'DATE_MISMATCH','记录时间与任务日期不一致');
   const old=activeRecords(s,i.id)[0];if(old&&old.revision!==b.expectedRecordRevision)error(409,'REVISION_CONFLICT','记录已变化，请刷新');
   if(i.disposition!=='SCHEDULED')error(409,'ITEM_LOCKED','请先恢复这项安排，再记录完成');
   if(i.slot==='workout'&&(!Number.isInteger(b.minutes)||b.minutes<1||b.minutes>720))error(422,'INVALID_DURATION','请填写有效运动时长');
   if(b.portion!==undefined&&(!Number.isFinite(b.portion)||b.portion<.1||b.portion>10))error(422,'INVALID_PORTION','请填写有效份量');
   if(b.photos?.some((id:string)=>!s.assets.some(a=>a.id===id)))error(403,'INVALID_PHOTO','照片不可用');
   if(b.workoutType!==undefined&&!workoutKeys.includes(b.workoutType))error(422,'INVALID_WORKOUT','请选择支持的运动类型');const chosenWorkout=getWorkout(b.workoutType||i.snapshot.workoutType);
   const actual=i.slot==='workout'?{title:chosenWorkout.title,workoutType:chosenWorkout.key,minutes:b.minutes,note:String(b.note||'').slice(0,300)}:{meal:b.mealVersionId?meal(s,b.mealVersionId):i.snapshot,portion:b.portion||1,note:String(b.note||'').slice(0,300),photos:b.photos||[]};
   const r=old||{id:id(),userId:s.user.id,itemId:i.id,date:i.date,type:i.slot==='workout'?'WORKOUT':'MEAL',revision:0,revokedAt:null};Object.assign(r,{actual,occurredAt:b.occurredAt,revision:r.revision+1});if(!old)s.records.push(r);changed(s,i.date);return r;
 }
 match=p.match(/^\/records\/([^/]+)\/revoke$/);if(match){const r=s.records.find(r=>r.id===match![1]);if(!r)error(404,'NOT_FOUND','记录不存在');revision(r,b.expectedRevision);r.revokedAt=new Date().toISOString();r.revision++;changed(s,r.date);return r;}
 if(p==='/draw-pools'){
   const candidates=cookingPool(allMeals(s).filter(m=>m.slots.includes(b.slot)&&eligible(m,s.preferences,b.slot,b.scene)),s.preferences).slice(0,6);if(!candidates.length)error(422,'NO_ELIGIBLE_MEALS','没有符合条件的餐单，请调整常买食材、食材使用方式、时间或预算；过敏条件会继续保留');const pool={id:id(),preferencesRevision:s.preferencesRevision,candidates,expiresAt:Date.now()+15*60000};s.pools.push(pool);return pool;
 }
 match=p.match(/^\/draw-pools\/([^/]+)\/draws$/);if(match){const p=s.pools.find(p=>p.id===match![1]);if(!p||p.expiresAt<Date.now()||p.preferencesRevision!==s.preferencesRevision)error(409,'POOL_EXPIRED','候选已过期，请重新抽取');const index=randomIndex(p.candidates.length),d={id:id(),poolId:p.id,resultIndex:index,mealVersionId:p.candidates[index].id};s.draws.push(d);return d;}
 if(p==='/grocery-lists'){const p=plan(s,b.planId),g={id:id(),planId:p.id,sourceRevision:p.revision,revision:1,items:groceries(p.items.filter((i:any)=>i.date>=today()&&i.date<=addDays(today(),2)))};s.groceries.push(g);return g;}
 match=p.match(/^\/grocery-lists\/([^/]+)(\/refresh)?$/);if(match){const g=s.groceries.find(g=>g.id===match![1]);if(!g)error(404,'NOT_FOUND','清单不存在');const p=plan(s,g.planId);if(method!=='GET'){revision(g,b.expectedRevision);if(match[2]){g.items=reconcileGroceries(g.items,groceries(p.items.filter((i:any)=>i.date>=today()&&i.date<=addDays(today(),2))));g.sourceRevision=p.revision;}else{const item=g.items.find((i:any)=>i.key===b.key);if(!item)error(404,'NOT_FOUND','食材不存在');item.checked=b.checked;item.needsReview=false;}g.revision++;}return {...g,stale:g.sourceRevision!==p.revision};}
 if(p==='/media'&&method==='POST'){const file=(options.body as FormData).get('file');if(!(file instanceof File)||file.size>8*1024*1024)error(422,'INVALID_IMAGE','请选择 8MB 内的图片');const bitmap=await createImageBitmap(file).catch(()=>error(422,'INVALID_IMAGE','无法读取图片，请选择 JPG、PNG 或 WebP'));const c=document.createElement('canvas'),ratio=Math.min(1,800/Math.max(bitmap.width,bitmap.height));c.width=Math.round(bitmap.width*ratio);c.height=Math.round(bitmap.height*ratio);c.getContext('2d')!.drawImage(bitmap,0,0,c.width,c.height);bitmap.close();const a={id:id(),purpose:'PHOTO',url:c.toDataURL('image/jpeg',.72)};s.assets.push(a);return a;}
 match=p.match(/^\/media\/([^/]+)\/access$/);if(match){const a=s.assets.find(a=>a.id===match![1]);if(!a)error(404,'NOT_FOUND','图片不存在');return {url:a.url};}
 if(p==='/sign-reports'){
   checkDate(b.date);if(b.date>today())error(422,'FUTURE_REPORT','未来的日子还没有记录');const start=b.kind==='week'?weekStart(b.date):b.date,end=b.kind==='week'?addDays(start,6):b.date,validPlans=s.plans.filter(p=>['ACTIVE','ENDED'].includes(p.status)).map(p=>p.id),items=s.items.filter(i=>validPlans.includes(i.planId)&&i.date>=start&&i.date<=end&&i.date<=today()),records=activeRecords(s).filter(r=>r.date>=start&&r.date<=end);
   const snapshot={...stats(items,records),...signDetails(items,records,start,end),start,end,kind:b.kind,template:b.template||'botanical',photoAssetId:b.photoAssetId,partial:end>today(),templateVersion:'2'};const hash=JSON.stringify({snapshot,items:items.map(i=>[i.id,i.revision]),records:records.map(r=>[r.id,r.revision])});let r=s.reports.find(r=>r.hash===hash);if(!r){r={id:id(),kind:b.kind,startDate:start,endDate:end,snapshot,hash,status:'READY',stale:false,createdAt:new Date().toISOString()};s.reports.push(r);}return {...r};
 }
 match=p.match(/^\/sign-reports\/([^/]+)$/);if(match)return reportView(s,s.reports.find(r=>r.id===match![1]));
 if(p==='/me/signs')return Promise.all([...s.reports].reverse().slice(0,30).map(r=>reportView(s,r)));
 error(404,'NOT_FOUND','当前离线版不支持这个操作');
}

export async function offlineApi(path:string,options:RequestInit={}):Promise<any>{
 const method=options.method||'GET',mutating=!['GET','HEAD'].includes(method);
 const execute=async()=>{const s=read(),baseRevision=s.revision,body=typeof options.body==='string'?JSON.parse(options.body||'{}'):{},headers=new Headers(options.headers),key=headers.get('Idempotency-Key'),scope=method+'|'+path+'|'+key;
   if(mutating&&key&&s.idempotency[scope]){const cached=s.idempotency[scope];if(cached.body!==JSON.stringify(body))error(409,'IDEMPOTENCY_CONFLICT','请求标识已用于其他内容');return cached.result;}
   const result=await dispatch(s,path,method,body,options);
   if(mutating){if(key&&!(options.body instanceof FormData)){s.idempotency[scope]={body:JSON.stringify(body),result};const keys=Object.keys(s.idempotency);keys.slice(0,Math.max(0,keys.length-100)).forEach(k=>delete s.idempotency[k]);}persist(s,baseRevision);}return result;
 };
 if(mutating&&navigator.locks)return navigator.locks.request('lightnook-offline-write',execute);return execute();
}
export async function importBackup(text:string){
 if(text.length>8*1024*1024)error(422,'BACKUP_TOO_LARGE','备份过大，请检查文件');let b:any;try{b=JSON.parse(text);}catch{error(422,'INVALID_BACKUP','这不是有效的 JSON 备份');}
 if(b.app!=='lightnook'||b.schemaVersion!==1||b.data?.schemaVersion!==1)error(422,'INVALID_BACKUP','备份格式或版本不受支持');const s=b.data as Store;
 if(s.habits===undefined)s.habits=[];if(s.habitEntries===undefined)s.habitEntries=[];
 for(const key of ['meals','plans','items','records','favorites','pools','draws','groceries','reports','assets','habits','habitEntries'])if(!Array.isArray((s as any)[key])||(s as any)[key].length>10000)error(422,'INVALID_BACKUP','备份的数据结构不完整');
 if(!s.user?.id||typeof s.user.name!=='string'||!Array.isArray(s.preferences?.allergens)||!Array.isArray(s.preferences?.dislikes)||!Array.isArray(s.preferences?.workoutDays))error(422,'INVALID_BACKUP','备份缺少用户与偏好数据');
 if(s.assets.some(a=>typeof a.url!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.url)))error(422,'INVALID_BACKUP','备份包含不支持的图片格式');
 if(s.items.some(i=>!s.plans.some(p=>p.id===i.planId)||!isDate(i.date)||!i.snapshot||typeof i.snapshot.title!=='string'))error(422,'INVALID_BACKUP','备份中的任务关系不完整');
 if(s.records.some(r=>!isDate(r.date)||!r.actual||!s.items.some(i=>i.id===r.itemId)))error(422,'INVALID_BACKUP','备份中的记录关系不完整');
 if(s.habits.some(h=>typeof h.id!=='string'||!/^[a-zA-Z0-9-]{1,128}$/.test(h.id)||h.userId!==s.user.id||!Number.isInteger(h.revision)||h.revision<1||habitInputError(h,true)))error(422,'INVALID_BACKUP','养成事项格式不正确');
 if(new Set(s.habits.map(h=>h.id)).size!==s.habits.length||new Set(s.habitEntries.map(e=>e.habitId+'|'+e.date)).size!==s.habitEntries.length)error(422,'INVALID_BACKUP','养成记录有重复日期或事项');
 if(s.habitEntries.some(e=>typeof e.id!=='string'||!s.habits.some(h=>h.id===e.habitId)||!Number.isInteger(e.revision)||e.revision<1||habitEntryError(e.date,{...e,expectedRevision:e.revision})||(e.photos||[]).some((id:string)=>!s.assets.some(a=>a.id===id&&a.purpose==='PHOTO'))))error(422,'INVALID_BACKUP','养成记录或照片关系不完整');
 const issue=ingredientPreferenceError(s.preferences)||workoutPreferenceError(s.preferences);if(issue)error(422,'INVALID_BACKUP',issue);s.preferences=normalizePreferences(s.preferences);s.idempotency={};s.loggedIn=true;persist(s);
}
