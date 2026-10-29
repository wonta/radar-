import test from 'node:test';
import assert from 'node:assert/strict';
import {hasModelConfig,validateEditorial,summarizeProject} from '../scripts/editorial-llm.mjs';
import {EDITORIAL_20261029} from '../scripts/editorial-2026-10-29.mjs';

test('no model settings mean no LLM call',async()=>{
  assert.equal(hasModelConfig({}),false);
  let called=false;
  const result=await summarizeProject({repository:'owner/repo',readme:'x'.repeat(500),env:{},fetcher:()=>{called=true;throw Error('network');}});
  assert.equal(result,null);assert.equal(called,false);
});

test('incomplete and excerpted content is rejected',()=>{
  assert.throws(()=>validateEditorial({summary:'中文简介不足',detail:'复制 README 开头'}));
  assert.throws(()=>validateEditorial({summary:'这是一个用于本地文档整理的项目，可以归档素材。',detail:'该项目'.repeat(90)+'，'}));
});

test('Oct 29 manually reviewed descriptions are substantial and complete',()=>{
  assert.equal(EDITORIAL_20261029.size,14);
  for(const [repo,detail] of EDITORIAL_20261029){
    assert.ok(detail.length>=150,repo);
    assert.match(detail,/。$/);
    assert.ok(!detail.endsWith('，'),repo);
  }
});

test('model output must be valid, complete JSON',async()=>{
  const env={RADAR_LLM_API_URL:'https://example.invalid/chat/completions',RADAR_LLM_API_KEY:'test',RADAR_LLM_MODEL:'test-model'};
  const ok={summary:'这是一个用于离线文档检索与管理的工具，支持本地知识库搜索和来源追踪。',detail:'这个工具把个人文档存放在本机并建立可搜索索引，用户可以导入资料，按关键词查询并查看出处。'.repeat(3)+'需要提前安装运行环境，具体版本要求以仓库的安装说明为准。'};
  let calls=0;
  const output=await summarizeProject({repository:'owner/repo',readme:'This is an example README. '.repeat(30),env,fetcher:async()=>{calls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(ok)}}]})}}}});
  assert.equal(calls,1);assert.deepEqual(output,ok);
});
