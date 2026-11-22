import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Db } from './db';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { hash, fail } from './service';
import type { Request, Response } from 'express';
export const Public=()=>SetMetadata('public',true);
export const sessionCookie=process.env.NODE_ENV==='production'?'__Host-ln_session':'ln_session';
const secure=process.env.NODE_ENV==='production';
export function issueSession(res:Response,token:string){res.cookie(sessionCookie,token,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:14*86400000});}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private db:Db,private reflector:Reflector){}
  async canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest<Request&{userId?:string}>();
    const token=req.cookies?.[sessionCookie];
    if(token){const session=await this.db.session.findUnique({where:{tokenHash:hash(token)}});if(session&&session.expiresAt>new Date())req.userId=session.userId;}
    if(this.reflector.getAllAndOverride<boolean>('public',[context.getHandler(),context.getClass()]))return true;
    if(!req.userId)fail(401,'UNAUTHORIZED','请先登录，再保存属于你的日常');return true;
  }
}
@Injectable()
export class AuthService {
  constructor(private db:Db){}
  async session(userId:string,res:Response){const token=randomBytes(32).toString('hex');await this.db.session.create({data:{userId,tokenHash:hash(token),expiresAt:new Date(Date.now()+14*86400000)}});issueSession(res,token);return {userId};}
  async dev(req:Request,res:Response,name?:string){
    if(process.env.DEV_AUTH!=='true'||process.env.NODE_ENV==='production'||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.ip||''))fail(404,'NOT_FOUND','此入口不可用');
    const existing=(req as any).userId;if(existing)return {userId:existing};
    const u=await this.db.user.create({data:{name:name||'小间'}});return this.session(u.id,res);
  }
  private secret(phone:string){return createHmac('sha256',process.env.MEDIA_SIGNING_SECRET!).update(phone).digest('hex');}
  async otp(phone:string){
    if(!/^1[3-9]\d{9}$/.test(phone))fail(422,'INVALID_PHONE','请填写有效手机号');
    if(!process.env.SMS_WEBHOOK_URL)fail(503,'SMS_NOT_CONFIGURED','手机号登录尚未配置，请联系部署管理员');
    const phoneHash=this.secret(phone),now=Date.now();
    if(await this.db.otpChallenge.count({where:{phoneHash,createdAt:{gt:new Date(now-60000)}}}))fail(429,'RATE_LIMITED','请稍后再获取验证码');
    if(await this.db.otpChallenge.count({where:{phoneHash,createdAt:{gt:new Date(now-86400000)}}})>=10)fail(429,'RATE_LIMITED','今天的验证码请求次数已达上限');
    const code=String(randomInt(100000,1000000)),challenge=await this.db.otpChallenge.create({data:{phoneHash,codeHash:this.secret(`${phone}|${code}`),expiresAt:new Date(now+5*60000)}});
    const response=await fetch(process.env.SMS_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.SMS_WEBHOOK_SECRET||''}`},body:JSON.stringify({phone,code,challengeId:challenge.id}),signal:AbortSignal.timeout(5000)});
    if(!response.ok){await this.db.otpChallenge.update({where:{id:challenge.id},data:{consumedAt:new Date()}});fail(503,'SMS_FAILED','验证码发送失败，请稍后重试');}
    return {challengeId:challenge.id,retryAfter:60};
  }
  async login(phone:string,code:string,challengeId:string,res:Response){
    if(!/^1[3-9]\d{9}$/.test(phone)||!/^\d{6}$/.test(code)||!challengeId)fail(422,'INVALID_CODE','手机号或验证码格式不正确');
    const c=await this.db.otpChallenge.findUnique({where:{id:challengeId}});
    if(!c||c.phoneHash!==this.secret(phone)||c.expiresAt<new Date()||c.consumedAt||c.attempts>=5)fail(422,'INVALID_CODE','验证码已过期或不可用');
    await this.db.otpChallenge.update({where:{id:c.id},data:{attempts:{increment:1}}});
    const expected=Buffer.from(c.codeHash),actual=Buffer.from(this.secret(`${phone}|${code}`));
    if(!timingSafeEqual(expected,actual))fail(422,'INVALID_CODE','验证码不正确');
    const u=await this.db.$transaction(async tx=>{const used=await tx.otpChallenge.updateMany({where:{id:c.id,consumedAt:null},data:{consumedAt:new Date()}});if(!used.count)fail(409,'CODE_USED','验证码已使用');return tx.user.upsert({where:{phoneHash:c.phoneHash},update:{},create:{phoneHash:c.phoneHash}});});return this.session(u.id,res);
  }
}
