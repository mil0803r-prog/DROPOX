'use strict';
/* DROPOX — finanzas para ecommerce en Perú (S/ PEN).
   Persistencia: Store.load / Store.save. Para pasar a base de datos solo se reemplazan esas dos funciones. */

// ───────── Persistencia ─────────
const KEY = 'dropox.v2';
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
const DEFAULTS = () => ({
  fijos: [],
  plataformas: [
    { id: uid(), nombre: 'Shopify', tipo: 'suscripcion', valor: 0, activo: true, nota: 'Plan mensual' },
    { id: uid(), nombre: 'Lumy', tipo: 'suscripcion', valor: 0, activo: true, nota: '' },
    { id: uid(), nombre: 'Dropi', tipo: 'porcentaje', valor: 0, activo: true, nota: 'Comisión por pedido entregado' },
    { id: uid(), nombre: 'Chatea Pro', tipo: 'suscripcion', valor: 0, activo: true, nota: '' },
    { id: uid(), nombre: 'Meta Ads', tipo: 'gasto', valor: 0, activo: true, nota: 'Inversión mensual en pauta' },
    { id: uid(), nombre: 'TikTok Ads', tipo: 'gasto', valor: 0, activo: true, nota: 'Inversión mensual en pauta' },
  ],
  pedidos: [],
  wa: { chats: [] },
  ads: [],
  pub: [],
  caza: [],
  gdia: [],
  shalomPro: [],
  shalomFijos: [],
  menuFijos: [],
  enlaces: [],
  invest: [],
  cuentas: [],
  calcs: [],
  config: { igv: true, renta: 1, factorDevolucion: 2, moneda: 'PEN', tc: 3.75, tema: 'auto', nombre: '', periodo: 'mes' },
});
const Store = {
  load() {
    try {
      const r = localStorage.getItem(KEY);
      if (r) { const d = JSON.parse(r), b = DEFAULTS(); return { ...b, ...d, config: { ...b.config, ...(d.config || {}) } }; }
    } catch (e) {}
    return DEFAULTS();
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar'); } if (window.Nube) Nube.push(); },
};
let S = Store.load();
// Publicidad manual (S.pub) es independiente de Meta Ads y TikTok Ads (S.ads). Una sola vez se pasa a S.pub lo registrado a mano en otras plataformas.
function asegurarCuentas() {
  if (!Array.isArray(S.cuentas)) S.cuentas = [];
  if (!Array.isArray(S.pub)) S.pub = [];
  if (S.pubInit) return;
  S.pubInit = true;
  const mover = (S.ads || []).filter(a => a.plataforma !== 'meta' && a.plataforma !== 'tiktok');
  if (mover.length) { S.pub.push(...mover); S.ads = S.ads.filter(a => !mover.includes(a)); }
  // la cuenta de Meta ya no va aquí: Meta Ads se maneja aparte
  S.cuentas = S.cuentas.filter(c => !(String(c.id).startsWith('cta-meta-') && !S.pub.some(a => a.cuentaId === c.id)));
  if (S.cuentas.length && !S.cuentas.some(c => c.predeterminada)) S.cuentas[0].predeterminada = true;
}
// Meta Ads: solo se aceptan datos de esta cuenta publicitaria
const META_CUENTA = { id: '1226449025709907', nombre: 'Daniel San CUENTA PERU' };
const metaOk = a => a.plataforma !== 'meta' || !a.cuenta || a.cuenta === META_CUENTA.id;
function syncMeta() {
  const d = window.DROPOX_META;
  S.ads = (S.ads || []).filter(a => metaOk(a) && (!d || a.src !== 'meta-api'));
  if (d && d.cuenta && String(d.cuenta.id) === META_CUENTA.id && Array.isArray(d.dias)) {
    d.dias.forEach(x => S.ads.push({ id: 'meta' + x.fecha, plataforma: 'meta', cuenta: META_CUENTA.id, src: 'meta-api', fecha: x.fecha, gasto: num(x.gasto), pedidos: num(x.compras), ventas: num(x.ventas), campana: '' }));
  }
}
syncMeta();

// ───────── Utilidades ─────────
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = n => {
  n = num(n); const usd = S.config.moneda === 'USD', v = usd ? n / (num(S.config.tc) || 3.75) : n;
  return (v < 0 ? '-' : '') + (usd ? '$ ' : 'S/ ') + Math.abs(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pct = n => (isFinite(n) ? n : 0).toFixed(1) + '%';
const cls = n => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const hoy = () => iso(new Date());
const mesActual = () => hoy().slice(0, 7);
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }

const FREQ = { diario: 30, semanal: 52 / 12, mensual: 1, trimestral: 1 / 3, anual: 1 / 12 };
const mensualDe = f => f.frecuencia === 'unico' ? 0 : num(f.monto) * (FREQ[f.frecuencia] ?? 1);
// gasto único: cuenta solo en el mes (o rango) de su fecha
const unicosEn = (a, b) => S.fijos.filter(f => f.activo && f.frecuencia === 'unico' && (f.fecha || hoy()) >= a && (f.fecha || hoy()) <= b).reduce((s, f) => s + num(f.monto), 0);
const ESTADOS = { pendiente: 'Pendiente', enruta: 'En ruta', entregado: 'Entregado', devuelto: 'Devuelto', cancelado: 'Cancelado' };
const SIG = { pendiente: ['enruta', 'Despachar'], enruta: ['entregado', 'Entregado'] };
const TIPOS = { suscripcion: 'Suscripción mensual (S/)', porcentaje: 'Comisión % sobre venta', porPedido: 'Costo por pedido (S/)', gasto: 'Gasto variable mensual (S/)' };
const CATS = ['Alquiler / Local', 'Sueldos', 'Servicios (luz, agua, internet)', 'Software / Herramientas', 'Contabilidad / Legal', 'Marketing fijo', 'Logística / Almacén', 'Otros'];
const PERIODOS = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes', mespasado: 'Mes pasado', '30d': 'Últimos 30 días', todo: 'Todo el tiempo' };
const PAL = ['#0f172a', '#0d9488', '#f59e0b', '#f97316', '#38bdf8', '#a78bfa', '#94a3b8', '#16a34a'];

// Iconos (trazo)
const IC = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calculadora: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  pedidos: '<path d="M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0"/>',
  gastos: '<path d="M12 2v20M17 6.5C16 5 14.5 4.5 12.5 4.5 10 4.5 8 5.8 8 8s2 3 4.5 3.5S17 13 17 15.5 15 19.5 12.5 19.5c-2.200 0-3.800-.7-5-2.200"/>',
  proyeccion: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  meta: '<path d="M3 12c0-3.200 2-5.500 4.200-5.500 4.200 0 5.600 11 9.600 11 2.200 0 4.200-2.300 4.200-5.500s-2-5.500-4.200-5.500c-4 0-5.400 11-9.600 11C5 18.500 3 16 3 12z"/>',
  tiktok: '<path d="M14 3v11.500a3.500 3.500 0 1 1-3.500-3.500M14 3c.5 3 2.500 5 5 5"/>',
  ads: '<path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
  luna: '<path d="M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 0 0 .3 1.800l.1.100a2 2 0 1 1-2.800 2.800l-.1-.1a1.700 1.700 0 0 0-1.800-.3 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.1a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.3l-.1.1a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0 .3-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.1a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.3-1.800l-.1-.1a2 2 0 1 1 2.800-2.800l.1.100a1.700 1.700 0 0 0 1.800.3H9a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.1a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.800-.3l.1-.1a2 2 0 1 1 2.800 2.800l-.1.100a1.700 1.700 0 0 0-.3 1.800V9a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1z"/>',
  chispa: '<path d="M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900zM19 15l.8 2.200L22 18l-2.200.8L19 21l-.8-2.200L16 18l2.200-.8z"/>',
};
IC.publicidad = IC.ads;
IC.investigacion = '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.300-4.300"/>';
IC.dropi = '<path d="M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>';
IC.aliclick = '<path d="M9 3l7 7-4 1 3 6-2 1-3-6-3 3z"/>';
IC.caza = IC.dropi;
IC.caza = IC.dropi; IC.dlfb = '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.500"/>'; IC.dltt = '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/>'; IC.descargar = '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/>';
IC.whatsapp = '<path d="M4 20l1.500-4.500A8 8 0 1 1 8.500 18.500z"/><path d="M9 9c0 3 3 6 6 6l1-2-2-1-1 1c-1-.5-2-1.500-2.500-2.500l1-1-1-2z"/>'; IC.mensajes = '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'; IC.tareas = '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="M9 3v3M15 3v3M8 12l2.500 2.500L16 9"/>'; IC.shalom = '<path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6"/>'; IC.shalomzonas = IC.shalom; IC.shalompro = '<path d="M12 2l2.900 6 6.600.9-4.800 4.600 1.200 6.500L12 16.800 6.100 20l1.200-6.500L2.500 8.900 9.100 8z"/>';
IC.gdia = '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M9 15h6"/>';
IC.prodtiktok = '<path d="M14 3v11.500a3.500 3.500 0 1 1-3.500-3.500M14 3c.300 2.600 2 4.200 5 4.500"/>';
IC.tienda = '<path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18"/><path d="M9 20v-6h6v6"/>';
IC.radar = '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12l6-6"/>';
const svg = (k, w = 1.9) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;

// ───────── Periodos ─────────
function mondayOf(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function rango(p) {
  const now = new Date(), t = iso(now), y = now.getFullYear(), m = now.getMonth();
  if (p === 'hoy') return [t, t];
  if (p === 'semana') return [iso(mondayOf(now)), t];
  if (p === 'mes') return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
  if (p === 'mespasado') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (p === '30d') { const d = new Date(now); d.setDate(d.getDate() - 29); return [iso(d), t]; }
  return ['0000-01-01', '9999-12-31'];
}
function factorPeriodo(p) {
  if (p === 'hoy') return 1 / 30;
  if (p === 'semana') return 7 / 30;
  if (p === 'todo') {
    const f = S.pedidos.map(x => x.fecha).filter(Boolean).sort()[0]; if (!f) return 1;
    return Math.max(1, (Date.now() - new Date(f + 'T12:00').getTime()) / 864e5 / 30);
  }
  return 1;
}

// ───────── Cálculos de negocio ─────────
function totalesPlataformas() {
  const a = S.plataformas.filter(p => p.activo), sum = t => a.filter(p => p.tipo === t).reduce((s, p) => s + num(p.valor), 0);
  return { pctVenta: sum('porcentaje'), porPedido: sum('porPedido'), suscripcion: sum('suscripcion'), gasto: sum('gasto'), mensual: sum('suscripcion') + sum('gasto') };
}
const unicosMes = () => unicosEn(mesActual() + '-01', mesActual() + '-31');
const fijosRecurrente = () => S.fijos.filter(f => f.activo).reduce((s, f) => s + mensualDe(f), 0);
const fijosMensual = () => fijosRecurrente() + unicosEn(mesActual() + '-01', mesActual() + '-31');
const divIgv = () => (S.config.igv ? 1.18 : 1);

function desglose(p) {
  const T = totalesPlataformas(), c = S.config;
  const z = { ventas: 0, igv: 0, producto: 0, flete: 0, comis: 0, renta: 0, otros: 0 };
  if (p.estado === 'cancelado') return z;
  if (p.estado === 'devuelto') { z.flete = num(p.flete) * num(c.factorDevolucion); z.otros = num(p.otros); return z; }
  const bruto = num(p.cantidad) * num(p.precio);
  z.ventas = bruto; z.igv = c.igv ? bruto - bruto / 1.18 : 0;
  z.producto = num(p.cantidad) * num(p.costo); z.flete = num(p.flete); z.otros = num(p.otros);
  z.comis = bruto * T.pctVenta / 100 + T.porPedido; z.renta = bruto / divIgv() * num(c.renta) / 100;
  return z;
}
const utilPedido = p => { const z = desglose(p); return z.ventas - z.igv - z.producto - z.flete - z.otros - z.comis - z.renta; };
const enCurso = p => p.estado === 'pendiente' || p.estado === 'enruta';
const cerrado = p => p.estado === 'entregado' || p.estado === 'devuelto';

const PAUTA_PAT = { meta: /meta/i, tiktok: /tiktok/i, google: /google/i };
function analizar(pk) {
  const [from, to] = rango(pk), f = factorPeriodo(pk), T = totalesPlataformas();
  const P = S.pedidos.filter(p => p.fecha >= from && p.fecha <= to);
  const ent = P.filter(p => p.estado === 'entregado'), dev = P.filter(p => p.estado === 'devuelto'), curso = P.filter(enCurso);
  const D = { ventas: 0, igv: 0, producto: 0, flete: 0, comis: 0, renta: 0, otros: 0 };
  [...ent, ...dev].forEach(p => { const z = desglose(p); for (const k in D) D[k] += z[k]; });
  const utilPed = D.ventas - D.igv - D.producto - D.flete - D.otros - D.comis - D.renta;
  // pauta: si hay gasto real registrado en Ads para Meta o TikTok, se usa ese; si no, el monto mensual de Plataformas
  // con Meta conectado, para Meta solo cuentan los datos automáticos de la API
  const adsReal = k => (S.ads || []).filter(a => a.plataforma === k && metaOk(a) && (k !== 'meta' || !S.metaAuto || a.src === 'meta-api') && a.fecha >= from && a.fecha <= to).reduce((s, a) => s + num(a.gasto), 0);
  const pubReal = k => (S.pub || []).filter(a => a.plataforma === k && a.fecha >= from && a.fecha <= to).reduce((s, a) => s + num(a.gasto), 0);
  const tienePlat = k => S.plataformas.some(p => p.activo && p.tipo === 'gasto' && PAUTA_PAT[k].test(p.nombre));
  const fijos = (fijosRecurrente() + T.suscripcion) * f + unicosEn(from, to);
  const vars = S.plataformas.filter(p => p.activo && p.tipo === 'gasto').reduce((s, p) => {
    const k = Object.keys(PAUTA_PAT).find(x => PAUTA_PAT[x].test(p.nombre)) || '', real = k ? (k === 'google' ? pubReal('google') : adsReal(k)) : 0;
    return s + (real > 0 ? real : num(p.valor) * f);
  }, 0) + ['meta', 'tiktok'].filter(k => !tienePlat(k)).reduce((s, k) => s + adsReal(k), 0)
    + (tienePlat('google') ? 0 : pubReal('google')) + pubReal('youtube') + pubReal('influencer') + pubReal('otro') + pubReal('meta') + pubReal('tiktok');
  return {
    P, ent, dev, curso, D, utilPed, fijos, vars, neta: utilPed - fijos - vars, f,
    tasa: ent.length + dev.length ? ent.length / (ent.length + dev.length) * 100 : null,
    porCobrar: curso.reduce((s, p) => s + num(p.cantidad) * num(p.precio), 0),
  };
}
function serie(tipo, metric) {
  const items = [], now = new Date();
  if (tipo === 'dia') for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const k = iso(d); items.push({ l: k.slice(8) + '/' + k.slice(5, 7), from: k, to: k }); }
  else { const mon = mondayOf(now); for (let i = 11; i >= 0; i--) { const d = new Date(mon); d.setDate(d.getDate() - 7 * i); const e = new Date(d); e.setDate(e.getDate() + 6); const k = iso(d); items.push({ l: k.slice(8) + '/' + k.slice(5, 7), from: k, to: iso(e) }); } }
  items.forEach(it => {
    const ps = S.pedidos.filter(p => p.fecha >= it.from && p.fecha <= it.to);
    it.v = metric === 'pedidos' ? ps.length : metric === 'ventas' ? ps.filter(p => p.estado === 'entregado').reduce((s, p) => s + desglose(p).ventas, 0) : ps.filter(cerrado).reduce((s, p) => s + utilPedido(p), 0);
  });
  return items;
}

// ───────── Gráficos SVG ─────────
function barChart(items, metric) {
  const vals = items.map(i => i.v);
  if (!vals.some(v => v !== 0)) return '<div class="empty">Aún no hay datos para este gráfico.</div>';
  const W = 600, H = 180, t = 10, b = 22, n = items.length, lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const y = v => t + (hi - v) / ((hi - lo) || 1) * (H - t - b), y0 = y(0), bw = W / n, k = Math.ceil(n / 8);
  const f = v => metric === 'pedidos' ? v : fmt(v);
  return `<svg viewBox="0 0 ${W} ${H}" class="bars">${items.map((it, i) => {
    const yy = y(it.v), x = i * bw + bw * .16, w = bw * .68, col = metric === 'utilidad' ? (it.v < 0 ? '#ef4444' : '#10b981') : '#334155';
    return `<rect x="${x.toFixed(1)}" y="${Math.min(yy, y0).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(it.v ? 2 : 0, Math.abs(yy - y0)).toFixed(1)}" rx="3" fill="${col}"><title>${esc(it.l)}: ${f(it.v)}</title></rect>`;
  }).join('')}<line x1="0" x2="${W}" y1="${y0}" y2="${y0}" stroke="var(--line)"/>${items.map((it, i) => i % k === 0 ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${it.l}</text>` : '').join('')}</svg>`;
}
function stackBar(segs) {
  const tot = segs.reduce((s, x) => s + Math.max(0, x[1]), 0) || 1, v = segs.filter(s => s[1] > 0);
  return `<div class="stack">${v.map(s => `<i style="width:${s[1] / tot * 100}%;background:${PAL[s[2]]}" title="${esc(s[0])}: ${fmt(s[1])}"></i>`).join('')}</div>
  <div class="legend">${v.map(s => `<span><u style="background:${PAL[s[2]]}"></u>${esc(s[0])} <b>${fmt(s[1])}</b> <em>${(s[1] / tot * 100).toFixed(0)}%</em></span>`).join('')}</div>`;
}
function donut(rows) {
  const tot = rows.reduce((s, r) => s + r[1], 0) || 1, R = 52, C2 = 2 * Math.PI * R; let off = 0;
  const arcs = rows.map((r, i) => { const len = r[1] / tot * C2, a = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${PAL[i % PAL.length]}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 1.5)} ${C2}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`; off += len; return a; }).join('');
  return `<div class="donut"><svg viewBox="0 0 140 140"><circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--tile)" stroke-width="18"/>${arcs}<text x="70" y="68" text-anchor="middle" class="d1">${fmt(tot)}</text><text x="70" y="82" text-anchor="middle" class="d2">al mes</text></svg>
  <div class="legend col">${rows.map((r, i) => `<span><u style="background:${PAL[i % PAL.length]}"></u>${esc(r[0])} <b>${fmt(r[1])}</b></span>`).join('')}</div></div>`;
}
function gauge(m, color, etiqueta = 'margen por entregado') {
  const f = Math.max(0, Math.min(1, (m + 20) / 70)), L = Math.PI * 70;
  return `<svg viewBox="0 0 180 110" class="gauge"><path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="var(--tile)" stroke-width="14" stroke-linecap="round"/><path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${f * L} ${L}"/><text x="90" y="82" text-anchor="middle" class="g1" fill="${color}">${m.toFixed(0)}%</text><text x="90" y="102" text-anchor="middle" style="font:600 10px 'Plus Jakarta Sans';fill:var(--mut)">${etiqueta}</text></svg>`;
}
function countUp(root) {
  const red = matchMedia('(prefers-reduced-motion:reduce)').matches;
  root.querySelectorAll('[data-count]').forEach(e => {
    const to = parseFloat(e.dataset.count), k = e.dataset.kind, f = v => k === 'pct' ? pct(v) : k === 'int' ? String(Math.round(v)) : fmt(v);
    if (red || !isFinite(to)) { e.textContent = f(to); return; }
    const t0 = performance.now();
    (function s(t) { const p = Math.min(1, (t - t0) / 700), v = to * (1 - Math.pow(1 - p, 3)); e.textContent = f(v); if (p < 1) requestAnimationFrame(s); })(t0);
  });
}

// ───────── Formulario modal ─────────
function openForm(title, fields, vals, onSave) {
  const f = $('#dlgForm'), d = $('#dlg');
  f.innerHTML = `<h2>${esc(title)}</h2><div class="row">${fields.map(fd => {
    const v = vals[fd.k] ?? fd.def ?? '';
    let inp;
    if (fd.t === 'select') inp = `<select name="${fd.k}" style="width:100%">${Object.entries(fd.opts).map(([k, l]) => `<option value="${esc(k)}" ${k == v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    else if (fd.t === 'area') inp = `<textarea name="${fd.k}" rows="${fd.rows || 10}" ${fd.req ? 'required' : ''} style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:14px/1.5 inherit;resize:vertical;white-space:pre-wrap">${esc(v)}</textarea>`;
    else if (fd.t === 'dias') inp = `<div style="display:flex;flex-wrap:wrap;gap:10px 14px">${[[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']].map(([n, l]) => `<label class="chk"><input type="checkbox" name="${fd.k}__${n}" ${(Array.isArray(v) ? v : []).includes(n) ? 'checked' : ''}> ${l}</label>`).join('')}</div>`;
    else if (fd.t === 'check') inp = `<label class="chk"><input type="checkbox" name="${fd.k}" ${v ? 'checked' : ''}> ${esc(fd.l)}</label>`;
    else inp = `<input name="${fd.k}" type="${fd.t || 'text'}" ${fd.t === 'number' ? 'step="any" min="0" inputmode="decimal"' : ''} value="${esc(v)}" ${fd.req ? 'required' : ''} ${fd.list ? `list="dl-${fd.k}"` : ''}>` + (fd.list ? `<datalist id="dl-${fd.k}">${fd.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : '');
    return `<div class="field" style="${fd.full ? 'grid-column:1/-1' : ''}">${fd.t === 'check' ? '' : `<label>${esc(fd.l)}</label>`}${inp}</div>`;
  }).join('')}</div><div class="dlg-foot"><button type="button" class="btn" id="dlgCancel">Cancelar</button><button class="btn btn-pri" value="ok">Guardar</button></div>`;
  $('#dlgCancel').onclick = () => d.close();
  f.onsubmit = e => {
    e.preventDefault(); const out = {};
    fields.forEach(fd => { if (fd.t === 'dias') { out[fd.k] = [1, 2, 3, 4, 5, 6, 0].filter(n => f.elements[fd.k + '__' + n].checked); return; } const el = f.elements[fd.k]; out[fd.k] = fd.t === 'check' ? el.checked : fd.t === 'number' ? num(el.value) : el.value.trim(); });
    onSave(out); Store.save(); d.close(); render();
  };
  d.showModal();
}
function openInfo(html) {
  const f = $('#dlgForm'), d = $('#dlg'); f.innerHTML = html + '<div class="dlg-foot"><button type="button" class="btn btn-pri" id="dlgCancel">Cerrar</button></div>';
  f.onsubmit = e => e.preventDefault(); $('#dlgCancel').onclick = () => d.close(); d.showModal();
}
function ask(msg, yes, label = 'Confirmar') {
  const f = $('#dlgForm'), d = $('#dlg');
  f.innerHTML = `<h2>${esc(msg)}</h2><div class="dlg-foot"><button type="button" class="btn" id="askNo">Cancelar</button><button type="button" class="btn btn-pri" id="askYes">${esc(label)}</button></div>`;
  f.onsubmit = e => e.preventDefault();
  $('#askNo').onclick = () => d.close();
  $('#askYes').onclick = () => { d.close(); yes(); };
  d.showModal();
}
const confirmDel = (msg, fn) => ask(msg, () => { fn(); Store.save(); render(); }, 'Eliminar');
const secH = (ic, t, s, extra = '') => `<div class="sec"><div class="tile-ic">${svg(ic)}</div><div><h1>${t}</h1><p>${s}</p></div>${extra ? `<div class="push">${extra}</div>` : ''}</div>`;

// ───────── Alertas / asistente ─────────
function insights(A) {
  const L = [], T = totalesPlataformas(), push = (c, t, d) => L.push({ c, t, d });
  if (!S.pedidos.length) push('info', 'Registra tu primer pedido', 'En “Pedidos” anota cliente, producto, precio, costo y flete. Con eso el panel calcula tu utilidad real.');
  if (!S.fijos.length) push('info', 'Aún no registras gastos fijos', 'Alquiler, sueldos, contador, internet… sin ellos tu utilidad neta se ve más alta de lo real.');
  if (A.tasa !== null && A.tasa < 70) push('bad', `Tasa de entrega baja: ${pct(A.tasa)}`, `Cada devolución te cuesta ${fmt(num(S.config.factorDevolucion) * (A.dev.length ? A.D.flete / Math.max(1, A.ent.length + A.dev.length) : 12))} aprox. en flete. Confirma por WhatsApp antes de despachar.`);
  if (A.tasa !== null && A.tasa >= 85) push('ok', `Excelente tasa de entrega: ${pct(A.tasa)}`, 'Tu operación está sana; es buen momento para escalar la pauta.');
  if (A.D.ventas > 0 && (A.vars / A.D.ventas) > 0.35) push('warn', `La pauta consume ${pct(A.vars / A.D.ventas * 100)} de tus ventas`, 'Por encima de 35% el margen suele quedar muy ajustado. Revisa CPA y creativos.');
  if (A.ent.length && A.neta < 0) {
    const u = A.utilPed / A.ent.length;
    if (u > 0) { const falta = Math.ceil((A.fijos + A.vars) / u) - A.ent.length; push('warn', `Te faltan ~${falta} pedidos entregados para cubrir tus gastos`, `Cada entregado te deja ${fmt(u)} de utilidad.`); }
    else push('bad', 'Cada pedido entregado te deja pérdida', 'Sube el precio, baja el costo/flete o revisa comisiones en la Calculadora.');
  }
  if (A.neta > 0) push('ok', `Estás en positivo: ${fmt(A.neta)}`, 'Ya cubriste tus gastos del periodo.');
  const viejos = S.pedidos.filter(p => p.estado === 'pendiente' && (Date.now() - new Date(p.fecha + 'T12:00').getTime()) > 3 * 864e5).length;
  if (viejos) push('warn', `${viejos} pedido${viejos > 1 ? 's' : ''} pendiente${viejos > 1 ? 's' : ''} hace más de 3 días`, 'Despáchalos o cancélalos para no perder la venta.');
  if (T.mensual === 0 && !S.plataformas.some(p => num(p.valor) > 0)) push('info', 'Configura tus plataformas', 'En Gastos → Plataformas pon lo que pagas por Shopify, Dropi, Meta Ads, etc.');
  return L;
}
const alertasHtml = L => L.length ? L.map(a => `<div class="al"><i class="dot ${a.c}"></i><div><b>${esc(a.t)}</b><span>${esc(a.d)}</span></div></div>`).join('') : '<div class="empty">Todo en orden. Sin alertas.</div>';

// ───────── Vistas ─────────
const VIEWS = { tienda: el => window.Tienda && Tienda.vista(el), whatsapp: el => window.WhatsApp && WhatsApp.vista(el), mensajes: el => window.Mensajes && Mensajes.vista(el), tareas: el => window.Tareas && Tareas.vista(el), shalomzonas: el => window.ShalomZonas && ShalomZonas.vista(el), dashboard: vDashboard, calculadora: vCalc, pedidos: vPedidos, gastos: vGastos, meta: el => { if (!(window.Meta && Meta.vista(el))) vAdsPlat(el, 'meta'); }, tiktok: el => vAdsPlat(el, 'tiktok'), ads: el => vAdsPlat(el, 'meta'), publicidad: vPublicidad, caza: el => window.Caza && Caza.vista(el, Caza.ultimo || 'dropi'), dlfb: el => window.Descargador && Descargador.vista(el, 'facebook'), dltt: el => window.Descargador && Descargador.vista(el, 'tiktok'), descargar: el => window.Descargador && Descargador.vista(el, 'tiktok'), gdia: el => window.Gdia && Gdia.vista(el), shalom: el => window.Shalom && Shalom.vista(el, 'ag'), shalompro: el => window.Shalom && Shalom.vista(el, 'pro'), prodtiktok: el => window.Caza && Caza.vista(el, 'tiktok'), radar: el => window.Radar && Radar.vista(el), investigacion: el => window.Caza && Caza.vista(el, 'invest'), dropi: el => window.Caza && Caza.vista(el, 'dropi'), aliclick: el => window.Caza && Caza.vista(el, 'aliclick'), proyeccion: vProy, ajustes: vAjustes };
let metrica = 'ventas', tabla = { dia: false, sem: false };

function vDashboard(el) {
  const pk = S.config.periodo, A = analizar(pk), N = A.neta;
  const tile = (l, v, sub = '', c = '') => `<div class="t"><small>${l}</small><b class="${c}">${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  const cat = {}; S.fijos.filter(f => f.activo).forEach(f => { const k = f.categoria || 'Otros'; cat[k] = (cat[k] || 0) + mensualDe(f); });
  S.plataformas.filter(p => p.activo && (p.tipo === 'suscripcion' || p.tipo === 'gasto') && num(p.valor) > 0).forEach(p => cat[p.nombre] = (cat[p.nombre] || 0) + num(p.valor));
  const rows = Object.entries(cat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const flow = [['IGV', A.D.igv, 6], ['Producto', A.D.producto, 0], ['Fletes', A.D.flete, 2], ['Comisiones y otros', A.D.comis + A.D.otros, 3], ['Renta', A.D.renta, 4], ['Gastos fijos', A.fijos, 5], ['Pauta y variables', A.vars, 1], ['Te queda', Math.max(0, N), 7]];
  const mTit = { ventas: 'Ventas entregadas', utilidad: 'Utilidad de pedidos', pedidos: 'Pedidos' }[metrica], uni = metrica === 'pedidos' ? '' : ' (S/)';
  const dia = serie('dia', metrica), sem = serie('sem', metrica), f = v => metrica === 'pedidos' ? v : fmt(v);
  const tbl = it => `<div class="tw"><table><thead><tr><th>Periodo</th><th class="num">${mTit}</th></tr></thead><tbody>${it.slice().reverse().filter(i => i.v !== 0).map(i => `<tr><td>${i.l}</td><td class="num">${f(i.v)}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">Sin datos</td></tr>'}</tbody></table></div>`;
  el.innerHTML = `
  ${secH('dashboard', 'Resumen de la tienda', 'Cómo va tu negocio')}
  <div class="card card-row per"><div><small class="cap">Periodo</small><b>Hola, ${esc(S.config.nombre || 'emprendedor')}</b></div>
    <select id="per">${Object.entries(PERIODOS).map(([k, l]) => `<option value="${k}" ${k === pk ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="hero ${N < 0 ? 'h-neg' : 'h-pos'}"><small>UTILIDAD NETA REAL</small><div class="n" data-count="${N}">${fmt(N)}</div><span>después de gastos fijos y variables</span></div>
  <div class="tiles">
    ${tile('Ventas entregadas', fmt(A.D.ventas), `${A.ent.length} entregados`)}
    ${tile('Utilidad de pedidos', fmt(A.utilPed), 'antes de gastos', cls(A.utilPed))}
    ${tile('Gastos variables', fmt(A.vars), 'pauta y otros')}
    ${tile('Gastos fijos', fmt(A.fijos), 'fijos + suscripciones')}
    ${tile('Pedidos', A.P.length, `${A.curso.length} en curso`)}
    ${tile('Tasa de entrega', A.tasa === null ? '—' : pct(A.tasa), `${A.dev.length} devueltos`, A.tasa !== null && A.tasa < 70 ? 'warn' : '')}
    ${tile('Por cobrar', fmt(A.porCobrar), 'en proceso')}
    ${tile('Utilidad esperada', fmt(A.curso.reduce((s, p) => s + utilPedido(p), 0)), 'de pedidos en curso')}
  </div>
  <div class="card card-row"><small class="cap">Gráficos por</small><div class="seg" id="met">${[['ventas', 'Ventas'], ['utilidad', 'Utilidad'], ['pedidos', 'Pedidos']].map(([k, l]) => `<button data-k="${k}" class="${k === metrica ? 'on' : ''}">${l}</button>`).join('')}</div></div>
  <div class="card"><div class="chart-h"><div><h3>Por día</h3><p class="sub">${mTit} · últimos 30 días${uni}</p></div><button class="btn btn-sm" data-t="dia">${tabla.dia ? 'Ver gráfico' : 'Ver tabla'}</button></div>${tabla.dia ? tbl(dia) : barChart(dia, metrica)}</div>
  <div class="card"><div class="chart-h"><div><h3>Por semana</h3><p class="sub">${mTit} · últimas 12 semanas, de lunes a domingo${uni}</p></div><button class="btn btn-sm" data-t="sem">${tabla.sem ? 'Ver gráfico' : 'Ver tabla'}</button></div>${tabla.sem ? tbl(sem) : barChart(sem, metrica)}</div>
  <div class="card"><h3>¿A dónde va cada sol que vendes?</h3><p class="sub">${A.D.ventas > 0 ? `Te queda <b class="${cls(N)}">${pct(N / A.D.ventas * 100)}</b> de lo que vendes, después de todo` : 'Se llena cuando tengas pedidos entregados.'}</p>${A.D.ventas > 0 ? stackBar(flow) : '<div class="empty">Aún no hay datos para este gráfico.</div>'}</div>
  <div class="card"><h3>Gastos mensuales</h3><p class="sub">Fijos y plataformas</p>${rows.length ? donut(rows) : '<div class="empty">Registra gastos para ver su distribución.</div>'}</div>
  <div class="card"><h3>Alertas</h3><p class="sub">Lo que conviene mirar ahora</p>${alertasHtml(insights(A))}</div>`;
  $('#per').onchange = e => { S.config.periodo = e.target.value; Store.save(); render(); };
  el.querySelectorAll('#met button').forEach(b => b.onclick = () => { metrica = b.dataset.k; render(); });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tabla[b.dataset.t] = !tabla[b.dataset.t]; render(); });
}

// ── Pedidos ──
let fPed = { q: '', estado: '' };
const campoPed = () => [
  { k: 'fecha', l: 'Fecha', t: 'date', def: hoy(), req: 1 },
  { k: 'estado', l: 'Estado', t: 'select', opts: ESTADOS, def: 'pendiente' },
  { k: 'producto', l: 'Producto', req: 1, full: 1, list: [...new Set(S.pedidos.map(p => p.producto))] },
  { k: 'cliente', l: 'Cliente' }, { k: 'telefono', l: 'Teléfono', t: 'tel' },
  { k: 'ciudad', l: 'Ciudad / Distrito', list: [...new Set(S.pedidos.map(p => p.ciudad))] }, { k: 'canal', l: 'Canal (Tienda, WhatsApp…)' },
  { k: 'cantidad', l: 'Cantidad', t: 'number', def: 1 }, { k: 'precio', l: 'Precio venta unit. (S/)', t: 'number' },
  { k: 'costo', l: 'Costo producto unit. (S/)', t: 'number' }, { k: 'flete', l: 'Flete (S/)', t: 'number' },
  { k: 'otros', l: 'Otros costos (S/)', t: 'number' },
];
function vPedidos(el) {
  const q = fPed.q.toLowerCase();
  const all = S.pedidos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const list = all.filter(p => (!q || [p.producto, p.cliente, p.ciudad, p.telefono].join(' ').toLowerCase().includes(q)) && (!fPed.estado || p.estado === fPed.estado));
  el.innerHTML = `${secH('pedidos', 'Pedidos', `${S.pedidos.length} registrados`, `<button class="btn btn-pri" id="nuevo">+ Nuevo</button>`)}
  <input class="search" id="fq" type="search" placeholder="Buscar producto, cliente, ciudad…" value="${esc(fPed.q)}">
  <div class="chips"><button class="chip ${fPed.estado === '' ? 'on' : ''}" data-s="">Todos<i>${all.length}</i></button>${Object.entries(ESTADOS).map(([k, l]) => `<button class="chip ${fPed.estado === k ? 'on' : ''}" data-s="${k}">${l}<i>${all.filter(p => p.estado === k).length}</i></button>`).join('')}</div>
  ${list.length ? `<div class="list">${list.map(p => {
    const u = utilPedido(p), proj = enCurso(p), sg = SIG[p.estado];
    return `<div class="it"><div class="it-h"><b>${esc(p.producto)}</b><span class="tag t-${p.estado}">${ESTADOS[p.estado] || p.estado}</span></div>
    <div class="it-s">${esc(p.fecha.slice(8) + '/' + p.fecha.slice(5, 7))} · ${esc(p.cliente || 'Sin cliente')}${p.ciudad ? ' · ' + esc(p.ciudad) : ''} · x${num(p.cantidad)}</div>
    <div class="it-m"><span>Venta<b>${fmt(num(p.cantidad) * num(p.precio))}</b></span><span>Utilidad${proj ? ' (esperada)' : ''}<b class="${cls(u)}">${fmt(u)}</b></span></div>
    <div class="it-a">${sg ? `<button class="btn btn-sm btn-pri" data-n="${p.id}">${sg[1]} →</button>` : ''}${enCurso(p) ? `<button class="btn btn-sm btn-del" data-dv="${p.id}">Devuelto</button>` : ''}<button class="btn btn-sm" data-e="${p.id}">Editar</button><button class="btn btn-sm btn-del" data-d="${p.id}">✕</button></div></div>`;
  }).join('')}</div>` : `<div class="card empty">${S.pedidos.length ? 'Ningún pedido coincide con el filtro.' : 'Aún no hay pedidos. Pulsa “+ Nuevo” para registrar el primero.'}</div>`}
  <p class="note">La utilidad descuenta IGV, costo, flete, comisiones (%) y renta según Ajustes. En devueltos se pierde el flete × factor de devolución.</p>`;
  $('#nuevo').onclick = () => openForm('Nuevo pedido', campoPed(), {}, v => S.pedidos.push({ id: uid(), ...v }));
  $('#fq').oninput = e => { fPed.q = e.target.value; const pos = e.target.selectionStart; render(); const i = $('#fq'); i.focus(); i.setSelectionRange(pos, pos); };
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => { fPed.estado = b.dataset.s; render(); });
  const P = id => S.pedidos.find(x => x.id === id);
  el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const p = P(b.dataset.n); p.estado = SIG[p.estado][0]; Store.save(); render(); });
  el.querySelectorAll('[data-dv]').forEach(b => b.onclick = () => { P(b.dataset.dv).estado = 'devuelto'; Store.save(); render(); });
  el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const p = P(b.dataset.e); openForm('Editar pedido', campoPed(), p, v => Object.assign(p, v)); });
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Eliminar este pedido?', () => S.pedidos = S.pedidos.filter(x => x.id !== b.dataset.d)));
}
function exportCSV() {
  const h = ['fecha', 'estado', 'producto', 'cliente', 'telefono', 'ciudad', 'canal', 'cantidad', 'precio', 'costo', 'flete', 'otros', 'utilidad'];
  const rows = S.pedidos.map(p => h.map(k => k === 'utilidad' ? utilPedido(p).toFixed(2) : `"${String(p[k] ?? '').replace(/"/g, '""')}"`).join(','));
  descargar('pedidos.csv', '﻿' + h.join(',') + '\n' + rows.join('\n'), 'text/csv');
}
function descargar(nombre, txt, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: tipo })); a.download = nombre; a.click(); URL.revokeObjectURL(a.href); }

// ── Gastos ──
const cF = [{ k: 'nombre', l: 'Concepto', req: 1, full: 1 }, { k: 'categoria', l: 'Categoría', t: 'select', opts: Object.fromEntries(CATS.map(c => [c, c])) }, { k: 'monto', l: 'Monto (S/)', t: 'number', req: 1 }, { k: 'frecuencia', l: 'Frecuencia', t: 'select', opts: { diario: 'Diario', semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual', unico: 'Único (una sola vez)' }, def: 'mensual' }, { k: 'fecha', l: 'Fecha (solo si es Único)', t: 'date', def: hoy() }, { k: 'activo', l: 'Activo (cuenta en el cálculo)', t: 'check', def: true }];
let gTab = 'fijos';
function vGastos(el) {
  const T = totalesPlataformas(), totFijo = fijosMensual();
  const head = secH('gastos', 'Gastos', 'Fijos, plataformas e indirectos', `<button class="btn btn-pri" id="nuevo">+ Nuevo</button>`);
  const seg = `<div class="card card-row"><small class="cap">Ver</small><div class="seg" id="gseg"><button data-k="fijos" class="${gTab === 'fijos' ? 'on' : ''}">Gastos fijos</button><button data-k="plat" class="${gTab === 'plat' ? 'on' : ''}">Plataformas</button></div></div>`;
  let body = '';
  if (gTab === 'fijos') {
    body = `<div class="tiles"><div class="t"><small>Total mensual</small><b>${fmt(totFijo)}</b><em>${fmt(totFijo * 12)} al año</em></div><div class="t"><small>Por día</small><b>${fmt(totFijo / 30)}</b><em>${S.fijos.filter(f => f.activo).length} conceptos</em></div></div>` +
      (S.fijos.length ? `<div class="list">${S.fijos.map(f => `<div class="it" style="${f.activo ? '' : 'opacity:.55'}"><div class="it-h"><b>${esc(f.nombre)}</b><b>${f.frecuencia === 'unico' ? fmt(f.monto) : fmt(mensualDe(f))}<span class="mut" style="font-weight:500;font-size:11px">${f.frecuencia === 'unico' ? ' único' : ' /mes'}</span></b></div><div class="it-s">${esc(f.categoria)} · ${f.frecuencia === 'unico' ? 'Único · ' + esc(f.fecha || 'sin fecha') : fmt(f.monto) + ' ' + esc(f.frecuencia)}${f.activo ? '' : ' · pausado'}</div><div class="it-a" style="margin:0"><button class="btn btn-sm" data-ef="${f.id}">Editar</button><button class="btn btn-sm btn-del" data-df="${f.id}">✕</button></div></div>`).join('')}</div>` : '<div class="card empty">Registra alquiler, sueldos, contador, internet, software…</div>');
  } else {
    body = `<div class="tiles"><div class="t"><small>Suscripciones</small><b>${fmt(T.suscripcion)}</b><em>por mes</em></div><div class="t"><small>Pauta / variables</small><b>${fmt(T.gasto)}</b><em>por mes</em></div><div class="t"><small>Comisión sobre venta</small><b>${pct(T.pctVenta)}</b></div><div class="t"><small>Costo por pedido</small><b>${fmt(T.porPedido)}</b></div></div>` +
      `<div class="list">${S.plataformas.map(p => `<div class="it" style="${p.activo ? '' : 'opacity:.55'}"><div class="it-h"><b>${esc(p.nombre)}</b><b>${p.tipo === 'porcentaje' ? pct(p.valor) : fmt(p.valor)}</b></div><div class="it-s">${TIPOS[p.tipo]}${p.nota ? ' · ' + esc(p.nota) : ''}${p.activo ? '' : ' · pausado'}</div><div class="it-a" style="margin:0"><button class="btn btn-sm" data-ep="${p.id}">Editar</button><button class="btn btn-sm btn-del" data-dp="${p.id}">✕</button></div></div>`).join('')}</div>
      <p class="note">Suscripciones cuentan como gasto fijo; la pauta, como gasto variable. Los % y costos por pedido se aplican a cada pedido y a la Calculadora.</p>`;
  }
  el.innerHTML = head + seg + body;
  const cP = [{ k: 'nombre', l: 'Plataforma o gasto', req: 1, full: 1 }, { k: 'tipo', l: 'Tipo de cobro', t: 'select', opts: TIPOS, full: 1 }, { k: 'valor', l: 'Valor (S/ o %)', t: 'number', req: 1 }, { k: 'nota', l: 'Nota' }, { k: 'activo', l: 'Activo', t: 'check', def: true }];
  $('#nuevo').onclick = () => gTab === 'fijos' ? openForm('Nuevo gasto fijo', cF, {}, v => S.fijos.push({ id: uid(), ...v })) : openForm('Nueva plataforma', cP, { tipo: 'suscripcion' }, v => S.plataformas.push({ id: uid(), ...v }));
  el.querySelectorAll('#gseg button').forEach(b => b.onclick = () => { gTab = b.dataset.k; render(); });
  el.querySelectorAll('[data-ef]').forEach(b => b.onclick = () => { const f = S.fijos.find(x => x.id === b.dataset.ef); openForm('Editar gasto fijo', cF, f, v => Object.assign(f, v)); });
  el.querySelectorAll('[data-df]').forEach(b => b.onclick = () => confirmDel('¿Eliminar este gasto?', () => S.fijos = S.fijos.filter(x => x.id !== b.dataset.df)));
  el.querySelectorAll('[data-ep]').forEach(b => b.onclick = () => { const p = S.plataformas.find(x => x.id === b.dataset.ep); openForm('Editar plataforma', cP, p, v => Object.assign(p, v)); });
  el.querySelectorAll('[data-dp]').forEach(b => b.onclick = () => confirmDel('¿Eliminar esta plataforma?', () => S.plataformas = S.plataformas.filter(x => x.id !== b.dataset.dp)));
}

// ── Calculadora ──
const CALC_DEF = { nombre: '', precio: 0, costo: 0, flete: 0, empaque: 0, comCod: 0, comExtra: 0, cpa: 0, devol: 0, ventas: 0, usarPlat: true, usarFijos: true, usarUnicos: true, margen: 0, admModo: 'auto', admManual: 0 };
let C = Object.assign({}, CALC_DEF, (() => { try { return JSON.parse(localStorage.getItem('dropox.calc2')) || {}; } catch (e) { return {}; } })());
const guardarCalc = () => { try { localStorage.setItem('dropox.calc2', JSON.stringify(C)); } catch (e) {} };

function calcular(c, devolOverride) {
  const r = (devolOverride ?? c.devol) / 100, T = totalesPlataformas(), d = divIgv(), renta = num(S.config.renta) / 100, fd = num(S.config.factorDevolucion);
  const com = (num(c.comCod) + num(c.comExtra) + (c.usarPlat ? T.pctVenta : 0)) / 100, porPed = c.usarPlat ? T.porPedido : 0;
  const admM = c.admModo === 'manual', admAuto = c.ventas > 0 ? ((c.usarFijos ? fijosMensual() : 0) + (c.usarPlat ? T.suscripcion : 0)) / c.ventas : 0, pautaAuto = c.ventas > 0 && c.usarPlat ? T.gasto / c.ventas : 0;
  const prorr = (admM ? num(c.admManual) : admAuto) + pautaAuto;
  const k = (1 - r) * ((1 - renta) / d - com);
  const flete = num(c.flete) * (1 + r * (fd - 1));
  const F = (1 - r) * num(c.costo) + flete + num(c.empaque) + porPed + num(c.cpa) + prorr;
  const util = k * c.precio - F, utilEnt = r < 1 ? util / (1 - r) : 0, den = k - (c.margen / 100) * (1 - r), cpaBE = k * c.precio - (F - num(c.cpa));
  return {
    util, utilEnt, margen: c.precio ? utilEnt / c.precio * 100 : 0, prorr, mensual: util * c.ventas,
    // margen bruto: (precio sin IGV - costo del producto) / precio sin IGV; no descuenta flete, pauta ni gastos
    precioNeto: num(c.precio) / d, utilBruta: num(c.precio) / d - num(c.costo), margenBruto: num(c.precio) > 0 ? (num(c.precio) / d - num(c.costo)) / (num(c.precio) / d) * 100 : 0,
    pBE: k > 0 ? F / k : NaN, pObj: den > 0 ? F / den : NaN, cpaBE, cpaObj: cpaBE - (c.margen / 100) * (1 - r) * c.precio, roasBE: cpaBE > 0 ? (1 - r) * c.precio / cpaBE : NaN,
    g: { ingreso: (1 - r) * c.precio, igv: (1 - r) * (c.precio - c.precio / d), costo: (1 - r) * num(c.costo), flete, empaque: num(c.empaque), comis: (1 - r) * c.precio * com + porPed, renta: (1 - r) * c.precio / d * renta, cpa: num(c.cpa), prorr },
  };
}
// ── Calculadora: productos guardados ──
let calcActual = null;
const CAMPOS_CALC = ['nombre', 'precio', 'costo', 'flete', 'empaque', 'comCod', 'comExtra', 'cpa', 'devol', 'ventas', 'margen', 'usarPlat', 'usarFijos', 'usarUnicos'];
function guardadosHtml() {
  const L = (S.calcs || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const filas = L.map(it => { const R = calcular({ ...CALC_DEF, ...it.c }), f = it.fecha ? it.fecha.slice(8) + '/' + it.fecha.slice(5, 7) : '';
    return `<div class="it"><div class="it-h"><b>${esc(it.nombre)}${calcActual === it.id ? ' <span class="tag">Cargado</span>' : ''}</b><b class="${cls(R.utilEnt)}">${fmt(R.utilEnt)}</b></div><div class="it-s">Precio ${fmt(it.c.precio)} · costo ${fmt(it.c.costo)} · margen bruto ${pct(R.margenBruto)} · margen ${pct(R.margen)} · utilidad por pedido entregado · guardado ${f}</div><div class="it-a" style="margin:0"><button class="btn btn-sm" data-gl="${it.id}">Cargar</button><button class="btn btn-sm btn-del" data-gd="${it.id}">✕</button></div></div>`; }).join('');
  return `<div class="card" id="guardados"><h3>Productos guardados</h3><p class="sub">${L.length ? 'Toca Cargar para volver a calcular con esos números' : 'Pulsa Guardar para dejar aquí un producto y no escribirlo otra vez'}</p>${L.length ? `<div class="list">${filas}</div>` : '<div class="empty">Aún no guardas ningún producto.</div>'}</div>`;
}
function bindGuardados(el) {
  $('#gcalc').onclick = () => {
    const nombre = String(C.nombre || '').trim();
    if (!nombre) { toast('Escribe primero el nombre del producto'); $('[data-c=nombre]').focus(); return; }
    if (!num(C.precio)) { toast('Escribe primero el precio de venta'); return; }
    const snap = {}; CAMPOS_CALC.forEach(k => { snap[k] = C[k]; }); snap.nombre = nombre;
    const lista = (S.calcs = S.calcs || []), ya = lista.find(x => String(x.nombre).trim().toLowerCase() === nombre.toLowerCase());
    if (ya) { Object.assign(ya, { nombre, c: snap, fecha: hoy() }); calcActual = ya.id; toast('Producto actualizado'); }
    else { const it = { id: uid(), nombre, fecha: hoy(), c: snap }; lista.push(it); calcActual = it.id; toast('Producto guardado'); }
    Store.save(); render();
  };
  el.querySelectorAll('[data-gl]').forEach(b => b.onclick = () => { const it = (S.calcs || []).find(x => x.id === b.dataset.gl); if (!it) return; C = { ...CALC_DEF, ...it.c, nombre: it.nombre }; calcActual = it.id; guardarCalc(); render(); scrollTo(0, 0); toast('Cargado: ' + it.nombre); });
  el.querySelectorAll('[data-gd]').forEach(b => b.onclick = () => confirmDel('¿Eliminar este producto guardado?', () => { S.calcs = (S.calcs || []).filter(x => x.id !== b.dataset.gd); if (calcActual === b.dataset.gd) calcActual = null; }));
}
function vCalc(el) {
  C.admModo = 'auto';
  const n = (k, l, ex = '') => `<div class="field"><label>${l}</label><input data-c="${k}" type="number" step="any" min="0" inputmode="decimal" value="${C[k]}">${ex ? `<div class="note" style="margin-top:4px">${ex}</div>` : ''}</div>`;
  const T = totalesPlataformas();
  el.innerHTML = `${secH('calculadora', 'Calculadora', 'Cuánto te deja cada venta en Perú', `<button class="btn btn-pri" id="gcalc">Guardar</button><button class="btn" id="rst">Restablecer</button>`)}
  <div class="mini" id="mini"></div>
  <div id="res"></div>
  <div class="two"><div>
    <div class="card"><h3>Producto</h3><p class="sub">${S.config.igv ? 'El precio incluye IGV 18%' : 'Precios sin IGV'}</p>
      <div class="row"><div class="field" style="grid-column:1/-1"><label>Nombre del producto</label><input data-c="nombre" type="text" maxlength="80" autocomplete="off" placeholder="Ej. Masajeador cervical" value="${esc(C.nombre)}"></div>${n('precio', 'Precio de venta (S/)')}${n('costo', 'Costo del producto (S/)')}${n('flete', 'Flete de envío (S/)')}${n('empaque', 'Empaque / otros (S/)')}</div></div>
    <div class="card"><h3>Publicidad y devoluciones</h3><p class="sub">Lo que más mueve tu utilidad</p>
      <div class="row">${n('cpa', 'Pauta por pedido (S/)', 'CPA por pedido despachado')}${n('devol', '% de devolución', 'Pierdes el flete ida y vuelta')}${n('comCod', 'Comisión contraentrega (%)', 'Courier o agente')}${n('comExtra', 'Otra comisión (%)', 'Pasarela, marketplace')}</div>
    </div>
    <div class="card"><h3>Gasto total del mes</h3><p class="sub">Todo lo que tienes registrado en Gastos</p><div class="big-n" id="gTot"></div></div>
    <div class="card"><h3>Pedidos del mes</h3><p class="sub">Escribe cuántos pedidos haces y verás cuánto le toca a cada uno</p>
      <div class="field"><label>Número de pedidos</label><input data-c="ventas" type="number" step="any" min="0" inputmode="decimal" value="${C.ventas}"></div>
      <div class="line"><span>Te toca por pedido</span><span class="hl" id="gPed"></span></div></div>
    <div class="card"><h3>Escala y objetivo</h3><p class="sub">Para repartir costos fijos y fijar tu meta</p>
      <div class="row">${n('margen', 'Margen objetivo (%)')}</div>
      <label class="chk" style="margin:4px 0 10px"><input type="checkbox" data-c="usarPlat" ${C.usarPlat ? 'checked' : ''}> Incluir plataformas (${pct(T.pctVenta)} + ${fmt(T.porPedido)}/pedido + ${fmt(T.mensual)}/mes)</label>
      <label class="chk"><input type="checkbox" data-c="usarFijos" ${C.usarFijos ? 'checked' : ''}> Repartir gastos fijos y únicos (${fmt(fijosMensual())}/mes)</label>
      <div class="line" style="margin-top:8px"><span>Total gastos fijos + plataformas</span><b>${fmt(fijosMensual() + T.mensual)}/mes</b></div>
      <div class="row" style="margin:8px 0"><button type="button" class="btn btn-sm" id="addUnico">+ Gasto único</button><button type="button" class="btn btn-sm" id="addFijo">+ Gasto fijo</button></div>
      <p class="note">IGV ${S.config.igv ? '18% incluido' : 'no aplicado'} · Renta ${S.config.renta}% · cámbialo en Ajustes.</p></div>
  </div><div id="res2"></div></div>
  ${guardadosHtml()}`;
  bindGuardados(el);
  $('#rst').onclick = () => { C = { ...CALC_DEF }; calcActual = null; guardarCalc(); render(); };
  $('#addUnico').onclick = () => openForm('Nuevo gasto único', cF, { frecuencia: 'unico' }, v => { S.fijos.push({ id: uid(), ...v }); C.usarFijos = true; guardarCalc(); });
  $('#addFijo').onclick = () => openForm('Nuevo gasto fijo', cF, {}, v => { S.fijos.push({ id: uid(), ...v }); C.usarFijos = true; guardarCalc(); });
  el.querySelectorAll('[data-c]').forEach(i => i.oninput = () => { C[i.dataset.c] = i.type === 'checkbox' ? i.checked : i.type === 'text' ? i.value : num(i.value); guardarCalc(); pintarCalc(); });
  pintarCalc();
}
function pintarCalc() {
  const R = calcular(C), g = R.g, ok = R.margen >= C.margen, pos = R.util > 0;
  const hero = !pos ? 'h-neg' : 'h-pos', vtxt = !num(C.precio) ? 'Escribe tu precio y costos para calcular' : !pos ? 'Con estos números pierdes dinero' : ok ? 'Producto escalable: cumples tu margen objetivo' : 'Rentable pero por debajo de tu margen objetivo';
  const vc = !pos ? '#dc2626' : ok ? '#10b981' : '#f59e0b';
  const L = (l, v, c = '') => `<div class="line"><span>${l}</span><span class="${c}">${v}</span></div>`;
  const NP = num(C.ventas), L3 = (l, v, c = '', txt = false) => `<div class="line3"><span>${l}</span><span class="${c}">${txt ? v : fmt(v)}</span><span class="${c}">${NP > 0 ? (txt ? v : fmt(v * NP)) : '—'}</span></div>`;
  const totProd = g.costo + g.flete + g.empaque, totCompleto = g.igv + g.costo + g.flete + g.empaque + g.comis + g.renta + g.cpa + g.prorr;
  const m = v => isFinite(v) && v > 0 ? fmt(v) : '<span class="neg">No alcanza</span>';
  $('#mini').innerHTML = `<span>Utilidad / pedido <b class="${cls(R.util)}">${fmt(R.util)}</b></span><span>Margen <b class="${cls(R.margen)}">${pct(R.margen)}</b></span><span>M. bruto <b class="${cls(R.margenBruto)}">${pct(R.margenBruto)}</b></span><span>Mes <b class="${cls(R.mensual)}">${fmt(R.mensual)}</b></span>`;
  $('#res').innerHTML = `<div class="hero ${hero}"><small>UTILIDAD POR PEDIDO DESPACHADO</small><div class="n">${fmt(R.util)}</div><span>${fmt(R.utilEnt)} por pedido entregado · margen ${pct(R.margen)}</span><div class="verdict">${vtxt}</div></div>`;
  const T3 = totalesPlataformas(), gTot = (C.usarFijos ? fijosMensual() : 0) + (C.usarPlat ? T3.mensual : 0), nPed = num(C.ventas);
  $('#gTot').textContent = fmt(gTot); $('#gPed').textContent = nPed > 0 ? fmt(gTot / nPed) : '—';
  $('#res2').innerHTML = `
  <div class="card"><h3>Margen</h3>${gauge(R.margen, vc)}</div>
  <div class="card"><h3>Margen bruto</h3><p class="sub">Lo que deja el producto antes de flete, pauta y gastos</p>${gauge(R.margenBruto, '#7c3aed', 'margen bruto')}
    ${L(S.config.igv ? 'Precio sin IGV' : 'Precio de venta', fmt(R.precioNeto))}${L('Costo del producto', '- ' + fmt(num(C.costo)))}${L('Utilidad bruta por unidad', fmt(R.utilBruta), 'hl ' + cls(R.utilBruta))}${L('Margen bruto', pct(R.margenBruto), 'hl ' + cls(R.margenBruto))}
    <p class="note">Margen bruto = (precio sin IGV − costo del producto) ÷ precio sin IGV.</p></div>
  <div class="card"><h3>Totales por pedido</h3><p class="sub">Por pedido despachado, ya contando las devoluciones. ${NP > 0 ? `La última columna suma tus ${NP.toLocaleString('es-PE')} pedidos del mes.` : 'Escribe tus pedidos del mes para ver también el total del mes.'}</p>
    <div class="line3 line3-h"><span></span><span>Por pedido</span><span>${NP > 0 ? NP.toLocaleString('es-PE') + ' pedidos' : 'Mes'}</span></div>
    <p class="sub tot-t">Solo gastos del producto</p>
    ${L3('Costo del producto', g.costo)}${L3('Flete', g.flete)}${L3('Empaque / otros', g.empaque)}${L3('Total gastos del producto', totProd, 'hl')}${L3('% de lo que cobras', g.ingreso > 0 ? pct(totProd / g.ingreso * 100) : '—', '', true)}
    <p class="sub tot-t">Total completo, con todo</p>
    ${L3('Gastos del producto', totProd)}${L3('Comisiones', g.comis)}${L3('Pauta (CPA)', g.cpa)}${L3('Gastos fijos y plataformas', g.prorr)}${L3('IGV', g.igv)}${L3('Impuesto a la renta', g.renta)}${L3('Total con todo', totCompleto, 'hl')}${L3('% de lo que cobras', g.ingreso > 0 ? pct(totCompleto / g.ingreso * 100) : '—', '', true)}
    <p class="sub tot-t">Cómo cuadra</p>
    ${L3('Cobras por pedido despachado', g.ingreso)}${L3('− Total con todo', -totCompleto)}${L3('Te queda (utilidad)', R.util, 'hl ' + cls(R.util))}</div>
  <div class="card"><h3>Cifras clave</h3><p class="sub">Para decidir precio y pauta</p>
    ${L('Precio mínimo (utilidad 0)', m(R.pBE))}${L(`Precio para ${C.margen}% de margen`, m(R.pObj), 'hl')}${L('CPA máximo sin perder', m(R.cpaBE))}${L(`CPA máx. para ${C.margen}% de margen`, m(R.cpaObj), 'hl')}${L('ROAS de equilibrio', isFinite(R.roasBE) ? R.roasBE.toFixed(2) + 'x' : '—')}${L(`Utilidad con ${C.ventas} pedidos/mes`, fmt(R.mensual), 'hl ' + cls(R.mensual))}</div>
  <div class="card"><h3>¿Y si cambia la devolución?</h3><div class="tw"><table><thead><tr><th>Devol.</th>${[0, 10, 20, 30, 40, 50].map(x => `<th class="num">${x}%</th>`).join('')}</tr></thead><tbody><tr><td>Por pedido</td>${[0, 10, 20, 30, 40, 50].map(x => { const u = calcular(C, x).util; return `<td class="num ${cls(u)}">${fmt(u)}</td>`; }).join('')}</tr><tr><td>Al mes</td>${[0, 10, 20, 30, 40, 50].map(x => { const u = calcular(C, x).mensual; return `<td class="num ${cls(u)}">${fmt(u)}</td>`; }).join('')}</tr></tbody></table></div></div>`;
}

// ── Ads: una sección por plataforma (Meta Ads y TikTok Ads) ──
const ADP = { meta: { n: 'Meta Ads', c: '#3b82f6', ic: 'meta' }, tiktok: { n: 'TikTok Ads', c: '#14b8a6', ic: 'tiktok' } };
function vAdsPlat(el, key) {
  const P = ADP[key], pk = S.config.periodo, [from, to] = rango(pk), A = analizar(pk);
  const mine = (S.ads || []).filter(a => a.plataforma === key && metaOk(a));
  const L = mine.filter(a => a.fecha >= from && a.fecha <= to).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const g = L.reduce((s, a) => s + num(a.gasto), 0), p = L.reduce((s, a) => s + num(a.pedidos), 0), v = L.reduce((s, a) => s + num(a.ventas), 0);
  const cpa = p > 0 ? g / p : null, roas = g > 0 && v > 0 ? v / g : null;
  // gasto diario de los últimos 30 días
  const dias = []; for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = iso(d); dias.push({ l: k.slice(8) + '/' + k.slice(5, 7), v: mine.filter(a => a.fecha === k).reduce((s, a) => s + num(a.gasto), 0) }); }
  const mx = Math.max(...dias.map(d => d.v));
  const chart = mx <= 0 ? '<div class="empty">Aún no hay datos para este gráfico.</div>' : (() => {
    const W = 600, H = 180, t = 10, b = 22, bw = W / 30;
    return `<svg viewBox="0 0 ${W} ${H}" class="bars">${dias.map((d, i) => { const h = (H - t - b) * d.v / mx; return `<rect x="${(i * bw + bw * .16).toFixed(1)}" y="${(H - b - h).toFixed(1)}" width="${(bw * .68).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${P.c}"><title>${d.l}: ${fmt(d.v)}</title></rect>`; }).join('')}<line x1="0" x2="${W}" y1="${H - b}" y2="${H - b}" stroke="var(--line)"/>${dias.map((d, i) => i % 4 === 0 ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${d.l}</text>` : '').join('')}</svg>`; })();
  const tile = (l, val, s = '') => `<div class="t"><small>${l}</small><b>${val}</b>${s ? `<em>${s}</em>` : ''}</div>`;
  const cuenta = key === 'meta' ? `<div class="acct"><i></i><span>Solo esta cuenta publicitaria</span><b>${esc(META_CUENTA.nombre)}</b><code>${META_CUENTA.id}</code></div>` : '';
  const sec = `<div class="sec"><div class="tile-ic" style="background:${P.c}22;color:${P.c}">${svg(P.ic)}</div><div><h1>${P.n}</h1><p>Gasto y resultados</p></div><div class="push"><button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Registrar</button></div></div>`;
  el.innerHTML = `${sec}${cuenta}
  <div class="card card-row per"><div><small class="cap">Periodo</small><b>${P.n}</b></div><select id="per">${Object.entries(PERIODOS).map(([k, l]) => `<option value="${k}" ${k === pk ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="tiles">${tile('Gasto', fmt(g), `${L.length} registros`)}${tile('Pedidos generados', p)}${tile('Costo por pedido', cpa === null ? '—' : fmt(cpa))}${tile('ROAS', roas === null ? '—' : roas.toFixed(2) + 'x', 'ventas ÷ gasto')}</div>
  <div class="card"><h3>Gasto por día</h3><p class="sub">${P.n} · últimos 30 días (S/)</p>${chart}</div>
  <div class="card"><h3>Registros</h3><p class="sub">${L.length ? 'Lo más reciente primero' : `Anota cuánto gastas cada día en ${P.n}.`}</p>${L.length ? `<div class="list">${L.map(a => { const c = num(a.pedidos) > 0 ? num(a.gasto) / num(a.pedidos) : null, r = num(a.gasto) > 0 && num(a.ventas) > 0 ? num(a.ventas) / num(a.gasto) : null;
    return `<div class="it"><div class="it-h"><b>${esc(a.fecha.slice(8) + '/' + a.fecha.slice(5, 7))}${a.campana ? ' · ' + esc(a.campana) : ''}</b><b>${fmt(a.gasto)}</b></div><div class="it-s">${num(a.pedidos)} pedidos${c !== null ? ' · ' + fmt(c) + ' c/u' : ''}${r !== null ? ' · ROAS ' + r.toFixed(2) + 'x' : ''}</div><div class="it-a" style="margin:0"><button class="btn btn-sm" data-e="${a.id}">Editar</button><button class="btn btn-sm btn-del" data-d="${a.id}">✕</button></div></div>`; }).join('')}</div>` : '<div class="empty">Sin registros en este periodo.</div>'}</div>`;
  const campos = [{ k: 'fecha', l: 'Fecha', t: 'date', def: hoy(), req: 1 }, { k: 'gasto', l: 'Gasto (S/)', t: 'number', req: 1 }, { k: 'pedidos', l: 'Pedidos generados', t: 'number' }, { k: 'ventas', l: 'Ventas generadas (S/)', t: 'number' }, { k: 'campana', l: 'Campaña (opcional)', full: 1 }];
  $('#nuevo').onclick = () => openForm('Registrar gasto en ' + P.n, campos, {}, x => (S.ads = S.ads || []).push({ id: uid(), plataforma: key, ...(key === 'meta' ? { cuenta: META_CUENTA.id } : {}), ...x }));
  $('#per').onchange = e => { S.config.periodo = e.target.value; Store.save(); render(); };
  el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const a = S.ads.find(x => x.id === b.dataset.e); openForm('Editar gasto en ' + P.n, campos, a, x => Object.assign(a, x)); });
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Eliminar este registro?', () => S.ads = S.ads.filter(x => x.id !== b.dataset.d)));
}

// ── Publicidad manual: el gasto en anuncios de cualquier plataforma ──
const PUBP = { meta: { n: 'Meta Ads', c: '#3b82f6' }, tiktok: { n: 'TikTok Ads', c: '#14b8a6' }, google: { n: 'Google Ads', c: '#f59e0b' }, youtube: { n: 'YouTube Ads', c: '#ef4444' }, influencer: { n: 'Influencers', c: '#ec4899' }, otro: { n: 'Otro', c: '#8b5cf6' } };
let fPub = '', fCta = '';
const pubNom = k => (PUBP[k] || PUBP.otro).n;
const ctaDe = a => (S.cuentas || []).find(c => c.id === a.cuentaId) || null;
const ctaDefault = () => (S.cuentas || []).find(c => c.predeterminada) || null;
function vPublicidad(el) {
  const pk = S.config.periodo, [from, to] = rango(pk), cuentas = S.cuentas || [];
  if (fCta && !cuentas.some(c => c.id === fCta)) fCta = '';
  const delPeriodo = (S.pub || []).filter(a => a.fecha >= from && a.fecha <= to);
  const todas = delPeriodo.filter(a => !fCta || (ctaDe(a) || {}).id === fCta);
  const L = todas.filter(a => !fPub || a.plataforma === fPub).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const sum = (arr, k) => arr.reduce((s, a) => s + num(a[k]), 0);
  const g = sum(L, 'gasto'), p = sum(L, 'pedidos'), v = sum(L, 'ventas');
  const cpa = p > 0 ? g / p : null, roas = g > 0 && v > 0 ? v / g : null;
  const por = Object.keys(PUBP).map(k => { const x = todas.filter(a => a.plataforma === k); return { k, g: sum(x, 'gasto'), p: sum(x, 'pedidos'), v: sum(x, 'ventas'), n: x.length }; }).filter(x => x.n);
  const gt = por.reduce((s, x) => s + x.g, 0);
  const tile = (l, val, s = '') => `<div class="t"><small>${l}</small><b>${val}</b>${s ? `<em>${s}</em>` : ''}</div>`;
  const chips = `<div class="chips"><button class="chip ${fPub === '' ? 'on' : ''}" data-p="">Todas<i>${todas.length}</i></button>${Object.entries(PUBP).map(([k, o]) => `<button class="chip ${fPub === k ? 'on' : ''}" data-p="${k}">${o.n}<i>${todas.filter(a => a.plataforma === k).length}</i></button>`).join('')}</div>`;
  const reparto = por.length ? por.map(x => { const r = x.g > 0 && x.v > 0 ? x.v / x.g : null; return `<div class="pb-row"><div class="pb-top"><span>${esc(pubNom(x.k))}</span><span>${fmt(x.g)}</span></div><div class="pb-bar"><i style="width:${gt > 0 ? Math.max(2, x.g / gt * 100).toFixed(1) : 0}%;background:${(PUBP[x.k] || PUBP.otro).c}"></i></div><div class="pb-s">${gt > 0 ? (x.g / gt * 100).toFixed(0) + '% del gasto' : ''} · ${x.p} pedidos${r !== null ? ' · ROAS ' + r.toFixed(2) + 'x' : ''}</div></div>`; }).join('') : '<div class="empty">Aún no hay gasto en este periodo.</div>';
  const filtroCta = cuentas.length ? `<div class="card card-row"><div><small class="cap">Cuenta publicitaria</small><b>${fCta ? esc((cuentas.find(c => c.id === fCta) || {}).nombre || '') : 'Todas las cuentas'}</b></div><select id="fcta"><option value="">Todas las cuentas</option>${cuentas.map(c => `<option value="${esc(c.id)}" ${c.id === fCta ? 'selected' : ''}>${esc(c.nombre)} · ${esc(pubNom(c.plataforma))}</option>`).join('')}</select></div>` : '';
  const listaCtas = cuentas.length ? `<div class="list">${cuentas.map(c => { const gc = delPeriodo.filter(a => (ctaDe(a) || {}).id === c.id).reduce((s, a) => s + num(a.gasto), 0);
    return `<div class="it"><div class="it-h"><b>${esc(c.nombre)}${c.predeterminada ? ' <span class="tag">Por defecto</span>' : ''}</b><span>${esc(pubNom(c.plataforma))}</span></div><div class="it-s">${c.ref ? 'ID ' + esc(c.ref) : 'Sin ID'} · ${fmt(gc)} en este periodo</div><div class="it-a" style="margin:0">${c.predeterminada ? '' : `<button class="btn btn-sm" data-cdef="${esc(c.id)}">Usar por defecto</button>`}<button class="btn btn-sm" data-ce="${esc(c.id)}">Editar</button><button class="btn btn-sm btn-del" data-cd="${esc(c.id)}">✕</button></div></div>`; }).join('')}</div>` : '<div class="empty">Agrega tu cuenta publicitaria para que quede elegida al registrar.</div>';
  el.innerHTML = `${secH('publicidad', 'Publicidad', 'Registra a mano lo que gastas en anuncios', '<button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Registrar</button>')}
  <div class="card card-row per"><div><small class="cap">Periodo</small><b>Gasto en publicidad</b></div><select id="per">${Object.entries(PERIODOS).map(([k, l]) => `<option value="${k}" ${k === pk ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="nota-pub">Aquí anotas a mano lo que gastas, en la plataforma que sea. <b>Meta Ads</b> y <b>TikTok Ads</b> son solo nombres: no se sincronizan con nada ni con las secciones Meta Ads y TikTok Ads, así que no registres lo mismo en las dos. Todo se suma a tu utilidad neta.</div>
  ${filtroCta}${chips}
  <div class="tiles">${tile('Gasto', fmt(g), `${L.length} registros`)}${tile('Pedidos generados', p)}${tile('Costo por pedido', cpa === null ? '—' : fmt(cpa))}${tile('ROAS', roas === null ? '—' : roas.toFixed(2) + 'x', 'ventas ÷ gasto')}</div>
  <div class="card"><h3>Gasto por plataforma</h3><p class="sub">Todo lo que registras aquí se descuenta de tu utilidad neta</p>${reparto}</div>
  <div class="card"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><h3>Cuentas publicitarias</h3><p class="sub">La cuenta por defecto aparece ya elegida al registrar</p></div><button class="btn btn-sm" id="nuevaCta" style="white-space:nowrap">+ Agregar cuenta</button></div>${listaCtas}</div>
  <div class="card"><h3>Registros</h3><p class="sub">${L.length ? 'Lo más reciente primero' : 'Anota cuánto gastas en publicidad, en la plataforma que sea.'}</p>${L.length ? `<div class="list">${L.map(a => { const c = num(a.pedidos) > 0 ? num(a.gasto) / num(a.pedidos) : null, r = num(a.gasto) > 0 && num(a.ventas) > 0 ? num(a.ventas) / num(a.gasto) : null, ct = ctaDe(a);
    return `<div class="it"><div class="it-h"><b>${esc(a.fecha.slice(8) + '/' + a.fecha.slice(5, 7))} · ${esc(pubNom(a.plataforma))}</b><b>${fmt(a.gasto)}</b></div><div class="it-s">${ct ? esc(ct.nombre) + ' · ' : ''}${a.campana ? esc(a.campana) + ' · ' : ''}${num(a.pedidos)} pedidos${c !== null ? ' · ' + fmt(c) + ' c/u' : ''}${r !== null ? ' · ROAS ' + r.toFixed(2) + 'x' : ''}</div><div class="it-a" style="margin:0">${a.src === 'meta-api' ? '<span class="tag">Meta API</span>' : `<button class="btn btn-sm" data-e="${a.id}">Editar</button><button class="btn btn-sm btn-del" data-d="${a.id}">✕</button>`}</div></div>`; }).join('')}</div>` : '<div class="empty">Sin registros en este periodo.</div>'}</div>`;

  // formulario del gasto: al elegir una cuenta, la plataforma se ajusta sola
  const campos = () => [{ k: 'fecha', l: 'Fecha', t: 'date', def: hoy(), req: 1 },
    { k: 'cuentaId', l: 'Cuenta publicitaria', t: 'select', opts: { '': 'Sin cuenta', ...Object.fromEntries(cuentas.map(c => [c.id, `${c.nombre} · ${pubNom(c.plataforma)}`])) } },
    { k: 'plataforma', l: 'Plataforma', t: 'select', opts: Object.fromEntries(Object.entries(PUBP).map(([k, o]) => [k, o.n])) },
    { k: 'gasto', l: 'Gasto (S/)', t: 'number', req: 1 }, { k: 'pedidos', l: 'Pedidos generados', t: 'number' }, { k: 'ventas', l: 'Ventas generadas (S/)', t: 'number' }, { k: 'campana', l: 'Campaña o nota (opcional)', full: 1 }];
  const enlazar = () => { const sc = $('#dlgForm').elements.cuentaId, sp = $('#dlgForm').elements.plataforma; if (sc && sp) sc.onchange = () => { const c = cuentas.find(x => x.id === sc.value); if (c) sp.value = c.plataforma; }; };
  const fijar = a => { if (!a.cuentaId) delete a.cuentaId; return a; };
  const nuevoVals = () => { const d = ctaDefault(), pf = fPub || (d ? d.plataforma : 'meta'); const c = d && d.plataforma === pf ? d : cuentas.find(x => x.plataforma === pf); return { cuentaId: c ? c.id : '', plataforma: pf }; };
  $('#nuevo').onclick = () => { openForm('Registrar publicidad', campos(), nuevoVals(), x => (S.pub = S.pub || []).push(fijar({ id: uid(), ...x }))); enlazar(); };
  $('#per').onchange = e => { S.config.periodo = e.target.value; Store.save(); render(); };
  const fc = $('#fcta'); if (fc) fc.onchange = e => { fCta = e.target.value; render(); };
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { fPub = b.dataset.p; render(); });
  el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const a = S.pub.find(x => x.id === b.dataset.e), c = ctaDe(a); openForm('Editar publicidad', campos(), { ...a, cuentaId: c ? c.id : '' }, x => fijar(Object.assign(a, x))); enlazar(); });
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Eliminar este registro?', () => S.pub = S.pub.filter(x => x.id !== b.dataset.d)));

  // cuentas publicitarias
  const camposCta = [{ k: 'nombre', l: 'Nombre de la cuenta', req: 1, full: 1 }, { k: 'plataforma', l: 'Plataforma', t: 'select', opts: Object.fromEntries(Object.entries(PUBP).map(([k, o]) => [k, o.n])) }, { k: 'ref', l: 'ID de la cuenta (opcional)' }, { k: 'predeterminada', l: 'Usar esta cuenta por defecto', t: 'check', full: 1 }];
  const guardarCta = (c, x) => { Object.assign(c, x); if (!x.ref) c.ref = ''; if (c.predeterminada) S.cuentas.forEach(o => { if (o !== c) o.predeterminada = false; }); if (!S.cuentas.some(o => o.predeterminada)) S.cuentas[0].predeterminada = true; };
  $('#nuevaCta').onclick = () => openForm('Nueva cuenta publicitaria', camposCta, { plataforma: fPub || 'meta', predeterminada: !cuentas.length }, x => { const c = { id: uid() }; S.cuentas.push(c); guardarCta(c, x); });
  el.querySelectorAll('[data-ce]').forEach(b => b.onclick = () => { const c = S.cuentas.find(x => x.id === b.dataset.ce); openForm('Editar cuenta publicitaria', camposCta, c, x => guardarCta(c, x)); });
  el.querySelectorAll('[data-cdef]').forEach(b => b.onclick = () => { S.cuentas.forEach(c => { c.predeterminada = c.id === b.dataset.cdef; }); Store.save(); render(); });
  el.querySelectorAll('[data-cd]').forEach(b => b.onclick = () => confirmDel('¿Eliminar esta cuenta? Los registros se conservan, solo quedan sin cuenta.', () => { const id = b.dataset.cd; S.cuentas = S.cuentas.filter(c => c.id !== id); S.pub.forEach(a => { if (a.cuentaId === id) delete a.cuentaId; }); if (S.cuentas.length && !S.cuentas.some(c => c.predeterminada)) S.cuentas[0].predeterminada = true; }));
}

// ── Proyección ──
let PRY = { pd: null, u: null };
function vProy(el) {
  const A = analizar('30d'), G = fijosRecurrente() + totalesPlataformas().mensual;
  const uAuto = A.ent.length ? A.ent.reduce((s, p) => s + utilPedido(p), 0) / A.ent.length : calcular(C).utilEnt;
  const pdAuto = A.ent.length ? Math.round(A.ent.length / 30 * 10) / 10 : 0;
  const u = PRY.u ?? Math.round(uAuto * 100) / 100, pd = PRY.pd ?? pdAuto;
  const neto = d => d * 30 * u - G, be = u > 0 ? G / (30 * u) : null;
  const esc3 = [['Conservador', pd * 0.7], ['Actual', pd], ['Optimista', pd * 1.3], ['Escalando', pd * 2]];
  const meses = Array.from({ length: 12 }, (_, i) => ({ l: 'M' + (i + 1), v: neto(pd) * (i + 1) }));
  el.innerHTML = `${secH('proyeccion', 'Proyección', 'Hacia dónde va tu negocio')}
  <div class="hero ${neto(pd) < 0 ? 'h-neg' : 'h-pos'}"><small>UTILIDAD NETA PROYECTADA / MES</small><div class="n">${fmt(neto(pd))}</div><span>${pd.toFixed(1)} entregados por día · ${fmt(u)} de utilidad por entregado</span></div>
  <div class="card"><h3>Simula tu ritmo</h3><p class="sub">Arrastra para ver el efecto</p>
    <label>Pedidos entregados por día: <b id="pdv">${pd.toFixed(1)}</b></label><input type="range" id="pd" min="0" max="40" step="0.5" value="${pd}">
    <div class="row" style="margin-top:10px"><div class="field"><label>Utilidad por entregado (S/)</label><input type="number" id="pu" step="any" inputmode="decimal" value="${u}"></div>
    <div class="field"><label>Gastos fijos y variables / mes</label><input value="${fmt(G)}" disabled></div></div>
    <p class="note">${A.ent.length ? `Valores tomados de tus últimos 30 días (${A.ent.length} entregados).` : 'Aún sin entregados: usa la utilidad de tu Calculadora.'}</p></div>
  <div class="tiles"><div class="t"><small>Punto de equilibrio</small><b>${be === null ? '—' : be.toFixed(1) + '/día'}</b><em>${be === null ? 'sin utilidad por pedido' : Math.ceil(be * 30) + ' entregados al mes'}</em></div>
  <div class="t"><small>Utilidad por día</small><b class="${cls(neto(pd) / 30)}">${fmt(neto(pd) / 30)}</b></div></div>
  <div class="card"><h3>Escenarios</h3><p class="sub">Utilidad neta mensual según tu ritmo</p><div class="tw"><table><thead><tr><th>Escenario</th><th class="num">Ped./día</th><th class="num">Entreg./mes</th><th class="num">Utilidad neta</th></tr></thead><tbody>${esc3.map(([n, d]) => `<tr><td>${n}</td><td class="num">${d.toFixed(1)}</td><td class="num">${Math.round(d * 30)}</td><td class="num ${cls(neto(d))}"><b>${fmt(neto(d))}</b></td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h3>Utilidad acumulada a 12 meses</h3><p class="sub">Si mantienes el ritmo actual</p>${barChart(meses, 'utilidad')}</div>`;
  $('#pd').oninput = e => { PRY.pd = num(e.target.value); const y = window.scrollY; render(); scrollTo(0, y); };
  $('#pu').onchange = e => { PRY.u = num(e.target.value); render(); };
}

// ── Ajustes ──
function vAjustes(el) {
  const c = S.config;
  el.innerHTML = `${secH('ajustes', 'Ajustes', 'Impuestos, moneda y respaldo')}
  ${window.Nube ? Nube.cardHtml() : ''}
  <div class="card"><h3>General</h3><p class="sub">Personaliza tu panel</p>
    <div class="field"><label>Tu nombre (para el saludo)</label><input id="aNom" value="${esc(c.nombre)}" placeholder="Ej. Yosca"></div>
    <div class="field"><label>Tipo de cambio (S/ por US$ 1)</label><input id="aTc" type="number" step="any" inputmode="decimal" value="${c.tc}"></div></div>
  <div class="card"><h3>Impuestos y devoluciones</h3><p class="sub">Afectan la utilidad de cada pedido</p>
    <label class="chk" style="margin-bottom:12px"><input type="checkbox" id="aIgv" ${c.igv ? 'checked' : ''}> Mis precios incluyen IGV (18%)</label>
    <div class="field"><label>Impuesto a la renta (% sobre ventas netas)</label><input id="aRenta" type="number" step="any" inputmode="decimal" value="${c.renta}"><div class="note">RUS = 0 (cuota fija) · Régimen MYPE ≈ 1%. Confírmalo con tu contador.</div></div>
    <div class="field"><label>Costo por devolución (× flete)</label><input id="aFac" type="number" step="any" inputmode="decimal" value="${c.factorDevolucion}"><div class="note">2 = pierdes el flete de ida y de vuelta.</div></div></div>
  <div class="card"><h3>Datos</h3><p class="sub">${window.Nube && Nube.activo ? 'Se guardan en tu cuenta y en este dispositivo.' : 'Viven en este navegador. Respáldalos seguido.'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bk">Descargar respaldo</button><button class="btn" id="rs">Restaurar</button><button class="btn" id="csv">Exportar pedidos (CSV)</button><input type="file" id="rsf" accept=".json" hidden></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" id="demo">Cargar ejemplo</button><button class="btn btn-del" id="wipe">Borrar todo</button></div></div>`;
  if (window.Nube) Nube.bind(el);
  const sv = () => { Object.assign(S.config, { nombre: $('#aNom').value.trim(), tc: num($('#aTc').value) || 3.75, igv: $('#aIgv').checked, renta: num($('#aRenta').value), factorDevolucion: num($('#aFac').value) }); Store.save(); toast('Guardado'); };
  ['aNom', 'aTc', 'aIgv', 'aRenta', 'aFac'].forEach(i => $('#' + i).onchange = sv);
  $('#bk').onclick = () => descargar('dropox-respaldo-' + hoy() + '.json', JSON.stringify(S, null, 2), 'application/json');
  $('#csv').onclick = exportCSV;
  $('#rs').onclick = () => $('#rsf').click();
  $('#rsf').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (!d.pedidos || !d.fijos) throw 0; ask('Esto reemplaza tus datos actuales. ¿Continuar?', () => { const b = DEFAULTS(); S = { ...b, ...d, config: { ...b.config, ...(d.config || {}) } }; Store.save(); render(); toast('Respaldo restaurado'); }); } catch (x) { toast('Archivo no válido'); } }); };
  $('#demo').onclick = () => ask('Se agregarán datos de ejemplo. ¿Continuar?', () => { cargarDemo(); Store.save(); toast('Ejemplo cargado'); go('dashboard'); });
  $('#wipe').onclick = () => ask('¿Borrar TODOS los datos? No se puede deshacer.', empezarLimpio, 'Borrar todo');
}
function empezarLimpio() { const cfg = S.config; S = DEFAULTS(); S.config = cfg; Store.save(); render(); }
function cargarDemo() {
  S.demo = true;
  S.fijos.push(
    { id: uid(), nombre: 'Alquiler oficina', categoria: 'Alquiler / Local', monto: 800, frecuencia: 'mensual', activo: true },
    { id: uid(), nombre: 'Contador', categoria: 'Contabilidad / Legal', monto: 250, frecuencia: 'mensual', activo: true },
    { id: uid(), nombre: 'Internet y luz', categoria: 'Servicios (luz, agua, internet)', monto: 180, frecuencia: 'mensual', activo: true },
    { id: uid(), nombre: 'Dominio', categoria: 'Software / Herramientas', monto: 90, frecuencia: 'anual', activo: true });
  const set = (n, v) => { const p = S.plataformas.find(x => x.nombre === n); if (p) p.valor = v; };
  set('Shopify', 130); set('Lumy', 99); set('Dropi', 1); set('Chatea Pro', 150); set('Meta Ads', 900); set('TikTok Ads', 300);
  S.ads = S.ads || [];
  for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() - i); const f = iso(d); S.ads.push({ id: uid(), fecha: f, plataforma: 'meta', gasto: 40 + (i * 7) % 25, pedidos: 2 + i % 3, ventas: 180 + (i * 23) % 120, campana: 'Conversiones' }, { id: uid(), fecha: f, plataforma: 'tiktok', gasto: 15 + (i * 5) % 14, pedidos: 1 + i % 2, ventas: 80 + (i * 17) % 70, campana: 'Video viral' }); }
  S.pub = S.pub || [];
  S.cuentas.push({ id: 'cta-demo-google', nombre: 'Google Ads tienda', plataforma: 'google', ref: '', predeterminada: true }, { id: 'cta-demo-crea', nombre: 'Agencia de creadores', plataforma: 'influencer', ref: '', predeterminada: false });
  for (let i = 0; i < 14; i += 3) { const d = new Date(); d.setDate(d.getDate() - i); S.pub.push({ id: uid(), fecha: iso(d), plataforma: 'google', cuentaId: 'cta-demo-google', gasto: 22 + i, pedidos: 1, ventas: 79, campana: 'Búsqueda' }); }
  S.pub.push({ id: uid(), fecha: hoy(), plataforma: 'influencer', cuentaId: 'cta-demo-crea', gasto: 150, pedidos: 3, ventas: 267, campana: 'Reel con creadora' });
  const ciu = ['Lima', 'Arequipa', 'Trujillo', 'Piura', 'Cusco', 'Chiclayo'], est = ['entregado', 'entregado', 'entregado', 'entregado', 'devuelto', 'entregado', 'enruta', 'pendiente'];
  for (let i = 0; i < 40; i++) { const d = new Date(); d.setDate(d.getDate() - Math.floor(i * 0.9)); S.pedidos.push({ id: uid(), fecha: iso(d), estado: i < 4 ? ['pendiente', 'enruta', 'enruta', 'pendiente'][i] : est[i % 8], producto: i % 2 ? 'Masajeador cervical' : 'Faja moldeadora', cliente: 'Cliente ' + (i + 1), telefono: '9' + String(10000000 + i * 137), ciudad: ciu[i % 6], canal: 'Tienda', cantidad: i % 5 === 0 ? 2 : 1, precio: i % 2 ? 99 : 79, costo: i % 2 ? 28 : 22, flete: 12, otros: 2 }); }
}

// ───────── Navegación ─────────
// ───────── Navegación ─────────
const GRUPOS = [
  ['Organización', [['tareas', 'Tareas diarias'], ['whatsapp', 'WhatsApp'], ['mensajes', 'Estructura de mensajes']]],
  ['Finanzas', [['dashboard', 'Dashboard'], ['calculadora', 'Calculadora'], ['pedidos', 'Pedidos'], ['gastos', 'Gastos'], ['gdia', 'Gastos diarios'], ['proyeccion', 'Proyección']]],
  ['Publicidad', [['meta', 'Meta Ads'], ['tiktok', 'TikTok Ads'], ['publicidad', 'Publicidad']]],
  ['Tienda', [['tienda', 'Landing / Tienda']]],
  ['Productos', [['radar', 'Radar diario'], ['investigacion', 'Investigación de mercado'], ['caza', 'Caza diaria'], ['prodtiktok', 'Productos TikTok']]],
  ['Descargadores', [['dlfb', 'Facebook'], ['dltt', 'TikTok']]],
  ['Shalom', [['shalom', 'Agencias Shalom'], ['shalompro', 'Puntos PRO'], ['shalomzonas', 'Públicos por zona']]],
];
const TABS = GRUPOS.flatMap(g => g[1]);
const NAV_ALIAS = { dropi: 'caza', aliclick: 'caza', descargar: 'dltt' };
let vista = (location.hash || '').slice(1);
function go(k) {
  vista = VIEWS[k] ? k : 'dashboard';
  try { if (location.hash.slice(1) !== vista) history.replaceState(null, '', '#' + vista); } catch (e) {}
  render(); scrollTo(0, 0);
}
const oscuro = () => S.config.tema === 'dark' || (S.config.tema === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) || (S.config.tema === 'auto' && document.documentElement.dataset.theme === 'dark');
function aplicarTema() {
  if (S.config.tema !== 'auto') document.documentElement.dataset.theme = S.config.tema;
  $('#tema').innerHTML = svg(oscuro() ? 'sol' : 'luna');
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = oscuro() ? '#0b0f17' : '#ffffff';
  document.querySelectorAll('#monSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === S.config.moneda));
}
function render() {
  asegurarCuentas();
  const key = VIEWS[vista] ? vista : 'dashboard';
  if (window.Tienda && JSON.stringify(Tienda.subitems()) !== menuSig) pintarMenu();
  marcarMenu(key);
  aplicarTema();
  const el = $('#view'); el.className = 'v-' + key; VIEWS[key](el);
  if (S.demo) { el.insertAdjacentHTML('afterbegin', '<div class="demo-bar"><span><b>Datos de ejemplo.</b> Así se ve tu panel con pedidos y gastos.</span><button class="btn btn-sm btn-pri" id="demoOut">Empezar con mis datos</button></div>'); $('#demoOut').onclick = () => ask('Se borrarán los datos de ejemplo para empezar en limpio.', empezarLimpio, 'Empezar limpio'); }
  countUp(el);
}
const CORTO = { tienda: 'Tienda', whatsapp: 'WhatsApp', mensajes: 'Mensajes', tareas: 'Tareas', shalomzonas: 'Zonas', dashboard: 'Panel', calculadora: 'Calcular', meta: 'Meta', tiktok: 'TikTok', publicidad: 'Publi.', radar: 'Radar', prodtiktok: 'Prod. TT', gdia: 'Diarios', shalom: 'Shalom', shalompro: 'PRO', descargar: 'Bajar', caza: 'Caza', dlfb: 'Facebook', dltt: 'TikTok', investigacion: 'Invest.', dropi: 'Dropi', aliclick: 'AliClick', proyeccion: 'Proyec.' };
// Menú con secciones fijables: la chincheta de cada sección la sube al grupo «Fijados» (se guarda en S.menuFijos).
const PIN_M = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7"/></svg>';
let menuSig = '';
function marcarMenu(key) {
  key = key || (VIEWS[vista] ? vista : 'dashboard');
  document.querySelectorAll('#tabs a').forEach(a => {
    if (a.dataset.tsub !== undefined) a.classList.toggle('on', key === 'tienda' && window.Tienda && Tienda.actual() === a.dataset.tsub);
    else a.classList.toggle('on', a.dataset.v === (NAV_ALIAS[key] || key) && !(key === 'tienda' && window.Tienda && Tienda.actual() !== ''));
  });
}
function pintarMenu() {
  menuSig = window.Tienda ? JSON.stringify(Tienda.subitems()) : '';
  const t = $('#tabs'), fj = (S.menuFijos = S.menuFijos || []).filter(k => TABS.some(x => x[0] === k));
  const ancla = ([k, l]) => `<a href="#${k}" data-v="${k}">${svg(k)}<span class="lg">${l}</span><span class="sh">${CORTO[k] || l}</span><span class="mpin ${fj.includes(k) ? 'on' : ''}" role="button" tabindex="0" data-pin="${k}" aria-pressed="${fj.includes(k)}" aria-label="${fj.includes(k) ? 'Quitar de fijados' : 'Fijar arriba'}" title="${fj.includes(k) ? 'Quitar de fijados' : 'Fijar arriba'}">${PIN_M}</span></a>`;
  const subs = k => (k === 'tienda' && window.Tienda ? Tienda.subitems().map(x => `<a href="#tienda" class="msub" data-v="tienda-sub" data-tsub="${x.id}" title="${esc(x.nombre)}"><span class="lg">${esc(x.nombre)} <small>${esc(x.detalle)}</small></span></a>`).join('') : '');
  const a = it => ancla(it) + subs(it[0]);
  const grupos = fj.length ? [['Fijados', fj.map(k => TABS.find(x => x[0] === k))]] : [];
  GRUPOS.forEach(([g, its]) => { const r = its.filter(x => !fj.includes(x[0])); if (r.length) grupos.push([g, r]); });
  const marca = t.querySelector('.dbrand');
  t.innerHTML = grupos.map(([g, its]) => `<div class="tg">${g}</div>` + its.map(a).join('')).join('');
  if (marca) t.prepend(marca);
  marcarMenu();
}
function alternarFijo(k) {
  const fj = (S.menuFijos = S.menuFijos || []), i = fj.indexOf(k);
  if (i < 0) fj.push(k); else fj.splice(i, 1);
  Store.save(); pintarMenu(); render(); toast(i < 0 ? 'Sección fijada arriba' : 'Sección quitada de fijados');
}
$('#tabs').addEventListener('click', e => { const sb = e.target.closest('a.msub'); if (sb && window.Tienda) Tienda.abrir(sb.dataset.tsub); });
$('#tabs').addEventListener('click', e => { const p = e.target.closest('.mpin'); if (p) { e.preventDefault(); e.stopImmediatePropagation(); alternarFijo(p.dataset.pin); } });
$('#tabs').addEventListener('keydown', e => { const p = e.target.closest && e.target.closest('.mpin'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopImmediatePropagation(); alternarFijo(p.dataset.pin); } });
pintarMenu();
$('#gear').innerHTML = svg('ajustes');
$('#fabIc').innerHTML = svg('chispa');
$('#tema').onclick = () => { S.config.tema = oscuro() ? 'light' : 'dark'; Store.save(); render(); };
document.querySelectorAll('#monSeg button').forEach(b => b.onclick = () => { S.config.moneda = b.dataset.m; Store.save(); render(); });
$('#fab').onclick = () => openInfo(`<h2>Asistente</h2><p class="sub" style="margin-top:-8px;color:var(--mut)">Lo que veo en tu negocio (${PERIODOS[S.config.periodo].toLowerCase()})</p>${alertasHtml(insights(analizar(S.config.periodo)))}`);
document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a) { e.preventDefault(); go(a.getAttribute('href').slice(1)); } });
window.addEventListener('hashchange', () => { vista = location.hash.slice(1); render(); scrollTo(0, 0); });
if (window.DROPOX_DEMO && !S.pedidos.length && !S.fijos.length) { S.config.nombre = S.config.nombre || 'Emprendedor'; cargarDemo(); Store.save(); }
render();
