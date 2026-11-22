import {HabitController,HabitService} from './habits';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Db } from './db';
import { AppService } from './service';
import { AuthGuard, AuthService } from './auth';
import { AppController } from './controller';
@Module({controllers:[AppController,HabitController],providers:[Db,AppService,HabitService,AuthService,{provide:APP_GUARD,useClass:AuthGuard}]})
export class AppModule {}
