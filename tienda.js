'use strict';
/* DROPOX — Landing / Tienda: arma tiendas con el mismo estilo y estructura de millora.shop (Guatemala, contraentrega).
   Aquí se guarda TODA la configuración (marca, diseño, portada, productos, oferta, envío, textos, pixeles, dominios) y desde aquí se publica.
   La tienda pública la sirve api/tienda.js según el dominio; los pedidos llegan a la pestaña «Pedidos» y se pasan a Pedidos de DROPOX. */
(() => {
  const TABS = [['resumen', 'Resumen'], ['marca', 'Marca y diseño'], ['portada', 'Portada'], ['productos', 'Productos'], ['pedido', 'Oferta y envío'], ['textos', 'Textos y políticas'], ['rastreo', 'Pixeles y contacto'], ['dominios', 'Dominios'], ['pedidos', 'Pedidos'], ['previa', 'Vista previa']];
  let tab = 'resumen', ti = 0, pi = 0, pagPrev = '', anchoPrev = 420, lista = null, errLista = '';
  const clon = o => JSON.parse(JSON.stringify(o));
  const R = () => window.TiendaRender;
  const slugify = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

  function asegurar() {
    if (!Array.isArray(S.tiendas) || !S.tiendas.length) S.tiendas = [clon(window.TIENDA_BASE)];
    if (ti >= S.tiendas.length) ti = 0;
    const t = S.tiendas[ti];
    if (pi >= (t.productos || []).length) pi = 0;
    return t;
  }
  const T = () => asegurar();
  const getP = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setP(o, path, v) { const ks = path.split('.'), u = ks.pop(); const t = ks.reduce((a, k) => (a[k] == null ? (a[k] = /^\d+$/.test(k) ? [] : {}) : a[k]), o); t[u] = v; }

  // Texto de varias líneas ⇄ listas
  const lineas = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
  const unir = (a, n) => (Array.isArray(a) ? a : []).map(r => (Array.isArray(r) ? r : n.map(k => r[k])).map(x => (x == null ? '' : x)).join(' | ')).join('\n');
  const partir = (txt, n) => lineas(txt).map(l => { const p = l.split('|').map(x => x.trim()); const h = p.slice(0, n - 1); h.push(p.slice(n - 1).join(' | ')); while (h.length < n) h.push(''); return h; });
  const KIND = {
    lines: { out: a => (a || []).join('\n'), inn: lineas },
    pairs: { out: a => unir(a, [0, 1]), inn: t => partir(t, 2) },
    pasos: { out: a => unir(a, [0, 1]), inn: t => partir(t, 2) },
    bloques: { out: a => unir(a, ['t', 'x', 'img']), inn: t => partir(t, 3).map(r => ({ t: r[0], x: r[1], img: r[2] })) },
    resenas: { out: a => unir(a, ['n', 'c', 'e', 't']), inn: t => partir(t, 4).map(r => ({ n: r[0], c: r[1], e: Math.max(1, Math.min(5, parseInt(r[2]) || 5)), t: r[3] })) },
  };

  // Campos
  const f = (path, label, o = {}) => {
    const v = getP(T(), path), id = 'tn_' + path.replace(/\./g, '_');
    let inp;
    if (o.check) return `<div class="field" ${o.full ? 'style="grid-column:1/-1"' : ''}><label class="chk"><input type="checkbox" data-p="${path}" data-k="check" ${v ? 'checked' : ''}> ${esc(label)}</label>${o.hint ? `<div class="note">${o.hint}</div>` : ''}</div>`;
    if (o.kind) inp = `<textarea data-p="${path}" data-k="${o.kind}" rows="${o.rows || 5}" id="${id}" spellcheck="false">${esc(KIND[o.kind].out(v))}</textarea>`;
    else if (o.area) inp = `<textarea data-p="${path}" rows="${o.rows || 3}" id="${id}">${esc(v)}</textarea>`;
    else if (o.opts) inp = `<select data-p="${path}" id="${id}" style="width:100%">${o.opts.map(x => `<option ${x == v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    else inp = `<input data-p="${path}" ${o.type === 'number' ? 'data-k="num" type="number" step="any" inputmode="decimal"' : o.type === 'color' ? 'type="color" style="padding:3px;height:44px"' : 'type="text"'} value="${esc(v ?? '')}" id="${id}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>`;
    return `<div class="field" ${o.full ? 'style="grid-column:1/-1"' : ''}><label for="${id}">${esc(label)}</label>${inp}${o.hint ? `<div class="note">${o.hint}</div>` : ''}</div>`;
  };

  const TIPO = { producto: ['Producto', 'Página de producto completa'], landing: ['Landing', 'Título, imagen y botón'], codigo: ['Código', 'Tu propio HTML'] };
  const nuevoProducto = tipo => {
    const b = { slug: 'producto-' + Date.now().toString(36).slice(-4), nombre: 'Producto nuevo', titulo: 'Producto nuevo', kicker: '', etiqueta: '', imagenes: [], precio: 0, tachado: 0, combo2: 0, categoria: '', rating: 0, resenas: 0, vendidos: 0, masVendido: false, nuevo: true, activo: true, tipo, bloques: [], faq: [], resenasLista: [] };
    if (tipo === 'landing') b.secciones = [{ tipo: 'titulo', x: 'Escribe aquí el título' }, { tipo: 'imagen', img: '' }, { tipo: 'boton', x: 'Quiero el mío', accion: 'formulario', wa: '', msg: '' }, { tipo: 'imagen', img: '' }, { tipo: 'boton', x: 'Pedir por WhatsApp', accion: 'whatsapp', wa: '', msg: '' }];
    if (tipo === 'codigo') Object.assign(b, { html: '<section style="padding:24px 16px;text-align:center">\n  <h1>{{nombre}}</h1>\n  <p style="font-size:28px;font-weight:800">{{precio}}</p>\n  <button class="cta" data-abrir>Quiero el mío</button>\n  <p><a data-wa href="#">Escríbenos por WhatsApp</a></p>\n</section>', css: '', js: '' });
    return b;
  };
  function elegirTipo(cb) {
    const f = $('#dlgForm'), d = $('#dlg');
    f.innerHTML = `<h2>¿Qué tipo de página quieres?</h2><div class="tn-tipos">
      <button type="button" data-tp="producto"><b>1 · Página de producto</b><span>Título, carrusel de fotos, precio con oferta y precio de comparación, bloques con imagen y título, reseñas y preguntas.</span></button>
      <button type="button" data-tp="landing"><b>2 · Landing page</b><span>Título, imagen, botón (formulario o WhatsApp), imagen, botón… en el orden que tú quieras.</span></button>
      <button type="button" data-tp="codigo"><b>3 · Código</b><span>Pegas tu propio HTML, CSS y JS. Los botones con <code>data-abrir</code> abren el formulario de pedido.</span></button></div>
      <div class="dlg-foot"><button type="button" class="btn" id="tpNo">Cancelar</button></div>`;
    f.onsubmit = e => e.preventDefault();
    f.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { d.close(); cb(b.dataset.tp); });
    $('#tpNo').onclick = () => d.close();
    d.showModal();
  }
  const abiertas = new Set(['basico']);
  const sec = (k, titulo, sub, body) => `<details class="tn-sec" data-sec="${k}" ${abiertas.has(k) ? 'open' : ''}><summary><b>${titulo}</b><small>${esc(sub || '')}</small></summary><div class="tn-secb">${body}</div></details>`;
  const thumb = u => /^https:\/\//.test(u || '') ? `<img class="tn-th" src="${esc(u)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : '<div class="tn-th tn-nth">sin foto</div>';
  const FACT = { 'sec-titulo': () => ({ tipo: 'titulo', x: '' }), 'sec-texto': () => ({ tipo: 'texto', x: '' }), 'sec-imagen': () => ({ tipo: 'imagen', img: '' }), 'sec-boton': () => ({ tipo: 'boton', x: 'Quiero el mío', accion: 'formulario', wa: '', msg: '' }), imagen: () => '', bloque: () => ({ t: '', x: '', img: '' }), resena: () => ({ n: '', c: '', e: 5, t: '' }), faq: () => ['', ''] };
  // Lista editable: cada elemento con subir, bajar y quitar; abajo el botón para agregar
  const rep = (path, arr, tpl, kind, etiq) => `<div class="tn-rep">${arr.map((it, i) => `<div class="tn-item"><div class="tn-ctl"><b>${i + 1}</b><button type="button" class="btn btn-sm" data-ra="up" data-rp="${path}" data-ri="${i}" aria-label="Subir">↑</button><button type="button" class="btn btn-sm" data-ra="dn" data-rp="${path}" data-ri="${i}" aria-label="Bajar">↓</button><button type="button" class="btn btn-sm btn-del" data-ra="del" data-rp="${path}" data-ri="${i}" aria-label="Quitar">✕</button></div><div class="tn-itb">${tpl(it, path + '.' + i, i)}</div></div>`).join('')}${(Array.isArray(etiq) ? etiq : [[kind, etiq]]).map(([k, l]) => `<button type="button" class="btn btn-sm btn-pri" data-ra="add" data-rk="${k}" data-rp="${path}">+ ${l}</button>`).join(' ')}</div>`;
  const card = (t, sub, body) => `<div class="card"><h3>${t}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}${body}</div>`;

  // ───────── Pestañas ─────────
  const pantalla = {
    resumen(t) {
      const act = R().activos(t).length, dom = (t.dominios || []).length;
      return card('Así funciona', 'Esta sección es tu constructor de tiendas con el estilo de millora.shop.', `
        <ol class="tn-pasos"><li><b>Configura</b> marca, colores, portada, productos, oferta, envío, textos y pixeles en las pestañas de arriba.</li>
        <li><b>Revisa</b> en «Vista previa» cómo se ve en celular.</li>
        <li><b>Publica</b> con el botón de abajo (guarda la tienda en la nube).</li>
        <li><b>Agrega tus dominios</b> en la pestaña Dominios y conéctalos en Vercel.</li></ol>`) +
        card('Estado de «' + esc(t.nombre) + '»', '', `<div class="row"><div class="t"><small>Productos activos</small><b>${act}</b></div><div class="t"><small>Dominios</small><b>${dom}</b></div></div>
        <div class="tn-act"><button class="btn btn-pri" id="tnPub">Publicar tienda</button><button class="btn" id="tnDes">Despublicar</button><a class="btn" href="/t/${esc(t.slug)}" target="_blank" rel="noopener">Abrir tienda publicada ↗</a></div>
        <div class="note" id="tnMsg">${esc(S.tiendaMsg || '')}</div>
        <div class="note">Antes de publicar la primera vez, ejecuta <b>supabase/tienda.sql</b> en Supabase (SQL Editor). Solo se hace una vez.</div>`) +
        card('Tus tiendas', 'Cada tienda tiene su propia configuración y sus propios dominios. «Duplicar» copia todo para crear otra con la misma estructura.', `
        <div class="field"><select id="tnSel" style="width:100%">${S.tiendas.map((x, i) => `<option value="${i}" ${i === ti ? 'selected' : ''}>${esc(x.nombre)} · /t/${esc(x.slug)}</option>`).join('')}</select></div>
        <div class="tn-act"><button class="btn" id="tnDup">Duplicar esta tienda</button><button class="btn btn-del" id="tnDel">Eliminar</button><button class="btn" id="tnExp">Exportar configuración</button><button class="btn" id="tnImp">Importar</button><input type="file" id="tnImpF" accept="application/json" hidden></div>`) +
        card('Cómo está hecha la tienda de referencia', 'Lo que replica este constructor de millora.shop:', `<ul class="tn-ul">
        <li><b>Barra superior</b> con 3 mensajes (envío gratis desde 40 GTQ, contraentrega, exclusivos).</li>
        <li><b>Portada</b>: tienda verificada, logo, etiqueta «Pago contraentrega», lema, 3 garantías, caja de promo por cantidad (2 o más −10%), categorías y rejilla «Los más vendidos» con precio tachado, ahorro, estrellas y «Lleva 2 y ahorra».</li>
        <li><b>Página de producto</b>: galería con miniaturas, etiqueta, título, estrellas, precio con −%, llegada en 2 a 5 días, 3 sellos de confianza, paquetes 1 o 2 unidades, botón con brillo, garantía, pasos «Así llega tu pedido», bloques de beneficios con foto, FAQ, reseñas verificadas y barra fija inferior.</li>
        <li><b>Pedido en ventana</b> contraentrega: nombre, teléfono, departamento, municipio, dirección, referencia y total.</li>
        <li><b>Pie</b>: preguntas frecuentes y 5 políticas (privacidad, envíos, cambios, retracto DIACO, términos).</li>
        <li><b>Pixeles</b>: Meta, TikTok, Google Analytics y Clarity.</li></ul>`);
    },
    marca(t) {
      const pre = R().PRESETS;
      return card('Marca', 'Nombre, logo y textos de compartir (WhatsApp, Facebook).', `<div class="row">${f('nombre', 'Nombre interno de la tienda')}${f('slug', 'Dirección de prueba (/t/…)', { hint: 'Solo letras minúsculas, números y guiones.' })}</div>
        <div class="row">${f('marca.nombre', 'Nombre que ve el cliente')}${f('marca.lema', 'Lema')}</div>
        ${f('marca.descripcion', 'Descripción para buscadores y compartir', { area: 1, full: 1 })}
        ${f('marca.logo', 'Logo (enlace https de la imagen)')}${f('marca.favicon', 'Ícono de la pestaña (enlace)')}${f('marca.og', 'Imagen al compartir el enlace (enlace)')}
        ${f('marca.verificada', 'Mostrar «Tienda verificada»', { check: 1 })}`) +
        card('Estilo', 'Empieza con un estilo y ajusta los colores.', `<div class="tn-act">${Object.keys(pre).map(k => `<button class="btn" data-pre="${k}">${{ classic: 'Millora clásico (crema y dorado)', tienda: 'Millora tienda (Baloo 2)', rosa: 'Rosa y vino', oscuro: 'Oscuro' }[k]}</button>`).join('')}</div>
        <div class="row">${f('diseno.fuente', 'Tipografía (Google Fonts)', { opts: ['Playfair Display', 'Baloo 2', 'Nunito', 'Inter', 'Poppins', 'Montserrat', 'Lora', 'DM Sans', 'Plus Jakarta Sans'] })}${f('diseno.radio', 'Redondeo de bordes (px)', { type: 'number' })}</div>
        <div class="row">${f('diseno.acento', 'Color de acento', { type: 'color' })}${f('diseno.boton', 'Color del botón', { type: 'color' })}</div>
        <div class="row">${f('diseno.botonTxt', 'Texto del botón', { type: 'color' })}${f('diseno.fondo', 'Fondo', { type: 'color' })}</div>
        <div class="row">${f('diseno.texto', 'Texto', { type: 'color' })}${f('diseno.precio', 'Precio (verde)', { type: 'color' })}</div>
        <div class="row">${f('diseno.tachado', 'Precio tachado / descuento', { type: 'color' })}${f('diseno.ancho', 'Ancho máximo (px)', { type: 'number' })}</div>
        ${f('diseno.grano', 'Textura de papel (grano)', { check: 1 })}`) +
        card('País y moneda', 'Millora usa Guatemala (quetzales, contraentrega).', `<div class="row">${f('pais.pais', 'País')}${f('pais.moneda', 'Símbolo de moneda')}</div><div class="row">${f('pais.codigo', 'Código (GTQ)')}${f('pais.locale', 'Idioma (es_GT)')}</div>`);
    },
    portada(t) {
      return card('Barra superior', 'Una frase por línea.', `${f('barra.activa', 'Mostrar barra', { check: 1 })}${f('barra.items', 'Mensajes', { kind: 'lines', rows: 4 })}`) +
        card('Cabecera de portada', '', `<div class="row">${f('portada.badge', 'Etiqueta (ej. Pago contraentrega)')}${f('portada.titulo', 'Título de la rejilla')}</div>${f('portada.confianza', 'Garantías (una por línea)', { kind: 'lines', rows: 4 })}`) +
        card('Promo por cantidad', 'La caja «Mientras más llevas, más ahorras». Si un producto no tiene precio de combo propio, este descuento arma el precio de 2 unidades.', `${f('promo.activa', 'Activar promo', { check: 1 })}${f('portada.mostrarPromo', 'Mostrar la caja en la portada', { check: 1 })}
        ${f('promo.titulo', 'Título')}<div class="row">${f('promo.cantidad', 'Cantidad mínima', { type: 'number' })}${f('promo.descuento', 'Descuento (%)', { type: 'number' })}</div>${f('promo.texto', 'Texto de apoyo')}`) +
        card('Categorías', 'Los botones sobre la rejilla. Una por línea; cada producto elige la suya.', f('categorias', 'Categorías', { kind: 'lines', rows: 5 }));
    },
    productos(t) {
      const ps = t.productos || [], p = ps[pi], base = `productos.${pi}.`;
      const x = p ? R().precios(t, p) : null;
      const head = card('Productos', 'Elige un producto y edítalo sección por sección. Cada uno tiene su página: tudominio.com/<dirección>.', `
        <div class="field"><select id="tnProd" style="width:100%">${ps.map((q, i) => `<option value="${i}" ${i === pi ? 'selected' : ''}>${q.activo === false ? '⏸ ' : ''}[${TIPO[q.tipo || 'producto'][0]}] ${esc(q.nombre)}</option>`).join('')}</select></div>
        <div class="tn-act"><button class="btn btn-pri" id="tnPNew">+ Producto nuevo</button><button class="btn" id="tnPDup">Duplicar</button><button class="btn" id="tnPUp">↑</button><button class="btn" id="tnPDn">↓</button><button class="btn btn-del" id="tnPDel">Eliminar</button>${p ? `<button class="btn" id="tnVer">Ver cómo queda</button>` : ''}</div>`);
      if (!p) return head;
      const chk = (path, label) => `<div class="field"><label class="chk"><input type="checkbox" data-p="${path}" data-k="check" ${getP(T(), path) !== false ? 'checked' : ''}> ${esc(label)}</label></div>`;
      const imgs = p.imagenes || [];
      const tipoSel = `<div class="field"><label>Tipo de página</label><select data-p="${base}tipo" style="width:100%">${Object.entries(TIPO).map(([k, v]) => `<option value="${k}" ${(p.tipo || 'producto') === k ? 'selected' : ''}>${v[0]} — ${v[1]}</option>`).join('')}</select></div>`;
      const S1 = sec('basico', '1 · Datos básicos', 'Nombre, dirección, tipo de página', `
        ${tipoSel}${f(base + 'activo', 'Visible en la tienda', { check: 1 })}
        <div class="row">${f(base + 'nombre', 'Nombre en la rejilla')}${f(base + 'slug', 'Dirección (slug)', { hint: 'Ej.: collar-saturno → tudominio.com/collar-saturno' })}</div>
        ${f(base + 'titulo', 'Título de la página del producto', { full: 1 })}
        <div class="row">${f(base + 'etiqueta', 'Etiqueta (ej. JOYERÍA ÚNICA)')}${f(base + 'kicker', 'Frase corta sobre el título')}</div>
        ${f(base + 'categoria', 'Categoría', { opts: ['', ...(t.categorias || [])] })}
        <div class="row">${f(base + 'masVendido', 'Marcar «Más vendido»', { check: 1 })}${f(base + 'nuevo', 'Marcar «Nuevo»', { check: 1 })}</div>`);
      const S2 = sec('fotos', '2 · Fotos', imgs.length + ' foto(s) · la primera es la principal', `
        ${rep(base + 'imagenes', imgs, (u, b) => `<div class="tn-ri">${thumb(u)}<div style="flex:1;min-width:0"><input data-p="${b}" type="text" value="${esc(u)}" placeholder="https://… enlace de la foto"></div></div>`, 'imagen', 'Agregar foto')}
        <details class="tn-mini"><summary>Pegar varias a la vez</summary>${f(base + 'imagenes', 'Un enlace por línea', { kind: 'lines', rows: 5, full: 1 })}</details>`);
      const S3 = sec('precio', '3 · Precio y oferta', x.pct1 ? `−${x.pct1}% · ahorro ${R().q(t, x.ahorro1)}` : 'Precio de venta', `
        <div class="row">${f(base + 'precio', 'Precio de venta', { type: 'number' })}${f(base + 'tachado', 'Precio antes (tachado, opcional)', { type: 'number' })}</div>
        ${f(base + 'combo2', 'Precio por 2 unidades (0 = usar el descuento de la promo)', { type: 'number', full: 1 })}
        <div class="tn-calc"><span>1 unidad: <b>${R().q(t, x.pr)}</b>${x.ahorro1 ? ` · ahorras ${R().q(t, x.ahorro1)} (−${x.pct1}%)` : ''}</span>${x.c2 ? `<span>2 unidades: <b>${R().q(t, x.c2)}</b> · ${R().q(t, x.c2 / 2)} c/u · ahorras ${R().q(t, x.base2 - x.c2)}</span>` : '<span>Sin oferta de 2 unidades</span>'}</div>`);
      const S4 = sec('contenido', '4 · Bloques de contenido', (p.bloques || []).length + ' bloque(s) con foto', `
        <p class="note" style="margin:0 0 8px">Cada bloque es un título, un texto y una foto, en el orden que se ven en la página.</p>
        ${rep(base + 'bloques', p.bloques || [], (bl, b, i) => `<div class="tn-ri tn-col"><div class="tn-ri">${thumb(bl.img)}<div style="flex:1;min-width:0"><label>Título</label><input data-p="${b}.t" type="text" value="${esc(bl.t)}"></div></div><label>Texto</label><textarea data-p="${b}.x" rows="3">${esc(bl.x)}</textarea><label>Foto (enlace)</label><input data-p="${b}.img" type="text" value="${esc(bl.img)}" placeholder="https://…"></div>`, 'bloque', 'Agregar bloque')}`);
      const S5 = sec('resenas', '5 · Valoración y reseñas', (p.resenasLista || []).length + ' reseña(s)', `
        ${chk(base + 'mostrar.resenas', 'Mostrar las reseñas en la página')}
        <div class="row">${f(base + 'rating', 'Estrellas (0 a 5)', { type: 'number' })}${f(base + 'resenas', 'Número de reseñas', { type: 'number' })}</div>
        ${f(base + 'vendidos', 'Vendidos (+N, se ve en la portada)', { type: 'number' })}
        ${rep(base + 'resenasLista', p.resenasLista || [], (r, b) => `<div class="tn-ri tn-col"><div class="row"><div><label>Nombre</label><input data-p="${b}.n" type="text" value="${esc(r.n)}"></div><div><label>Ciudad</label><input data-p="${b}.c" type="text" value="${esc(r.c)}"></div></div><div class="row"><div><label>Estrellas (1 a 5)</label><input data-p="${b}.e" data-k="num" type="number" min="1" max="5" value="${esc(r.e)}"></div><div></div></div><label>Comentario</label><textarea data-p="${b}.t" rows="2">${esc(r.t)}</textarea></div>`, 'resena', 'Agregar reseña')}`);
      const S6 = sec('preguntas', '6 · Preguntas frecuentes del producto', (p.faq || []).length + ' pregunta(s) · además de las generales', `
        ${chk(base + 'mostrar.faq', 'Mostrar las preguntas en la página')}
        ${rep(base + 'faq', p.faq || [], (q, b) => `<div class="tn-ri tn-col"><label>Pregunta</label><input data-p="${b}.0" type="text" value="${esc(q[0])}"><label>Respuesta</label><textarea data-p="${b}.1" rows="2">${esc(q[1])}</textarea></div>`, 'faq', 'Agregar pregunta')}`);
      const S7 = sec('mostrar', '7 · Qué se muestra en esta página', 'Garantía, pasos de entrega y sellos', `
        ${chk(base + 'mostrar.confianza', 'Sellos de confianza bajo el precio')}${chk(base + 'mostrar.garantia', 'Garantía de satisfacción')}${chk(base + 'mostrar.pasos', 'Pasos «Así llega tu pedido»')}
        <p class="note">El texto de la garantía, los pasos y los sellos se editan en la pestaña <b>Oferta y envío</b> y valen para todos los productos.</p>`);
      const tipo = p.tipo || 'producto';
      if (tipo === 'landing') {
        const SL = sec('secciones', '4 · Secciones de la landing', (p.secciones || []).length + ' sección(es) · se ven en este orden', `
          <p class="note" style="margin:0 0 8px">Arma la página como quieras: título, imagen, botón, imagen, botón… Un botón abre el formulario de pedido o te manda a WhatsApp.</p>
          ${rep(base + 'secciones', p.secciones || [], (it, b) => {
            const et = { titulo: 'Título', texto: 'Texto', imagen: 'Imagen', boton: 'Botón' }[it.tipo] || it.tipo;
            let c = '';
            if (it.tipo === 'titulo') c = `<label>Título</label><input data-p="${b}.x" type="text" value="${esc(it.x)}">`;
            else if (it.tipo === 'texto') c = `<label>Texto</label><textarea data-p="${b}.x" rows="3">${esc(it.x)}</textarea>`;
            else if (it.tipo === 'imagen') c = `<div class="tn-ri">${thumb(it.img)}<div style="flex:1;min-width:0"><label>Imagen (enlace)</label><input data-p="${b}.img" type="text" value="${esc(it.img)}" placeholder="https://…"></div></div>`;
            else c = `<label>Texto del botón</label><input data-p="${b}.x" type="text" value="${esc(it.x)}"><label>Qué hace</label><select data-p="${b}.accion" style="width:100%"><option value="formulario" ${it.accion !== 'whatsapp' ? 'selected' : ''}>Abrir el formulario de pedido</option><option value="whatsapp" ${it.accion === 'whatsapp' ? 'selected' : ''}>Ir a WhatsApp</option></select>${it.accion === 'whatsapp' ? `<label>Número de WhatsApp (vacío = el de contacto)</label><input data-p="${b}.wa" type="text" value="${esc(it.wa)}" placeholder="50212345678"><label>Mensaje</label><input data-p="${b}.msg" type="text" value="${esc(it.msg)}" placeholder="Hola, quiero pedir…">` : ''}`;
            return `<div class="tn-ri tn-col"><span class="tn-tag">${et}</span>${c}</div>`;
          }, 'sec-titulo', [['sec-titulo', 'Título'], ['sec-imagen', 'Imagen'], ['sec-boton', 'Botón'], ['sec-texto', 'Texto']])}`);
        return head + `<div class="tn-secs">${S1 + S2.replace('2 · Fotos', '2 · Foto de portada').replace(' · la primera es la principal', ' · la primera sale en la portada de la tienda') + S3.replace('3 · Precio', '3 · Precio (para el formulario)') + SL}</div>`;
      }
      if (tipo === 'codigo') {
        const SC = sec('codigo', '4 · Tu código', 'HTML, CSS y JS propios', `
          <p class="note" style="margin:0 0 8px">Pega aquí lo que te hagan o lo que te arme yo. Puedes usar: <code>{{nombre}}</code> <code>{{precio}}</code> <code>{{tachado}}</code> <code>{{precio2}}</code> <code>{{ahorro}}</code> <code>{{descuento}}</code>. Cualquier elemento con <code>data-abrir</code> abre el formulario de pedido; un enlace con <code>data-wa</code> va a WhatsApp.</p>
          ${f(base + 'html', 'HTML', { area: 1, rows: 14, full: 1 })}${f(base + 'css', 'CSS (opcional)', { area: 1, rows: 6, full: 1 })}${f(base + 'js', 'JavaScript (opcional)', { area: 1, rows: 5, full: 1 })}`);
        return head + `<div class="tn-secs">${S1 + S2.replace('2 · Fotos', '2 · Foto de portada') + S3.replace('3 · Precio', '3 · Precio (para el formulario)') + SC}</div>`;
      }
      return head + `<div class="tn-secs">${S1 + S2 + S3 + S4 + S5 + S6 + S7}</div>`;
    },
    pedido(t) {
      return card('Envío y garantía', 'Lo que se muestra en la página del producto y en el pedido.', `${f('envio.gratis', 'Envío gratis', { check: 1 })}<div class="row">${f('envio.costo', 'Costo de envío si no es gratis', { type: 'number' })}${f('envio.productoDias', 'Llegada en el producto (ej. 2 a 5 días)')}</div>
        ${f('envio.dias', 'Tiempo general de entrega')}${f('envio.garantia', 'Garantía de satisfacción', { area: 1, rows: 3 })}
        ${f('envio.pasos', 'Pasos «Así llega tu pedido» — formato: Paso | Tiempo', { kind: 'pasos', rows: 4 })}
        ${f('confianzaProducto', 'Tres sellos bajo el precio (uno por línea)', { kind: 'lines', rows: 3 })}`) +
        card('Pedido contraentrega', 'La ventana de pedido ya trae: cantidad (1 o 2), nombre, apellido, teléfono, departamento (los 22 de Guatemala), municipio, dirección completa, punto de referencia, resumen y total. El precio se recalcula en el servidor con tu configuración publicada y el pedido llega a la pestaña Pedidos.', '');
    },
    textos(t) {
      return card('Preguntas frecuentes', 'Se muestran en portada y en cada producto. Formato: Pregunta | Respuesta (una por línea).', f('faq', 'Preguntas', { kind: 'pairs', rows: 6, full: 1 })) +
        card('Políticas', 'Privacidad, envíos, cambios, retracto y términos. Formato: Título | Texto (una por línea).', f('politicas', 'Políticas', { kind: 'pairs', rows: 10, full: 1 }));
    },
    rastreo(t) {
      return card('Pixeles de seguimiento', 'Solo el identificador, sin código.', `<div class="row">${f('pixeles.meta', 'Meta Pixel ID')}${f('pixeles.tiktok', 'TikTok Pixel ID')}</div><div class="row">${f('pixeles.ga', 'Google Analytics (G-XXXX)')}${f('pixeles.clarity', 'Microsoft Clarity ID')}</div><div class="note">Eventos: PageView, ViewContent, InitiateCheckout y Purchase.</div>`) +
        card('Contacto en el pie', '', `<div class="row">${f('contacto.whatsapp', 'WhatsApp (con código de país)')}${f('contacto.email', 'Correo')}</div>`);
    },
    dominios(t) {
      return card('Dominios de «' + esc(t.nombre) + '»', 'Un dominio por línea (ej.: www.millora.shop y millora.shop). Pulsa Publicar después de cambiarlos.', f('dominios', 'Dominios', { kind: 'lines', rows: 4, full: 1 }) + `<div class="tn-act"><button class="btn btn-pri" id="tnPub2">Publicar con estos dominios</button></div><div class="note" id="tnMsg">${esc(S.tiendaMsg || '')}</div>`) +
        card('Cómo conectar un dominio', '', `<ol class="tn-pasos"><li>En <b>Vercel</b> → tu proyecto DROPOX → Settings → Domains → <b>Add</b> y escribe cada dominio.</li>
        <li>En tu proveedor de dominio crea los registros: <code>A · @ · 76.76.21.21</code> y <code>CNAME · www · cname.vercel-dns.com</code> (o los que te indique Vercel).</li>
        <li>Escribe los mismos dominios aquí y pulsa <b>Publicar</b>. En cuanto Vercel valide el dominio, la tienda aparece ahí.</li>
        <li>Para probar antes: <code>/t/${esc(t.slug)}</code> en tu dirección de DROPOX.</li></ol>
        <div class="note">El panel de DROPOX no debe usar un dominio con nombre <b>dropox.…</b> distinto de vercel.app si quieres tiendas en otros dominios: las tiendas se sirven en cualquier dominio que no sea <i>*.vercel.app</i>, <i>localhost</i> o empiece por <i>dropox.</i> (regla en vercel.json).</div>`);
    },
    pedidos(t) {
      let h = card('Pedidos de la tienda', 'Los que llegan por la ventana de pedido. «Pasar a Pedidos» los copia a la sección Pedidos de DROPOX (estado Pendiente, canal Tienda).', `<div class="tn-act"><button class="btn" id="tnRef">Actualizar</button></div>${errLista ? `<div class="note" style="color:var(--bad)">${esc(errLista)}</div>` : ''}`);
      if (lista === null) return h + card('', '', '<p class="sub">Cargando…</p>');
      h += lista.length ? lista.map(r => { const d = r.datos || {}; return `<div class="card"><div class="card-row"><div><b>${esc(d.nombre)}</b> · ${esc(d.telefono)}<div class="note">${esc(d.producto)} × ${esc(d.cantidad)} · ${esc(d.moneda)} ${esc(d.total)}<br>${esc(d.departamento)}, ${esc(d.ciudad)} — ${esc(d.direccion)}${d.referencia ? ' (' + esc(d.referencia) + ')' : ''}<br>${esc(new Date(r.creado).toLocaleString())} · <b>${esc(r.estado)}</b></div></div>
        <div>${r.estado === 'nuevo' ? `<button class="btn btn-pri btn-sm" data-pasar="${esc(r.id)}">Pasar a Pedidos</button>` : ''}</div></div></div>`; }).join('') : card('', '', '<p class="sub">Todavía no hay pedidos desde la tienda.</p>');
      return h;
    },
    previa(t) {
      const ps = R().activos(t);
      return card('Vista previa', 'Así se ve en el celular. Los cambios se reflejan al instante.', `<div class="tn-act"><select id="tnPg" style="width:auto"><option value="">Portada</option>${ps.map(p => `<option value="${esc(p.slug)}" ${p.slug === pagPrev ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
        <div class="seg"><button data-w="420" class="${anchoPrev === 420 ? 'on' : ''}">Celular</button><button data-w="820" class="${anchoPrev === 820 ? 'on' : ''}">Pantalla</button></div></div>
        <div class="tn-fr"><iframe id="tnFr" style="width:${anchoPrev}px;max-width:100%" title="Vista previa" sandbox="allow-scripts allow-same-origin"></iframe></div>`);
    },
  };

  function pintarPrevia() {
    const fr = document.getElementById('tnFr'); if (!fr) return;
    const t = T(), ok = !pagPrev || R().activos(t).some(p => p.slug === pagPrev);
    fr.onload = () => { try { fr.contentDocument.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (!a) return; const h = a.getAttribute('href'); if (!/^\//.test(h)) return; e.preventDefault(); pagPrev = h === '/' || h === '' ? '' : h.replace(/^\/+/, ''); const pg = document.getElementById('tnPg'); if (pg) pg.value = pagPrev; pintarPrevia(); }); } catch (x) {} };
    fr.srcdoc = R().renderizar(t, ok ? pagPrev : '', { base: '', preview: true, slugTienda: t.slug }).html;
    fr.style.height = Math.round(innerHeight * 0.75) + 'px';
  }

  // ───────── Nube ─────────
  const sb = async (ruta, opt = {}) => {
    const tk = window.Nube && (await Nube.token());
    if (!tk) throw new Error('Inicia sesión para publicar.');
    const c = window.DROPOX_CFG;
    const r = await fetch(c.url + '/rest/v1/' + ruta, { ...opt, headers: { apikey: c.key, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Error ' + r.status); }
    return r.status === 204 ? null : r.json().catch(() => null);
  };
  const msg = t => { S.tiendaMsg = t; document.querySelectorAll('#tnMsg').forEach(e => { e.textContent = t; }); };
  async function publicar(publicada) {
    const t = T();
    t.dominios = (t.dominios || []).map(d => d.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()).filter(Boolean);
    if (!R().slugOk(t.slug)) return msg('La dirección de prueba no es válida (usa minúsculas, números y guiones).');
    const malos = (t.productos || []).filter(p => !R().slugOk(p.slug)).map(p => p.nombre);
    if (malos.length) return msg('Revisa la dirección (slug) de: ' + malos.join(', '));
    const dup = (t.productos || []).map(p => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
    if (dup.length) return msg('Hay productos con la misma dirección: ' + [...new Set(dup)].join(', '));
    msg('Publicando…');
    try {
      await sb('tiendas?on_conflict=slug', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ slug: t.slug, dominios: t.dominios, config: t, publicada, actualizado: new Date().toISOString() }) });
      Store.save();
      msg(publicada ? 'Publicada ✓ ' + new Date().toLocaleTimeString() + '. Puede tardar hasta 1 minuto en verse en el dominio.' : 'Tienda despublicada.');
    } catch (e) { msg('No se pudo publicar: ' + e.message + (/relation|does not exist|schema cache/i.test(e.message) ? ' — ejecuta supabase/tienda.sql en Supabase.' : '')); }
  }
  async function cargarPedidos() {
    try { lista = await sb('tienda_pedidos?select=*&slug=eq.' + encodeURIComponent(T().slug) + '&order=creado.desc&limit=100'); errLista = ''; }
    catch (e) { lista = []; errLista = 'No se pudieron leer los pedidos: ' + e.message; }
    if (tab === 'pedidos') render();
  }
  async function pasar(id) {
    const r = (lista || []).find(x => x.id === id); if (!r) return;
    const d = r.datos || {};
    try { await sb('tienda_pedidos?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ estado: 'pasado' }) }); } catch (e) { return toast('No se pudo actualizar: ' + e.message); }
    S.pedidos.push({ id: uid(), fecha: hoy(), estado: 'pendiente', producto: d.producto, cliente: d.nombre, telefono: d.telefono, ciudad: d.ciudad, canal: 'Tienda', cantidad: num(d.cantidad) || 1, precio: num(d.precioUnit), costo: 0, flete: 0, otros: 0 });
    r.estado = 'pasado'; Store.save(); toast('Pedido pasado a Pedidos'); render();
  }

  // ───────── Vista ─────────
  function vista(el) {
    const t = asegurar();
    if (!R()) { el.innerHTML = secH('tienda', 'Landing / Tienda', 'No se cargó el motor de la tienda.'); return; }
    el.innerHTML = `${secH('tienda', 'Landing / Tienda', 'Tu tienda estilo millora.shop: configúrala, publícala y conecta tus dominios.')}
      <div class="tn-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="tn-body">${pantalla[tab](t)}</div>`;
    if (tab === 'previa') pintarPrevia();
    if (tab === 'pedidos' && lista === null) cargarPedidos();
    enlazar(el);
  }

  function enlazar(el) {
    const q = s => el.querySelector(s), on = (s, fn) => { const b = q(s); if (b) b.onclick = fn; };
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; if (tab === 'pedidos') lista = null; render(); scrollTo(0, 0); });
    let tmr;
    el.querySelectorAll('[data-p]').forEach(i => i.onchange = () => {
      const t = T(), k = i.dataset.k, v = k === 'check' ? i.checked : k === 'num' ? num(i.value) : KIND[k] ? KIND[k].inn(i.value) : i.value;
      if (/(^|\.)slug$/.test(i.dataset.p)) { i.value = slugify(i.value) || 'producto'; setP(t, i.dataset.p, i.value); }
      else setP(t, i.dataset.p, v);
      Store.save(); clearTimeout(tmr); tmr = setTimeout(() => { if (tab === 'productos' || tab === 'marca') render(); }, 0);
    });
    el.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { Object.assign(T().diseno, R().PRESETS[b.dataset.pre], { preset: b.dataset.pre }); Store.save(); render(); toast('Estilo aplicado'); });
    on('#tnPub', () => publicar(true)); on('#tnPub2', () => publicar(true)); on('#tnDes', () => publicar(false));
    const sel = q('#tnSel'); if (sel) sel.onchange = () => { ti = +sel.value; pi = 0; lista = null; render(); };
    on('#tnDup', () => { const c = clon(T()); c.nombre += ' (copia)'; c.slug = slugify(c.slug + '-copia'); c.dominios = []; S.tiendas.push(c); ti = S.tiendas.length - 1; pi = 0; Store.save(); render(); toast('Tienda duplicada. Cambia su dirección y dominios.'); });
    on('#tnDel', () => { if (S.tiendas.length < 2) return toast('Debe quedar al menos una tienda'); ask('Se elimina «' + T().nombre + '» de DROPOX (la publicada sigue en línea hasta despublicarla). ¿Continuar?', () => { S.tiendas.splice(ti, 1); ti = 0; pi = 0; Store.save(); render(); }, 'Eliminar'); });
    on('#tnExp', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(T(), null, 1)], { type: 'application/json' })); a.download = 'tienda-' + T().slug + '.json'; a.click(); });
    on('#tnImp', () => q('#tnImpF').click());
    const imp = q('#tnImpF'); if (imp) imp.onchange = () => { const fl = imp.files[0]; if (!fl) return; fl.text().then(x => { try { const c = JSON.parse(x); if (!c.productos || !c.marca) throw 0; c.slug = slugify(c.slug || c.nombre) || 'tienda'; S.tiendas.push(c); ti = S.tiendas.length - 1; pi = 0; Store.save(); render(); toast('Tienda importada'); } catch (e) { toast('Archivo no válido'); } }); };
    el.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.sec) { d.open ? abiertas.add(d.dataset.sec) : abiertas.delete(d.dataset.sec); } }, true);
    el.querySelectorAll('[data-ra]').forEach(b => b.onclick = () => {
      const arr = getP(T(), b.dataset.rp), i = +b.dataset.ri, a = b.dataset.ra;
      if (!Array.isArray(arr)) setP(T(), b.dataset.rp, []);
      const L = getP(T(), b.dataset.rp);
      if (a === 'add') L.push(FACT[b.dataset.rk]());
      else if (a === 'del') L.splice(i, 1);
      else if (a === 'up' && i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]];
      else if (a === 'dn' && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]];
      Store.save(); render();
    });
    on('#tnVer', () => { pagPrev = (T().productos[pi] || {}).slug || ''; tab = 'previa'; render(); scrollTo(0, 0); });
    const ps = q('#tnProd'); if (ps) ps.onchange = () => { pi = +ps.value; render(); };
    const arr = () => T().productos;
    on('#tnPNew', () => elegirTipo(tp => { arr().push(nuevoProducto(tp)); pi = arr().length - 1; abiertas.add('basico'); Store.save(); render(); }));
    on('#tnPDup', () => { const c = clon(arr()[pi]); c.slug += '-2'; c.nombre += ' (copia)'; arr().splice(pi + 1, 0, c); pi++; Store.save(); render(); });
    on('#tnPUp', () => { if (pi > 0) { [arr()[pi - 1], arr()[pi]] = [arr()[pi], arr()[pi - 1]]; pi--; Store.save(); render(); } });
    on('#tnPDn', () => { if (pi < arr().length - 1) { [arr()[pi + 1], arr()[pi]] = [arr()[pi], arr()[pi + 1]]; pi++; Store.save(); render(); } });
    on('#tnPDel', () => { const p = arr()[pi]; if (p) ask('¿Eliminar «' + p.nombre + '»?', () => { arr().splice(pi, 1); pi = 0; Store.save(); render(); }, 'Eliminar'); });
    on('#tnRef', () => { lista = null; render(); });
    el.querySelectorAll('[data-pasar]').forEach(b => b.onclick = () => pasar(b.dataset.pasar));
    const pg = q('#tnPg'); if (pg) pg.onchange = () => { pagPrev = pg.value; pintarPrevia(); };
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { anchoPrev = +b.dataset.w; render(); });
  }

  window.Tienda = { vista };
})();
