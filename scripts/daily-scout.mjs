import fs from 'node:fs';
import path from 'node:path';
import {issuePage,archivePath} from './site.mjs';

const token=process.env.GITHUB_TOKEN;
if(!token)throw Error('GITHUB_TOKEN is required');
const now=new Date();
const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'})
  .formatToParts(now);
const part=type=>parts.find(p=>p.type===type)?.value;
const date=`${part('year')}-${part('month')}-${part('day')}`;
const target=archivePath(date);
if(fs.existsSync(target)){console.log('Today already published: '+target);process.exit(0);}
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'radar-daily-scout'};
async function api(url) {
  const response=await fetch(url,{headers});
  if(!response.ok)throw Error(`${response.status} ${url}: ${(await response.text()).slice(0,180)}`);
  return response.json();
}
const isoDaysAgo=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
const searches=[
  {group:'全球高关注项目',q:`pushed:>=${isoDaysAgo(2)} stars:>1000`,sort:'stars'},
  {group:'开发工具与自托管',q:`topic:self-hosted pushed:>=${isoDaysAgo(7)} stars:>25`,sort:'updated'},
  {group:'日语与日本相关',q:`topic:japanese pushed:>=${isoDaysAgo(7)}`,sort:'updated'},
  {group:'近期新项目',q:`created:>=${isoDaysAgo(7)} stars:>10`,sort:'stars'}
];
const chosen=[],seen=new Set();
for(const group of searches) {
  try {
    const url='https://api.github.com/search/repositories?q='+encodeURIComponent(group.q)+'&sort='+group.sort+'&order=desc&per_page=30';
    const result=await api(url);
    for(const repo of result.items||[]) {
      if(chosen.filter(x=>x.group===group.group).length>=5)break;
      if(repo.archived||repo.fork||seen.has(repo.full_name.toLowerCase()))continue;
      seen.add(repo.full_name.toLowerCase());
      chosen.push({repo,group:group.group});
    }
  } catch(error) { console.error('Search failed:',group.group,error.message); }
}
if(chosen.length<8)throw Error('Insufficient candidate repositories; not publishing an empty issue');
const categoryWords=[
  [/agent|llm|ai|mcp|chatbot/,'ai'],[/self.host|homelab|docker|server/,'selfhost'],
  [/game|emulator|recomp/,'games'],[/security|pentest|reverse.engineer/,'security'],
  [/hardware|firmware|iot/,'hardware'],[/image|video|design|graphics/,'graphics'],
  [/data|database|vector|analytics/,'data'],[/learn|education|japanese/,'learning']
];
function category(repo) {
  const haystack=(repo.topics||[]).join(' ').toLowerCase();
  return categoryWords.find(([re])=>re.test(haystack))?.[1]||'dev';
}
function readmeExcerpt(raw) {
  const cleaned=raw.replace(/```[\s\S]*?```/g,' ').replace(/<[^>]+>/g,' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
    .replace(/[`*_>#|]/g,' ').replace(/\r/g,'');
  return cleaned.split(/\n+/).map(line=>line.trim())
    .filter(line=>line.length>55 && line.length<800 && !/^(https?:|badge|install|usage|license|copyright)/i.test(line))
    .slice(0,2).join(' ').slice(0,400);
}
const entries=[];
for(const {repo,group} of chosen) {
  let readme='',release='';
  try {
    const response=await fetch('https://api.github.com/repos/'+repo.full_name+'/readme',{
      headers:{...headers,Accept:'application/vnd.github.raw+json'}
    });
    if(response.ok)readme=(await response.text()).slice(0,20000);
  } catch(error) {console.warn('README unavailable:',repo.full_name,error.message);}
  try{
    const info=await api('https://api.github.com/repos/'+repo.full_name+'/releases/latest');
    release=info.tag_name||'';
  }catch{}
  const summary=(repo.description||'仓库未提供可核实的简短介绍').replace(/[\r\n|]/g,' ').slice(0,220);
  const excerpt=readmeExcerpt(readme);
  const project={
    id:repo.full_name,name:repo.name,category:category(repo),flag:'',
    tags:(repo.topics||[]).slice(0,4)
  };
  entries.push({
    project,repo:repo.full_name,featured:entries.length<10,
    summary,
    detail:excerpt ? 'README 摘录（原文，未经人工翻译与验证）：'+excerpt : '未能从 README 提取可靠的功能细节；请阅读仓库原文。',
    note:'发现来源：'+group+'。'+(release?'近期 Release：'+release+'。':'')+
      '自动候选项目；功能、许可和可部署性尚未人工核验。',
    metric:{type:'total',value:repo.stargazers_count,display:repo.stargazers_count.toLocaleString('en-US'),
      verified:true,sourceUrl:repo.html_url,capturedAt:now.toISOString()}
  });
}
const html=issuePage({date,source:'github-actions-scout',entries});
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,html,{flag:'wx'});
console.log('Generated HTML issue '+target+' with '+entries.length+' projects');
