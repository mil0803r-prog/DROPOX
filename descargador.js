'use strict';
/* DROPOX — Descargador de videos de TikTok (sin marca de agua) y Facebook, por enlace. */
(() => {
  let estado = { url: '', cargando: false, res: null, error: '', bajando: '' };
  const lista = () => (S.enlaces = S.enlaces || []);
  const plat = u => (/tiktok\.com/i.test(u) ? 'TikTok' : /facebook\.com|fb\.watch|fb\.com/i.test(u) ? 'Facebook' : 'Otro');
  const token = async () => (window.Nube && Nube.activo ? Nube.token() : null);
  async function pedir(params) {
    const tk = await token();
    if (!tk) throw new Error('Inicia sesión con tu cuenta para usar el descargador.');
    return fetch('/api/descargar?' + new URLSearchParams(params), { headers: { Authorization: 'Bearer ' + tk } });
  }
  async function obtener() {
    estado.error = ''; estado.res = null; estado.cargando = true; render();
    try {
      const r = await pedir({ url: estado.url.trim() });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se pudo leer el enlace.');
      estado.res = d;
    } catch (e) { estado.error = e.message || 'No se pudo leer el enlace.'; }
    estado.cargando = false; render();
  }
  async function bajar(i) {
    const o = estado.res.opciones[i]; estado.bajando = String(i); estado.error = ''; render();
    try {
      const r = await pedir({ bajar: o.url, nombre: o.nombre, tipo: o.tipo });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'No se pudo bajar el archivo.'); }
      const blob = await r.blob(), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = o.nombre + '.' + o.tipo; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast('Descarga lista');
    } catch (e) { estado.error = e.message || 'No se pudo bajar el archivo.'; }
    estado.bajando = ''; render();
  }
  function vista(el) {
    const R = estado.res;
    el.innerHTML = `${secH('descargar', 'Descargador', 'Videos de TikTok sin marca de agua y de Facebook, con solo el enlace')}
    <div class="card"><h3>Pega el enlace del video</h3><p class="sub">TikTok (tiktok.com, vm.tiktok.com) o Facebook (facebook.com, fb.watch, reels)</p>
      <div class="field"><input id="dl-url" type="url" inputmode="url" autocomplete="off" placeholder="https://www.tiktok.com/@usuario/video/..." value="${esc(estado.url)}"></div>
      <button class="btn btn-pri" id="dl-go" style="margin-top:10px" ${estado.cargando ? 'disabled' : ''}>${estado.cargando ? 'Buscando…' : 'Obtener video'}</button> <button class="btn" id="dl-save" style="margin-top:10px">Guardar enlace</button>
      <p class="note">Descarga solo videos tuyos o que tengas permiso de usar. Los videos son de sus creadores y tienen derechos de autor. Funciona con videos públicos.</p></div>
    ${estado.error ? `<div class="card" style="border-color:#dc2626"><b style="color:#dc2626">${esc(estado.error)}</b></div>` : ''}
    ${R ? `<div class="card"><div class="fk-ph">${R.portada ? `<img src="${esc(R.portada)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(R.plataforma)}${R.autor ? ' · ' + esc(R.autor) : ''}</b><div class="it-s">${esc((R.titulo || '').slice(0, 160))}</div></div></div>
      <div class="list" style="margin-top:10px">${R.opciones.map((o, i) => `<div class="it"><div class="it-h"><b>${esc(o.etiqueta)}</b><span class="tag">${esc(o.tipo.toUpperCase())}</span></div><div class="it-a" style="margin:0"><button class="btn btn-sm btn-pri" data-b="${i}" ${estado.bajando ? 'disabled' : ''}>${estado.bajando === String(i) ? 'Bajando…' : 'Descargar'}</button></div></div>`).join('')}</div></div>` : ''}`;
    const guardados = lista().slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    el.insertAdjacentHTML('beforeend', `<div class="card"><h3>Enlaces guardados</h3><p class="sub">${guardados.length ? guardados.length + ' guardados' : 'Guarda aquí los enlaces de videos que quieras tener a la mano.'}</p>${guardados.length ? `<div class="list">${guardados.map(x => `<div class="it"><div class="it-h"><b>${esc(x.titulo || x.url)}</b><span class="tag">${esc(x.plataforma)}</span></div><div class="it-s">${esc(x.fecha)}${x.nota ? ' · ' + esc(x.nota) : ''}</div><div class="it-s" style="word-break:break-all"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a></div><div class="it-a" style="margin:0"><button class="btn btn-sm btn-pri" data-gb="${x.id}">Descargar</button><button class="btn btn-sm" data-gc="${x.id}">Copiar</button><button class="btn btn-sm" data-ge="${x.id}">Nota</button><button class="btn btn-sm btn-del" data-gd="${x.id}">✕</button></div></div>`).join('')}</div>` : ''}</div>`);
    const gcard = el.querySelector('#dl-save');
    if (gcard) gcard.onclick = () => {
      const u = estado.url.trim(); if (!u) { toast('Pega un enlace'); return; }
      if (lista().some(x => x.url === u)) { toast('Ese enlace ya está guardado'); return; }
      lista().push({ id: uid(), url: u, titulo: (R && R.titulo || '').slice(0, 120), plataforma: R ? R.plataforma : plat(u), fecha: hoy(), nota: '' });
      Store.save(); toast('Enlace guardado'); render();
    };
    el.querySelectorAll('[data-gb]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.gb); estado.url = x.url; estado.res = null; obtener(); window.scrollTo(0, 0); });
    el.querySelectorAll('[data-gc]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.gc); (navigator.clipboard ? navigator.clipboard.writeText(x.url).then(() => toast('Enlace copiado'), () => toast('No se pudo copiar')) : toast('No se pudo copiar')); });
    el.querySelectorAll('[data-ge]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.ge); openForm('Nota del enlace', [{ k: 'titulo', l: 'Nombre', full: 1 }, { k: 'nota', l: 'Nota', full: 1 }], x, v => Object.assign(x, v)); });
    el.querySelectorAll('[data-gd]').forEach(b => b.onclick = () => confirmDel('¿Quitar este enlace?', () => { S.enlaces = lista().filter(y => y.id !== b.dataset.gd); }));
    $('#dl-url').oninput = e => { estado.url = e.target.value; };
    $('#dl-url').onkeydown = e => { if (e.key === 'Enter') { estado.url = e.target.value; obtener(); } };
    $('#dl-go').onclick = () => { estado.url = $('#dl-url').value; if (!estado.url.trim()) { toast('Pega un enlace'); return; } obtener(); };
    el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => bajar(+b.dataset.b));
  }
  window.Descargador = { vista };
  if ((location.hash || '').slice(1) === 'descargar') render();
})();
