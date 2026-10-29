import fs from 'node:fs';
import path from 'node:path';
import {issuePage,archivePath} from './site.mjs';
import {CURATED,hasReadableChinese} from './curated-zh.mjs';
import {summarizeProject,hasModelConfig,validateEditorial} from './editorial-llm.mjs';
import {EDITORIAL_RECENT} from './editorial-recent.mjs';

const token=process.env.GITHUB_TOKEN;
if(!token)throw Error('GITHUB_TOKEN is required');
const now=new Date();
const dateParts=new Intl.DateTimeFormat('en-US',{
  timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'
}).formatToParts(now);
const part=type=>dateParts.find(p=>p.type===type).value;
const date=[part('year'),part('month'),part('day')].join('-');
const target=archivePath(date);
if(fs.existsSync(target)){console.log('Existing daily HTML: '+target);process.exit(0);}

const headers={
  Authorization:'Bearer '+token,
  Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'radar-daily-scout'
};
async function api(url) {
  const response=await fetch(url,{headers});
  if(!response.ok)throw Error(response.status+' '+url+' '+(await response.text()).slice(0,120));
  return response.json();
}
const seen=new Set();
for(const year of fs.readdirSync('archive').filter(x=>/^\d{4}$/.test(x))) {
  for(const month of fs.readdirSync(path.join('archive',year)).filter(x=>/^(0[1-9]|1[0-2])$/.test(x))) {
    for(const file of fs.readdirSync(path.join('archive',year,month)).filter(x=>/^\d{2}\.html$/.test(x))) {
      const html=fs.readFileSync(path.join('archive',year,month,file),'utf8');
      for(const match of html.matchAll(/<article class="project"[^>]*data-repo="([^"]+)"/g))
        seen.add(match[1].toLowerCase());
    }
  }
}
const daysAgo=n=>new Date(now.valueOf()-n*86400000).toISOString().slice(0,10);
const searches=[
  {q:'created:>='+daysAgo(7)+' stars:>10',sort:'stars'},
  {q:'topic:self-hosted pushed:>='+daysAgo(5)+' stars:>25',sort:'updated'},
  {q:'topic:japanese pushed:>='+daysAgo(5),sort:'updated'},
  {q:'topic:ai-agent pushed:>='+daysAgo(5)+' stars:>15',sort:'updated'},
  {q:'pushed:>='+daysAgo(2)+' stars:>300',sort:'updated'}
];
const candidates=[];
for(const group of searches) {
  try {
    const url='https://api.github.com/search/repositories?q='+encodeURIComponent(group.q)+
      '&sort='+group.sort+'&order=desc&per_page=60';
    const data=await api(url);
    for(const repo of data.items||[]) {
      const id=repo.full_name.toLowerCase();
      if(!repo.fork&&!repo.archived&&!seen.has(id)&&repo.description){
        seen.add(id);candidates.push(repo);
      }
    }
  } catch(error) {console.warn('Repository search:',error.message);}
}
if(!candidates.length)throw Error('No new repository candidates');
const categories=[
  [/agent|llm|ai|mcp|chatbot/,'ai'],
  [/self.host|homelab|docker|server/,'selfhost'],
  [/game|emulator/,'games'],
  [/security|pentest|reverse.engineer/,'security'],
  [/hardware|firmware|iot/,'hardware'],
  [/image|video|design|graphics/,'graphics'],
  [/data|database|vector|analytics/,'data'],
  [/learn|education|japanese/,'learning']
];
const category=repo=>categories.find(([re])=>re.test((repo.topics||[]).join(' ').toLowerCase()))?.[1]||'dev';
const entries=[];
const modelEnabled=hasModelConfig();
if(!modelEnabled) console.warn('No RADAR_LLM_API_URL/KEY/MODEL: publishing curated projects only; never clipping README.');
for(const repo of candidates) {
  if(entries.length>=14)break;
  const curated=CURATED.get(repo.full_name.toLowerCase());
  let summary=curated?.summary || '';
  let detail=EDITORIAL_RECENT.get(repo.full_name.toLowerCase()) || curated?.detail || '';
  if(summary && detail) {
    try { ({summary,detail}=validateEditorial({summary,detail})); }
    catch(error) {console.warn('Curated material needs review:',repo.full_name,error.message);continue;}
  } else if(modelEnabled) {
    try {
      const res=await fetch('https://api.github.com/repos/'+repo.full_name+'/readme',{
        headers:{...headers,Accept:'application/vnd.github.raw+json'}
      });
      if(!res.ok) throw Error('README HTTP '+res.status);
      const editorial=await summarizeProject({repository:repo.full_name,description:repo.description,readme:await res.text()});
      ({summary,detail}=editorial);
    } catch(error) {console.warn('Editorial generation failed:',repo.full_name,error.message);continue;}
  } else continue;
  const project={
    id:repo.full_name,name:repo.name,category:category(repo),
    flag:'',tags:(repo.topics||[]).slice(0,3)
  };
  entries.push({
    project,repo:repo.full_name,featured:entries.length<8,summary,detail,
    metric:{
      type:'total',value:repo.stargazers_count,
      display:repo.stargazers_count.toLocaleString('en-US'),
      verified:true,sourceUrl:repo.html_url,capturedAt:now.toISOString()
    }
  });
}
if(entries.length<4){console.log('No publish: fewer than four verified editorial entries; existing daily HTML remains intact.');process.exit(0);}
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,issuePage({date,source:'github-actions-scout',entries}),{flag:'wx'});
console.log('Published '+entries.length+' Chinese project entries to '+target);
