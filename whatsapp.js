/* DROPOX — WhatsApp: bandeja de conversaciones para llevar cada pedido (chats, estados, mensajes listos y paso a Pedidos). */
(function () {
  const ESTADOS = { nuevo: 'Nuevo', interesado: 'Interesado', esperando: 'Esperando pago', confirmado: 'Confirmado', enviado: 'Enviado', entregado: 'Entregado', perdido: 'Perdido' };
  const TR = { shalom: 'Shalom', olva: 'Olva', bus: 'Bus' };
  const ET0 = [['Nuevo cliente', '#25a35a'], ['Nuevo pedido', '#2f7fe0'], ['Pago pendiente', '#e0a02f'], ['Pagado', '#14a39a'], ['Pedido finalizado', '#8a6fd1'], ['Seguimiento', '#e0562f']];
  const COL = ['#25a35a', '#2f7fe0', '#e0a02f', '#14a39a', '#8a6fd1', '#e0562f', '#d1479a', '#7a8794'];
  let sel = '', filtro = '', q = '', fet = '', modo = 'lista';
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
  // deja la plataforma vacía de chats (los pedidos ya creados NO se tocan)
  function vaciar() { const w = W(); w.chats = []; delete w.owner; sel = ''; Object.keys(media).forEach(k => delete media[k]); intentados.clear(); Store.save(); }
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
      const q = await api('quien').catch(() => null);
      if (q && q.ok && q.dueno) {
        const w = W(), nuevo = q.dueno.split('@')[0].split(':')[0];
        if (w.owner && w.owner !== nuevo) { w.chats = []; sel = ''; Object.keys(media).forEach(k => delete media[k]); intentados.clear(); toast('Cambiaste de número de WhatsApp: la lista se vació para no mezclar chats'); cambio = true; }
        if (w.owner !== nuevo) { w.owner = nuevo; cambio = true; }
      }
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
    if (entranTablero()) cambio = true;
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
    return `<div class="card wa-con">⚪ <b>WhatsApp sin conectar</b> <small>${esc(con.error || (con.estado === 'close' ? 'Está desconectado: escanea el QR para volver a recibir los chats.' : 'Conéctalo para que los chats lleguen solos.'))}</small><span class="push"><button class="btn btn-sm btn-pri" id="wqr">${con.cargando ? 'Generando…' : 'Conectar con QR'}</button> <button class="btn btn-sm btn-del" id="wout">Desvincular</button> <button class="btn btn-sm" id="wvac">Vaciar chats</button></span></div>`;
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
    if (d.puntos < 4) { // texto corrido, sin títulos: «NOMBRE. 921992845 62667412. Huánuco. Dirección…»
      const t = String(txt).replace(/\s+/g, ' ').trim();
      const mc = t.match(/(?<!\d)9\d{2}[\s-]?\d{3}[\s-]?\d{3}(?!\d)/), cel = mc ? mc[0].replace(/\D/g, '') : '';
      const sinCel = mc ? t.replace(mc[0], ' '.repeat(mc[0].length)) : t;
      const md = sinCel.match(/(?<!\d)\d{8}(?!\d)/), dni = md ? md[0] : '';
      const pos = [mc ? t.indexOf(mc[0]) : -1, md ? sinCel.indexOf(md[0]) : -1].filter(x => x >= 0);
      if (cel || dni) {
        const ini = Math.min(...pos), fin = Math.max(...[mc ? t.indexOf(mc[0]) + mc[0].length : 0, md ? sinCel.indexOf(md[0]) + 8 : 0]);
        const nom = t.slice(0, ini).replace(/[^\p{L} .'-]/gu, ' ').replace(/[.\s]+$/, '').replace(/\s+/g, ' ').trim();
        const ruido = /\b(then|yes|exactly|another|episode|siempre|n[uú]meros)\b/i;
        let resto = t.slice(fin); const cut = resto.search(ruido); if (cut >= 0) resto = resto.slice(0, cut);
        const segs = resto.split(/(?<=\p{L}{4,})[.;]\s+|[;\n]|,\s*/u).map(x => x.replace(/^[.\s]+|[.\s]+$/g, '')).filter(x => /\p{L}{3,}/u.test(x));
        const roto = v => !v || (cel && v.includes(cel)) || (dni && v.includes(dni)) || v.length > 90;
        if (roto(d.nombre)) d.nombre = '';
        if (roto(d.ciudad)) d.ciudad = '';
        if (roto(d.direccion)) d.direccion = '';
        if (!d.nombre && nom.length >= 4) d.nombre = nom;
        if (!d.dni) d.dni = dni;
        if (!d.cel) d.cel = cel;
        if (!d.ciudad && !d.direccion && segs.length === 1) { const w = segs[0].match(/^(\S+)\s+(.+)$/); d.ciudad = w ? w[1] : segs[0]; d.direccion = w ? w[2] : ''; }
        else { if (!d.ciudad && segs.length) d.ciudad = segs[0]; if (!d.direccion && segs.length > 1) d.direccion = segs.slice(1).join(' · '); }
      }
      d.puntos = ['nombre', 'dni', 'cel', 'ciudad', 'direccion'].filter(k => d[k]).length;
    }
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
  // ── Tableros (estilo Kanban): cada chat está en un tablero a la vez, aparte de las etiquetas ──
  const tabs = () => { const w = W(); if (!Array.isArray(w.tabs)) w.tabs = [{ id: 't0', n: 'Datos recibidos', c: '#7a8794' }, { id: 't1', n: 'Guía generada en Shalom', c: '#e0a02f' }, { id: 't2', n: 'En ruta', c: '#2f7fe0' }, { id: 't3', n: 'Entregado', c: '#25a35a' }, { id: 't4', n: 'Recompra', c: '#8a6fd1' }]; if (!w.tabsV2) { w.tabsV2 = 1; if (!w.tabs.some(t => t.id === 't0')) w.tabs.unshift({ id: 't0', n: 'Datos recibidos', c: '#7a8794' }); } return w.tabs; };
  const tabDe = c => tabs().find(t => t.id === c.tab);
  const mover = (c, id) => { if (id) { c.tab = id; delete c.tabOut; } else { delete c.tab; c.tabOut = 1; } c.tabTs = Date.now(); Store.save(); };
  // solo entran al tablero los clientes que ya enviaron sus datos de pedido (o ya tienen pedido); los chats anteriores quedan normales
  function entranTablero() {
    let cambio = false;
    chats().forEach(c => {
      if (c.grupo || c.tab || c.tabOut) return;
      const n = (c.msgs || []).length; if (c._tn === n && !c.pedidoId) return; c._tn = n;
      if (yaPedido(c) || detectar(c)) { c.tab = tabs()[0].id; c.tabTs = Date.now(); cambio = true; }
    });
    if (cambio) Store.save();
    return cambio;
  }
  function tableros() {
    entranTablero();
    const T = tabs(), L = chats().filter(c => !c.grupo && tabDe(c) && (!fet || (c.etq || []).includes(fet)) && (!q || [c.nombre, c.tel, c.ciudad, c.producto].join(' ').toLowerCase().includes(q))).sort((a, b) => (b.ult || 0) - (a.ult || 0));
    const card = c => `<div class="kb-c" draggable="true" data-kc="${c.id}">
      <div class="kb-ct" data-abrir="${c.id}">${av(c)}<div class="kb-cn"><b>${esc(c.nombre)}</b><small>${c.tel ? '+' + esc(String(c.tel).replace(/\D/g, '')) : 'sin celular'}${c.ciudad ? ' · ' + esc(c.ciudad) : ''}</small></div></div>
      ${c.producto ? `<div class="kb-p">${esc(c.producto)}</div>` : ''}<div class="kb-m">${esc(prev(c)).slice(0, 70)}</div>
      ${(c.etq || []).length ? `<div class="kb-e">${c.etq.map(pill).join('')}</div>` : ''}
      <div class="kb-a"><select data-mv="${c.id}" aria-label="Mover a otro tablero"><option value="">Mover a…</option>${T.map(t => `<option value="${t.id}" ${c.tab === t.id ? 'disabled' : ''}>${esc(t.n)}</option>`).join('')}<option value="__ninguno">Quitar del tablero</option></select></div></div>`;
    const col = (t, i) => { const l = L.filter(c => c.tab === t.id); return `<div class="kb-col" data-col="${t.id}"><div class="kb-h" style="border-top-color:${t.c}"><b>${esc(t.n)}</b><i>${l.length}</i><span class="kb-hb"><button class="btn btn-sm" data-ml="${t.id}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Mover tablero a la izquierda">◀</button><button class="btn btn-sm" data-ml="${t.id}:1" ${i === T.length - 1 ? 'disabled' : ''} aria-label="Mover tablero a la derecha">▶</button><button class="btn btn-sm" data-te="${t.id}" aria-label="Editar tablero">✎</button></span></div><div class="kb-b">${l.length ? l.map(card).join('') : '<p class="note kb-v">Suelta aquí</p>'}</div></div>`; };
    return `<div class="kb-top"><input class="search" id="wq" type="search" placeholder="Buscar nombre, celular, ciudad…" value="${esc(q)}"><select id="kbet"><option value="">Todas las etiquetas</option>${etqs().map(e => `<option value="${esc(e.n)}" ${fet === e.n ? 'selected' : ''}>${esc(e.n)}</option>`).join('')}</select><button class="btn btn-pri" id="kbnew">+ Tablero</button></div>
      <div class="kb">${T.map(col).join('')}
      <p class="note">Aquí entran solos los clientes <b>cuando envían sus datos de pedido</b>. Muévelos arrastrando cada tarjeta (en el celular usa «Mover a…»). Los chats anteriores siguen normales en «Chats»; si quieres meter uno a mano, ábrelo y elige su tablero. Los tableros son aparte de las etiquetas.</p>`;
  }
  function enlazarTableros(el) {
    const g = i => el.querySelector(i), refrescar = () => vista(el);
    g('#wq').oninput = e => { q = e.target.value.toLowerCase(); const p = e.target.selectionStart; refrescar(); const i = el.querySelector('#wq'); i.focus(); i.setSelectionRange(p, p); };
    g('#kbet').onchange = e => { fet = e.target.value; refrescar(); };
    g('#kbnew').onclick = () => openForm('Nuevo tablero', [{ k: 'n', l: 'Nombre', req: 1, full: 1 }, { k: 'c', l: 'Color', t: 'select', opts: Object.fromEntries(COL.map((x, i) => [x, ['Verde', 'Azul', 'Amarillo', 'Turquesa', 'Morado', 'Naranja', 'Rosa', 'Gris'][i]])) }], {}, v => { tabs().push({ id: 't' + Date.now().toString(36), n: v.n, c: v.c || COL[0] }); });
    el.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => { sel = b.dataset.abrir; modo = 'lista'; vista(el); });
    el.querySelectorAll('[data-mv]').forEach(b => b.onchange = () => { const c = chats().find(x => x.id === b.dataset.mv); if (!c || !b.value) return; mover(c, b.value === '__ninguno' ? '' : b.value); refrescar(); });
    el.querySelectorAll('[data-ml]').forEach(b => b.onclick = () => { const [id, d] = b.dataset.ml.split(':'), T = tabs(), i = T.findIndex(t => t.id === id), j = i + +d; if (i < 0 || j < 0 || j >= T.length) return; [T[i], T[j]] = [T[j], T[i]]; Store.save(); refrescar(); });
    el.querySelectorAll('[data-te]').forEach(b => b.onclick = () => { const t = tabs().find(x => x.id === b.dataset.te); if (!t) return; openForm('Editar tablero', [{ k: 'n', l: 'Nombre', req: 1, full: 1 }, { k: 'c', l: 'Color', t: 'select', opts: Object.fromEntries(COL.map((x, i) => [x, ['Verde', 'Azul', 'Amarillo', 'Turquesa', 'Morado', 'Naranja', 'Rosa', 'Gris'][i]])) }], t, v => Object.assign(t, v));
      setTimeout(() => { const d = document.querySelector('#dlg'); if (d && !d.querySelector('#kbdel')) { const bt = document.createElement('button'); bt.type = 'button'; bt.id = 'kbdel'; bt.className = 'btn btn-del'; bt.textContent = 'Eliminar tablero'; bt.onclick = () => confirmDel('¿Eliminar el tablero «' + t.n + '»? Sus clientes salen del tablero pero siguen en «Chats».', () => { chats().forEach(c => { if (c.tab === t.id) delete c.tab; }); W().tabs = tabs().filter(x => x.id !== t.id); try { d.close(); } catch (e) {} Store.save(); refrescar(); }); const f = d.querySelector('form'); if (f) f.appendChild(bt); } }, 50); });
    // arrastrar y soltar (escritorio)
    let arr = null;
    el.querySelectorAll('[data-kc]').forEach(k => { k.ondragstart = e => { arr = k.dataset.kc; k.classList.add('arr'); try { e.dataTransfer.setData('text/plain', arr); e.dataTransfer.effectAllowed = 'move'; } catch (x) {} }; k.ondragend = () => k.classList.remove('arr'); });
    el.querySelectorAll('[data-col]').forEach(cl => {
      cl.ondragover = e => { e.preventDefault(); cl.classList.add('sobre'); };
      cl.ondragleave = () => cl.classList.remove('sobre');
      cl.ondrop = e => { e.preventDefault(); cl.classList.remove('sobre'); const c = chats().find(x => x.id === arr); arr = null; if (c && (c.tab || '') !== cl.dataset.col) { mover(c, cl.dataset.col); refrescar(); } };
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
      <div class="wa-est"><small style="margin-right:6px;opacity:.7">Tablero:</small>${tabs().map(t => `<button class="chip ${c.tab === t.id ? 'on' : ''}" data-tb="${t.id}" style="${c.tab === t.id ? 'background:' + t.c + ';border-color:' + t.c + ';color:#fff' : ''}">${esc(t.n)}</button>`).join('')}</div>
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
    el.innerHTML = `${secH('mensajes', 'WhatsApp', `${chats().length} chats · ${chats().filter(x => x.estado === 'esperando').length} esperando pago`, `<button class="btn ${modo === 'tableros' ? 'btn-pri' : ''}" id="wmodo">${modo === 'tableros' ? '☰ Ver lista' : '▦ Tableros'}</button> <button class="btn" id="wweb">WhatsApp Web ↗</button> <button class="btn btn-pri" id="wnew">+ Chat</button>`)}
    ${barra()}
    ${modo === 'tableros' ? tableros() : `<div class="wa ${c ? 'abierto' : ''}">${lista(el)}${chat(c)}</div>`}
    ${modo === 'tableros' ? '' : '<p class="note">Uso manual, igual que las etiquetas de WhatsApp Business: etiqueta a cada cliente aquí, copia el mensaje listo y pégalo en tu WhatsApp Business. No lee tu WhatsApp automáticamente. Las etiquetas también debes ponerlas allá si quieres verlas en la app.</p>'}`;
    const g = (i) => el.querySelector(i);
    if (borrador && g('#wtx')) g('#wtx').value = borrador;
    if (g('#wrev')) g('#wrev').onclick = revisar;
    if (g('#wqr')) g('#wqr').onclick = pedirQr;
    if (g('#wvac')) g('#wvac').onclick = () => ask('¿Vaciar todos los chats y tableros guardados aquí? Tus pedidos en «Pedidos» no se tocan.', () => { vaciar(); toast('Lista vacía ✅'); render(); }, 'Vaciar');
    if (g('#wsync')) g('#wsync').onclick = () => { sincronizar(true); render(); };
    if (g('#wdiag')) g('#wdiag').onclick = async () => { try { const d = await api('diag'); openInfo('<h2>Diagnóstico de WhatsApp</h2><p class="note">Copia este texto y envíaselo a Claude. No incluye nombres ni números.</p><textarea readonly rows="12" style="width:100%;font-family:monospace;font-size:12px">' + esc(JSON.stringify(d, null, 1)) + '</textarea>'); } catch (e) { toast(e.message); } };
    if (g('#wout')) g('#wout').onclick = () => ask('¿Desvincular tu WhatsApp? Se quita de «Dispositivos vinculados» sin que toques el celular y esta pantalla queda VACÍA: se borran los chats y tableros guardados aquí. Tus pedidos creados en «Pedidos» no se tocan.', () => { api('salir').catch(() => {}).then(() => { vaciar(); con.estado = 'close'; con.qr = ''; con.error = 'WhatsApp desvinculado. La lista quedó vacía.'; toast('WhatsApp desvinculado ✅ · lista vacía'); render(); }); }, 'Desvincular y vaciar');
    if (!con.estado && !con.pidio) { con.pidio = 1; estado(true).then(() => { if (abierto()) sincronizar(true); }); }
    latido();
    g('#wweb').onclick = web;
    g('#wnew').onclick = () => openForm('Nuevo chat', CAMPOS, {}, v => { const n = { id: uid(), ...v, msgs: [], ult: Date.now() }; chats().push(n); sel = n.id; });
    g('#wmodo').onclick = () => { modo = modo === 'tableros' ? 'lista' : 'tableros'; vista(el); };
    if (modo === 'tableros') return enlazarTableros(el);
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
    el.querySelectorAll('[data-tb]').forEach(b => b.onclick = () => { mover(c, c.tab === b.dataset.tb ? '' : b.dataset.tb); vista(el); });
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
  window.LeerDatos = leer;
  window.WhatsApp = { vista };
  if ((location.hash || '').slice(1) === 'whatsapp') render();
})();
