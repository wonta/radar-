const UPDATE_LOG=/^(?:v\d+\.\d|release\b|changelog\b|版本说明|版本更新|更新日志|更新记录|更新日期|最新源码|近期\s*release)/i;
const TEMPLATE_NOISE=/(?:README\s*摘录|发现来源：|自动候选项目|未经人工翻译|迅速安装|复制粘贴.*快速开始|详见\s*更新|点击下载(?:最新)?版本)/i;
const INCOMPLETE_END=/[；，、：:（(—-]$/u;
const SENTENCE_END=/[。！？.!?）】”』]$/u;

export function cleanCopy(value){
  return String(value??'')
    .replace(/&(?:amp|quot|lt|gt|#39|nbsp);/g,m=>({'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&#39;':"'",'&nbsp;':' '}[m]))
    .replace(/<[^>]*>/g,' ')
    .replace(/\s+/g,' ').trim();
}
export function completeSentences(value,{limit=420,min=40}={}){
  const source=cleanCopy(value);
  if(source.length<=limit)return source;
  const clipped=source.slice(0,limit);
  const marks=[...clipped.matchAll(/[。！？.!?；]/gu)];
  const end=marks.at(-1)?.index;
  if(end===undefined||end<min)return '';
  return clipped.slice(0,end+1).replace(/[；]$/,'。').trim();
}
export function isQualityChinese(summary,detail){
  const s=cleanCopy(summary),d=cleanCopy(detail);
  if(s.length<25||s.length>225||d.length<100||d.length>650)return false;
  const zh=s=>(s.match(/[\u4e00-\u9fff]/gu)||[]).length;
  if(zh(s)<12||zh(d)<48)return false;
  if(UPDATE_LOG.test(s)||UPDATE_LOG.test(d)||TEMPLATE_NOISE.test(s)||TEMPLATE_NOISE.test(d))return false;
  if(INCOMPLETE_END.test(s)||INCOMPLETE_END.test(d))return false;
  if(!SENTENCE_END.test(s)||!SENTENCE_END.test(d))return false;
  if(d.startsWith(s)&&d.length-s.length<70)return false;
  if((d.match(/https?:\/\//g)||[]).length>1)return false;
  if(/\uFFFD|(?:\bundefined\b)|(?:\bnull\b)/i.test(d))return false;
  return true;
}
