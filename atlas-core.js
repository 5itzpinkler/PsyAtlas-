/* ============================================================
   ATLAS CORE — спільний рушій для всіх доменів.
   Кожен домен викликає AtlasMap.build({...}) зі своїми даними.
   ============================================================ */
const AtlasMap = (() => {

  // Реєстр доменів — для крос-навігації (stub-вузли й xref-посилання).
  const DOMAINS = {
    synapse:        {file:'synapse.html',        title:'Синаптична нейротрансмісія'},
    membrane:       {file:'membrane.html',       title:'Мембрана і потенціал дії'},
    circuits:       {file:'circuits.html',       title:'Нейроанатомічні контури'},
    affect:         {file:'affect.html',         title:'Афективні контури'},
    cognition:      {file:'cognition.html',      title:'Увага, память, мова'},
    consciousness:  {file:'consciousness.html',  title:'Арузал і свідомість'},
    development:    {file:'development.html',    title:'Нейророзвиток'},
    psychopathology:{file:'psychopathology.html',title:'Психопатологія як збій контурів'},
    psychology:     {file:'psychology_atlas.html',title:'Атлас психологічних теорій'},
    index:          {file:'neuro_atlas_index.html', title:'Атлас'}
  };

  let cy, CATCOLOR, CATLABEL;

  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function setParas(el, text){
    el.innerHTML = '';
    (text||'—').split('\n\n').forEach(t=>{
      const p = document.createElement('p'); p.textContent = t; el.appendChild(p);
    });
  }

  function openPanel(n){
    document.getElementById('p-name').textContent = n.label;

    // Ілюстрація вузла (портрет дослідника, схема, мікрофото) — з фолбеком.
    // Заповнюється через n.figure = {src, caption} у даних домену.
    const figWrap = document.getElementById('p-figure');
    if(figWrap){
      figWrap.innerHTML = '';
      if(n.figure && n.figure.src){
        const fig = document.createElement('figure');
        fig.className = 'node-figure';
        const img = document.createElement('img');
        img.src = n.figure.src;
        img.alt = n.figure.caption || n.label;
        img.onerror = () => { fig.remove(); };  // не показуємо зламане
        fig.appendChild(img);
        if(n.figure.caption){
          const cap = document.createElement('figcaption');
          cap.textContent = n.figure.caption;
          fig.appendChild(cap);
        }
        figWrap.appendChild(fig);
      }
    }

    const badge = document.getElementById('p-badge');
    badge.textContent = CATLABEL[n.cat] || n.cat;
    badge.style.color = CATCOLOR[n.cat] || '#7d8399';

    setParas(document.getElementById('p-func'), n.func);
    setParas(document.getElementById('p-clin'), n.clin);

    // Секція джерел — реальні цитати, якщо є для цього вузла
    const srcWrap = document.getElementById('p-sources');
    if(srcWrap){
      srcWrap.innerHTML = '';
      if(n.sources && n.sources.length){
        const ul = document.createElement('ul');
        ul.className = 'sources';
        n.sources.forEach(s=>{
          const li = document.createElement('li');
          const link = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title);
          li.innerHTML = `<span class="src-authors">${esc(s.authors)}</span> <span class="src-year">(${esc(s.year)})</span>. ${link}`;
          ul.appendChild(li);
        });
        srcWrap.appendChild(ul);
      } else {
        srcWrap.innerHTML = n.stub
          ? '<div class="no-sources">Це вузол-місток. Джерела — у домені, куди він веде.</div>'
          : '<div class="no-sources">Джерела для цього вузла ще не додані.</div>';
      }
    }

    // Кнопка переходу в інший домен (для stub-вузлів)
    const jumpWrap = document.getElementById('p-jump');
    jumpWrap.innerHTML = '';
    if(n.jumpTo && DOMAINS[n.jumpTo]){
      const a = document.createElement('a');
      a.className = 'jump'; a.href = DOMAINS[n.jumpTo].file;
      a.innerHTML = 'Відкрити домен «'+esc(DOMAINS[n.jumpTo].title)+'» →';
      jumpWrap.appendChild(a);
    }
    // Кнопка лонгріда — якщо для вузла написаний розгорнутий текст
    if(n.longread){
      const lr = document.createElement('a');
      lr.className = 'longread-btn';
      lr.href = 'longread.html?id=' + encodeURIComponent(n.longread);
      lr.innerHTML = '<span class="lr-icon">◈</span><span class="lr-text">Читати лонгрід</span>'
        + (n.longread_time ? '<span class="lr-time">'+esc(n.longread_time)+'</span>' : '');
      jumpWrap.appendChild(lr);
    }

    // Перехресні посилання на споріднені вузли/домени
    const xref = document.getElementById('p-xref');
    xref.innerHTML = '';
    if(n.xref && n.xref.length){
      const t = document.createElement('div');
      t.className = 'xref-title'; t.textContent = 'Повʼязане в атласі';
      xref.appendChild(t);
      n.xref.forEach(x=>{
        const d = DOMAINS[x.domain];
        if(!d) return;
        const a = document.createElement('a');
        a.href = d.file + (x.focus ? ('#'+x.focus) : '');
        a.innerHTML = esc(x.label) + '<span class="arrow">→</span>';
        xref.appendChild(a);
      });
    }

    document.getElementById('panel').classList.add('open');
    cy.nodes().removeClass('hl'); cy.getElementById(n.id).addClass('hl');
  }

  function closePanel(){
    document.getElementById('panel').classList.remove('open');
    cy.nodes().removeClass('hl');
  }

  function build(cfg){
    CATCOLOR = cfg.catColor; CATLABEL = cfg.catLabel;
    cytoscape.use(cytoscapeDagre);

    cy = cytoscape({
      container: document.getElementById('cy'),
      elements: {nodes: cfg.nodes, edges: cfg.edges},
      style: [
        {selector:'node', style:{
          'background-color': ele => CATCOLOR[ele.data('cat')] || '#7d6a5e',
          'shape': ele => ele.data('shape') || 'ellipse',
          'label':'data(label)','color':'#ede2d3','font-size':11,
          'font-family':'IBM Plex Sans, sans-serif','font-weight':500,
          'text-valign':'bottom','text-margin-y':9,'width':26,'height':26,
          'border-width':1.5,'border-color':'#1a1013','text-wrap':'wrap','text-max-width':140,
          'text-background-color':'#1a1013','text-background-opacity':0.82,'text-background-padding':3,
          'text-background-shape':'roundrectangle',
          'transition-property':'border-width, border-color, opacity',
          'transition-duration':'110ms'
        }},
        {selector:'node[?stub]', style:{'border-style':'dashed','border-width':2,'border-color':'#7d6a5e'}},
        {selector:'edge', style:{
          'width':1.1,'line-color':'#5a4048','target-arrow-color':'#6b4d56',
          'target-arrow-shape':'triangle','curve-style':'bezier','arrow-scale':0.9,
          'label':'data(label)','font-size':9,'color':'#b3a292',
          'font-family':'IBM Plex Sans, sans-serif',
          'text-background-color':'#1a1013','text-background-opacity':0.9,'text-background-padding':3,
          'text-background-shape':'roundrectangle','text-rotation':'autorotate',
          'transition-property':'line-color, width, opacity','transition-duration':'110ms'
        }},
        {selector:'.dim', style:{'opacity':0.05}},
        {selector:'.hl', style:{'border-width':3,'border-color':'#c98a3f','width':30,'height':30}},
        {selector:'.faded', style:{'opacity':0.28}},

        // Підсвітка сусідства при наведенні
        {selector:'.faded-hood', style:{'opacity':0.13}},
        {selector:'node.in-hood', style:{
          'border-width':2, 'border-color':'#c98a3f', 'z-index':10
        }},
        {selector:'edge.in-hood', style:{
          'line-color':'#c98a3f', 'target-arrow-color':'#c98a3f',
          'width':2, 'color':'#ede2d3', 'z-index':10,
          'text-opacity':1   // підпис ребра видно завжди, коли воно в сусідстві
        }}
      ],
      layout:{name:'preset'}, minZoom:0.12, maxZoom:2.6,
      wheelSensitivity:0.25
    });

    if(cfg.presetPositions){
      // Анатомічний макет: координати задані вручну під конкретну ілюстрацію,
      // dagre не потрібен — просто застосовуємо позиції як є.
      cy.layout({name:'preset', fit:false}).run();
      if(cfg.initialView) cy.viewport(cfg.initialView);
      else cy.fit(null, 60);
    } else {
      cy.layout(Object.assign({
        name:'dagre', rankDir:'TB', nodeSep:58, rankSep:135, edgeSep:24,
        nodeDimensionsIncludeLabels:true, animate:false
      }, cfg.layout||{})).run();
      cy.fit(null, 85);
    }

    // ── ЧИТАБЕЛЬНІСТЬ ПІДПИСІВ ──
    // Логіка: підпис ніколи не менший за читабельний мінімум на екрані,
    // АЛЕ росте, коли наближаєш. Попередня версія робила його константним —
    // тобто зум углиб не давав збільшення, що суперечило очікуванню.
    //   graphPx = max(MIN_SCREEN / zoom, BASE)
    //   → при малому зумі: тримає мінімум читабельності
    //   → при великому:    росте природно, як і має бути
    const NODE_MIN_SCREEN = 12.5, NODE_BASE = 11;
    const EDGE_MIN_SCREEN = 11.5, EDGE_BASE = 9;

    // Рівень деталізації (LOD): підписи ребер — це дрібний шар,
    // що при віддаленні перетворюється на візуальний шум. Ховаємо їх,
    // поки не наблизишся достатньо, щоб вони справді читались.
    const EDGE_LABEL_ZOOM = 0.62;

    function rescaleLabels(){
      const z = cy.zoom();
      const nodePx = Math.max(NODE_MIN_SCREEN / z, NODE_BASE);
      const edgePx = Math.max(EDGE_MIN_SCREEN / z, EDGE_BASE);
      const showEdgeLabels = z >= EDGE_LABEL_ZOOM;

      cy.style()
        .selector('node').style('font-size', nodePx)
        .selector('edge').style({
          'font-size': edgePx,
          'text-opacity': showEdgeLabels ? 1 : 0
        })
        .update();
    }
    cy.on('zoom', rescaleLabels);
    rescaleLabels();

    // Підказка про рівень деталізації — щоб було зрозуміло,
    // що підписи ребер не зникли назавжди, а з'являються при наближенні
    const lodHint = document.getElementById('lod-hint');
    if(lodHint){
      function updateLod(){
        const near = cy.zoom() >= EDGE_LABEL_ZOOM;
        lodHint.classList.toggle('lod-on', near);
        lodHint.textContent = near
          ? 'підписи зв\u2019язків видно'
          : 'наблизь, щоб побачити підписи зв\u2019язків';
      }
      cy.on('zoom', updateLod);
      updateLod();
    }

    // ── ВУЗЛИ НЕ ПЕРЕТЯГУЮТЬСЯ ──
    // Розкладка (особливо анатомічна в circuits.html) вивірена вручну —
    // випадкове перетягування пальцем ламає її незворотно.
    // Панорамування й зум лишаються: досліджувати граф можна вільно.
    cy.autoungrabify(true);

    // ── ПІДСВІТКА СУСІДСТВА ──
    // Наведення на вузол показує рівно те, з чим він пов'язаний:
    // сам вузол, його сусіди й ребра між ними. Решта графа гасне.
    // Це головний просторовий інструмент: одразу видно контур,
    // до якого належить вузол, без читання всього графа.
    let hoverTimer = null;
    cy.on('mouseover', 'node', evt => {
      clearTimeout(hoverTimer);
      const n = evt.target;
      const hood = n.closedNeighborhood();
      cy.elements().difference(hood).addClass('faded-hood');
      hood.addClass('in-hood');
    });
    cy.on('mouseout', 'node', () => {
      hoverTimer = setTimeout(() => {
        cy.elements().removeClass('faded-hood in-hood');
      }, 60);
    });

    // Синхронізація фонової анатомічної ілюстрації (якщо є #cy-bg-layer)
    // з панорамуванням/зумом графа — та сама математика, що й у cytoscape:
    // screen = graph*zoom + pan, тож застосовуємо ідентичну CSS-трансформацію.
    const bgLayer = document.getElementById('cy-bg-layer');
    if(bgLayer){
      function syncBg(){
        const pan = cy.pan(), z = cy.zoom();
        bgLayer.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${z})`;
      }
      cy.on('pan zoom', syncBg);
      syncBg();
    }
    const ld = document.getElementById('loading'); if(ld) ld.style.display='none';

    cy.on('tap','node', e => openPanel(e.target.data()));
    cy.on('tap', e => { if(e.target === cy) closePanel(); });

    // Пошук
    const search = document.getElementById('search');
    if(search) search.addEventListener('input', e=>{
      const q = e.target.value.trim().toLowerCase();
      if(!q){ cy.elements().removeClass('dim'); return; }
      cy.nodes().forEach(n=> n.toggleClass('dim', !n.data('label').toLowerCase().includes(q)));
      cy.edges().addClass('dim');
    });

    // Легенда-фільтр за категорією
    document.querySelectorAll('#legend .row[data-cat]').forEach(row=>{
      row.addEventListener('click', ()=>{
        const cat = row.dataset.cat;
        const active = row.classList.toggle('active-filter');
        document.querySelectorAll('#legend .row[data-cat]').forEach(r=>{ if(r!==row) r.classList.remove('active-filter'); });
        if(!active){ cy.elements().removeClass('faded'); return; }
        cy.nodes().forEach(n=> n.toggleClass('faded', n.data('cat')!==cat));
        cy.edges().addClass('faded');
      });
    });

    // Deep-link: якщо в URL є #focus — підсвітити й відкрити вузол
    if(location.hash){
      const id = location.hash.slice(1);
      const node = cy.getElementById(id);
      if(node && node.length){
        cy.animate({center:{eles:node}, zoom:1.1}, {duration:600});
        setTimeout(()=> openPanel(node.data()), 400);
      }
    }

    window.__cy = cy; // для дебагу
    return cy;
  }

  return {
    build, closePanel,
    zoomBy: (f) => {
      const z = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * f));
      cy.animate({ zoom: {level: z, renderedPosition: {x: cy.width()/2, y: cy.height()/2}} },
                 { duration: 180, easing: 'ease-out' });
    },
    fit: () => cy.animate({ fit: {padding: 70} }, { duration: 260, easing: 'ease-out' })
  };
})();
