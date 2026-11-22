import {addDays,isDate,today} from './domain';
export const habitIcons=['book','music','camera','plant','pen','coffee','spark','heart'] as const;
export const habitColors=['blue','sage','sand','rose'] as const;
export const habitPalette={blue:'#344F60',sage:'#647C68',sand:'#98795E',rose:'#9A6C6A'};
export function habitInputError(b:any,creating=false):string|null{
 if(creating||b.title!==undefined)if(typeof b.title!=='string'||!b.title.trim()||b.title.trim().length>30)return '请填写 1–30 个字的事项名称';
 if(b.icon!==undefined&&!habitIcons.includes(b.icon))return '请选择支持的图标';
 if(b.color!==undefined&&!habitColors.includes(b.color))return '请选择支持的颜色';
 if(b.archived!==undefined&&typeof b.archived!=='boolean')return '归档状态不正确';
 return null;
}
export function habitEntryError(date:string,b:any,asOf=today()):string|null{
 if(!isDate(date)||date>asOf)return '请选择今天或过去的有效日期';
 if(!Number.isInteger(b.expectedRevision)||b.expectedRevision<0)return '记录版本不正确，请刷新后再试';
 if(b.note!==undefined&&(typeof b.note!=='string'||b.note.length>500))return '成果文字最多 500 个字';
 if(b.photos!==undefined&&(!Array.isArray(b.photos)||b.photos.length>4||b.photos.some((id:unknown)=>typeof id!=='string'||!id||id.length>128)||new Set(b.photos).size!==b.photos.length))return '每条记录最多添加 4 张不同的照片';
 return null;
}
export function habitProgress(entries:any[],asOf=today()){
 const dates=[...new Set<string>(entries.filter(e=>!e.revokedAt&&isDate(e.date)&&e.date<=asOf).map(e=>e.date))].sort();
 const set=new Set(dates);let cursor=set.has(asOf)?asOf:addDays(asOf,-1),streak=0,longest=0,run=0,previous='';
 while(set.has(cursor)){streak++;cursor=addDays(cursor,-1);}
 for(const date of dates){run=previous&&addDays(previous,1)===date?run+1:1;longest=Math.max(longest,run);previous=date;}
 const totalDays=dates.length,milestones=[7,30,100,365];
 return {totalDays,streak,longestStreak:longest,firstDate:dates[0]||null,lastDate:dates.at(-1)||null,milestone:milestones.filter(n=>n<=totalDays).at(-1)||null,nextMilestone:milestones.find(n=>n>totalDays)||null};
}
export function habitView(habit:any,entries:any[],includeEntries=false,asOf=today()){
 const active=entries.filter(e=>!e.revokedAt&&e.date<=asOf).sort((a,b)=>b.date.localeCompare(a.date));
 return {...habit,progress:habitProgress(entries,asOf),todayEntry:entries.find(e=>e.date===asOf)||null,recentResult:active.find(e=>e.note||e.photos?.length)||null,...(includeEntries?{entries:[...entries].sort((a,b)=>b.date.localeCompare(a.date))}:{})};
}
