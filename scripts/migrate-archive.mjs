import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {issuePage,archivePath} from './site.mjs';

const LOCKED = {
  'catalog.tsv': 'aac59154e2ff3deec9038cc46af5cc540c93512e54d5363ab89dd13f36cf216c',
  'issues.tsv': 'b62bf2f6cd00b6129ada48a51e8700aca9f2e4cc7443ab53abff32fb7df61f74'
};
for (const [file,expected] of Object.entries(LOCKED)) {
  const hash=createHash('sha256').update(fs.readFileSync('data/'+file)).digest('hex');
  if (hash!==expected) throw Error('Frozen TSV mismatch: '+file);
}
const rows = file => fs.readFileSync('data/'+file,'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => line.split('|'));
const catalog = new Map(rows('catalog.tsv').map(([id,name,category,flag,tags,summary,detail,note]) =>
  [id.toLowerCase(),{id,name,category,flag,tags:tags.split(',').filter(Boolean),summary,detail,note}]));
const jsonDir = 'content/issues';
const jsonFiles = fs.existsSync(jsonDir) ? fs.readdirSync(jsonDir).filter(file=>file.endsWith('.json')).sort() : [];
const editorial = jsonFiles.map(file => ({file,data:JSON.parse(fs.readFileSync(path.join(jsonDir,file),'utf8'))}));
for (const {data} of editorial) {
  for (const p of data.projects||[]) {
    const key=p.id.toLowerCase();
    if (!catalog.has(key)) catalog.set(key,p);
  }
}
const legacy = new Map();
for (const [date,repo,value,featured] of rows('issues.tsv')) {
  const project=catalog.get(repo.toLowerCase());
  if(!project) throw Error('Unknown historical repository: '+repo);
  if(!legacy.has(date)) legacy.set(date,[]);
  const type=value==='new'?'new':value.startsWith('+')?'daily':'total';
  const count=type==='new'?null:Math.round(parseFloat(value)*(value.toLowerCase().endsWith('k')?1000:1));
  if(type!=='new' && !Number.isSafeInteger(count)) throw Error('Invalid historical metric: '+value);
  legacy.get(date).push({
    project,repo:project.id,featured:featured==='1',summary:project.summary,
    detail:featured==='1'?project.detail:'',note:featured==='1'?project.note:'',
    metric:{type,value:count,display:type==='total'?value:null,verified:false}
  });
}
if(legacy.size!==7 || [...legacy.values()].reduce((n,arr)=>n+arr.length,0)!==174)
  throw Error('Unexpected frozen legacy issue count');
const issues = [...legacy].map(([date,entries])=>({date,source:'legacy-newsletter',entries}));
for (const {file,data} of editorial) {
  if(file!==data.date+'.json')throw Error('Issue filename disagrees with date: '+file);
  issues.push({date:data.date,source:data.source||'editorial',entries:data.entries.map(e=>{
    const project=catalog.get(e.repo.toLowerCase());
    if(!project) throw Error('Unknown editorial repository: '+e.repo);
    return {...e,project};
  })});
}
let generated=0;
for(const issue of issues) {
  const target=archivePath(issue.date);
  if(fs.existsSync(target))continue; // Existing HTML snapshots are immutable.
  const html=issuePage(issue);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,html,{flag:'wx'});
  generated++;
}
// Delete JSON sources only after every target snapshot has been successfully rendered.
for(const {file,data} of editorial) {
  const target=archivePath(data.date);
  const text=fs.readFileSync(target,'utf8');
  if(!text.includes(`<meta name="radar-date" content="${data.date}">`))throw Error('Missing converted HTML: '+data.date);
  fs.unlinkSync(path.join(jsonDir,file));
}
if (fs.existsSync(jsonDir) && !fs.readdirSync(jsonDir).length) fs.rmdirSync(jsonDir);
if (fs.existsSync('content') && !fs.readdirSync('content').length) fs.rmdirSync('content');
if(fs.existsSync('data/legacy-lock.json')) fs.unlinkSync('data/legacy-lock.json');
console.log(`HTML archive migration: ${generated} pages created; ${editorial.length} daily JSON sources removed.`);
