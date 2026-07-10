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
        srcWrap.innerHTML = '<div class="no-sources">Джерела для цього вузла ще не додані.</div>';
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
          'background-color': ele => CATCOLOR[ele.data('cat')] || '#7d8399',
          'shape': ele => ele.data('shape') || 'ellipse',
          'label':'data(label)','color':'#f0ece1','font-size':11.5,'font-family':'Manrope','font-weight':500,
          'text-valign':'bottom','text-margin-y':8,'width':24,'height':24,
          'border-width':1.5,'border-color':'#0f111a','text-wrap':'wrap','text-max-width':135,
          'text-background-color':'#0f111a','text-background-opacity':0.72,'text-background-padding':2.5,
          'text-background-shape':'roundrectangle'
        }},
        {selector:'node[?stub]', style:{'border-style':'dashed','border-width':2,'border-color':'#6b7089'}},
        {selector:'edge', style:{
          'width':1.2,'line-color':'var(--edge, #4a5070)','target-arrow-color':'#4a5070',
          'target-arrow-shape':'triangle','curve-style':'bezier','arrow-scale':0.85,
          'label':'data(label)','font-size':9,'color':'#8a90a8','font-family':'Manrope',
          'text-background-color':'#0f111a','text-background-opacity':0.88,'text-background-padding':2
        }},
        {selector:'.dim', style:{'opacity':0.05}},
        {selector:'.hl', style:{'border-width':3,'border-color':'#c9a05e','width':30,'height':30}},
        {selector:'.faded', style:{'opacity':0.28}}
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

    // Текст завжди читабельний на екрані незалежно від рівня зуму графа —
    // без цього щільні домени (57 вузлів) стискаються до нечитабельних 4px.
    const SCREEN_PX = 12.5, MIN_GRAPH_PX = 7, MAX_GRAPH_PX = 60;
    function rescaleLabels(){
      const z = cy.zoom();
      const graphPx = Math.min(MAX_GRAPH_PX, Math.max(MIN_GRAPH_PX, SCREEN_PX / z));
      cy.style().selector('node').style('font-size', graphPx).update();
      cy.style().selector('edge').style('font-size', Math.min(MAX_GRAPH_PX*0.8, Math.max(MIN_GRAPH_PX*0.7, SCREEN_PX*0.8/z))).update();
    }
    cy.on('zoom', rescaleLabels);
    rescaleLabels();

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

  return {build, closePanel, zoomBy:(f)=>cy.zoom(cy.zoom()*f), fit:()=>cy.fit(null,85)};
})();
