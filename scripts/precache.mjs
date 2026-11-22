import {readdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const dir=resolve('apps/web/dist-offline');
const files=['index.html',...readdirSync(resolve(dir,'assets')).map(f=>'assets/'+f)];
const hash=createHash('sha256');
for(const file of files)hash.update(file).update(readFileSync(resolve(dir,file)));
const version=hash.digest('hex').slice(0,12);
writeFileSync(resolve(dir,'sw.js'),`
const SCOPE=self.registration.scope;
const PREFIX='lightnook-'+encodeURIComponent(SCOPE)+'-';
const NAME=PREFIX+'${version}';
const INDEX=new URL('index.html',SCOPE).href;
const FILES=${JSON.stringify(['.',...files])}.map(file=>new URL(file,SCOPE).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||!e.request.url.startsWith(SCOPE))return;
 e.respondWith(caches.open(NAME).then(async cache=>(await cache.match(e.request))||fetch(e.request).catch(()=>e.request.mode==='navigate'?cache.match(INDEX):Response.error())));
});
`);
