import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const token=process.env.GITHUB_TOKEN;
if(!token) throw Error('GITHUB_TOKEN is required');
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dir='content/issues', target=path.join(dir,day+'.json');
if(fs.existsSync(target)){console.log('Already exists: '+target);process.exit(0);}
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'radar-daily-scout'};
async function api(url){const r=await fetch(url,{headers});if(!r.ok)throw Error(r.status+' '+url+' '+(await r.text()).slice(0,200));return r.json();}
const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
const week=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
const searches=[
{label:'Global Trending 候选',query:'pushed:>='+yesterday+' stars:>1000',sort:'stars'},
{label:'中文生态',query:'language:TypeScript pushed:>='+week+' stars:>30',sort:'updated'},
{label:'日本相关',query:'topic:japanese pushed:>='+week,sort:'updated'},
{label:'New Repo Scout',query:'created:>='+week+' stars:>10',sort:'stars'}
];
const seen=new Set(),chosen=[];
for(const group of searches){
 try{
 const url='https://api.github.com/search/repositories?q='+encodeURIComponent(group.query)+'&sort='+group.sort+'&order=desc&per_page=30';
 const result=await api(url);
 for(const repo of result.items||[]){
 if(chosen.filter(x=>x.group===group.label).length>=5)break;
 if(seen.has(repo.full_name.toLowerCase())||repo.archived||repo.fork)continue;
 seen.add(repo.full_name.toLowerCase());chosen.push({repo,group:group.label});
 }
 }catch(e){console.error(group.label,e.message);}
}
if(chosen.length<8)throw Error('Insufficient verified repositories; refusing to publish');
const categories={AI:'ai',agent:'ai',llm:'ai',selfhost:'selfhost',docker:'selfhost',game:'games',security:'security',hardware:'hardware',image:'graphics',data:'data'};
function category(r){const t=(r.topics||[]).join(' ').toLowerCase();for(const [word,cat] of Object.entries(categories))if(t.includes(word.toLowerCase()))return cat;return 'dev';}
const projects=[],entries=[];
for(const {repo:r,group} of chosen){
 let readme='',release='';
 try{const response=await fetch('https://api.github.com/repos/'+r.full_name+'/readme',{headers:{...headers,Accept:'application/vnd.github.raw+json'}});if(response.ok)readme=(await response.text()).slice(0,18000);}catch{}
 try{const releaseData=await api('https://api.github.com/repos/'+r.full_name+'/releases/latest');release=releaseData.tag_name||'';}catch{}
 const summary=(r.description||'暂无仓库描述').replace(/[\r\n|]/g,' ').slice(0,220);
 const excerpt=readme.replace(/<[^>]*>/g,' ').replace(/[#*\x60>]/g,' ').split(/\r?\n/).map(x=>x.trim()).find(x=>x.length>45&&!/^(!\[|https?:|\[)/.test(x))||'';
 const license=r.license?.spdx_id||'未确认';
 projects.push({id:r.full_name,name:r.name,category:category(r),flag:'',tags:[group,license].filter(Boolean)});
 entries.push({repo:r.full_name,featured:entries.length<10,summary,detail:'自动侦察：'+group+'。README 摘要：'+(excerpt||'未提取到可用正文').slice(0,300),note:'License: '+license+'；最新 Release: '+(release||'未确认')+'。自动摘要需人工复核；Stars 为采集时累计值，不代表日增。',metric:{type:'total',value:r.stargazers_count,display:String(r.stargazers_count),verified:true,sourceUrl:r.html_url,capturedAt:new Date().toISOString()}});
}
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(target,JSON.stringify({date:day,source:'github-actions-scout',projects,entries},null,2)+'\n',{flag:'wx'});
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
console.log('Generated '+target+' with '+entries.length+' entries');
