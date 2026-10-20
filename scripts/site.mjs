export const CATEGORIES = Object.freeze({
  ai: 'AI / Agent', selfhost: '自托管', dev: '开发工具',
  graphics: '图形与创作', hardware: '硬件 / IoT', games: '游戏与模拟器',
  data: '数据与商业', security: '安全与逆向', learning: '学习与研究'
});
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
export const unesc = value => String(value ?? '').replace(/&(?:lt|gt|quot|#39|amp);/g, c => ({
  '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&'
}[c]));
export function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && !Number.isNaN(Date.parse(date))
    && new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
}
export function validRepo(id) {
  return typeof id === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(id) &&
    !['.', '..'].includes(id.split('/')[1]);
}
export const archivePath = date => {
  if (!validDate(date)) throw Error('Invalid issue date: ' + date);
  return 'archive/' + date.slice(0, 4) + '/' + date.slice(5, 7) + '/' + date.slice(8) + '.html';
};
export function metricText(metric) {
  if (!metric || metric.type === 'new') return '新项目';
  if (metric.type === 'daily') return '+' + Number(metric.value).toLocaleString('en-US') + ' / 日';
  return (metric.display || Number(metric.value).toLocaleString('en-US')) + ' Stars';
}
export function shell({title, body, prefix = '', head = '', description = '中文 GitHub 开源项目日报：项目功能、实际用途、注意事项和历史归档。'}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f8f4">
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)} · radar</title>
  <link rel="icon" type="image/svg+xml" href="${prefix}assets/radar.svg">
  <link rel="stylesheet" href="${prefix}assets/site.css">
  <script src="${prefix}assets/site.js" defer></script>
  ${head}
</head>
<body>
  <a class="skip" href="#main">跳到正文</a>
  <header class="header"><div class="container header-inner">
    <a class="brand" href="${prefix}index.html"><img src="${prefix}assets/radar.svg" width="31" height="31" alt="">radar<span>.</span></a>
    <span class="brand-caption">开源发现，持续积累。</span>
    <nav class="nav" aria-label="主导航">
      <a href="${prefix}index.html">最新日报</a>
      <a href="${prefix}search.html">项目搜索</a>
      <a href="${prefix}archive/index.html">往期归档</a>
      <a href="${prefix}search.html?view=saved">我的收藏</a>
    </nav>
  </div></header>
  <main class="container main" id="main">${body}</main>
  <footer class="footer container"><span>radar · 每天一页，持续归档</span><span>独立项目 · 非 GitHub 官方 · 收藏和笔记仅在此浏览器保存</span></footer>
</body>
</html>
`;
}
function card(e, index) {
  const p = e.project;
  if (!p || !validRepo(p.id) || !e.summary) throw Error('Invalid project entry: ' + (e.repo || '?'));
  const id = p.id;
  const repoUrl = 'https://github.com/' + id;
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const meta = [
    ['data-repo', id], ['data-name', p.name || id.split('/')[1]],
    ['data-summary', e.summary], ['data-detail', e.detail || ''],
    ['data-category', p.category || 'dev'], ['data-tags', tags.join(' ')],
    ['data-date', e.date || ''], ['data-featured', String(!!e.featured)]
  ].map(([k,v]) => `${k}="${esc(v)}"`).join(' ');
  const category = CATEGORIES[p.category] || '开发工具';
  const flag = p.flag ? `<span class="flag">${esc(p.flag)}</span>` : '';
  return `<article class="project" ${meta}>
    <div class="project-head">
      <span class="ordinal">${String(index + 1).padStart(2, '0')}</span>
      <div class="project-heading">
        <h3><a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${esc(p.name || id.split('/')[1])}<span class="external" aria-hidden="true">↗</span></a></h3>
        <div class="repo-id">${esc(id)} ${flag}</div>
      </div>
      <button class="save-button" type="button" data-save="${esc(id.toLowerCase())}" aria-pressed="false" aria-label="收藏 ${esc(p.name || id)}">☆ 收藏</button>
    </div>
    <p class="project-summary">${esc(e.summary)}</p>
    ${e.detail ? `<p class="project-detail">${esc(e.detail)}</p>` : ''}
    ${e.note ? `<p class="project-note">${esc(e.note)}</p>` : ''}
    <div class="project-bottom">
      <div class="tags"><span class="tag">${esc(category)}</span>${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <span class="metric">${esc(metricText(e.metric))}${e.metric?.verified === false ? ' <small>历史记录·未核验</small>' : ''}</span>
    </div>
    <details class="memo"><summary>私人笔记</summary><label>仅保存在当前浏览器<textarea data-note="${esc(id.toLowerCase())}" maxlength="2000" placeholder="使用经验、配置方法、待测试事项…"></textarea></label></details>
  </article>`;
}
export function issuePage(issue) {
  if (!validDate(issue.date) || !Array.isArray(issue.entries) || !issue.entries.length) throw Error('Invalid issue');
  const seen = new Set();
  const entries = issue.entries.map(e => {
    const id = String(e.project?.id || '').toLowerCase();
    if (seen.has(id) || !validRepo(e.project?.id)) throw Error('Duplicate or invalid repository in ' + issue.date + ': ' + id);
    seen.add(id);
    return { ...e, date: issue.date };
  });
  const [year, month] = issue.date.split('-');
  const prefix = '../../../';
  const featured = entries.filter(e => e.featured);
  const others = entries.filter(e => !e.featured);
  const dateLabel = issue.date.replaceAll('-', ' / ');
  const sourceLabel = issue.source === 'legacy-newsletter'
    ? '历史内容按原始记录恢复；历史热度未经重新核验。'
    : issue.source === 'github-actions-scout'
      ? 'GitHub Actions 自动侦察候选项目；简介来自仓库资料，尚未人工复核。'
      : '项目资料为编辑整理；功能及限制仍应以仓库说明为准。';
  const body = `
    <div class="eyebrow"><span class="dot"></span> DAILY OPEN SOURCE RADAR <span class="dash">/</span> ${esc(dateLabel)}</div>
    <div class="issue-intro"><div>
      <h1>今天，有哪些项目<br><em>值得打开看看。</em></h1>
      <p class="intro-subtitle">每日 GitHub 项目雷达 · ${esc(issue.date)} · ${entries.length} 个项目</p>
    </div><a class="button button-light" href="${prefix}archive/${year}/${month}/index.html">查看本月归档 ↗</a></div>
    <p class="source-notice">${esc(sourceLabel)}</p>
    <details class="overview"><summary>本期项目速览 <span>${entries.length} 个项目</span><span class="overview-hint">展开查看全部名称</span></summary>
      <ol>${entries.map(e => `<li><a href="https://github.com/${e.project.id}" target="_blank" rel="noopener noreferrer">${esc(e.project.name || e.project.id)}</a><span>${esc(e.summary)}</span></li>`).join('')}</ol>
    </details>
    ${featured.length ? `<section class="issue-section"><div class="section-title"><h2>今日重点</h2><span>${featured.length} 个项目</span></div>${featured.map(card).join('')}</section>` : ''}
    ${others.length ? `<section class="issue-section"><div class="section-title"><h2>更多发现</h2><span>${others.length} 个项目</span></div>${others.map((e,i) => card(e, i + featured.length)).join('')}</section>` : ''}
    <div class="issue-end"><a href="${prefix}archive/${year}/${month}/index.html">← 返回 ${year} 年 ${month} 月</a><a href="${prefix}search.html">搜索全部历史项目 →</a></div>`;
  const head = `<meta name="radar-date" content="${issue.date}"><meta name="radar-count" content="${entries.length}"><meta name="radar-source" content="${esc(issue.source || 'editorial')}">`;
  return shell({title: issue.date + ' GitHub 每日项目雷达', body, prefix, head});
}
