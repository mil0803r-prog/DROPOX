'use strict';
/* DROPOX — Caza diaria (Dropi y AliClick) e Investigación de mercado.
   Todo se anota a mano y se guarda con el resto de tus datos (S.caza y S.invest). */
(() => {
  const FUENTES = {
    dropi: { n: 'Caza diaria Dropi', corto: 'Dropi', sub: 'Productos que encuentras cada día en Dropi' },
    aliclick: { n: 'Caza diaria AliClick', corto: 'AliClick', sub: 'Productos que encuentras cada día en AliClick' },
  };
  const EST = { nuevo: 'Nuevo', probar: 'Por probar', ganador: 'Ganador', descartado: 'Descartado' };
  const COMP = { baja: 'Baja', media: 'Media', alta: 'Alta' };
  const VER = { probar: 'Probar', seguir: 'Seguir investigando', no: 'No vale la pena' };
  const fCaza = { dropi: 'todos', aliclick: 'todos' };
  let fInv = 'todos';

  const lista = k => (S[k] = S[k] || []);
  const dia = f => { const [y, m, d] = f.split('-'); return `${d}/${m}`; };
  const tile = (l, v, s = '') => `<div class="t"><small>${l}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`;
  const margen = c => { const p = num(c.pvp) / divIgv(); return p > 0 ? (p - num(c.costo)) / p * 100 : null; };
  const chips = (act, opts, total) => `<div class="chips">${Object.entries({ todos: 'Todos', ...opts }).map(([k, l]) => `<button class="chip ${act === k ? 'on' : ''}" data-f="${k}">${l}<i>${k === 'todos' ? total.todos : (total[k] || 0)}</i></button>`).join('')}</div>`;
  const cuenta = (arr, key) => arr.reduce((m, x) => { m[x[key]] = (m[x[key]] || 0) + 1; m.todos++; return m; }, { todos: 0 });
  const enlace = u => { try { const x = new URL(/^https?:/i.test(u) ? u : 'https://' + u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };

  // primera vez que se abre la sección: carga la caza de hoy (se puede borrar o editar)
  function sembrar(k) {
    S.sembrado = S.sembrado || {};
    if (S.sembrado[k] || !Array.isArray(window.CAZA_SEMILLA)) return;
    const ya = new Set(lista('caza').map(c => c.ext).filter(Boolean));
    window.CAZA_SEMILLA.filter(x => x.fuente === k && !ya.has(x.ext)).forEach(x => S.caza.push({ id: uid(), ...x }));
    S.sembrado[k] = true; Store.save();
  }


  // ficha completa de un producto del radar (estructura del informe: tiles, barras, oferta, textos y enlaces)
  function ficha(f, i) {
    const E = window.RadarEcon, g = E.cfg(), ev = E.evaluar(f.costo, f.pvp);
    const mar = Math.max(0, Math.min(10, Math.round(ev.u / 3)));
    const b = { Demanda: f.bars.dem, 'Tracción': f.bars.tra, Margen: mar, Competencia: f.bars.com, Riesgo: f.bars.rie };
    const score = Math.round((f.bars.dem * 3.5 + mar * 2.5 + f.bars.tra * 1.5 + f.bars.com * 1.5 + f.bars.rie) );
    const P2 = Math.round(ev.pvp * 1.6 / 5) * 5, u2 = (g.entrega / 100) * (P2 * (1 - g.comision / 100) - 2 * f.costo - g.flete) - (1 - g.entrega / 100) * g.devolucion - g.cpa;
    const obj = 15, pmin = ((obj + g.cpa + (1 - g.entrega / 100) * g.devolucion) / (g.entrega / 100) + f.costo + g.flete) / (1 - g.comision / 100);
    const q = encodeURIComponent(f.n.split(/[·(]/)[0].trim());
    const col = score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
    const tile = (l, v) => `<div class="t"><small>${l}</small><b>${v}</b></div>`;
    const sec = (t, h) => `<div class="fk-s"><small>${t}</small><p>${h}</p></div>`;
    const lk = (a, u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(a)}</a>`;
    const cls = ev.v === 'VIABLE' ? 'rv-ok' : ev.v === 'REPRECIABLE' ? 'rv-mid' : 'rv-no';
    return `<div class="card fk">
      <div class="fk-h"><div class="fk-r">#${i + 1}</div><div class="fk-t"><b>${esc(f.n)}</b><small>${esc(f.sub)}</small></div><div class="fk-ring" style="--p:${score};--c:${col}"><span>${score}</span></div></div>
      <div class="tiles fk-tl">${tile('Costo', fmt(f.costo))}${tile('Precio venta', fmt(f.pvp))}${tile('Vend. 7 d', f.v7)}${tile('Vend. 30 d', f.v30)}${tile('Stock', f.st)}${tile('Venta total', f.tot)}${f.visto ? tile('Visto desde', esc(f.visto)) : ''}</div>
      <div class="tiles fk-tl">${tile('Tiendas activas en Perú', f.tAct)}${tile('Tiendas totales en Perú', f.tPE)}${tile('Anuncios revisados', f.nAds)}</div>
      <p class="fk-p">${esc(f.resumen)}</p>
      <div class="fk-bars">${Object.entries(b).map(([k, v]) => `<div><span>${k}</span><span>${v}/10</span><i><u style="width:${v * 10}%"></u></i></div>`).join('')}</div>
      <div class="fk-of"><div><small>Oferta</small><b>2 por ${fmt(P2)}</b></div><div><small>Utilidad esperada por pedido</small><b class="${u2 >= 0 ? '' : 'neg'}">${fmt(u2)}</b></div><div><small>Precio mínimo para +${fmt(obj)}</small><b>${fmt(pmin)}</b></div><div><small>Veredicto de margen</small><b><span class="rv ${cls}">${ev.v}</span></b></div></div>
      ${f.rk ? `<div class="fk-flag">● Bandera amarilla: ${esc(f.rkTxt)}</div>` : ''}
      ${sec('POR QUÉ', esc(f.porque))}${sec('ÁNGULO DE VENTA', esc(f.angulo))}
      <div class="fk-s"><small>ÁNGULOS NUEVOS (NADIE LOS USA)</small><ol class="rn">${f.nuevos.map(([a, h]) => `<li><b>${esc(a)}.</b> ${esc(h)}</li>`).join('')}</ol></div>
      ${sec('COMPETENCIA', esc(f.comp))}${sec('RIESGOS', esc(f.riesgos))}
      <details><summary>Tiendas que lo anuncian en Perú (${f.tiendas.length})</summary><ul class="fk-l">${f.tiendas.map(t => `<li>${lk(t.n, t.u)} · ${esc(t.e)} · ${esc(t.d)}</li>`).join('')}</ul></details>
      <details><summary>Creativos de video (${f.videos.length})</summary><ul class="fk-l">${f.videos.map(v => `<li>${lk(v.t, v.u)}</li>`).join('')}</ul></details>
      <p class="fk-n">Son enlaces: la página no puede incrustar videos externos.</p>
      <div class="fk-ph"><img src="${esc(f.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">${lk('Ver producto en ' + (f.f === 'dropi' ? 'Dropi' : 'AliClick'), f.url)}</div>
      <details open><summary>ID por proveedor (1)</summary><ul class="fk-l"><li><b>${esc(f.prov)}</b> · ID ${f.ext} · costo ${fmt(f.costo)} · stock ${f.st} · vend. 7 d ${f.v7} · 30 d ${f.v30}</li></ul></details>
      <p class="fk-lk">${lk('Dropi / AliClick', f.url)} · ${lk('DropKiller', 'https://app.dropkiller.com/dashboard/products/' + f.dk)} · ${lk('Amazon', 'https://www.amazon.com/s?k=' + q)} · ${lk('AliExpress', 'https://www.aliexpress.com/wholesale?SearchText=' + q)}</p>
      <div class="it-a" style="margin:8px 0 0"><button class="btn btn-sm" data-fc="${f.dk}">Calcular</button></div></div>`;
  }
  function fichasHtml(k) {
    const R = window.CAZA_FICHAS;
    if (!R || !window.RadarEcon) return '';
    const L = R.items.filter(x => x.f === k).map((x, i) => ({ x, i })).sort((a, b) => 0);
    if (!L.length) return '';
    return `<h3 style="margin:18px 0 8px">Radar de hoy · ${esc(R.fecha)}</h3><p class="note" style="margin:0 0 10px">Ficha de cada producto con datos de DropKiller, la biblioteca de anuncios, el kit del radar y la skill de productos ganadores. Los números de margen salen de «Tus números de operación» en <a href="#radar">Radar diario</a>.</p>` + L.map(({ x }, i) => ficha(x, i)).join('');
  }

  function vCaza(el, k) {
    const F = FUENTES[k], todos = lista('caza').filter(c => c.fuente === k);
    const meta = Math.max(1, num(S.config.metaCaza) || 5), hoyN = todos.filter(c => c.fecha === hoy()).length;
    const sem = (() => { const d = new Date(); d.setDate(d.getDate() - 6); const a = iso(d); return todos.filter(c => c.fecha >= a).length; })();
    const mejor = todos.filter(c => c.estado !== 'descartado').map(c => ({ c, m: margen(c) })).filter(x => x.m !== null).sort((a, b) => b.m - a.m)[0];
    // racha: días seguidos (hasta hoy o ayer) con al menos un producto
    const fechas = new Set(todos.map(c => c.fecha)); let racha = 0; const d = new Date(); if (!fechas.has(iso(d))) d.setDate(d.getDate() - 1);
    while (fechas.has(iso(d))) { racha++; d.setDate(d.getDate() - 1); }
    const act = fCaza[k], L = todos.filter(c => act === 'todos' || c.estado === act).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const pct = Math.min(100, hoyN / meta * 100);
    const campos = () => [{ k: 'fecha', l: 'Fecha', t: 'date', def: hoy(), req: 1 }, { k: 'nombre', l: 'Producto', req: 1, full: 1 },
      { k: 'costo', l: 'Costo proveedor (S/)', t: 'number', req: 1 }, { k: 'pvp', l: 'Precio de venta (S/)', t: 'number', req: 1 },
      { k: 'estado', l: 'Estado', t: 'select', opts: EST, def: 'nuevo' }, { k: 'categoria', l: 'Nicho / categoría' },
      { k: 'ventas', l: 'Ventas que ves (opcional)', t: 'number' }, { k: 'link', l: 'Enlace (opcional)', full: 1 }, { k: 'nota', l: 'Nota', full: 1 }];
    el.innerHTML = `${secH('caza', F.n, F.sub, '<button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Producto</button>')}
    <div class="card"><h3>Meta de hoy</h3><p class="sub">Productos cazados hoy: <b>${hoyN}</b> de ${meta}</p>
      <div class="pb-bar"><i style="width:${pct}%;background:var(--acc)"></i></div>
      <div class="row" style="margin-top:10px"><div class="field"><label>Meta diaria (productos)</label><input id="meta" type="number" min="1" inputmode="numeric" value="${meta}"></div></div></div>
    <div class="tiles">${tile('Hoy', hoyN, `meta ${meta}`)}${tile('Últimos 7 días', sem)}${tile('Racha', racha + (racha === 1 ? ' día' : ' días'))}${tile('Mejor margen', mejor ? pct1(mejor.m) : '—', mejor ? esc(mejor.c.nombre) : '')}</div>
    ${fichasHtml(k)}
    <h3 style="margin:18px 0 8px">Mis productos cazados</h3>
    ${chips(act, EST, cuenta(todos, 'estado'))}
    <div class="card"><h3>Productos</h3><p class="sub">${L.length ? 'Lo más reciente primero' : 'Anota cada producto que caces. Cuando uno te guste, mándalo a la Calculadora.'}</p>${L.length ? `<div class="list">${L.map(c => { const m = margen(c), u = enlace(c.link); return `<div class="it"><div class="it-h"><b>${esc(dia(c.fecha))} · ${esc(c.nombre)}</b><b>${fmt(c.pvp)}</b></div><div class="it-s">${esc(EST[c.estado] || '')} · costo ${fmt(c.costo)}${m === null ? '' : ' · margen bruto ' + pct1(m)}${c.categoria ? ' · ' + esc(c.categoria) : ''}${num(c.ventas) ? ' · ' + num(c.ventas) + ' ventas' : ''}${c.nota ? ' · ' + esc(c.nota) : ''}</div><div class="it-a" style="margin:0">${u ? `<a class="btn btn-sm" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ''}<button class="btn btn-sm" data-calc="${c.id}">Calcular</button><button class="btn btn-sm" data-e="${c.id}">Editar</button><button class="btn btn-sm btn-del" data-d="${c.id}">✕</button></div></div>`; }).join('')}</div>` : ''}</div>`;
    el.querySelectorAll('[data-fc]').forEach(bn => bn.onclick = () => { const x = window.CAZA_FICHAS.items.find(y => y.dk === bn.dataset.fc); Object.assign(C, { nombre: x.n.split(/[·(]/)[0].trim(), precio: num(x.pvp), costo: num(x.costo) }); guardarCalc(); toast('Producto enviado a la Calculadora'); go('calculadora'); });
    $('#nuevo').onclick = () => openForm('Nuevo producto · ' + F.corto, campos(), { fuente: k }, v => lista('caza').push({ id: uid(), fuente: k, ...v }));
    $('#meta').onchange = e => { S.config.metaCaza = Math.max(1, num(e.target.value) || 5); Store.save(); render(); };
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { fCaza[k] = b.dataset.f; render(); });
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const c = S.caza.find(x => x.id === b.dataset.e); openForm('Editar producto', campos(), c, v => Object.assign(c, v)); });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Eliminar este producto?', () => S.caza = S.caza.filter(x => x.id !== b.dataset.d)));
    el.querySelectorAll('[data-calc]').forEach(b => b.onclick = () => { const c = S.caza.find(x => x.id === b.dataset.calc); Object.assign(C, { nombre: c.nombre, precio: num(c.pvp), costo: num(c.costo) }); guardarCalc(); toast('Producto enviado a la Calculadora'); go('calculadora'); });
  }
  const pct1 = n => n.toFixed(0) + '%';

  function vInvest(el) {
    const todos = lista('invest'), L = todos.filter(x => fInv === 'todos' || x.veredicto === fInv).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const campos = () => [{ k: 'fecha', l: 'Fecha', t: 'date', def: hoy(), req: 1 }, { k: 'producto', l: 'Producto', req: 1, full: 1 },
      { k: 'nicho', l: 'Nicho / mercado' }, { k: 'publico', l: 'Público objetivo' },
      { k: 'competencia', l: 'Competencia', t: 'select', opts: COMP, def: 'media' }, { k: 'precioMercado', l: 'Precio del mercado (S/)', t: 'number' },
      { k: 'veredicto', l: 'Veredicto', t: 'select', opts: VER, def: 'seguir', full: 1 },
      { k: 'problema', l: 'Problema que resuelve', full: 1 }, { k: 'angulos', l: 'Ángulos de venta', full: 1 },
      { k: 'competidores', l: 'Competidores / enlaces', full: 1 }, { k: 'nota', l: 'Notas', full: 1 }];
    el.innerHTML = `${secH('investigacion', 'Investigación de mercado', 'Valida un producto antes de invertir', '<button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Investigación</button>')}
    <div class="tiles">${tile('Investigaciones', todos.length)}${tile('Para probar', todos.filter(x => x.veredicto === 'probar').length)}${tile('Siguen en estudio', todos.filter(x => x.veredicto === 'seguir').length)}${tile('Descartadas', todos.filter(x => x.veredicto === 'no').length)}</div>
    ${chips(fInv, VER, cuenta(todos, 'veredicto'))}
    <div class="card"><h3>Estudios</h3><p class="sub">${L.length ? 'Lo más reciente primero' : 'Anota nicho, público, competencia, precio y ángulos de cada producto que investigues.'}</p>${L.length ? `<div class="list">${L.map(x => `<div class="it"><div class="it-h"><b>${esc(dia(x.fecha))} · ${esc(x.producto)}</b><b>${esc(VER[x.veredicto] || '')}</b></div><div class="it-s">${x.nicho ? esc(x.nicho) + ' · ' : ''}Competencia ${esc((COMP[x.competencia] || '').toLowerCase())}${num(x.precioMercado) ? ' · mercado ' + fmt(x.precioMercado) : ''}${x.publico ? ' · público: ' + esc(x.publico) : ''}</div>${x.problema ? `<div class="it-s">Problema: ${esc(x.problema)}</div>` : ''}${x.angulos ? `<div class="it-s">Ángulos: ${esc(x.angulos)}</div>` : ''}${x.competidores ? `<div class="it-s">Competidores: ${esc(x.competidores)}</div>` : ''}${x.nota ? `<div class="it-s">${esc(x.nota)}</div>` : ''}<div class="it-a" style="margin:0"><button class="btn btn-sm" data-e="${x.id}">Editar</button><button class="btn btn-sm btn-del" data-d="${x.id}">✕</button></div></div>`).join('')}</div>` : ''}</div>`;
    $('#nuevo').onclick = () => openForm('Nueva investigación', campos(), {}, v => lista('invest').push({ id: uid(), ...v }));
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { fInv = b.dataset.f; render(); });
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const x = S.invest.find(y => y.id === b.dataset.e); openForm('Editar investigación', campos(), x, v => Object.assign(x, v)); });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Eliminar esta investigación?', () => S.invest = S.invest.filter(y => y.id !== b.dataset.d)));
  }

  window.Caza = { vista: (el, k) => (k === 'invest' ? vInvest(el) : vCaza(el, k)) };
  if (['investigacion', 'dropi', 'aliclick'].includes(vista)) render();
})();
