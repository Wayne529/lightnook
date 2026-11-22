import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Req, Res, Headers, UseInterceptors, UploadedFile, OnModuleDestroy } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomBytes, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { AppService, fail, json, validDate } from './service';
import { AuthService, Public, sessionCookie } from './auth';
import { PreferenceDto, PlanDto, RevisionDto, ReplaceDto, RecordDto, PoolDto, GroceryDto, GroceryPatchDto, SignDto, DevLoginDto, CustomMealDto } from './dto';
import { mediaDir } from './env';
import { today } from './domain';
type Authed = Request & { userId: string };
@ApiTags('LightNook')
@Controller()
export class AppController {
  constructor(private app: AppService, private auth:AuthService){}
  @Public() @Get('health') health(){return {ok:true,name:'LightNook',mode:process.env.NODE_ENV};}
  @Public() @Get('auth/csrf') csrf(@Res({passthrough:true})res:Response){const token=randomBytes(24).toString('hex');res.cookie('ln_csrf',token,{sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/'});return {token,devAuth:process.env.DEV_AUTH==='true'};}
  @Public() @Post('auth/dev-session') @ApiOperation({summary:'仅本机开发体验账号；生产环境禁止'}) dev(@Req()req:Authed,@Res({passthrough:true})res:Response,@Body()b:DevLoginDto){return this.auth.dev(req,res,b.name);}
  @Public() @Post('auth/otp') otp(@Body()b:{phone:string}){return this.auth.otp(b.phone||'');}
  @Public() @Post('auth/sessions') login(@Body()b:{phone:string;code:string;challengeId:string},@Res({passthrough:true})res:Response){return this.auth.login(b.phone||'',b.code||'',b.challengeId||'',res);}
  @Delete('auth/session') async logout(@Req()req:Authed,@Res({passthrough:true})res:Response){await this.app.db.session.deleteMany({where:{userId:req.userId,tokenHash:(await import('./service')).hash(req.cookies[sessionCookie]||'')}});res.clearCookie(sessionCookie,{path:'/'});return {ok:true};}
  @Get('me') me(@Req()r:Authed){return this.app.me(r.userId);}
  @Put('me/preferences') preferences(@Req()r:Authed,@Body()b:PreferenceDto){return this.app.savePreferences(r.userId,b);}
  @Public() @Get('meals') meals(@Req()r:Authed,@Query('q')q?:string,@Query('slot')slot?:string,@Query('scene')scene?:string,@Query('favorites')fav?:string,@Query('recommended')rec?:string){return this.app.meals(r.userId,q,slot,scene,fav==='true',rec==='true');}
  @Public() @Get('meals/:id') meal(@Req()r:Authed,@Param('id')id:string){return this.app.meal(id,r.userId);}
  @Post('meals') custom(@Req()r:Authed,@Body()b:CustomMealDto){return this.app.custom(r.userId,b);}
  @Put('me/favorites/:id') favorite(@Req()r:Authed,@Param('id')id:string){return this.app.favorite(r.userId,id,true);}
  @Delete('me/favorites/:id') unfavorite(@Req()r:Authed,@Param('id')id:string){return this.app.favorite(r.userId,id,false);}
  @Post('plan-drafts') draft(@Req()r:Authed,@Body()b:PlanDto,@Headers('idempotency-key')key?:string){return this.app.draft(r.userId,b,key);}
  @Get('plans/:id') plan(@Req()r:Authed,@Param('id')id:string){return this.app.getPlan(r.userId,id);}
  @Get('plan-items/:id') async item(@Req()r:Authed,@Param('id')id:string){const i=await this.app.db.planItem.findFirst({where:{id,plan:{userId:r.userId}},include:{records:{where:{revokedAt:null}},plan:true}});if(!i)fail(404,'NOT_FOUND','安排不存在');return i;}
  @Post('plans/:id/activate') activate(@Req()r:Authed,@Param('id')id:string,@Body()b:RevisionDto,@Headers('idempotency-key')key?:string){return this.app.activate(r.userId,id,b.expectedRevision,key);}
  @Post('plans/:id/end') async end(@Req()r:Authed,@Param('id')id:string,@Body()b:RevisionDto){const n=await this.app.db.plan.updateMany({where:{id,userId:r.userId,revision:b.expectedRevision,status:'ACTIVE'},data:{status:'ENDED',revision:{increment:1}}});if(!n.count)fail(409,'REVISION_CONFLICT','计划已变动');return {ok:true};}
  @Post('plan-items/:id/replace') replace(@Req()r:Authed,@Param('id')id:string,@Body()b:ReplaceDto,@Headers('idempotency-key')key?:string){return this.app.replace(r.userId,id,b,key);}
  @Patch('plan-items/:id') async adjust(@Req()r:Authed,@Param('id')id:string,@Body()b:{expectedRevision:number;disposition:string}){
    if(!['SCHEDULED','EXCUSED'].includes(b.disposition)||!Number.isInteger(b.expectedRevision))fail(422,'INVALID_INPUT','请选择正确的安排');
    return this.app.db.$transaction(async tx=>{const i=await tx.planItem.findFirst({where:{id,plan:{userId:r.userId}},include:{records:{where:{revokedAt:null}}}});if(!i)fail(404,'NOT_FOUND','任务不存在');if(i.slot!=='workout'||i.date<today()||i.records.length)fail(409,'ITEM_LOCKED','只有当天或未来未完成的运动可以调整');
      const n=await tx.planItem.updateMany({where:{id,revision:b.expectedRevision},data:{disposition:b.disposition,revision:{increment:1}}});if(!n.count)fail(409,'REVISION_CONFLICT','安排已变动');await tx.plan.update({where:{id:i.planId},data:{revision:{increment:1}}});await tx.changeLog.create({data:{userId:r.userId,resourceId:id,action:'ADJUST',before:json(i),after:json(b)}});return tx.planItem.findUnique({where:{id}});});
  }
  @Get('today') day(@Req()r:Authed,@Query('date')date?:string){return this.app.day(r.userId,date);}
  @Get('calendar') calendar(@Req()r:Authed,@Query('from')from:string,@Query('to')to:string){return this.app.calendar(r.userId,from,to);}
  @Put('plan-items/:id/record') record(@Req()r:Authed,@Param('id')id:string,@Body()b:RecordDto,@Headers('idempotency-key')key?:string){return this.app.saveRecord(r.userId,id,b,key);}
  @Post('records/:id/revoke') revoke(@Req()r:Authed,@Param('id')id:string,@Body()b:RevisionDto,@Headers('idempotency-key')key?:string){return this.app.revoke(r.userId,id,b.expectedRevision,key);}
  @Post('draw-pools') pool(@Req()r:Authed,@Body()b:PoolDto){return this.app.pool(r.userId,b.slot,b.scene);}
  @Post('draw-pools/:id/draws') draw(@Req()r:Authed,@Param('id')id:string,@Headers('idempotency-key')key?:string){return this.app.draw(r.userId,id,key);}
  @Post('grocery-lists') grocery(@Req()r:Authed,@Body()b:GroceryDto,@Headers('idempotency-key')key?:string){return this.app.grocery(r.userId,b.planId,key);}
  @Get('grocery-lists/:id') getGrocery(@Req()r:Authed,@Param('id')id:string){return this.app.getGrocery(r.userId,id);}
  @Patch('grocery-lists/:id') patchGrocery(@Req()r:Authed,@Param('id')id:string,@Body()b:GroceryPatchDto){return this.app.patchGrocery(r.userId,id,b);}
  @Post('grocery-lists/:id/refresh') refresh(@Req()r:Authed,@Param('id')id:string,@Body()b:RevisionDto){return this.app.refreshGrocery(r.userId,id,b.expectedRevision);}
  @Post('sign-reports') report(@Req()r:Authed,@Body()b:SignDto,@Headers('idempotency-key')key?:string){return this.app.report(r.userId,b,key);}
  @Get('sign-reports/:id') getReport(@Req()r:Authed,@Param('id')id:string){return this.app.getReport(r.userId,id);}
  @Post('sign-reports/:id/retry') async retry(@Req()r:Authed,@Param('id')id:string){return this.app.db.$transaction(async tx=>{const n=await tx.report.updateMany({where:{id,userId:r.userId,status:'FAILED'},data:{status:'PENDING',error:null}});if(!n.count)fail(409,'NOT_FAILED','签卡不在失败状态');await tx.outbox.create({data:{reportId:id}});return {id,status:'PENDING'};});}
  @Get('me/signs') reports(@Req()r:Authed){return this.app.reports(r.userId);}
  @Get('media/:id/access') async access(@Req()r:Authed,@Param('id')id:string){const asset=await this.app.db.asset.findFirst({where:{id,userId:r.userId}});if(!asset)fail(404,'NOT_FOUND','图片不存在');return {url:this.app.signedAsset(asset)};}
  @Public() @Get('media/:id/file') async file(@Param('id')id:string,@Query('expires')expires:string,@Query('signature')signature:string,@Res()res:Response){
    const asset=await this.app.db.asset.findUnique({where:{id}});if(!asset||!expires||!signature||Number(expires)<Date.now()||Number(expires)>Date.now()+6*60000)fail(403,'URL_EXPIRED','图片链接已过期，请重新打开');
    const expected=createHmac('sha256',process.env.MEDIA_SIGNING_SECRET!).update(`${id}|${asset.userId}|${expires}`).digest('hex');
    if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))fail(403,'INVALID_SIGNATURE','图片链接不可用');
    const bytes=await readFile(resolve(mediaDir,asset.key)).catch(()=>fail(404,'NOT_FOUND','图片不存在'));res.setHeader('Content-Type',asset.mime);res.setHeader('Cache-Control','private, max-age=60');res.setHeader('Content-Disposition',`inline; filename="lightnook-${asset.id}.${asset.mime==='image/png'?'png':'jpg'}"`);res.send(bytes);
  }
  @Post('media') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:8*1024*1024}})) async upload(@Req()r:Authed,@UploadedFile()file?:{buffer:Buffer}){
    if(!file)fail(422,'MISSING_FILE','请选择图片');let bytes:Buffer;
    try{bytes=await sharp(file.buffer,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();}catch{fail(422,'INVALID_IMAGE','无法读取图片，请选择 JPG、PNG 或 WebP 图片');}
    await mkdir(mediaDir,{recursive:true});const key=`${randomUUID()}.jpg`;await writeFile(resolve(mediaDir,key),bytes);const asset=await this.app.db.asset.create({data:{userId:r.userId,key,purpose:'PHOTO',mime:'image/jpeg'}});return {id:asset.id,url:this.app.signedAsset(asset)};
  }
  @Get('me/data-export') async exportData(@Req()r:Authed){const db=this.app.db;return {user:await db.user.findUnique({where:{id:r.userId},select:{name:true,preferences:true,createdAt:true}}),plans:await db.plan.findMany({where:{userId:r.userId},include:{items:true}}),records:await db.record.findMany({where:{userId:r.userId}})};}
  @Delete('me') async deleteMe(@Req()r:Authed,@Res({passthrough:true})res:Response){const id=r.userId,assets=await this.app.db.asset.findMany({where:{userId:id}});await this.app.db.$transaction(async tx=>{
    await tx.record.deleteMany({where:{userId:id}});await tx.plan.deleteMany({where:{userId:id}});await tx.drawPool.deleteMany({where:{userId:id}});
    const reports=await tx.report.findMany({where:{userId:id},select:{id:true}});await tx.outbox.deleteMany({where:{reportId:{in:reports.map(r=>r.id)}}});await tx.report.deleteMany({where:{userId:id}});
    await tx.groceryList.deleteMany({where:{userId:id}});await tx.asset.deleteMany({where:{userId:id}});await tx.favorite.deleteMany({where:{userId:id}});await tx.changeLog.deleteMany({where:{userId:id}});await tx.preferenceVersion.deleteMany({where:{userId:id}});await tx.idempotency.deleteMany({where:{userId:id}});await tx.meal.deleteMany({where:{ownerId:id}});await tx.user.delete({where:{id}});
  });for(const a of assets)await unlink(resolve(mediaDir,a.key)).catch(()=>{});res.clearCookie(sessionCookie,{path:'/'});return {ok:true};}
}
