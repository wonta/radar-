(() => {
  'use strict';
  const oldLink = location.pathname.match(/\/archive\/(\d{4})-(\d{2})-(\d{2})\.html$/);
  if (oldLink) {
    const root = location.pathname.slice(0, oldLink.index) || '';
    location.replace(root + '/archive/' + oldLink[1] + '/' + oldLink[2] + '/' + oldLink[3] + '.html');
    return;
  }
  if (location.hash.startsWith('#/')) {
    const route = location.hash.slice(2);
    let to = '';
    const m = route.match(/^daily\/(\d{4})-(\d{2})-(\d{2})$/);
    if (m) to = 'archive/' + m[1] + '/' + m[2] + '/' + m[3] + '.html';
    else if (route === 'archive') to = 'archive/index.html';
    else if (route === 'projects') to = 'search.html';
    else if (route === 'saved') to = 'search.html?view=saved';
    else if (route.startsWith('project/')) to = 'search.html?q=' + encodeURIComponent(route.slice(8));
    if (to) {
      const currentRoot = location.pathname.replace(/(?:index\.html)?$/, '');
      location.replace(currentRoot + to);
      return;
    }
  }
  const STORE = 'radar-personal-v2';
  let personal = {version:2,saved:[],read:[]};
  try {
    let saved = localStorage.getItem(STORE);
    if (!saved) {
      const old = localStorage.getItem('github-radar-saved-v1');
      if (old) {
        const ids = JSON.parse(old);
        if (Array.isArray(ids)) personal.saved=ids;
      }
    } else {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.version === 2 && Array.isArray(parsed.saved)) {
        personal.saved=parsed.saved;
        if (Array.isArray(parsed.read)) personal.read=parsed.read;
      }
    }
  } catch (error) { console.warn('Local personal data unavailable',error); }
  const validRepo = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*\/[a-z0-9_.-]+$/i.test(value);
  personal.saved=[...new Set(personal.saved.filter(validRepo).map(s=>s.toLowerCase()))];
  const isSaved = id => personal.saved.includes(id);
  function persist() {
    try {localStorage.setItem(STORE,JSON.stringify(personal));}
    catch(error) {console.warn('Cannot save personal data',error);}
  }
  function refresh() {
    document.querySelectorAll('[data-save]').forEach(button => {
      const chosen=isSaved(button.dataset.save);
      button.setAttribute('aria-pressed',String(chosen));
      button.textContent=chosen?'★ 已收藏':'☆ 收藏';
    });
  }
  function highlightNav() {
    const path=location.pathname;
    const view=new URLSearchParams(location.search).get('view');
    const active=path.endsWith('/search.html')?(view==='saved'?'我的收藏':'项目搜索'):
      path.includes('/archive/')?'往期归档':'最新日报';
    document.querySelectorAll('.nav a').forEach(link=>{
      if(link.textContent.trim()===active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
  }
  highlightNav();

  const search=document.querySelector('#q');
  const category=document.querySelector('#category');
  const onlySaved=document.querySelector('#saved-only');
  const count=document.querySelector('#results-count');
  const empty=document.querySelector('#search-empty');
  const more=document.querySelector('#load-more');
  const PAGE_SIZE=12;
  let visibleLimit=PAGE_SIZE;
  let composing=false;
  const categories=Object.fromEntries(Array.from(category?.options||[]).map(o=>[o.value,o.textContent]));
  const cards=Array.from(document.querySelectorAll('.search-card')).map(node=>({
    node,
    text:(node.dataset.repo+' '+node.textContent+' '+(categories[node.dataset.category]||'')).toLocaleLowerCase()
  }));

  function filter(reset=false) {
    if(!search)return;
    if(reset)visibleLimit=PAGE_SIZE;
    const q=search.value.trim().toLocaleLowerCase();
    const cat=category?.value||'';
    let matched=0;
    for(const {node,text} of cards) {
      const isMatch=(!q||text.includes(q))&&
        (!cat||node.dataset.category===cat)&&
        (!onlySaved?.checked||isSaved(node.dataset.repo));
      if(isMatch)matched++;
      node.hidden=!isMatch||matched>visibleLimit;
    }
    const shown=Math.min(visibleLimit,matched);
    if(count)count.textContent='找到 '+matched+' 个项目 · 当前显示 '+shown+' 个';
    if(empty)empty.hidden=matched!==0;
    if(more){
      more.hidden=matched<=visibleLimit;
      more.textContent='显示更多项目（剩余 '+Math.max(0,matched-visibleLimit)+' 个）';
    }
  }

  function syncQuery() {
    if(!search)return;
    const params=new URLSearchParams(location.search);
    if(search.value.trim())params.set('q',search.value.trim());else params.delete('q');
    if(category?.value)params.set('category',category.value);else params.delete('category');
    if(onlySaved?.checked)params.set('view','saved');else params.delete('view');
    const query=params.toString();
    history.replaceState(null,'',location.pathname+(query?'?'+query:''));
    highlightNav();
  }
  if(search) {
    const params=new URLSearchParams(location.search);
    search.value=params.get('q')||'';
    if(category)category.value=params.get('category')||'';
    if(onlySaved)onlySaved.checked=params.get('view')==='saved';
    search.addEventListener('compositionstart',()=>{composing=true;});
    search.addEventListener('compositionend',()=>{
      composing=false;
      syncQuery();
      filter(true);
    });
    search.addEventListener('input',()=>{
      if(composing)return;
      syncQuery();filter(true);
    });
    category?.addEventListener('change',()=>{syncQuery();filter(true);});
    onlySaved?.addEventListener('change',()=>{syncQuery();filter(true);});
    more?.addEventListener('click',()=>{
      visibleLimit+=PAGE_SIZE;
      filter();
    });
    filter();
  }
  document.addEventListener('click',event => {
    const button=event.target.closest('[data-save]');
    if(!button)return;
    const id=button.dataset.save;
    if(!validRepo(id))return;
    if(isSaved(id))personal.saved=personal.saved.filter(v=>v!==id);
    else personal.saved.push(id);
    persist();refresh();filter();
  });
  refresh();
})();
