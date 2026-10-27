import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {archivePath,validDate,validRepo,esc} from '../scripts/site.mjs';

const file = date => fs.readFileSync(archivePath(date),'utf8');
const count = date => Number(file(date).match(/<meta name="radar-count" content="(\d+)">/)[1]);
const locked = {
  'catalog.tsv':'aac59154e2ff3deec9038cc46af5cc540c93512e54d5363ab89dd13f36cf216c',
  'issues.tsv':'b62bf2f6cd00b6129ada48a51e8700aca9f2e4cc7443ab53abff32fb7df61f74'
};
test('frozen TSV inputs are byte-identical',()=>{
  for(const [name,sha] of Object.entries(locked))
    assert.equal(createHash('sha256').update(fs.readFileSync('data/'+name)).digest('hex'),sha);
});
test('all seven legacy HTML issues keep original daily counts',()=>{
  assert.deepEqual(Array.from({length:7},(_,i)=>count(`2026-10-${String(i+10)}`)),[24,24,28,28,24,21,25]);
});
test('October 18-20 editorial archives remain available',()=>{
  assert.deepEqual([18,19,20].map(d=>count('2026-10-'+d)),[18,17,20]);
});
test('historic different REA metrics are preserved by date',()=>{
  assert.match(file('2026-10-10'),/\+15,335 \/ 日/);
  assert.match(file('2026-10-16'),/\+32,282 \/ 日/);
});
test('latest home and month/year indexes link to independent HTML',()=>{
  const home=fs.readFileSync('dist/index.html','utf8');
  assert.match(home,/<meta name="radar-date" content="\d{4}-\d{2}-\d{2}">/);
  assert.match(fs.readFileSync('dist/archive/2026/10/index.html','utf8'),/20\.html/);
  assert.match(fs.readFileSync('dist/archive/2026/index.html','utf8'),/10\/index\.html/);
  assert.match(fs.readFileSync('dist/archive/index.html','utf8'),/2026\/index\.html/);
});
test('search database is rendered as HTML, not a JSON request',()=>{
  const html=fs.readFileSync('dist/search.html','utf8');
  assert.match(html,/morluto\/rea/);
  assert.match(html,/class="search-card"/);
  assert.doesNotMatch(html,/data-search=/);
  assert.match(html,/id="saved-only"/);
  assert.doesNotMatch(html,/radar\.json/);
});
test('there are no daily JSON source files or published JSON files',()=>{
  assert.equal(fs.existsSync('content/issues'),false);
  assert.equal(fs.existsSync('dist/data'),false);
  const checkDir=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.isDirectory())checkDir(dir+'/'+e.name);
    else assert.ok(!e.name.endsWith('.json'),e.name);
  }};
  checkDir('dist');
});
test('archive path and project IDs cannot traverse the filesystem',()=>{
  assert.equal(validDate('2026-02-30'),false);
  assert.throws(()=>archivePath('../2026-10-20'));
  assert.equal(validRepo('owner/..'),false);
  assert.equal(validRepo('owner/repo'),true);
});
test('untrusted project text is HTML escaped',()=>assert.equal(esc('<img onerror="x">&'), '&lt;img onerror=&quot;x&quot;&gt;&amp;'));
test('legacy published flat URLs get a compatibility redirect',()=>{
  const html=fs.readFileSync('dist/404.html','utf8');
  assert.match(html,/assets\/site\.js/);
  const script=fs.readFileSync('dist/assets/site.js','utf8');
  assert.match(script,/archive.*location\.replace|location\.replace.*archive/s);
});

test('automated issue cards are concise Chinese introductions without collection logs',()=>{
  for(const day of [24,25,26]) {
    const html=file('2026-10-'+day);
    assert.doesNotMatch(html,/README 摘录|发现来源：|近期 Release：|自动候选项目|尚未人工核验/);
    const summaries=[...html.matchAll(/<article class="project"[^>]*data-summary="([^"]+)"/g)];
    assert.equal(summaries.length,20);
    for(const match of summaries)assert.match(match[1],/[\u4e00-\u9fff]{2,}/);
    assert.doesNotMatch(html,/<p class="project-note">/);
  }
});

test('REA page explains concrete analysis targets and tools instead of generic boilerplate',()=>{
  for(const day of [24,25,26]){
    const html=file('2026-10-'+day);
    const card=html.match(/<article class="project" data-repo="morluto\/rea"[\s\S]*?<\/article>/)?.[0];
    assert.ok(card,'missing REA card');
    assert.match(card,/Ghidra/);
    assert.match(card,/Electron\/JavaScript/);
    assert.match(card,/JADX/);
    assert.match(card,/preload/);
    assert.doesNotMatch(card,/整合多种逆向调查能力/);
  }
});

test('all dated archives have no visible tag pills or personal notes',()=>{
  for(const year of ['2026'])for(const month of ['10']){
    const dir='archive/'+year+'/'+month;
    for(const filename of fs.readdirSync(dir).filter(x=>/^\d{2}\.html$/.test(x))){
      const html=fs.readFileSync(dir+'/'+filename,'utf8');
      assert.doesNotMatch(html,/<div class="tags">|<span class="tag">|class="memo"|私人笔记|data-note=|data-tags=/);
    }
  }
});
test('recent published issue has substantial individual Chinese project descriptions',()=>{
  const html=file('2026-10-26');
  const cards=[...html.matchAll(/<article class="project"([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length,20);
  for(const [,card] of cards){
    const detail=card.match(/data-detail="([^"]*)"/)?.[1]||'';
    assert.ok(detail.length>=100,'short project description: '+card.slice(0,90));
  }
});

test('all issue cards display Stars next to title and omit duplicate repository labels',()=>{
  const dir='archive/2026/10';
  for(const fileName of fs.readdirSync(dir).filter(x=>/^\d{2}\.html$/.test(x))){
    const html=fs.readFileSync(dir+'/'+fileName,'utf8');
    const cards=[...html.matchAll(/<article class="project"([\s\S]*?)<\/article>/g)];
    assert.ok(cards.length>0);
    for(const [,card] of cards){
      assert.match(card,/data-metric="[^"]+"/);
      assert.match(card,/class="project-title-line"/);
      assert.match(card,/class="project-title-line"[\s\S]*?class="metric"/);
      assert.doesNotMatch(card,/class="repo-id"|class="project-bottom"|<span class="flag">/);
      assert.equal((card.match(/class="metric"/g)||[]).length,1);
    }
  }
});
test('historic CN and JP flags are restored as icons without inventing nationality',()=>{
  const original=file('2026-10-10');
  assert.match(original,/data-repo="alibaba\/open-code-review"[\s\S]*?aria-label="中文相关项目"/);
  assert.match(original,/data-repo="CAPCOM-TD-OSS\/REDox"[\s\S]*?aria-label="日本相关项目"/);
  const latest=file('2026-10-26');
  assert.match(latest,/data-repo="togatoga\/karukan"[\s\S]*?aria-label="日本相关项目"/);
});
test('28 Stars and intentic evidence appear next to project names and in search',()=>{
  const html=file('2026-10-26');
  const cromford=html.match(/<article class="project" data-repo="cromford-ai\/cromford"[\s\S]*?<\/article>/)?.[0];
  assert.ok(cromford);
  assert.match(cromford,/class="project-title-line"[\s\S]*?★ 28 Stars/);
  const intentic=html.match(/<article class="project" data-repo="intentic\/intentic"[\s\S]*?<\/article>/)?.[0];
  assert.ok(intentic);
  assert.doesNotMatch(intentic,/class="repo-id"/);
  assert.match(intentic,/独立 Git worktree/);
  assert.match(intentic,/自动启动代理/);
  assert.match(intentic,/出站隧道/);
  const search=fs.readFileSync('dist/search.html','utf8');
  const result=search.match(/<article class="search-card"[^>]*data-repo="intentic\/intentic"[\s\S]*?<\/article>/)?.[0];
  assert.ok(result);
  assert.doesNotMatch(result,/class="repo-id"/);
  assert.match(result,/class="project-title-line"[\s\S]*?class="metric"/);
});

test('description typography collapses blank lines without discarding details',()=>{
  const css=fs.readFileSync('dist/assets/site.css','utf8');
  assert.match(css,/\.project-detail\{[^}]*white-space:normal\}/);
  assert.match(css,/\.search-card \.search-detail\{[^}]*white-space:normal\}/);
  const html=file('2026-10-26');
  const cromford=html.match(/<article class="project" data-repo="cromford-ai\/cromford"[\s\S]*?<\/article>/)?.[0];
  assert.ok(cromford);
  assert.match(cromford,/每个阶段可指定不同模型/);
  assert.match(cromford,/进入合并、部署验证和线上复查/);
});

test('archive issues have meaningful date headings and in-page overview navigation',()=>{
  const path='archive/2026/10';
  const files=fs.readdirSync(path).filter(f=>/^\d{2}\.html$/.test(f));
  assert.ok(files.length>=16);
  for(const name of files){
    const html=fs.readFileSync(path+'/'+name,'utf8');
    assert.doesNotMatch(html,/<h1>今天，/);
    assert.match(html,/<h1>这一期，有哪些项目/);
    const ids=[...html.matchAll(/<article class="project"[^>]*id="(project-\d{2})"/g)].map(m=>m[1]);
    const anchors=[...html.matchAll(/<li><a href="#(project-\d{2})"/g)].map(m=>m[1]);
    assert.equal(ids.length,Number(html.match(/name="radar-count" content="(\d+)"/)?.[1]),name);
    assert.equal(new Set(ids).size,ids.length,name);
    assert.deepEqual(anchors,ids,name);
  }
});
test('search records avoid duplicate description attributes and remain an HTML document',()=>{
  const html=fs.readFileSync('dist/search.html','utf8');
  assert.doesNotMatch(html,/data-search=/);
  assert.match(html,/id="load-more"[^>]*hidden/);
  assert.match(html,/class="search-field search-field-query"/);
  assert.match(html,/class="search-field search-field-category"/);
  assert.equal((html.match(/class="search-card"/g)||[]).length,234);
});
test('archive indexes provide useful navigation without oversized duplicated dates',()=>{
  const all=fs.readFileSync('dist/archive/index.html','utf8');
  const year=fs.readFileSync('dist/archive/2026/index.html','utf8');
  const month=fs.readFileSync('dist/archive/2026/10/index.html','utf8');
  assert.match(all,/class="archive-recent"/);
  assert.match(year,/class="archive-grid archive-grid-compact"/);
  assert.match(year,/class="archive-recent"/);
  assert.match(month,/26 日 <small>周一<\/small>/);
  assert.match(month,/aria-label="2026-10-26，20 个开源项目"/);
  assert.doesNotMatch(month,/<small>2026-10-26<\/small>/);
});
test('secondary type color contrast is sufficient on paper and white surfaces',()=>{
  const css=fs.readFileSync('dist/assets/site.css','utf8');
  const hex=k=>css.match(new RegExp(k+':(#[a-fA-F0-9]{6})'))?.[1];
  const light=color=>{const n=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*n[0]+0.7152*n[1]+0.0722*n[2]};
  const contrast=(a,b)=>{const aa=light(a),bb=light(b);return (Math.max(aa,bb)+0.05)/(Math.min(aa,bb)+0.05)};
  for(const token of ['--muted','--accent']){
    assert.ok(hex(token),'missing '+token);
    assert.ok(contrast(hex(token),'#f7f8f4')>=4.5,'paper contrast '+token);
    assert.ok(contrast(hex(token),'#ffffff')>=4.5,'white contrast '+token);
  }
});
