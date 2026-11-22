import {signSvg} from '../../api/src/sign-design';
export async function renderOfflineSign(s:any,photo?:string){
 await document.fonts.ready;
 const svg=signSvg(s,photo),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=1170;canvas.height=2256;canvas.getContext('2d')!.drawImage(image,0,0,1170,2256);return canvas.toDataURL('image/png');}
 finally{URL.revokeObjectURL(url);}
}
