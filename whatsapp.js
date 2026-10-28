/* DROPOX — WhatsApp: bandeja de conversaciones para llevar cada pedido (chats, estados, mensajes listos y paso a Pedidos). */
(function () {
  const ESTADOS = { nuevo: 'Nuevo', interesado: 'Interesado', esperando: 'Esperando pago', confirmado: 'Confirmado', enviado: 'Enviado', entregado: 'Entregado', perdido: 'Perdido' };
  const TR = { shalom: 'Shalom', olva: 'Olva', bus: 'Bus' };
  const ET0 = [['Nuevo cliente', '#25a35a'], ['Nuevo pedido', '#2f7fe0'], ['Pago pendiente', '#e0a02f'], ['Pagado', '#14a39a'], ['Pedido finalizado', '#8a6fd1'], ['Seguimiento', '#e0562f']];
  const COL = ['#25a35a', '#2f7fe0', '#e0a02f', '#14a39a', '#8a6fd1', '#e0562f', '#d1479a', '#7a8794'];
  let sel = '', filtro = '', q = '', fet = '';
  const W = () => { const w = (S.wa = S.wa || {}); w.chats = w.chats || []; if (!w.limpio1) { w.limpio1 = 1; w.chats.forEach(c => { if (c.auto) { c.etq = (c.etq || []).filter(n => n !== 'Nuevo cliente'); if (c.estado === 'nuevo') c.estado = ''; } }); } return w; };
  const chats = () => W().chats;
  const etqs = () => { const w = W(); if (!w.etq) w.etq = ET0.map(([n, c]) => ({ n, c })); return w.etq; };
  const col = n => (etqs().find(e => e.n === n) || { c: '#7a8794' }).c;
  const av = c => `<div class="wa-av">${c.foto ? `<img src="${esc(c.foto)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}${esc((c.nombre || '?')[0].toUpperCase())}</div>`;
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

  // ── Conexión con tu WhatsApp (QR) ──
  const con = { estado: '', qr: '', error: '', cargando: false, sync: 0 };
  let timer = null, tqr = 0;
  const media = {}; // archivos ya descargados (en memoria, no se guardan)
  const ICO = { imagen: '📷 Ver foto', video: '🎥 Ver video', audio: '🎤 Escuchar audio', doc: '📄 Abrir documento', sticker: 'Sticker' };
  const aBlob = (b64, mime) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: mime || 'application/octet-stream' })); };
  async function bajarMedia(m) {
    if (media[m.id] || media[m.id] === 0) return;
    media[m.id] = 0;
    try { const d = await api('media', { id: m.id }); if (d.ok) media[m.id] = { url: aBlob(d.base64, d.mime || ({ imagen: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg', sticker: 'image/webp' })[m.tipo]), nombre: d.nombre || 'archivo' }; else delete media[m.id]; } catch (e) { delete media[m.id]; }
  }
  const medioHtml = m => {
    const f = media[m.id];
    if (f) return m.tipo === 'imagen' || m.tipo === 'sticker' ? `<img class="wa-img" src="${f.url}" alt="">` : m.tipo === 'video' ? `<video class="wa-img" src="${f.url}" controls></video>` : m.tipo === 'audio' ? `<audio src="${f.url}" controls></audio>` : `<a class="btn btn-sm" href="${f.url}" download="${esc(f.nombre)}">📄 ${esc(f.nombre)}</a>`;
    return `<button class="btn btn-sm" data-md="${esc(m.id)}">${media[m.id] === 0 ? 'Cargando…' : ICO[m.tipo]}</button>`;
  };
  const intentados = new Set();
  async function api(accion, extra) {
    const tk = window.Nube && Nube.activo ? await Nube.token() : null;
    if (!tk) throw new Error('Inicia sesión con tu cuenta para conectar WhatsApp.');
    const r = await fetch('/api/wa', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ accion, ...(extra || {}) }) });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) throw new Error(d.error || 'Sesión vencida.');
    return d;
  }
  const abierto = () => con.estado === 'open';
  const viendo = () => (location.hash || '').slice(1) === 'whatsapp';
  const mismo = (c, t) => c.tel && t && String(c.tel).replace(/\D/g, '').slice(-9) === String(t).replace(/\D/g, '').slice(-9);
  async function estado(redib) {
    try {
      const d = await api('estado');
      con.error = d.sinConfig ? '' : (d.ok ? '' : d.error || '');
      con.estado = d.sinConfig ? 'sinConfig' : (d.ok ? d.estado : con.estado);
    } catch (e) { con.error = e.message; }
    if (redib) render();
  }
  async function pedirQr() {
    con.cargando = true; con.error = ''; render();
    try { const d = await api('qr'); if (d.sinConfig) con.estado = 'sinConfig'; else if (!d.ok) con.error = d.error || 'No se pudo generar el QR.'; con.qr = d.qr || ''; tqr = Date.now(); } catch (e) { con.error = e.message; }
    con.cargando = false; render();
  }
  async function sincronizar(forzar) {
    if (!abierto() || con.sincronizando) return;
    con.sincronizando = true; let cambio = false;
    try {
      const d = await api('chats'); if (!d.ok) throw new Error(d.error || '');
      const ocupados = [];
      d.chats.forEach(x => {
        let c = chats().find(y => (y.jid && y.jid === x.jid) || (!x.grupo && mismo(y, x.tel)));
        if (!c) { c = { id: uid(), nombre: x.nombre || x.tel || 'Sin nombre', tel: x.tel, jid: x.jid, grupo: !!x.grupo, estado: '', etq: [], msgs: [], ult: x.ult || Date.now(), auto: 1 }; chats().push(c); cambio = true; }
        if (!c.jid) { c.jid = x.jid; cambio = true; }
        if (x.nombre && c.auto && /^\d+$|Sin nombre/.test(c.nombre || '')) { c.nombre = x.nombre; cambio = true; }
        if (x.grupo && x.nombre && c.nombre !== x.nombre) { c.nombre = x.nombre; c.grupo = true; cambio = true; }
        if (x.tel && !c.tel) { c.tel = x.tel; cambio = true; }
        if (x.foto && c.foto !== x.foto) { c.foto = x.foto; cambio = true; }
        if (forzar || (!intentados.has(c.id) && !x.grupo && (!c.tel || /Sin nombre/.test(c.nombre || ''))) || c.id === sel || (x.ult || 0) > (c.sync || 0)) ocupados.push([c, x]);
      });
      for (const [c, x] of ocupados.slice(0, forzar ? 40 : 12)) {
        const m = await api('mensajes', { jid: c.jid }); if (!m.ok) continue;
        intentados.add(c.id);
        if (m.tel && !c.tel && !c.grupo) { c.tel = m.tel; cambio = true; }
        if (m.nombre && c.auto && !c.grupo && /^\d+$|Sin nombre/.test(c.nombre || '')) { c.nombre = m.nombre; cambio = true; }
        const ids = new Set((c.msgs || []).map(y => y.id).filter(Boolean));
        const nuevos = m.msgs.filter(y => !ids.has(y.id));
        if (nuevos.length) { c.msgs = (c.msgs || []).concat(nuevos).sort((a, b) => a.ts - b.ts); c.ult = Math.max(c.ult || 0, ...nuevos.map(y => y.ts)); cambio = true; }
        c.sync = Math.max(x.ult || 0, c.sync || 0);
      }
      let n = 0;
      for (const c of chats()) {
        if (n >= (forzar ? 20 : 6) || !c.jid || /@g\.us$/.test(c.jid)) continue;
        if (c.foto && c.perfilTs && Date.now() - c.perfilTs < 864e5) continue;
        if (c.perfilTs && Date.now() - c.perfilTs < 36e5) continue;
        n++; c.perfilTs = Date.now();
        try {
          const f = await api('perfil', { numero: c.tel || c.jid }); if (!f.ok) continue;
          if (f.foto && f.foto !== c.foto) c.foto = f.foto;
          if (f.info) c.info = f.info;
          if (f.nombre && c.auto && /^\d+$|Sin nombre/.test(c.nombre || '')) c.nombre = f.nombre;
          cambio = true;
        } catch (e) { /* sigue con el siguiente */ }
      }
      con.sync = Date.now();
    } catch (e) { con.error = e.message || 'No se pudo sincronizar.'; }
    con.sincronizando = false;
    if (cambio) Store.save();
    if (viendo()) render();
  }
  function latido() {
    if (timer) return;
    timer = setInterval(async () => {
      if (!viendo()) { clearInterval(timer); timer = null; return; }
      if (con.estado === 'sinConfig') return;
      if (!abierto()) { if (con.qr || con.estado === 'connecting') { const antes = con.estado; await estado(false); if (abierto()) { con.qr = ''; render(); sincronizar(true); } else if (con.qr && Date.now() - tqr > 25000) pedirQr(); else if (antes !== con.estado) render(); } return; }
      if (Date.now() - con.sync > 25000) {
        await estado(false);
        if (!abierto()) { con.error = 'Se desconectó. Escanea el QR otra vez (tus chats guardados siguen aquí).'; render(); return; }
        sincronizar(false);
      }
    }, 4000);
  }
  function barra() {
    if (con.estado === 'sinConfig') return `<div class="card wa-con"><b>Conectar tu WhatsApp con QR</b><p class="note" style="margin:6px 0 0">Todavía falta instalar el servidor de WhatsApp. Sigue los pasos que te di (Railway) y pon su dirección y clave en Vercel como <code>WA_URL</code> y <code>WA_KEY</code>. Cuando esté listo, aquí aparece el botón para escanear el QR.</p></div>`;
    if (abierto()) return `<div class="card wa-con wa-ok">🟢 <b>WhatsApp conectado</b> <small>${con.sync ? 'Última sincronización ' + hora(con.sync) : 'Sincronizando…'}</small><span class="push"><button class="btn btn-sm" id="wsync">${con.sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}</button> <button class="btn btn-sm" id="wdiag">Diagnóstico</button> <button class="btn btn-sm btn-del" id="wout">Desvincular</button></span></div>`;
    if (con.qr) return `<div class="card wa-con"><b>Escanea este QR</b><p class="note" style="margin:6px 0">En tu celular: WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo.</p><img class="wa-qr" alt="QR de WhatsApp" src="${con.qr.startsWith('data:') ? con.qr : 'data:image/png;base64,' + con.qr}"><p class="note" style="margin:6px 0 0">Se renueva solo. Cuando lo escanees, esta pantalla cambia sola.</p><button class="btn btn-sm btn-del" id="wout">Cancelar y desvincular</button></div>`;
    return `<div class="card wa-con">⚪ <b>WhatsApp sin conectar</b> <small>${esc(con.error || (con.estado === 'close' ? 'Está desconectado: escanea el QR para volver a recibir los chats.' : 'Conéctalo para que los chats lleguen solos.'))}</small><span class="push"><button class="btn btn-sm btn-pri" id="wqr">${con.cargando ? 'Generando…' : 'Conectar con QR'}</button> <button class="btn btn-sm btn-del" id="wout">Desvincular</button></span></div>`;
  }
  // ── Detectar los datos de pedido que el cliente escribió ──
  function leer(txt) {
    const L = String(txt).split(/\n+/).map(x => x.replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d{1,2}\s*[).]\s*/, '').trim()).filter(Boolean);
    const d = { nombre: '', dni: '', cel: '', ciudad: '', direccion: '', cantidad: '' }, libres = [];
    L.forEach(l => {
      if (/:\s*$/.test(l)) return; // título sin respuesta
      const m = l.match(/^([^:]{2,45}):\s*(.+)$/); const k = m ? m[1].toLowerCase() : '', v = m ? m[2].trim() : l;
      if (!m) libres.push(v);
      else if (/agencia|direcci|referencia/.test(k)) d.direccion = d.direccion ? d.direccion + ' · ' + v : v;
      else if (/departamento|provincia|distrito|ciudad|lugar/.test(k)) d.ciudad = d.ciudad ? d.ciudad + ', ' + v : v;
      else if (/nombre/.test(k)) d.nombre = v;
      else if (/dni|documento/.test(k)) d.dni = (v.match(/\d{8}/) || [''])[0];
      else if (/cel|tel|n[uú]mero|whats/.test(k)) d.cel = (v.replace(/\D/g, '').match(/9\d{8}$/) || [''])[0];
      else if (/cantidad|unidades/.test(k)) d.cantidad = (v.match(/\d+/) || [''])[0];
    });
    libres.forEach(v => {
      const dig = v.replace(/\D/g, '');
      if (!d.dni && /^\d{8}$/.test(dig) && dig === v.replace(/\s/g, '')) d.dni = dig;
      else if (!d.cel && /^9\d{8}$/.test(dig) && v.replace(/[\d\s+()-]/g, '') === '') d.cel = dig;
      else if (!d.cantidad && /^\d{1,2}$/.test(v.trim())) d.cantidad = v.trim();
      else if (!d.nombre && /^[A-Za-zÁÉÍÓÚÑáéíóúñ .'-]{4,}$/.test(v)) d.nombre = v;
      else if (!d.ciudad && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(v)) d.ciudad = v;
      else if (!d.direccion && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(v)) d.direccion = v;
    });
    d.puntos = ['nombre', 'dni', 'cel', 'ciudad', 'direccion'].filter(k => d[k]).length;
    return d;
  }
  function detectar(c) {
    const ins = (c.msgs || []).filter(m => m.d === 'in' && m.t && !m.tipo);
    if (!ins.length) return null;
    let mejor = null;
    const prueba = t => { const d = leer(t); if (!mejor || d.puntos > mejor.puntos) mejor = d; };
    ins.slice(-8).forEach(m => prueba(m.t));
    prueba(ins.slice(-6).map(m => m.t).join('\n'));
    return mejor && mejor.puntos >= 3 ? mejor : null;
  }
  const yaPedido = c => c.pedidoId && S.pedidos.some(p => p.id === c.pedidoId);
  const listos = () => chats().map(c => ({ c, d: yaPedido(c) ? null : detectar(c) })).filter(x => x.d);
  const nuevoPedido = (c, d, ex) => {
    const of = window.Mensajes && Mensajes.dato ? Mensajes.dato('oferta') : '', precio = parseFloat((of.match(/[\d.]+/) || [0])[0]) || 0;
    const id = uid();
    S.pedidos.push({ id, fecha: hoy(), estado: 'pendiente', producto: (window.Mensajes && Mensajes.dato('producto')) || c.producto || 'Producto', cliente: d.nombre || c.nombre, telefono: d.cel || c.tel || '', ciudad: [d.ciudad || c.ciudad, d.direccion].filter(Boolean).join(' · '), canal: 'WhatsApp', cantidad: +d.cantidad || 1, precio, costo: 0, flete: 0, otros: 0, dni: d.dni || '', ...(ex || {}) });
    c.pedidoId = id; if (!c.estado || ['nuevo', 'interesado', 'esperando'].includes(c.estado)) c.estado = 'confirmado';
    if (d.cel && !c.tel) c.tel = d.cel;
  };
  function revisar() {
    const L = listos(); if (!L.length) return toast('No encontré chats con datos de pedido completos');
    openForm('Pasar a Pedidos (' + L.length + ')', L.map(({ c, d }) => ({ k: 'c_' + c.id, t: 'check', def: true, l: `${d.nombre || c.nombre} · ${d.cel || c.tel || 'sin cel'} · ${[d.ciudad, d.direccion].filter(Boolean).join(' · ') || 'sin ciudad'} · x${d.cantidad || 1}${d.dni ? ' · DNI ' + d.dni : ''}` })), {}, v => {
      let n = 0; L.forEach(({ c, d }) => { if (v['c_' + c.id]) { nuevoPedido(c, d); n++; } });
      toast(n + ' pedido' + (n === 1 ? '' : 's') + ' creado' + (n === 1 ? '' : 's') + ' en Pedidos ✅');
    });
  }
  function lista(el) {
    const L = chats().filter(c => (!filtro || (filtro === '__g' ? c.grupo : c.estado === filtro)) && (!fet || (c.etq || []).includes(fet)) && (!q || [c.nombre, c.tel, c.ciudad, c.producto].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (b.ult || 0) - (a.ult || 0));
    const hoyS = hoy(); const dueHoy = chats().filter(c => c.seg && c.seg <= hoyS && !['entregado', 'perdido'].includes(c.estado)).length;
    return `<div class="wa-l">
      <input class="search" id="wq" type="search" placeholder="Buscar nombre, celular, ciudad…" value="${esc(q)}">
      <div class="chips"><button class="chip ${filtro === '' ? 'on' : ''}" data-f="">Todos<i>${chats().length}</i></button><button class="chip ${filtro === '__g' ? 'on' : ''}" data-f="__g">Grupos<i>${chats().filter(c => c.grupo).length}</i></button>${Object.entries(ESTADOS).map(([k, l]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${l}<i>${chats().filter(c => c.estado === k).length}</i></button>`).join('')}</div>
      <div class="chips"><button class="chip ${fet === '' ? 'on' : ''}" data-fe="">Etiquetas</button>${etqs().map(e => `<button class="chip ${fet === e.n ? 'on' : ''}" data-fe="${esc(e.n)}"><i style="background:${e.c};width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px"></i>${esc(e.n)}<i>${chats().filter(c => (c.etq || []).includes(e.n)).length}</i></button>`).join('')}<button class="chip" id="wne">+ Etiqueta</button></div>
      ${listos().length ? `<div class="card wa-due">📦 ${listos().length} chat${listos().length > 1 ? 's' : ''} con datos de pedido listos <button class="btn btn-sm btn-pri" id="wrev">Revisar y pasar a Pedidos</button></div>` : ''}
      ${dueHoy ? `<div class="card wa-due">📌 ${dueHoy} cliente${dueHoy > 1 ? 's' : ''} para dar seguimiento hoy</div>` : ''}
      ${L.length ? L.map(c => `<div class="wa-r ${c.id === sel ? 'on' : ''}" data-c="${c.id}">${av(c)}<div class="wa-rb"><div class="wa-rt"><b>${esc(c.nombre)}${c.tel ? ' <small class="wa-n">+' + esc(String(c.tel).replace(/\D/g, '')) + '</small>' : ''}</b><small>${c.ult ? hora(c.ult) : ''}</small></div><div class="wa-rp">${esc(prev(c))}</div><div class="wa-rg">${(c.etq || []).map(pill).join('')}${c.estado ? `<span class="tag">${ESTADOS[c.estado]}</span>` : ''}${c.tr ? `<span class="tag">${TR[c.tr]}</span>` : ''}${c.seg && c.seg <= hoyS && !['entregado', 'perdido'].includes(c.estado) ? '<span class="tag t-pendiente">Seguir</span>' : ''}</div></div></div>`).join('') : `<div class="card empty">${chats().length ? 'Ningún chat coincide.' : 'Aún no hay chats. Pulsa «+ Chat» cuando te escriba un cliente.'}</div>`}
    </div>`;
  }

  function chat(c) {
    if (!c) return `<div class="wa-c wa-vacio"><div class="card empty">Elige un chat a la izquierda<br><small>o crea uno con «+ Chat».</small></div></div>`;
    const T = plantillas();
    return `<div class="wa-c">
      <div class="wa-hd"><button class="btn btn-sm wa-back" id="wback">←</button>${av(c)}<div class="wa-hb"><b>${esc(c.nombre)}</b><small>${esc((c.tel ? '+' + String(c.tel).replace(/\D/g, '') : 'sin celular') + (c.info ? ' · ' + c.info : ''))}${c.ciudad ? ' · ' + esc(c.ciudad) : ''}${c.producto ? ' · ' + esc(c.producto) : ''}</small></div><button class="btn btn-sm" id="ced">Editar</button></div>
      <div class="wa-est wa-etq">${etqs().map(e => `<button class="wa-et ${(c.etq || []).includes(e.n) ? 'on' : 'off'}" style="--c:${e.c}" data-et="${esc(e.n)}">${esc(e.n)}</button>`).join('')}</div>
      <div class="wa-est">${Object.entries(ESTADOS).map(([k, l]) => `<button class="chip ${c.estado === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="wa-msgs" id="wmsgs">${(c.msgs || []).length ? c.msgs.map((m, i) => `<div class="wa-b ${m.d}">${c.grupo && m.d === 'in' && m.nombre ? `<b class="wa-qn">${esc(m.nombre)}</b>` : ''}${m.tipo && m.id ? medioHtml(m) : ''}${m.tipo && /^(📷 Foto|🎥 Video|🎤 Audio|📄 Documento|Sticker)$/.test(m.t) ? '' : `<span>${esc(m.t).replace(/\n/g, '<br>')}</span>`}<small>${hora(m.ts)}${m.d === 'out' ? ' <i class="wa-tk">✓✓</i>' : ''} <a data-dm="${i}" title="Quitar">✕</a></small></div>`).join('') : '<p class="note" style="text-align:center">Aún no hay mensajes. Escribe abajo, o pega lo que te escribió el cliente.</p>'}</div>
      <div class="wa-in">
        <select id="wpl"><option value="">Mensaje listo…</option>${T.map(t => `<option value="${esc(t.id)}">${esc(t.t)}</option>`).join('')}</select>
        <textarea id="wtx" rows="3" placeholder="Escribe un mensaje"></textarea>
        <div class="wa-ac">${abierto() ? '<button class="btn btn-pri" id="wapi">Enviar</button><button class="btn" id="wcopy">Copiar</button>' : '<button class="btn btn-pri" id="wcopy">Copiar mensaje</button>'}${abierto() ? '<button class="btn" id="wfile">📎 Archivo</button><input type="file" id="wfin" hidden>' : ''}<button class="btn" id="wsend">Abrir en WhatsApp</button><button class="btn" id="wcli">Pegar lo que dijo el cliente</button></div>
      </div>
      <div class="wa-ac2">${c.pedidoId && S.pedidos.some(p => p.id === c.pedidoId) ? '<span class="tag t-entregado">✅ Ya está en Pedidos</span>' : '<button class="btn btn-sm" id="wped">Pasar a Pedidos</button>'}<button class="btn btn-sm btn-del" id="wdel">Eliminar chat</button></div>
    </div>`;
  }

  function vista(el) {
    const c = chats().find(x => x.id === sel);
    const ant = document.querySelector('#wtx'), borrador = ant ? ant.value : '';
    el.innerHTML = `${secH('mensajes', 'WhatsApp', `${chats().length} chats · ${chats().filter(x => x.estado === 'esperando').length} esperando pago`, `<button class="btn" id="wweb">WhatsApp Web ↗</button> <button class="btn btn-pri" id="wnew">+ Chat</button>`)}
    ${barra()}
    <div class="wa ${c ? 'abierto' : ''}">${lista(el)}${chat(c)}</div>
    <p class="note">Uso manual, igual que las etiquetas de WhatsApp Business: etiqueta a cada cliente aquí, copia el mensaje listo y pégalo en tu WhatsApp Business. No lee tu WhatsApp automáticamente. Las etiquetas también debes ponerlas allá si quieres verlas en la app.</p>`;
    const g = (i) => el.querySelector(i);
    if (borrador && g('#wtx')) g('#wtx').value = borrador;
    if (g('#wrev')) g('#wrev').onclick = revisar;
    if (g('#wqr')) g('#wqr').onclick = pedirQr;
    if (g('#wsync')) g('#wsync').onclick = () => { sincronizar(true); render(); };
    if (g('#wdiag')) g('#wdiag').onclick = async () => { try { const d = await api('diag'); openInfo('<h2>Diagnóstico de WhatsApp</h2><p class="note">Copia este texto y envíaselo a Claude. No incluye nombres ni números.</p><textarea readonly rows="12" style="width:100%;font-family:monospace;font-size:12px">' + esc(JSON.stringify(d, null, 1)) + '</textarea>'); } catch (e) { toast(e.message); } };
    if (g('#wout')) g('#wout').onclick = () => ask('¿Desvincular tu WhatsApp? Se quita de «Dispositivos vinculados» sin que toques el celular. Tus chats guardados aquí no se borran.', () => { api('salir').catch(() => {}).then(() => { con.estado = 'close'; con.qr = ''; con.error = 'WhatsApp desvinculado.'; toast('WhatsApp desvinculado ✅'); render(); }); }, 'Desvincular');
    if (!con.estado && !con.pidio) { con.pidio = 1; estado(true).then(() => { if (abierto()) sincronizar(true); }); }
    latido();
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
    el.querySelectorAll('[data-md]').forEach(b => b.onclick = async () => { const m = c.msgs.find(y => y.id === b.dataset.md); if (!m) return; media[m.id] = 0; vista(el); await bajarMedia(m); vista(el); });
    if (abierto()) (async () => { let hubo = false; for (const m of (c.msgs || []).filter(y => y.tipo === 'imagen' && y.id && media[y.id] === undefined).slice(-6)) { await bajarMedia(m); hubo = true; } if (hubo && sel === c.id && viendo()) vista(el); })();
    if (g('#wfile')) { g('#wfile').onclick = () => g('#wfin').click(); g('#wfin').onchange = async e => {
      const f = e.target.files[0]; if (!f) return; if (f.size > 3.2e6) return toast('El archivo es muy grande (máximo 3 MB)');
      const n = c.jid && !c.tel ? c.jid : tel(c.tel); if (!n) return toast('Falta el celular del cliente (Editar)');
      const b64 = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.readAsDataURL(f); });
      const tipo = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'document';
      try { toast('Enviando…'); const d = await api('enviarMedia', { numero: n, tipo, base64: b64, mime: f.type, nombre: f.name, texto: g('#wtx').value.trim() }); if (!d.ok) throw new Error(d.error || 'No se pudo enviar'); add('out', g('#wtx').value.trim() || ({ image: '📷 Foto', video: '🎥 Video', audio: '🎤 Audio', document: '📄 ' + f.name })[tipo]); toast('Enviado ✅'); } catch (x) { toast(x.message); }
      vista(el);
    }; }
    if (g('#wapi')) g('#wapi').onclick = async () => {
      const t = g('#wtx').value.trim(); if (!t) return toast('Escribe o elige un mensaje');
      const n = c.jid && !c.tel ? c.jid : tel(c.tel); if (!n) return toast('Falta el celular del cliente (Editar)');
      g('#wapi').disabled = true;
      try { const d = await api('enviar', { numero: n, texto: t }); if (!d.ok) throw new Error(d.error || 'No se pudo enviar'); add('out', t); g('#wtx').value = ''; toast('Enviado ✅'); } catch (e) { toast(e.message); }
      vista(el);
    };
    g('#wsend').onclick = () => {
      const t = g('#wtx').value.trim(); if (!t) return toast('Escribe o elige un mensaje');
      const n = tel(c.tel); if (!n) return toast('Falta el celular del cliente (Editar)');
      add('out', t); window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(t), '_blank', 'noopener'); vista(el);
    };
    g('#wcli').onclick = () => openForm('Lo que escribió el cliente', [{ k: 't', l: 'Pega aquí su mensaje', t: 'area', rows: 4, full: 1, req: 1 }], {}, v => add('in', v.t.trim()));
    const det = detectar(c);
    const ped = g('#wped'); if (ped && det) ped.onclick = () => { nuevoPedido(c, det); Store.save(); toast('Pedido creado en Pedidos ✅ (con los datos que escribió el cliente)'); vista(el); };
    else if (ped) ped.onclick = () => openForm('Pasar a Pedidos', [
      { k: 'producto', l: 'Producto', req: 1, full: 1, def: c.producto || '' }, { k: 'cantidad', l: 'Cantidad', t: 'number', def: 1 }, { k: 'precio', l: 'Precio venta unit. (S/)', t: 'number', def: 69 },
      { k: 'costo', l: 'Costo producto unit. (S/)', t: 'number' }, { k: 'flete', l: 'Flete (S/)', t: 'number' }], {}, v => {
      const id = uid(); S.pedidos.push({ id, fecha: hoy(), estado: 'pendiente', cliente: c.nombre, telefono: c.tel, ciudad: c.ciudad, canal: 'WhatsApp', otros: 0, ...v }); c.pedidoId = id;
      if (!c.estado || ['nuevo', 'interesado', 'esperando'].includes(c.estado)) c.estado = 'confirmado';
    });
    g('#wdel').onclick = () => confirmDel('¿Eliminar este chat?', () => { W().chats = chats().filter(x => x.id !== c.id); sel = ''; });
  }
  window.WhatsApp = { vista };
  if ((location.hash || '').slice(1) === 'whatsapp') render();
})();
