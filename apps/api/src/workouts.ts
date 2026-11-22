export const workoutCatalog=[
 {key:'walk',title:'散步',minutes:20,icon:'walk',description:'轻松走走，按实际完成时长记录。'},
 {key:'run',title:'跑步',minutes:20,icon:'run',description:'户外或跑步机，都可以记下这一段。'},
 {key:'swim',title:'游泳',minutes:30,icon:'swim',description:'记录本次游泳实际活动的时长。'},
 {key:'badminton',title:'羽毛球',minutes:30,icon:'ball',description:'和朋友打一场，也是一份日常记录。'},
 {key:'hike',title:'爬山',minutes:45,icon:'hike',description:'把走进山野的这段时间留在日历里。'},
 {key:'bike',title:'骑行',minutes:30,icon:'bike',description:'通勤骑行或周末出行，按实际情况填写。'},
 {key:'stretch',title:'拉伸',minutes:10,icon:'stretch',description:'给身体留一段舒展的时间。'},
 {key:'yoga',title:'瑜伽',minutes:20,icon:'yoga',description:'记录今天的练习，跟随自己的节奏。'},
 {key:'strength',title:'力量训练',minutes:20,icon:'strength',description:'记录这次训练实际完成的活动时长。'},
] as const;
export const workoutKeys=workoutCatalog.map(w=>w.key);
export function getWorkout(key?:string){return workoutCatalog.find(w=>w.key===key)||workoutCatalog[0];}
export function workoutPreferenceError(value:any):string|null{
 if(value.workoutTypes===undefined)return null;
 if(!Array.isArray(value.workoutTypes)||value.workoutTypes.length>workoutCatalog.length||value.workoutTypes.some((key:unknown)=>!workoutKeys.includes(key as any)))return '请选择支持的运动类型';
 if(value.workoutDays?.length&&!value.workoutTypes.length)return '有运动安排的日期，请至少选择一项运动';
 return null;
}
export function workoutSnapshot(types:string[]|undefined,index:number){const choices=types?.length?types:['walk'],w=getWorkout(choices[index%choices.length]);return {workoutType:w.key,title:w.title,minutes:w.minutes,description:w.description,steps:[{title:w.title,minutes:w.minutes}]};}
