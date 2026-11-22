import {habitPalette} from './habits-domain';
const esc=(v:unknown)=>String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
const clip=(s:string,n:number)=>Array.from(s).length>n?Array.from(s).slice(0,n).join('')+'…':s;
export function habitSignSvg(h:any,includeNote=false){
 const ink=habitPalette[h.color as keyof typeof habitPalette]||habitPalette.blue,p=h.progress;
 const text=(x:number,y:number,v:unknown,size:number,color=ink,serif=false,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="${serif?'Songti SC,Noto Serif CJK SC,serif':'PingFang SC,Noto Sans CJK SC,sans-serif'}" ${extra}>${esc(v)}</text>`;
 const note=includeNote?(h.entries||[]).find((e:any)=>!e.revokedAt&&e.note)?.note:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="640" viewBox="0 0 390 640"><rect width="390" height="640" fill="#F7F5F0"/>${text(28,42,'轻有间',22,ink,true)}${text(362,40,'LITTLE BY LITTLE',9,'#707976',false,'text-anchor="end" letter-spacing="1.5"')}
 <rect x="20" y="74" width="350" height="324" rx="28" fill="${ink}"/>${text(42,110,'每一点坚持，都有迹可循。',12,'#DBE1DA')}${text(42,156,'你已经坚持',27,'#F7F5F0',true)}${text(42,199,clip(h.title,11),29,'#F7F5F0',true)}${text(40,314,p.totalDays,100,'#F7F5F0',true)}${text(192,307,'天',18,'#F7F5F0')}<path d="M42 343H348" stroke="#F7F5F0" opacity=".22"/>${text(42,373,`累计 ${p.totalDays} 天 · 连续 ${p.streak} 天`,12,'#F7F5F0')}
 <circle cx="320" cy="269" r="41" fill="none" stroke="#BD967C" opacity=".5"/><path d="M300 303Q333 269 329 232M315 284Q293 278 296 261Q317 266 315 284M326 261Q348 259 349 241Q330 246 326 261" fill="none" stroke="#BD967C"/>
 ${text(28,439,p.firstDate?`从 ${p.firstDate.replaceAll('-','.')} 的第一个记号开始`:'从第一个记号开始',11,'#707976')}${text(28,479,'喜欢的事，一天一天留下来。',21,ink,true)}${text(28,515,note?clip(note.replace(/\s+/g,' '),23):'不必赶路，按照自己的节奏。',12,'#707976')}
 <path d="M28 561H362" stroke="#DFDBD2"/>${text(28,594,'慢慢养成',19,ink,true)}${text(362,593,'ROOM FOR EVERYDAY',8,'#707976',false,'text-anchor="end" letter-spacing="1.2"')}</svg>`;
}
