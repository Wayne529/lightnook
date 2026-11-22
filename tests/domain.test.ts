import {habitProgress,habitInputError,habitEntryError,habitView} from '../apps/api/src/habits-domain';
import {habitSignSvg} from '../apps/api/src/habit-sign';
import {getWorkout,workoutSnapshot,workoutPreferenceError,workoutKeys} from '../apps/api/src/workouts';
import {signDetails,signSvg} from '../apps/api/src/sign-design';
import {ingredientCategory} from '../apps/api/src/ingredients';
import {describe,it,expect} from 'vitest';
import {eligible,defaults,planPreferences,normalizePreferences,ingredientPreferenceError,ingredientFit,rankMeals,cookingPool,mealReason,stats,groceries,reconcileGroceries,addDays,isDate,weekStart} from '../apps/api/src/domain';
import {fixtures} from '../apps/api/src/fixtures';
describe('饮食筛选与历史统计',()=>{it('未知过敏资料不能进入过敏用户自动推荐',()=>{expect(eligible({kind:'OUTSIDE',minutes:5,costCents:1000,title:'参考餐',allergens:[],allergenKnown:false},{...defaults,allergens:['peanut']})).toBe(false)});it('配方原料的乳制品均被标记',()=>{for(const m of fixtures)if(m.ingredients.some(i=>i.name.includes('酸奶')))expect(m.allergens).toContain('milk')});it('含过敏原的餐食被排除',()=>{const m=fixtures.find(m=>m.allergens.includes('milk'))!;expect(eligible(m,{...defaults,allergens:['milk']})).toBe(false)});it('休息任务不计分母，额外记录不计完成分子',()=>{const r=stats([{id:'a',disposition:'SCHEDULED'},{id:'b',disposition:'EXCUSED'}],[{itemId:'a',type:'MEAL',actual:{}},{type:'WORKOUT',actual:{minutes:10}}]);expect(r.completed).toBe(1);expect(r.eligible).toBe(1);expect(r.minutes).toBe(10)});it('撤销记录不计完成',()=>expect(stats([{id:'a',disposition:'SCHEDULED'}],[{itemId:'a',revokedAt:new Date(),actual:{}}]).completed).toBe(0));it('没有任务显示空完成率',()=>expect(stats([],[]).percent).toBeNull());});
describe('采购与日期',()=>{it('生熟重与单位不可误合并',()=>{const items=[{slot:'lunch',snapshot:{ingredients:[{name:'米饭',quantity:150,unit:'g',basis:'COOKED'},{name:'米饭',quantity:50,unit:'g',basis:'RAW'}]}}];expect(groceries(items)).toHaveLength(2)});it('增加数量必须复核库存',()=>{const r=reconcileGroceries([{key:'a',quantity:1,checked:true}],[{key:'a',quantity:2}]);expect(r[0].needsReview).toBe(true)});it('日期与周一边界正确',()=>{expect(addDays('2026-11-30',1)).toBe('2026-12-01');expect(weekStart('2026-11-22')).toBe('2026-11-16');expect(isDate('2026-02-30')).toBe(false)});});


describe('自定义食材与配餐',()=>{
 const home=(title:string,names:string[])=>({kind:'HOME',title,minutes:15,costCents:1000,allergens:[],allergenKnown:true,ingredients:names.map(name=>({name}))});
 it('旧版偏好可升级，保留已有忌口',()=>{const p=normalizePreferences({dislikes:['香菜'],availableIngredients:undefined});expect(p.availableIngredients).toEqual([]);expect(p.ingredientMode).toBe('prefer');expect(p.dislikes).toEqual(['香菜']);});
 it('严格模式要求全部配料可买到，含调味品',()=>{const m=home('家常餐',['鸡蛋','番茄','食用油']);const p={...defaults,ingredientMode:'only' as const,availableIngredients:['鸡蛋','番茄']};expect(eligible(m,p)).toBe(false);expect(eligible(m,{...p,availableIngredients:[...p.availableIngredients,'食用油']})).toBe(true);});
 it('同义名称可匹配，但不会把米饭替换成糙米饭',()=>{expect(eligible(home('家常餐',['番茄']),{...defaults,ingredientMode:'only',availableIngredients:[' 西红柿 ']})).toBe(true);expect(eligible(home('杂粮饭',['糙米饭']),{...defaults,ingredientMode:'only',availableIngredients:['米饭']})).toBe(false);});
 it('标题没写出的忌口也根据实际配料排除',()=>{expect(eligible(home('家常餐',['西红柿']),{...defaults,dislikes:['番茄']})).toBe(false);});
 it('更喜欢的食材不能覆盖过敏与忌口',()=>{const m={...home('鸡蛋餐',['鸡蛋']),allergens:['egg']};const p={...defaults,preferredIngredients:['鸡蛋'],allergens:['egg']};expect(eligible(m,p)).toBe(false);expect(eligible(m,{...defaults,preferredIngredients:['鸡蛋'],dislikes:['鸡蛋']})).toBe(false);});
 it('偏好模式排序与自动池选择优先减少补买',()=>{const a=home('甲餐',['鸡蛋','番茄']),b=home('乙餐',['鱼肉','西兰花']);const p={...defaults,availableIngredients:['鸡蛋','番茄'],preferredIngredients:['鱼肉']};expect(eligible(b,p)).toBe(true);expect(rankMeals([b,a],p)[0]).toBe(a);expect(cookingPool([b,a],p)).toEqual([a]);expect(mealReason(b,p)).toContain('仍需准备');});
 it('更喜欢的食材用于同等采购匹配下的排序，不会修改原料',()=>{const a=home('甲餐',['鸡蛋']),b=home('乙餐',['豆腐']);expect(rankMeals([a,b],{...defaults,preferredIngredients:['豆腐']})).toEqual([b,a]);expect(b.ingredients).toEqual([{name:'豆腐'}]);});
 it('外食不按买菜清单过滤；未知做饭配方不能进入严格池',()=>{const p={...defaults,ingredientMode:'only' as const,availableIngredients:['鸡蛋']};expect(eligible({...home('外食',[]),kind:'OUTSIDE'},p)).toBe(true);expect(eligible(home('自建餐',[]),p)).toBe(false);expect(mealReason(home('自建餐',[]),p)).toContain('待确认');});
 it('严格空清单和无效输入会明确拒绝',()=>{expect(ingredientPreferenceError({...defaults,ingredientMode:'only'})).toContain('先选择');expect(ingredientPreferenceError({...defaults,availableIngredients:[null]})).toBeTruthy();expect(ingredientPreferenceError({...defaults,availableIngredients:[' '.repeat(3)]})).toBeTruthy();expect(ingredientPreferenceError({...defaults,availableIngredients:Array(61).fill('鸡蛋')})).toBeTruthy();});
 it('输入会去重，计算缺少的食材时不混淆名称',()=>{const p=normalizePreferences({availableIngredients:['番茄',' 西红柿 ','鸡蛋']});expect(p.availableIngredients).toHaveLength(2);expect(ingredientFit(home('一餐',['番茄','豆腐']),p).missing).toEqual(['豆腐']);});
});

describe('签卡明细与隐私',()=>{
 it('只展示实际记录的餐名，撤销记录与私人备注不进入签卡',()=>{
  const items=[{id:'b',slot:'breakfast',date:'2026-11-16',disposition:'SCHEDULED'},{id:'l',slot:'lunch',date:'2026-11-16',disposition:'SCHEDULED'}];
  const records=[{itemId:'b',type:'MEAL',date:'2026-11-16',actual:{meal:{title:'鸡蛋早餐'},note:'私人备注',photos:['secret']}},{itemId:'l',type:'MEAL',date:'2026-11-16',revokedAt:'2026-11-16',actual:{meal:{title:'已撤销的餐'}}}];
  const d=signDetails(items,records,'2026-11-16','2026-11-16');expect(d.mealsList[0].title).toBe('鸡蛋早餐');expect(d.mealsList[1].done).toBe(false);expect(d.recordedDays).toBe(1);expect(JSON.stringify(d)).not.toContain('私人备注');
  const svg=signSvg({...stats(items,records),...d,start:'2026-11-16',end:'2026-11-16',kind:'day'});expect(svg).toContain('鸡蛋早餐');expect(svg).not.toContain('secret');expect(svg).not.toContain('已撤销的餐');
 });
 it('周签始终生成七天节奏，并区分无安排与完成',()=>{const d=signDetails([],[],'2026-11-16','2026-11-22');expect(d.days).toHaveLength(7);expect(d.days.every(d=>d.percent===null)).toBe(true);expect(d.recordedDays).toBe(0);});
 it('签卡转义用户餐名，历史快照也能渲染',()=>{const svg=signSvg({kind:'day',mealsList:[{title:'<script> & 菜',done:true}],start:'2026-11-16',end:'2026-11-16'});expect(svg).toContain('&lt;script&gt;');expect(svg).not.toContain('<script>');expect(signSvg({kind:'week',start:'2026-11-16',end:'2026-11-22'})).toContain('历史签卡');});
});
describe('食材分类',()=>{it('区分鱼、蔬菜、菌菇与调味，同义词一致',()=>{expect(ingredientCategory('鳕鱼')).toBe('鱼类');expect(ingredientCategory('西红柿')).toBe('蔬菜类');expect(ingredientCategory('香菇')).toBe('菌菇类');expect(ingredientCategory('食用油')).toBe('调味类');expect(ingredientCategory('我的本地特产')).toBe('其他');});});


describe('每份计划的食材来源',()=>{
 it('自动生成放开采购清单，但保留过敏与忌口',()=>{const pref={...defaults,ingredientMode:'only' as const,availableIngredients:['芦笋'],allergens:['fish'],dislikes:['番茄']};const auto=planPreferences(pref,'auto');expect(auto.availableIngredients).toEqual([]);expect(auto.allergens).toEqual(['fish']);expect(auto.dislikes).toEqual(['番茄']);expect(pref.availableIngredients).toEqual(['芦笋']);});
 it('只用此次勾选的食材，切换到做饭场景，不改变常买偏好',()=>{const pref={...defaults,availableIngredients:['鸡蛋','豆腐']};const mine=planPreferences(pref,'my',['鸡蛋']);expect(mine.availableIngredients).toEqual(['鸡蛋']);expect(mine.scene).toBe('home');expect(mine.ingredientMode).toBe('only');expect(pref.availableIngredients).toHaveLength(2);expect(()=>planPreferences(pref,'my',[])).toThrow();});
 it('兼容旧客户端，并提供明确鱼种',()=>{expect(planPreferences(defaults)).toBe(defaults);for(const species of ['三文鱼','鳕鱼']){const recipe=fixtures.find(m=>m.title.includes(species));expect(recipe).toBeTruthy();expect(recipe!.ingredients.some(i=>i.name===species)).toBe(true);expect(recipe!.allergens).toContain('fish');}});
});


describe('多种运动选择',()=>{it('常见运动包含用户指定种类，并按偏好轮换',()=>{expect(workoutKeys).toEqual(expect.arrayContaining(['walk','run','swim','badminton','hike']));expect(workoutSnapshot(['swim','badminton'],0).title).toBe('游泳');expect(workoutSnapshot(['swim','badminton'],1).title).toBe('羽毛球');expect(workoutSnapshot(['swim','badminton'],2).title).toBe('游泳');});it('旧偏好默认散步，未知类型不允许保存',()=>{expect(normalizePreferences({}).workoutTypes).toEqual(['walk']);expect(workoutPreferenceError({workoutDays:[1],workoutTypes:[]})).toBeTruthy();expect(workoutPreferenceError({workoutTypes:['unknown']})).toBeTruthy();expect(workoutPreferenceError({workoutDays:[],workoutTypes:[]})).toBeNull();expect(getWorkout('swim').title).toBe('游泳');});});


describe('通用养成统计',()=>{
 const entry=(date:string,extra:any={})=>({id:date,date,note:'',photos:[],revision:1,...extra});
 it('只按有效记录日期累计，重复、撤销和未来记录不计数',()=>{const p=habitProgress([entry('2026-11-20'),entry('2026-11-20'),entry('2026-11-21',{revokedAt:'x'}),entry('2026-11-23')],'2026-11-22');expect(p.totalDays).toBe(1);expect(p.firstDate).toBe('2026-11-20');});
 it('今天未记时保留连续到昨天的天数，断档不清空累计',()=>{const entries=[entry('2026-11-19'),entry('2026-11-20'),entry('2026-11-21')];expect(habitProgress(entries,'2026-11-22').streak).toBe(3);expect(habitProgress(entries,'2026-11-23').streak).toBe(0);expect(habitProgress(entries,'2026-11-23').totalDays).toBe(3);});
 it('补记填补间断，更正不会增加天数，撤销后重算',()=>{const entries=[entry('2026-11-19'),entry('2026-11-21'),entry('2026-11-22')];expect(habitProgress(entries,'2026-11-22').streak).toBe(2);entries.push(entry('2026-11-20'));expect(habitProgress(entries,'2026-11-22').streak).toBe(4);entries[1].revokedAt='now';expect(habitProgress(entries,'2026-11-22').streak).toBe(1);expect(habitProgress(entries,'2026-11-22').totalDays).toBe(3);});
 it('事项创建日期不会充当坚持天数，并生成正确里程碑',()=>{const h=habitView({title:'摄影',createdAt:'2020-01-01'},[]);expect(h.progress.totalDays).toBe(0);expect(h.progress.firstDate).toBeNull();const entries=Array.from({length:7},(_,i)=>entry(addDays('2026-11-16',i)));expect(habitProgress(entries,'2026-11-22').milestone).toBe(7);expect(habitProgress(entries,'2026-11-22').nextMilestone).toBe(30);});
 it('记录支持任意事项，拒绝空名、无效日期和重复照片',()=>{expect(habitInputError({title:'练吉他',icon:'music',color:'sage'},true)).toBeNull();expect(habitInputError({title:' '},true)).toBeTruthy();expect(habitEntryError('2026-11-23',{expectedRevision:0},'2026-11-22')).toBeTruthy();expect(habitEntryError('2026-02-30',{expectedRevision:0},'2026-11-22')).toBeTruthy();expect(habitEntryError('2026-11-22',{expectedRevision:0,photos:['a','a']},'2026-11-22')).toBeTruthy();});
 it('坚持签默认不带私人成果，勾选后转义文字，不含照片地址',()=>{const h={title:'<阅读>',color:'blue',progress:habitProgress([entry('2026-11-22')],'2026-11-22'),entries:[entry('2026-11-22',{note:'私人文字<script>',photos:['secret-photo']})]};expect(habitSignSvg(h)).not.toContain('私人文字');expect(habitSignSvg(h,true)).toContain('&lt;script&gt;');expect(habitSignSvg(h,true)).not.toContain('secret-photo');expect(habitSignSvg(h)).toContain('&lt;阅读&gt;');});
});
