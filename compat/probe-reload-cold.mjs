import fs from 'node:fs/promises';import path from 'node:path';
import{pathToFileURL}from'node:url';
const root=process.argv[2],sdk=process.argv[3];if(!root||!sdk)throw Error('usage: node probe-reload-cold.mjs <fixture-root> <pi-coding-agent-root>');
const {createJiti}=await import(pathToFileURL(path.join(sdk,'dist/core/extensions/jiti-static-loader.js')).href);const source=await fs.readFile(path.join(root,'util.js'),'utf8');
const jiti=createJiti(import.meta.url,{moduleCache:false,tryNative:false});const fn=(await jiti.import(path.join(root,'entry.js'),{default:true}))();
let result;try{const release=await fn(path.join(root,'lock-fixture'),{ownerSession:'isolated-cold'});await release();result={ok:true};}catch(e){result={ok:false,code:e.code,message:e.message,stack:e.stack?.split('\n').slice(0,8)};}
const receipt={freshProcess:true,sourceHasFix:source.includes('lock retained'),functionHasFix:fn.toString().includes('lock retained'),result};
await fs.writeFile(path.join(root,'COLD-RESULT.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
