import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from './api';
import {Button,Choice,Section} from './ui';
import {eligible,ingredientKey,ingredientNames,type Preferences} from '../../api/src/domain';

const groups=[
  ['蛋白质',['鸡胸肉','鸡蛋','豆腐','牛肉','鱼肉','鲜虾']],
  ['主食',['糙米饭','面条','燕麦','全麦吐司','红薯','小米']],
  ['蔬果',['西兰花','番茄','蔬菜','水果','土豆','胡萝卜','南瓜','香菇','白菜','彩椒']],
  ['奶豆与调味',['原味酸奶','豆乳','牛奶','食用油','盐','酱油']],
] as const;

function IngredientPicker({id,title,description,value,onChange,catalog}:{id:string;title:string;description:string;value:string[];onChange:(names:string[])=>void;catalog:string[]}){
  const [text,setText]=useState(''),[expanded,setExpanded]=useState(false),[error,setError]=useState('');
  const has=(name:string)=>value.some(v=>ingredientKey(v)===ingredientKey(name));
  const toggle=(name:string)=>{setError('');if(has(name))onChange(value.filter(v=>ingredientKey(v)!==ingredientKey(name)));else if(value.length>=60)setError('最多添加 60 项食材');else onChange([...value,name]);};
  const add=()=>{const name=text.trim();if(!name||name.length>20){setError('请输入 1–20 个字的食材名');return;}if(!has(name))toggle(name);setText('');};
  return <section className="ingredient-picker" aria-labelledby={id+'-heading'}>
    <h3 id={id+'-heading'}>{title}<small>{value.length} 项</small></h3><p className="tiny">{description}</p>
    <div className="tag-grid ingredient-selected">{value.length?value.map(name=><button className="chip selected" type="button" key={name} aria-label={'移除'+title+'：'+name} onClick={()=>toggle(name)}>{name} ×</button>):<span className="tiny">尚未选择</span>}</div>
    <label htmlFor={id+'-input'} className="field-label">搜索或添加食材</label>
    <div className="inline"><input id={id+'-input'} value={text} maxLength={20} placeholder="输入食材名，例如：番茄" onChange={e=>{setText(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();add();}}}/><Button type="button" secondary onClick={add}>添加</Button></div>
    {error&&<p className="tiny danger" role="alert">{error}</p>}
    <button type="button" className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'收起常见食材':'从常见食材中选择'}</button>
    {(expanded||text.trim())&&<div className="ingredient-suggestions">{groups.map(([group,names])=>{const options=[...new Set([...names,...(group==='蔬果'?catalog.filter(n=>!groups.some(([,g])=>(g as readonly string[]).includes(n))):[])])].filter(n=>!text.trim()||ingredientKey(n).includes(ingredientKey(text)));return options.length?<div key={group}><p className="tiny">{group}</p><div className="tag-grid">{options.map(name=><Choice key={name} selected={has(name)} onClick={()=>toggle(name)}>{name}</Choice>)}</div></div>:null;})}</div>}
  </section>;
}

export function IngredientPreferences({value,onChange}:{value:Preferences;onChange:(key:'availableIngredients'|'preferredIngredients'|'ingredientMode',value:any)=>void}){
  const meals=useQuery({queryKey:['ingredient-catalog'],queryFn:()=>api('/meals')});
  const catalog=[...new Set<string>((meals.data||[]).flatMap((m:any)=>ingredientNames(m)))];
  const counts=['breakfast','lunch','dinner'].map(slot=>(meals.data||[]).filter((m:any)=>m.slots.includes(slot)&&eligible(m,value)).length);
  return <><Section title="把常买的食材，放进日常"/><p className="tiny">选择你平时买得到的食材，也可以自己添加。清单不是库存，不需要每天重新勾选。</p>
    <IngredientPicker id="available-ingredients" title="常买得到的食材" description="按本地超市、菜市场或自己的采购习惯选择；调味品也请按实际情况添加。" value={value.availableIngredients} onChange={names=>onChange('availableIngredients',names)} catalog={catalog}/>
    <div className="choices"><Choice selected={value.ingredientMode==='prefer'} onClick={()=>onChange('ingredientMode','prefer')}>优先使用</Choice><Choice selected={value.ingredientMode==='only'} onClick={()=>onChange('ingredientMode','only')}>只用已选食材</Choice></div>
    <p className="tiny">{value.ingredientMode==='only'?'做饭只推荐配料都在清单里的餐单（含调味品）；未录入配料的餐单不会自动入选。':'优先用常买食材配餐；不足时可能需要补买，会在推荐理由里标明。未选择时不限制。'}外食不受采购清单限制，过敏和忌口仍然生效。</p>
    <IngredientPicker id="preferred-ingredients" title="更喜欢的食材" description="符合其他条件时，含这些食材的餐单会排在前面；不会覆盖过敏或不吃的食材设置。" value={value.preferredIngredients} onChange={names=>onChange('preferredIngredients',names)} catalog={catalog}/>
    {meals.data&&<p className="notice" role="status">当前条件可选：早餐 {counts[0]} 份 · 午餐 {counts[1]} 份 · 晚餐 {counts[2]} 份。{counts.some(n=>!n)?'部分餐次暂无匹配，可增加常买食材或改为优先使用。':''}</p>}
    <p className="tiny">保存后用于新计划、推荐、换餐与抽餐；已生成的餐单不会自动改动。自定义名称用于匹配已录入的菜谱，不会自动生成新配方或替换原料。</p>
  </>;
}
