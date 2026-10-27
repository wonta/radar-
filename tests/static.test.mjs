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
  assert.match(html,/data-search=/);
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
