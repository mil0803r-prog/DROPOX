/* Función de Vercel: sirve la tienda pública según el dominio con que entran (o /t/<tienda> para probar).
   Lee la configuración publicada desde Supabase (tabla «tiendas», lectura pública solo si está publicada). */
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';
const R = require('../tienda-render.js');

const cabeceras = { apikey: KEY_SB, Authorization: 'Bearer ' + KEY_SB };
async function buscar(filtro) {
  const r = await fetch(`${URL_SB}/rest/v1/tiendas?select=slug,config&publicada=eq.true&${filtro}&limit=1`, { headers: cabeceras, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j && j[0] ? j[0] : null;
}
const pagina = (t, m) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${t}</title><body style="font-family:system-ui;text-align:center;padding:70px 20px;color:#334155"><h1>${t}</h1><p>${m}</p></body>`;

module.exports = async (req, res) => {
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
    const q = req.query || {};
    const ruta = String(q.p || '').replace(/[^a-z0-9\-/]/gi, '');
    let fila = null, base = '', slugTienda = '';
    if (q.t && /^[a-z0-9-]{1,60}$/.test(q.t)) { fila = await buscar('slug=eq.' + encodeURIComponent(q.t)); base = '/t/' + q.t; slugTienda = q.t; }
    else if (host) {
      const alt = host.startsWith('www.') ? host.slice(4) : 'www.' + host;
      fila = await buscar('dominios=ov.' + encodeURIComponent(`{"${host}","${alt}"}`));
    }
    if (!fila) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); return res.send(pagina('Tienda no encontrada', 'Este dominio todavía no está conectado a una tienda.')); }
    slugTienda = slugTienda || fila.slug;
    const out = R.renderizar(Object.assign({}, fila.config, { slug: fila.slug }), ruta, { base, slugTienda, canon: host && !q.t ? `https://${host}${ruta ? '/' + ruta : '/'}` : '' });
    res.status(out.status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(out.html);
  } catch (e) {
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(pagina('Error', 'No se pudo cargar la tienda. Intenta de nuevo en un momento.'));
  }
};
