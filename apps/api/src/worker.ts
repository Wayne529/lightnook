import './env';
import 'reflect-metadata';
import { Module, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BullModule, Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Db } from './db';
import { renderSign } from './render';
import { mediaDir, requireConfig } from './env';
const redis=new URL(process.env.REDIS_URL||'redis://127.0.0.1:56386');
const connection={host:redis.hostname,port:Number(redis.port||6379),password:redis.password||undefined,db:Number(redis.pathname.slice(1)||0),...(redis.protocol==='rediss:'?{tls:{}}:{})};
@Processor('signs',{concurrency:1})
class SignProcessor extends WorkerHost {
  constructor(private db:Db){super();}
  async process(job:Job){
    const report=await this.db.report.findUnique({where:{id:job.data.reportId}});if(!report||report.status==='READY')return;
    await this.db.report.update({where:{id:report.id},data:{status:'RENDERING',attempts:{increment:1},error:null}});
    try{
      const snapshot=report.snapshot as any;let photo:Buffer|undefined;
      if(snapshot.photoAssetId){const a=await this.db.asset.findFirst({where:{id:snapshot.photoAssetId,userId:report.userId,purpose:'PHOTO'}});if(a)photo=await readFile(resolve(mediaDir,a.key));}
      const bytes=await renderSign(snapshot,photo);await mkdir(mediaDir,{recursive:true});const key=`sign-${report.id}.png`;await writeFile(resolve(mediaDir,key),bytes);
      await this.db.$transaction(async tx=>{const existing=await tx.report.findUnique({where:{id:report.id}});if(!existing)return;const asset=await tx.asset.upsert({where:{key},update:{},create:{userId:report.userId,key,purpose:'SIGN',mime:'image/png'}});await tx.report.update({where:{id:report.id},data:{status:'READY',assetId:asset.id,error:null}});});
    }catch(e){await this.db.report.updateMany({where:{id:report.id},data:{status:'FAILED',error:'图片生成暂时失败，请重试'}});throw e;}
  }
}
@Injectable()
class Dispatcher implements OnModuleInit,OnModuleDestroy {
  private timer?:NodeJS.Timeout;private busy=false;private ticks=0;
  constructor(private db:Db,@InjectQueue('signs') private queue:Queue){}
  onModuleInit(){this.timer=setInterval(()=>this.tick(),1000);void this.tick();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  async tick(){if(this.busy)return;this.busy=true;
    try{
      const rows=await this.db.$transaction(async tx=>{
        const rows=await tx.$queryRaw<Array<{id:string;reportId:string}>>`SELECT id, "reportId" FROM "Outbox" WHERE "publishedAt" IS NULL AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW()) ORDER BY "createdAt" LIMIT 10 FOR UPDATE SKIP LOCKED`;
        for(const r of rows)await tx.outbox.update({where:{id:r.id},data:{leaseUntil:new Date(Date.now()+15000),attempts:{increment:1}}});return rows;
      });
      for(const r of rows){await this.queue.add('render',{reportId:r.reportId},{jobId:r.id,attempts:3,backoff:{type:'exponential',delay:2000},removeOnComplete:{age:86400},removeOnFail:{age:604800}});await this.db.outbox.update({where:{id:r.id},data:{publishedAt:new Date(),leaseUntil:null}});}
      if(++this.ticks%30===0){
        const stuck=await this.db.report.findMany({where:{status:{in:['PENDING','RENDERING']},createdAt:{lt:new Date(Date.now()-120000)}}});
        for(const report of stuck){const event=await this.db.outbox.findFirst({where:{reportId:report.id},orderBy:{createdAt:'desc'}});const job=event?await this.queue.getJob(event.id):null;if(!job)await this.db.outbox.create({data:{reportId:report.id}});}
      }
    }catch(e){if(this.ticks%30===0)console.warn('Sign dispatcher is waiting for its dependencies.');}finally{this.busy=false;}
  }
}
@Module({imports:[BullModule.forRoot({connection}),BullModule.registerQueue({name:'signs'})],providers:[Db,SignProcessor,Dispatcher]})class WorkerModule{}
requireConfig();NestFactory.createApplicationContext(WorkerModule,{logger:['error','warn','log']}).then(app=>{app.enableShutdownHooks();console.log('LightNook sign worker is ready.');}).catch(e=>{console.error(e.message);process.exitCode=1;});
