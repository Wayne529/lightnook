import {signSvg} from '../../api/src/sign-design';
import {renderSvgPng} from './sign-export';
export async function renderOfflineSign(s:any,photo?:string){return renderSvgPng(signSvg(s,photo));}
