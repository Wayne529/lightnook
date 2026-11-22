import sharp from 'sharp';
const esc=(s:unknown)=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export async function renderSign(s:any,photo?:Buffer){
  const blue='#344F60',ink='#2D3C43',muted='#626968',paper='#EEE9DF';
  const t=(x:number,y:number,text:unknown,size:number,c=ink,serif=false)=>`<text x="${x}" y="${y}" fill="${c}" font-family="${serif?'Noto Serif CJK SC, Songti SC, serif':'Noto Sans CJK SC, PingFang SC, sans-serif'}" font-size="${size}">${esc(text)}</text>`;
  const plant=`<g transform="translate(169 185) scale(.9)" fill="none" stroke="#BD967C" stroke-width="1.1"><path d="M24 154C53 119 61 72 67 12M45 125C9 121 5 95 7 84 35 90 48 104 45 125ZM56 92C84 94 103 74 107 55 80 57 62 73 56 92ZM62 60C39 52 35 33 39 17 61 26 68 43 62 60ZM66 33C82 27 85 12 82 1 67 7 62 21 66 33Z"/></g>`;
  let art=s.template==='minimal'?`<circle cx="235" cy="265" r="60" fill="none" stroke="#D0C7B9"/><path d="M175 265h120M235 205v120" stroke="#BD967C"/>`:plant;
  if(s.template==='photo'&&photo){const image=await sharp(photo).resize(290,150,{fit:'cover'}).jpeg({quality:90}).toBuffer();art=`<image x="26" y="200" width="290" height="150" href="data:image/jpeg;base64,${image.toString('base64')}"/>`;}
  const week=s.kind==='week';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="342" height="561" viewBox="0 0 342 561"><rect width="342" height="561" fill="${paper}"/>
  ${t(24,34,week?'WEEKLY JOURNAL':'DAILY JOURNAL',10,muted)}<path d="M24 49h294M24 354h294M24 490h294" stroke="#D9D2C6"/>
  ${t(24,77,week?`${s.start} — ${s.end}`:s.start,11,muted)}${t(24,127,week?'每一份认真，':'今天，也有',28,ink,true)}${t(24,166,week?'都有回响。':'好好照顾自己。',28,ink,true)}
  ${art}${s.template!=='photo'?t(24,235,'轻一点，',12,muted)+t(24,260,'慢慢来。',12,muted):''}
  ${t(24,408,s.meals,44,ink,true)}${t(181,408,week?s.workouts:s.minutes,44,ink,true)}${t(24,435,week?'次饮食记录':'餐认真吃饭',12,muted)}${t(181,435,week?'次运动完成':'分钟运动',12,muted)}
  ${t(24,470,week?`累计 ${s.minutes} 分钟 · 完成 ${s.percent===null?'—':s.percent+'%'}`:`今日安排 ${s.completed} / ${s.eligible} 已完成`,12,blue)}
  ${t(24,531,'轻有间',23,blue,true)}${t(167,530,s.partial?'记录进行中，慢慢来。':'给生活，留一点余地。',10,muted)}</svg>`;
  return sharp(Buffer.from(svg),{limitInputPixels:10000000}).resize(1026,1683).png().toBuffer();
}
