const UNSUITABLE = /^(?:install|installation|quick start|getting started|prerequisites|setup|usage|contributing|license|sponsor|support|community|release|download|table of contents|join us|getting help|thanks|credits|disclaimer|documentation|badges|screenshots|更新日志|安装|快速开始|下载|使用说明|贡献|许可证|目录|赞助|致谢)/i;
const INTERESTING = /^(?:key\s+)?(?:features?|highlights?|capabilities|what\s+(?:it\s+)?does|why\s+(?:use|choose)|overview|supported\s+functions|use\s+cases|核心功能|功能|特点|主要特性|功能特性|支持的功能|特色|特性|功能介绍|亮点|用法|适用场景)(?:\b|[：:])/i;

export function cleanLine(line){
  return String(line||'').replace(/!\[[^\]]*\]\([^)]+\)/g,'')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
    .replace(/<[^>]*>/g,' ')
    .replace(/https?:\/\/\S+/g,'')
    .replace(/[\x60*_>|]/g,'')
    .replace(/^\s*[-+]\s+/,'')
    .replace(/^\s*\d+[.)]\s+/,'')
    .replace(/\s+/g,' ').trim();
}
export function extractReadmeFacts(readme){
  if(!readme)return '';
  const raw=String(readme).slice(0,30000)
    .replace(/\x60{3}[\s\S]*?\x60{3}/g,'\n')
    .replace(/<!--[\s\S]*?-->/g,'\n');
  const lines=raw.split(/\r?\n/);
  let interesting=false;
  const featured=[],intro=[];
  for(const line of lines){
    const clean=cleanLine(line);
    if(/^#{1,4}\s/.test(line)){
      const heading=clean.replace(/^#+\s*/,'');
      interesting=INTERESTING.test(heading);
      if(UNSUITABLE.test(heading))interesting=false;
      continue;
    }
    if(!clean || clean.length<35 || clean.length>330 ||
       /^(?:https?:|npm |pnpm |bun |pip |curl |docker |git clone|[|]|#)/i.test(clean)||
       /^\[(?:!\[|.+badge)/i.test(line) ||
       /\[[^\]]{1,30}\]\(#/.test(line))continue;
    const rawList=/^\s*(?:[-*+]|\d+[.)])\s/.test(line);
    if(interesting && (rawList || clean.length<235) && featured.length<5){
      featured.push(clean);
    }else if(!featured.length && !UNSUITABLE.test(clean) && intro.length<3 && clean.length>=65 && clean.length<=260 && !/^\s*\|/.test(line)){
      intro.push(clean);
    }
  }
  const selected=featured.length>=2?featured:featured.length?featured.concat(intro.slice(0,1)):intro;
  const unique=[...new Set(selected)].filter(x=>x && !UNSUITABLE.test(x)).slice(0,4);
  return unique.join('；').slice(0,460);
}
