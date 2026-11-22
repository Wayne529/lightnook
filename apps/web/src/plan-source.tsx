import {useQuery} from '@tanstack/react-query';
import {api} from './api';
import {Choice,Section} from './ui';
import {eligible,planPreferences,type Preferences} from '../../api/src/domain';
import {ingredientCategory,ingredientGroups} from '../../api/src/ingredients';
export function PlanSource({preferences,source,ingredients,onSource,onIngredients}:{preferences:Preferences;source:'my'|'auto';ingredients:string[];onSource:(s:'my'|'auto')=>void;onIngredients:(names:string[])=>void}){
 const meals=useQuery({queryKey:['ingredient-catalog'],queryFn:()=>api('/meals')});
 let counts:number[]=[];if(source==='my'&&ingredients.length){const pref=planPreferences(preferences,source,ingredients);counts=['breakfast','lunch','dinner'].map(slot=>(meals.data||[]).filter((m:any)=>m.slots.includes(slot)&&eligible(m,pref)).length);}
 return <section className="plan-source"><Section title="这份餐单，怎么安排？"/><div className="choices"><Choice selected={source==='my'} onClick={()=>onSource('my')}>用我的食材</Choice><Choice selected={source==='auto'} onClick={()=>onSource('auto')}>交给程序搭配</Choice></div>
 {source==='auto'?<p className="notice">按你的时间、预算和口味自动搭配，不受常买食材清单限制。过敏与忌口仍然保留。</p>:<><p className="tiny">勾选这次想用的食材，只安排自己做饭的餐单；配料须全部匹配，含调味品。此次选择不会修改你的常买清单。</p>{preferences.availableIngredients.length?<><div className="inline"><button type="button" className="text-button" onClick={()=>onIngredients([...preferences.availableIngredients])}>全选</button><button type="button" className="text-button" onClick={()=>onIngredients([])}>清空</button></div>{ingredientGroups.map(([category])=>{const names=preferences.availableIngredients.filter(n=>ingredientCategory(n)===category);return names.length?<div key={category}><p className="tiny">{category}</p><div className="tag-grid">{names.map(name=><Choice key={name} selected={ingredients.includes(name)} onClick={()=>onIngredients(ingredients.includes(name)?ingredients.filter(n=>n!==name):[...ingredients,name])}>{name}</Choice>)}</div></div>:null;})}<p className="notice" role="status">已选 {ingredients.length} 项。{counts.length?`可配早餐 ${counts[0]} 份 · 午餐 ${counts[1]} 份 · 晚餐 ${counts[2]} 份。`:''}{counts.some(n=>!n)?'部分餐次暂无匹配，请增加食材或改由程序搭配。':''}</p></>:<p className="notice">先在上方“常买得到的食材”中添加食材，再回来勾选。</p>}</>}
 </section>;
}
