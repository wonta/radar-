export const CATEGORIES = {ai:'AI / Agent', selfhost:'自托管', dev:'开发工具', graphics:'图形与创作', hardware:'硬件 / IoT', games:'游戏与模拟器', data:'数据与商业', security:'安全与逆向', learning:'学习与研究'};
export const normalizeId = value => String(value).toLowerCase();
export const validRepo = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(value) && !['.','..'].includes(value.split('/')[1]);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateData(data) {
  if (data?.schemaVersion !== 2 || !Array.isArray(data.projects) || !Array.isArray(data.issues) || !data.issues.length) throw Error('不支持的归档格式');
  const ids = new Set(); const dates = new Set();
  for (const p of data.projects) {
    if (!validRepo(p.id) || ids.has(normalizeId(p.id)) || typeof p.name !== 'string' || !p.name || !CATEGORIES[p.category] || !Array.isArray(p.tags) || p.tags.some(t=>typeof t !== 'string')) throw Error('无效或重复的仓库：'+p.id);
    ids.add(normalizeId(p.id));
  }
  const used = new Set();
  for (const issue of data.issues) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issue.date) || Number.isNaN(Date.parse(issue.date)) || new Date(issue.date+'T00:00:00Z').toISOString().slice(0,10)!==issue.date || dates.has(issue.date) || !Array.isArray(issue.entries) || !issue.entries.length) throw Error('无效或重复的日期');
    dates.add(issue.date); const seen=new Set();
    for (const e of issue.entries) {
      const id=normalizeId(e.repo), m=e.metric;
      if (!ids.has(id) || seen.has(id) || typeof e.summary!=='string' || !e.summary || (e.detail!=null && typeof e.detail!=='string') || (e.note!=null && typeof e.note!=='string') || !m || !['daily','total','new'].includes(m.type) || typeof e.featured !== 'boolean') throw Error('无效条目：'+issue.date+' '+e.repo);
      if (m.type!=='new' && (!Number.isSafeInteger(m.value) || m.value<0)) throw Error('无效热度');
      if (m.verified !== false && !(m.verified===true && /^https:\/\/github.com\//.test(m.sourceUrl||'') && !Number.isNaN(Date.parse(m.capturedAt)))) throw Error('缺少热度来源');
      if (m.type==='new' && m.value!==null) throw Error('新项目不能伪造 Stars');
      seen.add(id);used.add(id);
    }
  }
  if ([...ids].some(id=>!used.has(id))) throw Error('存在没有收录记录的项目');
  return data;
}
export function makeIndex(data) {
  const projects = new Map(data.projects.map(p=>[normalizeId(p.id), {...p, appearances:[]} ]));
  const issues=[...data.issues].sort((a,b)=>b.date.localeCompare(a.date));
  for(const issue of issues) issue.entries.forEach((e,i)=>projects.get(normalizeId(e.repo)).appearances.push({...e,date:issue.date,rank:i+1}));
  for(const p of projects.values()) { p.latest=p.appearances[0]; p.first=p.appearances.at(-1).date; p.search=[p.id,p.name,p.latest.summary,p.latest.detail,CATEGORIES[p.category],...p.tags].join(' ').toLowerCase(); }
  return {projects,issues};
}
export function formatMetric(metric) {
  if(metric.type==='new') return '新项目';
  if(metric.type==='daily') return '+'+metric.value.toLocaleString('en-US')+' / 日';
  return (metric.display||metric.value.toLocaleString('en-US'))+' Stars';
}
export function normalizePersonal(input, knownIds) {
  if(!input || typeof input!=='object' || input.version!==2 || !Array.isArray(input.saved) || !Array.isArray(input.read) || typeof input.notes!=='object' || input.notes===null || Array.isArray(input.notes)) throw Error('不是有效的 radar 收藏文件');
  if(input.saved.length>10000 || input.read.length>10000 || Object.keys(input.notes).length>10000) throw Error('收藏文件超出限制');
  const select=arr=>[...new Set(arr.filter(validRepo).map(normalizeId).filter(id=>knownIds.has(id)))];
  const notes={}; for(const [id,note] of Object.entries(input.notes)) if(knownIds.has(normalizeId(id)) && typeof note==='string') notes[normalizeId(id)]=note.slice(0,2000);
  return {version:2,saved:select(input.saved),read:select(input.read),notes};
}
