export async function renderSvgPng(svg:string,width=1170,height=2256){
 await document.fonts.ready;const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d')!.drawImage(img,0,0,width,height);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
}
