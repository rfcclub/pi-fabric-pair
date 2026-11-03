// Installed-version backport regressions. Never opens the real Pair session.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const stage = process.env.PAIR_COMPAT_STAGE;
if (!stage) {
  test('installed-version compatibility fixtures (opt-in)', {skip:'Set PAIR_COMPAT_STAGE to an isolated installed-package copy'}, () => {});
} else {
const load = f => import(pathToFileURL(path.join(stage, 'src', f)).href);
const { PairController } = await load('controller.js');
const { loadConfig } = await load('config.js');
const { validateStoredState: validateState, migrateStoredState } = await load('contracts.js');
const validateStoredState = s => validateState(s, {ownerSession:s.ownerSession, cwd:s.cwd});
const { acquireLock, digest, PROTOCOL, PROCESS_STARTED_AT, processState } = await load('util.js');
const usage = () => ({ input:0, cacheRead:0, cacheWrite:0, totalInput:0, output:0, reportedCost:0, unknownCostRequests:0, requests:0, cacheRatio:null });
const step = id => ({ id, title:id, instructions:'Perform the authorized work' });
async function temp() { return fs.mkdtemp(path.join(os.tmpdir(), 'pair-installed-compat-')); }
async function lockFixture(owner) {
  const dir = await temp(); await fs.mkdir(path.join(dir,'.owner-lock'));
  const text = JSON.stringify(owner); await fs.writeFile(path.join(dir,'.owner-lock','owner.json'),text);
  return { dir, text, file:path.join(dir,'.owner-lock','owner.json') };
}
const deadOwner = () => { assert.equal(processState(41112),'dead','fixture dead PID was reused'); return { pid:41112, startedAt:1793480824887, ownerSession:'old-fixture' }; };
test('lock: fresh acquire/release', async () => {
  const dir=await temp(); const release=await acquireLock(dir,{ownerSession:'new'}); await release();
  await assert.rejects(fs.stat(path.join(dir,'.owner-lock')), {code:'ENOENT'});
});
test('lock: real Windows stale directory collision reaches verified takeover', async () => {
  const f=await lockFixture(deadOwner()); let called=false;
  const release=await acquireLock(f.dir,{ownerSession:'new'}, {takeover:async previous=>{assert.equal(previous.pid,41112);called=true;}});
  assert.equal(called,true); assert.equal(JSON.parse(await fs.readFile(f.file,'utf8')).pid,process.pid); await release();
});
test('lock: live owner is retained', async () => {
  const f=await lockFixture({pid:process.pid,startedAt:PROCESS_STARTED_AT});
  await assert.rejects(acquireLock(f.dir,{ownerSession:'new'}), /already owned/);
  assert.equal(await fs.readFile(f.file,'utf8'),f.text);
});
test('lock: unknown owner process is retained', async () => {
  const pid=2147483646,f=await lockFixture({pid,startedAt:1}),kill=process.kill;
  // A real unknown state means a process-inspection permission error, not PID0
  // (Windows reports the current process group alive for PID0).
  process.kill=(id,...args)=>{if(id===pid)throw Object.assign(Error('inspection denied'),{code:'EPERM'});return kill(id,...args);};
  try { assert.equal(processState(pid),'foreign');await assert.rejects(acquireLock(f.dir,{ownerSession:'new'}), /cannot prove|unknown|Invalid Pair owner lock/i); }
  finally {process.kill=kill;}
  assert.equal(await fs.readFile(f.file,'utf8'),f.text);
});
test('lock: malformed owner is retained', async () => {
  const f=await lockFixture({pid:'bad'}); await assert.rejects(acquireLock(f.dir,{ownerSession:'new'}), /pid must be a number/);
  assert.equal(await fs.readFile(f.file,'utf8'),f.text);
});
test('lock: takeover veto retains dead owner metadata', async () => {
  const f=await lockFixture(deadOwner());
  await assert.rejects(acquireLock(f.dir,{ownerSession:'new'},{takeover:async()=>{throw Error('veto stale takeover');}}),/veto stale takeover/);
  assert.equal(await fs.readFile(f.file,'utf8'),f.text);
});
test('lock: EPERM without a lock target propagates without cleanup of unrelated files', async () => {
  const dir=await temp(), marker=path.join(dir,'marker');await fs.writeFile(marker,'keep');
  const rename=fs.rename;
  fs.rename=async(a,b)=>{if(b===path.join(dir,'.owner-lock'))throw Object.assign(Error('fixture EPERM'),{code:'EPERM'});return rename(a,b);};
  try { await assert.rejects(acquireLock(dir,{ownerSession:'new'}),{code:'EPERM'}); }
  finally {fs.rename=rename;}
  assert.equal(await fs.readFile(marker,'utf8'),'keep'); await assert.rejects(fs.stat(path.join(dir,'.owner-lock')),{code:'ENOENT'});
});
test('lock: symlink/junction target cannot be reclaimed', async () => {
  const dir=await temp(), target=await temp(); await fs.writeFile(path.join(target,'marker'),'keep');
  await fs.symlink(target,path.join(dir,'.owner-lock'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(acquireLock(dir,{ownerSession:'new'})); assert.equal(await fs.readFile(path.join(target,'marker'),'utf8'),'keep');
});
async function fixture({twoSteps=false}={}) {
  const base=await temp(),repo=path.join(base,'repo');await fs.mkdir(path.join(repo,'.pi'),{recursive:true});
  execFileSync('git',['init','-q'],{cwd:repo});
  await fs.writeFile(path.join(repo,'.pi','fabric-pair.json'),JSON.stringify({version:2,enabled:true,autoStart:false,
    requirements:{fabric:false,fovea:false,prewalkDisabled:false,autoCompaction:true},
    workers:[{id:'worker',provider:'fixture',model:'fixture-model',effort:'low',cwd:null,readOnly:false}]}));
  const {config}=await loadConfig(repo,true,{PI_CODING_AGENT_DIR:path.join(base,'agent')});
  const errors=[]; const controller=new PairController({config,cwd:repo,ownerSession:'installed-fixture',sourcePaths:[],storageDir:path.join(base,'state'),scanIntervalMs:600000,
    rpcFactory:()=>{throw Error('real worker spawn forbidden');},callbacks:{notifyUser:(s,l)=>errors.push({s,l})}});
  await controller.init();
  const task={id:'task-fixture',workerId:'worker',requestId:'request-fixture',objective:'Fixture continuation',context:'test',constraints:[],steps:twoSteps?[step('s1'),step('s2')]:[step('s1')],
    stepIndex:0,planRevision:1,attemptId:'attempt-one',attemptNumber:1,status:'review',leaseId:'lease-one',policy:{mode:'milestones',finalReview:true,maxRevisions:20,maxRevisionsPerStep:3,summaryDetail:'normal'},
    limits:config.limits,verification:config.verification,startedAt:Date.now(),updatedAt:Date.now(),revisions:0,turns:0,usage:usage(),baseSnapshotRef:'unset',pendingReport:null,report:null,decisions:{},lastDecision:null,
    dispatchSettleSequence:0,pendingSince:0,abortRequested:false,interruption:'',previousStatus:'',completedAt:0,cancelReason:'',stepRevisions:0};
  const record={id:'worker',cwd:await fs.realpath(repo),repoRoot:await fs.realpath(repo),status:'review',sessionId:'session-fixture',sessionFile:path.join(base,'worker.jsonl'),bound:{...config.workers[0]},task,history:[],usage:usage(),error:null,workerGeneration:1};
  controller.state.workers.worker=record;await fs.writeFile(record.sessionFile,'');
  for(const d of ['inbox','archive'])await fs.mkdir(path.join(controller.workerDir('worker'),d),{recursive:true});
  const snapshot=await controller.evidence.capture(repo);task.baseSnapshotRef=await controller.evidence.saveSnapshot(snapshot);
  const payload={taskId:task.id,stepId:'s1',kind:'checkpoint',summary:'Fixture checkpoint',changedFiles:[],checks:[],decisions:[],stepComplete:true};
  const checkpoint=await controller.evidence.checkpoint(task.id,'report-fixture',snapshot,snapshot,[]);
  task.report={version:PROTOCOL,reportId:'report-fixture',workerId:'worker',ownerSession:controller.ownerSession,ownerEpoch:controller.state.ownerEpoch,workerGeneration:1,nonce:'nonce-fixture',sessionId:record.sessionId,
    leaseId:task.leaseId,attemptId:task.attemptId,attemptNumber:1,planRevision:1,payload,payloadHash:digest(payload),createdAt:Date.now(),checkpoint,snapshotRef:await controller.evidence.saveSnapshot(snapshot),inspectedAt:Date.now()};
  controller.state.notices['report-fixture']={reportId:'report-fixture',workerId:'worker',taskId:task.id,ownerEpoch:controller.state.ownerEpoch,workerGeneration:1,attemptId:task.attemptId,deliveryOperationId:'delivery-fixture',status:'offered',createdAt:Date.now(),channel:'tool-result',observedAt:Date.now()};
  const prompts=[];let serial=0;
  const runtime={ownerEpoch:controller.state.ownerEpoch,workerGeneration:1,nonce:'nonce-fixture',pid:424244,dir:controller.workerDir('worker'),sessionId:record.sessionId,ready:true,closed:false,fault:null,settledSequence:1,
    takeObservations:()=>[],abortCurrent:async()=>{},abortAndStop:async()=>{},waitIdle:async()=>{},snapshot:()=>({idle:true}),revoke:()=>{},settleOrAbort:async()=>{},
    reserveActivation:identity=>Object.freeze({...identity,serial:++serial}),activationCurrent:()=>true,ensureStarted:async()=>({probe:record.probe||null,state:{sessionId:record.sessionId,sessionFile:record.sessionFile}}),prepareActivation:async()=>({probe:record.probe||null}),activate:async(...args)=>prompts.push(args)};
  controller.handles.set('worker',runtime);controller.runtimeData.set(runtime,{configHash:controller.configHash(),specHash:digest(config.workers[0]),activationIntent:0,pendingControls:0,failureHandled:false,telemetry:null,verificationAbort:null});
  await controller.writeAuthority('worker','waiting');await controller.persist();
  return {base,repo,controller,task,record,runtime,prompts,errors};
}
async function clean(f){f.runtime.closed=true;await f.controller.close().catch(()=>{});await f.controller.releaseLock?.().catch(()=>{});}
async function settled(c){await Promise.all([...c.activations]);await c.scanPromise?.catch(()=>{});}
const revise=(f,steps=[step('replacement')])=>({workerId:'worker',taskId:f.task.id,reportId:'report-fixture',action:'revise',feedback:'Use the revised plan',steps});
function olderPlan(state){const s=structuredClone(state),t=s.workers.worker.task,r=t.report;
  t.steps=[step('replacement')];t.planRevision=2;t.attemptNumber=2;t.attemptId='attempt-two';t.leaseId='lease-two';t.status='interrupted';t.interruption='fixture hold';
  t.decisions[r.reportId]={hash:digest('decision'),action:'revise',feedback:'Replan',checkpointHash:null,ownerEpoch:r.ownerEpoch,workerGeneration:r.workerGeneration,attemptId:r.attemptId,deliveryOperationId:'decision-delivery-fixture',at:Date.now(),reviewerModel:null,delivery:'accepted'};
  t.lastDecision={action:'revise',feedback:'Replan',reportId:r.reportId};s.notices[r.reportId].status='resolved';s.workers.worker.status='paused';return s;
}
test('contracts: decided older plan/attempt survives; all provenance negatives reject',async t=>{
  const f=await fixture();try{
    validateStoredState(f.controller.state);assert.deepEqual(migrateStoredState(structuredClone(f.controller.state)).state,f.controller.state);
    const s=olderPlan(f.controller.state);validateStoredState(s);
    const vectors={
      'same plan':t=>{t.planRevision=t.report.planRevision;},'same attempt number':t=>{t.attemptNumber=t.report.attemptNumber;},
      'wrong report task':t=>{t.report.payload.taskId='wrong-task';t.report.payloadHash=digest(t.report.payload);},
      'wrong worker':t=>{t.report.workerId='wrong-worker';},'wrong decision attempt':t=>{t.decisions[t.report.reportId].attemptId='wrong-attempt';},
      'invalid decision owner epoch':t=>{t.decisions[t.report.reportId].ownerEpoch=0;},'invalid decision worker generation':t=>{t.decisions[t.report.reportId].workerGeneration=0;},
      'cancel decision':t=>{t.decisions[t.report.reportId]={hash:digest('cancel'),action:'cancel',at:Date.now()};t.lastDecision=null;},
      'unresolved report':t=>{t.decisions={};t.lastDecision=null;t.status='review';},
    };
    for(const[name,mutate]of Object.entries(vectors))await t.test(name,()=>{const bad=structuredClone(s);mutate(bad.workers.worker.task);assert.throws(()=>validateStoredState(bad));});
  }finally{await clean(f);}
});
test('continuation: renamed step starts, persists, reloads and cancels without rewriting old report',async()=>{
  const f=await fixture();try{
    const before=structuredClone(f.task.report),r=await f.controller.decide(revise(f));await settled(f.controller);
    assert.ok(['activating','running'].includes(r.status));assert.equal(f.task.status,'running');assert.equal(f.task.steps[0].id,'replacement');assert.equal(f.prompts.length,1);
    assert.deepEqual(f.task.report,before);validateStoredState(JSON.parse(await fs.readFile(path.join(f.controller.dir,'state.json'),'utf8')));
    const dir=f.controller.dir;await clean(f);
    const reloaded=new PairController({config:f.controller.config,cwd:f.repo,ownerSession:'installed-fixture',sourcePaths:[],storageDir:dir,scanIntervalMs:600000,rpcFactory:()=>{throw Error('spawn forbidden');}});
    await reloaded.init();try {validateStoredState(reloaded.state);await reloaded.cancel('worker','fixture cancel');validateStoredState(reloaded.state);assert.equal(reloaded.state.workers.worker.task.status,'cancelled');}finally{await reloaded.close();}
  }finally{await clean(f);}
});
test('continuation: invalid completed prefix leaves original state and work-order unchanged',async()=>{
  const f=await fixture({twoSteps:true});try{
    f.task.stepIndex=1;f.task.report.payload.stepId='s2';f.task.report.payloadHash=digest(f.task.report.payload);await f.controller.persist();
    const original=structuredClone(f.task),notice=structuredClone(f.controller.state.notices['report-fixture']);
    const file=path.join(f.controller.workerDir('worker'),'work-order.json');await fs.writeFile(file,'original work order');
    await assert.rejects(f.controller.decide(revise(f,[step('changed-completed'),step('s2')])),/Completed steps/);
    assert.deepEqual(f.task,original);assert.deepEqual(f.controller.state.notices['report-fixture'],notice);assert.equal(await fs.readFile(file,'utf8'),'original work order');validateStoredState(f.controller.state);
  }finally{await clean(f);}
});
test('continuation: overflowing draft is rejected before task/notice/work-order mutation',async()=>{
  const f=await fixture();try{
    f.task.attemptNumber=Number.MAX_SAFE_INTEGER;f.task.report.attemptNumber=f.task.attemptNumber;await f.controller.persist();
    const original=structuredClone(f.task),notice=structuredClone(f.controller.state.notices['report-fixture']);const file=path.join(f.controller.workerDir('worker'),'work-order.json');await fs.writeFile(file,'original');
    await assert.rejects(f.controller.decide(revise(f)),/exhausted|safe integer|overflow/i);
    assert.deepEqual(f.task,original);assert.deepEqual(f.controller.state.notices['report-fixture'],notice);assert.equal(await fs.readFile(file,'utf8'),'original');validateStoredState(f.controller.state);
  }finally{await clean(f);}
});
test('continuation: synchronous reserve failure persists a held state',async()=>{
  const f=await fixture();try{
    f.runtime.reserveActivation=()=>{throw Error('fixture reserve failure');};
    await assert.rejects(f.controller.decide(revise(f)),/fixture reserve failure/);assert.equal(f.task.status,'interrupted');validateStoredState(f.controller.state);assert.equal(f.prompts.length,0);
    validateStoredState(JSON.parse(await fs.readFile(path.join(f.controller.dir,'state.json'),'utf8')));
  }finally{await clean(f);}
});
test('contracts: resumed decision generation may differ from retained producer generation',async()=>{
  const f=await fixture();try{const s=olderPlan(f.controller.state);s.ownerEpoch++;s.workers.worker.workerGeneration++;
    const d=s.workers.worker.task.decisions['report-fixture'];d.ownerEpoch=s.ownerEpoch;d.workerGeneration=s.workers.worker.workerGeneration;validateStoredState(s);
    const bad=structuredClone(f.controller.state);bad.workers.worker.task.report.leaseId='foreign-current-lease';assert.throws(()=>validateStoredState(bad));
  }finally{await clean(f);}
});
test('continuation: final approval completes without reserving new work',async()=>{
  const f=await fixture();try{await f.controller.decide({workerId:'worker',taskId:f.task.id,reportId:'report-fixture',action:'approve',feedback:'Approved',checkpointHash:f.task.report.checkpoint.checkpointHash});
    assert.equal(f.task.status,'completed');assert.equal(f.prompts.length,0);validateStoredState(f.controller.state);
  }finally{await clean(f);}
});
test('continuation: intermediate approval advances exactly one step',async()=>{
  const f=await fixture({twoSteps:true});try{await f.controller.decide({workerId:'worker',taskId:f.task.id,reportId:'report-fixture',action:'approve',feedback:'Continue',checkpointHash:f.task.report.checkpoint.checkpointHash});await settled(f.controller);
    assert.equal(f.task.stepIndex,1);assert.equal(f.task.status,'running');assert.equal(f.prompts.length,1);validateStoredState(f.controller.state);
  }finally{await clean(f);}
});
test('continuation: answer keeps the plan and renews only the attempt',async()=>{
  const f=await fixture();try{f.task.report.payload.kind='question';f.task.report.payload.question='Proceed?';f.task.report.payloadHash=digest(f.task.report.payload);f.task.status='question';f.record.status='question';await f.controller.persist();
    await f.controller.decide({workerId:'worker',taskId:f.task.id,reportId:'report-fixture',action:'answer',feedback:'Proceed in scope'});await settled(f.controller);
    assert.equal(f.task.planRevision,1);assert.equal(f.task.stepIndex,0);assert.equal(f.task.attemptNumber,2);assert.equal(f.task.status,'running');assert.equal(f.prompts.length,1);validateStoredState(f.controller.state);
  }finally{await clean(f);}
});
test('continuation: work-order publication failure leaves the original decision state',async()=>{
  const f=await fixture();const rename=fs.rename;try{const file=path.join(f.controller.workerDir('worker'),'work-order.json');await fs.writeFile(file,'original');const original=structuredClone(f.task),notice=structuredClone(f.controller.state.notices['report-fixture']);
    fs.rename=async(a,b)=>{if(b===file)throw Object.assign(Error('fixture publication denied'),{code:'EACCES'});return rename(a,b);};
    await assert.rejects(f.controller.decide(revise(f)),/fixture publication denied/);assert.deepEqual(f.task,original);assert.deepEqual(f.controller.state.notices['report-fixture'],notice);assert.equal(await fs.readFile(file,'utf8'),'original');validateStoredState(f.controller.state);
  }finally{fs.rename=rename;await clean(f);}
});
test('continuation: asynchronous start failure is contained with no work prompt',async()=>{
  const f=await fixture();try{
    f.runtime.ensureStarted=async()=>{throw Error('fixture start failure');};await f.controller.decide(revise(f));await settled(f.controller);
    assert.equal(f.task.status,'interrupted');validateStoredState(f.controller.state);assert.equal(f.prompts.length,0);
  }finally{await clean(f);}
});
} // explicit installed-version fixture opt-in
