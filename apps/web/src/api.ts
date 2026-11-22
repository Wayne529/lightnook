import {isOffline} from './mode';
import {offlineApi} from './offline';
export class ApiError extends Error { constructor(public status:number,public code:string,message:string){super(message);} }
let csrf:string|undefined;let csrfPromise:Promise<any>|undefined;
export async function initCsrf(){if(isOffline())return {token:'offline',devAuth:true,offline:true};if(!csrfPromise)csrfPromise=fetch('/api/v1/auth/csrf',{credentials:'same-origin'}).then(r=>r.json()).then(r=>{const data=r.data??r;csrf=data.token;return data;}).catch(e=>{csrfPromise=undefined;throw e;});return csrfPromise;}
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
  if(isOffline())return offlineApi(path,options);
  const method=options.method||'GET';if(!['GET','HEAD'].includes(method))await initCsrf();
  const res=await fetch('/api/v1'+path,{credentials:'same-origin',...options,headers:{...(!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...options.headers}});
  const body=await res.json().catch(()=>null);if(!res.ok){const message=body?.error?.message;throw new ApiError(res.status,body?.error?.code||'REQUEST_FAILED',Array.isArray(message)?message.join('；'):message||'连接暂时中断，请稍后再试');}
  return body?.data??body;
}
export const send=<T=any>(path:string,body:unknown={},method='POST',key=crypto.randomUUID())=>api<T>(path,{method,body:JSON.stringify(body),headers:{'Idempotency-Key':key}});
export const localDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const addDays=(date:string,n:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const weekStart=(date:string)=>{const day=new Date(date+'T12:00:00Z').getUTCDay();return addDays(date,-((day+6)%7));};
export const slots:Record<string,string>={breakfast:'早餐',lunch:'午餐',dinner:'晚餐',workout:'运动'};
export const allergies:Record<string,string>={peanut:'花生',milk:'乳制品',egg:'鸡蛋',soy:'大豆',fish:'鱼类',shellfish:'甲壳类',gluten:'含麸质谷物',nuts:'坚果'};
