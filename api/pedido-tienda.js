/* Función de Vercel: recibe el pedido contraentrega de la tienda pública y lo guarda en Supabase (tabla «tienda_pedidos»).
   El precio se recalcula aquí con la configuración publicada; nunca se confía en lo que manda el navegador. */
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';
const R = require('../tienda-render.js');
const H = { apikey: KEY_SB, Authorization: 'Bearer ' + KEY_SB, 'Content-Type': 'application/json' };
const lim = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (b.web) return res.json({ ok: true, total: 0 }); // trampa para bots
    const slug = lim(b.t, 60), prodSlug = lim(b.producto, 90);
    if (!/^[a-z0-9-]+$/.test(slug) || !R.slugOk(prodSlug)) return res.status(400).json({ ok: false, error: 'Pedido no válido.' });
    const nombre = lim(b.nombre, 60), apellido = lim(b.apellido, 60), tel = lim(b.telefono, 20), depto = lim(b.departamento, 40), ciudad = lim(b.ciudad, 60), dir = lim(b.direccion, 200), ref = lim(b.referencia, 200);
    if (!nombre || !dir || !ciudad || !R.DEPTOS.includes(depto) || tel.replace(/\D/g, '').length < 8) return res.status(400).json({ ok: false, error: 'Completa nombre, teléfono, departamento, ciudad y dirección.' });
    const r = await fetch(`${URL_SB}/rest/v1/tiendas?select=config&publicada=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`, { headers: H, signal: AbortSignal.timeout(8000) });
    const fila = r.ok ? (await r.json())[0] : null;
    const prod = fila && R.activos(fila.config).find(p => p.slug === prodSlug);
    if (!prod) return res.status(404).json({ ok: false, error: 'Producto no disponible.' });
    const x = R.precios(fila.config, prod), cant = b.qty == 2 && x.c2 ? 2 : 1, sub = cant === 2 ? x.c2 : x.pr;
    const env = (fila.config.envio && fila.config.envio.gratis === false) ? Number(fila.config.envio.costo) || 0 : 0, total = Math.round((sub + env) * 100) / 100;
    const fila_ = { slug, datos: { producto: prod.nombre, productoSlug: prodSlug, cantidad: cant, precioUnit: cant === 2 ? Math.round(x.c2 / 2 * 100) / 100 : x.pr, envio: env, total, moneda: (fila.config.pais || {}).codigo || 'GTQ', nombre: (nombre + ' ' + apellido).trim(), telefono: tel, departamento: depto, ciudad, direccion: dir, referencia: ref, origen: lim(req.headers.referer, 200) } };
    const ins = await fetch(`${URL_SB}/rest/v1/tienda_pedidos`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(fila_), signal: AbortSignal.timeout(8000) });
    if (!ins.ok) return res.status(502).json({ ok: false, error: 'No pudimos guardar tu pedido. Intenta de nuevo en un momento.' });
    return res.json({ ok: true, total });
  } catch (e) { return res.status(500).json({ ok: false, error: 'No se pudo enviar el pedido.' }); }
};
