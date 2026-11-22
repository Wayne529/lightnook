import {workoutKeys} from './workouts';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, MaxLength, Matches, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class PreferenceDto {
  @ApiProperty() @IsInt() @Min(0) expectedRevision!: number;
  @ApiProperty({ enum: ['home','mixed','outside'] }) @IsIn(['home','mixed','outside']) scene!: string;
  @ApiProperty() @IsInt() @Min(5) @Max(120) minutes!: number;
  @ApiProperty() @IsInt() @Min(500) @Max(50000) budget!: number;
  @ApiProperty() @IsArray() @IsString({each:true}) @ArrayMaxSize(12) allergens!: string[];
  @ApiProperty() @IsArray() @IsString({each:true}) @ArrayMaxSize(10) @MaxLength(20,{each:true}) dislikes!: string[];
  @ApiPropertyOptional({type:[String],description:'常买得到的食材；最多60项'}) @IsOptional() @IsArray() @IsString({each:true}) @ArrayMaxSize(60) @MaxLength(20,{each:true}) availableIngredients?: string[];
  @ApiPropertyOptional({type:[String],description:'更喜欢的食材；用于排序'}) @IsOptional() @IsArray() @IsString({each:true}) @ArrayMaxSize(60) @MaxLength(20,{each:true}) preferredIngredients?: string[];
  @ApiPropertyOptional({enum:['prefer','only'],description:'优先常买食材，或做饭只用已选食材'}) @IsOptional() @IsIn(['prefer','only']) ingredientMode?: 'prefer'|'only';
  @ApiPropertyOptional({enum:workoutKeys,isArray:true}) @IsOptional() @IsArray() @IsIn(workoutKeys,{each:true}) @ArrayMaxSize(9) workoutTypes?:string[];
  @ApiProperty() @IsArray() @IsInt({each:true}) @Min(0,{each:true}) @Max(6,{each:true}) workoutDays!: number[];
}
export class PlanDto {
  @ApiProperty() @IsString() startDate!: string;
  @ApiProperty() @IsIn([7,14,21]) durationDays!: number;
  @ApiPropertyOptional({enum:['my','auto'],description:'用选定食材生成，或程序自动搭配；省略时沿用饮食偏好'}) @IsOptional() @IsIn(['my','auto']) ingredientSource?: 'my'|'auto';
  @ApiPropertyOptional({type:[String],description:'本次生成计划选用的食材'}) @IsOptional() @IsArray() @IsString({each:true}) @ArrayMaxSize(60) @MaxLength(20,{each:true}) ingredients?: string[];
}
export class RevisionDto { @ApiProperty() @IsInt() @Min(1) expectedRevision!: number; }
export class ReplaceDto extends RevisionDto {
  @ApiProperty() @IsString() mealVersionId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() drawId?: string;
}
export class RecordDto {
  @ApiPropertyOptional({enum:workoutKeys}) @IsOptional() @IsIn(workoutKeys) workoutType?:string;
  @ApiProperty() @IsInt() @Min(1) expectedItemRevision!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) expectedRecordRevision?: number;
  @ApiProperty() @IsString() occurredAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mealVersionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(.1) @Max(10) portion?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(720) minutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({each:true}) @ArrayMaxSize(4) photos?: string[];
}
export class PoolDto {
  @ApiProperty() @IsIn(['breakfast','lunch','dinner']) slot!: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['home','mixed','outside']) scene?: string;
}
export class GroceryDto { @ApiProperty() @IsString() planId!: string; }
export class GroceryPatchDto extends RevisionDto { @ApiProperty() @IsString() key!: string; @ApiProperty() @IsBoolean() checked!: boolean; }
export class SignDto {
  @ApiProperty() @IsIn(['day','week']) kind!: string;
  @ApiProperty() @IsString() date!: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['botanical','minimal','photo']) template?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoAssetId?: string;
}
export class DevLoginDto { @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) name?: string; }
export class CustomMealDto {
  @ApiProperty() @IsString() @MaxLength(30) title!: string;
  @ApiProperty() @IsIn(['HOME','OUTSIDE']) kind!: string;
  @ApiProperty() @IsInt() @Min(0) @Max(180) minutes!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(100000) costCents!: number;
  @ApiProperty() @IsArray() @IsIn(['breakfast','lunch','dinner'],{each:true}) slots!: string[];
}
