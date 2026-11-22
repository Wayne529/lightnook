import {getWorkout,workoutPreferenceError,workoutSnapshot} from './workouts';
import {signDetails} from './sign-design';
import { Injectable, HttpException } from '@nestjs/common';
import { Db } from './db';
import { randomInt, createHash, randomUUID, createHmac } from 'node:crypto';
import { normalizePreferences, planPreferences, ingredientPreferenceError, rankMeals, cookingPool, mealReason, eligible, today, addDays, weekday, weekStart, stats, groceries, reconcileGroceries, isDate, Preferences } from './domain';
import { RecordDto, PreferenceDto, PlanDto, ReplaceDto, SignDto } from './dto';
export function fail(status: number, code: string, message: string): never { throw new HttpException({ code, message }, status); }
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const json = (value: unknown): any => JSON.parse(JSON.stringify(value));
export function validDate(date: string) { if (!isDate(date)) fail(422,'INVALID_DATE','请选择有效日期'); return date; }

@Injectable()
export class AppService {
  constructor(readonly db: Db) {}
  async user(id: string) { const u = await this.db.user.findUnique({where:{id}}); if (!u) fail(401,'UNAUTHORIZED','请先登录'); return u; }
  preferences(u: any): Preferences { return normalizePreferences(u.preferences||{}); }
  async meal(id: string, userId?: string, db: any = this.db) {
    const m = await db.mealVersion.findUnique({where:{id},include:{meal:true}});
    if (!m || (m.meal.ownerId && m.meal.ownerId !== userId) || !m.meal.published) fail(404,'NOT_FOUND','餐单不存在');
    return m;
  }
  async me(id: string) {
    const u = await this.user(id); const plan = await this.db.plan.findFirst({where:{userId:id,status:'ACTIVE'}});
    return { id:u.id,name:u.name,preferences:this.preferences(u),preferencesRevision:u.preferencesRevision,activePlan:plan,demo:process.env.DEV_AUTH==='true' };
  }
  async savePreferences(id: string, dto: PreferenceDto) {
    const {expectedRevision,...rawInput}=dto;
    const input=Object.fromEntries(Object.entries(rawInput).filter(([,value])=>value!==undefined));
    const merged={...this.preferences(await this.user(id)),...input};
    const issue=ingredientPreferenceError(merged)||workoutPreferenceError(merged);if(issue)fail(422,'INVALID_INGREDIENTS',issue);
    const value=normalizePreferences(merged);
    const allowed=['peanut','milk','egg','soy','fish','shellfish','gluten','nuts'];
    if (value.allergens.some(a=>!allowed.includes(a))) fail(422,'INVALID_ALLERGEN','请选择支持的过敏原');
    return this.db.$transaction(async tx=>{
      const updated=await tx.user.updateMany({where:{id,preferencesRevision:expectedRevision},data:{preferences:json(value),preferencesRevision:{increment:1}}});
      if(!updated.count)fail(409,'REVISION_CONFLICT','偏好已变化，请刷新后确认');
      await tx.preferenceVersion.create({data:{userId:id,revision:expectedRevision+1,value:json(value)}});
      return {preferences:value,revision:expectedRevision+1};
    });
  }
  async meals(id?:string,q?:string,slot?:string,scene?:string,favorites=false,recommended=false) {
    const u=id?await this.user(id):null;
    const saved=id&&favorites?await this.db.favorite.findMany({where:{userId:id}}):null;
    const all=await this.db.mealVersion.findMany({where:{meal:{published:true,OR:[{ownerId:null},...(id?[{ownerId:id}]:[])]},...(q?{title:{contains:q,mode:'insensitive'}}:{}),...(slot?{slots:{has:slot}}:{})},include:{meal:true},orderBy:{title:'asc'}});
    const selected=all.filter(m=>(!saved||saved.some(f=>f.mealId===m.mealId))&&(!scene||scene==='mixed'||(scene==='home'?m.kind==='HOME':m.kind==='OUTSIDE'))&&(!recommended||eligible(m,this.preferences(u||{}),slot,scene))).map(m=>({...m,favorite:!!saved?.some(f=>f.mealId===m.mealId),reason:mealReason(m,this.preferences(u||{}))}));
    return recommended?rankMeals(selected,this.preferences(u||{})):selected;
  }
  async favorite(id:string,mealId:string,on:boolean) {
    const m=await this.db.meal.findFirst({where:{id:mealId,published:true,OR:[{ownerId:null},{ownerId:id}]}});if(!m)fail(404,'NOT_FOUND','餐单不存在');
    if(on)await this.db.favorite.upsert({where:{userId_mealId:{userId:id,mealId}},update:{},create:{userId:id,mealId}});
    else await this.db.favorite.deleteMany({where:{userId:id,mealId}});return {favorite:on};
  }
  async custom(id:string,b:any) {
    const m=await this.db.meal.create({data:{slug:`private-${randomUUID()}`,ownerId:id,versions:{create:{...b,art:'tofu',description:'我的私人餐单，配料信息待核对。',ingredients:[],steps:[],sources:[],allergens:[],allergenKnown:false,nutrition:{estimated:true,calories:null,protein:null}}}},include:{versions:true}});return m.versions[0];
  }
  async withKey(id:string,key:string|undefined,scope:string,body:unknown,action:(tx:any)=>Promise<any>) {
    if(!key||key.length>128)fail(400,'IDEMPOTENCY_REQUIRED','请重新发起本次操作');
    const identifier=hash(`${id}|${scope}|${key}`), digest=hash(JSON.stringify(body));
    for(let attempt=0;attempt<4;attempt++)try{
      return await this.db.$transaction(async tx=>{
        const cached=await tx.idempotency.findUnique({where:{id:identifier}});
        if(cached){if(cached.hash!==digest)fail(409,'IDEMPOTENCY_CONFLICT','请求标识已用于其他内容');return cached.response;}
        const result=await action(tx);await tx.idempotency.create({data:{id:identifier,userId:id,hash:digest,response:json(result)}});return result;
      },{isolationLevel:'Serializable',timeout:15000});
    }catch(e:any){if(attempt<3&&['P2034','P2002'].includes(e.code))continue;throw e;}
  }
  async draft(id:string,b:PlanDto,key?:string){
    validDate(b.startDate);if(b.startDate<today())fail(422,'PAST_DATE','新计划请从今天或未来开始');
    const u=await this.user(id),all=await this.meals(id);
    let pref:Preferences;try{pref=planPreferences(this.preferences(u),b.ingredientSource,b.ingredients);}catch(e){fail(422,'INVALID_INGREDIENTS',(e as Error).message);}
    const pools=['breakfast','lunch','dinner'].map(slot=>cookingPool(all.filter(m=>m.slots.includes(slot)&&eligible(m,pref,slot)),pref));
    if(pools.some(p=>!p.length))fail(422,'NO_ELIGIBLE_MEALS','部分餐次没有合适的餐食，请调整常买食材、食材使用方式、时间或预算；过敏限制会继续保留');
    return this.withKey(id,key,'draft',b,async tx=>{
      const current=await tx.user.findUnique({where:{id}});if(current.preferencesRevision!==u.preferencesRevision)fail(409,'PREFERENCES_CHANGED','偏好已变化，请重新生成');
      const plan=await tx.plan.create({data:{userId:id,startDate:b.startDate,endDate:addDays(b.startDate,b.durationDays-1),preferencesRevision:u.preferencesRevision}});
      let workoutIndex=0;for(let d=0;d<b.durationDays;d++){
        const date=addDays(b.startDate,d);
        for(let s=0;s<3;s++){const options=pools[s],m=options[(d+s)%options.length];await tx.planItem.create({data:{planId:plan.id,date,slot:['breakfast','lunch','dinner'][s],mealVersionId:m.id,snapshot:json(m)}});}
        if(pref.workoutDays.includes(weekday(date)))await tx.planItem.create({data:{planId:plan.id,date,slot:'workout',snapshot:workoutSnapshot(pref.workoutTypes,workoutIndex++)}});
      }
      return plan;
    });
  }
  async getPlan(id:string,planId:string){const p=await this.db.plan.findFirst({where:{id:planId,userId:id},include:{items:{orderBy:[{date:'asc'},{slot:'asc'}],include:{records:{where:{revokedAt:null}}}}}});if(!p)fail(404,'NOT_FOUND','计划不存在');return p;}
  async activate(id:string,planId:string,revision:number,key?:string){return this.withKey(id,key,`activate:${planId}`,{revision},async tx=>{
    const p=await tx.plan.findFirst({where:{id:planId,userId:id}});if(!p)fail(404,'NOT_FOUND','计划不存在');
    if(p.revision!==revision||p.status!=='DRAFT')fail(409,'REVISION_CONFLICT','计划状态已变更');
    const u=await tx.user.findUnique({where:{id}});if(u.preferencesRevision!==p.preferencesRevision)fail(409,'PREFERENCES_CHANGED','偏好已变化，请重新生成草案');
    if(await tx.plan.count({where:{userId:id,status:'ACTIVE'}}))fail(409,'ACTIVE_PLAN_EXISTS','你已有进行中的计划，请先结束后再启用');
    return tx.plan.update({where:{id:planId},data:{status:'ACTIVE',revision:{increment:1}}});
  });}
  async day(id:string,date=today()){
    validDate(date);const plan=await this.db.plan.findFirst({where:{userId:id,status:'ACTIVE'}});
    const items=plan?await this.db.planItem.findMany({where:{planId:plan.id,date},include:{records:{where:{revokedAt:null}}},orderBy:{slot:'asc'}}):[];
    const records=await this.db.record.findMany({where:{userId:id,date,revokedAt:null}});
    return {date,plan,items,records,stats:stats(items,records)};
  }
  async calendar(id:string,from:string,to:string){
    validDate(from);validDate(to);if(to<from||to>addDays(from,62))fail(422,'INVALID_RANGE','日期范围最多 63 天');
    const items=await this.db.planItem.findMany({where:{plan:{userId:id,status:{in:['ACTIVE','ENDED']}},date:{gte:from,lte:to}}});
    const records=await this.db.record.findMany({where:{userId:id,date:{gte:from,lte:to},revokedAt:null}});
    const days=[];for(let d=from;d<=to;d=addDays(d,1))days.push({date:d,...stats(items.filter(i=>i.date===d),records.filter(r=>r.date===d)),future:d>today()});return days;
  }
  async replace(id:string,itemId:string,b:ReplaceDto,key?:string){
    const u=await this.user(id),m=await this.meal(b.mealVersionId,id);
    if(!eligible(m,this.preferences(u)))fail(422,'PREFERENCES_CHANGED','这份餐单不符合当前偏好，请重新选择');
    return this.withKey(id,key,`replace:${itemId}`,b,async tx=>{
      const current=await tx.user.findUnique({where:{id}}),currentMeal=await this.meal(b.mealVersionId,id,tx);
      if(!eligible(currentMeal,this.preferences(current)))fail(422,'PREFERENCES_CHANGED','这份餐单不符合当前偏好，请重新选择');
      const item=await tx.planItem.findFirst({where:{id:itemId,plan:{userId:id,status:'ACTIVE'}},include:{records:{where:{revokedAt:null}}}});
      if(!item)fail(404,'NOT_FOUND','任务不存在');if(item.slot==='workout'||!m.slots.includes(item.slot))fail(422,'SLOT_MISMATCH','这份餐单不适合该餐次');
      if(item.date<today()||item.records.length)fail(409,'RECORDED_ITEM','已完成或过去的任务，请更正实际记录');
      if(item.revision!==b.expectedRevision)fail(409,'REVISION_CONFLICT','计划已变动，请刷新后确认');
      if(b.drawId){const draw=await tx.draw.findFirst({where:{id:b.drawId,userId:id,mealVersionId:m.id},include:{pool:true}});if(!draw||draw.pool.expiresAt<new Date()||draw.pool.preferencesRevision!==current.preferencesRevision)fail(409,'POOL_EXPIRED','候选条件已更新，请重新抽取');}
      const next=await tx.planItem.update({where:{id:itemId},data:{mealVersionId:m.id,snapshot:json(m),revision:{increment:1}}});
      await tx.plan.update({where:{id:item.planId},data:{revision:{increment:1}}});
      await tx.changeLog.create({data:{userId:id,resourceId:itemId,action:'REPLACE',before:json(item.snapshot),after:json(next.snapshot)}});return next;
    });
  }
  async saveRecord(id:string,itemId:string,b:RecordDto,key?:string){
    if(!Number.isFinite(Date.parse(b.occurredAt))||Date.parse(b.occurredAt)>Date.now()+300000)fail(422,'INVALID_TIME','记录时间不正确');
    return this.withKey(id,key,`record:${itemId}`,b,async tx=>{
      const item=await tx.planItem.findFirst({where:{id:itemId,plan:{userId:id,status:{in:['ACTIVE','ENDED']}}},include:{records:{where:{revokedAt:null}}}});
      if(!item)fail(404,'NOT_FOUND','任务不存在');
      const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(b.occurredAt));
      if(item.date>today()||item.date!==localDate)fail(422,'DATE_MISMATCH','请选择与任务日期一致的记录时间');
      if(item.disposition!=='SCHEDULED')fail(409,'ITEM_LOCKED','请先恢复这项安排，再记录');
      if(item.revision!==b.expectedItemRevision)fail(409,'REVISION_CONFLICT','计划已更新，请刷新后记录');
      const old=item.records[0];if(old&&old.revision!==b.expectedRecordRevision)fail(409,'REVISION_CONFLICT','这条记录已经变化，请刷新后确认');
      if(!old&&b.expectedRecordRevision)fail(409,'REVISION_CONFLICT','原记录已撤销，请刷新');
      let actual:any;
      if(item.slot==='workout'){if(!b.minutes)fail(422,'DURATION_REQUIRED','请填写实际运动时长');const w=getWorkout(b.workoutType||(item.snapshot as any).workoutType);actual={minutes:b.minutes,workoutType:w.key,title:w.title,note:b.note||''};}
      else {const meal=b.mealVersionId?await this.meal(b.mealVersionId,id,tx):null;actual={meal:json(meal||item.snapshot),portion:b.portion||1,note:b.note||'',photos:b.photos||[]};}
      if(b.photos?.length){const count=await tx.asset.count({where:{id:{in:b.photos},userId:id,purpose:'PHOTO'}});if(count!==new Set(b.photos).size)fail(403,'INVALID_PHOTO','照片不可用');}
      const record=old?await tx.record.update({where:{id:old.id},data:{actual:json(actual),occurredAt:new Date(b.occurredAt),revision:{increment:1}}}):await tx.record.create({data:{userId:id,itemId,date:item.date,type:item.slot==='workout'?'WORKOUT':'MEAL',occurredAt:new Date(b.occurredAt),actual:json(actual)}});
      await tx.changeLog.create({data:{userId:id,resourceId:record.id,action:old?'CORRECT':'CHECKIN',before:json(old||{}),after:json(record)}});
      await tx.report.updateMany({where:{userId:id,startDate:{lte:item.date},endDate:{gte:item.date}},data:{stale:true}});
      return record;
    });
  }
  async revoke(id:string,recordId:string,revision:number,key?:string){return this.withKey(id,key,`revoke:${recordId}`,{revision},async tx=>{
    const record=await tx.record.findFirst({where:{id:recordId,userId:id}});if(!record)fail(404,'NOT_FOUND','记录不存在');
    if(record.revision!==revision)fail(409,'REVISION_CONFLICT','记录已变化，请刷新');
    if(record.revokedAt)return record;
    const result=await tx.record.update({where:{id:recordId},data:{revokedAt:new Date(),revision:{increment:1}}});
    await tx.changeLog.create({data:{userId:id,resourceId:recordId,action:'REVOKE',before:json(record),after:json(result)}});
    await tx.report.updateMany({where:{userId:id,startDate:{lte:record.date},endDate:{gte:record.date}},data:{stale:true}});return result;
  });}
  async pool(id:string,slot:string,scene?:string){const u=await this.user(id),all=await this.meals(id,undefined,slot,scene,false,true);
    if(!all.length)fail(422,'NO_ELIGIBLE_MEALS','没有符合条件的餐单。可以调整常买食材、食材使用方式、时间或预算，过敏条件仍会保留。');
    const candidates=cookingPool(all,this.preferences(u)).slice(0,6);return this.db.drawPool.create({data:{userId:id,preferencesRevision:u.preferencesRevision,candidates:json(candidates),expiresAt:new Date(Date.now()+15*60000)}});
  }
  async draw(id:string,poolId:string,key?:string){return this.withKey(id,key,`draw:${poolId}`,{},async tx=>{
    const pool=await tx.drawPool.findFirst({where:{id:poolId,userId:id}}),u=await tx.user.findUnique({where:{id}});
    if(!pool)fail(404,'NOT_FOUND','候选池不存在');if(pool.expiresAt<new Date()||pool.preferencesRevision!==u.preferencesRevision)fail(409,'POOL_EXPIRED','偏好或候选已更新，请重新抽取');
    const c=pool.candidates as any[];if(!c.length)fail(422,'NO_ELIGIBLE_MEALS','当前没有可抽取的餐单');
    const index=randomInt(c.length);return tx.draw.create({data:{poolId,userId:id,resultIndex:index,mealVersionId:c[index].id}});
  });}
  async grocery(id:string,planId:string,key?:string){const p=await this.getPlan(id,planId);return this.withKey(id,key,'grocery',{planId,revision:p.revision},async tx=>{
    const future=p.items.filter(i=>i.date>=today()&&i.date<=addDays(today(),2));
    return tx.groceryList.create({data:{userId:id,planId,sourceRevision:p.revision,items:json(groceries(future))}});
  });}
  async getGrocery(id:string,listId:string){const g=await this.db.groceryList.findFirst({where:{id:listId,userId:id}});if(!g)fail(404,'NOT_FOUND','清单不存在');const p=await this.getPlan(id,g.planId);return {...g,stale:g.sourceRevision!==p.revision};}
  async patchGrocery(id:string,listId:string,b:any){return this.db.$transaction(async tx=>{
    const g=await tx.groceryList.findFirst({where:{id:listId,userId:id}});if(!g)fail(404,'NOT_FOUND','清单不存在');
    const items=(g.items as any[]).map(i=>i.key===b.key?{...i,checked:b.checked,needsReview:false}:i);
    const r=await tx.groceryList.updateMany({where:{id:listId,userId:id,revision:b.expectedRevision},data:{items:json(items),revision:{increment:1}}});if(!r.count)fail(409,'REVISION_CONFLICT','清单已经更新，请刷新');return tx.groceryList.findUnique({where:{id:listId}});
  });}
  async refreshGrocery(id:string,listId:string,revision:number){const g=await this.getGrocery(id,listId),p=await this.getPlan(id,g.planId),items=reconcileGroceries(g.items as any[],groceries(p.items.filter(i=>i.date>=today()&&i.date<=addDays(today(),2))));
    const updated=await this.db.groceryList.updateMany({where:{id:listId,userId:id,revision},data:{items:json(items),sourceRevision:p.revision,revision:{increment:1}}});if(!updated.count)fail(409,'REVISION_CONFLICT','清单已更新');return this.getGrocery(id,listId);
  }
  async report(id:string,b:SignDto,key?:string){
    validDate(b.date);if(b.date>today())fail(422,'FUTURE_REPORT','未来的日子还没有记录');
    const start=b.kind==='week'?weekStart(b.date):b.date,end=b.kind==='week'?addDays(start,6):b.date;
    return this.withKey(id,key,'report',b,async tx=>{
      const items=await tx.planItem.findMany({where:{plan:{userId:id,status:{in:['ACTIVE','ENDED']}},date:{gte:start,lte:end<today()?end:today()}}});
      const records=await tx.record.findMany({where:{userId:id,date:{gte:start,lte:end},revokedAt:null}});
      let photoAssetId:string|undefined;if(b.template==='photo'&&b.photoAssetId){const asset=await tx.asset.findFirst({where:{id:b.photoAssetId,userId:id,purpose:'PHOTO'}});if(!asset)fail(403,'INVALID_PHOTO','照片不可用');photoAssetId=asset.id;}
      const snapshot={...stats(items,records),...signDetails(items,records,start,end),start,end,kind:b.kind,template:b.template||'botanical',photoAssetId,partial:end>today(),templateVersion:'2'};
      const digest=hash(JSON.stringify({snapshot,items:items.map((i:any)=>[i.id,i.revision,i.disposition]).sort(),records:records.map((r:any)=>[r.id,r.revision]).sort()}));
      const existing=await tx.report.findUnique({where:{userId_hash:{userId:id,hash:digest}}});if(existing)return existing;
      const r=await tx.report.create({data:{userId:id,kind:b.kind,startDate:start,endDate:end,snapshot:json(snapshot),hash:digest}});
      await tx.outbox.create({data:{reportId:r.id}});return r;
    });
  }
  signedAsset(asset:any){const expires=Date.now()+5*60000;const signature=createHmac('sha256',process.env.MEDIA_SIGNING_SECRET!).update(`${asset.id}|${asset.userId}|${expires}`).digest('hex');return `/api/v1/media/${asset.id}/file?expires=${expires}&signature=${signature}`;}
  async getReport(id:string,reportId:string){const r=await this.db.report.findFirst({where:{id:reportId,userId:id}});if(!r)fail(404,'NOT_FOUND','签卡不存在');const asset=r.assetId?await this.db.asset.findFirst({where:{id:r.assetId,userId:id}}):null;return {...r,url:asset?this.signedAsset(asset):null};}
  async reports(id:string){const all=await this.db.report.findMany({where:{userId:id},orderBy:{createdAt:'desc'},take:30});return Promise.all(all.map(r=>this.getReport(id,r.id)));}
}
