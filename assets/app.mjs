import {CATEGORIES, normalizeId, escapeHtml as esc, makeIndex, validateData, formatMetric, normalizePersonal} from './model.mjs';

const root=document.getElementById('app');
const STORE='radar-personal-v2';
let data,index,route,personal={version:2,saved:[],read:[],notes:{}},storageOK=true,toastTimer,searchTimer;
const icons={star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',external:'<path d="M14 4h6v6m0-6L10 14m-1-9H4v15h15v-5"/>',check:'<path d="m5 12 4 4 10-10"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',back:'<path d="M19 12H5m5-5-5 5 5 5"/>',github:'<path d="M8 21v-3c-4 1-4-2-5-3m14 6v-4c0-1-.3-1.7-1-2 3-.4 5-1.6 5-5a5 5 0 0 0-1.5-3.5A5 5 0 0 0 19 3s-1 0-3 1.5a13 13 0 0 0-8 0C6 3 5 3 5 3a5 5 0 0 0-.5 3.5A5 5 0 0 0 3 10c0 3.4 2 4.6 5 5-.7.3-1 1-1 2v4"/>'};
const icon=name=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.arrow)+'</svg>';
const flag=p=>p.flag==='CN'?'🇨🇳 ':p.flag==='JP'?'🇯🇵 ':'';
const gh=p=>'https://github.com/'+p.id;
const purl=p=>'#/project/'+p.id;
const durl=date=>'#/daily/'+date;
const saved=p=>personal.saved.includes(normalizeId(p.id));
const read=p=>personal.read.includes(normalizeId(p.id));
const number=n=>String(n).padStart(2,'0');
const stamp=date=>date.replaceAll('-','.');
const categoryLink=(category,label)=>'<a class="chip" href="#/projects?category='+encodeURIComponent(category)+'">'+esc(label||CATEGORIES[category])+'</a>';
const tagList=p=>'<div class="tags">'+p.tags.map(t=>'<a href="#/projects?tag='+encodeURIComponent(t)+'">'+esc(t)+'</a>').join('')+'</div>';
const metric=m=>'<span class="metric '+m.type+'" title="'+esc(m.verified?'有采集来源':'原日报热度记录，未重新核验')+'">'+(m.type==='total'?icon('star'):m.type==='daily'?'<span aria-hidden="true">↗</span>':'')+esc(formatMetric(m))+'</span>';
const saveButton=p=>'<button class="icon-button save '+(saved(p)?'is-saved':'')+'" data-save="'+esc(p.id)+'" aria-label="'+(saved(p)?'取消收藏 ':'收藏 ')+esc(p.name)+'" aria-pressed="'+saved(p)+'">'+icon('star')+'</button>';
const readButton=p=>'<button class="text-button '+(read(p)?'is-read':'')+'" data-read="'+esc(p.id)+'" aria-pressed="'+read(p)+'">'+icon('check')+(read(p)?'已读':'标为已读')+'</button>';
const empty=(title,body)=>'<div class="empty">'+icon('search')+'<h2>'+esc(title)+'</h2><p>'+esc(body)+'</p><a class="button" href="#/projects">浏览项目库 '+icon('arrow')+'</a></div>';
const sourceLine=()=>'<div class="source-line"><span class="dot"></span> 历史归档 · 热度为原日报记录，未复核 <a href="#/about">数据说明 ↗</a></div>';

function notify(message) {
  clearTimeout(toastTimer);const box=document.getElementById('toast');box.textContent=message;box.classList.add('show');toastTimer=setTimeout(()=>box.classList.remove('show'),3500);
}
function persist() {
  try{localStorage.setItem(STORE,JSON.stringify(personal));storageOK=true;return true;}catch{storageOK=false;notify('浏览器未能保存数据，请导出备份；当前会话仍可使用。');return false;}
}
function loadPersonal() {
  try{
    const current=localStorage.getItem(STORE);
    if(current) personal=normalizePersonal(JSON.parse(current),new Set(index.projects.keys()));
    else {
      const old=JSON.parse(localStorage.getItem('github-radar-saved-v1')||'[]');
      personal=normalizePersonal({version:2,saved:Array.isArray(old)?old:[],read:[],notes:{}},new Set(index.projects.keys()));
      persist();
    }
  }catch{storageOK=false;notify('本机收藏无法读取。未覆盖旧数据，可用导入功能恢复备份。');}
}
function parseRoute() {
  let hash=location.hash.slice(1)||'/daily';
  const aliases={home:'/daily',daily:'/daily',projects:'/projects',saved:'/saved',archive:'/archive'};
  hash=aliases[hash]||hash; const [path,qs='']=hash.split('?');const bits=path.split('/').filter(Boolean);
  return {view:bits[0]||'daily',value:decodeURIComponent(bits.slice(1).join('/')),params:new URLSearchParams(qs)};
}
function infoHeading(kicker,title,sub,actions='') {
  return '<div class="page-heading"><div><div class="eyebrow">'+kicker+'</div><h1 tabindex="-1">'+title+'</h1><p>'+sub+'</p></div>'+actions+'</div>';
}
function datesRail(current) {
  const all=index.issues;const recent=all.slice(0,7);const total=all.reduce((n,x)=>n+x.entries.length,0);
  return '<aside class="rail"><div class="rail-title">近期归档 <span>'+all.length+' 期</span></div><div class="date-list">'+recent.map((x,i)=>'<a href="'+durl(x.date)+'" class="'+(x.date===current?'active':'')+'"><span>'+stamp(x.date)+(i===0?'<em>最新</em>':'')+'</span><small>'+x.entries.length+' 项</small></a>').join('')+'</div><div class="rail-block"><div class="rail-title">沿着兴趣，继续发现</div><div class="topic-list">'+Object.entries(CATEGORIES).map(([k,v])=>'<a href="#/projects?category='+k+'">'+v+'<span>'+[...index.projects.values()].filter(p=>p.category===k).length+'</span></a>').join('')+'</div></div><div class="archive-note"><span class="eyebrow">YOUR OPEN SOURCE SHELF</span><strong>'+index.projects.size+'<small> 个不同项目</small></strong><p>'+total+' 条收录，各自保留当日记录。<br>今天的发现，也能在明天找到。</p><a href="#/projects">打开完整项目库 '+icon('arrow')+'</a></div></aside>';
}
function overview(issue) {
  return '<details class="overview"><summary><span>今日速览 <small>'+issue.entries.length+' 个项目</small></span><span class="summary-hint">展开列表 ＋</span></summary><div class="table-scroll"><table><caption class="sr-only">'+issue.date+' 项目速览，数字为原日报记录</caption><thead><tr><th>#</th><th>项目</th><th>原刊热度</th><th>一句话</th></tr></thead><tbody>'+issue.entries.map((e,i)=>{const p=index.projects.get(normalizeId(e.repo));return '<tr><td>'+number(i+1)+'</td><td><a class="repo-link" href="'+gh(p)+'" target="_blank" rel="noopener noreferrer">'+flag(p)+esc(p.name)+'</a></td><td>'+metric(e.metric)+'</td><td>'+esc(e.summary)+'</td></tr>';}).join('')+'</tbody></table></div></details>';
}
function feature(e,order) {
  const p=index.projects.get(normalizeId(e.repo));
  return '<article class="feature" id="item-'+normalizeId(p.id).replaceAll('/','--')+'"><div class="feature-number">'+number(order)+'</div><div class="feature-main"><div class="feature-top"><h3><a href="'+gh(p)+'" target="_blank" rel="noopener noreferrer">'+flag(p)+esc(p.name)+icon('external')+'</a></h3>'+metric(e.metric)+'</div><div class="repo-owner">'+esc(p.id)+'</div><p class="one-line">'+esc(e.summary)+'</p>'+(e.detail?'<p class="detail-text">'+esc(e.detail)+'</p>':'')+(e.note?'<p class="restriction"><span>注意</span>'+esc(e.note)+'</p>':'')+tagList(p)+'<div class="feature-actions"><a href="'+purl(p)+'" class="text-link">收录记录 '+icon('arrow')+'</a><div>'+readButton(p)+saveButton(p)+'</div></div></div></article>';
}
function daily() {
  const issue=route.value?index.issues.find(x=>x.date===route.value):index.issues[0];
  if(!issue)return empty('没有这一天的日报','归档只显示已收录的日期，不自动填充空白内容。');
  const i=index.issues.indexOf(issue),featured=issue.entries.filter(e=>e.featured),others=issue.entries.filter(e=>!e.featured);
  const actions='<div class="date-switch">'+(index.issues[i+1]?'<a aria-label="上一期" href="'+durl(index.issues[i+1].date)+'">‹</a>':'<span aria-hidden="true">‹</span>')+'<label class="sr-only" for="issue-date">选择日报日期</label><select id="issue-date">'+index.issues.map(x=>'<option '+(x.date===issue.date?'selected ':'')+'value="'+x.date+'">'+stamp(x.date)+'</option>').join('')+'</select>'+(index.issues[i-1]?'<a aria-label="下一期" href="'+durl(index.issues[i-1].date)+'">›</a>':'<span aria-hidden="true">›</span>')+'</div>';
  return '<main class="shell" id="main">'+infoHeading('DAILY DIGEST <b>/</b> NO. '+String(index.issues.length-i).padStart(3,'0'),'GitHub 每日项目雷达','<span>'+issue.date+'</span> · '+issue.entries.length+' 个项目 · '+featured.length+' 个重点介绍',actions)+sourceLine()+'<div class="content-layout"><div class="feed">'+overview(issue)+'<section aria-labelledby="featured-title"><div class="section-title"><h2 id="featured-title">今日值得看</h2><span>精选 / '+number(featured.length)+'</span></div>'+featured.map((e,n)=>feature(e,n+1)).join('')+'</section><section class="others" aria-labelledby="others-title"><div class="section-title"><h2 id="others-title">其他值得扫一眼</h2><span>'+number(others.length)+' 个项目</span></div>'+others.map(e=>{const p=index.projects.get(normalizeId(e.repo));return '<article class="other-row"><div><a class="repo-link" href="'+gh(p)+'" target="_blank" rel="noopener noreferrer">'+flag(p)+esc(p.name)+'</a>'+metric(e.metric)+'<p>'+esc(e.summary)+'</p></div><a class="small-link" aria-label="'+esc(p.name)+' 收录记录" href="'+purl(p)+'">记录 '+icon('arrow')+'</a>'+saveButton(p)+'</article>';}).join('')+'</section><div class="issue-end"><span>本期读完了。发现不会停在今天。</span><a href="#/archive">继续阅读往期 '+icon('arrow')+'</a></div></div>'+datesRail(issue.date)+'</div></main>';
}
function catalogCard(p) {
  return '<article class="catalog-card"><div class="catalog-card-top"><span class="monogram '+p.category+'">'+esc(p.name.slice(0,2).toUpperCase())+'</span><div><a class="repo-link" href="'+gh(p)+'" target="_blank" rel="noopener noreferrer">'+flag(p)+esc(p.name)+icon('external')+'</a><span class="repo-owner">'+esc(p.id)+'</span></div>'+saveButton(p)+'</div><p>'+esc(p.latest.summary)+'</p>'+tagList(p)+'<div class="catalog-card-bottom"><span>'+stamp(p.latest.date)+' · 收录 '+p.appearances.length+' 次'+(read(p)?' · 已读':'')+'</span><a href="'+purl(p)+'">查看记录 '+icon('arrow')+'</a></div></article>';
}
function filtered() {
  const q=(route.params.get('q')||'').trim().toLowerCase(),cat=route.params.get('category')||'',tag=(route.params.get('tag')||'').toLowerCase(),state=route.params.get('state')||'';
  const terms=q.split(/\s+/).filter(Boolean);
  const ps=[...index.projects.values()].filter(p=>(route.view!=='saved'||saved(p))&&(!cat||p.category===cat)&&(!tag||p.tags.some(t=>t.toLowerCase()===tag))&&(!state||state!=='unread'||!read(p))&&terms.every(t=>p.search.includes(t)));
  const sort=route.params.get('sort')||'recent';
  ps.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'zh-CN'):sort==='repeat'?b.appearances.length-a.appearances.length||a.name.localeCompare(b.name):sort==='first'?a.first.localeCompare(b.first)||a.name.localeCompare(b.name):b.latest.date.localeCompare(a.latest.date)||a.latest.rank-b.latest.rank);
  return ps;
}
function results() {
  const ps=filtered();const max=Math.max(1,Math.ceil(ps.length/18));const page=Math.max(1,Math.min(max,parseInt(route.params.get('page'),10)||1));
  const q=(route.params.get('q')||'').trim();
  return '<div class="results-count" role="status">'+ps.length+' 个项目'+(q?' · 搜索「'+esc(q)+'」':'')+'</div>'+(ps.length?'<div class="catalog-grid">'+ps.slice((page-1)*18,page*18).map(catalogCard).join('')+'</div>':empty(route.view==='saved'?'这里还没有符合条件的收藏':'没有找到匹配项目','试试更短的关键词，或清除分类和标签筛选。'))+(max>1?'<div class="pagination"><button data-page="'+(page-1)+'" '+(page===1?'disabled':'')+'>上一页</button><span>'+page+' / '+max+'</span><button data-page="'+(page+1)+'" '+(page===max?'disabled':'')+'>下一页</button></div>':'');
}
function projectsPage() {
  const isSaved=route.view==='saved';const selected=(name,value)=>route.params.get(name)===value?' selected':'';
  const buttons=isSaved?'<div class="heading-actions"><button class="button secondary" data-export>'+icon('download')+' 导出备份</button><button class="button secondary" data-import>导入</button></div>':'';
  return '<main class="shell" id="main">'+infoHeading(isSaved?'YOUR COLLECTION':'PROJECT LIBRARY',isSaved?'留下真正想用的项目。':'从发现，到自己的工具箱。',isSaved?'收藏、已读和笔记保存在当前浏览器。可导出备份，在另一台设备导入。':index.projects.size+' 个不同仓库 · 每个项目只建档一次，保留每次收录。',buttons)+'<div class="browse-layout"><aside class="category-sidebar"><h2>按方向探索</h2><a href="#/'+route.view+'" '+(!route.params.get('category')?'aria-current="page"':'')+'>全部项目 <span>'+index.projects.size+'</span></a>'+Object.entries(CATEGORIES).map(([k,v])=>'<a href="#/'+route.view+'?category='+k+'" '+(route.params.get('category')===k?'aria-current="page"':'')+'>'+v+' <span>'+[...index.projects.values()].filter(p=>p.category===k).length+'</span></a>').join('')+'<div class="sidebar-caption">常用标签</div><div class="tags">'+['MCP','Docker','Windows','Local AI','Japanese'].map(t=>'<a href="#/'+route.view+'?tag='+encodeURIComponent(t)+'">'+t+'</a>').join('')+'</div></aside><section class="browse-content" aria-label="项目列表"><form class="filters" id="filters"><div class="search-field">'+icon('search')+'<label class="sr-only" for="q">搜索项目</label><input type="search" id="q" name="q" placeholder="搜项目名称、用途或技术…" autocomplete="off" maxlength="150" value="'+esc(route.params.get('q')||'')+'"></div><div class="filter-row"><label>排序 <select name="sort"><option value="recent"'+selected('sort','recent')+'>最近收录</option><option value="first"'+selected('sort','first')+'>最早收录</option><option value="repeat"'+selected('sort','repeat')+'>收录次数</option><option value="name"'+selected('sort','name')+'>项目名称</option></select></label><label class="checkbox"><input type="checkbox" name="unread" '+(route.params.get('state')==='unread'?'checked':'')+'> 只看未读</label><button class="text-button" type="button" data-clear>清除筛选</button></div></form>'+(route.params.get('category')||route.params.get('tag')?'<div class="active-filter">当前：'+esc(CATEGORIES[route.params.get('category')]||route.params.get('tag')||'')+'</div>':'')+'<div id="results">'+results()+'</div></section></div></main>';
}
function archivePage() {
  return '<main class="shell" id="main">'+infoHeading('THE ARCHIVE','昨天的发现，也在这里。','按日期回看每一期。项目可以重复上榜，记录不会互相覆盖。')+sourceLine()+'<div class="archive-grid">'+index.issues.map((issue,i)=>{const featured=issue.entries.filter(x=>x.featured);return '<article class="archive-card"><div class="archive-card-top"><span>NO. '+String(index.issues.length-i).padStart(3,'0')+'</span><span>'+issue.entries.length+' 个项目</span></div><a href="'+durl(issue.date)+'"><h2>'+stamp(issue.date)+'</h2><p>'+featured.slice(0,3).map(e=>esc(index.projects.get(normalizeId(e.repo)).name)).join(' / ')+'</p><div class="archive-card-bottom"><span>'+featured.length+' 个重点介绍</span><span>阅读本期 '+icon('arrow')+'</span></div></a></article>';}).join('')+'</div></main>';
}
function projectPage() {
  const p=index.projects.get(normalizeId(route.value));if(!p)return empty('没有这个项目','项目可能尚未收录。可以通过项目库搜索查找。');
  const detail=p.appearances.find(x=>x.detail)||p.latest;
  return '<main class="shell project-page" id="main"><a class="back-link" href="#/projects">'+icon('back')+' 返回项目库</a><div class="project-hero"><div><div class="eyebrow">PROJECT PROFILE <b>/</b> '+esc(CATEGORIES[p.category])+'</div><h1 tabindex="-1"><a href="'+gh(p)+'" target="_blank" rel="noopener noreferrer">'+flag(p)+esc(p.name)+icon('external')+'</a></h1><span class="repo-owner">'+esc(p.id)+'</span><p>'+esc(p.latest.summary)+'</p>'+tagList(p)+'</div><div class="heading-actions"><a class="button" href="'+gh(p)+'" target="_blank" rel="noopener noreferrer">'+icon('github')+' 打开 GitHub</a>'+saveButton(p)+'</div></div><div class="project-layout"><div><section class="panel"><h2>项目简介</h2><p class="body-copy">'+esc(detail.detail||detail.summary)+'</p>'+(detail.note?'<p class="restriction"><span>注意</span>'+esc(detail.note)+'</p>':'')+'<div class="source-links"><a href="'+gh(p)+'#readme" target="_blank" rel="noopener noreferrer">原始 README '+icon('external')+'</a><a href="'+gh(p)+'/releases" target="_blank" rel="noopener noreferrer">Releases '+icon('external')+'</a><span>以上简介整理自历史日报</span></div></section><section class="panel"><div class="section-title"><h2>每次收录，都有记录</h2><span>'+p.appearances.length+' 次</span></div><div class="timeline">'+p.appearances.map(e=>'<div class="timeline-row"><div><a href="'+durl(e.date)+'">'+stamp(e.date)+'</a><span>'+ (e.featured?'重点介绍':'其他收录')+'</span></div>'+metric(e.metric)+'<a class="small-link" href="'+durl(e.date)+'">阅读当期 '+icon('arrow')+'</a></div>').join('')+'</div><p class="fine-print">各数值只属于对应日期。历史热度未复核，不是当前 Stars，也不用于绘制虚假的增长曲线。</p></section><section class="panel note-panel"><div class="section-title"><h2>给未来的自己留句话</h2><span id="note-status">'+(storageOK?'仅保存在本机':'存储不可用')+'</span></div><label class="sr-only" for="project-note">项目笔记</label><textarea id="project-note" data-note="'+esc(p.id)+'" maxlength="2000" rows="4" placeholder="适合做什么？准备装在哪里？下次要研究什么？">'+esc(personal.notes[normalizeId(p.id)]||'')+'</textarea>'+readButton(p)+'</section></div><aside class="project-sidebar"><div class="panel"><h2>收录档案</h2><dl><dt>首次发现</dt><dd>'+stamp(p.first)+'</dd><dt>最近收录</dt><dd>'+stamp(p.latest.date)+'</dd><dt>出现次数</dt><dd>'+p.appearances.length+' 次</dd><dt>阅读状态</dt><dd>'+(read(p)?'已读':'未读')+'</dd></dl><button class="button secondary full" data-copy>复制页面链接</button></div><div class="small-callout"><h3>不是收藏后就忘记。</h3><p>为项目留下用途和下一步，再从收藏页找回来。</p><a href="#/saved">查看我的收藏 '+icon('arrow')+'</a></div></aside></div></main>';
}
function aboutPage() {
  return '<main class="shell about-page" id="main">'+infoHeading('ABOUT RADAR','让发现有迹可循。','一个私人使用的中文开源项目阅读与归档站。')+'<section class="panel"><h2>数据从哪里来？</h2><p>当前七期内容整理自 2026-10-10 至 2026-10-16 的对话日报，包含 '+index.projects.size+' 个不同仓库和 '+index.issues.reduce((n,x)=>n+x.entries.length,0)+' 条收录。正文为编辑整理后的摘要，不是重新抓取的 README，也不是原对话逐字副本。</p><p>历史 Stars 和日增量只保留原刊记录，未重新核验。仓库名称或地址有缺失时，仅在确认对应项目后补入，不根据名称猜测链接。平台要求、License 与功能可能随版本变化，实施前请通过项目 README 和 Releases 核对。</p><h2>现在是否每天自动更新？</h2><p><strong>尚未启用自动发现和 AI 日报生成。</strong>网站部署、内容发布和资料采集是不同环节。当前网站不会读取其他对话，也不会自动追踪 Release。新一期需通过内容导入流程提交后发布。</p><h2>收藏、已读与笔记</h2><p>全部保存在当前浏览器的 localStorage。首次访问会尝试迁移旧版收藏。清除浏览器数据会丢失这些记录；请在收藏页导出 JSON 备份。手机和电脑不会自动同步，但可导入同一个备份，导入只合并，不清空现有记录。</p><h2>私人访问</h2><p>源代码保留在私人仓库；线上站点的访问权限由 Vercel 身份验证控制。本站没有自行实现登录，也不在前端保存 API Key、账户密码或模型凭据。不请求外部字体、分析脚本或头像服务。</p><h2>参考与设计</h2><p>内容列表与分期阅读参考 HelloGitHub，项目条目的紧凑组织参考 GitHub Trending，时间归档参考 Product Hunt 的日报入口。新版采用独立实现，不复制这些网站的品牌、图片或产品数据。</p><div class="source-links"><a href="https://hellogithub.com" target="_blank" rel="noopener noreferrer">HelloGitHub ↗</a><a href="https://github.com/trending" target="_blank" rel="noopener noreferrer">GitHub Trending ↗</a><a href="https://www.producthunt.com" target="_blank" rel="noopener noreferrer">Product Hunt ↗</a></div></section></main>';
}
function render({focus=false}={}) {
  try {route=parseRoute();}catch{route={view:'not-found',value:'',params:new URLSearchParams()};}
  const view=route.view;const pages={daily,projects:projectsPage,saved:projectsPage,archive:archivePage,project:projectPage,about:aboutPage};
  root.innerHTML=(pages[view]||(()=>empty('页面不存在','从导航回到日报或项目库。')))();
  const title={daily:'每日雷达',projects:'项目库',saved:'我的收藏',archive:'往期日报',project:index.projects.get(normalizeId(route.value))?.name,about:'数据与使用说明'}[view]||'页面不存在';
  document.title=title+' · radar';
  document.querySelectorAll('[data-nav]').forEach(el=>{const on=el.dataset.nav===(view==='project'?'projects':view);el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.getElementById('saved-count').textContent=personal.saved.length?' '+personal.saved.length:'';
  if(focus) {root.querySelector('h1')?.focus({preventScroll:true});window.scrollTo(0,0);}
  bindFilters();
}
function updateResults() {
  const target=document.getElementById('results');if(target)target.innerHTML=results();
  history.replaceState(null,'','#/'+route.view+(route.params.size?'?'+route.params.toString():''));
}
function bindFilters() {
  const form=document.getElementById('filters');if(!form)return;
  const q=form.querySelector('#q');let composing=false;
  const run=()=>{clearTimeout(searchTimer);q.value?route.params.set('q',q.value):route.params.delete('q');route.params.delete('page');updateResults();};
  q.addEventListener('compositionstart',()=>{composing=true;clearTimeout(searchTimer);});
  q.addEventListener('compositionend',()=>{composing=false;run();});
  q.addEventListener('input',e=>{if(!composing&&!e.isComposing){clearTimeout(searchTimer);searchTimer=setTimeout(run,120);}});
  form.addEventListener('submit',e=>{e.preventDefault();if(!composing)run();});
  form.querySelector('select').addEventListener('change',e=>{route.params.set('sort',e.target.value);route.params.delete('page');updateResults();});
  form.querySelector('[name=unread]').addEventListener('change',e=>{e.target.checked?route.params.set('state','unread'):route.params.delete('state');route.params.delete('page');updateResults();});
}
function downloadBackup() {
  const blob=new Blob([JSON.stringify({...personal,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='radar-collection-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function toggleEntry(id,key) { const k=normalizeId(id);if(!index.projects.has(k))return;const overviewOpen=document.querySelector('.overview')?.open;personal[key]=personal[key].includes(k)?personal[key].filter(x=>x!==k):[...personal[key],k];persist();const y=window.scrollY;render();if(overviewOpen&&document.querySelector('.overview'))document.querySelector('.overview').open=true;const attr=key==='saved'?'data-save':'data-read';root.querySelector('['+attr+'="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});window.scrollTo(0,y); }
function openSearch() {if(!['projects','saved'].includes(route?.view)){location.hash='/projects';setTimeout(()=>document.getElementById('q')?.focus(),0);}else document.getElementById('q')?.focus();}

document.getElementById('search-trigger').addEventListener('click',openSearch);
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();openSearch();}});
document.addEventListener('click',async e=>{
  const el=e.target.closest('button');if(!el)return;
  if(el.dataset.save)toggleEntry(el.dataset.save,'saved');
  if(el.dataset.read)toggleEntry(el.dataset.read,'read');
  if(el.hasAttribute('data-export'))downloadBackup();
  if(el.hasAttribute('data-import'))document.getElementById('import-file').click();
  if(el.hasAttribute('data-clear')){clearTimeout(searchTimer);location.hash='/'+route.view;if(!route.params.size)render();}
  if(el.dataset.page){route.params.set('page',el.dataset.page);location.hash='/'+route.view+'?'+route.params.toString();}
  if(el.hasAttribute('data-copy')){try{await navigator.clipboard.writeText(location.href);notify('页面链接已复制。');}catch{notify('浏览器不允许复制，请从地址栏复制此页面链接。');}}
  if(el.hasAttribute('data-retry'))start();
});
document.addEventListener('change',e=>{if(e.target.id==='issue-date')location.hash='/daily/'+e.target.value;});
document.addEventListener('input',e=>{if(e.target.matches('[data-note]')){personal.notes[normalizeId(e.target.dataset.note)]=e.target.value.slice(0,2000);const ok=persist();document.getElementById('note-status').textContent=ok?'已保存到本机':'保存失败，请导出备份';}});
document.getElementById('import-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>1024*1024)throw Error('文件超过 1MB');const incoming=normalizePersonal(JSON.parse(await file.text()),new Set(index.projects.keys()));personal={version:2,saved:[...new Set([...personal.saved,...incoming.saved])],read:[...new Set([...personal.read,...incoming.read])],notes:{...incoming.notes,...personal.notes}};const ok=persist();render();notify(ok?'备份已合并，现有收藏与笔记已保留。':'已载入当前会话，但浏览器未能持久保存。');}catch(error){notify('导入失败：'+error.message);}finally{e.target.value='';}
});
window.addEventListener('hashchange',()=>{clearTimeout(searchTimer);if(index)render({focus:true});});
window.addEventListener('storage',e=>{if(e.key===STORE&&e.newValue){try{personal=normalizePersonal(JSON.parse(e.newValue),new Set(index.projects.keys()));if(!document.activeElement?.matches('[data-note]'))render();}catch{notify('另一标签页的收藏格式无效，未载入。');}}});
async function start() {
  try{const response=await fetch('./data/radar.json',{cache:'no-cache'});if(!response.ok)throw Error('HTTP '+response.status);data=validateData(await response.json());index=makeIndex(data);loadPersonal();render();}
  catch(error){root.innerHTML='<main class="shell loading" id="main"><h1>档案暂时没有打开</h1><p>请检查网络后重试。已有本机收藏不会被清空。</p><button class="button" data-retry>重新加载</button></main>';console.error('Radar loading failed:',error);}
}
start();
