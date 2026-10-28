/* DROPOX — WhatsApp: bandeja de conversaciones para llevar cada pedido (chats, estados, mensajes listos y paso a Pedidos). */
(function () {
  const ESTADOS = { nuevo: 'Nuevo', interesado: 'Interesado', esperando: 'Esperando pago', confirmado: 'Confirmado', enviado: 'Enviado', entregado: 'Entregado', perdido: 'Perdido' };
  const TR = { shalom: 'Shalom', olva: 'Olva', bus: 'Bus' };
  const ET0 = [['Nuevo cliente', '#25a35a'], ['Nuevo pedido', '#2f7fe0'], ['Pago pendiente', '#e0a02f'], ['Pagado', '#14a39a'], ['Pedido finalizado', '#8a6fd1'], ['Seguimiento', '#e0562f']];
  const COL = ['#25a35a', '#2f7fe0', '#e0a02f', '#14a39a', '#8a6fd1', '#e0562f', '#d1479a', '#7a8794'];
  let sel = '', filtro = '', q = '', fet = '';
  const W = () => { const w = (S.wa = S.wa || {}); w.chats = w.chats || []; return w; };
  const chats = () => W().chats;
  const etqs = () => { const w = W(); if (!w.etq) w.etq = ET0.map(([n, c]) => ({ n, c })); return w.etq; };
  const col = n => (etqs().find(e => e.n === n) || { c: '#7a8794' }).c;
  const pill = n => `<span class="wa-et" style="background:${col(n)}">${esc(n)}</span>`;
  const tel = t => { const d = String(t || '').replace(/\D/g, ''); return d.length === 9 ? '51' + d : d; };
  const hora = ts => { const d = new Date(ts); return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); };
  const prev = c => { const m = (c.msgs || [])[c.msgs.length - 1]; return m ? (m.d === 'out' ? 'Tú: ' : '') + m.t : 'Sin mensajes'; };
  const plantillas = () => (window.Mensajes && Mensajes.plantillas ? Mensajes.plantillas() : []);
  const web = () => window.open('https://web.whatsapp.com', '_blank', 'noopener');
  const CAMPOS = [
    { k: 'nombre', l: 'Nombre del cliente', req: 1, full: 1 }, { k: 'tel', l: 'Celular (con WhatsApp)', t: 'tel' }, { k: 'ciudad', l: 'Ciudad' },
    { k: 'producto', l: 'Producto / color' }, { k: 'tr', l: 'Envío', t: 'select', opts: TR, def: 'shalom' },
    { k: 'estado', l: 'Estado', t: 'select', opts: ESTADOS, def: 'nuevo' }, { k: 'seg', l: 'Seguimiento (fecha)', t: 'date' },
    { k: 'nota', l: 'Nota', t: 'area', rows: 3, full: 1 },
  ];

  function lista(el) {
    const L = chats().filter(c => (!filtro || c.estado === filtro) && (!fet || (c.etq || []).includes(fet)) && (!q || [c.nombre, c.tel, c.ciudad, c.producto].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (b.ult || 0) - (a.ult || 0));
    const hoyS = hoy(); const dueHoy = chats().filter(c => c.seg && c.seg <= hoyS && !['entregado', 'perdido'].includes(c.estado)).length;
    return `<div class="wa-l">
      <input class="search" id="wq" type="search" placeholder="Buscar nombre, celular, ciudad…" value="${esc(q)}">
      <div class="chips"><button class="chip ${filtro === '' ? 'on' : ''}" data-f="">Todos<i>${chats().length}</i></button>${Object.entries(ESTADOS).map(([k, l]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${l}<i>${chats().filter(c => c.estado === k).length}</i></button>`).join('')}</div>
      <div class="chips"><button class="chip ${fet === '' ? 'on' : ''}" data-fe="">Etiquetas</button>${etqs().map(e => `<button class="chip ${fet === e.n ? 'on' : ''}" data-fe="${esc(e.n)}"><i style="background:${e.c};width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px"></i>${esc(e.n)}<i>${chats().filter(c => (c.etq || []).includes(e.n)).length}</i></button>`).join('')}<button class="chip" id="wne">+ Etiqueta</button></div>
      ${dueHoy ? `<div class="card wa-due">📌 ${dueHoy} cliente${dueHoy > 1 ? 's' : ''} para dar seguimiento hoy</div>` : ''}
      ${L.length ? L.map(c => `<div class="wa-r ${c.id === sel ? 'on' : ''}" data-c="${c.id}"><div class="wa-av">${esc((c.nombre || '?')[0].toUpperCase())}</div><div class="wa-rb"><div class="wa-rt"><b>${esc(c.nombre)}</b><small>${c.ult ? hora(c.ult) : ''}</small></div><div class="wa-rp">${esc(prev(c))}</div><div class="wa-rg">${(c.etq || []).map(pill).join('')}<span class="tag">${ESTADOS[c.estado]}</span>${c.tr ? `<span class="tag">${TR[c.tr]}</span>` : ''}${c.seg && c.seg <= hoyS && !['entregado', 'perdido'].includes(c.estado) ? '<span class="tag t-pendiente">Seguir</span>' : ''}</div></div></div>`).join('') : `<div class="card empty">${chats().length ? 'Ningún chat coincide.' : 'Aún no hay chats. Pulsa «+ Chat» cuando te escriba un cliente.'}</div>`}
    </div>`;
  }

  function chat(c) {
    if (!c) return `<div class="wa-c wa-vacio"><div class="card empty">Elige un chat a la izquierda<br><small>o crea uno con «+ Chat».</small></div></div>`;
    const T = plantillas();
    return `<div class="wa-c">
      <div class="wa-hd"><button class="btn btn-sm wa-back" id="wback">←</button><div class="wa-av">${esc((c.nombre || '?')[0].toUpperCase())}</div><div class="wa-hb"><b>${esc(c.nombre)}</b><small>${esc(c.tel || 'sin celular')}${c.ciudad ? ' · ' + esc(c.ciudad) : ''}${c.producto ? ' · ' + esc(c.producto) : ''}</small></div><button class="btn btn-sm" id="ced">Editar</button></div>
      <div class="wa-est wa-etq">${etqs().map(e => `<button class="wa-et ${(c.etq || []).includes(e.n) ? 'on' : 'off'}" style="--c:${e.c}" data-et="${esc(e.n)}">${esc(e.n)}</button>`).join('')}</div>
      <div class="wa-est">${Object.entries(ESTADOS).map(([k, l]) => `<button class="chip ${c.estado === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="wa-msgs" id="wmsgs">${(c.msgs || []).length ? c.msgs.map((m, i) => `<div class="wa-b ${m.d}"><span>${esc(m.t).replace(/\n/g, '<br>')}</span><small>${hora(m.ts)} <a data-dm="${i}" title="Quitar">✕</a></small></div>`).join('') : '<p class="note" style="text-align:center">Aún no hay mensajes. Escribe abajo, o pega lo que te escribió el cliente.</p>'}</div>
      <div class="wa-in">
        <select id="wpl"><option value="">Mensaje listo…</option>${T.map(t => `<option value="${esc(t.id)}">${esc(t.t)}</option>`).join('')}</select>
        <textarea id="wtx" rows="3" placeholder="Escribe tu respuesta o elige un mensaje listo…"></textarea>
        <div class="wa-ac"><button class="btn btn-pri" id="wcopy">Copiar mensaje</button><button class="btn" id="wsend">Abrir en WhatsApp</button><button class="btn" id="wcli">Pegar lo que dijo el cliente</button></div>
      </div>
      <div class="wa-ac2">${c.pedidoId && S.pedidos.some(p => p.id === c.pedidoId) ? '<span class="tag t-entregado">✅ Ya está en Pedidos</span>' : '<button class="btn btn-sm" id="wped">Pasar a Pedidos</button>'}<button class="btn btn-sm btn-del" id="wdel">Eliminar chat</button></div>
    </div>`;
  }

  function vista(el) {
    const c = chats().find(x => x.id === sel);
    el.innerHTML = `${secH('mensajes', 'WhatsApp', `${chats().length} chats · ${chats().filter(x => x.estado === 'esperando').length} esperando pago`, `<button class="btn" id="wweb">WhatsApp Web ↗</button> <button class="btn btn-pri" id="wnew">+ Chat</button>`)}
    <div class="wa ${c ? 'abierto' : ''}">${lista(el)}${chat(c)}</div>
    <p class="note">Uso manual, igual que las etiquetas de WhatsApp Business: etiqueta a cada cliente aquí, copia el mensaje listo y pégalo en tu WhatsApp Business. No lee tu WhatsApp automáticamente. Las etiquetas también debes ponerlas allá si quieres verlas en la app.</p>`;
    const g = (i) => el.querySelector(i);
    g('#wweb').onclick = web;
    g('#wnew').onclick = () => openForm('Nuevo chat', CAMPOS, {}, v => { const n = { id: uid(), ...v, msgs: [], ult: Date.now() }; chats().push(n); sel = n.id; });
    g('#wq').oninput = e => { q = e.target.value.toLowerCase(); const p = e.target.selectionStart; vista(el); const i = el.querySelector('#wq'); i.focus(); i.setSelectionRange(p, p); };
    el.querySelectorAll('[data-fe]').forEach(b => b.onclick = () => { fet = b.dataset.fe; vista(el); });
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; vista(el); });
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { sel = b.dataset.c; vista(el); });
    if (!c) return;
    const m = g('#wmsgs'); if (m) m.scrollTop = m.scrollHeight;
    g('#wne').onclick = () => openForm('Nueva etiqueta', [{ k: 'n', l: 'Nombre', req: 1, full: 1 }, { k: 'c', l: 'Color', t: 'select', opts: Object.fromEntries(COL.map((x, i) => [x, ['Verde', 'Azul', 'Amarillo', 'Turquesa', 'Morado', 'Naranja', 'Rosa', 'Gris'][i]])) }], {}, v => { if (!etqs().some(e => e.n === v.n)) etqs().push({ n: v.n.trim(), c: v.c }); });
    g('#wback').onclick = () => { sel = ''; vista(el); };
    g('#ced').onclick = () => openForm('Editar chat', CAMPOS, c, v => Object.assign(c, v));
    el.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { const n = b.dataset.et; c.etq = c.etq || []; c.etq = c.etq.includes(n) ? c.etq.filter(x => x !== n) : c.etq.concat(n); Store.save(); vista(el); });
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { c.estado = b.dataset.st; Store.save(); vista(el); });
    el.querySelectorAll('[data-dm]').forEach(a => a.onclick = () => { c.msgs.splice(+a.dataset.dm, 1); Store.save(); vista(el); });
    g('#wpl').onchange = e => { const t = plantillas().find(x => x.id === e.target.value); if (t) g('#wtx').value = t.x.replace(/\[cliente\]/g, (c.nombre || '').split(' ')[0]).replace(/\[producto\]/g, c.producto || '[producto]'); };
    const add = (d, t) => { c.msgs.push({ d, t, ts: Date.now() }); c.ult = Date.now(); Store.save(); };
    g('#wcopy').onclick = () => { const t = g('#wtx').value.trim(); if (!t) return toast('Escribe o elige un mensaje'); add('out', t); (navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast('Copiado: pégalo en tu WhatsApp Business'), () => toast('No se pudo copiar')) : toast('No se pudo copiar')); vista(el); };
    g('#wsend').onclick = () => {
      const t = g('#wtx').value.trim(); if (!t) return toast('Escribe o elige un mensaje');
      const n = tel(c.tel); if (!n) return toast('Falta el celular del cliente (Editar)');
      add('out', t); window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(t), '_blank', 'noopener'); vista(el);
    };
    g('#wcli').onclick = () => openForm('Lo que escribió el cliente', [{ k: 't', l: 'Pega aquí su mensaje', t: 'area', rows: 4, full: 1, req: 1 }], {}, v => add('in', v.t.trim()));
    const ped = g('#wped'); if (ped) ped.onclick = () => openForm('Pasar a Pedidos', [
      { k: 'producto', l: 'Producto', req: 1, full: 1, def: c.producto || '' }, { k: 'cantidad', l: 'Cantidad', t: 'number', def: 1 }, { k: 'precio', l: 'Precio venta unit. (S/)', t: 'number', def: 69 },
      { k: 'costo', l: 'Costo producto unit. (S/)', t: 'number' }, { k: 'flete', l: 'Flete (S/)', t: 'number' }], {}, v => {
      const id = uid(); S.pedidos.push({ id, fecha: hoy(), estado: 'pendiente', cliente: c.nombre, telefono: c.tel, ciudad: c.ciudad, canal: 'WhatsApp', otros: 0, ...v }); c.pedidoId = id;
      if (['nuevo', 'interesado', 'esperando'].includes(c.estado)) c.estado = 'confirmado';
    });
    g('#wdel').onclick = () => confirmDel('¿Eliminar este chat?', () => { W().chats = chats().filter(x => x.id !== c.id); sel = ''; });
  }
  window.WhatsApp = { vista };
  if ((location.hash || '').slice(1) === 'whatsapp') render();
})();
