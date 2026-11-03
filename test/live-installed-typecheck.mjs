// Strict paired typecheck against the installed runtime's SDK. No inference.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const base=process.argv[2];if(!base)throw Error('backup/stage root required');
const sdk=process.env.PI_CODING_AGENT;if(!sdk)throw Error('PI_CODING_AGENT is required');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const nm=path.join(repo,'node_modules');
const req=createRequire(path.join(sdk,'package.json'));
const sdkMeta=JSON.parse(fs.readFileSync(path.join(sdk,'package.json'),'utf8'));
const sdkTypes=path.join(sdk,sdkMeta.types||'dist/index.d.ts');
const tuiEntry=req.resolve('@earendil-works/pi-tui');const tuiTypes=tuiEntry.replace(/\.js$/,'.d.ts');
if(!fs.existsSync(sdkTypes)||!fs.existsSync(tuiTypes))throw Error('Cannot locate exact runtime SDK types');
const compiler=path.join(nm,'typescript/bin/tsc');
const results={};
for(const name of ['package-before','stage']){
  const config={compilerOptions:{target:'ES2023',module:'Node16',moduleResolution:'Node16',resolveJsonModule:true,allowJs:true,checkJs:true,noEmit:true,strict:true,useUnknownInCatchVariables:true,skipLibCheck:false,types:['node'],typeRoots:[path.join(nm,'@types')],baseUrl:base,paths:{'@modelcontextprotocol/sdk/*':[path.join(nm,'@modelcontextprotocol/sdk/dist/esm/*').replaceAll('\\','/')],'@earendil-works/pi-coding-agent':[sdkTypes.replaceAll('\\','/')],'@earendil-works/pi-tui':[tuiTypes.replaceAll('\\','/')]}},include:[name+'/src/*.js']};
  const file=path.join(base,'typecheck-'+name+'.json');fs.writeFileSync(file,JSON.stringify(config,null,2));
  const r=spawnSync(process.execPath,[compiler,'--pretty','false','-p',file],{encoding:'utf8',timeout:90000});
  const log=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(base,'typecheck-'+name+'.log'),log);
  results[name]={ok:r.status===0,status:r.status,errors:log.split('\n').filter(s=>/error TS/.test(s)).map(s=>s.replaceAll('package-before/','SOURCE/').replaceAll('stage/','SOURCE/').replaceAll('package-before\\','SOURCE\\').replaceAll('stage\\','SOURCE\\'))};
}
// Compare messages without line numbers, which legitimately shift in edited source.
const norm=s=>s.replace(/\(\d+,\d+\)/g,'(LINE,COL)');
const baseline=new Set(results['package-before'].errors.map(norm));
const newErrors=results.stage.errors.filter(s=>!baseline.has(norm(s)));
const syntax=['util.js','contracts.js','controller.js'].map(f=>({file:f,ok:spawnSync(process.execPath,['--check',path.join(base,'stage','src',f)]).status===0}));
const receipt={sdkVersion:sdkMeta.version,baselineErrors:results['package-before'].errors.length,stageErrors:results.stage.errors.length,newErrors,syntax};
fs.writeFileSync(path.join(base,'TYPECHECK.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
if(newErrors.length||syntax.some(s=>!s.ok))process.exitCode=1;
