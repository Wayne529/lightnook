import {mealArtwork} from './meal-art';
import {Children,isValidElement,useEffect,useLayoutEffect,useRef,useState,createContext,useContext,useCallback,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {House,Sprout,Utensils,CalendarDays,UserRound,ChevronLeft,X,Check,ArrowUpRight,LoaderCircle,Plus} from 'lucide-react';
import {api,ApiError} from './api';
const ToastContext=createContext<(message:string)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}){const [message,setMessage]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const toast=useCallback((s:string)=>{setMessage(s);clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),4000);},[]);return <ToastContext.Provider value={toast}>{children}{message&&<div className="toast" role="status"><Check size={19}/><span>{message}</span><button onClick={()=>setMessage('')} aria-label="关闭提示"><X size={17}/></button></div>}</ToastContext.Provider>;}
export const useToast=()=>useContext(ToastContext);
export const useMe=()=>useQuery({queryKey:['me'],queryFn:()=>api('/me'),retry:false,staleTime:30000});
export function useAction(fn:(...args:any[])=>Promise<any>,done?:(value:any)=>void){const [busy,setBusy]=useState(false),toast=useToast(),qc=useQueryClient();const run=async(...args:any[])=>{if(busy)return;setBusy(true);try{const value=await fn(...args);await qc.invalidateQueries();done?.(value);return value;}catch(e){toast(e instanceof Error?e.message:'操作没有完成，请重试');}finally{setBusy(false);}};return {run,busy};}
export function Brand(){return <span className="brand"><img className="brand-mark" src={import.meta.env.BASE_URL+'brand/lightnook-mark.svg'} width="36" height="36" alt="" aria-hidden="true"/><span>轻有间</span></span>;}
export function Header({title,right,back=true}:{title?:string;right?:ReactNode;back?:boolean}){const nav=useNavigate();return <header className={`topbar ${back?'has-back':''} ${right?'has-action':''}`}>{back?<button className="icon-button" onClick={()=>history.length>1?nav(-1):nav('/')} aria-label="返回"><ChevronLeft/></button>:<Brand/>}{title&&<span className="topbar-title">{title}</span>}<div className="topbar-right">{back&&<Link className="icon-button" to="/" aria-label="返回首页" title="返回首页"><House size={20}/></Link>}{right}</div></header>;}
export function Nav(){const entries=[['/','今日',House],['/eat','吃什么',Utensils],['/grow','养成',Sprout],['/calendar','日历',CalendarDays],['/profile','我的',UserRound]] as const;const p=useLocation().pathname;return <nav className="bottom-nav" aria-label="主导航">{entries.map(([url,label,Icon])=><Link key={url} to={url} className={(url==='/'?p==='/':p.startsWith(url))?'active':''}><span><Icon size={21}/></span><small>{label}</small></Link>)}</nav>;}
const FooterContext=createContext<HTMLElement|null>(null);
export function PageFooter({children,className=''}:{children:ReactNode;className?:string}){
  const target=useContext(FooterContext);
  return target?createPortal(<div className={`page-actions ${className}`}>{children}</div>,target):null;
}
export function Page({children,nav=false,className=''}:{children:ReactNode;nav?:boolean;className?:string}){
  const [footer,setFooter]=useState<HTMLDivElement|null>(null);
  const main=useRef<HTMLElement>(null);
  const location=useLocation();
  const nodes=Children.toArray(children);
  const isHeader=(node:ReactNode)=>isValidElement(node)&&node.type===Header;
  useLayoutEffect(()=>{if(main.current)main.current.scrollTop=0;},[location.pathname,location.search]);
  return <FooterContext.Provider value={footer}><div className={`page ${nav?'with-nav':''} ${className}`}>
    {nodes.filter(isHeader)}
    <main ref={main} className="page-main" aria-label="主内容区" tabIndex={0}>{nodes.filter(node=>!isHeader(node))}</main>
    <div className="page-footer" ref={setFooter}/>
    {nav&&<Nav/>}
  </div></FooterContext.Provider>;
}
export function Button({children,busy=false,secondary=false,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{busy?:boolean;secondary?:boolean}){return <button {...props} disabled={props.disabled||busy} className={`button ${secondary?'secondary':''} ${props.className||''}`}>{busy?<LoaderCircle className="spin" size={20}/>:children}</button>;}
export function Section({title,action}:{title:string;action?:ReactNode}){return <div className="section-heading"><h2>{title}</h2>{action}</div>;}
export function Loading(){return <div className="loading" role="status"><LoaderCircle className="spin"/><span>正在把日常安排好…</span></div>;}
export function ErrorState({error,retry}:{error:unknown;retry?:()=>void}){return <div className="empty"><h2>稍等，我们重新连接。</h2><p>{error instanceof Error?error.message:'网络暂时不可用'}</p>{retry&&<Button secondary onClick={retry}>再试一次</Button>}</div>;}
export function Sheet({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const el=ref.current;el?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el?.close();document.body.style.overflow=overflow;};},[]);return <dialog ref={ref} className="sheet" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="sheet-handle"/><header><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X/></button></header><div className="sheet-content">{children}</div></dialog>;}
export function Plate({kind='chicken',className='',meal}:{kind?:string;className?:string;meal?:any}){const src=mealArtwork(meal);if(src)return <img className={`plate ${className}`} src={src} alt={meal.title+'餐食插画'} loading="lazy"/>;return <svg className={`plate ${className}`} viewBox="-85 -85 170 170" aria-label={meal?'通用餐食插画':'餐食插画'} role="img"><circle r="79" fill="#FBF8F1"/><circle r="64" fill="none" stroke="#DCD8CD"/>{kind==='breakfast'?<><circle r="49" fill="#D5C7B3"/><circle r="42" fill="#F0E5D2"/>{[[-19,-20],[10,-15],[22,8],[-8,20],[-27,4]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="7" fill="#78838C"/>)}<path d="M-30-9l7 4m13 1 7 2m-6 28 5-2m12-12 7 3" stroke="#B19874" strokeWidth="3"/></>:kind==='tofu'?<>{[[-26,-22],[5,-29],[24,-5],[-12,9],[13,25]].map(([x,y],i)=><g key={i}><rect x={x-11} y={y-10} width="24" height="21" rx="4" fill="#E7D4AC"/><path d={`M${x-6} ${y-5}l10 9`} stroke="#C7AA7E"/></g>)}{[[-40,18],[34,22],[-24,37]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="10" fill="#BD8168"/>)}<path d="M-33-34c8-10 14-8 20-3M-2 43l17-6" stroke="#7C8C69" strokeWidth="4"/></>:<><path d="M-12-43C15-57 47-40 48-18 40 1 12 8-8-9Z" fill={kind==='salmon'?'#CD9A78':'#BE9878'}/>{[0,1,2,3].map(i=><path key={i} d={`M${2+i*9}-39l-11 31`} stroke={kind==='salmon'?'#EDC1A0':'#9D795D'} strokeWidth="2"/>)}{[[-30,15,22],[-4,28,19],[21,27,19]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} fill="#DBCAAA"/>)}{[[-37,-29],[-48,-8],[-46,39]].map(([x,y],i)=><ellipse key={i} cx={x} cy={y} rx="17" ry="12" transform={`rotate(-28 ${x} ${y})`} fill="#7B8C69"/>)}<circle cx="38" cy="17" r="11" fill="#B47862"/><circle cx="31" cy="43" r="9" fill="#C28D72"/></>}</svg>;}
export function Plant(){return <svg className="plant" viewBox="0 0 120 170" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M24 154C53 119 61 72 67 12M45 125C9 121 5 95 7 84 35 90 48 104 45 125ZM56 92C84 94 103 74 107 55 80 57 62 73 56 92ZM62 60C39 52 35 33 39 17 61 26 68 43 62 60ZM66 33C82 27 85 12 82 1 67 7 62 21 66 33Z"/></svg>;}
export function MealCard({meal,onClick,detail}:{meal:any;onClick?:()=>void;detail?:string}){return <button className="meal-card" onClick={onClick}><Plate kind={meal.art} meal={meal}/><span><h3>{meal.title}</h3><p>{meal.minutes} 分钟 · {meal.kind==='OUTSIDE'?'外食参考':'自己做'}</p><small>{detail||meal.reason||'一份刚刚好的满足'}</small></span><ArrowUpRight size={17}/></button>;}
export function Choice({selected,children,onClick}:{selected:boolean;children:ReactNode;onClick:()=>void}){return <button type="button" className={`chip ${selected?'selected':''}`} aria-pressed={selected} onClick={onClick}>{children}</button>;}
