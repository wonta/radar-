import test from 'node:test';
import assert from 'node:assert/strict';
import {translateToChinese,clipBytes} from '../scripts/translate.mjs';

test('translate a short English technical description to Chinese',async()=>{
  const fetcher=async url=>{
    const parsed=new URL(url);
    assert.equal(parsed.searchParams.get('langpair'),'en|zh-CN');
    assert.match(parsed.searchParams.get('q'),/Linux kernel module/);
    return {ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'这是一个用于 Linux 的内核模块。'}})};
  };
  assert.equal(await translateToChinese('Linux kernel module for Nvidia GPUs',{fetcher}),'这是一个用于 Linux 的内核模块。');
});
test('already Chinese summaries do not call a translator',async()=>{
  const fetcher=()=>{throw Error('unexpected translation')};
  assert.equal(await translateToChinese('用于管理多个 AI 智能体的轻量工具',{fetcher}),'用于管理多个 AI 智能体的轻量工具');
});
test('English translations must contain real Chinese',async()=>{
  const fetcher=async()=>({ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'Quick Start. Copy this command.'}})});
  await assert.rejects(translateToChinese('Tool with API integrations and web UI',{fetcher}),/Chinese/);
});
test('single request is limited to the API byte cap',()=>{
  assert.ok(Buffer.byteLength(clipBytes('日本語説明を使用する'.repeat(100),380),'utf8')<=380);
});
