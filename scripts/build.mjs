import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateData} from '../assets/model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lock=JSON.parse(fs.readFileSync(path.join(root,'data','legacy-lock.json'),'utf8'));
for(const [file,hash] of Object.entries(lock))if(createHash('sha256').update(fs.readFileSync(path.join(root,'data',file))).digest('hex')!==hash)throw Error('Frozen legacy archive changed: '+file);
const readRows=name=>fs.readFileSync(path.join(root,'data',name),'utf8').split(/\r?\n/).filter(x=>x && !x.startsWith('#')).map(x=>x.split('|'));
const catalog=readRows('catalog.tsv').map(([id,name,category,flag,tags,summary,detail,note])=>({id,name,category,flag,tags:tags.split(','),summary,detail,note}));
const lookup=new Map(catalog.map(p=>[p.id.toLowerCase(),p]));
const issues=new Map();
for(const [date,repo,value,featured] of readRows('issues.tsv')) {
  const p=lookup.get(repo.toLowerCase()); if(!p) throw Error('Missing catalog '+repo);
  if(!issues.has(date)) issues.set(date,{date,source:'legacy-newsletter',entries:[]});
  const type=value==='new'?'new':value.startsWith('+')?'daily':'total';
  const numeric=type==='new'?null:Math.round(parseFloat(value)*(value.endsWith('k')?1000:1));
  issues.get(date).entries.push({repo:p.id,featured:featured==='1',summary:p.summary,detail:featured==='1'?p.detail:'',note:featured==='1'?p.note:'',metric:{type,value:numeric,display:type==='total'?value:null,verified:false,source:'legacy-newsletter'}});
}
// Legacy rows are frozen migration input. New issues are independent snapshots.
const futureDir=path.join(root,'content','issues');
if(fs.existsSync(futureDir)) for(const file of fs.readdirSync(futureDir).filter(x=>x.endsWith('.json'))) {
  const input=JSON.parse(fs.readFileSync(path.join(futureDir,file),'utf8'));
  if(issues.has(input.date)) throw Error('Refusing to overwrite existing issue '+input.date);
  for(const p of input.projects||[]) if(!lookup.has(p.id.toLowerCase())) {catalog.push(p);lookup.set(p.id.toLowerCase(),p);}
  issues.set(input.date,{date:input.date,source:input.source||'editorial',entries:input.entries});
}
const data=validateData({schemaVersion:2,edition:'radar-2.0',provenance:'七期对话日报的编辑整理归档；历史数值未重新核验，不是实时 GitHub 数据。',automation:{enabled:false},projects:catalog.map(({summary,detail,note,...p})=>p),issues:[...issues.values()].sort((a,b)=>b.date.localeCompare(a.date))});
const out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'data'),{recursive:true});
fs.writeFileSync(path.join(out,'data','radar.json'),JSON.stringify(data));
for(const file of ['index.html','assets/styles.css','assets/app.mjs','assets/model.mjs','assets/radar.svg','404.html','robots.txt']) {
  if(!fs.existsSync(path.join(root,file))) continue;
  fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(out,file));
}
console.log(JSON.stringify({projects:data.projects.length,issues:data.issues.length,entries:data.issues.reduce((a,b)=>a+b.entries.length,0),counts:data.issues.map(x=>[x.date,x.entries.length])}));
