// Isolated reproduction of the actual SDK Jiti reload boundary. Never uses live locks.
import fs from 'node:fs/promises';import path from 'node:path';import{pathToFileURL}from'node:url';
const base=process.argv[2],liveUtil=process.argv[3],sdk=process.argv[4];if(!base||!liveUtil||!sdk)throw Error('usage: node probe-native-reload.mjs <backup-root> <live-util.js> <pi-coding-agent-root>');
const {createJiti}=await import(pathToFileURL(path.join(sdk,'dist/core/extensions/jiti-static-loader.js')).href);
const old=await fs.readFile(path.join(base,'package-before/src/util.js'),'utf8');
const patched=await fs.readFile(liveUtil,'utf8');
const owner=JSON.parse(await fs.readFile(path.join(base,'session-before/.owner-lock/owner.json'),'utf8'));
const entry="import {acquireLock} from './util.js';export default ()=>acquireLock;";
const outcomes=[];
for(const forced of [false,true]){
 const root=await fs.mkdtemp(path.join(base,'reload-fixture-'));await fs.cp(path.join(base,'package-before/src'),root,{recursive:true});await fs.writeFile(path.join(root,'package.json'),'{"type":"module"}');await fs.writeFile(path.join(root,'entry.js'),entry);await fs.writeFile(path.join(root,'util.js'),old);
 const work=path.join(root,'lock-fixture');await fs.mkdir(path.join(work,'.owner-lock'),{recursive:true});await fs.writeFile(path.join(work,'.owner-lock/owner.json'),JSON.stringify(owner));
 const get=async file=>{const j=createJiti(import.meta.url,{moduleCache:false,...(forced?{tryNative:false}:{})});return(await j.import(path.join(root,file),{default:true}))();};
 const check=async fn=>{const hasFix=fn.toString().includes('lock retained');try{const release=await fn(work,{ownerSession:'isolated'});await release();return{hasFix,ok:true};}catch(e){return{hasFix,ok:false,error:e.code||e.message};}};
 const before=await check(await get('entry.js'));await fs.writeFile(path.join(root,'util.js'),patched);
 const reloaded=await check(await get('entry.js'));
 outcomes.push({forceTranspile:forced,fixture:root,before,reloaded});
}
const runtime=await fs.readFile(path.join(sdk,'dist/bundle/cli-runtime.js'),'utf8');
const matches=[...runtime.matchAll(/moduleCache\s*:\s*(?:false|!1)/g)].map(m=>runtime.slice(Math.max(0,m.index-380),m.index+150));
const result={outcomes,bundledLoaderOptions:matches.slice(-3)};await fs.writeFile(path.join(base,'RELOAD-PROBE.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
