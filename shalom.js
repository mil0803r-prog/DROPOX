'use strict';
/* DROPOX — Shalom: directorio de agencias y de Puntos PRO, con filtros, mapa por local y pines para segmentar anuncios.
   Los datos vienen de datos/shalom.json (catálogo de terceros, no oficial). Los Puntos PRO que agregues a mano se guardan en S.shalomPro. */
(() => {
  const MODOS = {
    ag: { ic: 'shalom', titulo: 'Agencias Shalom', sub: 'Dirección, referencia, horario y ubicación de cada agencia', vacio: 'No hay agencias con ese filtro.' },
    pro: { ic: 'shalompro', titulo: 'Puntos PRO', sub: 'Puntos de Shalom dentro de centros comerciales y tiendas', vacio: 'No hay Puntos PRO con ese filtro.' },
  };
  const F = { ag: { q: '', dep: '', prov: '', lim: 40 }, pro: { q: '', dep: '', prov: '', lim: 40 } };
  let DATA = null, estado = '';
  const propios = () => (S.shalomPro = S.shalomPro || []);
  const sinTilde = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const maps = x => x.la != null ? `https://www.google.com/maps/search/?api=1&query=${x.la},${x.lo}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([x.a, x.z, x.d, 'Perú'].filter(Boolean).join(', '))}`;
  const txt = x => [x.a, x.r ? 'Ref: ' + x.r : '', [x.z, x.p, x.d].filter((v, i, a) => v && a.indexOf(v) === i).join(' - ')].filter(Boolean).join('. ');

  async function cargar() {
    if (DATA || estado === 'cargando') return;
    estado = 'cargando';
    try {
      const r = await fetch('datos/shalom.json', { cache: 'no-cache' });
      if (!r.ok) throw 0;
      DATA = await r.json();
      estado = '';
    } catch (e) { estado = 'error'; }
    render();
  }
  const todos = modo => {
    const base = (DATA || []).filter(x => x.t === modo);
    return modo === 'pro' ? base.concat(propios().map(x => ({ ...x, t: 'pro', k: 'Punto Pro', propio: 1 }))) : base;
  };
  function filtrar(modo) {
    const f = F[modo], q = sinTilde(f.q.trim());
    return todos(modo).filter(x => (!f.dep || x.d === f.dep) && (!f.prov || x.p === f.prov) && (!q || sinTilde([x.n, x.z, x.p, x.d, x.a, x.r].join(' ')).includes(q)));
  }
  const csv = L => {
    const c = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    return '﻿' + [['Tipo', 'Departamento', 'Provincia', 'Distrito / zona', 'Local', 'Dirección', 'Referencia', 'Latitud', 'Longitud', 'Horario', 'Teléfono']]
      .concat(L.map(x => [x.k, x.d, x.p, x.z, x.n, x.a, x.r, x.la, x.lo, x.h, x.tel])).map(r => r.map(c).join(';')).join('\r\n');
  };
  function bajar(nombre, texto, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: mime })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  const copiar = (t, ok) => (navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast(ok), () => toast('No se pudo copiar')) : toast('No se pudo copiar'));
  // pines de 1 km (el mínimo de Meta); se quitan los repetidos que caen en el mismo punto
  const pines = L => {
    const vistos = new Set(), out = [];
    L.forEach(x => { if (x.la == null) return; const k = x.la.toFixed(4) + ',' + x.lo.toFixed(4); if (vistos.has(k)) return; vistos.add(k); out.push({ latitude: x.la, longitude: x.lo, radius: 1, distance_unit: 'kilometer' }); });
    return out;
  };

  function vista(el, modo) {
    const M = MODOS[modo], f = F[modo];
    if (!DATA) {
      el.innerHTML = `${secH(M.ic, M.titulo, M.sub)}<div class="card"><p class="sub">${estado === 'error' ? 'No se pudo cargar la lista. Revisa tu conexión y vuelve a entrar.' : 'Cargando la lista…'}</p></div>`;
      cargar(); return;
    }
    const base = todos(modo), L = filtrar(modo);
    const deps = [...new Set(base.map(x => x.d).filter(Boolean))].sort();
    const provs = [...new Set(base.filter(x => !f.dep || x.d === f.dep).map(x => x.p).filter(Boolean))].sort();
    const conMapa = L.filter(x => x.la != null).length;
    const mostrar = L.slice(0, f.lim);
    const tile = (l, v, s = '') => `<div class="t"><small>${l}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`;
    const agregar = modo === 'pro' ? '<button class="btn btn-pri" id="sh-nuevo" style="white-space:nowrap">+ Punto PRO</button>' : '';
    el.innerHTML = `${secH(M.ic, M.titulo, M.sub, agregar)}
    <div class="tiles">${tile('Resultados', L.length, `de ${base.length}`)}${tile('Departamentos', new Set(L.map(x => x.d)).size)}${tile('Con ubicación en mapa', conMapa, `${L.length - conMapa} sin coordenadas`)}${tile('Provincias', new Set(L.map(x => x.p)).size)}</div>
    <div class="card"><h3>Buscar</h3>
      <div class="field"><input id="sh-q" type="search" autocomplete="off" placeholder="Distrito, calle, referencia o nombre del local" value="${esc(f.q)}"></div>
      <div class="row" style="margin-top:8px"><div class="field"><label>Departamento</label><select id="sh-dep"><option value="">Todos</option>${deps.map(d => `<option ${d === f.dep ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
      <div class="field"><label>Provincia</label><select id="sh-prov"><option value="">Todas</option>${provs.map(d => `<option ${d === f.prov ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div></div>
      <div class="it-a" style="margin:10px 0 0"><button class="btn btn-sm" id="sh-csv">Descargar Excel</button><button class="btn btn-sm" id="sh-pines" ${conMapa ? '' : 'disabled'}>Copiar pines para Meta (${pines(L).length})</button>${f.q || f.dep || f.prov ? '<button class="btn btn-sm" id="sh-limpiar">Quitar filtros</button>' : ''}</div>
      <p class="note">Los pines salen con radio de 1 km, que es lo mínimo que acepta Meta. Se copian solo los que están filtrados arriba.</p></div>
    ${modo === 'pro' ? '<p class="note">Esta lista sale de un catálogo de terceros y puede estar incompleta. Si falta alguno, agrégalo con «+ Punto PRO» y queda guardado en tu cuenta.</p>' : '<p class="note">Datos de un catálogo de terceros, no oficial. Confirma horario y dirección con Shalom antes de dárselos a un cliente.</p>'}
    <div class="list">${mostrar.length ? mostrar.map((x, i) => `<div class="it"><div class="it-h"><b>${esc(x.n || x.z)}</b><span class="tag">${esc(x.k)}</span></div>
      <div class="it-s">${esc([x.z, x.p, x.d].filter((v, j, a) => v && a.indexOf(v) === j).join(' · '))}</div>
      <div class="it-s" style="margin-top:-6px;color:var(--txt,inherit)">${esc(x.a)}${x.r ? `<br><span style="color:var(--mut)">Ref: ${esc(x.r)}</span>` : ''}${x.h ? `<br><span style="color:var(--mut)">${esc(x.h)}${x.tel ? ' · ' + esc(x.tel) : ''}</span>` : ''}</div>
      <div class="it-a" style="margin:0"><a class="btn btn-sm btn-pri" href="${esc(maps(x))}" target="_blank" rel="noopener noreferrer">Cómo llegar</a><button class="btn btn-sm" data-c="${i}">Copiar dirección</button>${x.propio ? `<button class="btn btn-sm" data-e="${esc(x.id)}">Editar</button><button class="btn btn-sm btn-del" data-d="${esc(x.id)}">✕</button>` : ''}</div></div>`).join('') : `<div class="card"><p class="sub">${M.vacio}</p></div>`}</div>
    ${L.length > mostrar.length ? `<button class="btn" id="sh-mas" style="width:100%;margin-top:12px">Ver más (${L.length - mostrar.length} restantes)</button>` : ''}`;

    const reset = () => { f.lim = 40; render(); };
    let t; $('#sh-q').oninput = e => { f.q = e.target.value; clearTimeout(t); t = setTimeout(() => { reset(); const q = $('#sh-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); };
    $('#sh-dep').onchange = e => { f.dep = e.target.value; f.prov = ''; reset(); };
    $('#sh-prov').onchange = e => { f.prov = e.target.value; reset(); };
    const lim = $('#sh-limpiar'); if (lim) lim.onclick = () => { f.q = f.dep = f.prov = ''; reset(); };
    const mas = $('#sh-mas'); if (mas) mas.onclick = () => { f.lim += 40; render(); };
    $('#sh-csv').onclick = () => { bajar(modo === 'pro' ? 'puntos-pro-shalom.csv' : 'agencias-shalom.csv', csv(L), 'text/csv;charset=utf-8'); toast('Archivo listo'); };
    $('#sh-pines').onclick = () => copiar(JSON.stringify({ geo_locations: { custom_locations: pines(L), location_types: ['home'] } }, null, 1), `${pines(L).length} pines copiados`);
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => copiar(txt(mostrar[+b.dataset.c]), 'Dirección copiada'));
    if (modo !== 'pro') return;
    const campos = () => [{ k: 'n', l: 'Nombre del local', req: 1, full: 1 }, { k: 'd', l: 'Departamento', req: 1 }, { k: 'p', l: 'Provincia' }, { k: 'z', l: 'Distrito / zona', req: 1 }, { k: 'a', l: 'Dirección', req: 1, full: 1 }, { k: 'r', l: 'Referencia', full: 1 }, { k: 'h', l: 'Horario' }, { k: 'tel', l: 'Teléfono' }, { k: 'la', l: 'Latitud (opcional)', t: 'text' }, { k: 'lo', l: 'Longitud (opcional)', t: 'text' }];
    const limpio = v => { const o = { ...v }; const la = parseFloat(String(o.la).replace(',', '.')), lo = parseFloat(String(o.lo).replace(',', '.')); o.la = isFinite(la) ? la : null; o.lo = isFinite(lo) ? lo : null; o.k = 'Punto Pro'; return o; };
    $('#sh-nuevo').onclick = () => openForm('Nuevo Punto PRO', campos(), {}, v => propios().push({ id: uid(), ...limpio(v) }));
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const x = propios().find(y => y.id === b.dataset.e); if (x) openForm('Editar Punto PRO', campos(), x, v => Object.assign(x, limpio(v))); });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Quitar este Punto PRO?', () => { S.shalomPro = propios().filter(y => y.id !== b.dataset.d); }));
  }
  window.Shalom = { vista };
  if (['shalom', 'shalompro'].includes((location.hash || '').slice(1))) render();
})();
