import {Injectable,Controller,Get,Post,Patch,Put,Delete,Param,Body,Req,Headers} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {AppService,fail,json} from './service';
import {HabitCreateDto,HabitPatchDto,HabitEntryDto,RevisionDto} from './dto';
import {habitInputError,habitEntryError,habitView} from './habits-domain';
@Injectable()
export class HabitService {
 constructor(private app:AppService){}
 async list(userId:string){const habits=await this.app.db.habit.findMany({where:{userId},include:{entries:true},orderBy:{createdAt:'asc'}});return habits.map(({entries,...h})=>habitView(h,entries));}
 async detail(userId:string,id:string){const h=await this.app.db.habit.findFirst({where:{id,userId},include:{entries:true}});if(!h)fail(404,'NOT_FOUND','事项不存在');const {entries,...habit}=h;return habitView(habit,entries,true);}
 create(userId:string,b:HabitCreateDto,key?:string){const issue=habitInputError(b,true);if(issue)fail(422,'INVALID_HABIT',issue);return this.app.withKey(userId,key,'habit-create',b,async tx=>{if(await tx.habit.count({where:{userId}})>=100)fail(422,'HABIT_LIMIT','最多保留 100 个事项');return tx.habit.create({data:{userId,title:b.title.trim(),icon:b.icon||'plant',color:b.color||'blue'}});});}
 patch(userId:string,id:string,b:HabitPatchDto,key?:string){const input=Object.fromEntries(Object.entries(b).filter(([k,v])=>k!=='expectedRevision'&&v!==undefined));const issue=habitInputError(input);if(issue)fail(422,'INVALID_HABIT',issue);if(input.title)input.title=String(input.title).trim();return this.app.withKey(userId,key,'habit-patch:'+id,b,async tx=>{const current=await tx.habit.findFirst({where:{id,userId}});if(!current)fail(404,'NOT_FOUND','事项不存在');const changed=await tx.habit.updateMany({where:{id,userId,revision:b.expectedRevision},data:{...input,revision:{increment:1}}});if(!changed.count)fail(409,'REVISION_CONFLICT','事项已更新，请刷新');return tx.habit.findUnique({where:{id}});});}
 save(userId:string,id:string,date:string,b:HabitEntryDto,key?:string){const issue=habitEntryError(date,b);if(issue)fail(422,'INVALID_HABIT_ENTRY',issue);return this.app.withKey(userId,key,`habit-entry:${id}:${date}`,b,async tx=>{const habit=await tx.habit.findFirst({where:{id,userId}});if(!habit)fail(404,'NOT_FOUND','事项不存在');if(habit.archived)fail(409,'HABIT_ARCHIVED','恢复事项后再继续记录');const old=await tx.habitEntry.findUnique({where:{habitId_date:{habitId:id,date}}});if((old?.revision||0)!==b.expectedRevision)fail(409,'REVISION_CONFLICT','这天的记录已变化，请刷新');const photos=b.photos||[];if(photos.length&&(await tx.asset.count({where:{id:{in:photos},userId,purpose:'PHOTO'}}))!==photos.length)fail(403,'INVALID_PHOTO','照片不可用');const data={note:(b.note||'').trim(),photos,revokedAt:null};const record=old?await tx.habitEntry.update({where:{id:old.id},data:{...data,revision:{increment:1}}}):await tx.habitEntry.create({data:{habitId:id,date,...data}});await tx.changeLog.create({data:{userId,resourceId:record.id,action:old?'HABIT_CORRECT':'HABIT_CHECKIN',before:json(old||{}),after:json(record)}});return record;});}
 revoke(userId:string,id:string,date:string,revision:number,key?:string){return this.app.withKey(userId,key,`habit-revoke:${id}:${date}`,{revision},async tx=>{const h=await tx.habit.findFirst({where:{id,userId}});if(!h)fail(404,'NOT_FOUND','事项不存在');const old=await tx.habitEntry.findUnique({where:{habitId_date:{habitId:id,date}}});if(!old)fail(404,'NOT_FOUND','这天还没有记录');if(old.revision!==revision)fail(409,'REVISION_CONFLICT','记录已变化，请刷新');if(old.revokedAt)return old;const record=await tx.habitEntry.update({where:{id:old.id},data:{revokedAt:new Date(),revision:{increment:1}}});await tx.changeLog.create({data:{userId,resourceId:record.id,action:'HABIT_REVOKE',before:json(old),after:json(record)}});return record;});}
}
@ApiTags('养成')
@Controller('habits')
export class HabitController {
 constructor(private habits:HabitService){}
 @Get() list(@Req()r:any){return this.habits.list(r.userId);}
 @Post() create(@Req()r:any,@Body()b:HabitCreateDto,@Headers('idempotency-key')key?:string){return this.habits.create(r.userId,b,key);}
 @Get(':id') detail(@Req()r:any,@Param('id')id:string){return this.habits.detail(r.userId,id);}
 @Patch(':id') patch(@Req()r:any,@Param('id')id:string,@Body()b:HabitPatchDto,@Headers('idempotency-key')key?:string){return this.habits.patch(r.userId,id,b,key);}
 @Put(':id/entries/:date') save(@Req()r:any,@Param('id')id:string,@Param('date')date:string,@Body()b:HabitEntryDto,@Headers('idempotency-key')key?:string){return this.habits.save(r.userId,id,date,b,key);}
 @Delete(':id/entries/:date') revoke(@Req()r:any,@Param('id')id:string,@Param('date')date:string,@Body()b:RevisionDto,@Headers('idempotency-key')key?:string){return this.habits.revoke(r.userId,id,date,b.expectedRevision,key);}
}
