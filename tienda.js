'use strict';
/* DROPOX — Landing / Tienda: arma tiendas con el mismo estilo y estructura de millora.shop (contraentrega, en soles).
   Aquí se guarda TODA la configuración (marca, diseño, portada, productos, oferta, envío, textos, pixeles, dominios) y desde aquí se publica.
   La tienda pública la sirve api/tienda.js según el dominio; los pedidos llegan a la pestaña «Pedidos» y se pasan a Pedidos de DROPOX. */
(() => {
  // Tres zonas: Ajustes (Landing / Tienda), Página principal y Mis productos (lista y editor de cada producto)
  const TABS_AJ = [['resumen', 'Resumen'], ['pedido', 'Oferta y envío'], ['rastreo', 'Pixeles y contacto'], ['dominios', 'Dominios'], ['pedidos', 'Pedidos'], ['previa', 'Vista previa']];
  const TABS_HOME = [['marca', 'Marca y diseño'], ['portada', 'Portada'], ['textos', 'Textos y políticas']];
  const HASH = { ajustes: 'tienda', home: 'tiendahome', lista: 'tiendaprod' }, INICIO = { ajustes: 'resumen', home: 'marca', lista: 'lista' };
  let zonaVista = 'ajustes';
  // Cambia de pestaña; si esa pestaña es de otra sección del menú, navega a esa sección
  const irTab = k => { tab = k; const z = grupoDe(k); if (z !== zonaVista) { go(HASH[z]); } else render(); scrollTo(0, 0); };
  const grupoDe = k => (TABS_HOME.some(x => x[0] === k) ? 'home' : (k === 'lista' || k === 'productos') ? 'lista' : 'ajustes');
  const TITULOS = { ajustes: ['Landing / Tienda', 'Ajustes de tu tienda: oferta y envío, pixeles, dominios y pedidos.'], home: ['Página principal', 'El inicio de tu tienda: marca, portada y textos. Aquí no se editan los productos.'], lista: ['Mis productos', 'Todos los productos de tu tienda. Edita, duplica, mira o elimina cada uno.'] };
  let tab = 'resumen', ti = 0, pi = 0, pagPrev = '', anchoPrev = 420, lista = null, errLista = '';
  const clon = o => JSON.parse(JSON.stringify(o));
  const R = () => window.TiendaRender;
  const slugify = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

  // Todo en soles: las tiendas guardadas antes en quetzales pasan una sola vez a Perú, S/ y PEN (los precios los pones tú)
  function migrarSoles(t) {
    if (t._soles) return;
    t._soles = true;
    const p = t.pais || {};
    if (p.codigo && p.codigo !== 'GTQ' && p.moneda !== 'Q') return;
    t.pais = { pais: 'Perú', moneda: 'S/', codigo: 'PEN', locale: 'es_PE', tel: '51' };
    const fix = x => typeof x === 'string' ? x.replace(/(\d+)\s*GTQ/g, 'S/ $1').replace(/DIACO/g, 'INDECOPI').replace(/Conforme a la Ley de Protección al Consumidor/g, 'Conforme al Código de Protección y Defensa del Consumidor').replace(/Guatemala/g, 'Perú') : Array.isArray(x) ? x.map(fix) : x;
    if (t.barra) t.barra.items = fix(t.barra.items);
    t.politicas = fix(t.politicas); t.faq = fix(t.faq);
    if (t.marca) { t.marca.lema = fix(t.marca.lema); t.marca.descripcion = fix(t.marca.descripcion); }
  }

  // Por ahora los pedidos llegan por WhatsApp al 970 189 535 (una sola vez a las tiendas ya guardadas; se cambia en Oferta y envío)
  function migrarWa(t) {
    if (t._wa) return;
    t._wa = true;
    if (!t.pedidoWa) t.pedidoWa = { activo: true, numero: '51970189535', mensaje: 'Hola, quiero hacer este pedido:' };
    t.contacto = t.contacto || {};
    if (!t.contacto.whatsapp) t.contacto.whatsapp = '51970189535';
  }

  // Una sola vez por tienda: se agregan los dos productos que pediste (Collar de las Emociones S/ 69 · 2 por S/ 99 y Dúo Mágico S/ 69 · 2 por S/ 95).
  // Si luego los borras no vuelven a aparecer.
  function sembrar(t) {
    if (t._semilla) return;
    t._semilla = true;
    t.productos = t.productos || [];
    let nuevos = 0;
    for (const k of ['collar', 'duo']) {
      if (!PLANTILLAS[k] || t.productos.some(q => q.nombre === PLANTILLAS[k].nombre)) continue;
      t.productos.push(crearDePlantilla(k, t.productos)); nuevos++;
    }
    if (nuevos) setTimeout(() => { try { Store.save(); } catch (e) {} }, 0);
  }


  // ───────── Que ningún producto se pierda ─────────
  // Cada producto se identifica por slug + fecha de creación. Al sincronizar con la nube se UNEN los productos de ambos lados
  // (nunca se reemplaza uno por otro); los borrados se anotan en `borrados` para que no vuelvan.
  const clave = q => (q.slug || '') + '|' + (q.creado || '');
  function fusionar(dest, src) {
    if (!dest || !src || !Array.isArray(src.tiendas)) return false;
    if (!Array.isArray(dest.tiendas)) dest.tiendas = [];
    let cambio = false;
    const tb = [...new Set([...(dest.tiendasBorradas || []), ...(src.tiendasBorradas || [])])];
    if (tb.length) dest.tiendasBorradas = tb;
    src.tiendas.forEach(b => {
      if (tb.includes(b.slug)) return;
      const a = dest.tiendas.find(x => x.slug === b.slug);
      if (!a) { dest.tiendas.push(JSON.parse(JSON.stringify(b))); cambio = true; return; }
      const bor = Object.assign({}, b.borrados, a.borrados); if (Object.keys(bor).length) a.borrados = bor;
      a.productos = a.productos || [];
      const n0 = a.productos.length;
      a.productos = a.productos.filter(q => !bor[clave(q)]);
      if (a.productos.length !== n0) cambio = true;
      const hay = new Set(a.productos.map(clave));
      (b.productos || []).forEach(q => { const k = clave(q); if (!hay.has(k) && !bor[k]) { a.productos.push(JSON.parse(JSON.stringify(q))); hay.add(k); cambio = true; } });
    });
    return cambio;
  }
  const borrar = (t, q) => { t.borrados = t.borrados || {}; t.borrados[clave(q)] = new Date().toISOString(); };
  // Copia de respaldo en el navegador (IndexedDB): aguanta mucho más que localStorage
  const Resp = (() => {
    let db = null, tm = null;
    const abrir = () => db ? Promise.resolve(db) : new Promise((ok, no) => { try { const r = indexedDB.open('dropox-respaldo', 1); r.onupgradeneeded = () => r.result.createObjectStore('r'); r.onsuccess = () => { db = r.result; ok(db); }; r.onerror = () => no(r.error); } catch (e) { no(e); } });
    const guardar = () => { clearTimeout(tm); tm = setTimeout(() => { abrir().then(d => d.transaction('r', 'readwrite').objectStore('r').put(JSON.stringify({ tiendas: S.tiendas, tiendasBorradas: S.tiendasBorradas || [] }), 'tiendas')).catch(() => {}); }, 400); };
    const leer = () => abrir().then(d => new Promise(ok => { const r = d.transaction('r').objectStore('r').get('tiendas'); r.onsuccess = () => { try { ok(JSON.parse(r.result)); } catch (e) { ok(null); } }; r.onerror = () => ok(null); })).catch(() => null);
    return { guardar, leer };
  })();
  let restaurado = false;
  function restaurar() {
    if (restaurado) return; restaurado = true;
    Resp.leer().then(b => { if (b && fusionar(S, b)) { Store.save(); if (/^#tienda/.test(location.hash)) render(); toast('Se recuperaron productos de la copia de respaldo'); } });
  }
  addEventListener('dropox:listo', () => { restaurado = false; restaurar(); });

  // Cada producto sale con un número de reseñas propio y distinto: primero 197, 219 y 378 al azar, luego otros al azar sin repetir.
  function asignarResenas(t) {
    const ps = t.productos || [], pend = ps.filter(q => !q._rs);
    if (!pend.length) return;
    const usados = new Set(ps.filter(q => q._rs).map(q => +q.resenas));
    const base = [197, 219, 378].filter(x => !usados.has(x)).sort(() => Math.random() - .5);
    pend.forEach(q => {
      let n = base.shift();
      while (n == null || usados.has(n)) n = 150 + Math.floor(Math.random() * 300);
      usados.add(n); q.resenas = n; q._rs = true;
      if (!(+q.rating > 0)) q.rating = [4.7, 4.8, 4.9][Math.floor(Math.random() * 3)];
    });
    setTimeout(() => { try { Store.save(); } catch (e) {} }, 0);
  }

  // Una sola vez: la portada recibe la barra en movimiento y el texto que se escribe solo (se pueden apagar en «Página principal»)
  function migrarMov(t) {
    if (t._mov) return; t._mov = true;
    t.portada = t.portada || {};
    if (t.portada.mov === undefined) t.portada.mov = true;
    if (t.portada.fijo === undefined) t.portada.fijo = 'Regalos con significado,';
    if (!Array.isArray(t.portada.frases)) t.portada.frases = ['envío a todo el Perú', 'pagas al recibir', 'un detalle que enamora'];
  }
  function migrarCar(t) {
    if (t._car) return; t._car = true;
    t.portada = t.portada || {};
    if (t.portada.carrusel === undefined) t.portada.carrusel = true;
    if (t.portada.carruselPrecio === undefined) t.portada.carruselPrecio = true;
    if (t.portada.carruselSeg === undefined) t.portada.carruselSeg = 4;
    if (t.portada.carruselTitulo === undefined) t.portada.carruselTitulo = 'Lo más pedido';
  }
  function migrarBarra(t) {
    if (t._bar2) return; t._bar2 = true;
    t.barra = t.barra || {};
    // la barra superior estaba apagada o vacía y por eso no se veía: se enciende con mensajes de ejemplo (se puede apagar en «Barra superior»)
    t.barra.activa = true;
    if (!Array.isArray(t.barra.items) || !t.barra.items.filter(Boolean).length) t.barra.items = ['Envío gratis a todo el Perú', 'Pagas al recibir', 'Caja de regalo'];
    if (t.barra.movHome === undefined) t.barra.movHome = true;
    if (t.barra.movProd === undefined) t.barra.movProd = true;
    if (t.barra.dorado === undefined) t.barra.dorado = true;
  }
  function asegurar() {
    if (!Array.isArray(S.tiendas) || !S.tiendas.length) S.tiendas = [clon(window.TIENDA_BASE)];
    if (ti >= S.tiendas.length) ti = 0;
    S.tiendas.forEach(migrarSoles); S.tiendas.forEach(migrarWa); S.tiendas.forEach(sembrar); S.tiendas.forEach(asignarResenas); S.tiendas.forEach(migrarMov); S.tiendas.forEach(migrarCar); S.tiendas.forEach(migrarBarra); restaurar();
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


  // ───────── Subir imágenes del dispositivo (Supabase Storage, bucket público «tienda») ─────────
  const BUCKET = 'tienda', MAX_LADO = 1600;
  async function comprimir(file) {
    if (file.type === 'image/gif' && file.size < 3e6) return file;
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.86));
    return blob && blob.type === 'image/webp' ? blob : await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
  }
  async function subirImagen(file) {
    if (!/^image\//.test(file.type)) throw new Error('«' + file.name + '» no es una imagen.');
    const tk = window.Nube && (await Nube.token());
    if (!tk) throw new Error('Inicia sesión para subir fotos.');
    const blob = await comprimir(file);
    if (blob.size > 6e6) throw new Error('La foto pesa demasiado (máximo 6 MB).');
    const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/gif' ? 'gif' : 'jpg';
    const nombre = `${T().slug}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`, c = window.DROPOX_CFG;
    const r = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${nombre}`, { method: 'POST', headers: { apikey: c.key, Authorization: 'Bearer ' + tk, 'Content-Type': blob.type, 'Cache-Control': 'max-age=31536000' }, body: blob });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(/bucket|not found|row-level/i.test(e.message || e.error || '') ? 'Falta crear el almacén de fotos: ejecuta en Supabase el SQL de «Subir fotos».' : (e.message || 'No se pudo subir (' + r.status + ')')); }
    return `${c.url}/storage/v1/object/public/${BUCKET}/${nombre}`;
  }
  let subiendoA = null;
  function subirArchivos(path, modo) {
    let inp = document.getElementById('tnFile');
    if (!inp) {
      inp = document.createElement('input'); inp.type = 'file'; inp.id = 'tnFile'; inp.accept = 'image/*'; inp.hidden = true; document.body.appendChild(inp);
      inp.onchange = async () => {
        const files = [...inp.files], a = subiendoA; inp.value = '';
        if (!files.length || !a) return;
        let n = 0;
        for (const f of files) {
          toast('Subiendo ' + (++n) + ' de ' + files.length + '…');
          try {
            const u = await subirImagen(f);
            if (a.modo === 'push') { const L = getP(T(), a.path); if (Array.isArray(L)) L.push(u); else setP(T(), a.path, [u]); } else setP(T(), a.path, u);
          } catch (e) { toast(e.message); Store.save(); render(); return; }
        }
        Store.save(); render(); toast(files.length > 1 ? 'Fotos subidas ✓' : 'Foto subida ✓');
      };
    }
    subiendoA = { path, modo }; inp.multiple = modo === 'push'; inp.click();
  }

  // ───────── Biblioteca de fotos: subir del dispositivo o elegir una que ya está guardada ─────────
  async function listarSubidas() {
    const tk = window.Nube && (await Nube.token()), c = window.DROPOX_CFG, slug = T().slug;
    if (!tk) throw new Error('Inicia sesión para ver tus fotos.');
    const r = await fetch(`${c.url}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { apikey: c.key, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: slug, limit: 300, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(/bucket|not found/i.test(e.message || e.error || '') ? 'Falta crear el almacén de fotos (SQL «Subir fotos» de Supabase).' : (e.message || 'No se pudo leer tu almacén (' + r.status + ').')); }
    const lista = await r.json();
    return (Array.isArray(lista) ? lista : []).filter(o => o && o.id && /\.(webp|jpe?g|png|gif)$/i.test(o.name || '')).map(o => `${c.url}/storage/v1/object/public/${BUCKET}/${slug}/${o.name}`);
  }
  // fotos que ya usas en tus productos y en la marca
  function fotosUsadas() {
    const t = T(), out = [];
    const ok = u => typeof u === 'string' && /^https:\/\//.test(u) && !out.includes(u) && out.push(u);
    ['logo', 'og', 'favicon'].forEach(k => ok((t.marca || {})[k]));
    (t.productos || []).forEach(q => { (q.imagenes || []).forEach(ok); (q.contenido || []).forEach(c => ok(c && c.img)); (q.bloques || []).forEach(c => ok(c && c.img)); (q.secciones || []).forEach(c => ok(c && c.img)); });
    return out;
  }
  function elegirFoto(path, modo) {
    const f = $('#dlgForm'), d = $('#dlg'), multi = modo === 'push', sel = [];
    f.innerHTML = `<h2>${multi ? 'Elegir fotos' : 'Elegir foto'}</h2><p class="sub" style="margin-top:-6px;color:var(--mut)">Sube una nueva o toca una de las que ya tienes${multi ? ' (puedes marcar varias)' : ''}.</p>
      <div class="tn-act"><button type="button" class="btn btn-pri" id="phUp">📤 Subir del dispositivo</button></div>
      <div id="phMsg" class="note" style="min-height:16px"></div><div id="phBox"><p class="note">Cargando tus fotos…</p></div>
      <div class="dlg-foot"><button type="button" class="btn" id="phNo">Cancelar</button>${multi ? '<button type="button" class="btn btn-pri" id="phOk" disabled>Usar fotos</button>' : ''}</div>`;
    f.onsubmit = e => e.preventDefault();
    $('#phNo').onclick = () => d.close();
    $('#phUp').onclick = () => { d.close(); subirArchivos(path, modo); };
    const poner = urls => { if (!urls.length) return; if (multi) { const L = getP(T(), path); if (Array.isArray(L)) L.push(...urls); else setP(T(), path, urls.slice()); } else setP(T(), path, urls[0]); Store.save(); d.close(); render(); toast(urls.length > 1 ? urls.length + ' fotos agregadas' : 'Foto elegida'); };
    const grid = (tit, urls) => urls.length ? `<h3 style="font-size:13px;margin:12px 0 6px">${tit} <small style="color:var(--mut)">(${urls.length})</small></h3><div class="tn-ph">${urls.map(u => `<button type="button" data-u="${esc(u)}"><img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer"><i>✓</i></button>`).join('')}</div>` : '';
    const dibujar = (subidas, errSub) => {
      const usadas = fotosUsadas().filter(u => !subidas.includes(u));
      $('#phBox').innerHTML = (errSub ? `<p class="note" style="color:var(--warn)">${esc(errSub)}</p>` : '') + grid('Subidas a mi almacén', subidas) + grid('Usadas en mis productos', usadas) + (!subidas.length && !usadas.length ? '<p class="note">Todavía no tienes fotos. Sube la primera con el botón de arriba.</p>' : '');
      $('#phBox').querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
        if (!multi) return poner([b.dataset.u]);
        const i = sel.indexOf(b.dataset.u); if (i < 0) sel.push(b.dataset.u); else sel.splice(i, 1);
        b.classList.toggle('on', i < 0); const ok = $('#phOk'); ok.disabled = !sel.length; ok.textContent = sel.length ? 'Usar ' + sel.length + (sel.length === 1 ? ' foto' : ' fotos') : 'Usar fotos';
      });
    };
    if (multi) $('#phOk').onclick = () => poner(sel.slice());
    dibujar([], '');
    listarSubidas().then(l => dibujar(l, '')).catch(e => dibujar([], e.message));
    d.showModal();
  }

  const upBtn = (path, modo, txt) => `<button type="button" class="btn btn-sm tn-up" data-up="${path}" data-upmodo="${modo || 'set'}">📷 ${txt || 'Subir o elegir foto'}</button>`;

  // Campos
  const f = (path, label, o = {}) => {
    const v = getP(T(), path), id = 'tn_' + path.replace(/\./g, '_');
    let inp;
    if (o.check) return `<div class="field" ${o.full ? 'style="grid-column:1/-1"' : ''}><label class="chk"><input type="checkbox" data-p="${path}" data-k="check" ${(v === undefined && path === 'pedidoWa.directo') || v ? 'checked' : ''}> ${esc(label)}</label>${o.hint ? `<div class="note">${o.hint}</div>` : ''}</div>`;
    if (o.kind) inp = `<textarea data-p="${path}" data-k="${o.kind}" rows="${o.rows || 5}" id="${id}" spellcheck="false">${esc(KIND[o.kind].out(v))}</textarea>`;
    else if (o.area) inp = `<textarea data-p="${path}" rows="${o.rows || 3}" id="${id}">${esc(v)}</textarea>`;
    else if (o.opts) inp = `<select data-p="${path}" id="${id}" style="width:100%">${o.opts.map(x => `<option ${x == v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    else inp = `<input data-p="${path}" ${o.type === 'number' ? 'data-k="num" type="number" step="any" inputmode="decimal"' : o.type === 'color' ? 'type="color" style="padding:3px;height:44px"' : 'type="text"'} value="${esc(v ?? '')}" id="${id}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>`;
    return `<div class="field" ${o.full ? 'style="grid-column:1/-1"' : ''}><label for="${id}">${esc(label)}</label>${inp}${o.hint ? `<div class="note">${o.hint}</div>` : ''}${o.up ? `<div style="margin-top:6px">${upBtn(path)}</div>` : ''}</div>`;
  };

  // Enlace propio de cada producto: con el dominio de la tienda (el www si existe); sin dominio, la dirección de prueba
  const urlProducto = (t, p) => {
    const ds = (t.dominios || []).map(d => String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()).filter(Boolean);
    const d = ds.find(x => x.startsWith('www.')) || ds[0];
    return d ? { url: `https://${d}/${p.slug}`, dominio: true } : { url: `${location.origin}/t/${t.slug}/${p.slug}`, dominio: false };
  };
  const urlTienda = t => { const lk = urlProducto(t, { slug: '' }); return lk.dominio ? { url: lk.url, dominio: true } : { url: `${location.origin}/t/${t.slug}`, dominio: false }; };
  const copiar = async txt => { try { await navigator.clipboard.writeText(txt); } catch (e) { const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (x) {} a.remove(); } toast('Enlace copiado'); };
  const TIPO = { producto: ['Producto', 'Página de producto completa'], landing: ['Landing', 'Título, imagen y botón'], codigo: ['Código', 'Tu propio HTML'] };
  const nuevoProducto = tipo => {
    const b = { creado: new Date().toISOString(), slug: 'producto-' + Date.now().toString(36).slice(-4), nombre: 'Producto nuevo', titulo: 'Producto nuevo', kicker: '', etiqueta: '', imagenes: [], precio: 0, tachado: 0, combo2: 0, categoria: '', rating: 0, resenas: 0, vendidos: 0, masVendido: false, nuevo: true, activo: true, tipo, bloques: [], faq: [], resenasLista: [] };
    if (tipo === 'producto') Object.assign(b, { contenido: [], cta: 'Quiero el mío', banner: '', oferta1: { label: 'Llévate uno', badge: 'OFERTA' }, oferta2: { label: 'Para ti y un ser querido', badge: 'AHORRA MÁS' }, sel: 2 });
    if (tipo === 'landing') b.secciones = [{ tipo: 'titulo', x: 'Escribe aquí el título' }, { tipo: 'imagen', img: '' }, { tipo: 'boton', x: 'Quiero el mío', accion: 'formulario', wa: '', msg: '' }, { tipo: 'imagen', img: '' }, { tipo: 'boton', x: 'Pedir por WhatsApp', accion: 'whatsapp', wa: '', msg: '' }];
    if (tipo === 'codigo') Object.assign(b, { html: '<section style="padding:24px 16px;text-align:center">\n  <h1>{{nombre}}</h1>\n  <p style="font-size:28px;font-weight:800">{{precio}}</p>\n  <button class="cta" data-abrir>Quiero el mío</button>\n  <p><a data-wa href="#">Escríbenos por WhatsApp</a></p>\n</section>', css: '', js: '' });
    return b;
  };
  // Plantillas listas: se agregan como un producto nuevo y se editan como cualquier otro
  const PLANTILLAS = { collar: {"nombre": "Collar de las Emociones", "titulo": "Tu conexión emocional en un collar único", "etiqueta": "CORAZÓN QUE HABLA", "kicker": "REFLEJA TUS SENTIMIENTOS", "barra": ["Refleja tus emociones", "Diseño único"], "imagenes": ["https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-9542be0f3f2dd8b05ed4053345dd68ad.webp", "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-6f90431a200d37d09451911bd2257385.webp", "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-1f6512f07c4c45bfd7aadbc1270b3c5b.webp", "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-74dbad88b866b8d569442d566e34b768.webp", "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-559f681d711a037118a0a73b140f25bf.webp", "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-c77baf0911449b8cc942fd2c75c7efe3.webp"], "precio": 69, "tachado": 0, "combo2": 99, "rating": 4.7, "resenas": 198, "vendidos": 0, "banner": "Envío gratis esta semana", "cta": "Quiero mi collar", "oferta1": {"label": "Llévate uno por menos", "badge": "OFERTA"}, "oferta2": {"label": "Para ti y un ser querido", "badge": "AHORRA MÁS"}, "sel": 2, "garantiaTitulo": "Garantía contraentrega", "garantiaTexto": "Revisa el Collar de las Emociones antes de pagar. Si no es lo que pediste, no lo recibes y no pagas.", "contenido": [{"tipo": "texto", "x": "Paga solo al recibirlo en casa. Sin riesgos."}, {"tipo": "imagen", "img": "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-1342c4c5c430c678b1977f5bca54ec59.webp"}, {"tipo": "titulo", "x": "Conecta con tus emociones diarias"}, {"tipo": "texto", "x": "El Collar de las Emociones cambia de color, reflejando el sentir de tu día a día. Ponte en sintonía con tus emociones más profundas."}, {"tipo": "imagen", "img": "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-ddd401d93f214d7351c60a5b25cb2432.webp"}, {"tipo": "titulo", "x": "Diseño sofisticado y versátil"}, {"tipo": "texto", "x": "Fabricado con una cadena de eslabones plata y un colgante de cristal, este collar se adapta a cualquier estilo, dándole un toque elegante a cada atuendo."}, {"tipo": "titulo", "x": "Así de fácil se usa"}, {"tipo": "texto", "x": "Paso 1: Colócalo alrededor de tu cuello. Paso 2: Ajústalo para que quede cómodo. Paso 3: Observa cómo el color cambia según tus emociones, revelando un nuevo tono."}, {"tipo": "titulo", "x": "Regalo perfecto para cualquier ocasión"}, {"tipo": "texto", "x": "Sorprende a tus seres queridos con un regalo que va más allá de lo material. El Collar de las Emociones expresa sentimientos y crea recuerdos inolvidables."}, {"tipo": "imagen", "img": "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-d37c0472b44acfb742623f607c2a05df.webp"}, {"tipo": "titulo", "x": "Tu día comienza mejor"}, {"tipo": "texto", "x": "Imagina despertar, colocarte el collar y ver cómo refleja tu estado emocional. Es un accesorio que no solo complementa tu outfit, sino también tu día."}, {"tipo": "imagen", "img": "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-e0758ee556d60e8714351ee6183f557c.webp"}, {"tipo": "titulo", "x": "Compra sin miedo a estafas"}, {"tipo": "texto", "x": "Recibe primero, revisa y solo entonces paga. Si no te convence, no lo recibes y no pagas. Te contactamos por WhatsApp antes de despachar."}, {"tipo": "imagen", "img": "https://pub-fe9a685817b74328ab21351d5ffb968a.r2.dev/landing/36/imp-4c00be44da2d812ffadb53edee67629a.webp"}], "faq": [["¿Cuándo llega mi pedido?", "Llega en 2 a 3 días hábiles según tu ciudad. Te confirmamos por WhatsApp en cada etapa."], ["¿Pago cuando lo recibo?", "Sí. Es pago contraentrega: pagas en efectivo al recibir tu pedido en la puerta de tu casa. No pagas nada por adelantado."], ["¿El envío tiene costo?", "El envío es gratis a todo el país. Lo coordinamos contigo al confirmar tu pedido."], ["¿Cómo sé qué talla u opción elegir?", "Guíate por la información del producto. Si tienes dudas, escríbenos y te ayudamos a elegir la correcta."], ["¿Es seguro comprar aquí?", "Totalmente. No pagas nada por adelantado: solo pagas cuando el producto llega a tus manos."], ["¿Qué pasa si llega con algún problema?", "Contáctanos dentro de las 48 horas siguientes a la entrega y coordinamos el cambio o la solución."], ["¿Puedo hacer seguimiento de mi pedido?", "Claro. Te mantenemos informado por WhatsApp o llamada desde que confirmas hasta que recibes."]], "resenasLista": [{"n": "Andrea M.", "c": "Arequipa", "e": 5, "t": "Dudé porque pensé que era caro, ¡pero es hermoso! Pagué al recibirlo."}, {"n": "Luis R.", "c": "Lima", "e": 4, "t": "El color cambia realmente fácil y se ve genial. Lástima que tardó un día más."}, {"n": "María T.", "c": "Trujillo", "e": 5, "t": "Perfecto para regalar. Mi mamá quedó encantada con el colgante."}, {"n": "Carlos D.", "c": "Piura", "e": 5, "t": "Pensé que no iba a llegar, pero cumplió. Pagué cuando lo tuve en mis manos."}], "categoria": "Accesorios", "mostrar": {"faqGeneral": false}} };
  PLANTILLAS.duo = window.TIENDA_PLANTILLA_DUO || null;
  const crearDePlantilla = (k, productos) => Object.assign(nuevoProducto('producto'), clon(PLANTILLAS[k]), { slug: (() => { const b = slugify(PLANTILLAS[k].nombre), usados = (productos || []).map(q => q.slug); let sl = b, i = 2; while (usados.includes(sl)) sl = b + '-' + i++; return sl; })(), nuevo: false, creado: new Date().toISOString() });
  const desdePlantilla = k => crearDePlantilla(k, T().productos);
  function elegirTipo(cb) {
    const f = $('#dlgForm'), d = $('#dlg');
    f.innerHTML = `<h2>¿Qué tipo de página quieres?</h2><div class="tn-tipos">
      <button type="button" data-tp="producto"><b>1 · Página de producto</b><span>Título, carrusel de fotos, precio con oferta y precio de comparación, bloques con imagen y título, reseñas y preguntas.</span></button>
      <button type="button" data-tp="landing"><b>2 · Landing page</b><span>Título, imagen, botón (formulario o WhatsApp), imagen, botón… en el orden que tú quieras.</span></button>
      <button type="button" data-tp="plantilla-collar"><b>★ Plantilla: Collar de las Emociones</b><span>La página de millora.shop ya armada, con fotos, textos, preguntas y reseñas. Precio S/ 69 · 2 por S/ 99.</span></button>
      ${window.TIENDA_PLANTILLA_DUO ? '<button type="button" data-tp="plantilla-duo"><b>★ Plantilla: Dúo Mágico (Llave y Corazón)</b><span>Página en código con carrusel, pestañas, tabla comparativa y reseñas con foto. Precio S/ 69 · 2 por S/ 95 · pedido directo por WhatsApp.</span></button>' : ''}
      <button type="button" data-tp="codigo"><b>3 · Código</b><span>Pegas tu propio HTML, CSS y JS. Los botones con <code>data-abrir</code> abren el formulario de pedido.</span></button></div>
      <div class="dlg-foot"><button type="button" class="btn" id="tpNo">Cancelar</button></div>`;
    f.onsubmit = e => e.preventDefault();
    f.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { d.close(); cb(b.dataset.tp); });
    $('#tpNo').onclick = () => d.close();
    d.showModal();
  }
  /*UP*/
  const PALETA_LOGO = [['Oro claro', '#FDDE83'], ['Oro', '#F4C468'], ['Oro medio', '#E2AE52'], ['Oro profundo', '#AA7831'], ['Negro', '#0A0A0A'], ['Plata', '#D6D6D6'], ['Plata oscura', '#B7B7B7'], ['Blanco', '#FFFFFF']];
  const abiertas = new Set(['previa', 'previaHome', 'basico']);
  const GUIA_SW = `<label class="chk tn-guia"><input type="checkbox" id="tnGuia" ${window.__tnGuia !== false ? 'checked' : ''}> Guía: tocar una parte para editarla</label>`;
  const sec = (k, titulo, sub, body) => `<details class="tn-sec" data-sec="${k}" ${abiertas.has(k) ? 'open' : ''}><summary><b>${titulo}</b><small>${esc(sub || '')}</small></summary><div class="tn-secb">${body}</div></details>`;
  const thumb = u => /^https:\/\//.test(u || '') ? `<img class="tn-th" src="${esc(u)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : '<div class="tn-th tn-nth">sin foto</div>';
  const FACT = { 'cont-titulo': () => ({ tipo: 'titulo', x: '' }), 'cont-texto': () => ({ tipo: 'texto', x: '' }), 'cont-imagen': () => ({ tipo: 'imagen', img: '' }), 'sec-titulo': () => ({ tipo: 'titulo', x: '' }), 'sec-texto': () => ({ tipo: 'texto', x: '' }), 'sec-imagen': () => ({ tipo: 'imagen', img: '' }), 'sec-boton': () => ({ tipo: 'boton', x: 'Quiero el mío', accion: 'formulario', wa: '', msg: '' }), imagen: () => '', bloque: () => ({ t: '', x: '', img: '' }), resena: () => ({ n: '', c: '', e: 5, t: '' }), faq: () => ['', ''] };
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
        <div class="tn-act"><button class="btn btn-pri" id="tnPub">Publicar tienda</button><button class="btn" id="tnDes">Despublicar</button><a class="btn tn-abrir" href="${esc(urlTienda(t).url)}" target="_blank" rel="noopener" title="${esc(urlTienda(t).url)}">Abrir tienda publicada ↗</a></div>
        <div class="note" id="tnMsg">${esc(S.tiendaMsg || '')}</div>
        <div class="note">${urlTienda(t).dominio ? 'Tu tienda en vivo: <b>' + esc(urlTienda(t).url) + '</b>' : 'Todavía no tienes dominio: se abre la dirección de prueba. Agrégalo en la pestaña <b>Dominios</b>.'}</div>
        <div class="note">Antes de publicar la primera vez, ejecuta <b>supabase/tienda.sql</b> en Supabase (SQL Editor). Solo se hace una vez.</div>`) +
        card('Tus tiendas', 'Cada tienda tiene su propia configuración y sus propios dominios. «Duplicar» copia todo para crear otra con la misma estructura.', `
        <div class="field"><select id="tnSel" style="width:100%">${S.tiendas.map((x, i) => `<option value="${i}" ${i === ti ? 'selected' : ''}>${esc(x.nombre)} · /t/${esc(x.slug)}</option>`).join('')}</select></div>
        <div class="tn-act"><button class="btn" id="tnDup">Duplicar esta tienda</button><button class="btn btn-del" id="tnDel">Eliminar</button><button class="btn" id="tnExp">Exportar configuración</button><button class="btn" id="tnImp">Importar</button><input type="file" id="tnImpF" accept="application/json" hidden></div>`) +
        card('Cómo está hecha la tienda de referencia', 'Lo que replica este constructor de millora.shop:', `<ul class="tn-ul">
        <li><b>Barra superior</b> con 3 mensajes (envío gratis desde S/ 40, contraentrega, exclusivos).</li>
        <li><b>Portada</b>: tienda verificada, logo, etiqueta «Pago contraentrega», lema, 3 garantías, caja de promo por cantidad (2 o más −10%), categorías y rejilla «Los más vendidos» con precio tachado, ahorro, estrellas y «Lleva 2 y ahorra».</li>
        <li><b>Página de producto</b>: galería con miniaturas, etiqueta, título, estrellas, precio con −%, llegada en 2 a 5 días, 3 sellos de confianza, paquetes 1 o 2 unidades, botón con brillo, garantía, pasos «Así llega tu pedido», bloques de beneficios con foto, FAQ, reseñas verificadas y barra fija inferior.</li>
        <li><b>Pedido en ventana</b> contraentrega: nombre, teléfono, departamento, municipio, dirección, referencia y total.</li>
        <li><b>Pie</b>: preguntas frecuentes y 5 políticas (privacidad, envíos, cambios, retracto INDECOPI, términos).</li>
        <li><b>Pixeles</b>: Meta, TikTok, Google Analytics y Clarity.</li></ul>`);
    },
    marca(t) {
      const pre = R().PRESETS;
      return card('Marca', 'Nombre, logo y textos de compartir (WhatsApp, Facebook).', `<div class="row">${f('nombre', 'Nombre interno de la tienda')}${f('slug', 'Dirección de prueba (/t/…)', { hint: 'Solo letras minúsculas, números y guiones.' })}</div>
        <div class="row">${f('marca.nombre', 'Nombre que ve el cliente')}${f('marca.lema', 'Lema')}</div>
        ${f('marca.descripcion', 'Descripción para buscadores y compartir', { area: 1, full: 1 })}
        ${f('marca.logo', 'Logo (enlace o subir del dispositivo)', { up: 1 })}${f('marca.favicon', 'Ícono de la pestaña', { up: 1 })}${f('marca.og', 'Imagen al compartir el enlace', { up: 1 })}
        ${f('marca.verificada', 'Mostrar «Tienda verificada»', { check: 1 })}`) +
        card('Paleta del logo', 'Los colores de tu logo de la M dorada. Toca uno para usarlo como color de acento, o aplica toda la paleta con «Millora oro y negro».', `<div class="tn-sw">${PALETA_LOGO.map(([n, c]) => `<button type="button" class="tn-swb" data-sw="${c}" title="${n} ${c}"><i style="background:${c}"></i><span>${n}<small>${c}</small></span></button>`).join('')}</div>`) +
        card('Estilo', 'Empieza con un estilo y ajusta los colores.', `<div class="tn-act">${['oro', ...Object.keys(pre).filter(k => k !== 'oro')].map(k => `<button class="btn" data-pre="${k}">${{ oro: '★ Millora oro y negro (fondo blanco)', classic: 'Millora clásico (crema y dorado)', tienda: 'Millora tienda (Baloo 2)', rosa: 'Rosa y vino', oscuro: 'Oscuro' }[k]}</button>`).join('')}</div>
        <div class="row">${f('diseno.fuente', 'Tipografía (Google Fonts)', { opts: ['Playfair Display', 'Baloo 2', 'Nunito', 'Inter', 'Poppins', 'Montserrat', 'Lora', 'DM Sans', 'Plus Jakarta Sans'] })}${f('diseno.radio', 'Redondeo de bordes (px)', { type: 'number' })}</div>
        <div class="row">${f('diseno.acento', 'Color de acento', { type: 'color' })}${f('diseno.boton', 'Color del botón', { type: 'color' })}</div>
        <div class="row">${f('diseno.botonTxt', 'Texto del botón', { type: 'color' })}${f('diseno.fondo', 'Fondo', { type: 'color' })}</div>
        <div class="row">${f('diseno.texto', 'Texto', { type: 'color' })}${f('diseno.precio', 'Precio (verde)', { type: 'color' })}</div>
        <div class="row">${f('diseno.tachado', 'Precio tachado / descuento', { type: 'color' })}${f('diseno.ancho', 'Ancho máximo (px)', { type: 'number' })}</div>
        ${f('diseno.grano', 'Textura de papel (grano)', { check: 1 })}`) +
        card('País y moneda', 'Todo va en soles (S/ · PEN) con pago contraentrega.', `<div class="row">${f('pais.pais', 'País')}${f('pais.moneda', 'Símbolo de moneda')}</div><div class="row">${f('pais.codigo', 'Código (GTQ)')}${f('pais.locale', 'Idioma (es_GT)')}</div>`);
    },
    portada(t) {
      return card('Barra superior', 'Una frase por línea.', `${f('barra.activa', 'Mostrar barra', { check: 1 })}${f('barra.items', 'Mensajes', { kind: 'lines', rows: 4 })}<div class="row">${f('barra.movHome', 'Barra en movimiento en la página principal', { check: 1 })}${f('barra.movProd', 'Barra en movimiento en las páginas de producto', { check: 1 })}</div>${f('barra.dorado', 'Fondo dorado degradado (si pones un color de fondo, se usa ese)', { check: 1 })}`) +
        card('Movimiento (solo en la página principal)', 'La barra superior corre de lado a lado y debajo del nombre se escribe una frase que va cambiando. Los productos no se mueven.', `${f('portada.mov', 'Activar la frase que se escribe sola', { check: 1 })}${f('portada.fijo', 'Texto fijo (queda quieto)')}${f('portada.frases', 'Frases que se escriben solas (una por línea)', { kind: 'lines', rows: 4 })}
        <div class="row">${f('portada.escVel', 'Velocidad al escribir (ms por letra, menos = más rápido)', { type: 'number' })}${f('portada.escTam', 'Tamaño de la frase (px)', { type: 'number' })}</div>${f('portada.escColor', 'Color de la frase escrita', { type: 'color' })}
        <div class="row">${f('portada.barraVel', 'Vuelta completa de la barra (segundos, más = más lenta)', { type: 'number' })}${f('portada.barraTam', 'Tamaño del texto de la barra (px)', { type: 'number' })}</div>
        <div class="row">${f('barra.fondo', 'Fondo de la barra', { type: 'color' })}${f('barra.color', 'Color del texto de la barra', { type: 'color' })}</div>${f('portada.simbolo', 'Símbolo entre mensajes (vacío = ninguno)')}`) +
        card('Carrusel horizontal (solo en la página principal)', 'Los productos se deslizan de lado a lado con el dedo y también solos. Cada tarjeta lleva al producto.', `${f('portada.carrusel', 'Mostrar el carrusel', { check: 1 })}${f('portada.carruselTitulo', 'Título sobre el carrusel (opcional)')}<div class="row">${f('portada.carruselSeg', 'Cambia solo cada (segundos, 0 = no)', { type: 'number' })}${f('portada.carruselPrecio', 'Mostrar el precio', { check: 1 })}</div>`) +
        card('Cabecera de portada', '', `<div class="row">${f('portada.badge', 'Etiqueta (ej. Pago contraentrega)')}${f('portada.titulo', 'Título de la rejilla')}</div>${f('portada.confianza', 'Garantías (una por línea)', { kind: 'lines', rows: 4 })}`) +
        card('Promo por cantidad', 'La caja «Mientras más llevas, más ahorras». Si un producto no tiene precio de combo propio, este descuento arma el precio de 2 unidades.', `${f('promo.activa', 'Activar promo', { check: 1 })}${f('portada.mostrarPromo', 'Mostrar la caja en la portada', { check: 1 })}
        ${f('promo.titulo', 'Título')}<div class="row">${f('promo.cantidad', 'Cantidad mínima', { type: 'number' })}${f('promo.descuento', 'Descuento (%)', { type: 'number' })}</div>${f('promo.texto', 'Texto de apoyo')}`) +
        card('Categorías', 'Los botones sobre la rejilla. Una por línea; cada producto elige la suya.', f('categorias', 'Categorías', { kind: 'lines', rows: 5 }));
    },
    lista(t) {
      const ps = t.productos || [];
      let h = card('Mis productos', ps.length ? ps.length + (ps.length === 1 ? ' producto' : ' productos') + ' · cada uno tiene su propia página y enlace.' + (window.Nube && Nube.estado ? ' · ☁ ' + Nube.estado : '') : 'Todavía no hay productos.', `
        <div class="tn-act"><button class="btn btn-pri" id="tnPNew">+ Producto nuevo</button><button class="btn" id="tnImpUrl">⬇ Importar landing desde URL</button>${ps.length ? '<button class="btn btn-del" id="tnPZero">Dejar todo en cero</button>' : ''}<button class="btn" id="tnRecup">🛟 Recuperar productos</button></div><p class="note" id="tnRecMsg"></p>${ps.length ? '' : '<p class="note">Pulsa «+ Producto nuevo» y elige el tipo de página (producto, landing, código o la plantilla lista).</p>'}`);
      h += ps.map((q, i) => { const x = R().precios(t, q), lk = urlProducto(t, q); return `<div class="card tn-row">
        <div class="tn-rowi">${thumb((q.imagenes || [])[0])}<div class="tn-rowt"><b>${esc(q.nombre || 'Sin nombre')}</b><small>${TIPO[q.tipo || 'producto'][0]} · ${R().q(t, x.pr)}${x.c2 ? ' · 2 por ' + R().q(t, x.c2) : ''} · ${q.activo === false ? 'Oculto' : 'Visible'}${q.creado ? ' · ' + fechaCorta(q.creado) : ''}</small></div></div>
        <div class="tn-rowa"><button class="btn btn-pri btn-sm" data-edit="${i}">Editar</button><button class="btn btn-sm" data-dup="${i}">Duplicar</button><a class="btn btn-sm tn-ver" href="${esc(lk.url)}" target="_blank" rel="noopener">Ver ↗</a><button class="btn btn-sm btn-del" data-del="${i}">Eliminar</button><button class="btn btn-sm" data-mv="${i}:-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn btn-sm" data-mv="${i}:1" aria-label="Bajar" ${i === ps.length - 1 ? 'disabled' : ''}>↓</button></div></div>`; }).join('');
      return h;
    },
    productos(t) {
      const ps = t.productos || [], p = ps[pi], base = `productos.${pi}.`;
      const x = p ? R().precios(t, p) : null;
      if (!p) { tab = 'lista'; return pantalla.lista(t); }
      const head = `<div class="tn-act" style="margin:0 0 10px"><button type="button" class="btn" id="tnBack">← Mis productos</button></div>` + card('Editando: ' + esc(p.nombre), 'Cada producto tiene su página: tudominio.com/<dirección>.', `<div class="tn-act"><button class="btn" id="tnPDup">Duplicar</button><a class="btn tn-ver" href="${esc(urlProducto(t, p).url)}" target="_blank" rel="noopener">Ver producto ↗</a><button class="btn btn-del" id="tnPDel">Eliminar</button></div>`);
      const lk = urlProducto(t, p);
      const enlace = `<div class="card tn-url"><div class="tn-urlt"><small class="cap">Enlace de este producto</small><a href="${esc(lk.url)}" target="_blank" rel="noopener">${esc(lk.url)}</a></div>
        <div class="tn-act"><a class="btn btn-sm btn-pri" href="${esc(lk.url)}" target="_blank" rel="noopener">Ver producto ↗</a><button type="button" class="btn btn-sm" data-copy="${esc(lk.url)}">Copiar enlace</button></div>
        <div class="note">${lk.dominio ? 'Usa el dominio de tu tienda. Funciona cuando la tienda está publicada: pulsa <b>Publicar</b> después de cambios.' : 'Todavía no tienes dominio en esta tienda: este es el enlace de prueba. Agrega tu dominio en la pestaña <b>Dominios</b> y el enlace cambia solo.'}</div></div>`;
      const chk = (path, label) => `<div class="field"><label class="chk"><input type="checkbox" data-p="${path}" data-k="check" ${getP(T(), path) !== false ? 'checked' : ''}> ${esc(label)}</label></div>`;
      const imgs = p.imagenes || [];
      const SP = sec('previa', '📱 Vista previa en celular', 'Así se ve este producto · se actualiza al cambiar algo', `<div class="tn-phone"><div class="tn-notch"></div><iframe id="tnFrP" title="Vista previa del producto" sandbox="allow-scripts allow-same-origin"></iframe></div>${GUIA_SW}<div class="tn-act" style="justify-content:center"><button class="btn btn-sm" id="tnCelRef">Actualizar</button><button class="btn btn-sm" id="tnVer">Pantalla completa</button></div>`);
      const tipoSel = `<div class="field"><label>Tipo de página</label><select data-p="${base}tipo" style="width:100%">${Object.entries(TIPO).map(([k, v]) => `<option value="${k}" ${(p.tipo || 'producto') === k ? 'selected' : ''}>${v[0]} — ${v[1]}</option>`).join('')}</select></div>`;
      const S1 = sec('basico', '1 · Datos básicos', 'Nombre, dirección, tipo de página', `
        ${tipoSel}${f(base + 'activo', 'Visible en la tienda', { check: 1 })}
        <div class="row">${f(base + 'nombre', 'Nombre en la rejilla')}${f(base + 'slug', 'Dirección (slug)', { hint: 'Ej.: collar-saturno → tudominio.com/collar-saturno' })}</div>
        ${f(base + 'titulo', 'Título de la página del producto', { full: 1 })}
        <div class="row">${f(base + 'etiqueta', 'Etiqueta (ej. JOYERÍA ÚNICA)')}${f(base + 'kicker', 'Frase corta sobre el título')}</div>
        ${(p.tipo || 'producto') === 'producto' ? f(base + 'barra', 'Barra superior de este producto (una frase por línea; vacío = la general)', { kind: 'lines', rows: 3, full: 1 }) : ''}
        ${f(base + 'categoria', 'Categoría', { opts: ['', ...(t.categorias || [])] })}
        <div class="row">${f(base + 'masVendido', 'Marcar «Más vendido»', { check: 1 })}${f(base + 'nuevo', 'Marcar «Nuevo»', { check: 1 })}</div>`);
      const S2 = sec('fotos', '2 · Fotos', imgs.length + ' foto(s) · la primera es la principal', `
        ${rep(base + 'imagenes', imgs, (u, b) => `<div class="tn-ri">${thumb(u)}<div style="flex:1;min-width:0"><input data-p="${b}" type="text" value="${esc(u)}" placeholder="https://… enlace de la foto"></div></div>`, 'imagen', 'Agregar foto')}
        <div style="margin-top:8px">${upBtn(base + 'imagenes', 'push', 'Subir fotos del dispositivo')}</div>
        <details class="tn-mini"><summary>Pegar varias a la vez</summary>${f(base + 'imagenes', 'Un enlace por línea', { kind: 'lines', rows: 5, full: 1 })}</details>`);
      const esProd = (p.tipo || 'producto') === 'producto';
      const S3 = sec('precio', '3 · Precio y oferta', x.pct1 ? `−${x.pct1}% · ahorro ${R().q(t, x.ahorro1)}` : 'Precio de venta', `
        <div class="row">${f(base + 'precio', 'Precio de venta', { type: 'number' })}${f(base + 'tachado', 'Precio antes (tachado, opcional)', { type: 'number' })}</div>
        ${f(base + 'combo2', 'Precio por 2 unidades (0 = usar el descuento de la promo)', { type: 'number', full: 1 })}
        <div class="tn-calc"><span>1 unidad: <b>${R().q(t, x.pr)}</b>${x.ahorro1 ? ` · ahorras ${R().q(t, x.ahorro1)} (−${x.pct1}%)` : ''}</span>${x.c2 ? `<span>2 unidades: <b>${R().q(t, x.c2)}</b> · ${R().q(t, x.c2 / 2)} c/u · ahorras ${R().q(t, x.base2 - x.c2)}</span>` : '<span>Sin oferta de 2 unidades</span>'}</div>${esProd ? `
        <div class="row" style="margin-top:12px">${f(base + 'oferta1.label', 'Oferta de 1 unidad: texto')}${f(base + 'oferta1.badge', 'Etiqueta (ej. OFERTA)')}</div>
        <div class="row">${f(base + 'oferta2.label', 'Oferta de 2 unidades: texto')}${f(base + 'oferta2.badge', 'Etiqueta (ej. AHORRA MÁS)')}</div>
        <div class="field"><label>Oferta marcada al abrir la página</label><select data-p="${base}sel" data-k="num" style="width:100%"><option value="1" ${p.sel === 1 ? 'selected' : ''}>1 unidad</option><option value="2" ${p.sel !== 1 ? 'selected' : ''}>2 unidades (si hay precio de 2)</option></select></div>
        ${f(base + 'banner', 'Aviso sobre el precio (ej. Envío gratis esta semana)', { full: 1 })}
        ${f(base + 'sellos', 'Sellos bajo el aviso (uno por línea; vacío = Pago contraentrega, Envío gratis, Calidad certificada)', { kind: 'lines', rows: 3, full: 1 })}
        ${f(base + 'cta', 'Texto del botón (ej. Quiero mi collar)', { full: 1 })}` : ''}`);
      if (!Array.isArray(p.contenido)) p.contenido = (p.bloques || []).flatMap(bl => [bl && bl.t ? { tipo: 'titulo', x: bl.t } : null, bl && bl.x ? { tipo: 'texto', x: bl.x } : null, bl && bl.img ? { tipo: 'imagen', img: bl.img } : null].filter(Boolean));
      const S4 = sec('contenido', '4 · Contenido de la página', p.contenido.length + ' elemento(s) · título, texto e imagen en el orden que quieras', `
        <p class="note" style="margin:0 0 8px">Se ven debajo de las ofertas, uno tras otro. Mezcla títulos, textos e imágenes como en la página de referencia.</p>
        ${rep(base + 'contenido', p.contenido, (it, b) => {
          const et = { titulo: 'Título', texto: 'Texto', imagen: 'Imagen' }[it.tipo] || it.tipo;
          const c = it.tipo === 'titulo' ? `<label>Título</label><input data-p="${b}.x" type="text" value="${esc(it.x)}">`
            : it.tipo === 'texto' ? `<label>Texto</label><textarea data-p="${b}.x" rows="3">${esc(it.x)}</textarea>`
            : `<div class="tn-ri">${thumb(it.img)}<div style="flex:1;min-width:0"><label>Imagen (enlace)</label><input data-p="${b}.img" type="text" value="${esc(it.img)}" placeholder="https://…"><div style="margin-top:6px">${upBtn(b + '.img')}</div></div></div>`;
          return `<div class="tn-ri tn-col"><span class="tn-tag">${et}</span>${c}</div>`;
        }, 'cont-titulo', [['cont-titulo', 'Título'], ['cont-texto', 'Texto'], ['cont-imagen', 'Imagen']])}`);
      const S5 = sec('resenas', '5 · Valoración y reseñas', (p.resenasLista || []).length + ' reseña(s)', `
        ${chk(base + 'mostrar.resenas', 'Mostrar las reseñas en la página')}
        ${f(base + 'resenasTitulo', 'Título de las reseñas (vacío = «Lo que opinan desde <país>»)', { full: 1 })}
        <div class="row">${f(base + 'rating', 'Estrellas (0 a 5)', { type: 'number' })}${f(base + 'resenas', 'Número de reseñas', { type: 'number' })}</div>
        ${f(base + 'vendidos', 'Vendidos (+N, se ve en la portada)', { type: 'number' })}
        ${rep(base + 'resenasLista', p.resenasLista || [], (r, b) => `<div class="tn-ri tn-col"><div class="row"><div><label>Nombre</label><input data-p="${b}.n" type="text" value="${esc(r.n)}"></div><div><label>Ciudad</label><input data-p="${b}.c" type="text" value="${esc(r.c)}"></div></div><div class="row"><div><label>Estrellas (1 a 5)</label><input data-p="${b}.e" data-k="num" type="number" min="1" max="5" value="${esc(r.e)}"></div><div></div></div><label>Comentario</label><textarea data-p="${b}.t" rows="2">${esc(r.t)}</textarea></div>`, 'resena', 'Agregar reseña')}`);
      const S6 = sec('preguntas', '6 · Preguntas frecuentes del producto', (p.faq || []).length + ' pregunta(s) · además de las generales', `
        ${chk(base + 'mostrar.faq', 'Mostrar las preguntas en la página')}
        ${rep(base + 'faq', p.faq || [], (q, b) => `<div class="tn-ri tn-col"><label>Pregunta</label><input data-p="${b}.0" type="text" value="${esc(q[0])}"><label>Respuesta</label><textarea data-p="${b}.1" rows="2">${esc(q[1])}</textarea></div>`, 'faq', 'Agregar pregunta')}`);
      const S6g = sec('garantia', '7 · Garantía de este producto', 'Título y texto propios (vacío = la general)', `${f(base + 'garantiaTitulo', 'Título (ej. Garantía contraentrega)')}${f(base + 'garantiaTexto', 'Texto', { area: 1, rows: 3, full: 1 })}`);
      const S7 = sec('mostrar', '8 · Qué se muestra en esta página', 'Garantía, pasos de entrega y sellos', `
        ${chk(base + 'mostrar.faqGeneral', 'Agregar también las preguntas generales de la tienda')}${chk(base + 'mostrar.confianza', 'Sellos de confianza bajo el precio')}${chk(base + 'mostrar.garantia', 'Garantía de satisfacción')}${chk(base + 'mostrar.pasos', 'Pasos «Así llega tu pedido»')}
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
            else if (it.tipo === 'imagen') c = `<div class="tn-ri">${thumb(it.img)}<div style="flex:1;min-width:0"><label>Imagen (enlace)</label><input data-p="${b}.img" type="text" value="${esc(it.img)}" placeholder="https://…"><div style="margin-top:6px">${upBtn(b + '.img')}</div></div></div>`;
            else c = `<label>Texto del botón</label><input data-p="${b}.x" type="text" value="${esc(it.x)}"><label>Qué hace</label><select data-p="${b}.accion" style="width:100%"><option value="formulario" ${it.accion !== 'whatsapp' ? 'selected' : ''}>Abrir el formulario de pedido</option><option value="whatsapp" ${it.accion === 'whatsapp' ? 'selected' : ''}>Ir a WhatsApp</option></select>${it.accion === 'whatsapp' ? `<label>Número de WhatsApp (vacío = el de contacto)</label><input data-p="${b}.wa" type="text" value="${esc(it.wa)}" placeholder="50212345678"><label>Mensaje</label><input data-p="${b}.msg" type="text" value="${esc(it.msg)}" placeholder="Hola, quiero pedir…">` : ''}`;
            return `<div class="tn-ri tn-col"><span class="tn-tag">${et}</span>${c}</div>`;
          }, 'sec-titulo', [['sec-titulo', 'Título'], ['sec-imagen', 'Imagen'], ['sec-boton', 'Botón'], ['sec-texto', 'Texto']])}`);
        return head + enlace + `<div class="tn-secs">${SP + S1 + S2.replace('2 · Fotos', '2 · Foto de portada').replace(' · la primera es la principal', ' · la primera sale en la portada de la tienda') + S3.replace('3 · Precio', '3 · Precio (para el formulario)') + SL}</div>`;
      }
      if (tipo === 'codigo') {
        const SC = sec('codigo', '4 · Tu código', 'HTML, CSS y JS propios', `
          <p class="note" style="margin:0 0 8px">Pega aquí lo que te hagan o lo que te arme yo. Puedes usar: <code>{{nombre}}</code> <code>{{precio}}</code> <code>{{tachado}}</code> <code>{{precio2}}</code> <code>{{ahorro}}</code> <code>{{descuento}}</code>. Cualquier elemento con <code>data-abrir</code> abre el formulario de pedido; un enlace con <code>data-wa</code> va a WhatsApp.</p>
          ${f(base + 'html', 'HTML', { area: 1, rows: 14, full: 1 })}${f(base + 'css', 'CSS (opcional)', { area: 1, rows: 6, full: 1 })}${f(base + 'js', 'JavaScript (opcional)', { area: 1, rows: 5, full: 1 })}`);
        return head + enlace + `<div class="tn-secs">${SP + S1 + S2.replace('2 · Fotos', '2 · Foto de portada') + S3.replace('3 · Precio', '3 · Precio (para el formulario)') + SC}</div>`;
      }
      return head + enlace + `<div class="tn-secs">${SP + S1 + S2 + S3 + S4 + S5 + S6 + S6g + S7}</div>`;
    },
    pedido(t) {
      return card('Envío y garantía', 'Lo que se muestra en la página del producto y en el pedido.', `${f('envio.gratis', 'Envío gratis', { check: 1 })}<div class="row">${f('envio.costo', 'Costo de envío si no es gratis', { type: 'number' })}${f('envio.productoDias', 'Llegada en el producto (ej. 2 a 5 días)')}</div>
        ${f('envio.dias', 'Tiempo general de entrega')}${f('envio.garantia', 'Garantía de satisfacción', { area: 1, rows: 3 })}
        ${f('envio.pasos', 'Pasos «Así llega tu pedido» — formato: Paso | Tiempo', { kind: 'pasos', rows: 4 })}
        ${f('confianzaProducto', 'Tres sellos bajo el precio (uno por línea)', { kind: 'lines', rows: 3 })}`) +
        card('Garantía y seguimiento (página de producto)', 'Lo que se ve en la tarjeta de garantía y en «Así llega tu pedido».', `${f('envio.garantiaTitulo', 'Título de la garantía')}<div class="row">${f('envio.pagos.titulo', 'Tarjeta de pagos: título')}${f('envio.pagos.extra', 'Detalle (ej. Atención personalizada)')}</div>${f('envio.pagos.metodo', 'Método de pago (ej. Contraentrega)')}${f('envio.sellosGarantia', 'Sellos de la garantía (uno por línea, máximo 2)', { kind: 'lines', rows: 2, full: 1 })}${f('envio.seguimiento', 'Etiqueta sobre «Así llega tu pedido»')}${f('envio.reaseguro', 'Frase del pie de página', { area: 1, rows: 2, full: 1 })}`) +
        card('Cómo llegan los pedidos', 'El botón de pedir puede mandar al cliente directo a WhatsApp con un resumen (producto, cantidad y total de la oferta que eligió). Con el formulario activo, el resumen incluye también sus datos de entrega y el pedido queda guardado en la pestaña Pedidos.', `${f('pedidoWa.activo', 'Pedir por WhatsApp (el botón dice «Pedir por WhatsApp»)', { check: 1 })}${f('pedidoWa.directo', 'Sin formulario: el botón abre WhatsApp directo con el resumen de la oferta elegida', { check: 1, hint: 'Desmárcalo si quieres que antes llenen el formulario con sus datos.' })}<div class="row">${f('pedidoWa.numero', 'Número de WhatsApp', { hint: 'Con código de país (51970189535). Si escribes 9 dígitos, se agrega el 51.' })}${f('pedidoWa.mensaje', 'Primera línea del mensaje')}</div>`) +
        card('Pedido contraentrega', 'La ventana de pedido ya trae: cantidad (1 o 2), nombre, apellido, teléfono, departamento (los 24 de Perú más el Callao), municipio, dirección completa, punto de referencia, resumen y total. El precio se recalcula en el servidor con tu configuración publicada y el pedido llega a la pestaña Pedidos.', '');
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
        ${GUIA_SW}<div class="tn-fr"><iframe id="tnFr" style="width:${anchoPrev}px;max-width:100%" title="Vista previa" sandbox="allow-scripts allow-same-origin"></iframe></div>`);
    },
  };


  // Actualiza la vista previa SIN recargar el documento: si la cabecera (estilos, fuentes, metadatos) es igual, solo se cambia el contenido;
  // así no se vuelven a pedir fuentes ni a decodificar imágenes y se mantiene el scroll.
  const cabeza = h => { const m = /<head>([\s\S]*?)<\/head>/.exec(h); return m ? m[1] : ''; };
  function parchear(fr, html, alCargar) {
    const d = fr.contentDocument;
    if (!d || !d.body || !fr._cab || cabeza(html) !== fr._cab) { fr._cab = cabeza(html); fr.onload = alCargar || null; fr.srcdoc = html; return; }
    const nd = new DOMParser().parseFromString(html, 'text/html'), w = fr.contentWindow, y = w.scrollY;
    d.body.textContent = '';
    nd.body.childNodes.forEach(n => d.body.appendChild(d.importNode(n, true)));
    d.body.querySelectorAll('script').forEach(o => { const n = d.createElement('script'); [...o.attributes].forEach(a => n.setAttribute(a.name, a.value)); n.textContent = o.textContent; o.replaceWith(n); });
    w.scrollTo(0, y);
  }


  // Vista previa de la Página principal (celular); se actualiza sin recargar y conserva el scroll
  let scrollHome = 0, htmlHome = '', tmrHome = 0;
  const pintarHomeYa = () => {
    clearTimeout(tmrHome);
    const fr = document.getElementById('tnFrH'), d = document.querySelector('[data-sec=previaHome]');
    if (!fr || !d || !d.open) return;
    const t = T(), html = R().renderizar(t, '', { base: '', preview: true, slugTienda: t.slug }).html;
    if (html === htmlHome && fr._cab) return;
    htmlHome = html;
    const alCargar = () => { try { const w = fr.contentWindow; w.scrollTo(0, scrollHome); w.addEventListener('scroll', () => { scrollHome = w.scrollY; }, { passive: true }); fr.contentDocument.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a && /^\//.test(a.getAttribute('href'))) e.preventDefault(); }); } catch (x) {} };
    parchear(fr, html, alCargar);
  };
  const pintarHome = (ya = true) => { if (ya) { pintarHomeYa(); return; } clearTimeout(tmrHome); tmrHome = setTimeout(pintarHomeYa, 500); };
  const fonoHome = () => sec('previaHome', '📱 Vista previa de la página principal', 'Así se ve el inicio · toca una parte para editarla', `${GUIA_SW}<div class="tn-phone"><div class="tn-notch"></div><iframe id="tnFrH" title="Vista previa de la página principal" sandbox="allow-scripts allow-same-origin"></iframe></div>`);

  function pintarPrevia() {
    const fr = document.getElementById('tnFr'); if (!fr) return;
    const t = T(), ok = !pagPrev || R().activos(t).some(p => p.slug === pagPrev);
    const alCargar = () => { try { fr.contentDocument.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (!a) return; const h = a.getAttribute('href'); if (!/^\//.test(h)) return; e.preventDefault(); pagPrev = h === '/' || h === '' ? '' : h.replace(/^\/+/, ''); const pg = document.getElementById('tnPg'); if (pg) pg.value = pagPrev; pintarPrevia(); }); } catch (x) {} };
    parchear(fr, R().renderizar(t, ok ? pagPrev : '', { base: '', preview: true, slugTienda: t.slug }).html, alCargar);
    fr.style.height = Math.round(innerHeight * 0.75) + 'px';
  }


  // Vista previa en celular del producto que se está editando (se repinta con cada cambio y conserva el scroll)
  let scrollCel = 0, slugCel = '';
  let htmlCel = '', tmrCel = 0;
  const pintarCelularYa = () => {
    clearTimeout(tmrCel);
    const fr = document.getElementById('tnFrP'), d = document.querySelector('[data-sec=previa]');
    if (!fr || !d || !d.open) return;
    const t = T(), p = (t.productos || [])[pi];
    if (!p) return;
    if (p.slug !== slugCel) { scrollCel = 0; slugCel = p.slug; htmlCel = ''; }
    let html;
    if (!R().slugOk(p.slug)) html = '<body style="font-family:system-ui;padding:30px;text-align:center">La dirección (slug) no es válida: usa minúsculas, números y guiones.</body>';
    else {
      const t2 = Object.assign({}, t, { productos: t.productos.map((q, i) => (i === pi ? Object.assign({}, q, { activo: true }) : q)) });
      html = R().renderizar(t2, p.slug, { base: '', preview: true, slugTienda: t.slug }).html;
    }
    if (html === htmlCel && fr._cab) return; // nada cambió: no se recarga el celular
    htmlCel = html;
    const alCargar = () => { try { const w = fr.contentWindow; w.scrollTo(0, scrollCel); w.addEventListener('scroll', () => { scrollCel = w.scrollY; }, { passive: true }); fr.contentDocument.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a && /^\//.test(a.getAttribute('href'))) e.preventDefault(); }); } catch (x) {} };
    parchear(fr, html, alCargar);
  };
  // pintar: de inmediato al abrir; con una pequeña pausa mientras se escribe
  const pintarCelular = (ya = true) => { if (ya) { pintarCelularYa(); return; } clearTimeout(tmrCel); tmrCel = setTimeout(pintarCelularYa, 500); };

  // Guía de toque: desde la vista previa se salta a la sección y al campo que controla esa parte
  function enfocar(path) {
    let el = document.querySelector('[data-p="' + path + '"]');
    if (!el) { const m = path.match(/^(productos\.\d+\.[a-zA-Z0-9]+)/); if (m) el = document.querySelector('[data-p^="' + m[1] + '"]'); }
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { el.focus({ preventScroll: true }); } catch (e) {}
    const caja = el.closest('.field, .tn-item') || el; caja.classList.add('tn-flash'); setTimeout(() => caja.classList.remove('tn-flash'), 1700);
  }
  function ir(spec) {
    const [k, sec, campo] = String(spec).split(':');
    if (k === 'v') { const i = T().productos.findIndex(q => q.slug === sec); if (i >= 0) { pi = i; irTab('productos'); } return; }
    if (k === 'g') { irTab(sec); setTimeout(() => enfocar(campo), 120); return; }
    if (tab === 'previa') { const i = T().productos.findIndex(q => q.slug === pagPrev); if (i >= 0) pi = i; abiertas.add(sec); irTab('productos'); setTimeout(() => enfocar('productos.' + pi + '.' + campo), 140); return; }
    abiertas.add(sec);
    const d = document.querySelector('[data-sec="' + sec + '"]');
    if (d && !d.open) d.open = true;
    setTimeout(() => enfocar('productos.' + pi + '.' + campo), 60);
  }
  function guia(on) {
    window.__tnGuia = on;
    document.querySelectorAll('iframe').forEach(f => { try { f.contentDocument.documentElement.classList.toggle('guia', on); } catch (e) {} });
  }

  // ───────── Guardado automático ─────────
  // Cada cambio ya se guarda solo en tu cuenta. Con el interruptor activo, además se publica en la tienda real unos segundos después de dejar de editar.
  let sucio = false, publicando = false, errPub = '', ultimaPub = '', tmrAuto = 0;
  const estadoTxt = () => publicando ? '⏳ Publicando…' : errPub ? '⚠ ' + errPub : sucio ? (T().autoPublicar ? '● Guardado · publicando en unos segundos…' : '● Guardado en tu cuenta · sin publicar en la tienda') : ultimaPub ? '✓ Publicado a las ' + ultimaPub : '✓ Todo guardado';
  const pintarEstado = () => { const e = document.getElementById('tnSt'); if (e) { e.textContent = estadoTxt(); e.dataset.e = publicando ? 'p' : errPub ? 'e' : sucio ? 's' : 'ok'; } };
  function cambio() {
    if (publicando) return;
    sucio = true; errPub = ''; pintarEstado();
    clearTimeout(tmrAuto);
    if (T().autoPublicar) tmrAuto = setTimeout(() => publicar(true), 2500);
  }


  // ───────── Importar una landing desde una URL ─────────
  // Primero se elige el diseño (tarjetas) y luego se revisa lo encontrado antes de agregarlo.
  function importarLanding() {
    const f = $('#dlgForm'), d = $('#dlg');
    let res = null, modo = 'producto';
    const rellenables = (T().productos || []).map((q, i) => [q, i]).filter(([q]) => (q.tipo || 'producto') === 'producto');
    f.innerHTML = `<h2>Importar landing desde una URL</h2>
      <div class="field"><label>Dirección de la página (URL)</label><input id="imU" type="url" inputmode="url" placeholder="https://www.tutienda.com/producto" autocomplete="off"></div>
      <div id="imPaso1"><label style="margin-top:4px">¿A qué diseño quieres importarla?</label>
      <div class="tn-tipos" id="imDis">
        <button type="button" class="sel" data-md="producto"><b>Producto completo</b><span>Como «Collar de las Emociones»: fotos, ofertas de 1 y 2 unidades, garantía, contenido y preguntas.</span></button>
        <button type="button" data-md="landing"><b>Landing simple</b><span>Título, imagen y botón de pedir por WhatsApp, uno tras otro.</span></button>
        <button type="button" data-md="codigo"><b>Copia exacta de la página</b><span>Copia el diseño tal cual está (en código).</span></button>
        <button type="button" data-md="rellenar" ${rellenables.length ? '' : 'disabled style="opacity:.45"'}><b>Rellenar un producto que ya tengo</b><span>${rellenables.length ? 'Conserva su diseño (por ejemplo, una copia de la plantilla) y cambia solo el contenido.' : 'Aún no tienes un producto de tipo Producto para rellenar.'}</span></button>
      </div>
      <div class="field" id="imDest" style="display:none"><label>¿Cuál producto?</label><select id="imD" style="width:100%">${rellenables.map(([q, i]) => `<option value="${i}">${esc(q.nombre)}</option>`).join('')}</select></div></div>
      <div class="note" id="imMsg" style="min-height:18px"></div><div id="imRes"></div>
      <div class="dlg-foot"><button type="button" class="btn" id="imNo">Cancelar</button><button type="button" class="btn btn-pri" id="imGo">Analizar página</button></div>`;
    f.onsubmit = e => e.preventDefault();
    const msg = t => { $('#imMsg').textContent = t; };
    $('#imNo').onclick = () => d.close();
    const go = $('#imGo');
    f.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { if (b.disabled || res) return; modo = b.dataset.md; f.querySelectorAll('[data-md]').forEach(x => x.classList.toggle('sel', x === b)); $('#imDest').style.display = modo === 'rellenar' ? '' : 'none'; });
    const unico = nom => { const b = slugify(nom) || 'producto', usados = (T().productos || []).map(q => q.slug); let sl = b, i = 2; while (usados.includes(sl)) sl = b + '-' + i++; return sl; };
    go.onclick = async () => {
      if (res) return agregar();
      const u = $('#imU').value.trim();
      if (!u) return msg('Escribe la dirección de la página.');
      go.disabled = true; go.textContent = 'Analizando…'; msg('Leyendo la página, puede tardar unos segundos…');
      try {
        const tk = window.Nube && (await Nube.token());
        if (!tk) throw new Error('Inicia sesión para importar.');
        const r = await fetch('/api/importar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ url: u, copia: modo === 'codigo' }) });
        const j = await r.json().catch(() => ({}));
        if (!j.ok) throw new Error(j.error || 'No se pudo importar esa página.');
        res = j;
        const poco = !j.contenido.length && modo !== 'codigo';
        const dest = modo === 'rellenar' ? (T().productos[+$('#imD').value] || {}).nombre : '';
        $('#imPaso1').style.display = 'none'; $('#imU').readOnly = true;
        $('#imRes').innerHTML = `<div class="tn-calc" style="margin:4px 0 10px"><span>✓ <b>${esc(j.titulo || 'Sin título')}</b></span><span>${j.imagenes.length} foto(s) · ${j.contenido.length} elemento(s) de contenido · ${j.faq.length} pregunta(s)${j.precio ? ' · precio detectado: ' + esc(j.precio) + ' ' + esc(j.moneda || '') : ''}</span><span>Diseño elegido: <b>${{ producto: 'Producto completo', landing: 'Landing simple', codigo: 'Copia exacta de la página', rellenar: 'Rellenar «' + esc(dest) + '»' }[modo]}</b></span>${poco ? '<span style="color:var(--warn)">Esta página trae poco contenido legible; prueba «Copia exacta de la página».</span>' : ''}</div>
          ${modo === 'rellenar' ? `<div class="tn-calc" style="margin-bottom:10px"><b style="font-size:12px">Qué se reemplaza en ese producto</b><label class="chk"><input type="checkbox" id="imQf" checked> Fotos</label><label class="chk"><input type="checkbox" id="imQc" checked> Contenido (títulos, textos e imágenes)</label><label class="chk"><input type="checkbox" id="imQp" checked> Preguntas frecuentes</label><label class="chk"><input type="checkbox" id="imQt" checked> Nombre, título y frase</label></div>` : ''}
          <div class="field"><label>Nombre del producto</label><input id="imN" type="text" value="${esc((j.titulo || '').slice(0, 80))}"></div>
          <div class="row"><div class="field"><label>Precio de 1 unidad (en soles)</label><input id="imP" type="number" step="any" inputmode="decimal" value="${j.precio && /^(PEN|S\/)?$/.test(j.moneda || '') ? j.precio : ''}" placeholder="0"></div><div class="field"><label>Precio de 2 unidades (opcional)</label><input id="imP2" type="number" step="any" inputmode="decimal" placeholder="0"></div></div>
          <div class="note">Las fotos se enlazan desde la página original; si es tuya, luego puedes subirlas a tu almacén. Los precios de otra moneda no se convierten: ponlos tú en soles.</div>`;
        msg(''); go.disabled = false; go.textContent = modo === 'rellenar' ? 'Rellenar ese producto' : 'Agregar a mis productos';
      } catch (e) { msg(e.message); go.disabled = false; go.textContent = 'Analizar página'; }
    };
    function agregar() {
      const nom = ($('#imN').value || '').trim() || res.titulo || 'Producto importado', pr = num($('#imP').value), p2 = num($('#imP2').value);
      const cont = res.contenido.map(x => (x.tipo === 'imagen' ? { tipo: 'imagen', img: x.img } : { tipo: x.tipo, x: x.x }));
      const marca = { importadoDe: res.url, creado: new Date().toISOString(), nuevo: false };
      if (modo === 'rellenar') {
        const q = T().productos[+$('#imD').value];
        if (!q) return;
        if ($('#imQf').checked && res.imagenes.length) q.imagenes = res.imagenes.slice(0, 10);
        if ($('#imQc').checked) { q.contenido = cont; delete q.bloques; }
        if ($('#imQp').checked && res.faq.length) { q.faq = res.faq; q.mostrar = Object.assign({}, q.mostrar, { faqGeneral: false }); }
        if ($('#imQt').checked) { q.nombre = nom; q.titulo = nom; if (res.descripcion) q.kicker = res.descripcion.slice(0, 80); }
        if (pr > 0) q.precio = pr;
        if (p2 > 0) q.combo2 = p2;
        q.importadoDe = res.url;
        pi = +$('#imD').value; tab = 'productos'; Store.save(); d.close(); render(); scrollTo(0, 0); toast('Contenido importado en «' + q.nombre + '»: se conservó su diseño');
        return;
      }
      let base;
      if (modo === 'codigo') {
        base = Object.assign(nuevoProducto('codigo'), marca, { html: (res.copia || {}).html || '', css: (res.copia || {}).css || '', js: '', codigoPuro: true, imagenes: res.imagenes.slice(0, 1) });
      } else if (modo === 'landing') {
        const sec = [], boton = () => ({ tipo: 'boton', x: 'Pedir por WhatsApp', accion: 'whatsapp', wa: '', msg: '' });
        sec.push({ tipo: 'titulo', x: nom });
        if (res.imagenes[0]) sec.push({ tipo: 'imagen', img: res.imagenes[0] });
        sec.push(boton());
        let n = 0;
        cont.forEach(c => { sec.push(c); if (++n % 4 === 0) sec.push(boton()); });
        if (sec[sec.length - 1].tipo !== 'boton') sec.push(boton());
        base = Object.assign(nuevoProducto('landing'), marca, { secciones: sec, imagenes: res.imagenes.slice(0, 1) });
      } else {
        // Producto completo: el diseño de «Collar de las Emociones» (ofertas, aviso, garantía, estructura) con el contenido de la página
        base = Object.assign(crearDePlantilla('collar', T().productos), marca, { etiqueta: '', barra: [], cta: 'Quiero el mío', garantiaTitulo: '', garantiaTexto: '', categoria: '', resenasLista: [], rating: 0, resenas: 0, vendidos: 0, imagenes: res.imagenes.slice(0, 10), contenido: cont, faq: res.faq, kicker: (res.descripcion || '').slice(0, 80), mostrar: { faqGeneral: !res.faq.length } });
      }
      Object.assign(base, { slug: unico(nom), nombre: nom, titulo: nom, precio: pr, combo2: p2, tachado: 0 });
      T().productos.push(base); pi = T().productos.length - 1; tab = 'productos'; Store.save(); d.close(); render(); scrollTo(0, 0); toast('Landing importada: revísala y ajusta el precio');
    }
    d.showModal();
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
    clearTimeout(tmrAuto);
    const t = T();
    t.dominios = (t.dominios || []).map(d => d.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()).filter(Boolean);
    const falla = m => { errPub = m; msg(m); pintarEstado(); };
    if (!R().slugOk(t.slug)) return falla('La dirección de prueba no es válida (usa minúsculas, números y guiones).');
    const malos = (t.productos || []).filter(p => !R().slugOk(p.slug)).map(p => p.nombre);
    if (malos.length) return falla('Revisa la dirección (slug) de: ' + malos.join(', '));
    const dup = (t.productos || []).map(p => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
    if (dup.length) return falla('Hay productos con la misma dirección: ' + [...new Set(dup)].join(', '));
    msg('Publicando…'); publicando = true; errPub = ''; pintarEstado();
    try {
      await sb('tiendas?on_conflict=slug', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ slug: t.slug, dominios: t.dominios, config: t, publicada, actualizado: new Date().toISOString() }) });
      Store.save();
      sucio = false; ultimaPub = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      msg(publicada ? 'Publicada ✓ ' + new Date().toLocaleTimeString() + '. Puede tardar hasta 1 minuto en verse en el dominio.' : 'Tienda despublicada.');
    } catch (e) { errPub = 'No se pudo publicar: ' + e.message + (/relation|does not exist|schema cache/i.test(e.message) ? ' — ejecuta supabase/tienda.sql en Supabase.' : ''); msg(errPub); }
    publicando = false; pintarEstado();
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
  function vista(el, zona) {
    const t = asegurar();
    if (zona) { zonaVista = zona; if (grupoDe(tab) !== zona) tab = INICIO[zona]; }
    if (!R()) { el.innerHTML = secH('tienda', 'Landing / Tienda', 'No se cargó el motor de la tienda.'); return; }
    if (tab === 'productos' && !(t.productos || [])[pi]) tab = 'lista';
    const g = grupoDe(tab), tabs = g === 'home' ? TABS_HOME : g === 'ajustes' ? TABS_AJ : null;
    el.innerHTML = `${secH('tienda', TITULOS[g][0], TITULOS[g][1])}
      ${tabs ? `<div class="tn-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="tn-save"><span id="tnSt" data-e="ok">${esc(estadoTxt())}</span><label class="chk tn-auto"><input type="checkbox" id="tnAuto" ${t.autoPublicar ? 'checked' : ''}> Guardado automático</label></div>
      <div class="tn-body">${pantalla[tab](t)}</div>`;
    if (tab === 'previa') pintarPrevia();
    if (tab === 'productos') pintarCelular();
    if (g === 'home') pintarHome();
    if (tab === 'pedidos' && lista === null) cargarPedidos();
    enlazar(el);
  }


  function enlazar(el) {
    const q = s => el.querySelector(s), on = (s, fn) => { const b = q(s); if (b) b.onclick = fn; };
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; if (tab === 'pedidos') lista = null; render(); scrollTo(0, 0); });
    let tmr;
    // Solo se reconstruye el panel cuando el cambio altera otras partes (precio, tipo, fotos, nombre…); el resto solo actualiza el celular
    const ESTRUCT = /(^|\.)(tipo|accion|nombre|slug|activo|precio|tachado|combo2|imagenes(\.\d+)?|img)$/;
    const valor = i => { const k = i.dataset.k; return k === 'check' ? i.checked : k === 'num' ? num(i.value) : KIND[k] ? KIND[k].inn(i.value) : i.value; };
    el.querySelectorAll('[data-p]').forEach(i => {
      if (i.tagName === 'INPUT' && i.type === 'text' || i.tagName === 'TEXTAREA') i.oninput = () => { const k = i.dataset.k; if (k || /(^|\.)slug$/.test(i.dataset.p)) return; setP(T(), i.dataset.p, i.value); if (tab === 'productos') pintarCelular(false); else if (grupoDe(tab) === 'home') pintarHome(false); };
      i.onchange = () => {
        const t = T();
        if (/(^|\.)slug$/.test(i.dataset.p)) { i.value = slugify(i.value) || 'producto'; setP(t, i.dataset.p, i.value); }
        else setP(t, i.dataset.p, valor(i));
        Store.save();
        if (ESTRUCT.test(i.dataset.p)) render();
        else if (tab === 'productos') pintarCelular(false);
        else if (grupoDe(tab) === 'home') pintarHome(false);
      };
    });
    el.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { T().diseno.acento = b.dataset.sw; Store.save(); render(); toast('Color de acento: ' + b.dataset.sw); });
    el.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { Object.assign(T().diseno, R().PRESETS[b.dataset.pre], { preset: b.dataset.pre }); Store.save(); render(); toast('Estilo aplicado'); });
    on('#tnPub', () => publicar(true)); on('#tnPub2', () => publicar(true)); on('#tnDes', () => publicar(false));
    const sel = q('#tnSel'); if (sel) sel.onchange = () => { ti = +sel.value; pi = 0; lista = null; render(); };
    on('#tnDup', () => { const c = clon(T()); c.nombre += ' (copia)'; c.slug = slugify(c.slug + '-copia'); c.dominios = []; S.tiendas.push(c); ti = S.tiendas.length - 1; pi = 0; Store.save(); render(); toast('Tienda duplicada. Cambia su dirección y dominios.'); });
    on('#tnDel', () => { if (S.tiendas.length < 2) return toast('Debe quedar al menos una tienda'); ask('Se elimina «' + T().nombre + '» de DROPOX (la publicada sigue en línea hasta despublicarla). ¿Continuar?', () => { S.tiendasBorradas = [...(S.tiendasBorradas || []), T().slug]; S.tiendas.splice(ti, 1); ti = 0; pi = 0; Store.save(); render(); }, 'Eliminar'); });
    on('#tnExp', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(T(), null, 1)], { type: 'application/json' })); a.download = 'tienda-' + T().slug + '.json'; a.click(); });
    on('#tnImp', () => q('#tnImpF').click());
    const imp = q('#tnImpF'); if (imp) imp.onchange = () => { const fl = imp.files[0]; if (!fl) return; fl.text().then(x => { try { const c = JSON.parse(x); if (!c.productos || !c.marca) throw 0; c.slug = slugify(c.slug || c.nombre) || 'tienda'; S.tiendas.push(c); ti = S.tiendas.length - 1; pi = 0; Store.save(); render(); toast('Tienda importada'); } catch (e) { toast('Archivo no válido'); } }); };
    el.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.sec) { d.open ? abiertas.add(d.dataset.sec) : abiertas.delete(d.dataset.sec); if (d.dataset.sec === 'previa') { const fr = document.getElementById('tnFrP'); if (fr && d.open && !fr.srcdoc) pintarCelular(); } if (d.dataset.sec === 'previaHome') { const fh = document.getElementById('tnFrH'); if (fh && d.open && !fh.srcdoc) pintarHome(); } } }, true);
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
    el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => elegirFoto(b.dataset.up, b.dataset.upmodo));
    el.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copiar(b.dataset.copy));
    // «Ver producto» y «Abrir tienda»: si hay cambios sin publicar, se publican primero y luego se abre el enlace
    el.querySelectorAll('.tn-url a.btn, a.tn-abrir, a.tn-ver').forEach(b => b.onclick = async e => {
      if (!sucio && !publicando) return;
      e.preventDefault();
      const w = window.open('about:blank', '_blank');
      toast('Publicando antes de abrir…');
      if (publicando) { for (let i = 0; i < 40 && publicando; i++) await new Promise(r => setTimeout(r, 250)); } else await publicar(true);
      if (errPub) { if (w) w.close(); return toast(errPub); }
      if (w) w.location = b.href; else location.href = b.href;
    });
    const au = q('#tnAuto'); if (au) au.onchange = () => { T().autoPublicar = au.checked; Store.save(); if (au.checked) { sucio = true; clearTimeout(tmrAuto); tmrAuto = setTimeout(() => publicar(true), 600); toast('Guardado automático activado: tus cambios se publican solos'); } else toast('Guardado automático apagado: publica con el botón'); pintarEstado(); };
    on('#tnCelRef', pintarCelular);
    const gs = q('#tnGuia'); if (gs) gs.onchange = () => guia(gs.checked);
    on('#tnVer', () => { pagPrev = (T().productos[pi] || {}).slug || ''; irTab('previa'); });
    const ps = q('#tnProd'); if (ps) ps.onchange = () => { pi = +ps.value; render(); };
    const arr = () => T().productos;

    on('#tnRecup', async () => {
      const m = q('#tnRecMsg'), say = x => { if (m) m.innerHTML = x; }, n = () => (T().productos || []).length;
      const cnt = o => o && Array.isArray(o.tiendas) ? ((o.tiendas.find(x => x.slug === T().slug) || {}).productos || []).length : 0;
      say('Buscando en todas las copias…');
      const f = [`Este dispositivo: <b>${n()}</b>`];
      const bk = await Resp.leer(); f.push(`Respaldo del navegador: <b>${cnt(bk)}</b>`); if (bk) fusionar(S, bk);
      try { const r = await Nube.leerNube(); if (r.error) f.push('Nube: error (' + esc(r.error) + ')'); else { f.push(`Nube: <b>${cnt(r.contenido)}</b>`); if (r.contenido) fusionar(S, r.contenido); } } catch (e) { f.push('Nube: error (' + esc(e.message) + ')'); }
      try { const r = await sb('tiendas?select=config&slug=eq.' + encodeURIComponent(T().slug)); const c = r && r[0] && r[0].config; f.push(`Publicada: <b>${c ? (c.productos || []).length : 0}</b>`); if (c) fusionar(S, { tiendas: [c] }); } catch (e) { f.push('Publicada: error (' + esc(e.message) + ')'); }
      Store.save();
      let err = ''; try { err = window.Nube && Nube.subirYa ? await Nube.subirYa() : ''; } catch (e) { err = e.message; }
      say(f.join(' · ') + `<br>Ahora tienes <b>${n()}</b> productos. ` + (err ? '⚠ No se pudo guardar en la nube: ' + esc(err) : '✓ Guardado en tu cuenta.'));
      render(); const m2 = q('#tnRecMsg'); if (m2) m2.innerHTML = f.join(' · ') + `<br>Ahora tienes <b>${n()}</b> productos. ` + (err ? '⚠ No se pudo guardar en la nube: ' + esc(err) : '✓ Guardado en tu cuenta.');
    });
    on('#tnPNew', () => elegirTipo(tp => { arr().push(tp.startsWith('plantilla-') ? desdePlantilla(tp.slice(10)) : nuevoProducto(tp)); pi = arr().length - 1; tab = 'productos'; abiertas.add('basico'); Store.save(); render(); scrollTo(0, 0); }));
    on('#tnPDup', () => { const c = clon(arr()[pi]), base = c.slug.replace(/-\d+$/, ''), usados = arr().map(z => z.slug); let n = 2; while (usados.includes(base + '-' + n)) n++; c.slug = base + '-' + n; c.nombre += ' (copia)'; c.creado = new Date().toISOString(); delete c._rs; arr().splice(pi + 1, 0, c); pi++; Store.save(); render(); toast('Producto duplicado'); });
    on('#tnImpUrl', importarLanding);
    on('#tnBack', () => { tab = 'lista'; render(); scrollTo(0, 0); });
    el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { pi = +b.dataset.edit; tab = 'productos'; render(); scrollTo(0, 0); });
    el.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => { const i = +b.dataset.dup, c = clon(arr()[i]), base = c.slug.replace(/-\d+$/, ''), usados = arr().map(z => z.slug); let n = 2; while (usados.includes(base + '-' + n)) n++; c.slug = base + '-' + n; c.nombre += ' (copia)'; c.creado = new Date().toISOString(); delete c._rs; arr().splice(i + 1, 0, c); Store.save(); render(); toast('Producto duplicado'); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const i = +b.dataset.del, q = arr()[i]; if (q) ask('¿Eliminar «' + q.nombre + '»? Esta acción no se puede deshacer.', () => { borrar(T(), q); arr().splice(i, 1); Store.save(); render(); toast('Producto eliminado'); }, 'Eliminar'); });
    el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const [i, d] = b.dataset.mv.split(':').map(Number), j = i + d; if (j < 0 || j >= arr().length) return; [arr()[i], arr()[j]] = [arr()[j], arr()[i]]; Store.save(); render(); });
    on('#tnPDn', () => { if (pi < arr().length - 1) { [arr()[pi + 1], arr()[pi]] = [arr()[pi], arr()[pi + 1]]; pi++; Store.save(); render(); } });
    on('#tnPZero', () => ask('Se borran TODOS los productos de «' + T().nombre + '» (' + arr().length + '). La tienda publicada no cambia hasta que pulses Publicar. ¿Dejar todo en cero?', () => { arr().forEach(z => borrar(T(), z)); T().productos = []; pi = 0; Store.save(); render(); toast('Productos en cero'); }, 'Borrar todos'));
    on('#tnPDel', () => { const p = arr()[pi]; if (p) ask('¿Eliminar «' + p.nombre + '»? Esta acción no se puede deshacer.', () => { borrar(T(), p); arr().splice(pi, 1); pi = 0; tab = 'lista'; Store.save(); render(); scrollTo(0, 0); toast('Producto eliminado'); }, 'Eliminar'); });
    on('#tnRef', () => { lista = null; render(); });
    el.querySelectorAll('[data-pasar]').forEach(b => b.onclick = () => pasar(b.dataset.pasar));
    const pg = q('#tnPg'); if (pg) pg.onchange = () => { pagPrev = pg.value; pintarPrevia(); };
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { anchoPrev = +b.dataset.w; render(); });
  }

  // Subsecciones del menú: cada producto creado queda listado debajo de «Landing / Tienda»
  const fechaCorta = iso => { try { return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  ['marca', 'portada', 'textos'].forEach(k => { const o = pantalla[k]; pantalla[k] = t => fonoHome() + o(t); });
  // Tocar «Mis productos» en el menú siempre lleva a la lista (aunque estés editando uno)
  const mt = document.getElementById('tabs'); if (mt) mt.addEventListener('click', e => { const l = e.target.closest && e.target.closest('a[data-v="tiendaprod"]'); if (l) tab = 'lista'; });
  if (!Store.__tn) { const o = Store.save; Store.save = function () { const r = o.apply(this, arguments); try { Resp.guardar(); } catch (e) {} try { if (/^#tienda/.test(location.hash) && !publicando) cambio(); } catch (e) {} return r; }; Store.__tn = true; }
  window.Tienda = { vista, ir, guia, fusionar };
})();
