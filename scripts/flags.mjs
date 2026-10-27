import fs from 'node:fs';

const source=fs.readFileSync(new URL('../data/catalog.tsv',import.meta.url),'utf8');
const known=new Map();
for(const row of source.split(/\r?\n/)){
  if(!row || row.startsWith('#'))continue;
  const [repo,, ,code]=row.split('|');
  if((code==='CN'||code==='JP')&&repo)known.set(repo.toLowerCase(),code);
}

const reviewedTopicFlags=new Map([
  ['ryuto42/kashiko-ime','JP'],
  ['owayo/noslop','JP'],
  ['togatoga/karukan','JP'],
  ['jasonin2099/hondana','JP'],
  ['silam741852963/linguist-anki-bridge','JP'],
  ['snowkiss13/ja-writing-norms','JP'],
  ['rei0623/afnjp','JP'],
  ['jindx/jp.htmlspecs.com','JP'],
  ['fatcorn753/discord-management-bot','JP'],
  ['fatcorn753/discord-casino-bot','JP'],
  ['iszgroup/shiwake-ai','JP'],
  ['haru-powerplatform/pa45','JP'],
  ['pengchujin/aerial-tv','CN'],
  ['xiaoyang111222/cn-math-taxonomy','CN']
]);

export function flagForRepo(id,explicit='',topics=[]){
  const code=String(explicit||'').toUpperCase();
  if(code==='CN'||code==='JP')return code;
  const matching=known.get(String(id||'').toLowerCase())||
    reviewedTopicFlags.get(String(id||'').toLowerCase());
  if(matching)return matching;
  const tokens=Array.isArray(topics)?topics:[];
  if(tokens.some(t=>/^(?:japanese|japanese-language|japanese-ime)$/.test(t)))return 'JP';
  if(tokens.some(t=>/^(?:chinese|chinese-language|simplified-chinese)$/.test(t)))return 'CN';
  return '';
}

export function flagMarkup(code){
  if(code==='CN')return '<span class="project-flag" role="img" title="中文相关项目" aria-label="中文相关项目">🇨🇳</span>';
  if(code==='JP')return '<span class="project-flag" role="img" title="日本相关项目" aria-label="日本相关项目">🇯🇵</span>';
  return '';
}
