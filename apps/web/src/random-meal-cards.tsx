import {useEffect,useState} from 'react';
import {Plate} from './ui';
export function RandomMealCards({meals,active}:{meals:any[];active:boolean}){
 const [face,setFace]=useState(0),choices=meals.slice(0,6);
 useEffect(()=>{if(!active||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setFace(n=>n+1),240);return()=>clearInterval(timer);},[active]);
 return <><div className={`random-stage ${active?'is-drawing':''}`} aria-label="随机抽餐卡片" aria-busy={active}>
  {[0,1,2].map((n)=><div className={`random-meal-card card-${n}`} key={n} aria-hidden="true"><span className="random-card-corner">LIGHTNOOK</span><div className="random-card-art"><Plate meal={choices[(face+n)%Math.max(choices.length,1)]} kind={choices[(face+n)%Math.max(choices.length,1)]?.art}/></div><span className="random-card-caption">{n===2?'A LITTLE SURPRISE':'ROOM FOR EVERYDAY'}</span></div>)}
  <span className="random-spark spark-one">✦</span><span className="random-spark spark-two">✧</span>
 </div><p className="tiny center random-live" role="status" aria-live="polite">{active?'正在挑选你的这一餐…':'轻轻一抽，给这一餐一点惊喜。'}</p></>;
}
