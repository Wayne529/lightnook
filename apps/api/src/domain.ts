export type Preferences = { scene: string; minutes: number; budget: number; allergens: string[]; dislikes: string[]; workoutDays: number[]; availableIngredients: string[]; preferredIngredients: string[]; ingredientMode: 'prefer'|'only' };
export const defaults: Preferences = { scene: 'mixed', minutes: 30, budget: 3000, allergens: [], dislikes: [], workoutDays: [1, 2, 4, 6, 0], availableIngredients: [], preferredIngredients: [], ingredientMode: 'prefer' };
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const weekStart = (date: string) => addDays(date, -((weekday(date) + 6) % 7));
export function isDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export type MealChoice = {kind:string;minutes:number;costCents:number;title:string;allergens:string[];allergenKnown:boolean;ingredients?:unknown};
const aliases:Record<string,string>={'西红柿':'番茄','马铃薯':'土豆','菜花':'花菜','卷心菜':'包菜'};
export function ingredientKey(name:string){const key=name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();return aliases[key]||key;}
export function ingredientNames(meal:MealChoice):string[]{return Array.isArray(meal.ingredients)?meal.ingredients.filter(i=>i&&typeof i.name==='string').map(i=>i.name):[];}
export function ingredientPreferenceError(value:any):string|null{
  for(const key of ['availableIngredients','preferredIngredients'])if(value[key]!==undefined&&(!Array.isArray(value[key])||value[key].length>60||value[key].some((s:unknown)=>typeof s!=='string'||!s.trim()||s.trim().length>20)))return '食材名称请填写 1–20 个字，每组最多 60 项';
  if(value.dislikes!==undefined&&(!Array.isArray(value.dislikes)||value.dislikes.length>10||value.dislikes.some((s:unknown)=>typeof s!=='string'||!s.trim()||s.trim().length>20)))return '不吃的食材最多 10 项，每项 1–20 个字';
  if(value.ingredientMode!==undefined&&!['prefer','only'].includes(value.ingredientMode))return '请选择有效的食材使用方式';
  if(value.ingredientMode==='only'&&!value.availableIngredients?.length)return '只用已选食材时，请先选择常买得到的食材';
  return null;
}
export function normalizePreferences(value:Partial<Preferences>):Preferences{
  const result={...defaults,...Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined))} as Preferences;
  for(const key of ['availableIngredients','preferredIngredients','dislikes'] as const)result[key]=[...new Map(result[key].map(s=>[ingredientKey(s),s.trim()])).values()];
  return result;
}
export function ingredientFit(meal:MealChoice,pref:Preferences){
  const names=ingredientNames(meal).map(ingredientKey),available=new Set((pref.availableIngredients||[]).map(ingredientKey));
  const missing=meal.kind==='HOME'&&available.size?names.filter(n=>!available.has(n)):[];
  const liked=names.filter(n=>(pref.preferredIngredients||[]).some(p=>ingredientKey(p)===n)).length;
  const coverage=meal.kind==='HOME'&&available.size&&names.length?(names.length-missing.length)/names.length:0;
  return {missing,liked,coverage};
}
export function eligible(meal:MealChoice,pref:Preferences,slot?:string,scene?:string){
  if(pref.allergens.length&&(!meal.allergenKnown||pref.allergens.some(a=>meal.allergens.includes(a))))return false;
  const names=ingredientNames(meal);
  if(pref.dislikes.some(d=>[meal.title,...names].some(n=>ingredientKey(n).includes(ingredientKey(d)))))return false;
  if(meal.kind==='HOME'&&pref.ingredientMode==='only'&&(!pref.availableIngredients?.length||!names.length||ingredientFit(meal,pref).missing.length))return false;
  if(meal.minutes>pref.minutes||meal.costCents>pref.budget)return false;
  const target=scene||pref.scene;
  if(target==='home'&&meal.kind!=='HOME')return false;
  if(target==='outside'&&meal.kind!=='OUTSIDE')return false;
  return true;
}
export function rankMeals<T extends MealChoice>(meals:T[],pref:Preferences):T[]{
  return [...meals].sort((a,b)=>{const x=ingredientFit(a,pref),y=ingredientFit(b,pref);return y.coverage-x.coverage||y.liked-x.liked;});
}
// Auto plans and draw pools keep the best available-ingredient coverage for home cooking.
// Eating-out choices remain independent of the user's shopping list.
export function cookingPool<T extends MealChoice>(meals:T[],pref:Preferences):T[]{
  const ranked=rankMeals(meals,pref);
  if(!pref.availableIngredients?.length)return ranked;
  const home=ranked.filter(m=>m.kind==='HOME');
  const best=Math.max(0,...home.map(m=>ingredientFit(m,pref).coverage));
  return ranked.filter(m=>m.kind!=='HOME'||ingredientFit(m,pref).coverage===best);
}
export function mealReason(meal:MealChoice,pref:Preferences){
  const fit=ingredientFit(meal,pref);
  if(meal.kind==='HOME'&&pref.availableIngredients?.length){
    if(!ingredientNames(meal).length)return '配料未录入，采购匹配待确认';
    if(fit.missing.length)return '常买食材优先 · 仍需准备：'+fit.missing.join('、');
    return '食材都在你的常买清单里';
  }
  if(fit.liked)return '含有你更喜欢的食材';
  return meal.minutes<=15?'简单快手，忙碌时也从容':'符合你的时间与预算';
}
export function planPreferences(pref:Preferences,source?:'my'|'auto',ingredients?:string[]):Preferences{
  if(source===undefined)return pref;
  if(source==='auto')return {...pref,availableIngredients:[],ingredientMode:'prefer'};
  if(source!=='my')throw new Error('请选择计划生成方式');
  const names=ingredients??pref.availableIngredients;
  const issue=ingredientPreferenceError({availableIngredients:names,ingredientMode:'only'});if(issue)throw new Error(issue);
  return normalizePreferences({...pref,scene:'home',ingredientMode:'only',availableIngredients:names});
}
export function stats(items: any[], records: any[]) {
  const active = records.filter(r => !r.revokedAt);
  const scheduled = items.filter(i => i.disposition === 'SCHEDULED');
  const completed = scheduled.filter(i => active.some(r => r.itemId === i.id)).length;
  return { completed, eligible: scheduled.length, excused: items.length - scheduled.length, percent: scheduled.length ? Math.round(completed / scheduled.length * 100) : null,
    meals: active.filter(r => r.type === 'MEAL').length, workouts: active.filter(r => r.type === 'WORKOUT').length,
    minutes: active.filter(r => r.type === 'WORKOUT').reduce((n, r) => n + Number(r.actual.minutes || 0), 0) };
}
export function groceries(items: any[]) {
  const map = new Map<string, any>();
  for (const item of items.filter(i => i.slot !== 'workout')) for (const ingredient of item.snapshot.ingredients || []) {
    const key = `${ingredient.name}|${ingredient.unit}|${ingredient.basis}`;
    const old = map.get(key);
    map.set(key, { ...ingredient, key, quantity: (old?.quantity || 0) + ingredient.quantity, checked: false, needsReview: false });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
export function reconcileGroceries(previous: any[], next: any[]) {
  return next.map(n => { const p = previous.find(p => p.key === n.key); return { ...n, checked: !!p?.checked, needsReview: !!p?.checked && n.quantity > p.quantity }; });
}
