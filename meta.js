'use strict';
/* DROPOX — sección Meta Ads automática: campañas, conjuntos y anuncios con las métricas de Meta, por fecha.
   Los datos llegan de /api/meta (la clave de Meta vive en Vercel) y solo se traen al pulsar Actualizar. Con DROPOX_DEMO se muestran datos de ejemplo. */
const Meta = (() => {
  const demo = () => !!window.DROPOX_DEMO && !(window.Nube && Nube.listo);
  const N = x => (isFinite(+x) ? +x : 0);
  const n0 = x => N(x).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  const n2 = x => N(x).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f1 = fecha => (fecha ? String(fecha).slice(8, 10) + '/' + String(fecha).slice(5, 7) + '/' + String(fecha).slice(0, 4) : '—');
  const money = x => (x === null || x === undefined ? '—' : fmt(x));
  const ESTADOS = { ACTIVE: ['Activa', 'ok'], PAUSED: ['Pausada', 'off'], CAMPAIGN_PAUSED: ['Campaña pausada', 'off'], ADSET_PAUSED: ['Conjunto pausado', 'off'], ARCHIVED: ['Archivada', 'off'], DELETED: ['Eliminada', 'off'], WITH_ISSUES: ['Con problemas', 'bad'], IN_PROCESS: ['En revisión', 'warn'], PENDING_REVIEW: ['En revisión', 'warn'], DISAPPROVED: ['Rechazada', 'bad'] };
  const OBJ = { OUTCOME_SALES: 'Ventas', OUTCOME_LEADS: 'Clientes potenciales', OUTCOME_ENGAGEMENT: 'Interacción', OUTCOME_TRAFFIC: 'Tráfico', OUTCOME_AWARENESS: 'Reconocimiento', OUTCOME_APP_PROMOTION: 'Promoción de app' };

  let detAbierto = false, datos = null, clave = '', hora = null, cargando = false, error = '', falta = false, filtro = 'activas', vistaM = 'tabla', nivelT = 'campaign', abierto = new Set();

  const claveActual = () => { const [d, h] = rangoActual(); return d + '|' + h; };
  // ───────── filtro de fechas estilo Meta ─────────
  const RANGOS = { hoy: ['Hoy'], ayer: ['Ayer'], hoyayer: ['Hoy y ayer'], '7d': ['Últimos 7 días'], '14d': ['Últimos 14 días'], '28d': ['Últimos 28 días'], '30d': ['Últimos 30 días'], semana: ['Esta semana'], semanap: ['La semana pasada'], mes: ['Este mes'], mesp: ['El mes pasado'], max: ['Máximo'], custom: ['Personalizado'] };
  const mr = () => { S.config = S.config || {}; return (S.config.metaRango = S.config.metaRango || { k: '30d', hoy: true }); };
  const mas = (f, n) => { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + n); return iso(x); };
  function calcRango(k, d, h, incluyeHoy) {
    const t = hoy(), y = mas(t, -1), dow = (new Date(t + 'T12:00:00').getDay() + 6) % 7, lunes = mas(t, -dow);
    const nd = { '7d': 7, '14d': 14, '28d': 28, '30d': 30 }[k];
    if (nd) { const fin = incluyeHoy ? t : y; return [mas(fin, -(nd - 1)), fin]; }
    if (k === 'hoy') return [t, t];
    if (k === 'ayer') return [y, y];
    if (k === 'hoyayer') return [y, t];
    if (k === 'semana') return [lunes, t];
    if (k === 'semanap') return [mas(lunes, -7), mas(lunes, -1)];
    if (k === 'mes') return [t.slice(0, 8) + '01', t];
    if (k === 'mesp') { const pm = mas(t.slice(0, 8) + '01', -1); return [pm.slice(0, 8) + '01', pm]; }
    if (k === 'max') return [mas(t, -89), t];
    return [d || mas(t, -29), h || t];
  }
  const rangoActual = () => { const c = mr(), [d, h] = calcRango(c.k, c.d, c.h, c.hoy !== false), t = hoy(); return [d > t ? t : d, h > t ? t : h]; };
  let fechaAbierta = false, borr = null;
  document.addEventListener('click', e => { if (fechaAbierta && vista === 'meta' && !e.target.closest('.mt-fecha')) { fechaAbierta = false; borr = null; render(); } });

  // ───────── datos importados (los trae Claude desde el conector de Facebook) ─────────
  function normalizarImport(txt) {
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('El texto no es válido. Pega exactamente lo que te dio Claude.'); }
    if (!j || !Array.isArray(j.campanas) || !j.campanas.length) throw new Error('No encontré campañas en ese texto.');
    const fecha = x => (/^\d{4}-\d{2}-\d{2}$/.test(String(x)) ? String(x) : '');
    const iso8 = x => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 25) : null);
    const txtc = (x, n) => String(x == null ? '' : x).slice(0, n);
    const MK = ['gasto', 'impresiones', 'alcance', 'frecuencia', 'clics', 'clics_enlace', 'ctr_enlace', 'cpc_enlace', 'ctr', 'cpc', 'cpm', 'compras', 'valor_compras', 'roas', 'mensajes', 'agregar_carrito', 'inicio_pago', 'visitas_pagina', 'interacciones', 'reacciones', 'comentarios', 'compartidos', 'guardados', 'conexiones_msj', 'clics_salientes', 'video_3s', 'thruplay', 'video_25', 'video_50', 'video_75', 'video_95', 'video_100', 'video_seg'];
    const nm = x => { x = x || {}; const o = {}; MK.forEach(k => { o[k] = N(x[k]); }); o.costo_compra = x.costo_compra == null ? null : N(x.costo_compra); o.costo_mensaje = x.costo_mensaje == null ? null : N(x.costo_mensaje); if (!o.roas) o.roas = null; return o; };
    const ne = e => ({ id: txtc(e.id, 40), nombre: txtc(e.nombre || 'Sin nombre', 200), estado: txtc(e.estado, 30).toUpperCase(), objetivo: e.objetivo ? txtc(e.objetivo, 40) : null, optimizacion: e.optimizacion ? txtc(e.optimizacion, 40) : null, presupuesto_diario: e.presupuesto_diario == null ? null : N(e.presupuesto_diario), inicio: iso8(e.inicio), creado: iso8(e.creado), m: nm(e.m), dias: (e.dias || []).slice(0, 200).map(z => ({ fecha: fecha(z.fecha), ...nm(z) })).filter(z => z.fecha) });
    const campanas = j.campanas.slice(0, 200).map(c => ({ ...ne(c), conjuntos: (c.conjuntos || []).slice(0, 200).map(s => ({ ...ne(s), anuncios: (s.anuncios || []).slice(0, 300).map(ne) })) }));
    const cu = j.cuenta || {};
    return { importado: true, fuente: txtc(j.fuente, 60), cuenta: { id: txtc(cu.id, 30), nombre: txtc(cu.nombre, 80), moneda: txtc(cu.moneda, 5) }, desde: fecha(j.desde), hasta: fecha(j.hasta), campanas, dias: (j.dias || []).slice(0, 400).map(d => ({ fecha: fecha(d.fecha), ...nm(d) })).filter(d => d.fecha), importado_en: new Date().toISOString() };
  }
  // archivo cifrado que deja Claude en datos/meta.enc.json: solo se abre con la clave que tú elegiste
  async function descifrar(obj, clave) {
    const b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']);
    const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b(obj.salt), iterations: obj.iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(obj.iv) }, k, b(obj.ct)));
  }
  // si la clave quedó recordada en este dispositivo, los datos nuevos de Claude se abren solos al entrar a Meta Ads
  let autoHecho = false, revisado = false, hayNuevo = false, fechaNueva = '';
  async function revisarRemoto() {
    if (revisado || demo()) return; revisado = true;
    try { const r = await fetch('datos/meta.enc.json', { cache: 'no-store' }); if (!r.ok) return; const o = await r.json(); fechaNueva = o.actualizado || ''; if (fechaNueva && fechaNueva !== S.metaAct) { hayNuevo = true; render(); } } catch (e) { /* sin archivo */ }
  }
  async function autoCargar() {
    if (autoHecho || demo()) return; autoHecho = true;
    let cl = ''; try { cl = localStorage.getItem('dropox.metaclave') || ''; } catch (e) { /* sin almacenamiento */ }
    if (!cl) return;
    try {
      const r = await fetch('datos/meta.enc.json', { cache: 'no-store' }); if (!r.ok) return;
      if (envivo) return; // los datos en vivo mandan sobre los importados
      const obj = await r.json(); const snap = normalizarImport(await descifrar(obj, cl));
      S.metaAct = obj.actualizado || ''; hayNuevo = false;
      if ((S.metaSnap || {}).hasta === snap.hasta && (S.metaSnap || {}).campanas && JSON.stringify((S.metaSnap.campanas || []).map(c => c.m && c.m.gasto)) === JSON.stringify(snap.campanas.map(c => c.m && c.m.gasto))) return;
      S.metaSnap = snap; datos = snap; clave = claveActual(); error = ''; falta = false; alimentarDashboard(snap); Store.save(); render();
    } catch (e) { /* clave distinta o archivo ausente: se queda con lo que hay */ }
  }
  function aplicarImport(txt) {
    const snap = normalizarImport(txt); S.metaSnap = snap; datos = snap; clave = claveActual(); error = ''; falta = false; alimentarDashboard(snap); Store.save(); toast('Datos importados'); render();
  }

  // los días importados de la cuenta correcta alimentan el Dashboard, sin borrar los de otras fechas
  function alimentarDashboard(snap) {
    if (String(snap.cuenta.id) !== META_CUENTA.id || !snap.dias.length) return;
    const por = {};
    (S.ads || []).filter(a => a.src === 'meta-api').forEach(a => { por[a.fecha] = { fecha: a.fecha, gasto: a.gasto, compras: a.pedidos, ventas: a.ventas }; });
    snap.dias.filter(z => z.gasto > 0).forEach(z => { por[z.fecha] = { fecha: z.fecha, gasto: z.gasto, compras: z.compras, ventas: z.valor_compras }; });
    window.DROPOX_META = { cuenta: { id: META_CUENTA.id }, dias: Object.values(por) };
    syncMeta();
  }

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

  // ───────── actualización EN VIVO ─────────
  // Si el token de Meta está en Vercel, la sección se actualiza sola al entrar y cada 5 minutos mientras la miras.
  // Si no está, se queda con los datos importados y explica cómo conectarlo.
  let envivo = false, vivoMsg = '', ultVivo = 0, timerVivo = null, tryVivo = false;
  async function vivo(silencioso) {
    if (cargando || demo() || !(window.Nube && Nube.activo)) return;
    const [d, h] = rangoActual(); cargando = true;
    try {
      const nuevo = await traer({ desde: d, hasta: h });
      if (String(nuevo.cuenta && nuevo.cuenta.id) !== META_CUENTA.id) throw new Error(`La cuenta conectada (${(nuevo.cuenta && (nuevo.cuenta.nombre || nuevo.cuenta.id)) || '?'}) no es ${META_CUENTA.nombre}.`);
      datos = nuevo; clave = d + '|' + h; hora = new Date(); envivo = true; vivoMsg = ''; error = ''; falta = false;
      { const len = Math.round((Date.parse(h) - Date.parse(d)) / 864e5) + 1, ph = mas(d, -1), pd = mas(ph, -(len - 1)); prevR = [pd, ph]; prevT = null;
        traer({ desde: pd, hasta: ph, solo: 'total' }).then(x => { prevT = x.total || null; if (vista === 'meta') render(); }).catch(() => { prevT = null; }); }
      sync();
    } catch (e) { envivo = false; vivoMsg = e.falta ? 'sin_token' : (e.message || 'No se pudo leer Meta.'); if (e.falta && !datos && !S.metaSnap) { falta = true; error = e.message; } }
    cargando = false; ultVivo = Date.now();
    if (vista === 'meta') render();
  }
  function iniciarVivo() {
    if (tryVivo || demo()) return; tryVivo = true;
    vivo(true);
    timerVivo = setInterval(() => { if (vista === 'meta' && !document.hidden && envivo) vivo(true); }, 300000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && vista === 'meta' && envivo && Date.now() - ultVivo > 120000) vivo(true); });
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
      clave = k; hora = new Date();
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

  // ───────── tablas ─────────
  const HEAD = ['Gasto', 'Impresiones', 'Alcance', 'Frecuencia', 'Clics enlace', 'CTR enlace', 'CPC enlace', 'CPM', 'Compras', 'Costo/compra', 'ROAS', 'Mensajes', 'Costo/mensaje'];
  const celdas = m => [money(m.gasto), n0(m.impresiones), n0(m.alcance), n2(m.frecuencia), n0(m.clics_enlace), n2(m.ctr_enlace) + '%', m.cpc_enlace ? money(m.cpc_enlace) : '—', money(m.cpm), n0(m.compras), money(m.costo_compra), m.roas ? n2(m.roas) + 'x' : '—', n0(m.mensajes), money(m.costo_mensaje)];
  const totales = rows => { const t = { gasto: 0, impresiones: 0, clics_enlace: 0, compras: 0, valor_compras: 0, mensajes: 0 }; rows.forEach(r => Object.keys(t).forEach(k => { t[k] += N(r.m[k]); })); const g = t.gasto;
    return [money(g), n0(t.impresiones), '—', '—', n0(t.clics_enlace), t.impresiones ? n2(t.clics_enlace / t.impresiones * 100) + '%' : '—', t.clics_enlace ? money(g / t.clics_enlace) : '—', t.impresiones ? money(g / t.impresiones * 1000) : '—', n0(t.compras), t.compras ? money(g / t.compras) : '—', g > 0 && t.valor_compras > 0 ? n2(t.valor_compras / g) + 'x' : '—', n0(t.mensajes), t.mensajes ? money(g / t.mensajes) : '—']; };
  // ───────── indicadores con color según tus metas y cambio contra el periodo anterior ─────────
  const BENCH0 = { costo_res: { d: -1, b: 0.8, m: 1.5, n: 'Costo por resultado' }, costo_compra: { d: -1, b: 8, m: 15, n: 'Costo por compra' }, roas: { d: 1, b: 3, m: 1.5, n: 'ROAS de compras' }, ctr_enlace: { d: 1, b: 1.5, m: 0.8, n: 'CTR (porcentaje de clics en el enlace)' },
    cpc_enlace: { d: -1, b: 0.4, m: 1, n: 'CPC (costo por clic en el enlace)' }, cpm: { d: -1, b: 6, m: 15, n: 'CPM (costo por mil impresiones)' }, frecuencia: { d: -1, b: 1.8, m: 3, n: 'Frecuencia' }, costo_visita: { d: -1, b: 0.5, m: 1.2, n: 'Costo por visita a la página de destino' } };
  const bench = k => ({ ...BENCH0[k], ...((S.config.metaMetas || {})[k] || {}) });
  const calidad = (k, v) => { if (v == null || !isFinite(v) || !BENCH0[k]) return ''; const B = bench(k); if (B.d < 0) return v <= B.b ? 'bien' : v >= B.m ? 'mal' : 'medio'; return v >= B.b ? 'bien' : v <= B.m ? 'mal' : 'medio'; };
  let prevT = null, prevR = null;
  // [clave, título, valor(T), formato, dirección (1 = más es mejor, -1 = menos es mejor, 0 = neutro), solo si hay dato]
  const KPIS = [
    ['gasto', 'Importe gastado', T => T.gasto, v => money(v), 0, false],
    ['resultados', 'Resultados', T => resDe({ m: T }).n, v => n0(v), 1, false],
    ['costo_res', 'Costo por resultado', T => { const x = resDe({ m: T }).n; return x ? T.gasto / x : null; }, v => mon(v), -1, false],
    ['mensajes', 'Conversaciones de mensajes iniciadas', T => N(T.mensajes), v => n0(v), 1, false],
    ['compras', 'Compras en Meta', T => N(T.compras), v => n0(v), 1, false],
    ['costo_compra', 'Costo por compra en Meta (CPA)', T => (N(T.compras) ? T.gasto / T.compras : null), v => mon(v), -1, false],
    ['alcance', 'Alcance', T => T.alcance, v => n0(v), 1, false],
    ['impresiones', 'Impresiones', T => T.impresiones, v => n0(v), 1, false],
    ['frecuencia', 'Frecuencia', T => (T.alcance ? T.impresiones / T.alcance : null), v => (v == null ? '—' : n2(v)), -1, false],
    ['cpm', 'CPM (costo por mil impresiones)', T => (T.impresiones ? T.gasto / T.impresiones * 1000 : null), v => mon(v), -1, false],
    ['clics_enlace', 'Clics en el enlace', T => N(T.clics_enlace), v => n0(v), 1, false],
    ['ctr_enlace', 'CTR (porcentaje de clics en el enlace)', T => (T.impresiones ? N(T.clics_enlace) / T.impresiones * 100 : null), v => pc2(v), 1, false],
    ['cpc_enlace', 'CPC (costo por clic en el enlace)', T => (N(T.clics_enlace) ? T.gasto / T.clics_enlace : null), v => mon(v), -1, false],
    ['roas', 'ROAS de compras (retorno de la inversión publicitaria)', T => (T.gasto > 0 && N(T.valor_compras) > 0 ? T.valor_compras / T.gasto : null), v => (v ? n2(v) + 'x' : '—'), 1, true],
    ['visitas_pagina', 'Visitas a la página de destino', T => N(T.visitas_pagina), v => n0(v), 1, true],
    ['costo_visita', 'Costo por visita a la página de destino', T => (N(T.visitas_pagina) ? T.gasto / T.visitas_pagina : null), v => mon(v), -1, true],
    ['agregar_carrito', 'Agregados al carrito', T => N(T.agregar_carrito), v => n0(v), 1, true],
    ['video_3s', 'Reproducciones de video de 3 segundos', T => N(T.video_3s), v => n0(v), 1, true],
    ['thruplay', 'Reproducciones de video ThruPlay', T => N(T.thruplay), v => n0(v), 1, true],
  ];
  const cambio = (dir, v, p) => {
    if (v == null || p == null || !isFinite(v) || !isFinite(p) || p === 0) return '';
    const pc = (v - p) / Math.abs(p) * 100; if (Math.abs(pc) < 1) return '<span class="dl igual">= igual que antes</span>';
    const mejor = dir === 0 ? '' : (dir * pc > 0 ? 'mejor' : 'peor');
    return `<span class="dl ${mejor}">${pc > 0 ? '▲' : '▼'} ${Math.abs(pc) >= 100 ? Math.round(Math.abs(pc)) : Math.abs(pc).toFixed(0)}% vs periodo anterior</span>`;
  };
  function kpiHtml(A, dias) {
    // totales de la cuenta como los da Meta (con alcance exacto); si no vienen, se suman las campañas
    const T = A.total ? { ...A.total } : sumarM(A.campanas.map(c => c.m)); if (!A.total) T.alcance = A.campanas.reduce((a, c) => a + N(c.m.alcance), 0);
    let P = prevT; if (!P && A.importado && prevR) { const pd = (datos.dias || []).filter(z => z.fecha >= prevR[0] && z.fecha <= prevR[1]); P = pd.length ? sumarM(pd) : null; }
    if (P) P.alcance = P.alcance;
    const tipoRes = resDe({ m: T }).t, esRes = k => (k === 'mensajes' ? /mensajes/i.test(tipoRes) : /compras/i.test(tipoRes));
    const ts = KPIS.filter(([k, , g, , , opc]) => { if (!opc) return true; if (typeof opc === 'string') { const q = opc.split(':')[1]; return !esRes(q) && (g(T) || 0) > 0; } return (g(T) || 0) > 0; }).map(([k, l, g, f, dir]) => {
      const v = g(T), q = calidad(k, v), pv = P ? g(P) : null;
      return `<div class="t mt-k ${q ? 'q-' + q : ''}"><small>${l}</small><b>${f(v, { m: T })}</b>${k === 'resultados' && tipoRes ? `<small class="mt-tipo">${esc(tipoRes)}</small>` : ''}${cambio(dir, v, pv) || '<span class="dl">&nbsp;</span>'}</div>`;
    }).join('');
    const pr = prevR ? `${f1(prevR[0])} – ${f1(prevR[1])}` : '';
    return `<div class="tiles mt-kpis">${ts}</div><p class="mt-leyenda"><span class="q-bien">● Bien</span><span class="q-medio">● Regular</span><span class="q-mal">● Mejorar</span>${pr ? `<span>Cambio contra ${pr}</span>` : ''}<button type="button" class="btn btn-sm" id="mmetas">🎯 Ajustar metas</button></p>`;
  }
  function ventanaMetas() {
    const m = S.config.metaMetas || {};
    const campos = Object.entries(BENCH0).flatMap(([k, B]) => { const x = bench(k); return [{ k: k + '__b', l: `${B.n}: ${B.d < 0 ? 'bien hasta' : 'bien desde'}`, t: 'number', def: x.b }, { k: k + '__m', l: `${B.n}: ${B.d < 0 ? 'mal desde' : 'mal hasta'}`, t: 'number', def: x.m }]; });
    openForm('Tus metas (para los colores)', campos, {}, v => { const o = { ...m }; Object.keys(BENCH0).forEach(k => { const b = parseFloat(v[k + '__b']), mm = parseFloat(v[k + '__m']); if (isFinite(b) && isFinite(mm)) o[k] = { b, m: mm }; }); S.config.metaMetas = o; });
  }

  // ───────── tabla estilo Administrador de anuncios de Meta ─────────
  const resDe = e => { const m = e.m; if (m.mensajes > 0) return { n: m.mensajes, t: 'Conversaciones de mensajes iniciadas' }; if (m.compras > 0) return { n: m.compras, t: 'Compras' }; if (m.clics_enlace > 0) return { n: m.clics_enlace, t: 'Clics en el enlace' }; return { n: 0, t: '' }; };
  const pc2 = v => (v === null || v === undefined || !isFinite(v) ? '—' : n2(v) + '%');
  const mv = (e, k) => N(e.m[k]);
  const div = (a, b) => (b > 0 ? a / b : null);
  const mon = v => (v == null || !isFinite(v) ? '—' : money(v));
  const ent = v => (v ? n0(v) : '—');
  const COLM = {
    resultados: { l: 'Resultados', g: e => resDe(e).n, f: (v, e) => (v ? `<b>${n0(v)}</b><small>${esc(resDe(e).t)}</small>` : '—') },
    costo_res: { l: 'Costo por resultado', g: e => { const r = resDe(e).n; return r ? e.m.gasto / r : null; }, f: mon },
    gasto: { l: 'Importe gastado', g: e => e.m.gasto, f: v => money(v) },
    alcance: { l: 'Alcance', g: e => e.m.alcance, f: v => n0(v) },
    impresiones: { l: 'Impresiones', g: e => e.m.impresiones, f: v => n0(v) },
    frecuencia: { l: 'Frecuencia', g: e => e.m.frecuencia, f: v => n2(v) },
    cpm: { l: 'CPM (costo por mil impresiones)', g: e => e.m.cpm, f: v => money(v) },
    // compras en Meta (píxel)
    compras: { l: 'Compras', g: e => mv(e, 'compras'), f: ent },
    costo_compra: { l: 'Costo por compra', g: e => { const c = mv(e, 'compras'); return c ? e.m.gasto / c : null; }, f: mon },
    valor_compras: { l: 'Valor de conversión de compras', g: e => mv(e, 'valor_compras'), f: v => (v ? money(v) : '—') },
    roas: { l: 'ROAS de compras (retorno de la inversión publicitaria)', g: e => { const g = e.m.gasto, v = mv(e, 'valor_compras'); return g > 0 && v > 0 ? v / g : null; }, f: v => (v ? n2(v) + 'x' : '—') },
    // WhatsApp / mensajes
    mensajes: { l: 'Conversaciones de mensajes iniciadas', g: e => mv(e, 'mensajes'), f: ent },
    costo_mensaje: { l: 'Costo por conversación de mensajes iniciada', g: e => { const c = mv(e, 'mensajes'); return c ? e.m.gasto / c : null; }, f: mon },
    // clics
    clics_enlace: { l: 'Clics en el enlace', g: e => mv(e, 'clics_enlace'), f: v => n0(v) },
    ctr_enlace: { l: 'CTR (porcentaje de clics en el enlace)', g: e => mv(e, 'ctr_enlace'), f: pc2 },
    cpc_enlace: { l: 'CPC (costo por clic en el enlace)', g: e => mv(e, 'cpc_enlace'), f: v => (v ? money(v) : '—') },
    clics: { l: 'Clics (todos)', g: e => e.m.clics, f: v => n0(v) },
    ctr: { l: 'CTR (todos)', g: e => e.m.ctr, f: pc2 },
    cpc: { l: 'CPC (todos)', g: e => e.m.cpc, f: v => (v ? money(v) : '—') },
    clics_salientes: { l: 'Clics salientes', g: e => mv(e, 'clics_salientes'), f: ent },
    // embudo de la web
    visitas_pagina: { l: 'Visitas a la página de destino', g: e => mv(e, 'visitas_pagina'), f: ent },
    costo_visita: { l: 'Costo por visita a la página de destino', g: e => div(e.m.gasto, mv(e, 'visitas_pagina')), f: mon },
    agregar_carrito: { l: 'Agregados al carrito', g: e => mv(e, 'agregar_carrito'), f: ent },
    costo_carrito: { l: 'Costo por agregado al carrito', g: e => div(e.m.gasto, mv(e, 'agregar_carrito')), f: mon },
    inicio_pago: { l: 'Pagos iniciados', g: e => mv(e, 'inicio_pago'), f: ent },
    costo_pago: { l: 'Costo por pago iniciado', g: e => div(e.m.gasto, mv(e, 'inicio_pago')), f: mon },
    // video
    video_3s: { l: 'Reproducciones de video de 3 segundos', g: e => mv(e, 'video_3s'), f: ent },
    tasa_gancho: { l: 'Tasa de gancho (cálculo propio, no es de Meta)', g: e => { const x = div(mv(e, 'video_3s'), mv(e, 'impresiones')); return x == null ? null : x * 100; }, f: pc2 },
    thruplay: { l: 'Reproducciones de video ThruPlay', g: e => mv(e, 'thruplay'), f: ent },
    costo_thruplay: { l: 'Costo por reproducción de video ThruPlay', g: e => div(e.m.gasto, mv(e, 'thruplay')), f: mon },
    tasa_retencion: { l: 'Tasa de retención (cálculo propio, no es de Meta)', g: e => { const x = div(mv(e, 'thruplay'), mv(e, 'video_3s')); return x == null ? null : x * 100; }, f: pc2 },
    video_25: { l: 'Reproducciones de video hasta el 25%', g: e => mv(e, 'video_25'), f: ent },
    video_50: { l: 'Reproducciones de video hasta el 50%', g: e => mv(e, 'video_50'), f: ent },
    video_75: { l: 'Reproducciones de video hasta el 75%', g: e => mv(e, 'video_75'), f: ent },
    video_95: { l: 'Reproducciones de video hasta el 95%', g: e => mv(e, 'video_95'), f: ent },
    video_100: { l: 'Reproducciones de video hasta el 100%', g: e => mv(e, 'video_100'), f: ent },
    video_seg: { l: 'Tiempo promedio de reproducción de video', g: e => mv(e, 'video_seg'), f: v => (v ? n2(v) + ' s' : '—') },
    // interacción
    interacciones: { l: 'Interacciones con la publicación', g: e => mv(e, 'interacciones'), f: ent },
    reacciones: { l: 'Reacciones a la publicación', g: e => mv(e, 'reacciones'), f: ent },
    comentarios: { l: 'Comentarios de la publicación', g: e => mv(e, 'comentarios'), f: ent },
    compartidos: { l: 'Veces que se compartió la publicación', g: e => mv(e, 'compartidos'), f: ent },
    guardados: { l: 'Veces que se guardó la publicación', g: e => mv(e, 'guardados'), f: ent },
  };
  const PRESET = {
    rendimiento: ['Rendimiento', ['resultados', 'costo_res', 'gasto', 'alcance', 'impresiones', 'cpm', 'clics_enlace', 'ctr_enlace', 'cpc_enlace']],
    entrega: ['Entrega', ['gasto', 'alcance', 'impresiones', 'frecuencia', 'cpm']],
    clics: ['Clics', ['clics_enlace', 'ctr_enlace', 'cpc_enlace', 'clics', 'ctr', 'cpc', 'clics_salientes']],
    mensajes: ['Mensajes', ['mensajes', 'costo_mensaje', 'gasto', 'alcance', 'impresiones']],
    compras: ['Compras', ['compras', 'costo_compra', 'valor_compras', 'roas', 'gasto']],
    web: ['Eventos de la página web', ['clics_enlace', 'visitas_pagina', 'costo_visita', 'agregar_carrito', 'costo_carrito', 'inicio_pago', 'costo_pago', 'compras', 'costo_compra']],
    video: ['Reproducciones de video', ['gasto', 'impresiones', 'video_3s', 'thruplay', 'costo_thruplay', 'video_25', 'video_50', 'video_75', 'video_95', 'video_100', 'video_seg', 'tasa_gancho', 'tasa_retencion']],
    interaccion: ['Interacciones', ['interacciones', 'reacciones', 'comentarios', 'compartidos', 'guardados']],
    todas: ['Todas las columnas', Object.keys(COLM)],
  };
  let propias = null; try { propias = JSON.parse(localStorage.getItem('dropox.metaCols') || 'null'); } catch (e) { propias = null; }
  if (Array.isArray(propias) && propias.length) PRESET.personalizado = ['Personalizado', propias.filter(k => COLM[k])];
  let preset = 'rendimiento', orden = { k: 'gasto', d: -1 }, busq = '', selFilas = new Set();
  try { preset = localStorage.getItem('dropox.metaPreset') || 'rendimiento'; if (!PRESET[preset]) preset = 'rendimiento'; } catch (e) { /* sin almacenamiento */ }
  function guardarColumnas(ks) { propias = ks; PRESET.personalizado = ['Personalizado', ks]; preset = 'personalizado'; try { localStorage.setItem('dropox.metaCols', JSON.stringify(ks)); localStorage.setItem('dropox.metaPreset', preset); } catch (x) { /* sin almacenamiento */ } }
  // ventana para elegir Y ORDENAR las columnas (casilla = mostrar, flechas = posición)
  function ventanaColumnas() {
    const act = PRESET[preset][1], lista = [...act, ...Object.keys(COLM).filter(k => !act.includes(k))], on = new Set(act);
    const f = $('#dlgForm'), d = $('#dlg');
    const pinta = () => {
      f.innerHTML = `<h2>Columnas: elige y ordena</h2><p class="note" style="margin:-6px 0 10px">Marca las que quieres ver y usa ▲ ▼ para cambiar su posición. También puedes arrastrar los títulos en la tabla.</p>
      <div class="mt-orden">${lista.map((k, i) => `<div class="mt-ol ${on.has(k) ? 'on' : ''}"><label><input type="checkbox" data-k="${k}" ${on.has(k) ? 'checked' : ''}> ${esc(COLM[k].l)}</label><span><button type="button" data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" data-dn="${i}" ${i === lista.length - 1 ? 'disabled' : ''}>▼</button></span></div>`).join('')}</div>
      <div class="dlg-foot"><button type="button" class="btn" id="mcCan">Cancelar</button><button type="button" class="btn btn-pri" id="mcOk">Guardar columnas</button></div>`;
      f.querySelectorAll('[data-k]').forEach(c => c.onchange = () => { if (c.checked) on.add(c.dataset.k); else on.delete(c.dataset.k); c.closest('.mt-ol').classList.toggle('on', c.checked); });
      const mueve = (i, j) => { [lista[i], lista[j]] = [lista[j], lista[i]]; pinta(); };
      f.querySelectorAll('[data-up]').forEach(b => b.onclick = () => mueve(+b.dataset.up, +b.dataset.up - 1));
      f.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => mueve(+b.dataset.dn, +b.dataset.dn + 1));
      f.querySelector('#mcCan').onclick = () => d.close();
      f.querySelector('#mcOk').onclick = () => { const ks = lista.filter(k => on.has(k)); if (!ks.length) return toast('Marca al menos una columna'); guardarColumnas(ks); d.close(); render(); };
    };
    f.onsubmit = e => e.preventDefault(); pinta(); d.showModal();
  }
  const filasNivel = A => {
    const rows = [];
    A.campanas.forEach(c => { if (nivelT === 'campaign') rows.push({ ...c, padre: '' }); c.conjuntos.forEach(s => { if (nivelT === 'adset') rows.push({ ...s, padre: c.nombre }); s.anuncios.forEach(a => { if (nivelT === 'ad') rows.push({ ...a, padre: s.nombre }); }); }); });
    return rows.filter(pasa).filter(r => !busq || (r.nombre + ' ' + r.padre).toLowerCase().includes(busq));
  };
  const valOrden = (r, k) => { if (k === 'nombre') return r.nombre.toLowerCase(); if (k === 'estado') return r.estado === 'ACTIVE' ? 1 : 0; if (k === 'presupuesto') return N(r.presupuesto_diario); const c = COLM[k]; const v = c ? c.g(r) : 0; return v == null ? -1 : v; };
  function tablaNivel(A) {
    const nombre = { campaign: 'Campañas', adset: 'Conjuntos de anuncios', ad: 'Anuncios' }[nivelT];
    const todas = filasNivel(A), cols = PRESET[preset][1];
    const rows = todas.slice().sort((a, b) => { const x = valOrden(a, orden.k), y = valOrden(b, orden.k); return (x < y ? -1 : x > y ? 1 : 0) * orden.d; });
    const cnt = k => { let n = 0; A.campanas.forEach(c => { if (k === 'campaign') n++; c.conjuntos.forEach(s => { if (k === 'adset') n++; if (k === 'ad') n += s.anuncios.length; }); }); return n; };
    const tabs = [['campaign', 'Campañas'], ['adset', 'Conjuntos de anuncios'], ['ad', 'Anuncios']].map(([k, l]) => `<button class="mt-nv ${nivelT === k ? 'on' : ''}" data-nt="${k}">${l}<i>${cnt(k)}</i></button>`).join('');
    const barra = `<div class="mt-bar"><input class="search" id="mbq" type="search" placeholder="Buscar por nombre…" value="${esc(busq)}"><label class="mt-cols">Columnas: <select id="mcols">${Object.entries(PRESET).map(([k, [l]]) => `<option value="${k}" ${k === preset ? 'selected' : ''}>${l}</option>`).join('')}<option value="__custom">✎ Personalizar columnas…</option></select></label><button class="btn btn-sm" id="mexp">⬇ Exportar CSV</button></div>`;
    if (!rows.length) return `<div class="mt-niv">${tabs}</div>${barra}<div class="empty">No hay ${nombre.toLowerCase()} con este filtro en el periodo.</div>`;
    const sel = rows.filter(r => selFilas.has(r.id)), base = sel.length ? sel : rows;
    const sumM = sumarM(base.map(r => r.m)), tot = { nombre: '', m: sumM };
    const idEtiq = { campaign: 'ID de campaña', adset: 'ID de conjunto', ad: 'ID de anuncio' }[nivelT];
    const flecha = k => (orden.k === k ? (orden.d > 0 ? ' ▲' : ' ▼') : '');
    const th = (k, l, cls, mover) => `<th class="${cls || 'num'} mt-so" data-so="${k}" ${mover ? `draggable="true" data-ck="${k}" title="Arrastra para cambiar de posición"` : ''}>${l}${flecha(k)}</th>`;
    const celda = (k, r) => { const c = COLM[k]; return `<td class="num">${c.f(c.g(r), r)}</td>`; };
    const celdaTot = k => { if (k === 'alcance' || k === 'frecuencia') return '<td class="num">—</td>'; const c = COLM[k]; return `<td class="num"><b>${c.f(c.g(tot), tot)}</b></td>`; };
    return `<div class="mt-niv">${tabs}</div>${barra}<div class="tw mt-ads"><table class="mt-tabla mt-am"><thead><tr>
      <th class="mt-nm mt-so" data-so="nombre"><div class="mt-nw"><label class="mt-ck"><input type="checkbox" id="mselall" ${sel.length === rows.length ? 'checked' : ''}></label><span>${nombre.replace(/s$/, '')}${flecha('nombre')}</span></div></th>
      ${th('estado', 'Entrega', 'mt-ent')}<th class="mt-idh">${idEtiq}</th>${th('presupuesto', 'Presupuesto')}${cols.map(k => th(k, COLM[k].l, '', true)).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr class="${selFilas.has(r.id) ? 'sel' : ''}"><td class="mt-nm"><div class="mt-nw"><label class="mt-ck"><input type="checkbox" data-sel="${esc(r.id)}" ${selFilas.has(r.id) ? 'checked' : ''}></label><span class="mt-sw ${r.estado === 'ACTIVE' ? 'on' : ''}" title="${r.estado === 'ACTIVE' ? 'Activada' : 'Desactivada'} (se cambia en Meta)"></span><span class="mt-nt"><b>${esc(r.nombre)}</b>${r.padre ? `<small class="mt-padre">${esc(r.padre)}</small>` : ''}</span></div></td><td class="mt-ent">${tag(r.estado)}</td><td class="mt-id"><code data-copiar="${esc(r.id)}" title="Toca para copiar">${esc(r.id)}</code></td><td class="num">${r.presupuesto_diario ? `${money(r.presupuesto_diario)}<small>Diario</small>` : '<small>Usa presupuesto de la campaña</small>'}</td>${cols.map(k => celda(k, r)).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td class="mt-nm"><b>${sel.length ? `Resultados de ${sel.length} seleccionad${sel.length === 1 ? 'a' : 'as'}` : `Resultados de ${rows.length} ${nombre.toLowerCase()}`}</b><small class="mt-padre">Excluye las eliminadas</small></td><td></td><td></td><td></td>${cols.map(celdaTot).join('')}</tr></tfoot></table></div>`;
  }
  function exportarTabla() {
    const A = filtrado(datos), rows = filasNivel(A).sort((a, b) => valOrden(b, orden.k) - valOrden(a, orden.k)), cols = PRESET[preset][1];
    const num = v => (v == null ? '' : (typeof v === 'number' ? String(Math.round(v * 100) / 100) : v));
    const csv = [['Nombre', 'ID', 'Entrega', 'Presupuesto diario', ...cols.map(k => COLM[k].l)], ...rows.map(r => [r.nombre, r.id, (ESTADOS[r.estado] || [r.estado])[0], r.presupuesto_diario || '', ...cols.map(k => num(COLM[k].g(r)))])].map(f => f.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'meta-ads-' + nivelT + '.csv'; a.click(); URL.revokeObjectURL(a.href);
  }
  function tablaDias(A) {
    const dias = A.dias.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (!dias.length) return '<div class="empty">Sin datos por día.</div>';
    return `<div class="tw"><table class="mt-tabla"><thead><tr><th>Fecha</th>${HEAD.map(h => `<th class="num">${h}</th>`).join('')}</tr></thead><tbody>${dias.map(d => `<tr><td><b>${f1(d.fecha)}</b></td>${celdas(d).map(v => `<td class="num">${v}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><td><b>Total</b></td>${totales(dias.map(d => ({ m: d }))).map(v => `<td class="num"><b>${v}</b></td>`).join('')}</tr></tfoot></table></div>`;
  }

  // ───────── filtro por fechas (sobre los datos importados, usando el detalle por día de cada campaña, conjunto y anuncio) ─────────
  function sumarM(ds) {
    const t = k => ds.reduce((a, d) => a + N(d[k]), 0), g = t('gasto'), imp = t('impresiones'), al = t('alcance'), cl = t('clics'), lk = t('clics_enlace'), ms = t('mensajes'), co = t('compras'), vc = t('valor_compras');
    return { gasto: g, impresiones: imp, alcance: al, frecuencia: al ? imp / al : 0, clics: cl, clics_enlace: lk, ctr_enlace: imp ? lk / imp * 100 : 0, cpc_enlace: lk ? g / lk : 0, ctr: imp ? cl / imp * 100 : 0, cpc: cl ? g / cl : 0, cpm: imp ? g / imp * 1000 : 0,
      compras: co, valor_compras: vc, roas: g && vc ? vc / g : null, costo_compra: co ? g / co : null, mensajes: ms, costo_mensaje: ms ? g / ms : null,
      ...Object.fromEntries(['agregar_carrito', 'inicio_pago', 'visitas_pagina', 'interacciones', 'reacciones', 'comentarios', 'compartidos', 'guardados', 'conexiones_msj', 'clics_salientes', 'video_3s', 'thruplay', 'video_25', 'video_50', 'video_75', 'video_95', 'video_100'].map(k => [k, t(k)])), video_seg: 0 };
  }
  const rangoFechas = A => { const [d0, h0] = rangoActual(); return [d0 < A.desde ? A.desde : d0, h0 > A.hasta ? A.hasta : h0]; };
  function filtrado(A) {
    if (!A || !A.importado) return A;
    const [d0, h0] = rangoActual();
    if (d0 <= A.desde && h0 >= A.hasta) return A;
    const en = z => z.fecha >= d0 && z.fecha <= h0;
    const rec = e => (e.dias && e.dias.length ? { ...e, dias: e.dias.filter(en), m: sumarM(e.dias.filter(en)) } : e);
    return { ...A, desde: d0, hasta: h0, recortado: true, dias: A.dias.filter(en),
      campanas: A.campanas.map(ca => ({ ...rec(ca), conjuntos: ca.conjuntos.map(se => ({ ...rec(se), anuncios: se.anuncios.map(rec) })) })) };
  }
  const sumaDias = (A, delta) => { const x = new Date(A + 'T12:00:00'); x.setDate(x.getDate() + delta); return iso(x); };

  function html() {
    const A = filtrado(datos), dias = A.dias, [rd0, rh0] = rangoActual(), [d0, h0] = [rd0, rh0], otro = clave !== d0 + '|' + h0 && !A.ejemplo && !A.importado;
    const g = dias.reduce((s, d) => s + d.gasto, 0), c = dias.reduce((s, d) => s + d.compras, 0), v = dias.reduce((s, d) => s + d.valor_compras, 0), im = dias.reduce((s, d) => s + d.impresiones, 0), cl = dias.reduce((s, d) => s + d.clics_enlace, 0);
    const tile = (l, val, s = '') => `<div class="t"><small>${l}</small><b>${val}</b>${s ? `<em>${s}</em>` : ''}</div>`;
    const mx = Math.max(...dias.map(d => d.gasto), 0);
    const W = 600, H = 170, t = 10, b = 22, n = Math.max(dias.length, 1), bw = W / n;
    const chart = mx <= 0 ? '<div class="empty">Sin gasto en este periodo.</div>' : `<svg viewBox="0 0 ${W} ${H}" class="bars">${dias.map((d, i) => { const hh = (H - t - b) * d.gasto / mx; return `<rect x="${(i * bw + bw * .12).toFixed(1)}" y="${(H - b - hh).toFixed(1)}" width="${(bw * .76).toFixed(1)}" height="${hh.toFixed(1)}" rx="2" fill="#3b82f6"><title>${f1(d.fecha)}: ${money(d.gasto)} · ${d.compras} compras</title></rect>`; }).join('')}<line x1="0" x2="${W}" y1="${H - b}" y2="${H - b}" stroke="var(--line)"/>${dias.map((d, i) => i % Math.ceil(n / 8) === 0 ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${d.fecha.slice(8)}/${d.fecha.slice(5, 7)}</text>` : '').join('')}</svg>`;
    const camps = A.campanas.filter(pasa).sort((a, b) => b.m.gasto - a.m.gasto);
    const arbol = camps.length ? camps.map(ca => nodo('campaign', ca, ca.conjuntos.filter(pasa).sort((a, b) => b.m.gasto - a.m.gasto).map(se => nodo('adset', se, se.anuncios.filter(pasa).sort((a, b) => b.m.gasto - a.m.gasto).map(ad => nodo('ad', ad, '')).join(''))).join(''))).join('') : '<div class="empty">No hay campañas con este filtro en el periodo.</div>';
    if (!envivo && A.importado) { const len = Math.round((Date.parse(rh0) - Date.parse(rd0)) / 864e5) + 1, ph = mas(rd0, -1); prevR = [mas(ph, -(len - 1)), ph]; prevT = null; }
    const [rd, rh] = rangoActual(), cr = mr(), bb = borr || { ...cr };
    const [bd, bh] = calcRango(bb.k, bb.d, bb.h, bb.hoy !== false);
    const panel = `<div class="mt-fp"><div class="mt-fl">${Object.entries(RANGOS).map(([k, [l]]) => `<label class="${bb.k === k ? 'on' : ''}"><input type="radio" name="mr" value="${k}" ${bb.k === k ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="mt-fr"><div class="mt-fd"><label>Desde<input type="date" id="mrd" value="${bd}" max="${hoy()}"></label><label>Hasta<input type="date" id="mrh" value="${bh}" max="${hoy()}"></label></div>
      <label class="chk"><input type="checkbox" id="mrhoy" ${bb.hoy !== false ? 'checked' : ''}> Incluir hoy en los «Últimos N días»</label>
      <p class="note" style="margin:8px 0">Se muestran los datos del <b>${f1(bd)}</b> al <b>${f1(bh)}</b>.</p>
      <div class="mt-fa"><button type="button" class="btn" id="mrcan">Cancelar</button><button type="button" class="btn btn-pri" id="mract">Actualizar</button></div></div></div>`;
    const fechaCtl = `<div class="mt-fecha"><button type="button" class="mt-fb" id="mfb">📅 <b>${RANGOS[cr.k] ? RANGOS[cr.k][0] : 'Personalizado'}</b><span>${f1(rd)} – ${f1(rh)}</span><i>▾</i></button>${fechaAbierta ? panel : ''}${datos.importado ? `<small class="mt-fnota">Hay datos importados del ${f1(datos.desde)} al ${f1(datos.hasta)}. Para fechas más nuevas conecta Meta en vivo.</small>` : ''}</div>`;
    return `${A.ejemplo ? '<div class="demo-bar"><span><b>Datos de ejemplo.</b> Así se verá tu cuenta cuando Meta esté conectado.</span></div>' : ''}
    ${envivo ? `<div class="nota-pub mt-vivo">🟢 <b>En vivo desde Meta</b> · actualizado a las ${hora ? hora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''} · se renueva solo cada 5 minutos</div>` : (vivoMsg === 'sin_token' ? `<details class="card mt-sinv"><summary>⚪ <b>Sin conexión en vivo</b> — se muestran los datos importados. Toca para ver cómo conectarla.</summary>${pasos}</details>` : (vivoMsg ? `<div class="nota-pub">⚠ No pude actualizar en vivo: ${esc(vivoMsg)}</div>` : ''))}
    ${A.importado ? `<div class="nota-pub">Datos traídos de Meta ${A.fuente ? '(' + esc(A.fuente) + ') ' : ''}el ${esc(new Date(A.importado_en).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }))}. Es una foto de ese momento: para ponerla al día pídele a Claude <b>actualiza</b> y pega lo nuevo abajo.</div>` : ''}
    <div class="acct"><i></i><span>${A.importado ? 'Importado desde Meta' : 'Automático desde Meta'}</span><b>${esc(A.cuenta.nombre || META_CUENTA.nombre)}</b><code>${esc(A.cuenta.id)}</code>${A.cuenta.moneda ? `<code>${esc(A.cuenta.moneda)}</code>` : ''}</div>
    ${otro ? `<div class="nota-pub">Estás viendo ${f1(A.desde)} al ${f1(A.hasta)}. Toca <b>Actualizar</b> para traer el periodo que elegiste.</div>` : ''}
    ${fechaCtl}
    ${kpiHtml(A, dias)}
    <div class="card"><h3>Campañas, conjuntos y anuncios</h3><p class="sub">Toca una campaña para ver sus conjuntos y anuncios. Las métricas son las de Meta.</p>
      <div class="chips" style="margin-top:6px">${[['activas', 'Activas'], ['conGasto', 'Con gasto'], ['todas', 'Todas']].map(([k, l]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="mt-vista"><button class="chip ${vistaM === 'arbol' ? 'on' : ''}" data-vm="arbol">Árbol</button><button class="chip ${vistaM === 'tabla' ? 'on' : ''}" data-vm="tabla">Tabla</button></div>
      ${vistaM === 'tabla' ? tablaNivel(A) : `<div class="mt-arbol">${arbol}</div>`}</div>
    <details class="card mt-det" id="mdet" ${detAbierto ? 'open' : ''}><summary><h3>Detalle por día</h3><span class="sub">Toda la cuenta, una fila por fecha · toca para ver</span></summary>${tablaDias(A)}</details>`;
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
    autoCargar(); revisarRemoto();
    if (window.Nube && Nube.activo) iniciarVivo();
    if (demo() && (!datos || clave !== d + '|' + h)) cargar();
    if (!datos && !cargando && S.metaSnap && !demo()) { datos = S.metaSnap; clave = d + '|' + h; }
    const cab = secH('meta', 'Meta Ads', 'Campañas, conjuntos y anuncios', '<button class="btn btn-pri" id="mact" style="white-space:nowrap">Actualizar</button>');
    let cuerpoH;
    if (datos) cuerpoH = html();
    else if (cargando) cuerpoH = '<div class="card"><div class="mt-carga"><i></i> Cargando desde Meta…</div></div>';
    else if (falta) cuerpoH = `<div class="card"><p class="mt-aviso">${esc(error)}</p></div>${pasos}`;
    else if (error) cuerpoH = `<div class="card"><p class="mt-aviso">${esc(error)}</p></div>`;
    else if (window.Nube && Nube.activo) cuerpoH = `<div class="card"><p class="mt-aviso">Toca <b>Actualizar</b> para traer tus campañas, conjuntos y anuncios de Meta. No se actualiza solo.</p></div>`;
    else cuerpoH = `<div class="card"><p class="mt-aviso">Inicia sesión para ver las campañas de Meta.</p></div>`;
    const avisoErr = datos && datos.importado && error ? `<div class="card"><p class="mt-aviso">${esc(error)}</p></div>` : '';
    const importador = demo() ? '' : `<details class="card mt-imp" ${!datos || hayNuevo ? 'open' : ''}><summary><b>Importar datos de Meta</b></summary><p class="sub">Si Claude dejó datos guardados, escribe tu clave y pulsa Cargar. O pega aquí el texto que te dio.</p><div class="mt-clave"><input id="mclave" type="password" autocomplete="off" placeholder="Tu clave"><button class="btn btn-pri btn-sm" id="mcargar" type="button">Cargar datos de Claude</button></div><label class="chk" style="margin:6px 0"><input type="checkbox" id="mrec" checked> Recordar mi clave en este dispositivo (así se actualiza sola)</label><textarea id="mimp" rows="5" placeholder="Pega aquí el texto"></textarea><div class="mt-impb"><button class="btn btn-pri btn-sm" id="mimpok" type="button">Importar</button>${S.metaSnap ? '<button class="btn btn-sm btn-del" id="mimpdel" type="button">Borrar lo importado</button>' : ''}</div><div class="nube-msg" id="mimpmsg"></div></details>`;
    const nuevoH = hayNuevo && !envivo ? `<div class="card" style="border-color:var(--acc2)"><p class="mt-aviso">🔔 <b>Hay datos nuevos de Meta</b> (${esc(fechaNueva.slice(0, 10))}). Abajo, escribe tu clave y pulsa <b>Cargar datos de Claude</b>.</p></div>` : '';
    el.innerHTML = cab + nuevoH + avisoErr + cuerpoH + importador;
    const ok = $('#mimpok');
    if (ok) ok.onclick = () => { const msg = $('#mimpmsg'); const t = ($('#mimp').value || '').trim(); if (!t) { msg.textContent = 'Pega primero el texto.'; return; }
      try { aplicarImport(t); } catch (e) { msg.textContent = e.message; } };
    const cg = $('#mcargar');
    if (cg) cg.onclick = async () => { const msg = $('#mimpmsg'), cl = ($('#mclave').value || '').trim(); if (!cl) { msg.textContent = 'Escribe tu clave.'; return; }
      msg.textContent = 'Abriendo…';
      let obj; try { const r = await fetch('datos/meta.enc.json', { cache: 'no-store' }); if (!r.ok) throw 0; obj = await r.json(); } catch (e) { msg.textContent = 'Todavía no hay datos guardados por Claude.'; return; }
      let txt; try { txt = await descifrar(obj, cl); } catch (e) { msg.textContent = 'La clave no es correcta.'; return; }
      const recordar = !$('#mrec') || $('#mrec').checked;
      S.metaAct = obj.actualizado || ''; hayNuevo = false;
      try { aplicarImport(txt); if (recordar) { try { localStorage.setItem('dropox.metaclave', cl); } catch (e) { /* sin almacenamiento */ } } } catch (e) { msg.textContent = e.message; } };
    const del = $('#mimpdel'); if (del) del.onclick = () => ask('¿Borrar los datos importados de Meta?', () => { delete S.metaSnap; if (datos && datos.importado) datos = null; Store.save(); render(); }, 'Borrar');
    const bt = $('#mact'); if (bt) bt.onclick = () => { vivo(false).then(() => { if (!envivo && !datos) cargar(true); }); };
    const mfb = $('#mfb'); if (mfb) mfb.onclick = () => { fechaAbierta = !fechaAbierta; borr = fechaAbierta ? { ...mr() } : null; render(); };
    el.querySelectorAll('input[name="mr"]').forEach(x => x.onchange = () => { borr.k = x.value; if (x.value === 'custom') { const [d, h] = calcRango(borr.k, borr.d, borr.h, borr.hoy !== false); borr.d = borr.d || d; borr.h = borr.h || h; } render(); });
    const mrd = $('#mrd'), mrh = $('#mrh'), mrhoy = $('#mrhoy');
    const personal = () => { borr.k = 'custom'; borr.d = mrd.value; borr.h = mrh.value; if (borr.d > borr.h) { const x = borr.d; borr.d = borr.h; borr.h = x; } render(); };
    if (mrd) mrd.onchange = personal; if (mrh) mrh.onchange = personal;
    if (mrhoy) mrhoy.onchange = () => { borr.hoy = mrhoy.checked; render(); };
    const mrc = $('#mrcan'); if (mrc) mrc.onclick = () => { fechaAbierta = false; borr = null; render(); };
    const mra = $('#mract'); if (mra) mra.onclick = () => { const [d, h] = calcRango(borr.k, borr.d, borr.h, borr.hoy !== false); S.config.metaRango = { k: borr.k, hoy: borr.hoy !== false, ...(borr.k === 'custom' ? { d, h } : {}) }; Store.save(); fechaAbierta = false; borr = null; if (envivo || (window.Nube && Nube.activo && !(datos && datos.importado))) vivo(false); else render(); };
    const per = $('#per'); if (per) per.onchange = e => { S.config.periodo = e.target.value; Store.save(); render(); };
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; render(); });
    el.querySelectorAll('[data-vm]').forEach(b => b.onclick = () => { vistaM = b.dataset.vm; render(); });
    el.querySelectorAll('[data-nt]').forEach(b => b.onclick = () => { nivelT = b.dataset.nt; selFilas.clear(); render(); });
    const mq = $('#mbq'); if (mq) mq.oninput = e => { busq = e.target.value.toLowerCase(); const p = e.target.selectionStart; render(); const i = $('#mbq'); if (i) { i.focus(); i.setSelectionRange(p, p); } };
    const mc = $('#mcols'); if (mc) mc.onchange = e => {
      if (e.target.value === '__custom') { e.target.value = preset; ventanaColumnas(); return; }
      preset = e.target.value; try { localStorage.setItem('dropox.metaPreset', preset); } catch (x) { /* sin almacenamiento */ } render(); };
    const mx = $('#mexp'); if (mx) mx.onclick = exportarTabla;
    const mmt = $('#mmetas'); if (mmt) mmt.onclick = ventanaMetas;
    el.querySelectorAll('[data-copiar]').forEach(c => c.onclick = ev => { ev.stopPropagation(); const v = c.dataset.copiar; (navigator.clipboard ? navigator.clipboard.writeText(v).then(() => toast('ID copiado: ' + v), () => toast('No se pudo copiar')) : toast('No se pudo copiar')); });
    let colArr = null;
    el.querySelectorAll('th[data-ck]').forEach(h => {
      h.ondragstart = e => { colArr = h.dataset.ck; try { e.dataTransfer.setData('text/plain', colArr); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* sin dataTransfer */ } h.classList.add('arr'); };
      h.ondragend = () => h.classList.remove('arr');
      h.ondragover = e => { if (colArr) { e.preventDefault(); h.classList.add('sobre'); } };
      h.ondragleave = () => h.classList.remove('sobre');
      h.ondrop = e => { e.preventDefault(); h.classList.remove('sobre'); const a = colArr; colArr = null; if (!a || a === h.dataset.ck) return; const ks = PRESET[preset][1].slice(); ks.splice(ks.indexOf(a), 1); ks.splice(ks.indexOf(h.dataset.ck), 0, a); guardarColumnas(ks); render(); };
    });
    el.querySelectorAll('[data-so]').forEach(h => h.onclick = ev => { if (ev.target.closest('.mt-ck')) return; const k = h.dataset.so; orden = orden.k === k ? { k, d: -orden.d } : { k, d: k === 'nombre' ? 1 : -1 }; render(); });
    el.querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { if (c.checked) selFilas.add(c.dataset.sel); else selFilas.delete(c.dataset.sel); render(); });
    const sa = $('#mselall'); if (sa) sa.onchange = () => { const A = filtrado(datos), ids = filasNivel(A).map(r => r.id); if (sa.checked) ids.forEach(i => selFilas.add(i)); else selFilas.clear(); render(); };
    el.querySelectorAll('details.mt-n').forEach(x => x.addEventListener('toggle', () => { x.open ? abierto.add(x.dataset.k) : abierto.delete(x.dataset.k); }));
    el.querySelectorAll('[data-dia]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const [nv, id] = b.dataset.dia.split(':'); dialogoDias(nv, id); });
    return true;
  }

  return { vista: mostrar, sync };
})();
window.Meta = Meta;

// si la página abrió directo en Meta Ads, volver a dibujarla ahora que este módulo ya cargó
if (vista === "meta") render();
