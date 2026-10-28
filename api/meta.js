/* Función de Vercel: lee la cuenta publicitaria de Meta (solo lectura) y devuelve campañas, conjuntos y anuncios con sus métricas.
   El token vive solo en la variable de entorno META_ACCESS_TOKEN (Vercel > Settings > Environment Variables). */
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';
const VERSION = process.env.META_API_VERSION || 'v23.0';
const CUENTA = String(process.env.META_AD_ACCOUNT_ID || '1226449025709907').replace(/^act_/i, '').replace(/\D/g, '');
const GRAPH = `https://graph.facebook.com/${VERSION}`;

const CAMPOS = 'spend,impressions,reach,frequency,clicks,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,ctr,cpc,cpm,actions,action_values,purchase_roas';
const COMPRA = ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];
const MENSAJE = ['onsite_conversion.messaging_conversation_started_7d'];

const num = x => { const n = parseFloat(x); return Number.isFinite(n) ? n : 0; };
const accion = (arr, tipos) => { for (const t of tipos) { const f = (arr || []).find(a => a.action_type === t); if (f) return num(f.value); } return 0; };
const centavos = x => (x === undefined || x === null || x === '' ? null : num(x) / 100);

function metricas(r) {
  const gasto = num(r.spend), compras = accion(r.actions, COMPRA), valor = accion(r.action_values, COMPRA), msj = accion(r.actions, MENSAJE);
  const roas = accion(r.purchase_roas, COMPRA) || (gasto > 0 && valor > 0 ? valor / gasto : 0);
  return {
    gasto, impresiones: num(r.impressions), alcance: num(r.reach), frecuencia: num(r.frequency),
    clics: num(r.clicks), clics_enlace: num(r.inline_link_clicks), ctr_enlace: num(r.inline_link_click_ctr), cpc_enlace: num(r.cost_per_inline_link_click),
    ctr: num(r.ctr), cpc: num(r.cpc), cpm: num(r.cpm),
    compras, valor_compras: valor, costo_compra: compras > 0 ? gasto / compras : null, roas: roas || null,
    mensajes: msj, costo_mensaje: msj > 0 ? gasto / msj : null,
  };
}
const VACIO = () => metricas({});

async function sesionValida(token) { return require('./_acceso').validar(token); }

async function graph(ruta, params, tokenMeta) {
  let url = new URL(GRAPH + ruta);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  const filas = [];
  for (let i = 0; i < 10 && url; i++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${tokenMeta}` }, signal: AbortSignal.timeout(20000) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) { const e = new Error((d.error && d.error.message) || 'Error de Meta'); e.code = d.error && d.error.code; e.status = r.status; throw e; }
    if (!Array.isArray(d.data)) return d;
    filas.push(...d.data);
    url = d.paging && d.paging.next ? new URL(d.paging.next) : null;
  }
  return filas;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ESTADOS_OK = new Set(['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'DELETED', 'WITH_ISSUES', 'IN_PROCESS', 'PENDING_REVIEW', 'DISAPPROVED']);

function errorMeta(res, e) {
  console.error('Meta error', e && e.code, e && e.status, String((e && e.message) || '').slice(0, 300));
  if (e && e.code === 190) return res.status(502).json({ error: 'El token de Meta venció o no es válido. Genera uno nuevo y guárdalo en Vercel.', falta: 'token' });
  if (e && (e.code === 200 || e.code === 10 || e.code === 100)) return res.status(502).json({ error: 'El token no tiene permiso para esta cuenta publicitaria. Revisa que el usuario del sistema tenga la cuenta asignada.' });
  if (e && [4, 17, 32, 613].includes(e.code)) return res.status(429).json({ error: 'Meta limitó las consultas por un momento. Intenta de nuevo en un minuto.' });
  return res.status(502).json({ error: 'No se pudo leer Meta. Intenta de nuevo.' });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  const tokenMeta = process.env.META_ACCESS_TOKEN;
  if (!tokenMeta) return res.status(503).json({ error: 'Meta todavía no está conectado.', falta: 'token' });

  const sesion = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!sesion) return res.status(401).json({ error: 'Inicia sesión para ver Meta Ads.' });
  if (!(await sesionValida(sesion))) return res.status(401).json({ error: 'Tu sesión venció. Vuelve a entrar.' });

  const q = req.query || {};
  const desde = String(q.desde || ''), hasta = String(q.hasta || '');
  if (!FECHA.test(desde) || !FECHA.test(hasta) || desde > hasta) return res.status(400).json({ error: 'Fechas no válidas.' });
  if ((Date.parse(hasta) - Date.parse(desde)) / 864e5 > 400) return res.status(400).json({ error: 'El rango es demasiado largo.' });
  const rango = { since: desde, until: hasta };
  const act = `/act_${CUENTA}`;

  try {
    // detalle por día de una campaña, conjunto o anuncio
    if (q.fila) {
      const m = /^(campaign|adset|ad):(\d{5,30})$/.exec(String(q.fila));
      if (!m) return res.status(400).json({ error: 'Fila no válida.' });
      const filas = await graph(`${act}/insights`, { level: m[1], fields: CAMPOS, time_range: rango, time_increment: 1, filtering: [{ field: `${m[1]}.id`, operator: 'IN', value: [m[2]] }], limit: 500 }, tokenMeta);
      return res.status(200).json({ dias: filas.map(f => ({ fecha: f.date_start, ...metricas(f) })).sort((a, b) => a.fecha.localeCompare(b.fecha)) });
    }

    const diario = graph(`${act}/insights`, { level: 'account', fields: CAMPOS, time_range: rango, time_increment: 1, limit: 500 }, tokenMeta);
    if (q.solo === 'dias') {
      const filas = await diario;
      return res.status(200).json({ cuenta: { id: CUENTA }, dias: filas.map(f => ({ fecha: f.date_start, ...metricas(f) })).sort((a, b) => a.fecha.localeCompare(b.fecha)) });
    }

    const [info, camps, sets, ads, iCamp, iSet, iAd, dias] = await Promise.all([
      graph(act, { fields: 'name,currency,account_status,timezone_name' }, tokenMeta),
      graph(`${act}/campaigns`, { fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time', limit: 200 }, tokenMeta),
      graph(`${act}/adsets`, { fields: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,start_time,end_time,created_time', limit: 200 }, tokenMeta),
      graph(`${act}/ads`, { fields: 'id,name,adset_id,campaign_id,status,effective_status,created_time', limit: 200 }, tokenMeta),
      graph(`${act}/insights`, { level: 'campaign', fields: 'campaign_id,' + CAMPOS, time_range: rango, limit: 500 }, tokenMeta),
      graph(`${act}/insights`, { level: 'adset', fields: 'adset_id,' + CAMPOS, time_range: rango, limit: 500 }, tokenMeta),
      graph(`${act}/insights`, { level: 'ad', fields: 'ad_id,' + CAMPOS, time_range: rango, limit: 500 }, tokenMeta),
      diario,
    ]);
    const por = (filas, k) => Object.fromEntries(filas.map(f => [f[k], metricas(f)]));
    const mC = por(iCamp, 'campaign_id'), mS = por(iSet, 'adset_id'), mA = por(iAd, 'ad_id');
    const estado = e => (ESTADOS_OK.has(e.effective_status) ? e.effective_status : String(e.effective_status || e.status || ''));
    const anuncios = ads.map(a => ({ id: a.id, nombre: a.name, conjunto_id: a.adset_id, campana_id: a.campaign_id, estado: estado(a), creado: a.created_time || null, m: mA[a.id] || VACIO() }));
    const conjuntos = sets.map(s => ({
      id: s.id, nombre: s.name, campana_id: s.campaign_id, estado: estado(s), optimizacion: s.optimization_goal || null,
      presupuesto_diario: centavos(s.daily_budget), presupuesto_total: centavos(s.lifetime_budget), inicio: s.start_time || null, fin: s.end_time || null,
      m: mS[s.id] || VACIO(), anuncios: anuncios.filter(a => a.conjunto_id === s.id),
    }));
    const campanas = camps.map(c => ({
      id: c.id, nombre: c.name, estado: estado(c), objetivo: c.objective || null,
      presupuesto_diario: centavos(c.daily_budget), presupuesto_total: centavos(c.lifetime_budget), inicio: c.start_time || null, fin: c.stop_time || null, creada: c.created_time || null,
      m: mC[c.id] || VACIO(), conjuntos: conjuntos.filter(s => s.campana_id === c.id),
    }));
    return res.status(200).json({
      cuenta: { id: CUENTA, nombre: info.name || '', moneda: info.currency || '', zona: info.timezone_name || '' },
      desde, hasta,
      campanas,
      dias: dias.map(f => ({ fecha: f.date_start, ...metricas(f) })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    });
  } catch (e) {
    return errorMeta(res, e);
  }
};
