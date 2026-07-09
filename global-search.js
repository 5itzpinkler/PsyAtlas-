/* ============================================================
   GLOBAL SEARCH — пошук по всіх 222 вузлах атласу (9 файлів).
   Підключається на кожній сторінці після search-index.js.
   Викликає GlobalSearch.init() один раз на завантаженні.
   ============================================================ */
const GlobalSearch = (() => {

  const CAT_COLORS = {
    // нейродомени
    sub:'#7d8399', nt:'#5fb583', metab:'#c97a63', receptor:'#4a9db0',
    messenger:'#9b87c4', transporter:'#d9a94f', ion:'#6b9fd6', vesicle:'#c986ab',
    ion_channel:'#4a9db0', pump:'#d9a94f', potential:'#5fb583', molecule:'#7d8399',
    plasticity:'#c986ab', structure:'#c97a63', limbic:'#c986ab', 'bg-circ':'#d9a94f',
    ras:'#6b9fd6', emotion:'#c97a63', hpa:'#d9a94f', effect:'#6b9fd6',
    attention:'#6b9fd6', memory:'#d9a94f', executive:'#5fb583', language:'#c986ab',
    substrate:'#6b9fd6', state:'#5fb583', theory:'#c9a05e', process:'#8a90a8',
    prenatal:'#c986ab', critical:'#d9a94f', lifespan:'#6b9fd6',
    mood:'#6b9fd6', psychosis:'#c986ab', anxiety:'#d9a94f', framework:'#5fb583',
    stub:'#7d8399',
    // psychology_atlas (rigor-based)
    green:'#5fb583', amber:'#d9a94f', coral:'#c97a63'
  };

  let idx = null, activeIndex = -1, currentResults = [];

  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function highlight(text, q){
    if(!q) return esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if(i===-1) return esc(text);
    return esc(text.slice(0,i)) + '<mark>' + esc(text.slice(i,i+q.length)) + '</mark>' + esc(text.slice(i+q.length));
  }

  function score(entry, q){
    const l = entry.label.toLowerCase(), s = entry.snippet.toLowerCase();
    if(l === q) return 100;
    if(l.startsWith(q)) return 80;
    if(l.includes(q)) return 60;
    if(s.includes(q)) return 30;
    return 0;
  }

  function search(q){
    q = q.trim().toLowerCase();
    if(!q) return [];
    return idx.map(e => ({e, s: score(e,q)}))
      .filter(x => x.s > 0)
      .sort((a,b) => b.s - a.s)
      .slice(0, 40)
      .map(x => x.e);
  }

  function render(q){
    const wrap = document.getElementById('gs-results');
    currentResults = search(q);
    activeIndex = currentResults.length ? 0 : -1;
    if(!q.trim()){
      wrap.innerHTML = '<div class="gs-empty">Почни вводити — пошук охоплює всі 9 карт атласу одразу</div>';
      return;
    }
    if(!currentResults.length){
      wrap.innerHTML = `<div class="gs-empty">Нічого не знайдено за «${esc(q)}»</div>`;
      return;
    }
    wrap.innerHTML = currentResults.map((e,i) => `
      <a class="gs-item${i===0?' gs-active':''}" data-i="${i}" href="${e.file}#${e.id}">
        <span class="gs-dot" style="background:${CAT_COLORS[e.cat]||'#7d8399'}"></span>
        <span class="gs-body">
          <div class="gs-label">${highlight(e.label, q)}</div>
          <div class="gs-snippet">${highlight(e.snippet, q)}</div>
        </span>
        <span class="gs-domain">${esc(e.domainTitle)}</span>
      </a>`).join('');
  }

  function moveActive(delta){
    const items = document.querySelectorAll('.gs-item');
    if(!items.length) return;
    items[activeIndex]?.classList.remove('gs-active');
    activeIndex = (activeIndex + delta + items.length) % items.length;
    items[activeIndex].classList.add('gs-active');
    items[activeIndex].scrollIntoView({block:'nearest'});
  }

  function open(){
    document.getElementById('gs-overlay').classList.add('open');
    const input = document.getElementById('gs-input');
    input.value = ''; render('');
    setTimeout(()=>input.focus(), 30);
  }
  function close(){
    document.getElementById('gs-overlay').classList.remove('open');
  }

  function buildDOM(){
    const overlay = document.createElement('div');
    overlay.id = 'gs-overlay';
    overlay.innerHTML = `
      <div id="gs-modal">
        <div id="gs-input-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5abc0" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="gs-input" placeholder="Пошук по всьому атласу — 222 вузли, 9 карт..." autocomplete="off">
          <span id="gs-esc">Esc</span>
        </div>
        <div id="gs-results"></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
    document.getElementById('gs-input').addEventListener('input', e => render(e.target.value));
    document.getElementById('gs-input').addEventListener('keydown', e => {
      if(e.key === 'Escape'){ close(); }
      else if(e.key === 'ArrowDown'){ e.preventDefault(); moveActive(1); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); moveActive(-1); }
      else if(e.key === 'Enter'){
        const active = document.querySelector('.gs-item.gs-active');
        if(active) window.location.href = active.getAttribute('href');
      }
    });
  }

  function init(){
    if(typeof SEARCH_INDEX === 'undefined'){ console.warn('SEARCH_INDEX не завантажено'); return; }
    idx = SEARCH_INDEX;
    buildDOM();

    // Клавіатурний шорткат "/" відкриває пошук з будь-якого місця сторінки
    document.addEventListener('keydown', e => {
      if(e.key === '/' && document.activeElement.tagName !== 'INPUT'){
        e.preventDefault(); open();
      }
    });

    // Прив'язати всі елементи-тригери з класом gs-trigger
    document.querySelectorAll('.gs-trigger').forEach(btn => btn.addEventListener('click', open));
  }

  return {init, open, close};
})();
