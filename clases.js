'use strict';
/* DROPOX — Clases: agenda de clases con fecha, hora, tema y link. Pegas el mensaje y reconoce todo solo. */
(() => {
  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12, ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12 };
  const DIAS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
  const sin = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const z = n => String(n).padStart(2, '0');
  const mover = (f, n) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const dowDe = f => new Date(f + 'T12:00:00').getDay();
  const fechaOk = (y, m, d) => { const x = new Date(y, m - 1, d); return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d; };
  const conAnio = (m, d, y) => {
    const hoyD = hoy(); let yy = y;
    if (!yy) { yy = +hoyD.slice(0, 4); if (fechaOk(yy, m, d) && `${yy}-${z(m)}-${z(d)}` < mover(hoyD, -60)) yy++; }
    else if (yy < 100) yy += 2000;
    return fechaOk(yy, m, d) ? `${yy}-${z(m)}-${z(d)}` : '';
  };

  // ───── Reconocimiento automático ─────
  const URL_RE = /(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/i;
  const plataforma = u => /zoom\.us|zoom\.com/i.test(u) ? 'Zoom' : /meet\.google/i.test(u) ? 'Google Meet' : /teams\.(microsoft|live)/i.test(u) ? 'Teams' : /youtu\.?be/i.test(u) ? 'YouTube' : /whatsapp|wa\.me|chat\.whatsapp/i.test(u) ? 'WhatsApp' : /drive\.google|docs\.google/i.test(u) ? 'Drive' : /vimeo/i.test(u) ? 'Vimeo' : /discord/i.test(u) ? 'Discord' : /t\.me|telegram/i.test(u) ? 'Telegram' : 'Enlace';
  const urlOk = u => (/^https?:\/\//i.test(u) ? u : 'https://' + u);

  function hora(t) {
    let m = t.match(/(?:^|[^\d])(\d{1,2})\s*[:.h]\s*(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?(?!\d)/i);
    let hh, mm, ap;
    if (m) { hh = +m[1]; mm = +m[2]; ap = m[3]; }
    else { m = t.match(/(?:^|[^\d])(\d{1,2})\s*(a\.?\s?m\.?|p\.?\s?m\.?|hrs?\b|horas?\b|h\b)/i); if (!m) { m = t.match(/\ba\s+las\s+(\d{1,2})\b/i); if (!m) return null; hh = +m[1]; mm = 0; ap = null; } else { hh = +m[1]; mm = 0; ap = /^[ap]/i.test(m[2]) ? m[2] : null; } }
    if (hh > 24 || mm > 59) return null;
    if (ap) { const p = /^p/i.test(ap.replace(/\s/g, '')); if (p && hh < 12) hh += 12; if (!p && hh === 12) hh = 0; }
    return { h: `${z(hh % 24)}:${z(mm)}`, txt: m[0] };
  }

  // devuelve { f, txt } con la fecha encontrada y el texto que la contenía
  function fecha(t) {
    const s = sin(t); let m;
    if ((m = s.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/))) { const f = conAnio(+m[2], +m[3], +m[1]); if (f) return { f, txt: m[0] }; }
    if ((m = s.match(/\b(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)\.?(?:\s*(?:de|del)?\s*(20\d{2}))?/))) { const f = conAnio(MESES[m[2]], +m[1], m[3] ? +m[3] : 0); if (f) return { f, txt: m[0] }; }
    if ((m = s.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\s+(\d{1,2})\b(?!\s*[:h])/))) { const f = conAnio(MESES[m[1]], +m[2], 0); if (f) return { f, txt: m[0] }; }
    if ((m = s.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/))) { const f = conAnio(+m[2], +m[1], m[3] ? (m[3].length === 2 ? +m[3] + 2000 : +m[3]) : 0); if (f) return { f, txt: m[0] }; }
    const h = hoy();
    if ((m = s.match(/\bpasado\s+manana\b/))) return { f: mover(h, 2), txt: m[0] };
    if ((m = s.match(/\bmanana\b/)) && !/\bmanana\s+(a\.?m|por)/.test(s)) return { f: mover(h, 1), txt: m[0] };
    if ((m = s.match(/\bhoy\b/))) return { f: h, txt: m[0] };
    if ((m = s.match(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/))) {
      const t0 = dowDe(h), k = DIAS[m[1]]; let d = (k - t0 + 7) % 7; if (d === 0 && /proxim|siguiente/.test(s)) d = 7;
      return { f: mover(h, d), txt: m[0], soloDia: true };
    }
    return null;
  }

  function reconocer(chunk) {
    let t = chunk, url = '';
    const mu = t.match(URL_RE); if (mu) { url = mu[1].replace(/[.,;]+$/, ''); t = t.replace(mu[0], ' '); }
    // datos de acceso de Zoom que no son el tema
    t = t.split('\n').filter(l => !/^\s*(id de reuni[oó]n|meeting id|passcode|c[oó]digo de acceso|contrase[nñ]a|password|clave)\b/i.test(l)).join('\n');
    // etiquetas tipo "Tema: ..."
    let tema = ''; const mt = t.match(/(?:^|\n)\s*(?:tema|titulo|título|clase|asunto|topic)\s*[:\-–]\s*(.+)/i); if (mt) tema = mt[1].trim();
    const fh = fecha(t.replace(/\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/gi, m => ' '.repeat(m.length))); // evita confundir la hora con una fecha
    const hr = hora(fh ? t.replace(new RegExp(fh.txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ') : t);
    if (!tema) {
      let r = t.split('\n').map(l => {
        let x = l;
        if (fh) { const re = new RegExp(fh.txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\? /g, '\\s*'), 'i'); x = sin(x).length === x.length ? x.replace(new RegExp(re.source, 'i'), ' ') : x; }
        if (hr) x = x.replace(hr.txt.trim(), ' ');
        x = x.replace(/\b(fecha|hora|d[ií]a|link|enlace|zoom|meet|teams|en vivo|hoy|ma[ñn]ana|pasado ma[ñn]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|a las|hrs?|horas?|p\.?\s?m\.?|a\.?\s?m\.?|per[uú]|lima)\b\.?/gi, ' ')
          .replace(/\b(\d{1,2})\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/gi, ' ')
          .replace(/\b\d{1,2}[\/\-.]\d{1,2}([\/\-.]\d{2,4})?\b/g, ' ').replace(/[:|•·➡️📅🕒🕐⏰🔗📌✅]+|^[\s\-–—*]+/g, ' ').replace(/\s+/g, ' ').trim();
        return x;
      }).filter(x => x && x.length > 2);
      tema = r.join(' · ');
    }
    tema = tema.replace(/\s+/g, ' ').replace(/^[\s\-–—:,.]+|[\s\-–—:,.]+$/g, '').slice(0, 160);
    return { tema, link: url ? urlOk(url) : '', f: fh ? fh.f : '', h: hr ? hr.h : '', p: url ? plataforma(url) : '' };
  }

  // Parte el texto pegado en una o varias clases
  function separar(texto) {
    const t = texto.replace(/\r/g, '').trim(); if (!t) return [];
    let bloques = t.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
    const out = [];
    bloques.forEach(b => {
      const L = b.split('\n'), n = L.filter(l => URL_RE.test(l)).length;
      if (n <= 1) { out.push(b); return; }
      let acc = [];
      L.forEach(l => { acc.push(l); if (URL_RE.test(l)) { out.push(acc.join('\n')); acc = []; } });
      if (acc.length) out[out.length - 1] += '\n' + acc.join('\n');
    });
    return out;
  }

  // ───── Datos ─────
  const E = () => { const c = (S.clases = S.clases || { lista: [] }); c.lista = c.lista || []; return c; };
  const fechaCorta = f => new Date(f + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const hFmt = h => { if (!h) return ''; const [a, b] = h.split(':').map(Number); return `${a % 12 || 12}:${z(b)} ${a < 12 ? 'a. m.' : 'p. m.'}`; };
  const ordenar = (a, b) => (a.f || '9999').localeCompare(b.f || '9999') || (a.h || '').localeCompare(b.h || '');
  const dif = f => Math.round((new Date(f + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 864e5);
  const segura = u => /^https?:\/\//i.test(u || '') ? u : '';

  // imagen: se reduce (máx. 1000 px, JPEG) para que ocupe poco al guardarse
  const reducir = file => new Promise((ok, mal) => {
    if (!file || !/^image\//.test(file.type)) return mal(new Error('No es una imagen'));
    const fr = new FileReader();
    fr.onerror = () => mal(new Error('No pude leer la imagen'));
    fr.onload = () => { const im = new Image(); im.onerror = () => mal(new Error('Imagen no válida')); im.onload = () => {
      const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.72)); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
  const elegir = cb => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => { const f = i.files && i.files[0]; if (f) reducir(f).then(cb, e => toast(e.message)); }; i.click(); };
  const imgSeg = u => (/^data:image\/(jpeg|png|webp);base64,/.test(u || '') ? u : '');

  const imgsDe = c => (Array.isArray(c.imgs) ? c.imgs : c.img ? [c.img] : []).filter(imgSeg).slice(0, 3);
  const guardarImgs = (c, a) => { c.imgs = a.slice(0, 3); delete c.img; };

  // visor a pantalla completa (hasta 3 imágenes por clase)
  function visor(c, i0) {
    let i = i0; const cerrar = () => { document.removeEventListener('keydown', tecla); ov.remove(); document.body.style.overflow = ''; };
    const ov = document.createElement('div'); ov.className = 'cl-visor'; document.body.style.overflow = 'hidden';
    const pintarV = () => {
      const a = imgsDe(c); if (!a.length) { cerrar(); render(); return; } i = Math.max(0, Math.min(i, a.length - 1));
      ov.innerHTML = `<div class="cl-vtop"><b>${esc(c.tema || 'Clase')}</b><span>${i + 1} / ${a.length}</span><button class="btn btn-sm" data-q>🗑 Quitar esta imagen</button><button class="btn btn-sm btn-pri" data-x>✕ Cerrar</button></div>
        <img src="${esc(a[i])}" alt=""><button class="cl-nav cl-ant" data-a ${a.length < 2 ? 'hidden' : ''}>‹</button><button class="cl-nav cl-sig" data-s ${a.length < 2 ? 'hidden' : ''}>›</button>`;
      ov.querySelector('[data-x]').onclick = () => { cerrar(); render(); };
      ov.querySelector('[data-q]').onclick = () => { const n = imgsDe(c); n.splice(i, 1); guardarImgs(c, n); Store.save(); pintarV(); };
      ov.querySelector('[data-a]').onclick = () => { i = (i - 1 + a.length) % a.length; pintarV(); };
      ov.querySelector('[data-s]').onclick = () => { i = (i + 1) % a.length; pintarV(); };
    };
    const tecla = e => { const n = imgsDe(c).length; if (e.key === 'Escape') { cerrar(); render(); } else if (e.key === 'ArrowLeft' && n > 1) { i = (i - 1 + n) % n; pintarV(); } else if (e.key === 'ArrowRight' && n > 1) { i = (i + 1) % n; pintarV(); } };
    ov.onclick = e => { if (e.target === ov) { cerrar(); render(); } };
    document.addEventListener('keydown', tecla); document.body.appendChild(ov); pintarV();
  }

  let tab = 'prox', ultimo = '', imgPend = '', leyendo = false;

  // lee el texto de la imagen con la IA y lo mete en el cuadro; si encuentra fecha o link, agrega la clase sola
  async function leerImagen(u) {
    leyendo = true; ultimo = '🔎 Leyendo la imagen…'; render();
    try {
      const tk = window.Nube && Nube.activo ? await Nube.token() : null;
      if (!tk) throw new Error('Inicia sesión para que lea el texto de la imagen.');
      const r = await fetch('/api/clase-imagen', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ imagen: u }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No pude leer la imagen.');
      const tx = (d.texto || '').trim();
      if (!tx) { ultimo = 'No vi texto en la imagen. Llena los datos con «Editar» o escríbelos arriba.'; return; }
      window._clTxt = ((window._clTxt || '') + '\n' + tx).trim();
      const hay = separar(window._clTxt).map(reconocer).filter(x => x.f || x.link);
      if (hay.length) { leyendo = false; agregar(window._clTxt); return; }
      ultimo = 'Leí la imagen pero no encontré fecha ni link. Revisa el texto de arriba y toca «Reconocer y agregar».';
    } catch (e) { ultimo = '⚠ ' + (e.message || 'No pude leer la imagen.') + ' La imagen quedó lista para guardarla igual.'; }
    finally { leyendo = false; if (vista === 'clases') render(); }
  }
  const nuevaImagen = file => reducir(file).then(u => { imgPend = u; leerImagen(u); }, e => toast(e.message));
  // pegar (Ctrl+V) o arrastrar una imagen en cualquier parte de la sección
  document.addEventListener('paste', e => { if (vista !== 'clases') return; const f = [...(e.clipboardData && e.clipboardData.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); const t = $('#cl-txt'); if (t) window._clTxt = t.value; nuevaImagen(f); } });
  document.addEventListener('dragover', e => { if (vista === 'clases' && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', e => { if (vista !== 'clases') return; const f = [...(e.dataTransfer && e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); const t = $('#cl-txt'); if (t) window._clTxt = t.value; nuevaImagen(f); } });
  let agregar = () => {};
  const campos = () => [{ k: 'tema', l: 'Tema', req: 1, full: 1 }, { k: 'f', l: 'Fecha', t: 'date' }, { k: 'h', l: 'Hora', t: 'time' }, { k: 'link', l: 'Link de la clase', full: 1 }, { k: 'n', l: 'Nota (opcional)', full: 1 }];

  function tarjeta(c) {
    const d = c.f ? dif(c.f) : null, enlace = segura(c.link);
    const cuando = d === null ? '<span class="cl-warn">⚠ Sin fecha</span>' : d === 0 ? '<b class="cl-hoy">HOY</b>' : d === 1 ? 'Mañana' : d > 1 ? `En ${d} días` : `Hace ${-d} día${d === -1 ? '' : 's'}`;
    const dd = c.f ? new Date(c.f + 'T12:00:00') : null;
    return `<div class="card cl-item ${d === 0 ? 'cl-now' : ''} ${c.ok ? 'cl-ok' : ''}">
      <div class="cl-fecha">${dd ? `<small>${cap(dd.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''))}</small><b>${dd.getDate()}</b><small>${cap(dd.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''))}</small>` : '<b>?</b>'}</div>
      <div class="cl-med"><b class="cl-tema">${esc(c.tema || 'Clase sin tema')}</b>
        <div class="sub">${c.f ? esc(cap(fechaCorta(c.f))) : '<span class="cl-warn">⚠ Falta la fecha</span>'} · ${c.h ? '🕒 ' + esc(hFmt(c.h)) : '<span class="cl-warn">⚠ Falta la hora</span>'} · ${cuando}</div>
        ${c.p ? `<span class="chip on" style="cursor:default;font-size:12px;padding:2px 10px">${esc(c.p)}</span>` : ''}${c.n ? `<div class="sub" style="margin-top:4px">📝 ${esc(c.n)}</div>` : ''}
        ${imgsDe(c).length ? `<div class="cl-gal">${imgsDe(c).map((u, k) => `<img class="cl-img" data-ver="${esc(c.id)}" data-k="${k}" src="${esc(u)}" alt="Imagen ${k + 1} de la clase">`).join('')}</div>` : ''}
        ${enlace ? `<div class="cl-url">${esc(enlace.replace(/^https?:\/\//, '').slice(0, 60))}</div>` : '<div class="cl-warn" style="font-size:13px">⚠ Sin link</div>'}</div>
      <div class="cl-acc">
        ${enlace ? `<a class="btn btn-pri btn-sm" href="${esc(enlace)}" target="_blank" rel="noopener noreferrer">Entrar</a><button class="btn btn-sm" data-cp="${esc(c.id)}">Copiar link</button>` : ''}
        ${imgsDe(c).length < 3 ? `<button class="btn btn-sm" data-im="${esc(c.id)}">📷 Agregar imagen (${imgsDe(c).length}/3)</button>` : ''}
        <label class="chk"><input type="checkbox" data-ok="${esc(c.id)}" ${c.ok ? 'checked' : ''}> Asistí</label>
        <span><button class="btn btn-sm" data-e="${esc(c.id)}">Editar</button> <button class="btn btn-sm" data-d="${esc(c.id)}">Quitar</button></span>
      </div></div>`;
  }

  function pintar(el) {
    const c = E(), h = hoy();
    const prox = c.lista.filter(x => !x.f || x.f >= h).sort(ordenar), pas = c.lista.filter(x => x.f && x.f < h).sort((a, b) => ordenar(b, a));
    const L = tab === 'prox' ? prox : pas;
    el.innerHTML = `${secH('tareas', 'Clases', 'Fecha, hora, tema y link de tus clases en un solo lugar', '<button class="btn btn-pri" id="cl-nuevo" style="white-space:nowrap">+ Clase</button>')}
    <div class="card"><h3>Pega el mensaje de la clase</h3>
      <p class="sub">Pega el mensaje tal como te lo mandaron (WhatsApp, correo, Zoom…). Reconozco solo la <b>fecha</b>, el <b>día</b>, la <b>hora</b>, el <b>tema</b> y el <b>link</b>. Puedes pegar varias clases juntas.<br>📷 También puedes <b>copiar una imagen o captura y pegarla con Ctrl+V</b> (o arrastrarla aquí): leo el texto de la imagen y agrego la clase sola, sin subir nada desde tu dispositivo.</p>
      <textarea id="cl-txt" rows="5" placeholder="Ejemplo:&#10;Clase de Meta Ads: cómo escalar campañas&#10;Jueves 6 de noviembre, 8:00 p. m.&#10;https://us02web.zoom.us/j/123456789" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;margin:8px 0"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-pri" id="cl-add">Reconocer y agregar</button><button class="btn" id="cl-img">📷 Subir imagen</button><button class="btn" id="cl-lim">Limpiar</button></div>
      ${imgPend ? `<div style="margin-top:10px;display:flex;gap:10px;align-items:center"><img class="cl-img" src="${esc(imgPend)}" alt="" style="max-height:90px"><button class="btn btn-sm" id="cl-qimg">Quitar imagen</button></div><p class="sub">La imagen se guardará con la clase. </p>` : ''}
      ${ultimo ? `<p class="sub" style="margin-top:8px">${ultimo}</p>` : ''}</div>
    <div class="chips" id="cl-t"><button class="chip ${tab === 'prox' ? 'on' : ''}" data-t="prox">Próximas (${prox.length})</button><button class="chip ${tab === 'pas' ? 'on' : ''}" data-t="pas">Pasadas (${pas.length})</button></div>
    ${L.length ? L.map(tarjeta).join('') : `<div class="empty">${tab === 'prox' ? 'Aún no hay clases próximas. Pega arriba el mensaje de la clase.' : 'Aquí aparecerán las clases que ya pasaron.'}</div>`}`;

    el.querySelectorAll('#cl-t [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    $('#cl-lim').onclick = () => { $('#cl-txt').value = ''; ultimo = ''; imgPend = ''; render(); };
    const guardarTxt = () => { window._clTxt = $('#cl-txt').value; };
    $('#cl-txt').value = window._clTxt || ''; $('#cl-txt').oninput = guardarTxt;
    $('#cl-add').onclick = () => agregar();
    $('#cl-img').onclick = () => { guardarTxt(); elegir(u => { imgPend = u; leerImagen(u); }); };
    const qi = $('#cl-qimg'); if (qi) qi.onclick = () => { guardarTxt(); imgPend = ''; render(); };
    $('#cl-txt').onpaste = e => { const f = [...(e.clipboardData && e.clipboardData.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); guardarTxt(); nuevaImagen(f); } };
    el.querySelectorAll('[data-im]').forEach(b => b.onclick = () => elegir(u => { const x = c.lista.find(y => y.id === b.dataset.im); if (x) { guardarImgs(x, imgsDe(x).concat(u)); Store.save(); render(); } }));
    el.querySelectorAll('[data-ver]').forEach(i => i.onclick = () => { const x = c.lista.find(y => y.id === i.dataset.ver); if (x) visor(x, +i.dataset.k || 0); });
    agregar = tx0 => {
      const tx = (typeof tx0 === 'string' ? tx0 : $('#cl-txt').value).trim(); if (!tx && !imgPend) { toast('Pega el mensaje o sube una imagen'); return; }
      let nuevos = separar(tx).map(reconocer).filter(x => x.tema || x.link || x.f);
      if (!nuevos.length && imgPend) nuevos = [{ tema: '', link: '', f: '', h: '', p: '' }];
      if (!nuevos.length) { toast('No encontré datos de una clase en ese texto'); return; }
      nuevos.forEach(x => c.lista.push({ id: uid(), ...x, n: '', ok: false, imgs: imgPend ? [imgPend] : [] }));
      imgPend = ''; window._clTxt = '';
      const falt = nuevos.reduce((a, x) => a + (!x.f) + (!x.h) + (!x.link), 0);
      ultimo = `✅ Agregué ${nuevos.length} clase${nuevos.length > 1 ? 's' : ''}.` + (falt ? ' Revisa las que tienen ⚠ y complétalas con «Editar».' : ' Todo reconocido.');
      tab = 'prox'; Store.save(); render();
    };
    $('#cl-nuevo').onclick = () => openForm('Nueva clase', campos(), { f: hoy(), h: '20:00' }, v => { c.lista.push({ id: uid(), tema: v.tema, f: v.f, h: v.h, link: v.link ? urlOk(v.link.trim()) : '', p: v.link ? plataforma(v.link) : '', n: v.n, ok: false }); });
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const x = c.lista.find(y => y.id === b.dataset.e); openForm('Editar clase', campos(), x, v => Object.assign(x, { tema: v.tema, f: v.f, h: v.h, link: v.link ? urlOk(v.link.trim()) : '', p: v.link ? plataforma(v.link) : '', n: v.n })); });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDel('¿Quitar esta clase?', () => { c.lista = c.lista.filter(y => y.id !== b.dataset.d); }));
    el.querySelectorAll('[data-ok]').forEach(i => i.onchange = () => { const x = c.lista.find(y => y.id === i.dataset.ok); if (x) { x.ok = i.checked; Store.save(); render(); } });
    el.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { const x = c.lista.find(y => y.id === b.dataset.cp); if (x && navigator.clipboard) navigator.clipboard.writeText(x.link).then(() => toast('Link copiado'), () => toast('No se pudo copiar')); });
  }

  window.Clases = { vista: pintar, reconocer, separar };
  if ((location.hash || '').slice(1) === 'clases') render();
})();
