'use strict';
/* DROPOX — sección Meta Ads automática: campañas, conjuntos y anuncios con las métricas de Meta, por fecha.
   Los datos llegan de /api/meta (la clave de Meta vive en Vercel). Con DROPOX_DEMO se muestran datos de ejemplo. */
const Meta = (() => {
  const demo = () => !!window.DROPOX_DEMO && !(window.Nube && Nube.listo);
  const N = x => (isFinite(+x) ? +x : 0);
  const n0 = x => N(x).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  const n2 = x => N(x).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f1 = fecha => (fecha ? String(fecha).slice(8, 10) + '/' + String(fecha).slice(5, 7) + '/' + String(fecha).slice(0, 4) : '—');
  const money = x => (x === null || x === undefined ? '—' : fmt(x));
  const ESTADOS = { ACTIVE: ['Activa', 'ok'], PAUSED: ['Pausada', 'off'], CAMPAIGN_PAUSED: ['Campaña pausada', 'off'], ADSET_PAUSED: ['Conjunto pausado', 'off'], ARCHIVED: ['Archivada', 'off'], DELETED: ['Eliminada', 'off'], WITH_ISSUES: ['Con problemas', 'bad'], IN_PROCESS: ['En revisión', 'warn'], PENDING_REVIEW: ['En revisión', 'warn'], DISAPPROVED: ['Rechazada', 'bad'] };
  const OBJ = { OUTCOME_SALES: 'Ventas', OUTCOME_LEADS: 'Clientes potenciales', OUTCOME_ENGAGEMENT: 'Interacción', OUTCOME_TRAFFIC: 'Tráfico', OUTCOME_AWARENESS: 'Reconocimiento', OUTCOME_APP_PROMOTION: 'Promoción de app' };

  let datos = null, clave = '', cargando = false, error = '', falta = false, filtro = 'activas', abierto = new Set();

  const rangoActual = () => { const pk = S.config.periodo; let [d, h] = rango(pk); if (pk === 'todo') { const x = new Date(); x.setDate(x.getDate() - 89); d = iso(x); } const hoyS = hoy(); return [d, h > hoyS ? hoyS : h]; };

  // ───────── datos de ejemplo ─────────
  function ejemplo(desde, hasta) {
    const dias = []; for (let d = new Date(desde + 'T12:00:00'); iso(d) <= hasta && dias.length < 120; d.setDate(d.getDate() + 1)) dias.push(iso(new Date(d)));
    const m = (g, comp, imp) => ({ gasto: g, impresiones: imp, alcance: Math.round(imp * .62), frecuencia: 1.6, clics: Math.round(imp * .045), clics_enlace: Math.round(imp * .033), ctr_enlace: 3.3, cpc_enlace: g / Math.max(1, imp * .033), ctr: 4.5, cpc: g / Math.max(1, imp * .045), cpm: g / imp * 1000, compras: comp, valor_compras: comp * 79, costo_compra: comp ? g / comp : null, roas: g ? comp * 79 / g : null, mensajes: comp * 3, costo_mensaje: comp ? g / (comp * 3) : null });
    const an = (id, nom, est, g, c, i) => ({ id, nombre: nom, estado: est, creado: desde + 'T10:00:00-0500', m: m(g, c, i) });
    const set = (id, nom, est, g, c, i, anuncios) => ({ id, nombre: nom, estado: est, optimizacion: 'OFFSITE_CONVERSIONS', presupuesto_diario: est === 'ACTIVE' ? 20 : null, presupuesto_total: null, inicio: desde + 'T00:00:00-0500', fin: null, m: m(g, c, i), anuncios });
    const campanas = [
      { id: '1', nombre: 'ABO 29-09 COLLAR LLAVE TESTEO', estado: 'ACTIVE', objetivo: 'OUTCOME_SALES', presupuesto_diario: null, presupuesto_total: null, inicio: desde + 'T00:00:00-0500', fin: null, creada: desde + 'T00:00:00-0500', m: m(127, 12, 33558), conjuntos: [
        set('11', 'Conjunto amplio 25-45', 'ACTIVE', 74, 8, 19800, [an('111', 'Video 1 - Dolor', 'ACTIVE', 48, 5, 12400), an('112', 'Imagen testimonio', 'PAUSED', 26, 3, 7400)]),
        set('12', 'Intereses accesorios', 'ACTIVE', 53, 4, 13758, [an('121', 'Video 2 - Beneficio', 'ACTIVE', 53, 4, 13758)])] },
      { id: '2', nombre: 'CBO 29-09 COLLAR LLAVE ESCALADO', estado: 'ACTIVE', objetivo: 'OUTCOME_SALES', presupuesto_diario: 25, presupuesto_total: null, inicio: desde + 'T00:00:00-0500', fin: null, creada: desde + 'T00:00:00-0500', m: m(54, 7, 15612), conjuntos: [
        set('21', 'Público similar 1%', 'ACTIVE', 54, 7, 15612, [an('211', 'Video 1 - Dolor', 'ACTIVE', 54, 7, 15612)])] },
      { id: '3', nombre: 'CAMPAÑA DE TESTEO CBO', estado: 'PAUSED', objetivo: 'OUTCOME_SALES', presupuesto_diario: null, presupuesto_total: null, inicio: desde + 'T00:00:00-0500', fin: null, creada: desde + 'T00:00:00-0500', m: m(66, 6, 17949), conjuntos: [
        set('31', 'Conjunto 1', 'PAUSED', 66, 6, 17949, [an('311', 'Anuncio 1', 'PAUSED', 66, 6, 17949)])] }];
    const dia = (f, i) => { const g = 10 + (i * 7) % 9, c = 1 + i % 3; return { fecha: f, ...m(g, c, g * 270) }; };
    return { cuenta: { id: META_CUENTA.id, nombre: META_CUENTA.nombre, moneda: 'PEN', zona: 'America/Lima' }, desde, hasta, campanas, dias: dias.map(dia), ejemplo: true };
  }
  function ejemploDias(e) { const dias = (datos && datos.dias) || []; const tot = dias.reduce((s, d) => s + d.gasto, 0) || 1; return dias.map(d => { const p = d.gasto / tot; return { fecha: d.fecha, ...Object.fromEntries(Object.entries(e.m).map(([k, v]) => [k, typeof v === 'number' && !/ctr|cpm|cpc|costo|roas|frecuencia/.test(k) ? v * p : v])) }; }); }

  // ───────── conexión ─────────
  async function traer(params) {
    if (demo()) throw new Error('demo');
    if (!window.Nube || !Nube.listo) { const e = new Error('Para ver Meta Ads automático hace falta la versión con cuenta.'); e.sinCuenta = true; throw e; }
    const tk = Nube.activo ? await Nube.token() : null;
    if (!tk) throw new Error('Inicia sesión para ver Meta Ads.');
    const r = await fetch('/api/meta?' + new URLSearchParams(params), { headers: { Authorization: 'Bearer ' + tk } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || 'No se pudo leer Meta.'); e.falta = d.falta === 'token'; throw e; }
    return d;
  }

  // los días de la cuenta alimentan el Dashboard (utilidad neta)
  async function sync() {
    try {
      const x = new Date(); x.setDate(x.getDate() - 59);
      const d = await traer({ desde: iso(x), hasta: hoy(), solo: 'dias' });
      if (String(d.cuenta && d.cuenta.id) !== META_CUENTA.id) return;
      window.DROPOX_META = { cuenta: { id: META_CUENTA.id }, dias: d.dias.filter(z => z.gasto > 0).map(z => ({ fecha: z.fecha, gasto: z.gasto, compras: z.compras, ventas: z.valor_compras })) };
      S.metaAuto = true; syncMeta(); Store.save(); render();
    } catch (e) { /* sin conexión o sin configurar: la sección lo explica */ }
  }

  async function cargar(forzar) {
    const [d, h] = rangoActual(), k = d + '|' + h;
    if (cargando || (!forzar && datos && clave === k)) return;
    cargando = true; error = ''; falta = false;
    try {
      datos = demo() ? ejemplo(d, h) : await traer({ desde: d, hasta: h });
      clave = k;
      if (!datos.ejemplo && String(datos.cuenta.id) !== META_CUENTA.id) { error = `La cuenta conectada (${datos.cuenta.nombre || datos.cuenta.id}) no es ${META_CUENTA.nombre}.`; datos = null; }
    } catch (e) { datos = null; error = e.message; falta = !!e.falta; if (e.sinCuenta) error = ''; }
    cargando = false;
    if (vista === 'meta') render();
  }

  // ───────── vista ─────────
  const kv = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
  const tag = e => { const [t, c] = ESTADOS[e] || [e || '—', 'off']; return `<span class="mtag mtag-${c}">${esc(t)}</span>`; };
  const cuerpo = (nivel, e) => { const m = e.m;
    return `<div class="mt-grid">${kv('Importe gastado', money(m.gasto))}${kv('Impresiones', n0(m.impresiones))}${kv('Alcance', n0(m.alcance))}${kv('Frecuencia', n2(m.frecuencia))}${kv('Clics en el enlace', n0(m.clics_enlace))}${kv('CTR (enlace)', n2(m.ctr_enlace) + '%')}${kv('CPC (enlace)', money(m.cpc_enlace))}${kv('CPM', money(m.cpm))}${kv('Compras', n0(m.compras))}${kv('Costo por compra', money(m.costo_compra))}${kv('Valor de compras', money(m.valor_compras))}${kv('ROAS de compras', m.roas ? n2(m.roas) + 'x' : '—')}${kv('Mensajes iniciados', n0(m.mensajes))}${kv('Costo por mensaje', money(m.costo_mensaje))}${nivel !== 'ad' ? kv('Presupuesto diario', e.presupuesto_diario ? money(e.presupuesto_diario) : '—') : ''}${nivel === 'campaign' ? kv('Objetivo', esc(OBJ[e.objetivo] || e.objetivo || '—')) : ''}${nivel === 'adset' ? kv('Optimización', esc(e.optimizacion || '—')) : ''}${nivel === 'campaign' ? kv('Inicio', f1(e.inicio)) : nivel === 'adset' ? kv('Inicio', f1(e.inicio)) : kv('Creado', f1(e.creado))}</div><button class="btn btn-sm" data-dia="${nivel}:${esc(e.id)}">Ver por día</button>`; };
  const pasa = e => filtro === 'todas' || (filtro === 'activas' ? e.estado === 'ACTIVE' : e.m.gasto > 0);
  const nodo = (nivel, e, hijos) => { const k = nivel + e.id;
    return `<details class="mt-n mt-${nivel}" data-k="${k}" ${abierto.has(k) ? 'open' : ''}><summary><span class="mt-nom">${esc(e.nombre)}</span>${tag(e.estado)}<span class="mt-g">${money(e.m.gasto)}</span></summary><div class="mt-cuerpo">${cuerpo(nivel, e)}${hijos}</div></details>`; };

  function html() {
    const A = datos, tl = ['activas', 'conGasto', 'todas'], dias = A.dias;
    const g = dias.reduce((s, d) => s + d.gasto, 0), c = dias.reduce((s, d) => s + d.compras, 0), v = dias.reduce((s, d) => s + d.valor_compras, 0), im = dias.reduce((s, d) => s + d.impresiones, 0), cl = dias.reduce((s, d) => s + d.clics_enlace, 0);
    const tile = (l, val, s = '') => `<div class="t"><small>${l}</small><b>${val}</b>${s ? `<em>${s}</em>` : ''}</div>`;
    const mx = Math.max(...dias.map(d => d.gasto), 0);
    const W = 600, H = 170, t = 10, b = 22, n = Math.max(dias.length, 1), bw = W / n;
    const chart = mx <= 0 ? '<div class="empty">Sin gasto en este periodo.</div>' : `<svg viewBox="0 0 ${W} ${H}" class="bars">${dias.map((d, i) => { const hh = (H - t - b) * d.gasto / mx; return `<rect x="${(i * bw + bw * .12).toFixed(1)}" y="${(H - b - hh).toFixed(1)}" width="${(bw * .76).toFixed(1)}" height="${hh.toFixed(1)}" rx="2" fill="#3b82f6"><title>${f1(d.fecha)}: ${money(d.gasto)} · ${d.compras} compras</title></rect>`; }).join('')}<line x1="0" x2="${W}" y1="${H - b}" y2="${H - b}" stroke="var(--line)"/>${dias.map((d, i) => i % Math.ceil(n / 8) === 0 ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${d.fecha.slice(8)}/${d.fecha.slice(5, 7)}</text>` : '').join('')}</svg>`;
    const camps = A.campanas.filter(pasa).sort((a, b) => b.m.gasto - a.m.gasto);
    const arbol = camps.length ? camps.map(ca => nodo('campaign', ca, ca.conjuntos.filter(pasa).sort((a, b) => b.m.gasto - a.m.gasto).map(se => nodo('adset', se, se.anuncios.filter(pasa).sort((a, b) => b.m.gasto - a.m.gasto).map(ad => nodo('ad', ad, '')).join(''))).join(''))).join('') : '<div class="empty">No hay campañas con este filtro en el periodo.</div>';
    const pk = S.config.periodo;
    return `${A.ejemplo ? '<div class="demo-bar"><span><b>Datos de ejemplo.</b> Así se verá tu cuenta cuando Meta esté conectado.</span></div>' : ''}
    <div class="acct"><i></i><span>Automático desde Meta</span><b>${esc(A.cuenta.nombre || META_CUENTA.nombre)}</b><code>${esc(A.cuenta.id)}</code>${A.cuenta.moneda ? `<code>${esc(A.cuenta.moneda)}</code>` : ''}</div>
    <div class="card card-row per"><div><small class="cap">Periodo</small><b>${f1(A.desde)} al ${f1(A.hasta)}</b></div><select id="per">${Object.entries(PERIODOS).map(([k, l]) => `<option value="${k}" ${k === pk ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="tiles">${tile('Importe gastado', money(g), `${dias.length} días`)}${tile('Compras', n0(c), 'según el píxel')}${tile('Costo por compra', c > 0 ? money(g / c) : '—')}${tile('ROAS de compras', g > 0 && v > 0 ? n2(v / g) + 'x' : '—', 'valor ÷ gasto')}${tile('CTR (enlace)', im > 0 ? n2(cl / im * 100) + '%' : '—')}${tile('CPM', im > 0 ? money(g / im * 1000) : '—')}</div>
    <div class="card"><h3>Gasto por día</h3><p class="sub">Cuenta completa en el periodo</p>${chart}</div>
    <div class="card"><h3>Campañas, conjuntos y anuncios</h3><p class="sub">Toca una campaña para ver sus conjuntos y anuncios. Las métricas son las de Meta.</p>
      <div class="chips" style="margin-top:6px">${[['activas', 'Activas'], ['conGasto', 'Con gasto'], ['todas', 'Todas']].map(([k, l]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="mt-arbol">${arbol}</div></div>`;
  }

  function dialogoDias(nivel, id) {
    openInfo('<h2>Detalle por día</h2><p class="sub" style="margin-top:-8px;color:var(--mut)">Cargando…</p>');
    const [d, h] = rangoActual();
    const listo = dias => { const t = dias.slice().reverse();
      const fila = x => `<tr><td>${f1(x.fecha)}</td><td class="num">${money(x.gasto)}</td><td class="num">${n0(x.impresiones)}</td><td class="num">${n0(x.clics_enlace)}</td><td class="num">${n2(x.ctr_enlace)}%</td><td class="num">${n0(x.compras)}</td><td class="num">${money(x.costo_compra)}</td><td class="num">${x.roas ? n2(x.roas) + 'x' : '—'}</td></tr>`;
      $('#dlgForm').innerHTML = `<h2>Detalle por día</h2><div class="tw"><table><thead><tr><th>Fecha</th><th class="num">Gasto</th><th class="num">Impres.</th><th class="num">Clics enlace</th><th class="num">CTR</th><th class="num">Compras</th><th class="num">Costo/compra</th><th class="num">ROAS</th></tr></thead><tbody>${t.length ? t.map(fila).join('') : '<tr><td colspan="8" class="empty">Sin datos en este periodo.</td></tr>'}</tbody></table></div><div class="dlg-foot"><button type="button" class="btn btn-pri" id="dlgCancel">Cerrar</button></div>`;
      $('#dlgCancel').onclick = () => $('#dlg').close(); };
    if (demo()) { const e = [].concat(...datos.campanas.map(c => [c, ...c.conjuntos.flatMap(s => [s, ...s.anuncios])])).find(x => x.id === id); return listo(e ? ejemploDias(e) : []); }
    traer({ desde: d, hasta: h, fila: nivel + ':' + id }).then(r => listo(r.dias)).catch(e => { $('#dlgForm').innerHTML = `<h2>Detalle por día</h2><p>${esc(e.message)}</p><div class="dlg-foot"><button type="button" class="btn btn-pri" id="dlgCancel">Cerrar</button></div>`; $('#dlgCancel').onclick = () => $('#dlg').close(); });
  }

  const pasos = `<div class="card"><h3>Conectar Meta</h3><p class="sub">Para que esta sección se llene sola hace falta un token de solo lectura de tu cuenta publicitaria.</p>
    <ol class="mt-pasos"><li>Entra a <b>business.facebook.com</b>, abre <b>Configuración del negocio</b> y ve a <b>Usuarios → Usuarios del sistema</b>.</li><li>Crea un usuario del sistema y, en <b>Asignar activos</b>, dale la cuenta <b>${esc(META_CUENTA.nombre)}</b> con permiso <b>Ver rendimiento</b>.</li><li>Pulsa <b>Generar token</b>, elige tu app de Meta y marca el permiso <b>ads_read</b>. Copia el token.</li><li>En Vercel, abre <b>Settings → Environment Variables</b>, crea <b>META_ACCESS_TOKEN</b> con ese valor y haz <b>Redeploy</b>.</li></ol></div>`;

  function mostrar(el) {
    if (!demo() && !(window.Nube && Nube.listo)) return false;
    const [d, h] = rangoActual();
    if (!datos || clave !== d + '|' + h) cargar();
    const cab = secH('meta', 'Meta Ads', 'Campañas, conjuntos y anuncios', '<button class="btn btn-pri" id="mact" style="white-space:nowrap">Actualizar</button>');
    let cuerpoH;
    if (datos && clave === d + '|' + h) cuerpoH = html();
    else if (cargando || (!error && !falta && (demo() || (window.Nube && Nube.activo)))) cuerpoH = '<div class="card"><div class="mt-carga"><i></i> Cargando desde Meta…</div></div>';
    else if (falta) cuerpoH = `<div class="card"><p class="mt-aviso">${esc(error)}</p></div>${pasos}`;
    else if (error) cuerpoH = `<div class="card"><p class="mt-aviso">${esc(error)}</p></div>`;
    else cuerpoH = `<div class="card"><p class="mt-aviso">Inicia sesión para ver las campañas de Meta.</p></div>`;
    el.innerHTML = cab + cuerpoH;
    const bt = $('#mact'); if (bt) bt.onclick = () => { datos = null; cargar(true); render(); };
    const per = $('#per'); if (per) per.onchange = e => { S.config.periodo = e.target.value; Store.save(); datos = null; render(); };
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; render(); });
    el.querySelectorAll('details.mt-n').forEach(x => x.addEventListener('toggle', () => { x.open ? abierto.add(x.dataset.k) : abierto.delete(x.dataset.k); }));
    el.querySelectorAll('[data-dia]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const [nv, id] = b.dataset.dia.split(':'); dialogoDias(nv, id); });
    return true;
  }

  addEventListener('dropox:listo', () => sync());
  return { vista: mostrar, sync };
})();
window.Meta = Meta;

// si la página abrió directo en Meta Ads, volver a dibujarla ahora que este módulo ya cargó
if (vista === "meta") render();
// si la sesión ya estaba lista antes de cargar este módulo, sincronizar ahora
if (window.Nube && Nube.activo) Meta.sync();
