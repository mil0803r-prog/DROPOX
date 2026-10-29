'use strict';
/* DROPOX — motor de la tienda pública (estilo millora.shop: portada con promo y productos, página de producto con galería,
   ofertas por cantidad, garantía, pasos de entrega, reseñas, FAQ y pedido contraentrega en ventana).
   Se usa en dos sitios: la función api/tienda.js (la tienda real en tu dominio) y la vista previa de la sección Landing / Tienda. */
(function (root) {
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
  // solo enlaces https o rutas propias (evita javascript: y similares)
  const url = u => { u = String(u || '').trim(); return /^(https:\/\/|\/)/i.test(u) ? esc(u) : ''; };
  const color = (c, d) => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : d;
  const fuente = f => String(f || '').replace(/[^A-Za-z0-9 ]/g, '').slice(0, 40) || 'Inter';
  const id = v => String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const slugOk = s => /^[a-z0-9][a-z0-9-]{0,80}$/.test(String(s || ''));

  const DEPTOS = ['Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'];

  // Estilos de partida. «classic» = página de producto de millora.shop; «tienda» = su portada.
  const PRESETS = {
    classic: { fuente: 'Playfair Display', acento: '#b38d4a', boton: '#b07b1f', botonTxt: '#ffffff', fondo: '#f7f2ea', texto: '#1a1a2e', precio: '#16a34a', tachado: '#e11d48', radio: 12, grano: true },
    tienda: { fuente: 'Baloo 2', acento: '#2563eb', boton: '#374151', botonTxt: '#ffffff', fondo: '#fffaf0', texto: '#1e293b', precio: '#16a34a', tachado: '#e11d48', radio: 12, grano: false },
    rosa: { fuente: 'Nunito', acento: '#e11d48', boton: '#be123c', botonTxt: '#ffffff', fondo: '#fff5f7', texto: '#3b0d1c', precio: '#16a34a', tachado: '#9f1239', radio: 16, grano: false },
    oscuro: { fuente: 'Inter', acento: '#f59e0b', boton: '#f59e0b', botonTxt: '#111827', fondo: '#0f172a', texto: '#f1f5f9', precio: '#34d399', tachado: '#fb7185', radio: 12, grano: false },
  };

  const q = (cfg, p) => {
    const m = (cfg.pais && cfg.pais.moneda) || 'Q';
    return m + '\u00a0' + n(p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const pctOff = (was, now) => was > now && was > 0 ? Math.round((was - now) / was * 100) : 0;

  // Precio de 1 y de 2 unidades. Si el producto no trae precio de combo, se aplica el descuento global de la promo.
  function precios(cfg, p) {
    const promo = cfg.promo || {}, pr = n(p.precio), tach = n(p.tachado) > pr ? n(p.tachado) : 0;
    let c2 = n(p.combo2);
    if (!c2 && promo.activa && n(promo.descuento) > 0) c2 = Math.round(pr * 2 * (1 - n(promo.descuento) / 100) * 100) / 100;
    if (c2 && c2 >= pr * 2) c2 = 0;
    return { pr, tach, c2, ahorro1: tach ? tach - pr : 0, pct1: pctOff(tach, pr), base2: (tach || pr) * 2, pct2c: c2 ? pctOff(pr * 2, c2) : 0 };
  }
  const activos = cfg => (cfg.productos || []).filter(p => p && p.activo !== false && slugOk(p.slug));

  // ───────── CSS ─────────
  function css(cfg) {
    const d = cfg.diseno || {}, base = PRESETS.classic;
    const f = fuente(d.fuente || base.fuente), ac = color(d.acento, base.acento), bt = color(d.boton, base.boton), btx = color(d.botonTxt, '#ffffff');
    const fondo = color(d.fondo, base.fondo), tx = color(d.texto, base.texto), pc = color(d.precio, base.precio), wc = color(d.tachado, base.tachado);
    const r = Math.max(0, Math.min(28, n(d.radio) || 12)), w = Math.max(420, Math.min(1100, n(d.ancho) || 500));
    return `:root{--ac:${ac};--bt:${bt};--btx:${btx};--bg:${fondo};--tx:${tx};--pc:${pc};--wc:${wc};--r:${r}px;--w:${w}px;--font:'${f}',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;--line:color-mix(in srgb,var(--tx) 14%,transparent);--soft:color-mix(in srgb,var(--ac) 9%,transparent);--card:color-mix(in srgb,var(--bg) 82%,#fff)}
*{box-sizing:border-box;margin:0;padding:0}html{background:var(--bg);-webkit-text-size-adjust:100%}
body{font-family:var(--font);color:var(--tx);background:var(--bg);line-height:1.5;-webkit-font-smoothing:antialiased;padding-bottom:84px}
${d.grano ? `body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.05;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>")}` : ''}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}button{font:inherit;cursor:pointer}
.wrap{max-width:var(--w);margin:0 auto;min-height:100vh}.pad{padding:0 16px}
@keyframes up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:none}}@keyframes pop{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:none}}
@keyframes shine{0%{transform:translateX(-120%)}60%,100%{transform:translateX(220%)}}
.pad>*{animation:up .5s ease both}.pad>:nth-child(2){animation-delay:.05s}.pad>:nth-child(3){animation-delay:.1s}.pad>:nth-child(4){animation-delay:.15s}
.annbar{background:var(--tx);color:var(--bg);font-size:12.5px;font-weight:600;text-align:center;padding:8px 12px}
.ann-row{display:flex;flex-wrap:wrap;justify-content:center;gap:2px 10px}.ann-sep{opacity:.5}
.top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px}
.top img{height:34px;width:auto;border-radius:8px}.top b{font-size:18px}
.vf{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--pc);background:color-mix(in srgb,var(--pc) 12%,transparent);padding:4px 10px;border-radius:99px}
.hero-s{text-align:center;padding:10px 16px 6px}.hero-s img.lg{width:104px;height:104px;object-fit:cover;border-radius:50%;margin:6px auto 10px;border:3px solid var(--card);box-shadow:0 6px 20px #0002}
.hero-s h1{font-size:26px;font-weight:800;line-height:1.15}.hero-s p.lm{margin-top:6px;font-size:15px;opacity:.85}
.pill{display:inline-block;font-size:12px;font-weight:700;padding:5px 12px;border-radius:99px;background:var(--soft);color:var(--ac);border:1px solid color-mix(in srgb,var(--ac) 28%,transparent);margin-bottom:8px}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:14px 0}.chips span,.badge{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:7px 12px;border-radius:99px;background:var(--card);border:1px solid var(--line)}
.chips i,.badge i{font-style:normal;color:var(--pc);font-weight:800}
.promo{margin:10px 16px;padding:16px;border-radius:var(--r);background:var(--soft);border:1px dashed color-mix(in srgb,var(--ac) 45%,transparent);text-align:center}
.promo h2{font-size:18px;font-weight:800}.promo .big{display:inline-block;margin:8px 0 4px;background:var(--ac);color:#fff;font-weight:800;padding:6px 14px;border-radius:99px;font-size:15px}.promo p{font-size:13px;opacity:.8}
.cats{display:flex;gap:8px;overflow-x:auto;padding:10px 16px;scrollbar-width:none}.cats::-webkit-scrollbar{display:none}
.cats button{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--tx);padding:8px 16px;border-radius:99px;font-weight:700;font-size:14px}.cats button.on{background:var(--ac);color:#fff;border-color:var(--ac)}
h2.sec{font-size:22px;font-weight:800;padding:8px 16px 4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:8px 16px 20px}
@media(min-width:760px){.grid{grid-template-columns:repeat(3,1fr)}}
.pc{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;position:relative}
.pc .im{aspect-ratio:1/1;background:var(--soft);overflow:hidden}.pc .im img{width:100%;height:100%;object-fit:cover}
.pc .bd{padding:10px 11px 12px;display:flex;flex-direction:column;gap:3px;flex:1}
.pc h3{font-size:14px;font-weight:700;line-height:1.25}.pc .st{font-size:12px;color:#f59e0b;font-weight:700}.pc .st small{color:var(--tx);opacity:.6;font-weight:600}
.pc .pr{font-size:15px;font-weight:800;color:var(--pc)}.pc .pr s{font-size:12px;font-weight:600;color:var(--wc);opacity:.8;margin-right:5px}
.pc .sv{font-size:12px;font-weight:700;color:var(--pc)}.pc .lv{font-size:12px;opacity:.75}
.tagp{position:absolute;top:8px;left:8px;z-index:2;background:var(--wc);color:#fff;font-size:11.5px;font-weight:800;padding:3px 8px;border-radius:99px}
.tagn{position:absolute;top:8px;right:8px;z-index:2;background:var(--tx);color:var(--bg);font-size:11px;font-weight:800;padding:3px 8px;border-radius:99px}
.vo{margin-top:auto;display:block;text-align:center;background:var(--bt);color:var(--btx);font-weight:800;font-size:13.5px;padding:9px;border-radius:calc(var(--r) - 2px);margin-top:8px}
.acc{padding:6px 16px 18px}.acc h2{font-size:20px;font-weight:800;margin:10px 0}
details{background:var(--card);border:1px solid var(--line);border-radius:var(--r);margin-bottom:8px;overflow:hidden}
summary{list-style:none;cursor:pointer;padding:13px 14px;font-weight:700;font-size:14.5px;display:flex;justify-content:space-between;gap:10px}
summary::-webkit-details-marker{display:none}summary::after{content:"+";font-size:20px;line-height:1;color:var(--ac)}details[open] summary::after{content:"–"}
details .tx{padding:0 14px 14px;font-size:14px;opacity:.88;white-space:pre-line}
footer{padding:20px 16px 30px;text-align:center;font-size:12.5px;opacity:.7}
/* producto */
.gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.gal::-webkit-scrollbar{display:none}
.gal img{flex:0 0 100%;width:100%;scroll-snap-align:center;max-height:88vh;object-fit:contain;background:var(--soft)}
.gs{position:relative}.gc{position:absolute;right:12px;bottom:12px;background:#111827a0;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px}
.th{display:flex;gap:7px;overflow-x:auto;padding:10px 16px 0;scrollbar-width:none}.th button{flex:0 0 auto;width:52px;height:52px;border-radius:9px;overflow:hidden;border:2px solid transparent;padding:0;background:var(--soft);opacity:.7}.th button.on{border-color:var(--ac);opacity:1}.th img{width:100%;height:100%;object-fit:cover}
.cap{padding:14px 16px 0;text-align:left}.cap h1{font-size:26px;line-height:1.15;font-weight:800;margin:2px 0 6px}.kick{font-size:12px;letter-spacing:.12em;font-weight:700;color:var(--ac)}
.rate{font-size:14px}.rate .s{color:#f59e0b;letter-spacing:1px}.rate .m{opacity:.65}
.ofbox{margin:12px 16px 0;padding:9px 12px;border-radius:var(--r);background:var(--soft);border:1px solid color-mix(in srgb,var(--ac) 28%,transparent);font-weight:700;font-size:13.5px;color:var(--ac)}
.badges{display:flex;flex-wrap:wrap;gap:8px;margin:12px 16px 0}
.price{padding:12px 16px 0;font-size:34px;font-weight:800;color:var(--pc);display:flex;align-items:baseline;flex-wrap:wrap;gap:8px}
.price small{font-size:13px;color:#94a3b8;font-weight:800}.price s{font-size:19px;font-weight:600;color:var(--wc);opacity:.85}.price .sb{font-size:13px;background:var(--wc);color:#fff;padding:3px 9px;border-radius:99px;font-weight:800}
.save{padding:2px 16px 0;font-size:14px}.ship{padding:6px 16px 0;font-size:13.5px;opacity:.85}
.trust{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 16px 0}.trust div{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:10px 6px;text-align:center;font-size:12px;font-weight:700}
.bund{display:grid;gap:10px;margin:14px 16px 0}.bo{display:flex;align-items:center;gap:10px;padding:12px;border-radius:var(--r);background:var(--card);border:2px solid var(--line);position:relative;cursor:pointer}
.bo.sel{border-color:var(--ac);background:var(--soft)}.bo input{accent-color:var(--ac);width:18px;height:18px}.bo img{width:48px;height:48px;border-radius:8px;object-fit:cover}
.bo .bi{flex:1;min-width:0}.bo .bl{font-weight:800;font-size:14.5px}.bo .bp{display:inline-block;font-size:11.5px;font-weight:800;background:var(--wc);color:#fff;padding:1px 7px;border-radius:99px;margin-top:2px}
.bo .bu{font-size:12px;opacity:.8;margin-top:2px}.bo .br{text-align:right}.bo .br s{display:block;font-size:12px;color:var(--wc);opacity:.8}.bo .br b{font-size:17px;color:var(--pc)}.bo .br span{display:block;font-size:11.5px;font-weight:700;color:var(--pc)}
.bb{position:absolute;top:-9px;left:12px;background:var(--ac);color:#fff;font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:99px}
.cta{position:relative;overflow:hidden;display:block;width:calc(100% - 32px);margin:16px 16px 0;border:0;background:var(--bt);color:var(--btx);font-weight:800;font-size:17px;padding:16px;border-radius:var(--r);box-shadow:0 6px 18px #0003;animation:pop .4s ease .25s both}
.cta::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:0;background:linear-gradient(100deg,transparent,#ffffff55,transparent);animation:shine 3s infinite}
.gar{display:flex;gap:12px;margin:16px 16px 0;padding:14px;border-radius:var(--r);background:var(--card);border:1px solid var(--line)}.gar .gi{font-size:26px}.gar b{display:block;font-size:15px}.gar p{font-size:13.5px;opacity:.85}
.steps{margin:16px 16px 0;padding:14px;border-radius:var(--r);background:var(--card);border:1px solid var(--line)}.steps h3{font-size:15px;margin-bottom:10px}
.stp{display:flex;align-items:center;gap:10px;padding:6px 0}.stp i{font-style:normal;width:30px;height:30px;border-radius:50%;background:var(--ac);color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px}.stp span{flex:1;font-weight:700}.stp em{font-style:normal;font-size:13px;opacity:.7}
.blk{padding:22px 16px 0;text-align:center}.blk h2{font-size:23px;font-weight:800;line-height:1.2}.blk p{margin:8px 0 12px;font-size:15px;opacity:.88}.blk img{width:100%;border-radius:var(--r)}
.revs{padding:22px 16px 0}.revs h2{font-size:21px;font-weight:800;text-align:center}.revs .sc{text-align:center;margin:6px 0 12px;font-size:14px}.revs .sc b{font-size:30px}
.rv{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;margin-bottom:10px}.rv .s{color:#f59e0b}.rv .vb{font-size:11.5px;color:var(--pc);font-weight:700}.rv p{font-size:14px;margin:4px 0}.rv small{opacity:.7}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:20;background:var(--bg);border-top:1px solid var(--line);padding:10px 14px calc(10px + env(safe-area-inset-bottom))}
.sticky .in{max-width:var(--w);margin:0 auto;display:flex;align-items:center;gap:12px}.sticky .pp{line-height:1.1}.sticky .pp b{font-size:20px;color:var(--pc)}.sticky .pp s{font-size:12px;color:var(--wc);display:block}
.sticky button{flex:1;border:0;background:var(--bt);color:var(--btx);font-weight:800;font-size:16px;padding:14px;border-radius:var(--r)}
dialog{border:0;border-radius:calc(var(--r) + 6px);padding:0;width:min(94vw,460px);max-height:92vh;color:var(--tx);background:var(--bg);box-shadow:0 20px 60px #0006}
dialog::backdrop{background:#0009}dialog[open]{animation:pop .3s ease both}
.ped{padding:18px 16px 20px}.ped h2{font-size:21px;font-weight:800;margin-bottom:2px}.ped .sub{font-size:13px;opacity:.75;margin-bottom:12px}
.ped label{display:block;font-size:12.5px;font-weight:700;margin:10px 0 4px}.ped input,.ped select,.ped textarea{width:100%;font:inherit;font-size:16px;color:var(--tx);background:#fff;border:1px solid color-mix(in srgb,var(--tx) 25%,transparent);border-radius:calc(var(--r) - 2px);padding:12px}
.ped input:focus,.ped select:focus,.ped textarea:focus{outline:2px solid var(--ac);outline-offset:-1px}
.ped .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ped .resu{margin:14px 0 6px;padding:12px;border-radius:var(--r);background:var(--card);border:1px solid var(--line);font-size:14px}.ped .resu div{display:flex;justify-content:space-between;gap:12px;padding:2px 0}.ped .resu div span:first-child{flex:0 0 auto}.ped .resu #rP{text-align:right;min-width:0}.ped .resu .tt{font-weight:800;font-size:17px;border-top:1px solid var(--line);margin-top:6px;padding-top:8px}
.ped .aviso{font-size:12.5px;opacity:.8;margin-top:8px}.ped .err{color:#dc2626;font-size:13px;font-weight:700;min-height:18px;margin-top:6px}
.ped .go{width:100%;margin-top:6px;border:0;background:var(--bt);color:var(--btx);font-weight:800;font-size:17px;padding:15px;border-radius:var(--r)}.ped .go:disabled{opacity:.6}
.ped .x{float:right;border:0;background:transparent;font-size:24px;line-height:1;color:var(--tx);opacity:.6}
.ok{text-align:center;padding:30px 18px}.ok .ck{width:62px;height:62px;border-radius:50%;background:var(--pc);color:#fff;display:grid;place-items:center;font-size:32px;margin:0 auto 12px}.ok h2{font-size:22px}.ok p{font-size:14.5px;opacity:.85;margin-top:6px}
.hp{position:absolute;left:-9999px}`;
  }

  // ───────── Piezas ─────────
  const stars = v => '★'.repeat(Math.round(n(v))) + '☆'.repeat(5 - Math.round(n(v)));
  function barra(cfg) {
    const b = cfg.barra || {};
    if (!b.activa || !(b.items || []).length) return '';
    return `<div class="annbar" role="note"><div class="ann-row">${b.items.map(esc).join('<span class="ann-sep" aria-hidden="true">·</span>')}</div></div>`;
  }
  function pie(cfg, o) {
    const m = cfg.marca || {}, c = cfg.contacto || {};
    const pols = (cfg.politicas || []).filter(x => x && x[0]);
    const pagina = cfg._slugTienda ? '/t/' + esc(cfg._slugTienda) : '';
    return `<div class="acc">${(!o || o.faq !== false) && (cfg.faq || []).length ? `<h2>Preguntas frecuentes</h2>${cfg.faq.map(x => `<details><summary>${esc(x[0])}</summary><div class="tx">${esc(x[1])}</div></details>`).join('')}` : ''}
    ${pols.map(x => `<details><summary>${esc(x[0])}</summary><div class="tx">${esc(x[1])}</div></details>`).join('')}</div>
    <footer>${c.whatsapp ? `<p><a href="https://wa.me/${esc(String(c.whatsapp).replace(/\D/g, ''))}" rel="noopener">WhatsApp: ${esc(c.whatsapp)}</a></p>` : ''}${c.email ? `<p>${esc(c.email)}</p>` : ''}<p>© ${new Date().getFullYear()} ${esc(m.nombre)} · <a href="${pagina || '/'}">Inicio</a></p></footer>`;
  }
  function pixeles(cfg, pagina, prod) {
    const p = cfg.pixeles || {}, meta = id(p.meta), tt = id(p.tiktok), ga = id(p.ga), cl = id(p.clarity);
    let s = '';
    if (meta) s += `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');${prod ? `fbq('track','ViewContent',{content_name:${JSON.stringify(prod.nombre).replace(/</g, '\\u003c')},value:${n(prod.precio)},currency:'${esc((cfg.pais || {}).codigo || 'GTQ')}'});` : ''}`;
    if (tt) s += `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date;var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tt}');ttq.page()}(window,document,'ttq');`;
    if (ga) s += `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`;
    let ext = ga ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>` : '';
    if (cl) s += `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${cl}");`;
    return s ? ext + `<script>${s}</script>` : '';
  }
  function head(cfg, titulo, desc, img, canon, tipo, prod) {
    const m = cfg.marca || {}, d = cfg.diseno || {}, f = fuente(d.fuente);
    return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${esc(titulo)}</title><meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${color(d.fondo, '#ffffff')}"><link rel="icon" href="${url(m.favicon || m.logo)}">${canon ? `<link rel="canonical" href="${esc(canon)}">` : ''}
<meta property="og:type" content="${tipo}"><meta property="og:site_name" content="${esc(m.nombre)}"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:locale" content="${esc((cfg.pais || {}).locale || 'es_GT')}">${img ? `<meta property="og:image" content="${url(img)}">` : ''}${canon ? `<meta property="og:url" content="${esc(canon)}">` : ''}<meta name="twitter:card" content="summary_large_image">
${prod ? `<meta property="product:price:amount" content="${n(prod.precio)}"><meta property="product:price:currency" content="${esc((cfg.pais || {}).codigo || 'GTQ')}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700;800&display=swap"><style>${css(cfg)}</style>`;
  }
  const link = (cfg, p) => (cfg._base || '') + '/' + esc(p.slug);

  // ───────── Portada ─────────
  function portada(cfg, opt) {
    const m = cfg.marca || {}, pt = cfg.portada || {}, pm = cfg.promo || {}, lista = activos(cfg), cats = (cfg.categorias || []).filter(Boolean);
    const card = p => {
      const x = precios(cfg, p);
      return `<a class="pc" data-c="${esc(p.categoria || '')}" href="${link(cfg, p)}">${x.pct1 ? `<span class="tagp">-${x.pct1}%</span>` : ''}${p.masVendido ? '' : p.nuevo ? '<span class="tagn">Nuevo</span>' : ''}
      <div class="im">${(p.imagenes || [])[0] ? `<img src="${url(p.imagenes[0])}" alt="${esc(p.nombre)}" loading="lazy">` : ''}</div>
      <div class="bd">${p.masVendido ? `<span class="st" style="color:var(--wc)">Más vendido${n(p.vendidos) ? ' · +' + n(p.vendidos) + ' vendidos' : ''}</span>` : n(p.vendidos) ? `<span class="lv">+${n(p.vendidos)} vendidos</span>` : ''}
      <h3>${esc(p.nombre)}</h3>${n(p.rating) ? `<span class="st">${stars(p.rating)} <small>${n(p.rating).toFixed(1)} (${n(p.resenas)})</small></span>` : ''}
      <div class="pr">${x.tach ? `<s>${q(cfg, x.tach)}</s>` : ''}${q(cfg, x.pr)}</div>${x.ahorro1 ? `<span class="sv">Ahorras ${q(cfg, x.ahorro1)}</span>` : ''}${x.c2 ? `<span class="lv">Lleva 2 y ahorra ${x.pct2c}%</span>` : ''}
      <span class="vo">Ver oferta</span></div></a>`;
    };
    return `<!doctype html><html lang="es"><head>${head(cfg, m.nombre, m.descripcion || m.lema, m.og || m.logo, opt.canon, 'website')}</head><body><div class="wrap" id="app">
    ${barra(cfg)}
    <div class="hero-s">${m.verificada ? '<span class="vf">✓ Tienda verificada</span>' : ''}${m.logo ? `<img class="lg" src="${url(m.logo)}" alt="${esc(m.nombre)}">` : ''}<h1>${esc(m.nombre)}</h1>${pt.badge ? `<div style="margin-top:8px"><span class="pill">${esc(pt.badge)}</span></div>` : ''}${m.lema ? `<p class="lm">${esc(m.lema)}</p>` : ''}
    <div class="chips">${(pt.confianza || []).map(x => `<span><i>✓</i>${esc(x)}</span>`).join('')}</div></div>
    ${pm.activa && pt.mostrarPromo !== false ? `<div class="promo"><h2>${esc(pm.titulo)}</h2><div class="big">${esc(pm.cantidad)} o más · -${esc(pm.descuento)}%</div><p>${esc(pm.texto)}</p></div>` : ''}
    ${cats.length ? `<div class="cats" id="cats"><button class="on" data-c="">Todos</button>${cats.map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    <h2 class="sec">${esc(pt.titulo || 'Los más vendidos')}</h2>
    <div class="grid" id="grid">${lista.map(card).join('')}</div>
    ${pie(cfg)}</div>
    <script>(function(){var c=document.getElementById('cats');if(!c)return;c.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;c.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});document.querySelectorAll('#grid .pc').forEach(function(a){a.style.display=!b.dataset.c||a.dataset.c===b.dataset.c?'':'none'})})})();</script>
    ${pixeles(cfg, 'home')}</body></html>`;
  }

  // Ventana de pedido contraentrega (la misma para producto, landing y código)
  function pedidoHtml(cfg, x) {
    return `<dialog id="ped"><div class="ped" id="pedBody">
      <button class="x" type="button" id="pedX" aria-label="Cerrar">×</button><h2>Completa tu pedido</h2><p class="sub">Pagas en efectivo al recibir. Confirmamos por WhatsApp antes del envío.</p>
      <form id="pedF" novalidate autocomplete="on">
        <div class="hp"><label>No llenar<input name="web" tabindex="-1" autocomplete="off"></label></div>
        ${x.c2 ? `<label>Cantidad</label><select name="qty" id="qty"><option value="1">1 unidad · ${q(cfg, x.pr)}</option><option value="2">2 unidades · ${q(cfg, x.c2)}</option></select>` : '<input type="hidden" name="qty" id="qty" value="1">'}
        <div class="two"><div><label>Nombre</label><input name="nombre" autocomplete="given-name" required></div><div><label>Apellido</label><input name="apellido" autocomplete="family-name"></div></div>
        <label>Teléfono (WhatsApp)</label><input name="telefono" type="tel" inputmode="tel" autocomplete="tel" required>
        <div class="two"><div><label>Departamento</label><select name="departamento" required><option value="">Elige…</option>${DEPTOS.map(d => `<option>${d}</option>`).join('')}</select></div><div><label>Municipio / ciudad</label><input name="ciudad" required></div></div>
        <label>Dirección completa</label><input name="direccion" autocomplete="street-address" required>
        <label>Punto de referencia</label><input name="referencia" placeholder="Ej.: frente a la tienda, casa blanca">
        <p class="aviso">Escribe tu dirección completa y un punto de referencia para que tu pedido llegue sin problemas.</p>
        <div class="resu"><div><span>Producto</span><span id="rP"></span></div><div><span>Envío</span><span id="rE"></span></div><div class="tt"><span>Total a pagar al recibir</span><span id="rT"></span></div></div>
        <div class="err" id="pedErr" role="alert"></div><button class="go" id="pedGo" type="submit">Confirmar pedido</button>
      </form></div></dialog>`;
  }
  function waLink(cfg, p, numero, msg) {
    const tel = String(numero || (cfg.contacto || {}).whatsapp || '').replace(/\D/g, '');
    if (!tel) return '';
    return 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg || ('Hola, quiero pedir: ' + p.nombre));
  }
  function scriptsPedido(cfg, p, x, imgs, opt) {
    const e = cfg.envio || {}, pais = cfg.pais || {};
    const datos = { t: cfg._slugTienda || '', p: p.slug, pr: x.pr, c2: x.c2, env: e.gratis === false ? n(e.costo) : 0, mon: pais.moneda || 'Q', cod: pais.codigo || 'GTQ', prev: !!opt.preview, nom: p.nombre, img: imgs[0] || '', wa: waLink(cfg, p, '', '') };
    return `<script>window.__T=${JSON.stringify(datos).replace(/</g, '\\u003c')};</script><script>${clienteProducto()}</script>`;
  }

  // ───────── Producto ─────────
  function producto(cfg, p, opt) {
    const m = cfg.marca || {}, e = cfg.envio || {}, pais = cfg.pais || {}, x = precios(cfg, p), imgs = (p.imagenes || []).filter(i => url(i));
    const titulo = p.titulo || p.nombre, rs = (p.resenasLista || []).filter(r => r && r.t);
    const prom = n(p.resenas) ? n(p.rating) : rs.length ? rs.reduce((s, r) => s + n(r.e), 0) / rs.length : 0;
    const totalRes = n(p.resenas) || rs.length;
    const sh = k => !(p.mostrar && p.mostrar[k] === false);
    const trust = sh('confianza') ? (cfg.confianzaProducto || []).filter(Boolean) : [];
    const pasos = (e.pasos || []).filter(s => s && s[0]);
    const bundle = (qn, label, now, was, pct, extra) => `<label class="bo${qn === 1 ? ' sel' : ''}" data-q="${qn}"><input type="radio" name="b" value="${qn}"${qn === 1 ? ' checked' : ''}>${qn === 2 ? '<span class="bb">2x DESCUENTO</span>' : ''}${imgs[0] ? `<img src="${url(imgs[0])}" alt="" width="48" height="48">` : ''}<div class="bi"><div class="bl">${label}</div>${pct ? `<span class="bp">-${pct}%</span>` : ''}${extra || ''}</div><div class="br">${was > now ? `<s>${q(cfg, was)}</s>` : ''}<b>${q(cfg, now)}</b>${was > now ? `<span>Ahorras ${q(cfg, was - now)}</span>` : ''}</div></label>`;
    const canon = opt.canon;
    return `<!doctype html><html lang="es"><head>${head(cfg, titulo, p.kicker || m.lema || titulo, imgs[0], canon, 'product', p)}</head><body><div class="wrap" id="app">
    ${barra(cfg)}
    <div class="top"><a href="${cfg._base || '/'}/">${m.logo ? `<img src="${url(m.logo)}" alt="${esc(m.nombre)}">` : `<b>${esc(m.nombre)}</b>`}</a>${m.verificada ? '<span class="vf">✓ Verificada</span>' : ''}</div>
    ${imgs.length ? `<div class="gs"><div class="gal" id="gal">${imgs.map((i, k) => `<img src="${url(i)}" alt="${esc(titulo)} ${k + 1}" ${k ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join('')}</div>${imgs.length > 1 ? `<div class="gc" id="gc">1 / ${imgs.length}</div>` : ''}</div>
    ${imgs.length > 1 ? `<div class="th" id="th">${imgs.map((i, k) => `<button type="button" class="${k ? '' : 'on'}" data-i="${k}" aria-label="Ver imagen ${k + 1}"><img src="${url(i)}" alt=""></button>`).join('')}</div>` : ''}` : ''}
    <div class="cap">${p.etiqueta ? `<span class="pill">${esc(p.etiqueta)}</span>` : ''}${p.kicker ? `<div class="kick">${esc(p.kicker)}</div>` : ''}<h1>${esc(titulo)}</h1>
    <div class="rate"><span class="s">${stars(prom)}</span> <b>${prom.toFixed(1)}/5</b> <span class="m">(${totalRes} reseñas)</span></div></div>
    ${cfg.promo && cfg.promo.activa ? `<div class="ofbox">Precio de lanzamiento disponible</div>` : ''}
    <div class="badges">${[(pais.pais ? 'Pago contraentrega' : ''), (e.gratis === false ? '' : 'Envío gratis'), 'Calidad certificada'].filter(Boolean).map(b => `<span class="badge"><i>✓</i>${esc(b)}</span>`).join('')}</div>
    <div class="price"><span>${q(cfg, x.pr)}</span><small>${esc(pais.codigo || 'GTQ')}</small>${x.tach ? `<s>${q(cfg, x.tach)}</s><span class="sb">-${x.pct1}%</span>` : ''}</div>
    ${x.ahorro1 ? `<div class="save">Estás ahorrando <b>${q(cfg, x.ahorro1)}</b></div>` : ''}
    <div class="ship">🚚 Llega en ${esc(e.productoDias || e.dias || '3 a 7 días')} a tu ciudad</div>
    ${trust.length ? `<div class="trust">${trust.map(t => `<div>${esc(t)}</div>`).join('')}</div>` : ''}
    <div class="bund" id="bund">${bundle(1, 'Compra 1 unidad', x.pr, x.tach, x.pct1)}${x.c2 ? bundle(2, 'Llévate dos y comparte uno', x.c2, x.base2, pctOff(x.base2, x.c2), `<div class="bu">${x.tach ? `<s>${q(cfg, x.tach)}</s> ` : ''}c/u ${q(cfg, x.c2 / 2)}</div>`) : ''}</div>
    <button class="cta" type="button" data-abrir>Quiero el mío</button>
    ${e.garantia && sh('garantia') ? `<div class="gar"><div class="gi">🛡️</div><div><b>Garantía de satisfacción</b><p>${esc(e.garantia)}</p></div></div>` : ''}
    ${pasos.length && sh('pasos') ? `<div class="steps"><h3>Así llega tu pedido</h3>${pasos.map((s, k) => `<div class="stp"><i>${String(k + 1).padStart(2, '0')}</i><span>${esc(s[0])}</span><em>${esc(s[1])}</em></div>`).join('')}<p style="font-size:13px;margin-top:8px;opacity:.8">Al confirmar tu pedido te damos tu link de rastreo. Llega a tu puerta y pagas al recibir, sin compromisos.</p></div>` : ''}
    ${(p.bloques || []).filter(b => b && (b.t || b.x || b.img)).map(b => `<section class="blk">${b.t ? `<h2>${esc(b.t)}</h2>` : ''}${b.x ? `<p>${esc(b.x)}</p>` : ''}${url(b.img) ? `<img src="${url(b.img)}" alt="${esc(b.t)}" loading="lazy">` : ''}</section>`).join('')}
    ${sh('faq') && ((p.faq || []).length || (cfg.faq || []).length) ? `<div class="acc"><h2>Preguntas frecuentes</h2>${[...(p.faq || []), ...(cfg.faq || [])].map(f => `<details><summary>${esc(f[0])}</summary><div class="tx">${esc(f[1])}</div></details>`).join('')}</div>` : ''}
    ${rs.length && sh('resenas') ? `<div class="revs"><h2>Lo que dicen quienes ya lo recibieron</h2><div class="sc"><b>${prom.toFixed(1)}</b> <span class="s" style="color:#f59e0b">${stars(prom)}</span><br>${totalRes} reseñas verificadas</div>${rs.map(r => `<div class="rv"><span class="s">${stars(r.e)}</span> <span class="vb">Comprador verificado</span><p>${esc(r.t)}</p><small><b>${esc(r.n)}</b>${r.c ? ' · ' + esc(r.c) : ''}</small></div>`).join('')}</div>` : ''}
    <div style="height:10px"></div>${pie(cfg).replace(/<div class="acc">[\s\S]*?<\/div>(?=\s*<footer)/, `<div class="acc">${(cfg.politicas || []).filter(z => z && z[0]).map(z => `<details><summary>${esc(z[0])}</summary><div class="tx">${esc(z[1])}</div></details>`).join('')}</div>`)}
    </div>
    <div class="sticky"><div class="in"><div class="pp">${x.tach ? `<s>${q(cfg, x.tach)}</s>` : ''}<b>${q(cfg, x.pr)}</b></div><button type="button" data-abrir>Pedir ahora · pago al recibir</button></div></div>
    ${pedidoHtml(cfg, x)}
    ${scriptsPedido(cfg, p, x, imgs, opt)}
    ${pixeles(cfg, 'producto', p)}</body></html>`;
  }

  // ───────── Landing: título · imagen · botón · imagen · botón … ─────────
  function landing(cfg, p, opt) {
    const m = cfg.marca || {}, x = precios(cfg, p), imgs = (p.imagenes || []).filter(i => url(i));
    const sec = (p.secciones || []).filter(Boolean);
    let primero = true;
    const html = sec.map(s => {
      if (s.tipo === 'titulo') { const h = primero ? 'h1' : 'h2'; primero = false; return `<section class="blk lp-t"><${h}>${esc(s.x)}</${h}></section>`; }
      if (s.tipo === 'texto') return `<section class="blk"><p>${esc(s.x)}</p></section>`;
      if (s.tipo === 'imagen') return url(s.img) ? `<img class="lp-i" src="${url(s.img)}" alt="${esc(s.alt || p.nombre)}" loading="lazy">` : '';
      if (s.tipo === 'boton') {
        const wa = s.accion === 'whatsapp' ? waLink(cfg, p, s.wa, s.msg) : '';
        return wa ? `<a class="cta lp-b" href="${esc(wa)}" target="_blank" rel="noopener">${esc(s.x || 'Escríbenos por WhatsApp')}</a>` : `<button class="cta lp-b" type="button" data-abrir>${esc(s.x || 'Quiero el mío')}</button>`;
      }
      return '';
    }).join('');
    return `<!doctype html><html lang="es"><head>${head(cfg, p.titulo || p.nombre, p.kicker || m.lema || p.nombre, imgs[0], opt.canon, 'product', p)}<style>.lp-i{width:100%;display:block;margin:14px 0 0}.lp-b{margin-top:14px;margin-bottom:6px;text-align:center;text-decoration:none}.lp-t h1,.lp-t h2{font-size:26px}</style></head><body><div class="wrap" id="app">
    ${barra(cfg)}${html}<div style="height:16px"></div>${pie(cfg, { faq: false })}</div>
    ${pedidoHtml(cfg, x)}${scriptsPedido(cfg, p, x, imgs, opt)}${pixeles(cfg, 'producto', p)}</body></html>`;
  }

  // ───────── Código: HTML, CSS y JS propios (con {{precio}}, {{nombre}}…) ─────────
  function codigo(cfg, p, opt) {
    const m = cfg.marca || {}, x = precios(cfg, p), imgs = (p.imagenes || []).filter(i => url(i));
    const vars = { precio: q(cfg, x.pr), tachado: x.tach ? q(cfg, x.tach) : '', precio2: x.c2 ? q(cfg, x.c2) : '', ahorro: x.ahorro1 ? q(cfg, x.ahorro1) : '', descuento: x.pct1 ? x.pct1 + '%' : '', nombre: esc(p.nombre), whatsapp: waLink(cfg, p, '', '') };
    const sub = t => String(t || '').replace(/\{\{\s*([a-z0-9]+)\s*\}\}/gi, (a, k) => (k in vars ? vars[k] : a));
    const wa = vars.whatsapp;
    return `<!doctype html><html lang="es"><head>${head(cfg, p.titulo || p.nombre, p.kicker || m.lema || p.nombre, imgs[0], opt.canon, 'product', p)}<style>${String(p.css || '').replace(/<\/style/gi, '<\\/style')}</style></head><body><div class="wrap" id="app">
    ${barra(cfg)}<div class="cod">${sub(p.html)}</div>${pie(cfg, { faq: false })}</div>
    ${pedidoHtml(cfg, x)}${scriptsPedido(cfg, p, x, imgs, opt)}
    <script>[].forEach.call(document.querySelectorAll('[data-wa]'),function(a){var w=window.__T.wa;if(w){a.href=w;a.target='_blank';a.rel='noopener'}else{a.addEventListener('click',function(e){e.preventDefault();var b=document.querySelector('[data-abrir]');if(b)b.click()})}});</script>
    ${p.js ? `<script>${String(p.js).replace(/<\/script/gi, '<\\/script')}</script>` : ''}${pixeles(cfg, 'producto', p)}</body></html>`;
  }

  // JS de la página de producto (galería, ofertas, ventana de pedido y envío)
  function clienteProducto() {
    return `(function(){var T=window.__T,$=function(s){return document.querySelector(s)},fm=function(v){return T.mon+'\\u00a0'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};
var gal=$('#gal'),gc=$('#gc'),th=$('#th');
if(gal){var n=gal.children.length;gal.addEventListener('scroll',function(){var i=Math.round(gal.scrollLeft/gal.clientWidth);if(gc)gc.textContent=(i+1)+' / '+n;if(th)[].forEach.call(th.children,function(b,k){b.classList.toggle('on',k===i)})},{passive:true});
if(th)th.addEventListener('click',function(e){var b=e.target.closest('button');if(b)gal.scrollTo({left:gal.clientWidth*b.dataset.i,behavior:'smooth'})})}
var dlg=$('#ped'),f=$('#pedF'),qty=$('#qty'),err=$('#pedErr');
function tot(){var q=+qty.value||1,sub=q===2&&T.c2?T.c2:T.pr*q;$('#rP').textContent=q+' × '+T.nom.slice(0,28)+' · '+fm(sub);$('#rE').textContent=T.env?fm(T.env):'Gratis';$('#rT').textContent=fm(sub+T.env);return sub+T.env}
function selB(q){[].forEach.call(document.querySelectorAll('.bo'),function(l){l.classList.toggle('sel',+l.dataset.q===q);l.querySelector('input').checked=+l.dataset.q===q});qty.value=String(q);tot()}
var bd=$('#bund');if(bd)bd.addEventListener('click',function(e){var l=e.target.closest('.bo');if(l)selB(+l.dataset.q)});
qty.addEventListener('change',function(){selB(+qty.value)});
[].forEach.call(document.querySelectorAll('[data-abrir]'),function(b){b.addEventListener('click',function(){tot();if(!dlg.open)dlg.showModal();if(window.fbq)fbq('track','InitiateCheckout');if(window.ttq)ttq.track('InitiateCheckout')})});
$('#pedX').addEventListener('click',function(){dlg.close()});dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
f.addEventListener('submit',function(e){e.preventDefault();err.textContent='';var d=Object.fromEntries(new FormData(f).entries());
if(!d.nombre.trim()||!d.telefono.trim()||!d.departamento||!d.ciudad.trim()||!d.direccion.trim()){err.textContent='Completa nombre, teléfono, departamento, ciudad y dirección.';return}
if(d.telefono.replace(/\\D/g,'').length<8){err.textContent='Revisa tu número de teléfono.';return}
if(T.prev){err.textContent='Vista previa: aquí se enviaría el pedido.';return}
var go=$('#pedGo');go.disabled=true;go.textContent='Enviando…';d.t=T.t;d.producto=T.p;
fetch('/api/pedido-tienda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json().catch(function(){return{}})}).then(function(j){
if(!j.ok){err.textContent=j.error||'No se pudo enviar. Intenta de nuevo.';go.disabled=false;go.textContent='Confirmar pedido';return}
if(window.fbq)fbq('track','Purchase',{value:j.total,currency:T.cod});if(window.ttq)ttq.track('PlaceAnOrder',{value:j.total,currency:T.cod});
$('#pedBody').innerHTML='<div class="ok"><div class="ck">✓</div><h2>¡Pedido confirmado!</h2><p>Te contactaremos pronto por WhatsApp o llamada para confirmar tu envío. Pagas al recibir.</p><p><b>Total: '+fm(j.total)+'</b></p></div>'
}).catch(function(){err.textContent='Sin conexión. Intenta de nuevo.';go.disabled=false;go.textContent='Confirmar pedido'})});
})();`;
  }

  // ───────── Entrada principal ─────────
  // ruta: '' (portada) o el slug de un producto. opt: { base, preview, canon }
  function renderizar(cfg, ruta, opt) {
    opt = opt || {};
    cfg = Object.assign({}, cfg, { _base: opt.base || '', _slugTienda: opt.slugTienda || cfg.slug || '' });
    ruta = String(ruta || '').replace(/^\/+|\/+$/g, '');
    if (!ruta) return { status: 200, html: portada(cfg, opt) };
    const p = activos(cfg).find(x => x.slug === ruta);
    if (!p) return { status: 404, html: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>No encontrado</title><body style="font-family:system-ui;text-align:center;padding:60px 20px"><h1>Producto no encontrado</h1><p><a href="${esc(opt.base || '')}/">Volver a la tienda</a></p></body>` };
    const t = p.tipo === 'landing' ? landing : p.tipo === 'codigo' ? codigo : producto;
    return { status: 200, html: t(cfg, p, opt) };
  }
  const api = { renderizar, precios, activos, PRESETS, DEPTOS, slugOk, q };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TiendaRender = api;
})(typeof window !== 'undefined' ? window : globalThis);
