/* Función de Vercel: importa una landing desde una dirección (URL) y la devuelve ya ordenada para crear un producto.
   - Solo con sesión iniciada con uno de los correos permitidos (se valida el token, igual que las demás funciones).
   - Seguridad: solo http(s), sin usuario/clave, sin direcciones internas (localhost, redes privadas, metadatos de la nube),
     redirecciones revisadas una a una, tiempo máximo y tamaño máximo. */
const dns = require('dns').promises;
const net = require('net');
const { validar } = require('./_acceso');

const MAX_BYTES = 4 * 1024 * 1024;
const privada = ip => {
  if (net.isIPv6(ip)) { const x = ip.toLowerCase(); return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb') || x.startsWith('::ffff:') && privada(x.slice(7)); }
  const p = ip.split('.').map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
};
async function seguro(u) {
  const url = new URL(u);
  if (!/^https?:$/.test(url.protocol)) throw new Error('Solo se aceptan direcciones http o https.');
  if (url.username || url.password) throw new Error('La dirección no puede llevar usuario ni clave.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error('Esa dirección no está permitida.');
  const ips = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!ips.length || ips.some(a => privada(a.address))) throw new Error('Esa dirección no está permitida.');
  return url;
}
async function bajar(u) {
  let url = await seguro(u);
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'es-PE,es;q=0.9' } });
    if ([301, 302, 303, 307, 308].includes(r.status)) { const l = r.headers.get('location'); if (!l) throw new Error('Redirección inválida.'); url = await seguro(new URL(l, url).href); continue; }
    if (!r.ok) throw new Error('La página respondió con error ' + r.status + '.');
    if (!/text\/html|application\/xhtml/i.test(r.headers.get('content-type') || '')) throw new Error('Esa dirección no es una página web.');
    const chunks = []; let n = 0; const rd = r.body.getReader();
    for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > MAX_BYTES) { try { await rd.cancel(); } catch (e) {} throw new Error('La página es demasiado grande (máximo 4 MB).'); } chunks.push(value); }
    return { html: Buffer.concat(chunks).toString('utf8'), url: url.href };
  }
  throw new Error('Demasiadas redirecciones.');
}

// ───────── Lectura de la página ─────────
const dec = s => String(s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (a, c) => String.fromCharCode(+c)).replace(/&#x([0-9a-f]+);/gi, (a, c) => String.fromCharCode(parseInt(c, 16)));
const txt = s => dec(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const abs = (s, base) => { try { s = String(s || '').trim(); if (!s || /^(data:|javascript:|#)/i.test(s)) return ''; return new URL(s, base).href; } catch (e) { return ''; } };
const attr = (tag, n) => { const m = tag.match(new RegExp('\\b' + n + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i')); return m ? dec(m[2] != null ? m[2] : m[3]) : ''; };
const primeroDe = ss => String(ss || '').split(',')[0].trim().split(/\s+/)[0];
const imgSrc = (tag, base) => abs(attr(tag, 'src') || attr(tag, 'data-src') || attr(tag, 'data-lazy-src') || primeroDe(attr(tag, 'srcset')), base);
const util = (tag, src) => {
  if (!src || /\.svg(\?|$)/i.test(src) || /(logo|icon|avatar|sprite|pixel|tracking|favicon)/i.test(src + ' ' + attr(tag, 'alt') + ' ' + attr(tag, 'class'))) return false;
  const w = parseInt(attr(tag, 'width')), h = parseInt(attr(tag, 'height'));
  return !((w && w < 120) || (h && h < 120));
};

function parsear(html, base) {
  const h = html.replace(/<!--[\s\S]*?-->/g, '');
  const meta = n => { const m = h.match(new RegExp('<meta\\b[^>]*(?:property|name)\\s*=\\s*["\']' + n + '["\'][^>]*>', 'i')); return m ? attr(m[0], 'content') : ''; };
  // datos estructurados del producto
  let ld = null;
  for (const m of h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const j = JSON.parse(m[1]); const arr = Array.isArray(j) ? j : j['@graph'] || [j]; const p = arr.find(x => x && /Product/i.test([].concat(x['@type'] || []).join(','))); if (p) { ld = p; break; } } catch (e) {}
  }
  const ldOferta = ld && (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers);
  const titulo = txt(meta('og:title') || (ld && ld.name) || (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const descripcion = txt(meta('og:description') || meta('description') || (ld && ld.description) || '');
  let precio = parseFloat(meta('product:price:amount') || (ldOferta && (ldOferta.price || ldOferta.lowPrice)) || '');
  const moneda = meta('product:price:currency') || (ldOferta && ldOferta.priceCurrency) || '';
  // cuerpo sin ruido
  let b = (h.match(/<body\b[\s\S]*<\/body>/i) || [h])[0].replace(/<(script|style|svg|noscript|template|iframe|dialog|form|nav|footer)\b[\s\S]*?<\/\1>/gi, ' ');
  // preguntas frecuentes (details/summary)
  const faq = [];
  for (const m of b.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)) { const q = txt(m[1]).replace(/\s*[+\-–]\s*$/, ''), a = txt(m[2]); if (q && a) faq.push([q, a]); }
  b = b.replace(/<details\b[\s\S]*?<\/details>/gi, ' ');
  // recorrido en orden: imágenes, títulos y textos
  const seq = [], vistas = new Set();
  for (const m of b.matchAll(/<img\b[^>]*>|<(h1|h2|h3|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (/^<img/i.test(m[0])) { const src = imgSrc(m[0], base); if (util(m[0], src) && !vistas.has(src)) { vistas.add(src); seq.push({ tipo: 'imagen', img: src }); } }
    else { const t = txt(m[2]); if (!t) continue; if (/^h/i.test(m[1])) seq.push({ tipo: m[1].toLowerCase() === 'h1' ? 'h1' : 'titulo', x: t.slice(0, 160) }); else if (t.length >= 25) seq.push({ tipo: 'texto', x: t.slice(0, 600) }); }
  }
  const iH2 = seq.findIndex(x => x.tipo === 'titulo');
  const antes = iH2 < 0 ? seq : seq.slice(0, iH2), despues = iH2 < 0 ? [] : seq.slice(iH2);
  const galeria = [];
  const poner = u => { if (u && !galeria.includes(u)) galeria.push(u); };
  [].concat((ld && ld.image) || []).map(i => abs(typeof i === 'string' ? i : i && i.url, base)).forEach(poner);
  poner(abs(meta('og:image') || meta('twitter:image'), base));
  antes.filter(x => x.tipo === 'imagen').forEach(x => poner(x.img));
  const contenido = (iH2 < 0 ? antes.filter(x => x.tipo !== 'h1') : despues).filter(x => x.tipo !== 'h1').slice(0, 40).map(x => (x.tipo === 'imagen' ? { tipo: 'imagen', img: x.img } : x));
  const h1 = (seq.find(x => x.tipo === 'h1') || {}).x || '';
  if (!(precio > 0)) { const mm = txt(b).match(/(?:S\/\.?|Q|\$|USD|PEN|GTQ)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/); if (mm) precio = parseFloat(mm[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')); }
  return { titulo: titulo || h1, h1, descripcion, precio: precio > 0 ? precio : 0, moneda, imagenes: galeria.slice(0, 10), contenido, faq: faq.slice(0, 15) };
}

// copia exacta: el HTML y el CSS de la página con las direcciones completas
function copiar(html, base) {
  const h = html.replace(/<!--[\s\S]*?-->/g, '');
  const estilos = [];
  for (const m of h.matchAll(/<link\b[^>]*rel\s*=\s*["']?stylesheet[^>]*>/gi)) { const u = abs(attr(m[0], 'href'), base); if (u && estilos.length < 6) estilos.push('@import url("' + u + '");'); }
  let css = estilos.join('\n') + '\n' + [...h.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
  css = css.replace(/@charset[^;]*;/gi, '').replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^)'"]+)\1\s*\)/gi, (a, q, u) => 'url("' + abs(u, base) + '")');
  let body = (h.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [0, h])[1].replace(/<(script|noscript|iframe|dialog|template)\b[\s\S]*?<\/\1>/gi, '');
  body = body.replace(/\s(src|href|poster|data-src)\s*=\s*("([^"]*)"|'([^']*)')/gi, (a, n, v, d, s) => { const u = abs(d != null ? d : s, base); return u ? ' ' + (n.toLowerCase() === 'data-src' ? 'src' : n) + '="' + u.replace(/"/g, '&quot;') + '"' : (n.toLowerCase() === 'href' ? ' href="#"' : a); })
    .replace(/\ssrcset\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/\sloading\s*=\s*("lazy"|'lazy')/gi, ' loading="lazy"');
  return { html: body.slice(0, 450000), css: css.slice(0, 450000) };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !(await validar(token))) return res.status(401).json({ ok: false, error: 'Inicia sesión para importar.' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const u = String(b.url || '').trim();
    if (!u || u.length > 2000) return res.status(400).json({ ok: false, error: 'Escribe la dirección de la página.' });
    const { html, url } = await bajar(/^https?:\/\//i.test(u) ? u : 'https://' + u);
    const datos = parsear(html, url);
    const copia = b.copia ? copiar(html, url) : null;
    return res.json({ ok: true, url, ...datos, copia });
  } catch (e) {
    const m = String(e && e.message || e);
    return res.status(400).json({ ok: false, error: /fetch failed|ENOTFOUND|EAI_AGAIN/i.test(m) ? 'No se pudo abrir esa dirección. Revisa que esté bien escrita.' : /aborted|timeout/i.test(m) ? 'La página tardó demasiado en responder.' : m });
  }
};
module.exports.parsear = parsear; module.exports.copiar = copiar; module.exports.privada = privada; module.exports.seguro = seguro;
