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
  let personal = {version:2,saved:[],read:[],notes:{}};
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
        if (parsed.notes && typeof parsed.notes === 'object' && !Array.isArray(parsed.notes)) personal.notes=parsed.notes;
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
  const search=document.querySelector('#q');
  const category=document.querySelector('#category');
  const onlySaved=document.querySelector('#saved-only');
  const cards=Array.from(document.querySelectorAll('.search-card'));
  const count=document.querySelector('#results-count');
  const empty=document.querySelector('#search-empty');
  function filter() {
    if(!search)return;
    const q=search.value.trim().toLocaleLowerCase();
    const cat=category?.value || '';
    let visible=0;
    for(const el of cards) {
      const match=(!q || el.dataset.search.includes(q)) &&
        (!cat || el.dataset.category===cat) &&
        (!onlySaved?.checked || isSaved(el.dataset.repo));
      el.hidden=!match;
      if(match)visible++;
    }
    if(count)count.textContent=visible+' / '+cards.length+' 个项目';
    if(empty)empty.hidden=visible!==0;
  }
  function syncQuery() {
    if(!search)return;
    const params=new URLSearchParams(location.search);
    if(search.value.trim())params.set('q',search.value.trim());else params.delete('q');
    if(category?.value)params.set('category',category.value);else params.delete('category');
    if(onlySaved?.checked)params.set('view','saved');else params.delete('view');
    const query=params.toString();
    history.replaceState(null,'',location.pathname+(query?'?'+query:''));
  }
  if(search) {
    const params=new URLSearchParams(location.search);
    search.value=params.get('q')||'';
    if(category)category.value=params.get('category')||'';
    if(onlySaved)onlySaved.checked=params.get('view')==='saved';
    search.addEventListener('input',()=>{syncQuery();filter();});
    category?.addEventListener('change',()=>{syncQuery();filter();});
    onlySaved?.addEventListener('change',()=>{syncQuery();filter();});
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
  document.querySelectorAll('[data-note]').forEach(el => {
    const id=el.dataset.note;
    if(!validRepo(id))return;
    el.value=typeof personal.notes[id]==='string'?personal.notes[id].slice(0,2000):'';
    el.addEventListener('input',()=>{
      if(el.value)personal.notes[id]=el.value.slice(0,2000);
      else delete personal.notes[id];
      persist();
    });
  });
  refresh();
})();
