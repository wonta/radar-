import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateData} from '../assets/model.mjs';
const file=process.argv[2];if(!file)throw Error('Usage: node scripts/import-issue.mjs issue.json');
const input=JSON.parse(fs.readFileSync(file,'utf8'));
execFileSync(process.execPath,['scripts/build.mjs']);
const data=JSON.parse(fs.readFileSync('dist/data/radar.json','utf8'));
if(data.issues.some(x=>x.date===input.date))throw Error('Issue already exists; historical snapshots are not overwritten.');
const ids=new Set(data.projects.map(p=>p.id.toLowerCase()));
for(const p of input.projects||[])if(!ids.has(p.id.toLowerCase())){data.projects.push(p);ids.add(p.id.toLowerCase());}
data.issues.push({date:input.date,source:input.source||'editorial',entries:input.entries});
validateData(data);
const dir='content/issues';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,input.date+'.json'),JSON.stringify(input,null,2)+'\n',{flag:'wx'});
console.log('Imported '+input.date+'. Commit the new snapshot to publish.');