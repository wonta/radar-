import {hasReadableChinese} from './curated-zh.mjs';

const tidy = value => String(value ?? '').replace(/<[^>]+>/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
  .replace(/https?:\/\/\S+/g,' ')
  .replace(/:[a-z_-]+:/gi,' ')
  .replace(/\s+/g,' ').trim();

export function clipBytes(value,limit=380) {
  const result=[];
  let count=0;
  for(const c of tidy(value)) {
    const size=Buffer.byteLength(c,'utf8');
    if(count+size>limit)break;
    result.push(c);count+=size;
  }
  return result.join('').trim();
}
export async function translateToChinese(text,{fetcher=fetch,limit=380}={}) {
  const source=clipBytes(text,limit);
  if(!source)return '';
  if(hasReadableChinese(source))return source;
  const japanese=/[\u3040-\u30ff]/.test(source);
  const params=new URLSearchParams({q:source,langpair:(japanese?'ja':'en')+'|zh-CN'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetcher('https://api.mymemory.translated.net/get?'+params.toString(),{signal:controller.signal});
    if(!response.ok)throw Error('Translation service HTTP '+response.status);
    const data=await response.json();
    if(Number(data.responseStatus)!==200)throw Error('Translation service: '+String(data.responseDetails||data.responseStatus));
    const output=tidy(data.responseData?.translatedText).replace(/&quot;/g,'"').replace(/&#39;/g,"'")
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    if(!hasReadableChinese(output))throw Error('Translation did not produce Chinese');
    return output;
  }finally{clearTimeout(timeout);}
}
