import {addDays,stats,today,weekday} from './domain';
const esc=(s:unknown)=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
const clip=(s:unknown,n:number)=>{const a=Array.from(String(s??''));return a.length>n?a.slice(0,n).join('')+'…':a.join('');};
export function signDetails(items:any[],records:any[],start:string,end:string){
 const active=records.filter(r=>!r.revokedAt),days=[];
 for(let date=start;date<=end;date=addDays(date,1))days.push({date,...stats(items.filter(i=>i.date===date),active.filter(r=>r.date===date)),future:date>today()});
 const mealsList=['breakfast','lunch','dinner'].map(slot=>{const ids=items.filter(i=>i.slot===slot).map(i=>i.id),r=active.find(r=>r.type==='MEAL'&&ids.includes(r.itemId));return {slot,title:r?.actual?.meal?.title||'还没有记录',done:!!r};});
 return {days,mealsList,recordedDays:new Set(active.map(r=>r.date)).size};
}
export function signSvg(s:any,photoDataUrl?:string){
 const week=s.kind==='week',minimal=s.template==='minimal',blue='#344F60',muted='#6C777A',warm='#BD967C',paper='#F7F5F0',hero=minimal?'#E2D9CA':blue,heroInk=minimal?blue:paper;
 const percent=typeof s.percent==='number'?Math.max(0,Math.min(100,s.percent)):null;
 const t=(x:number,y:number,v:unknown,size=13,color=blue,serif=false,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-family="${serif?'Songti SC, Noto Serif CJK SC, serif':'PingFang SC, Noto Sans CJK SC, sans-serif'}" font-size="${size}" ${extra}>${esc(v)}</text>`;
 const box=(x:number,y:number,w:number,h:number,fill:string,r=18)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
 const smallDate=(d:string)=>String(d||'').slice(5).replace('-','.');
 const days=Array.isArray(s.days)?s.days:[],meals=Array.isArray(s.mealsList)?s.mealsList:[];
 const recordedDays=s.recordedDays??(s.meals||s.workouts?1:0);
 const dateLabel=week?`${smallDate(s.start)} — ${smallDate(s.end)}`:String(s.start||'').replaceAll('-','.');
 const heroArt=minimal?`<circle cx="328" cy="83" r="72" fill="none" stroke="${warm}" opacity=".35"/><path d="M240 65L372 197" stroke="${warm}" opacity=".3"/>`:`<path d="M311 275Q350 199 349 112M329 226Q288 213 292 181Q325 185 329 226ZM342 182Q378 181 376 148Q348 150 342 182Z" fill="none" stroke="${warm}" stroke-width="1.2" opacity=".65"/>`;
 const circle=2*Math.PI*40,progress=percent===null?0:percent/100*circle;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="752" viewBox="0 0 390 752"><defs><clipPath id="hero"><rect x="18" y="73" width="354" height="214" rx="24"/></clipPath><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#233E50" stop-opacity=".8"/><stop offset="1" stop-color="#233E50" stop-opacity=".9"/></linearGradient></defs>${box(0,0,390,752,minimal?'#E7ECEE':paper,0)}
 <path d="M30 43V29Q30 21 38 21Q46 21 46 29V38M30 43H38" stroke="${blue}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M36 35Q34 28 42 28Q42 36 36 35" fill="${warm}"/><circle cx="46" cy="43" r="1.6" fill="${warm}"/>
 ${t(57,35,'轻有间',19,blue,true)}${t(57,50,'LIGHTNOOK',7,muted,false,'letter-spacing="2.4"')}${t(368,36,week?'WEEKLY JOURNAL':'DAILY JOURNAL',9,muted,false,'text-anchor="end" letter-spacing="1.4"')}
 ${box(18,73,354,214,hero,24)}<g clip-path="url(#hero)">${heroArt}${photoDataUrl?`<image x="18" y="73" width="354" height="214" preserveAspectRatio="xMidYMid slice" href="${esc(photoDataUrl)}"/>${box(18,73,354,214,'url(#shade)',24)}`:''}</g>
 ${t(40,103,dateLabel,11,heroInk,false,'letter-spacing="1.1"')}${t(40,147,week?'这一周，':'今天，',29,heroInk,true)}${t(40,185,week?'慢慢也向前。':'好好照顾自己。',26,heroInk,true)}
 <circle cx="301" cy="172" r="40" fill="none" stroke="${heroInk}" opacity=".15" stroke-width="4"/><circle cx="301" cy="172" r="40" fill="none" stroke="${warm}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${progress} ${circle}" transform="rotate(-90 301 172)"/>
 ${t(301,175,percent===null?'—':percent+'%',25,heroInk,true,'text-anchor="middle"')}${t(301,193,'计划完成',9,heroInk,false,'text-anchor="middle"')}
 ${t(40,224,'吃好每一餐，记下每一步。',11,heroInk)}<path d="M40 241H349" stroke="${heroInk}" opacity=".18"/>${t(40,263,`${s.completed||0} / ${s.eligible||0} 项安排完成`,11,heroInk)}${t(347,263,s.partial?'本周进行中':'属于自己的节奏',10,heroInk,false,'text-anchor="end"')}`;
 const metrics=[[s.meals||0,'饮食记录','餐'],[s.minutes||0,'活动时长','分钟'],[week?recordedDays:(s.workouts||0),week?'记录天数':'运动打卡',week?'天':'次']];
 metrics.forEach(([value,label,unit],i)=>{const x=18+i*121;svg+=box(x,304,112,82,'#FFFDF9',16)+t(x+16,338,value,29,blue,true)+t(x+16,367,`${label} / ${unit}`,10,muted);});
 svg+=box(18,405,354,190,'#FFFDF9',18)+t(36,435,week?'这一周的节奏':'认真吃过的三餐',17,blue,true)+t(350,434,week?'MON — SUN':'DAILY MENU',8,muted,false,'text-anchor="end" letter-spacing="1.1"');
 if(week){
  if(days.length)days.slice(0,7).forEach((d:any,i:number)=>{const x=43+i*44,h=d.percent===null?3:Math.max(3,d.percent/100*70);svg+=box(x,465,20,75,'#EEECE5',10)+box(x,540-h,20,h,d.future?'#EEECE5':(d.completed?blue:'#D7C9B7'),10)+t(x+10,560,'一二三四五六日'[(weekday(d.date)+6)%7],10,muted,false,'text-anchor="middle"')+t(x+10,580,d.future?'待开始':d.eligible?`${d.completed}/${d.eligible}`:'休息',8,muted,false,'text-anchor="middle"');});
  else svg+=t(36,491,'这张历史签卡没有逐日明细。',12,muted)+t(36,521,'重新生成本周签，看看每天的节奏。',12,muted);
 }else ['早餐','午餐','晚餐'].forEach((label,i)=>{const row=meals[i],y=468+i*42;svg+=`<circle cx="42" cy="${y-4}" r="5" fill="${row?.done?warm:'#E5E6E0'}"/>`+t(57,y,label,10,muted)+t(97,y,clip(row?.title||'还没有记录',16),12,row?.done?blue:muted);if(i<2)svg+=`<path d="M36 ${y+14}H351" stroke="#E9E6DF"/>`;});
 const complete=s.eligible>0&&s.completed===s.eligible;
 const note=complete?'把计划里的小事，一件件做好。':s.meals||s.workouts?'每一份认真，都让日常更有光。':'从下一餐开始，也是一种进步。';
 svg+=box(18,612,354,91,minimal?'#D9E2E5':'#EBE3D8',18)+t(36,637,week?'本周的小收获':'给今天的一句话',10,muted)+t(36,665,note,16,blue,true)+t(36,686,complete?(week?'这一周的认真，已收好。':'今日份认真，已收好。'):week?`这一周，有 ${recordedDays} 天留下了记录。`:'不必赶路，按自己的节奏来。',10,muted);
 svg+=t(22,730,'ROOM FOR EVERYDAY',8,muted,false,'letter-spacing="1.7"')+t(368,730,'轻一点 · 慢慢来',10,blue,true,'text-anchor="end"')+'</svg>';
 return svg;
}
