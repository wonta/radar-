import fs from 'node:fs';
import path from 'node:path';
import {EDITORIAL_OLDER_A} from './editorial-older-a.mjs';
import {EDITORIAL_OLDER_B} from './editorial-older-b.mjs';
import {EDITORIAL_OLDER_C} from './editorial-older-c.mjs';
import {EDITORIAL_MIDDLE} from './editorial-middle.mjs';
import {EDITORIAL_RECENT} from './editorial-recent.mjs';
import {esc,unesc,metricBadge} from './site.mjs';
import {flagForRepo,flagMarkup} from './flags.mjs';

export const EDITORIAL = new Map([
  ...EDITORIAL_OLDER_A,
  ...EDITORIAL_OLDER_B,
  ...EDITORIAL_OLDER_C,
  ...EDITORIAL_MIDDLE,
  ...EDITORIAL_RECENT
]);

const attr=(src,key)=>{
  const match=src.match(new RegExp('\\b'+key+'="([^"]*)"'));
  return match?unesc(match[1]):'';
};
const cards=new Set();
const untouched=new Set();
let changed=0,seen=0;
for(const year of fs.readdirSync('archive').filter(x=>/^\d{4}$/.test(x))){
  for(const month of fs.readdirSync(path.join('archive',year)).filter(x=>/^(0[1-9]|1[0-2])$/.test(x))){
    const dir=path.join('archive',year,month);
    for(const filename of fs.readdirSync(dir).filter(x=>/^\d{2}\.html$/.test(x))){
      const file=path.join(dir,filename);
      const html=fs.readFileSync(file,'utf8');
      let matchCount=0;
      let next=html.replace(/<article class="project"([^>]*)>([\s\S]*?)<\/article>/g,(full,attrs,inside)=>{
        matchCount++;
        const id=attr(attrs,'data-repo').toLowerCase();
        if(!id)throw Error('Project id missing in '+file);
        cards.add(id);
        const editorial=EDITORIAL.get(id);
        const original=attr(attrs,'data-detail');
        const detail=editorial||original;
        if(!editorial)untouched.add(id);
        const rawMetric=inside.match(/<span class="metric">([\s\S]*?)<\/span>/)?.[1]||'';
        const metric=attr(attrs,'data-metric')||unesc(rawMetric.replace(/<small>[\s\S]*?<\/small>/g,'').replace(/<[^>]+>/g,'').replace(/^\s*★\s*/,'').trim());
        if(!metric)throw Error('Missing original Stars data in '+file+': '+id);
        const oldFlag=attr(attrs,'data-flag')||inside.match(/<span class="flag">([^<]+)<\/span>/)?.[1]||'';
        const flag=flagForRepo(id,oldFlag);
        let newAttrs=attrs.replace(/\sdata-tags="[^"]*"/g,'')
          .replace(/\sdata-flag="[^"]*"/g,'')
          .replace(/\sdata-metric="[^"]*"/g,'')+
          ' data-flag="'+esc(flag)+'" data-metric="'+esc(metric)+'"';
        if(/\sdata-detail="/.test(newAttrs)){
          newAttrs=newAttrs.replace(/\sdata-detail="[^"]*"/g,' data-detail="'+esc(detail)+'"');
        }else{
          newAttrs+=' data-detail="'+esc(detail)+'"';
        }
        let body=inside
          .replace(/<div class="tags">[\s\S]*?<\/div>\s*/g,'')
          .replace(/<span class="tag">[\s\S]*?<\/span>\s*/g,'')
          .replace(/<details class="memo">[\s\S]*?<\/details>\s*/g,'')
          .replace(/<div class="repo-id">[\s\S]*?<\/div>\s*/g,'')
          .replace(/<div class="project-bottom">[\s\S]*?<\/div>\s*/g,'');
        const title=body.match(/<h3>[\s\S]*?<\/h3>/)?.[0];
        if(!title)throw Error('Missing project title in '+file+': '+id);
        const line='<div class="project-title-line">'+title+
          flagMarkup(flag)+metricBadge(metric)+'</div>';
        if(/<div class="project-title-line">/.test(body)){
          body=body.replace(/<div class="project-title-line">[\s\S]*?<\/div>/,line);
        }else{
          body=body.replace(title,line);
        }
        if(editorial){
          if(/<p class="project-detail">[\s\S]*?<\/p>/.test(body)){
            body=body.replace(/<p class="project-detail">[\s\S]*?<\/p>/,
              '<p class="project-detail">'+esc(editorial)+'</p>');
          }else{
            body=body.replace(/<p class="project-summary">[\s\S]*?<\/p>/,
              m=>m+'\n    <p class="project-detail">'+esc(editorial)+'</p>');
          }
        }
        newAttrs=newAttrs.replace(/\sid="[^"]*"/g,'');
        return '<article class="project"'+newAttrs+' id="project-'+String(matchCount).padStart(2,'0')+'">'+body+'</article>';
      });
      const declared=Number(html.match(/<meta name="radar-count" content="(\d+)">/)?.[1]);
      if(matchCount!==declared)throw Error('Cannot safely update every project in '+file);
      next=next.replace('<h1>今天，有哪些项目<br><em>值得打开看看。</em></h1>',
        '<h1>这一期，有哪些项目<br><em>值得打开看看。</em></h1>');
      next=next.replace(/每日 GitHub 项目雷达 · \d{4}-\d{2}-\d{2} · \d+ 个项目/g,
        '收录 '+declared+' 个 GitHub 项目 · 持续归档');
      next=next.replace(/(<span class="dash">\/</span>)\s*(\d{4} \/ \d{2} \/ \d{2})(<\/div>)/,
        (_,prefix,label,end)=>prefix+' <time datetime="'+year+'-'+month+'-'+filename.slice(0,2)+'">'+label+'</time>'+end);
      next=next.replace('展开查看全部名称','展开后可跳到对应项目');
      let linkIndex=0;
      next=next.replace(/(<details class="overview">[\s\S]*?<ol>)([\s\S]*?)(<\/ol>[\s\S]*?<\/details>)/,
        (_,opening,list,ending)=>{
          const converted=list.replace(/<li><a href="https:\/\/github\.com\/[^"]+"[^>]*>/g,()=>{
            linkIndex++;
            return '<li><a href="#project-'+String(linkIndex).padStart(2,'0')+'">';
          });
          if(linkIndex && linkIndex!==matchCount)throw Error('Overview count mismatch in '+file);
          return opening+converted+ending;
        });
      if(!linkIndex && !next.includes('href="#project-01"'))throw Error('Overview anchors missing in '+file);
      if(next!==html){fs.writeFileSync(file,next);changed++;}
      seen+=matchCount;
    }
  }
}
const absent=[...cards].filter(id=>!EDITORIAL.has(id));
console.log('Project presentation refreshed: '+changed+' historical HTML files, '+seen+' cards, '+cards.size+' unique repositories; authored: '+(cards.size-absent.length));
if(absent.length)console.log('Uncurated repositories keeping existing evidence: '+absent.join(', '));
