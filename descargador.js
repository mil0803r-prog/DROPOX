'use strict';
/* DROPOX — Descargadores independientes: Facebook y TikTok (sin marca de agua), por enlace, con enlaces guardados por plataforma. */
(() => {
  const PL = {
    facebook: { nombre: 'Facebook', titulo: 'Descargador de Facebook', sub: 'Videos y reels públicos de Facebook, con solo el enlace', re: /facebook\.com|fb\.watch|fb\.com/i, ph: 'https://www.facebook.com/reel/...  o  https://fb.watch/...', ayuda: 'Pega el enlace de un video o reel público de Facebook (facebook.com o fb.watch). Facebook no pone marca de agua en sus videos.' },
    tiktok: { nombre: 'TikTok', titulo: 'Descargador de TikTok', sub: 'Videos de TikTok sin marca de agua, con solo el enlace', re: /tiktok\.com/i, ph: 'https://www.tiktok.com/@usuario/video/...  o  https://vm.tiktok.com/...', ayuda: 'Pega el enlace de un video de TikTok (tiktok.com o vm.tiktok.com). Baja el video sin marca de agua, el audio o las imágenes.' },
  };
  const E = { facebook: { url: '', cargando: false, res: null, error: '', bajando: '' }, tiktok: { url: '', cargando: false, res: null, error: '', bajando: '' } };
  const lista = () => (S.enlaces = S.enlaces || []);
  const token = async () => (window.Nube && Nube.activo ? Nube.token() : null);
  async function pedir(params) {
    const tk = await token();
    if (!tk) throw new Error('Inicia sesión con tu cuenta para usar el descargador.');
    return fetch('/api/descargar?' + new URLSearchParams(params), { headers: { Authorization: 'Bearer ' + tk } });
  }
  async function obtener(k) {
    const e = E[k], P = PL[k]; e.error = ''; e.res = null;
    if (!P.re.test(e.url)) { e.error = `Ese enlace no es de ${P.nombre}. Pega un enlace de ${P.nombre}.`; render(); return; }
    e.cargando = true; render();
    try {
      const r = await pedir({ url: e.url.trim() });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se pudo leer el enlace.');
      e.res = d;
    } catch (x) { e.error = x.message || 'No se pudo leer el enlace.'; }
    e.cargando = false; render();
  }
  async function bajar(k, i) {
    const e = E[k], o = e.res.opciones[i]; e.bajando = String(i); e.error = ''; render();
    try {
      const r = await pedir({ bajar: o.url, nombre: o.nombre, tipo: o.tipo });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'No se pudo bajar el archivo.'); }
      const blob = await r.blob(), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = o.nombre + '.' + o.tipo; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast('Descarga lista');
    } catch (x) { e.error = x.message || 'No se pudo bajar el archivo.'; }
    e.bajando = ''; render();
  }
  function vista(el, k) {
    const e = E[k], P = PL[k], R = e.res;
    const guardados = lista().filter(x => x.plataforma === P.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    el.innerHTML = `${secH('descargar', P.titulo, P.sub)}
    <div class="card"><h3>Pega el enlace del video</h3><p class="sub">${esc(P.ayuda)}</p>
      <div class="field"><input id="dl-url" type="url" inputmode="url" autocomplete="off" placeholder="${esc(P.ph)}" value="${esc(e.url)}"></div>
      <button class="btn btn-pri" id="dl-go" style="margin-top:10px" ${e.cargando ? 'disabled' : ''}>${e.cargando ? 'Buscando…' : 'Obtener video'}</button> <button class="btn" id="dl-save" style="margin-top:10px">Guardar enlace</button>
      <p class="note">Descarga solo videos tuyos o que tengas permiso de usar. Los videos son de sus creadores y tienen derechos de autor. Funciona con videos públicos.</p></div>
    ${e.error ? `<div class="card" style="border-color:#dc2626"><b style="color:#dc2626">${esc(e.error)}</b></div>` : ''}
    ${R ? `<div class="card"><div class="fk-ph">${R.portada ? `<img src="${esc(R.portada)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(R.plataforma)}${R.autor ? ' · ' + esc(R.autor) : ''}</b><div class="it-s">${esc((R.titulo || '').slice(0, 160))}</div></div></div>
      <div class="list" style="margin-top:10px">${R.opciones.map((o, i) => `<div class="it"><div class="it-h"><b>${esc(o.etiqueta)}</b><span class="tag">${esc(o.tipo.toUpperCase())}</span></div><div class="it-a" style="margin:0"><button class="btn btn-sm btn-pri" data-b="${i}" ${e.bajando ? 'disabled' : ''}>${e.bajando === String(i) ? 'Bajando…' : 'Descargar'}</button></div></div>`).join('')}</div></div>` : ''}
    <div class="card"><h3>Enlaces guardados de ${esc(P.nombre)}</h3><p class="sub">${guardados.length ? guardados.length + ' guardados' : 'Guarda aquí los enlaces que quieras tener a la mano.'}</p>${guardados.length ? `<div class="list">${guardados.map(x => `<div class="it"><div class="it-h"><b>${esc(x.titulo || x.url)}</b></div><div class="it-s">${esc(x.fecha)}${x.nota ? ' · ' + esc(x.nota) : ''}</div><div class="it-s" style="word-break:break-all"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a></div><div class="it-a" style="margin:0"><button class="btn btn-sm btn-pri" data-gb="${x.id}">Descargar</button><button class="btn btn-sm" data-gc="${x.id}">Copiar</button><button class="btn btn-sm" data-ge="${x.id}">Nota</button><button class="btn btn-sm btn-del" data-gd="${x.id}">✕</button></div></div>`).join('')}</div>` : ''}</div>`;
    $('#dl-url').oninput = ev => { e.url = ev.target.value; };
    $('#dl-url').onkeydown = ev => { if (ev.key === 'Enter') { e.url = ev.target.value; obtener(k); } };
    $('#dl-go').onclick = () => { e.url = $('#dl-url').value; if (!e.url.trim()) { toast('Pega un enlace'); return; } obtener(k); };
    $('#dl-save').onclick = () => {
      e.url = $('#dl-url').value; const u = e.url.trim();
      if (!u) { toast('Pega un enlace'); return; }
      if (!P.re.test(u)) { toast(`Ese enlace no es de ${P.nombre}`); return; }
      if (lista().some(x => x.url === u)) { toast('Ese enlace ya está guardado'); return; }
      lista().push({ id: uid(), url: u, titulo: (R && R.titulo || '').slice(0, 120), plataforma: P.nombre, fecha: hoy(), nota: '' });
      Store.save(); toast('Enlace guardado'); render();
    };
    el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => bajar(k, +b.dataset.b));
    el.querySelectorAll('[data-gb]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.gb); e.url = x.url; obtener(k); window.scrollTo(0, 0); });
    el.querySelectorAll('[data-gc]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.gc); (navigator.clipboard ? navigator.clipboard.writeText(x.url).then(() => toast('Enlace copiado'), () => toast('No se pudo copiar')) : toast('No se pudo copiar')); });
    el.querySelectorAll('[data-ge]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.ge); openForm('Nota del enlace', [{ k: 'titulo', l: 'Nombre', full: 1 }, { k: 'nota', l: 'Nota', full: 1 }], x, v => Object.assign(x, v)); });
    el.querySelectorAll('[data-gd]').forEach(b => b.onclick = () => confirmDel('¿Quitar este enlace?', () => { S.enlaces = lista().filter(y => y.id !== b.dataset.gd); }));
  }
  window.Descargador = { vista };
  if (['dlfb', 'dltt', 'descargar'].includes((location.hash || '').slice(1))) render();
})();
