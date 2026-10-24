'use strict';
/* DROPOX — Registro de gastos por días. Se guarda en S.gdia y es independiente del resto de la app. */
(() => {
  const CAT_D = ['Transporte / Movilidad', 'Alimentación', 'Herramientas / Software', 'Empaque / Materiales', 'Comisiones y retiros', 'Publicidad extra', 'Servicios', 'Otros'];
  const lista = () => (S.gdia = S.gdia || []);
  const fechaLarga = f => { const d = new Date(f + 'T12:00:00'); return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }); };
  const campos = () => [{ k: 'fecha', l: 'Fecha', t: 'date', def: hoy(), req: 1 }, { k: 'concepto', l: 'Concepto', req: 1, full: 1 },
    { k: 'categoria', l: 'Categoría', t: 'select', opts: Object.fromEntries(CAT_D.map(c => [c, c])) }, { k: 'monto', l: 'Monto (S/)', t: 'number', req: 1 }, { k: 'nota', l: 'Nota (opcional)', full: 1 }];

  function vista(el) {
    const pk = S.config.periodo, [from, to] = rango(pk), todos = lista();
    const L = todos.filter(g => g.fecha >= from && g.fecha <= to).sort((a, b) => b.fecha.localeCompare(a.fecha) || 0);
    const suma = arr => arr.reduce((s, g) => s + num(g.monto), 0);
    const total = suma(L), hoyT = suma(todos.filter(g => g.fecha === hoy()));
    const porDia = {}; L.forEach(g => { (porDia[g.fecha] = porDia[g.fecha] || []).push(g); });
    const dias = Object.keys(porDia).sort().reverse();
    const porCat = {}; L.forEach(g => { porCat[g.categoria || 'Otros'] = (porCat[g.categoria || 'Otros'] || 0) + num(g.monto); });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    // últimos 14 días para la barra de tendencia
    const ult = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = iso(d); ult.push({ k, v: suma(todos.filter(g => g.fecha === k)) }); }
    const mx = Math.max(1, ...ult.map(x => x.v));
    const tile = (l, v, s = '') => `<div class="t"><small>${l}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`;
    el.innerHTML = `${secH('gastos', 'Gastos diarios', 'Anota lo que gastas cada día', '<button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Gasto</button>')}
    <div class="card card-row per"><div><small class="cap">Periodo</small><b>Gastos del periodo</b></div><select id="per">${Object.entries(PERIODOS).map(([k, l]) => `<option value="${k}" ${k === pk ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="card"><h3>Anotar rápido</h3><p class="sub">Para hoy, ${esc(fechaLarga(hoy()))}</p>
      <div class="row"><div class="field"><label>Concepto</label><input id="qc" type="text" maxlength="80" placeholder="Ej. Pasaje, almuerzo, bolsas"></div><div class="field"><label>Monto (S/)</label><input id="qm" type="number" step="any" min="0" inputmode="decimal"></div></div>
      <div class="field"><label>Categoría</label><select id="qk">${CAT_D.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <button class="btn btn-pri" id="qa" style="margin-top:10px">Agregar a hoy</button></div>
    <div class="tiles">${tile('Total del periodo', fmt(total), `${L.length} gastos`)}${tile('Hoy', fmt(hoyT))}${tile('Promedio por día con gasto', dias.length ? fmt(total / dias.length) : '—', `${dias.length} días`)}${tile('Día más caro', dias.length ? fmt(Math.max(...dias.map(d => suma(porDia[d])))) : '—')}</div>
    <div class="card"><h3>Últimos 14 días</h3><div class="gd-bars">${ult.map(x => `<div class="gd-b" title="${esc(x.k)}: ${esc(fmt(x.v))}"><i style="height:${Math.round(x.v / mx * 100)}%"></i><span>${x.k.slice(8)}</span></div>`).join('')}</div></div>
    ${cats.length ? `<div class="card"><h3>Por categoría</h3>${cats.map(([k, v]) => `<div class="pb-row"><div class="pb-top"><span>${esc(k)}</span><span>${fmt(v)}</span></div><div class="pb-bar"><i style="width:${Math.round(v / total * 100)}%;background:var(--acc)"></i></div></div>`).join('')}</div>` : ''}
    <p class="note">Esta sección es independiente: no se suma a la utilidad neta ni a los reportes del resto de la app.</p>
    <div class="card"><h3>Registro por día</h3><p class="sub">${dias.length ? 'Lo más reciente primero' : 'Todavía no hay gastos en este periodo.'}</p>
      ${dias.map(d => `<div class="gd-d"><div class="it-h"><b>${esc(fechaLarga(d))}</b><b>${fmt(suma(porDia[d]))}</b></div><div class="list">${porDia[d].map(g => `<div class="it"><div class="it-h"><b>${esc(g.concepto)}</b><b>${fmt(g.monto)}</b></div><div class="it-s">${esc(g.categoria || 'Otros')}${g.nota ? ' · ' + esc(g.nota) : ''}</div><div class="it-a" style="margin:0"><button class="btn btn-sm" data-e="${g.id}">Editar</button><button class="btn btn-sm btn-del" data-d="${g.id}">✕</button></div></div>`).join('')}</div></div>`).join('')}</div>`;
    $('#per').onchange = e => { S.config.periodo = e.target.value; Store.save(); render(); };
    $('#nuevo').onclick = () => openForm('Nuevo gasto', campos(), {}, v => lista().push({ id: uid(), ...v }));
    $('#qa').onclick = () => { const c = $('#qc').value.trim(), m = num($('#qm').value); if (!c || !(m > 0)) { toast('Escribe el concepto y un monto'); return; } lista().push({ id: uid(), fecha: hoy(), concepto: c, categoria: $('#qk').value, monto: m, nota: '' }); Store.save(); toast('Gasto agregado'); render(); };
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const g = lista().find(x => x.id === b.dataset.e); openForm('Editar gasto', campos(), g, v => Object.assign(g, v)); });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Eliminar este gasto?', () => { S.gdia = lista().filter(x => x.id !== b.dataset.d); }));
  }
  window.Gdia = { vista };
  if ((location.hash || '').slice(1) === 'gdia') render();
})();
