import fs from 'node:fs';
import path from 'node:path';
import {EDITORIAL_OLDER_A} from './editorial-older-a.mjs';
import {EDITORIAL_OLDER_B} from './editorial-older-b.mjs';
import {EDITORIAL_OLDER_C} from './editorial-older-c.mjs';
import {EDITORIAL_MIDDLE} from './editorial-middle.mjs';
import {EDITORIAL_RECENT} from './editorial-recent.mjs';
import {EDITORIAL_20261029} from './editorial-2026-10-29.mjs';
import {esc,unesc,metricBadge} from './site.mjs';
import {flagForRepo,flagMarkup} from './flags.mjs';

export const EDITORIAL = new Map([
  ...EDITORIAL_OLDER_A,
  ...EDITORIAL_OLDER_B,
  ...EDITORIAL_OLDER_C,
  ...EDITORIAL_MIDDLE,
  ...EDITORIAL_RECENT,
  ...EDITORIAL_20261029
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
      const next=html.replace(/<article class="project"([^>]*)>([\s\S]*?)<\/article>/g,(full,attrs,inside)=>{
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
        return '<article class="project"'+newAttrs+'>'+body+'</article>';
      });
      const declared=Number(html.match(/<meta name="radar-count" content="(\d+)">/)?.[1]);
      if(matchCount!==declared)throw Error('Cannot safely update every project in '+file);
      if(next!==html){fs.writeFileSync(file,next);changed++;}
      seen+=matchCount;
    }
  }
}
const absent=[...cards].filter(id=>!EDITORIAL.has(id));
console.log('Project presentation refreshed: '+changed+' historical HTML files, '+seen+' cards, '+cards.size+' unique repositories; authored: '+(cards.size-absent.length));
if(absent.length)console.log('Uncurated repositories keeping existing evidence: '+absent.join(', '));
