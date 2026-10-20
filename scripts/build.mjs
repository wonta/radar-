import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {esc,unesc,shell,CATEGORIES,validDate,validRepo,archivePath} from './site.mjs';

const LOCKED = {
  'catalog.tsv': 'aac59154e2ff3deec9038cc46af5cc540c93512e54d5363ab89dd13f36cf216c',
  'issues.tsv': 'b62bf2f6cd00b6129ada48a51e8700aca9f2e4cc7443ab53abff32fb7df61f74'
};
for (const [name, expected] of Object.entries(LOCKED)) {
  const current = createHash('sha256').update(fs.readFileSync('data/' + name)).digest('hex');
  if (current !== expected) throw Error('Frozen legacy TSV changed: ' + name);
}
const root = 'archive';
const days = [];
if (!fs.existsSync(root)) throw Error('Missing HTML archive');
for (const y of fs.readdirSync(root, {withFileTypes:true}).filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))) {
  for (const m of fs.readdirSync(path.join(root,y.name), {withFileTypes:true}).filter(e => e.isDirectory() && /^(0[1-9]|1[0-2])$/.test(e.name))) {
    for (const fname of fs.readdirSync(path.join(root,y.name,m.name)).filter(n => /^(0[1-9]|[12]\d|3[01])\.html$/.test(n))) {
      const date = [y.name,m.name,fname.slice(0,2)].join('-');
      if (!validDate(date)) throw Error('Invalid date path: ' + date);
      const file = archivePath(date);
      const html = fs.readFileSync(file,'utf8');
      const meta = html.match(/<meta name="radar-date" content="([^"]+)">/);
      const count = html.match(/<meta name="radar-count" content="(\d+)">/);
      if (meta?.[1] !== date || !count) throw Error('Malformed issue page: ' + file);
      const projects = [];
      for (const match of html.matchAll(/<article class="project"([^>]*)>/g)) {
        const fields = Object.fromEntries([...match[1].matchAll(/\s(data-[a-z-]+)="([^"]*)"/g)].map(([,k,v]) => [k,unesc(v)]));
        if (!validRepo(fields['data-repo'])) throw Error('Missing repository in ' + file);
        projects.push({
          id: fields['data-repo'],
          name: fields['data-name'] || fields['data-repo'],
          summary: fields['data-summary'] || '',
          detail: fields['data-detail'] || '',
          category: fields['data-category'] || 'dev',
          tags: fields['data-tags'] || '',
          date, file
        });
      }
      if (projects.length !== Number(count[1]) || !projects.length) throw Error('Project count mismatch: ' + file);
      days.push({date,file,count:projects.length,projects});
    }
  }
}
days.sort((a,b) => b.date.localeCompare(a.date));
if (!days.length) throw Error('No historical HTML issues to publish');
const years = [...new Set(days.map(d=>d.date.slice(0,4)))].sort().reverse();
const months = year => [...new Set(days.filter(d=>d.date.startsWith(year)).map(d=>d.date.slice(5,7)))].sort().reverse();
const span = (value,extra='') => `<span class="count">${value}${extra}</span>`;
const linkCard = (href,title,subtitle,count,label) =>
  `<a class="archive-card" href="${href}"><span class="archive-label">${esc(label)}</span><strong>${esc(title)}</strong><span class="archive-desc">${esc(subtitle)}</span>${span(count, ' 期')}<span class="card-arrow" aria-hidden="true">↗</span></a>`;
const archiveHead = (eyebrow,title,sub) => `<div class="eyebrow">${esc(eyebrow)}</div><div class="archive-intro"><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>`;
function writeIfChanged(file,value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if (!fs.existsSync(file) || fs.readFileSync(file,'utf8') !== value) fs.writeFileSync(file,value);
}
const allBody = archiveHead('ARCHIVE / ALL YEARS','历史日报','每日独立 HTML，按年份与月份整理。历史页面保留原始日期。') +
  `<div class="archive-grid">${years.map(y => linkCard(y+'/index.html',y+' 年',months(y).length+' 个月份',days.filter(d=>d.date.startsWith(y)).length,'年度归档')).join('')}</div>`;
writeIfChanged('archive/index.html',shell({title:'历史归档',body:allBody,prefix:'../'}));
for (const year of years) {
  const monthsList = months(year);
  const body = archiveHead('ARCHIVE / '+year,year+' 年归档','选择月份查看当月日报。') +
    `<p class="crumb"><a href="../index.html">← 所有年份</a></p><div class="archive-grid">` +
    monthsList.map(m => linkCard(m+'/index.html',year+' / '+m,year+' 年 '+m+' 月',days.filter(d=>d.date.startsWith(year+'-'+m+'-')).length,'月度归档')).join('')+'</div>';
  writeIfChanged(`archive/${year}/index.html`,shell({title:year+' 年归档',body,prefix:'../../'}));
  for (const month of monthsList) {
    const items = days.filter(d=>d.date.startsWith(year+'-'+month+'-'));
    const bodyMonth = archiveHead('ARCHIVE / '+year+' / '+month,year+' 年 '+month+' 月',`共 ${items.length} 期日报，按日期倒序排列。`) +
      `<p class="crumb"><a href="../index.html">← ${year} 年归档</a></p>` +
      `<div class="day-list">${items.map(d=>`<a href="${d.date.slice(8)}.html"><span class="day-number">${d.date.slice(8)} <small>${esc(d.date)}</small></span><span>${d.count} 个开源项目</span><span class="day-arrow">→</span></a>`).join('')}</div>`;
    writeIfChanged(`archive/${year}/${month}/index.html`,shell({title:year+' 年 '+month+' 月',body:bodyMonth,prefix:'../../../'}));
  }
}
const latest = days[0];
const latestHtml = fs.readFileSync(latest.file,'utf8');
writeIfChanged('index.html',latestHtml.replaceAll('href="../../../','href="').replaceAll('src="../../../','src="'));

const projects = new Map();
for (const day of days) for (const p of day.projects) {
  const id = p.id.toLowerCase();
  if (!projects.has(id)) projects.set(id,p);
}
const list = [...projects.values()];
const options = Object.entries(CATEGORIES).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
const cards = list.map(p => {
  const href = p.file;
  const search = [p.id,p.name,p.summary,p.detail,p.tags,CATEGORIES[p.category]||''].join(' ').toLowerCase();
  return `<article class="search-card" data-search="${esc(search)}" data-category="${esc(p.category)}" data-repo="${esc(p.id.toLowerCase())}">
    <div class="search-card-title"><h2><a href="https://github.com/${p.id}" target="_blank" rel="noopener noreferrer">${esc(p.name)} ↗</a></h2><button class="save-button" type="button" data-save="${esc(p.id.toLowerCase())}" aria-pressed="false">☆ 收藏</button></div>
    <p class="repo-id">${esc(p.id)}</p><p>${esc(p.summary)}</p>
    <div class="search-card-foot"><span class="tag">${esc(CATEGORIES[p.category]||'开发工具')}</span><a href="${href}">${esc(p.date)} 的日报 →</a></div>
  </article>`;
}).join('');
const searchBody = archiveHead('PROJECT LIBRARY / SEARCH','项目搜索','按项目名称、用途、关键词与分类查找历史日报中的开源项目。') +
  `<div class="search-tools"><label for="q">关键词搜索</label><input id="q" type="search" placeholder="输入项目名、用途、MCP、日语……" autocomplete="off">` +
  `<label for="category">项目分类</label><select id="category"><option value="">全部分类</option>${options}</select>` +
  `<label class="saved-filter"><input type="checkbox" id="saved-only"> 仅看我的收藏</label></div>` +
  `<p class="results-count" id="results-count" role="status">${list.length} 个项目</p>` +
  `<div class="search-grid" id="search-results">${cards}</div>` +
  `<p class="search-empty" id="search-empty" hidden>没有找到符合条件的项目。试试清除关键词或筛选条件。</p>`;
writeIfChanged('search.html',shell({title:'项目搜索',body:searchBody}));

fs.rmSync('dist',{recursive:true,force:true});
for (const file of ['index.html','search.html','404.html','robots.txt','assets/site.css','assets/site.js','assets/radar.svg','archive/index.html']) {
  const target=path.join('dist',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(file,target);
}
for (const year of years) {
  for (const month of months(year)) {
    for (const file of [`archive/${year}/index.html`,`archive/${year}/${month}/index.html`,...days.filter(d=>d.date.startsWith(year+'-'+month+'-')).map(d=>d.file)]) {
      const target=path.join('dist',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
    }
  }
}
fs.writeFileSync('dist/.nojekyll','');
console.log(`Published ${days.length} static HTML issues, ${projects.size} searchable repositories. No JSON output.`);
