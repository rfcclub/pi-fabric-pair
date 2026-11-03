// Install only the reviewed installed-version delta. Never edits state/locks/history.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const base=process.argv[2],apply=process.argv[3]==='--apply';if(!base)throw Error('backup/stage root required');
const live=process.env.PAIR_LIVE_PACKAGE;
const session=process.env.PAIR_SESSION_DIR;
const projectPi=process.env.PAIR_PROJECT_PI;
if(!live||!session||!projectPi)throw Error('PAIR_LIVE_PACKAGE, PAIR_SESSION_DIR and PAIR_PROJECT_PI are required');
const stage=path.join(base,'stage'),before=path.join(base,'package-before');
const files=['src/contracts.js','src/controller.js','src/util.js'];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'MANIFEST.json'),'utf8'));
const protectedFiles=manifest.files.flatMap(e=>{
 const key=e.path.replaceAll('\\','/');
 if(key.startsWith('package-before/'))return [{...e,live:path.join(live,key.slice(15)),key}];
 if(key.startsWith('session-before/'))return [{...e,live:path.join(session,key.slice(15)),key}];
 if(['fabric-pair.json','fabric.json'].includes(key))return [{...e,live:path.join(projectPi,key),key}];
 return [];
});
function verify(published=false){for(const e of protectedFiles){const rel=e.key.startsWith('package-before/')?e.key.slice(15):null;const expected=published&&files.includes(rel)?sha(path.join(stage,rel)):e.sha256;if(sha(e.live)!==expected)throw Error('Pinned input changed: '+e.live);}}
verify();
const changed=manifest.files.filter(e=>e.path.replaceAll('\\','/').startsWith('package-before/')).map(e=>e.path.replaceAll('\\','/').slice(15)).filter(f=>sha(path.join(stage,f))!==sha(path.join(before,f)));
if(JSON.stringify(changed.toSorted())!==JSON.stringify(files.toSorted()))throw Error('Stage is not the reviewed three-file delta: '+changed);
const util=await import(pathToFileURL(path.join(before,'src/util.js')).href);
const lock=JSON.parse(fs.readFileSync(path.join(session,'.owner-lock/owner.json'),'utf8'));
if(await util.ownerAlive(lock))throw Error('Existing owner is still alive; installation held');
const state=JSON.parse(fs.readFileSync(path.join(session,'state.json'),'utf8'));
for(const w of Object.values(state.workers))if(typeof w.pid==='number'&&util.processState(w.pid)!=='dead')throw Error('Worker exit not proved: '+w.id);
const contract=await import(pathToFileURL(path.join(stage,'src/contracts.js')).href);contract.validateStoredState(state,{ownerSession:state.ownerSession,cwd:state.cwd});
const typecheck=JSON.parse(fs.readFileSync(path.join(base,'TYPECHECK.json'),'utf8'));
if(typecheck.baselineErrors||typecheck.stageErrors||typecheck.newErrors.length||typecheck.syntax.some(s=>!s.ok))throw Error('Type/syntax verification is not clean');
const diff=spawnSync('git',['diff','--no-index','--','package-before/src','stage/src'],{cwd:base,encoding:'utf8'});
if(diff.status!==1)throw Error('Expected exactly a nonempty reviewed source diff');
const patch=diff.stdout.replaceAll('a/package-before/','a/').replaceAll('b/stage/','b/');
fs.writeFileSync(path.join(base,'live-package.patch'),patch);
const receipt={applied:false,base,live,protectedFiles:protectedFiles.length,source:files.map(file=>({file,before:sha(path.join(before,file)),after:sha(path.join(stage,file))})),ownerSession:state.ownerSession,workerSession:state.workers.worker.sessionId,tests:{passed:28,failed:0,skipped:0},typecheck,createdAt:new Date().toISOString()};
if(!apply){console.log(JSON.stringify(receipt,null,2));process.exit(0);}
const receiptFile=path.join(base,'INSTALL-RECEIPT.json');if(fs.existsSync(receiptFile))throw Error('Install receipt already exists; inspect instead of replaying');
const written=[];
try{
 verify();
 for(const file of files){const target=path.join(live,file),tmp=target+'.compat-'+process.pid+'.tmp';fs.writeFileSync(tmp,fs.readFileSync(path.join(stage,file)),{flag:'wx'});fs.renameSync(tmp,target);written.push(file);if(sha(target)!==sha(path.join(stage,file)))throw Error('Post-write mismatch: '+file);}
 verify(true);receipt.applied=true;receipt.protectedVerifiedAfter=true;fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2),{flag:'wx'});
}catch(error){
 const conflicts=[];for(const file of written.reverse()){const target=path.join(live,file);if(sha(target)!==sha(path.join(stage,file))){conflicts.push(file);continue;}fs.writeFileSync(target,fs.readFileSync(path.join(before,file)));}
 fs.writeFileSync(path.join(base,'INSTALL-FAILURE.json'),JSON.stringify({error:String(error),rollbackConflicts:conflicts},null,2));throw error;
}
console.log(JSON.stringify(receipt,null,2));
