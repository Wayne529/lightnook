import sharp from 'sharp';
import {signSvg} from './sign-design';
export async function renderSign(s:any,photo?:Buffer){
 const image=photo?await sharp(photo).resize(1062,642,{fit:'cover'}).jpeg({quality:90}).toBuffer():null;
 return sharp(Buffer.from(signSvg(s,image?'data:image/jpeg;base64,'+image.toString('base64'):undefined)),{limitInputPixels:10000000}).resize(1170,2256).png().toBuffer();
}
