import {spawnSync} from 'node:child_process';
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),runtime=resolve(root,'../work/lightnook-runtime');
mkdirSync(runtime,{recursive:true});
function run(bin,args,allowFail=false){const r=spawnSync(bin,args,{stdio:'inherit'});if(r.status&&!allowFail)throw new Error(`${bin} failed (${r.status})`);return r.status;}
const pg=resolve(runtime,'pgdata');
if(process.argv[2]==='stop'){
 if(existsSync(resolve(pg,'postmaster.pid')))run('pg_ctl',['-D',pg,'stop','-m','fast'],true);
 const conf=resolve(runtime,'redis.conf');if(existsSync(conf))run('redis-cli',['-p','56386','shutdown'],true);
 process.exit(0);
}
if(!existsSync(resolve(root,'.env'))){writeFileSync(resolve(root,'.env'),`NODE_ENV=development\nPORT=3100\nWEB_ORIGIN=http://localhost:5173\nDATABASE_URL=postgresql://lightnook@127.0.0.1:55436/lightnook\nREDIS_URL=redis://127.0.0.1:56386\nDEV_AUTH=true\nMEDIA_DIR=${resolve(runtime,'media')}\nMEDIA_SIGNING_SECRET=${randomBytes(32).toString('hex')}\n`);}
if(!existsSync(resolve(pg,'PG_VERSION')))run('initdb',['-D',pg,'-U','lightnook','-A','trust','-E','UTF8','--no-locale']);
if(!existsSync(resolve(pg,'postmaster.pid'))){run('pg_ctl',['-D',pg,'-l',resolve(runtime,'postgres.log'),'-o',`-p 55436 -h 127.0.0.1 -k "${runtime}"`,'start']);}
const check=spawnSync('psql',['-h','127.0.0.1','-p','55436','-U','lightnook','postgres','-tAc',"SELECT 1 FROM pg_database WHERE datname = 'lightnook'"]);
if(!check.stdout?.toString().trim())run('createdb',['-h','127.0.0.1','-p','55436','-U','lightnook','lightnook']);
const pidfile=resolve(runtime,'redis.pid');
if(!existsSync(pidfile)){
 const conf=`bind 127.0.0.1\nport 56386\ndir ${runtime}\npidfile ${pidfile}\nlogfile ${resolve(runtime,'redis.log')}\ndaemonize yes\nappendonly yes\nmaxmemory-policy noeviction\n`;
 writeFileSync(resolve(runtime,'redis.conf'),conf);run('redis-server',[resolve(runtime,'redis.conf')]);
}
console.log('LightNook local services: PostgreSQL :55436 / Redis :56386 (project-owned data).');
