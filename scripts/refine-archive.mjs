import fs from 'node:fs';
import path from 'node:path';
import {EDITORIAL_OLDER_A} from './editorial-older-a.mjs';
import {EDITORIAL_OLDER_B} from './editorial-older-b.mjs';
import {EDITORIAL_OLDER_C} from './editorial-older-c.mjs';
import {EDITORIAL_MIDDLE} from './editorial-middle.mjs';
import {EDITORIAL_RECENT} from './editorial-recent.mjs';
import {esc,unesc} from './site.mjs';

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
      const next=html.replace(/<article class="project"([^>]*)>([\s\S]*?)<\/article>/g,(full,attrs,inside)=>{
        matchCount++;
        const id=attr(attrs,'data-repo').toLowerCase();
        if(!id)throw Error('Project id missing in '+file);
        cards.add(id);
        const editorial=EDITORIAL.get(id);
        const original=attr(attrs,'data-detail');
        const detail=editorial||original;
        if(!editorial)untouched.add(id);
        let newAttrs=attrs.replace(/\sdata-tags="[^"]*"/g,'');
        if(/\sdata-detail="/.test(newAttrs)){
          newAttrs=newAttrs.replace(/\sdata-detail="[^"]*"/g,' data-detail="'+esc(detail)+'"');
        }else{
          newAttrs+=' data-detail="'+esc(detail)+'"';
        }
        let body=inside
          .replace(/<div class="tags">[\s\S]*?<\/div>\s*/g,'')
          .replace(/<span class="tag">[\s\S]*?<\/span>\s*/g,'')
          .replace(/<details class="memo">[\s\S]*?<\/details>\s*/g,'');
        if(editorial){
          if(/<p class="project-detail">[\s\S]*?<\/p>/.test(body)){
            body=body.replace(/<p class="project-detail">[\s\S]*?<\/p>/,
              '<p class="project-detail">'+esc(editorial)+'</p>');
          }else{
            body=body.replace('<div class="project-bottom">',
              '<p class="project-detail">'+esc(editorial)+'</p>\n    <div class="project-bottom">');
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
