import './env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, Catch, ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from './module';
import { map } from 'rxjs/operators';
import { requireConfig, root } from './env';
@Catch()
class Errors implements ExceptionFilter {
  catch(e:any,host:ArgumentsHost){const res=host.switchToHttp().getResponse(),req=host.switchToHttp().getRequest();const status=e instanceof HttpException?e.getStatus():e.code==='P2002'?409:500;const detail:any=e instanceof HttpException?e.getResponse():null;
    if(status>=500)console.error(JSON.stringify({requestId:req.requestId,error:e.name,code:e.code||'INTERNAL_ERROR'}));
    res.status(status).json({error:{code:detail&&typeof detail==='object'&&detail.code?detail.code:status===409?'REVISION_CONFLICT':status===500?'INTERNAL_ERROR':'INVALID_REQUEST',message:detail&&typeof detail==='object'&&detail.message?detail.message:typeof detail==='string'?detail:'服务暂时不可用，请稍后重试'},requestId:req.requestId});
  }
}
async function main(){
  requireConfig();const app=await NestFactory.create(AppModule,new ExpressAdapter(),{logger:['error','warn','log']});app.setGlobalPrefix('api/v1');app.use(cookieParser());
  app.use((req:any,res:any,next:any)=>{
    req.requestId=randomUUID();res.setHeader('X-Request-Id',req.requestId);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-store');
    if(!['GET','HEAD','OPTIONS'].includes(req.method)){
      const origins=(process.env.WEB_ORIGIN||'http://localhost:5173').split(',').flatMap(o=>[o,o.replace('localhost','127.0.0.1')]);
      const token=req.headers['x-csrf-token'],cookie=req.cookies?.ln_csrf;
      if((req.headers.origin&&!origins.includes(req.headers.origin))||typeof token!=='string'||!cookie||token.length!==cookie.length||!timingSafeEqual(Buffer.from(token),Buffer.from(cookie)))return res.status(403).json({error:{code:'CSRF_REJECTED',message:'页面已过期，请刷新后再试'},requestId:req.requestId});
    }next();
  });
  app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));app.useGlobalFilters(new Errors());app.enableShutdownHooks();
  app.useGlobalInterceptors({intercept(context:any,next:any){return next.handle().pipe(map((data:any)=>({data,requestId:context.switchToHttp().getRequest().requestId})));}});
  const spec=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('LightNook API').setVersion('0.1.0').addCookieAuth('ln_session').build());SwaggerModule.setup('api/docs',app,spec);
  await writeFile(resolve(root,'docs/openapi.json'),JSON.stringify(spec,null,2));
  await app.listen(Number(process.env.PORT||3100),process.env.HOST||'127.0.0.1');console.log('LightNook API http://localhost:3100/api/v1/health · docs /api/docs');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
