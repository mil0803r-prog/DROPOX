/* Función de Vercel: obtiene el enlace directo de un video público de TikTok (sin marca de agua) o de Facebook,
   y sirve el archivo para descargarlo. Solo acepta enlaces de esas plataformas y exige sesión iniciada. */
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';
const { Readable } = require('stream');

const HOSTS_TIKTOK = ['tiktok.com'];
const HOSTS_FB = ['facebook.com', 'fb.watch', 'fb.com'];
// servidores desde donde se permite bajar el archivo (evita que la función se use para llamar a cualquier sitio)
const HOSTS_MEDIA = ['tikwm.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'tiktokv.us', 'byteoversea.com', 'ibytedtos.com', 'muscdn.com', 'fbcdn.net', 'facebook.com'];
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

const hostOk = (host, lista) => lista.some(h => host === h || host.endsWith('.' + h));
function analizar(u) {
  let x; try { x = new URL(u); } catch (e) { return null; }
  if (x.protocol !== 'https:' && x.protocol !== 'http:') return null;
  x.protocol = 'https:';
  return x;
}
async function sesionValida(token) { return require('./_acceso').validar(token); }
const decodificar = s => s.replace(/\\u0025/g, '%').replace(/\\u0026/g, '&').replace(/\\u003C/gi, '<').replace(/\\\//g, '/').replace(/\\"/g, '"').replace(/&amp;/g, '&');

async function deTikTok(url) {
  const r = await fetch('https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => null);
  if (!j || j.code !== 0 || !j.data) throw new Error((j && j.msg) || 'No se pudo leer el video de TikTok.');
  const d = j.data, abs = u => (u ? (u.startsWith('http') ? u : 'https://www.tikwm.com' + u) : '');
  const opciones = [];
  if (d.hdplay) opciones.push({ etiqueta: 'Video HD sin marca de agua', url: abs(d.hdplay), tipo: 'mp4', nombre: 'tiktok-hd' });
  if (d.play) opciones.push({ etiqueta: 'Video sin marca de agua', url: abs(d.play), tipo: 'mp4', nombre: 'tiktok' });
  if (d.music) opciones.push({ etiqueta: 'Solo el audio', url: abs(d.music), tipo: 'mp3', nombre: 'tiktok-audio' });
  if (Array.isArray(d.images) && d.images.length) d.images.forEach((im, i) => opciones.push({ etiqueta: 'Imagen ' + (i + 1), url: abs(im), tipo: 'jpg', nombre: 'tiktok-img-' + (i + 1) }));
  if (!opciones.length) throw new Error('El video no tiene enlaces disponibles.');
  return { plataforma: 'TikTok', titulo: d.title || '', autor: d.author ? (d.author.nickname || d.author.unique_id || '') : '', portada: abs(d.cover || d.origin_cover), opciones };
}

async function deFacebook(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-PE,es;q=0.9', Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  const html = await r.text();
  const hallar = re => { const m = re.exec(html); return m ? decodificar(m[1]) : ''; };
  const hd = hallar(/"(?:browser_native_hd_url|playable_url_quality_hd|hd_src)"\s*:\s*"([^"]+)"/) || hallar(/hd_src_no_ratelimit"\s*:\s*"([^"]+)"/);
  const sd = hallar(/"(?:browser_native_sd_url|playable_url|sd_src)"\s*:\s*"([^"]+)"/) || hallar(/<meta property="og:video(?::secure_url)?" content="([^"]+)"/);
  const opciones = [];
  if (hd) opciones.push({ etiqueta: 'Video HD', url: hd, tipo: 'mp4', nombre: 'facebook-hd' });
  if (sd && sd !== hd) opciones.push({ etiqueta: 'Video calidad normal', url: sd, tipo: 'mp4', nombre: 'facebook' });
  if (!opciones.length) throw new Error('No pude leer ese video de Facebook. Tiene que ser público (no privado ni de un grupo cerrado) y el enlace debe ser de un video o reel.');
  return { plataforma: 'Facebook', titulo: hallar(/<meta property="og:title" content="([^"]*)"/) || '', autor: '', portada: hallar(/<meta property="og:image" content="([^"]+)"/), opciones };
}

async function bajar(req, res, destino, nombre, tipo) {
  const x = analizar(destino);
  if (!x || !hostOk(x.hostname, HOSTS_MEDIA)) return res.status(400).json({ error: 'Enlace de descarga no permitido.' });
  let actual = x, r;
  for (let i = 0; i < 4; i++) { // sigue redirecciones a mano para revisar cada destino
    r = await fetch(actual, { headers: { 'User-Agent': UA, Referer: 'https://www.tikwm.com/' }, redirect: 'manual', signal: AbortSignal.timeout(25000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const sig = analizar(new URL(r.headers.get('location'), actual).href);
      if (!sig || !hostOk(sig.hostname, HOSTS_MEDIA)) return res.status(400).json({ error: 'Redirección no permitida.' });
      actual = sig; continue;
    }
    break;
  }
  if (!r.ok || !r.body) return res.status(502).json({ error: 'No se pudo bajar el archivo. Genera el enlace de nuevo.' });
  const ext = ['mp4', 'mp3', 'jpg'].includes(tipo) ? tipo : 'mp4';
  const mime = { mp4: 'video/mp4', mp3: 'audio/mpeg', jpg: 'image/jpeg' }[ext];
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${String(nombre || 'video').replace(/[^\w.-]/g, '').slice(0, 40) || 'video'}.${ext}"`);
  const largo = r.headers.get('content-length'); if (largo) res.setHeader('Content-Length', largo);
  Readable.fromWeb(r.body).pipe(res);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Inicia sesión para usar el descargador.' });
  if (!(await sesionValida(token))) return res.status(401).json({ error: 'Tu sesión venció. Vuelve a entrar.' });
  const q = req.query || {};
  try {
    if (q.bajar) return await bajar(req, res, String(q.bajar), q.nombre, q.tipo);
    const x = analizar(String(q.url || '').trim());
    if (!x) return res.status(400).json({ error: 'Pega un enlace válido.' });
    if (hostOk(x.hostname, HOSTS_TIKTOK)) return res.status(200).json(await deTikTok(x.href));
    if (hostOk(x.hostname, HOSTS_FB)) return res.status(200).json(await deFacebook(x.href));
    return res.status(400).json({ error: 'Solo acepto enlaces de TikTok y de Facebook.' });
  } catch (e) {
    console.error('descargar', String((e && e.message) || e).slice(0, 200));
    return res.status(502).json({ error: (e && e.message && e.message.length < 200) ? e.message : 'No se pudo leer el enlace. Intenta de nuevo.' });
  }
};
