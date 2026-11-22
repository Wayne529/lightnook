import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Camera,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {api} from './api';
import {Sheet} from './ui';
function Photo({id,alt,preview=false}:{id:string;alt:string;preview?:boolean}){
 const [failed,setFailed]=useState(false);
 const q=useQuery({queryKey:['photo',id],queryFn:()=>api('/media/'+id+'/access'),staleTime:60000});
 useEffect(()=>setFailed(false),[q.data?.url]);
 if(q.error||failed)return <span className="photo-error"><Camera size={22}/><span>照片暂时无法显示</span>{preview?<button type="button" className="text-button" onClick={()=>{setFailed(false);q.refetch();}}>重试加载</button>:<span>点按查看</span>}</span>;
 return q.data?.url?<img className={preview?'photo-full':''} src={q.data.url} alt={alt} onError={()=>setFailed(true)}/>:<span className="photo-loading" role="status"><Camera size={24}/><small>加载中</small></span>;
}
export function PhotoGallery({photos,onRemove}:{photos:string[];onRemove:(id:string)=>void}){
 const [selected,setSelected]=useState<string|null>(null),index=photos.indexOf(selected||''),open=!!selected&&index>=0;
 if(!photos.length)return null;
 const next=(delta:number)=>setSelected(photos[(index+delta+photos.length)%photos.length]);
 return <><div className="photo-grid" aria-label="已添加的餐食照片">{photos.map((id,i)=><div className="photo-thumb" key={id}><button type="button" className="photo-open" aria-label={'预览第'+(i+1)+'张照片'} onClick={()=>setSelected(id)}><Photo id={id} alt={'餐食照片'+(i+1)}/></button><button type="button" className="photo-remove" aria-label={'移除第'+(i+1)+'张照片'} onClick={()=>onRemove(id)}><X size={16}/></button></div>)}</div><p className="tiny">点击照片放大查看 · 可单独移除</p>{open&&<Sheet title={`餐食照片 ${index+1} / ${photos.length}`} onClose={()=>setSelected(null)}><div className="photo-preview" tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft')next(-1);if(e.key==='ArrowRight')next(1);}}><Photo id={selected!} alt={`餐食照片${index+1}放大预览`} preview/></div>{photos.length>1&&<div className="photo-preview-controls"><button className="icon-button" type="button" aria-label="上一张照片" onClick={()=>next(-1)}><ChevronLeft/></button><span className="tiny">{index+1} / {photos.length}</span><button className="icon-button" type="button" aria-label="下一张照片" onClick={()=>next(1)}><ChevronRight/></button></div>}<button className="text-button full" type="button" onClick={()=>{onRemove(selected!);setSelected(null);}}>移除这张照片</button></Sheet>}</>;
}
