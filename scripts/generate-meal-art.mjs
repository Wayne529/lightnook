// Native vector illustrations: one composition per named fixture, with a generic UI fallback.
import {mkdirSync,writeFileSync} from 'node:fs';
const dir='apps/web/public/meal-art';mkdirSync(dir,{recursive:true});
const g=(x,y,s,body)=>`<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const rice=`<ellipse cx="0" cy="0" rx="31" ry="24" fill="#E4D6BC"/>`+Array.from({length:17},(_,i)=>`<path d="M${-22+(i*13)%45} ${-14+(i*7)%29}l4 1" stroke="${i%3?'#FAF2DE':'#BDA682'}" stroke-width="2" stroke-linecap="round"/>`).join('');
const noodles=`<ellipse rx="47" ry="34" fill="#E9D1A2"/>`+Array.from({length:7},(_,i)=>`<path d="M${-35+i*4} ${-19+i*6}C-10 ${-36+i*6} 43 ${-15+i*3} 24 ${9+i*3}S-43 29 -26 ${9+i*2}" fill="none" stroke="${i%2?'#D2B17A':'#F9EBC9'}" stroke-width="3"/>`).join('');
const chicken=`<path d="M-31-20Q-10-34 20-24Q37-14 29 10Q13 30-20 21Q-33 11-31-20" fill="#C99E78"/>`+[-16,-4,8,20].map(x=>`<path d="M${x}-18l-7 30" stroke="#A77B58" stroke-width="2.5"/>`).join('');
const beef=[[-19,-14],[-3,-7],[15,1],[-12,12]].map(([x,y])=>`<rect x="${x}" y="${y}" width="27" height="11" rx="5" fill="#95664F" transform="rotate(-24 ${x} ${y})"/><path d="M${x+5} ${y+4}l15-5" stroke="#C19574" stroke-width="1.5"/>`).join('');
const tofu=[[-17,-14],[6,-16],[-14,8],[11,7]].map(([x,y])=>`<rect x="${x}" y="${y}" width="22" height="19" rx="4" fill="#EFDCB7" stroke="#D2B991"/><path d="M${x+5} ${y+5}l9 6" stroke="#D7BF98"/>`).join('');
const tomato=`<path d="M-17-9Q0-27 18-8L1 13Z" fill="#BF795F"/><path d="M-11-7Q0-18 12-7L1 6Z" fill="#E3A58A"/>`+[-5,1,7].map(x=>circle(x,-7,1,'#F5D3A6')).join('');
const broccoli=`<path d="M-2 15L0-4" stroke="#A5AF80" stroke-width="6"/>`+[[0,-8],[-10,-3],[10,-4],[-3,-15],[7,-14]].map(([x,y])=>circle(x,y,9,'#7C9069')).join('');
const mushroom=`<path d="M-3 0L-5 16H7L4 0" fill="#D7C9AA"/><path d="M-18 1Q-14-26 8-18Q19-13 20 1Z" fill="#9C8169"/><path d="M-13 2H15" stroke="#C5AA8A" stroke-width="3"/>`;
const pumpkin=`<path d="M-22 8Q-22-19-5-23L19 9Q-1 24-22 8" fill="#D4A165"/><path d="M-19 10Q0 25 19 9" fill="none" stroke="#85916A" stroke-width="4"/><path d="M-5-16L8 11M-11-8L-1 14" stroke="#E7BD86" stroke-width="2"/>`;
const egg=`<path d="M-25 0Q-32-19-12-24Q5-32 23-16Q34-3 19 19Q-2 31-23 15Q-30 10-25 0" fill="#FFF8E8" stroke="#E3D7BC"/>${circle(0,-1,11,'#D9AA60')}${circle(-3,-4,3,'#EFCB8A')}`;
const cabbage=`<path d="M-18 18Q-32-1-11-20Q10-31 22-13Q31 12 1 26Z" fill="#ADC09A"/><path d="M-12 17Q0 2 14-16M-4 8L-17-3M3 0L19 3" fill="none" stroke="#E2E9CD" stroke-width="2"/>`;
const peppers=['#BB765E','#D0A45E','#8C9B6E'].map((c,i)=>`<path d="M${-18+i*14}-15Q${-33+i*14} 4 ${-14+i*14}20L${-8+i*14}14Q${-24+i*14} 1 ${-11+i*14}-10Z" fill="${c}"/>`).join('');
const shrimp=`<path d="M13-17C-13-34-30-9-18 13C-10 31 11 24 12 12C12 2-2 0-5 9" fill="none" stroke="#D79A7B" stroke-width="12" stroke-linecap="round"/><path d="M15-19l11-5-4 14Z" fill="#B8775F"/><path d="M-16-13l-7-1M-20-3l-7 2M-17 8l-7 5M-9 15l-3 8" stroke="#F0C6AB" stroke-width="2"/>`;
const salmon=`<path d="M-31-16Q-4-35 29-14L23 20Q-3 34-26 16Z" fill="#D19775"/>`+[-18,-5,8,21].map(x=>`<path d="M${x}-13l-10 28" stroke="#F0C8A7" stroke-width="3"/>`).join('');
const fish=`<path d="M-35 0Q-5-31 31-2Q1 26-35 0L-48-15V14Z" fill="#C8C8BA" stroke="#A5ADA4"/><path d="M-20-2Q0-15 24-2" stroke="#F3EFE0" stroke-width="3" fill="none"/>${circle(20,-4,2,'#344F60')}<path d="M-9-17l9-9 8 10M-9 15l11 8 8-11" fill="#ADB7A6"/>`;
const lemon=circle(0,0,15,'#E6CD83')+circle(0,0,11,'#F8E9B3')+Array.from({length:6},(_,i)=>`<path d="M0 0L${Math.cos(i*Math.PI/3)*10} ${Math.sin(i*Math.PI/3)*10}" stroke="#DBC17A"/>`).join('');
const oats=`<ellipse rx="46" ry="39" fill="#E0D2B8"/><ellipse rx="39" ry="32" fill="#F5ECDA"/>`+Array.from({length:23},(_,i)=>`<ellipse cx="${-29+(i*17)%58}" cy="${-23+(i*11)%46}" rx="3" ry="1.5" fill="#CDB894" transform="rotate(${i*13})"/>`).join('');
const berries=[[0,0],[-10,-5],[9,-7],[-5,9],[12,8]].map(([x,y],i)=>circle(x,y,6,i%2?'#81909B':'#6D7D8D')+circle(x-1,y-2,1,'#C8D1D4')).join('');
const banana=[[-18,-11],[-4,-7],[10,-2],[21,9]].map(([x,y])=>circle(x,y,9,'#E5CF8B')+circle(x,y,6,'#F4E5B4')+circle(x,y,1,'#BDA26D')).join('');
const glass=`<path d="M-13-24H14L11 23H-10Z" fill="#EEE3CF" stroke="#C4BCA9"/><path d="M-10-16H11L9 19H-8Z" fill="#E0D0AA"/>`;
const strawberry=`<path d="M-12-6Q0-22 13-6L3 17Q-3 22-12-6" fill="#BA7866"/><path d="M-10-9L0-4 11-10 4-14-4-14Z" fill="#83956E"/>`+[[0,1],[-5,-2],[5,-2],[1,9]].map(([x,y])=>circle(x,y,1,'#EBC49A')).join('');
const toast=`<path d="M-32-10Q-44-39-16-40H17Q43-36 32-11V37H-32Z" fill="#BD966C" stroke="#A7805A" stroke-width="2"/><path d="M-25-9Q-35-31-13-32H13Q33-28 25-9V29H-25Z" fill="#E5C99A"/>`+Array.from({length:11},(_,i)=>circle(-18+(i*11)%36,-21+(i*7)%43,1,'#B79568')).join('');
const sweet=`<ellipse rx="30" ry="15" transform="rotate(-28)" fill="#A77E68"/><ellipse rx="25" ry="11" transform="rotate(-28)" fill="#D8AC70"/><path d="M-15 5l26-11" stroke="#E6C38E" stroke-width="2"/>`;
const porridge=`<ellipse rx="45" ry="37" fill="#C6B99D"/><ellipse rx="39" ry="31" fill="#E8D8A7"/>`+Array.from({length:35},(_,i)=>circle(-30+(i*19)%60,-22+(i*13)%44,1,'#C8AE70')).join('');
const jar=`<rect x="-24" y="-30" width="48" height="69" rx="9" fill="#D6D6CB" stroke="#ABB6B2"/><path d="M-20-17H20V29Q0 37-20 29Z" fill="#F7EFE1"/><rect x="-26" y="-35" width="52" height="10" rx="4" fill="#BFAF97"/>`;
const bento=`<rect x="-64" y="-48" width="128" height="99" rx="15" fill="#D1C1A8"/><rect x="-57" y="-41" width="114" height="85" rx="11" fill="#EDE0C8"/><path d="M-6-40V43M-5-1H56" stroke="#C7B99E" stroke-width="4"/>`;
const onigiri=`<path d="M0-39Q7-42 13-31L36 20Q41 34 26 35H-26Q-41 34-34 20L-11-31Q-7-39 0-39" fill="#F4ECD8" stroke="#DCD4BE"/><rect x="-13" y="3" width="26" height="34" rx="3" fill="#6E7E69"/>`;
const combos=[
 ['chicken-bowl','鸡胸糙米碗',g(-18,26,1,rice)+g(18,-22,.9,chicken)+g(-35,-23,.75,broccoli)+g(37,31,.55,tomato)],
 ['tomato-tofu','番茄豆腐面',g(0,0,1,noodles)+g(5,-2,.9,tofu)+g(-29,-24,.7,tomato)+g(31,23,.65,tomato)],
 ['salmon-rice','香煎三文鱼杂粮饭',g(-23,27,.9,rice)+g(14,-13,1.1,salmon)+g(-34,-29,.7,broccoli)+g(40,33,.55,lemon)],
 ['salmon-broccoli-bowl','三文鱼西兰花糙米碗',g(0,0,1.45,rice)+g(2,13,.85,salmon)+g(-32,-25,.75,broccoli)+g(3,-35,.55,broccoli)+g(34,-20,.65,broccoli)+g(-31,29,.5,tomato)],
 ['cod-vegetable','清蒸鳕鱼时蔬饭',g(-23,29,.9,rice)+g(7,-10,1.1,'<path d="M-30-16Q-7-30 29-10L24 19Q0 30-27 13Z" fill="#E4DDD0" stroke="#C3C5B7"/><path d="M-20-8Q0-18 23-5M-17 2Q0-7 22 5M-10 12L16 12" fill="none" stroke="#FAF6E9" stroke-width="3"/>')+g(-39,-24,.6,cabbage)+g(40,24,.5,broccoli)],
 ['mushroom-chicken','香菇鸡肉饭',g(-13,24,1.1,rice)+g(15,-16,.85,chicken)+g(-34,-18,.65,mushroom)+g(35,26,.65,mushroom)],
 ['vegetable-eggs','杂蔬鸡蛋饭',g(0,20,1.2,rice)+g(0,-15,.9,egg)+g(-36,20,.6,peppers)+g(36,20,.65,broccoli)],
 ['beef-bowl','时蔬牛肉饭',g(-18,22,1.1,rice)+g(12,-13,1.2,beef)+g(-30,-27,.7,broccoli)+g(32,30,.65,peppers)],
 ['shrimp-rice','西兰花鲜虾饭',g(0,29,.95,rice)+g(19,-13,.8,shrimp)+g(-22,-25,.8,shrimp)+g(-38,13,.75,broccoli)+g(40,21,.6,broccoli)],
 ['pumpkin-tofu','南瓜豆腐杂粮碗',g(0,25,1.1,rice)+g(21,-17,.9,tofu)+g(-25,-19,.9,pumpkin)+g(36,28,.6,pumpkin)],
 ['lemon-chicken','柠檬鸡肉意面',g(0,9,1.15,noodles)+g(3,-18,.8,chicken)+g(-37,-18,.8,lemon)+g(36,29,.6,lemon)],
 ['steamed-fish','清蒸鱼与时蔬饭',g(0,28,1.1,rice)+g(0,-14,1.25,fish)+g(-42,27,.65,cabbage)+g(42,21,.5,broccoli)],
 ['cabbage-tofu','白菜豆腐烩饭',g(0,25,1.1,rice)+g(19,-13,.95,tofu)+g(-28,-13,.95,cabbage)+g(38,23,.55,cabbage)],
 ['pepper-chicken','彩椒鸡肉杂粮饭',g(-16,25,1.1,rice)+g(15,-16,.85,chicken)+g(-32,-18,.7,peppers)+g(34,29,.6,peppers)],
 ['yogurt-oats','酸奶燕麦碗',g(0,3,1.3,oats)+g(21,-13,1.1,berries)+g(-26,19,.7,banana)],
 ['banana-oats','香蕉豆乳燕麦',g(-10,5,1.1,oats)+g(-14,2,1.25,banana)+g(42,-13,.9,glass)],
 ['egg-toast','鸡蛋全麦吐司',g(-7,0,1.2,toast)+g(-6,0,.95,egg)+g(40,27,.65,tomato)],
 ['sweet-potato','红薯鸡蛋早餐盘',g(-20,19,1.1,sweet)+g(-19,-9,1.05,sweet)+g(29,-13,.85,egg)+g(28,36,.6,broccoli)],
 ['berry-yogurt','莓果原味酸奶杯',g(-3,0,1.45,jar)+g(-1,7,.9,berries)+g(29,29,.9,strawberry)+g(-32,26,.8,strawberry)],
 ['millet-bowl','小米粥与时蔬',g(-8,-4,1.1,porridge)+g(34,23,.9,cabbage)+g(-29,38,.5,cabbage)],
 ['convenience','饭团＋鸡蛋＋豆浆',g(-20,-6,1,onigiri)+g(34,-12,.95,glass)+g(18,38,.6,egg)],
 ['canteen','食堂的一荤两素',g(0,0,1,bento)+g(-30,5,.8,chicken)+g(25,-19,.7,broccoli)+g(28,25,.7,cabbage)],
 ['takeaway','时蔬鸡肉便当',g(0,0,1,bento)+g(-30,7,.85,rice)+g(23,-20,.7,chicken)+g(24,23,.65,peppers)],
];
for(const [slug,title,art] of combos){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-85 -85 170 170" role="img" aria-label="${title}餐食插画"><circle r="80" fill="#FBF8F1"/><circle r="68" fill="#F0EADF" stroke="#DED6C7" stroke-width="1"/><g>${art}</g></svg>`;writeFileSync(`${dir}/${slug}.svg`,svg);}
const mapping=combos.map(([slug,title])=>({slug,title}));
writeFileSync('apps/web/src/meal-art.ts',`// Generated by scripts/generate-meal-art.mjs.\nconst artwork=${JSON.stringify(mapping,null,2)};\nexport function mealArtwork(meal:any):string|undefined{const slug=meal?.slug||meal?.meal?.slug;const entry=artwork.find(a=>a.slug===slug)||artwork.find(a=>a.title===meal?.title);return entry?import.meta.env.BASE_URL+'meal-art/'+entry.slug+'.svg':undefined;}\n`);
console.log(`Generated ${combos.length} distinct named recipe illustrations.`);
