import {spawn,spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);process.env.PATH=dirname(process.execPath)+':'+process.env.PATH;
if(Number(process.versions.node.split('.')[0])!==22||Number(process.versions.node.split('.')[1])<12)throw new Error('Use the Node.js LTS version in .nvmrc (22.12+).');
for(const args of [['scripts/infra.mjs','start']]){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status)process.exit(r.status);}
const children=[];
function start(cmd,args){const p=spawn(cmd,args,{stdio:'inherit',cwd:root,env:process.env});children.push(p);return p;}
const build=spawnSync('pnpm',['--filter','@lightnook/api','build'],{stdio:'inherit'});if(build.status)process.exit(build.status);
start(process.execPath,['--watch','apps/api/dist/main.js']);
start(process.execPath,['--watch','apps/api/dist/worker.js']);
start('pnpm',['--filter','@lightnook/api','exec','tsc','--watch','-p','tsconfig.json']);
start('pnpm',['--filter','@lightnook/web','dev']);
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{children.forEach(c=>c.kill('SIGTERM'));process.exit(0);});
