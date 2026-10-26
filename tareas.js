'use strict';
/* DROPOX — Tareas diarias: agenda del día para dos personas (e-commerce con Facebook y TikTok), lista de lo que falta, plan de aprendizaje y registro del día. */
(() => {
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const REP = { diario: 'Todos los días', lv: 'Lunes a viernes', ls: 'Lunes a sábado', d1: 'Solo lunes', d2: 'Solo martes', d3: 'Solo miércoles', d4: 'Solo jueves', d5: 'Solo viernes', d6: 'Solo sábado', d0: 'Solo domingo', una: 'Una sola vez (en la fecha)' };
  const CATS = ['Organización', 'Atención al cliente', 'Pedidos y envíos', 'Imágenes', 'Video', 'Contenido y textos', 'Publicar', 'Publicidad', 'Comunidad', 'Investigación', 'Aprender', 'Finanzas', 'Cierre'];
  const rep_ok = (r, dow, fecha, f) => (r === 'diario' || (r === 'lv' && dow >= 1 && dow <= 5) || (r === 'ls' && dow >= 1 && dow <= 6) || r === 'd' + dow || (r === 'una' && fecha === f));

  // p: 0 = persona 1, 1 = persona 2, 2 = ambos
  const T = (h, d, p, c, t, n, r = 'diario') => ({ h, d, p, c, t, n, r });
  const PLANTILLA = [
    T('08:00', 15, 2, 'Organización', 'Reunión corta: metas del día', 'Cada uno dice qué hará hoy. Revisen pedidos pendientes, qué se publica hoy y qué falta de ayer.'),
    T('08:15', 45, 0, 'Atención al cliente', 'Responder WhatsApp, Messenger e Instagram', 'Responde a todos los mensajes nuevos. Usa respuestas rápidas y etiqueta cada chat (nuevo, interesado, pedido, pagado). Meta: responder en menos de 15 minutos.'),
    T('08:15', 45, 1, 'Pedidos y envíos', 'Revisar pedidos de ayer y seguimiento de envíos', 'Confirma cada pedido (nombre, teléfono, dirección y referencia), despacha lo confirmado y pregunta por los envíos que van en camino.'),
    T('09:00', 90, 0, 'Imágenes', 'Crear 3 imágenes del producto', 'En Canva: foto del producto, beneficio principal, precio u oferta y botón «Escríbenos». Formatos 1:1 para el feed y 9:16 para historias.'),
    T('09:00', 90, 1, 'Video', 'Grabar 2 o 3 videos cortos (15 a 30 segundos)', 'Ideas: mostrar el producto en uso, antes y después, desempaque, 3 razones para comprarlo. Graba vertical, con buena luz y el producto en los primeros 3 segundos.'),
    T('10:30', 60, 0, 'Contenido y textos', 'Escribir textos y hashtags del día', 'Un gancho fuerte en la primera línea, el beneficio, la oferta y a dónde escribir. Prepara también el texto de los videos.'),
    T('10:30', 60, 1, 'Video', 'Editar los videos', 'En CapCut: cortar silencios, subtítulos, música sin derechos de autor, formato 9:16, portada clara.'),
    T('11:30', 30, 2, 'Publicar', 'Publicar en Facebook y TikTok', 'Una publicación y un reel en Facebook; un video en TikTok. Revisa que el enlace o el botón de WhatsApp funcione.'),
    T('12:00', 60, 2, 'Organización', 'Almuerzo y descanso', 'Desconéctense una hora. Se rinde más en la tarde.'),
    T('13:00', 45, 0, 'Publicidad', 'Revisar los anuncios de Meta', 'Mira gasto, mensajes recibidos y costo por mensaje. No toques los anuncios con menos de 3 días. Pausa lo que gasta mucho y no trae mensajes. Usa la sección Meta Ads.'),
    T('13:00', 45, 1, 'Comunidad', 'Responder comentarios y mensajes de TikTok y Facebook', 'Responde cada comentario y pasa a los interesados a WhatsApp. Interactúa con 10 cuentas de tu nicho.'),
    T('14:00', 60, 0, 'Investigación', 'Investigar competencia y videos virales', 'Mira 5 anuncios de la competencia y 5 videos virales del nicho. Guarda ideas en Investigación de mercado.'),
    T('14:00', 45, 1, 'Aprender', 'Aprender algo nuevo (45 minutos)', 'Sigue el tema del día en la pestaña Aprender y escribe 3 cosas que aplicarás mañana.'),
    T('15:00', 45, 2, 'Pedidos y envíos', 'Seguimiento a clientes con pedido pendiente', 'Escribe a los que dijeron «lo pienso», confirma entregas y avisa a quienes recibirán su pedido hoy.'),
    T('16:00', 30, 0, 'Finanzas', 'Anotar gastos del día y pedidos en la plataforma', 'Registra en Gastos diarios lo gastado hoy y actualiza los pedidos entregados o devueltos.'),
    T('16:00', 60, 1, 'Contenido y textos', 'Preparar el contenido de mañana', 'Guion y lista de tomas de los próximos videos; deja las imágenes casi listas.'),
    T('17:00', 20, 2, 'Cierre', 'Cierre del día', 'Anoten en el Registro del día: videos, imágenes, mensajes y pedidos. Qué salió bien, qué falló y qué se hace mañana.'),
    T('09:00', 60, 2, 'Organización', 'Planificar el contenido de la semana', 'Calendario de 7 días: qué imagen, qué video y qué oferta cada día. Anoten ideas nuevas.', 'd1'),
    T('15:30', 60, 2, 'Publicidad', 'Probar un anuncio o creativo nuevo', 'Cambia una sola cosa a la vez (imagen, texto o público). Sube el nuevo en una campaña de bajo presupuesto.', 'd3'),
    T('16:30', 45, 2, 'Finanzas', 'Revisión semanal de números', 'Pedidos entregados y devueltos, gasto en publicidad, utilidad real de la semana (Dashboard y Calculadora). Ajusten precios u ofertas.', 'd5'),
    T('10:00', 90, 2, 'Aprender', 'Bloque de estudio y revisión', 'Repasen lo aprendido en la semana y anoten dudas. Media jornada, el resto es descanso.', 'd6'),
  ];

  // Lo que falta: lista de verificación para empezar un e-commerce con contra entrega
  const FALTA = [
    ['Producto y negocio', [
      ['n1', 'Calcular el precio y el margen real del producto en la Calculadora (con fletes, devoluciones y publicidad)', 'alta'],
      ['n2', 'Confirmar stock, tiempo de entrega y que el proveedor responda rápido', 'alta'],
      ['n3', 'Definir la oferta: combo, 2x1 o regalo para vender más por pedido', 'media'],
      ['n4', 'Escribir política de cambios y devoluciones (simple, en 5 líneas)', 'media'],
      ['n5', 'Elegir transportadora y probar un envío real de principio a fin', 'alta'],
      ['n6', 'Consultar con un contador qué régimen tributario te toca (RUC)', 'media'],
    ]],
    ['Perfiles de Facebook y TikTok', [
      ['p1', 'Página de Facebook completa: foto, portada, descripción, horario y botón de WhatsApp', 'alta'],
      ['p2', 'TikTok con foto, biografía clara y enlace a WhatsApp', 'alta'],
      ['p3', 'Instagram vinculado a la página de Facebook', 'baja'],
      ['p4', 'Business Manager con método de pago verificado y cuenta publicitaria sin restricciones', 'alta'],
      ['p5', 'WhatsApp Business: mensaje de bienvenida, respuestas rápidas, catálogo y etiquetas', 'alta'],
      ['p6', 'Si tienes tienda o landing: instalar el píxel de Meta y probarlo', 'media'],
    ]],
    ['Contenido', [
      ['c1', 'Definir cómo se ve y suena la marca: colores, tipo de letra, tono al hablar', 'media'],
      ['c2', 'Banco de 10 imágenes del producto listas para publicar', 'alta'],
      ['c3', 'Banco de 10 videos cortos (uso, antes y después, desempaque, razones para comprar)', 'alta'],
      ['c4', 'Plantillas de Canva guardadas (feed, historias y portada)', 'media'],
      ['c5', 'Lista de música sin derechos de autor y de hashtags del nicho', 'baja'],
      ['c6', 'Calendario de publicaciones de la semana (qué se publica cada día)', 'alta'],
    ]],
    ['Publicidad', [
      ['a1', 'Campaña de mensajes a WhatsApp con presupuesto de prueba', 'alta'],
      ['a2', 'Al menos 3 anuncios distintos (imagen, video y otro texto)', 'alta'],
      ['a3', 'Regla de decisión por escrito: cuánto se gasta antes de pausar o escalar un anuncio', 'alta'],
      ['a4', 'Medir costo por mensaje, costo por pedido y utilidad por pedido', 'alta'],
    ]],
    ['Ventas por WhatsApp y entregas', [
      ['v1', 'Guion de venta: saludo, beneficios, precio, cierre y datos del pedido', 'alta'],
      ['v2', 'Respuestas a las dudas más comunes (precio, envío, garantía, pago contra entrega)', 'alta'],
      ['v3', 'Mensaje de confirmación de pedido y aviso de envío', 'media'],
      ['v4', 'Forma de seguimiento: quién escribe a los que no respondieron y cuándo', 'media'],
      ['v5', 'Proceso de devolución: qué se hace cuando el cliente no recibe', 'media'],
    ]],
    ['Cuidado legal y de cuentas', [
      ['l1', 'No prometer curas ni resultados médicos en anuncios ni videos', 'alta'],
      ['l2', 'No usar música, videos ni imágenes de otros sin permiso', 'alta'],
      ['l3', 'Si el producto es cosmético o de salud: revisar el registro sanitario', 'alta'],
      ['l4', 'Leer las políticas de anuncios de Meta y de TikTok una vez', 'media'],
    ]],
  ];

  // Aprender: un tema por día y un plan de semanas
  const TEMA_DIA = {
    1: ['Copywriting', 'Cómo escribir un gancho: la primera línea que hace parar el dedo. Mira 5 anuncios y copia la estructura, no las palabras.'],
    2: ['Edición de video', 'CapCut: cortes, subtítulos, zoom, música y portada. Edita un video de 20 segundos desde cero.'],
    3: ['Anuncios de Meta', 'Objetivo de mensajes a WhatsApp, presupuesto, públicos amplios y cómo leer costo por mensaje.'],
    4: ['TikTok orgánico', 'Los primeros 3 segundos, formatos que funcionan y a qué hora publicar. Analiza 5 videos virales de tu nicho.'],
    5: ['Números y finanzas', 'Utilidad real por pedido, devoluciones y punto de equilibrio. Practica con la Calculadora.'],
    6: ['Producto y mercado', 'Cómo investigar a la competencia y encontrar ángulos de venta nuevos.'],
    0: ['Descanso y repaso', 'Descansen. Si quieren, repasen la lista de lo aprendido.'],
  };
  const SEMANAS = [
    ['Semana 1 · Base', ['Cómo funciona el contra entrega en Perú: pedido, envío, cobro y devolución', 'Calcular utilidad por pedido con la Calculadora', 'Canva básico: una imagen de producto en 3 formatos', 'CapCut básico: un video vertical con subtítulos']],
    ['Semana 2 · Anuncios', ['Campaña de mensajes a WhatsApp paso a paso', 'Cómo escribir un texto de venta corto', 'Públicos amplios y por ubicación (Shalom)', 'Cómo leer las métricas: alcance, clics, mensajes y costo por mensaje']],
    ['Semana 3 · TikTok y contenido', ['Ganchos de 3 segundos y estructuras de video que venden', 'Qué publicar cada día: prueba, uso, opinión, oferta', 'Cómo responder comentarios para vender', 'Derechos de autor y música permitida']],
    ['Semana 4 · Ventas por WhatsApp', ['Guion de ventas y manejo de objeciones', 'Seguimiento a clientes que dijeron «lo pienso»', 'Confirmación de pedido y reducción de devoluciones', 'Servicio al cliente: qué hacer con un reclamo']],
    ['Semana 5 · Medir y mejorar', ['Qué anuncio pausar y cuál dejar correr', 'Probar creativos nuevos sin perder presupuesto', 'Revisión semanal de números', 'Cómo escoger un segundo producto']],
    ['Semana 6 · Crecer', ['Cuándo subir presupuesto sin romper la campaña', 'Armar combos y ofertas para subir el ticket', 'Cómo organizar el trabajo entre dos personas', 'Plan de los próximos 30 días']],
  ];

  let tab = 'hoy', fecha = null, filtro = 'todos', diaPlan = null;
  const E = () => {
    const t = (S.tareas = S.tareas || {});
    if (!t.personas) t.personas = ['Persona 1', 'Persona 2'];
    if (!t.lista) t.lista = PLANTILLA.map(x => ({ id: uid(), ...x }));
    t.hechas = t.hechas || {}; t.falta = t.falta || {}; t.reg = t.reg || {}; t.apr = t.apr || {};
    return t;
  };
  const nom = p => (p === 2 ? 'Ambos' : E().personas[p] || 'Persona ' + (p + 1));
  const dow = f => new Date(f + 'T12:00:00').getDay();
  const mover = (f, n) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const fechaLarga = f => { const x = new Date(f + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const delDia = f => E().lista.filter(x => rep_ok(x.r, dow(f), x.f, f)).sort((a, b) => a.h.localeCompare(b.h) || a.p - b.p);
  const hecha = (f, id) => (E().hechas[f] || []).includes(id);
  const fin = x => { const [h, m] = x.h.split(':').map(Number), t = h * 60 + m + (num(x.d) || 0), z = n => String(n).padStart(2, '0'); return z(Math.floor(t / 60) % 24) + ':' + z(t % 60); };
  const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const aMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

  const campos = () => [{ k: 'h', l: 'Hora de inicio', t: 'time', def: '09:00', req: 1 }, { k: 'd', l: 'Duración (minutos)', t: 'number', def: 30 },
    { k: 't', l: 'Tarea', req: 1, full: 1 }, { k: 'p', l: 'Quién', t: 'select', opts: { 0: nom(0), 1: nom(1), 2: 'Ambos' }, def: 2 },
    { k: 'c', l: 'Categoría', t: 'select', opts: Object.fromEntries(CATS.map(c => [c, c])) }, { k: 'r', l: 'Se repite', t: 'select', opts: REP, def: 'diario', full: 1 },
    { k: 'f', l: 'Fecha (solo si es una sola vez)', t: 'date' }, { k: 'n', l: 'Cómo se hace / nota', full: 1 }];
  const guardarForm = v => ({ ...v, p: +v.p, d: num(v.d) });

  function hoyHtml() {
    const t = E(), f = fecha || hoy(), L = delDia(f).filter(x => filtro === 'todos' || String(x.p) === filtro || x.p === 2);
    const todas = delDia(f), hechas = todas.filter(x => hecha(f, x.id)).length, pct = todas.length ? Math.round(hechas / todas.length * 100) : 0;
    const esHoy = f === hoy(), am = ahoraMin();
    const tema = TEMA_DIA[dow(f)];
    return `<div class="card card-row" style="gap:8px;flex-wrap:wrap"><button class="btn btn-sm" data-m="-1">←</button><div style="flex:1;text-align:center"><b>${esc(fechaLarga(f))}</b><br><small class="cap">${esHoy ? 'Hoy' : 'Otro día'}</small></div><button class="btn btn-sm" data-m="1">→</button>${esHoy ? '' : '<button class="btn btn-sm btn-pri" data-m="0">Ir a hoy</button>'}</div>
    <div class="card"><div class="it-h"><b>Avance del día</b><b>${hechas} de ${todas.length} · ${pct}%</b></div><div class="pb-bar"><i style="width:${pct}%;background:var(--acc)"></i></div>
      <div class="seg" id="tp-f" style="margin-top:12px"><button data-f="todos" class="${filtro === 'todos' ? 'on' : ''}">Todos</button><button data-f="0" class="${filtro === '0' ? 'on' : ''}">${esc(nom(0))}</button><button data-f="1" class="${filtro === '1' ? 'on' : ''}">${esc(nom(1))}</button></div></div>
    <div class="card" style="border-color:var(--acc)"><small class="cap">APRENDE HOY · ${esc(tema[0].toUpperCase())}</small><p class="rk-p" style="margin:6px 0 0">${esc(tema[1])}</p></div>
    <div class="list">${L.map(x => { const ok = hecha(f, x.id), ahora = esHoy && !ok && am >= aMin(x.h) && am < aMin(fin(x)), tarde = esHoy && !ok && am >= aMin(fin(x)); return `<div class="it" style="${ok ? 'opacity:.55' : ''}${ahora ? ';border-color:var(--acc);box-shadow:0 0 0 2px var(--accsoft)' : ''}"><label class="chk" style="align-items:flex-start"><input type="checkbox" data-k="${x.id}" ${ok ? 'checked' : ''}> <span><b style="${ok ? 'text-decoration:line-through' : ''}">${esc(x.h)}–${esc(fin(x))} · ${esc(x.t)}</b></span></label><div class="it-s">${esc(nom(x.p))} · ${esc(x.c)}${ahora ? ' · <b style="color:var(--acc)">AHORA</b>' : ''}${tarde ? ' · <b style="color:#dc2626">Atrasada</b>' : ''}</div>${x.n ? `<div class="it-s">${esc(x.n)}</div>` : ''}<div class="it-a" style="margin:0"><button class="btn btn-sm" data-e="${x.id}">Editar</button><button class="btn btn-sm btn-del" data-d="${x.id}">✕</button></div></div>`; }).join('') || '<div class="card empty">No hay tareas para este día. Agrega una con + Tarea.</div>'}</div>`;
  }

  function planHtml() {
    const d = diaPlan == null ? dow(hoy()) : diaPlan;
    const orden = [1, 2, 3, 4, 5, 6, 0];
    const f = (() => { for (let i = 0; i < 7; i++) { const x = mover(hoy(), i); if (dow(x) === d) return x; } return hoy(); })();
    const L = delDia(f);
    const hp = p => L.filter(x => x.p === p || x.p === 2).reduce((s, x) => s + num(x.d), 0);
    return `<div class="seg" id="tp-d" style="margin-bottom:12px;flex-wrap:wrap">${orden.map(i => `<button data-d="${i}" class="${i === d ? 'on' : ''}">${DIAS[i].slice(0, 3)}</button>`).join('')}</div>
    <div class="tiles"><div class="t"><small>Tareas ese día</small><b>${L.length}</b></div><div class="t"><small>${esc(nom(0))}</small><b>${(hp(0) / 60).toFixed(1)} h</b></div><div class="t"><small>${esc(nom(1))}</small><b>${(hp(1) / 60).toFixed(1)} h</b></div></div>
    <div class="card"><h3>${DIAS[d]}</h3><div class="list">${L.map(x => `<div class="it"><div class="it-h"><b>${esc(x.h)}–${esc(fin(x))} · ${esc(x.t)}</b></div><div class="it-s">${esc(nom(x.p))} · ${esc(x.c)} · ${esc(REP[x.r] || '')}</div></div>`).join('')}</div></div>
    <p class="note">Para cambiar una tarea o sus horarios, abre la pestaña Hoy y toca Editar. Los cambios valen para todos los días en que se repite.</p>`;
  }

  function faltaHtml() {
    const t = E(), todos = FALTA.flatMap(g => g[1]), hechos = todos.filter(x => t.falta[x[0]]).length;
    const imp = { alta: ['Importante', 'rv-no'], media: ['Media', 'rv-mid'], baja: ['Puede esperar', 'rv-ok'] };
    return `<div class="card"><div class="it-h"><b>Lo que falta para arrancar bien</b><b>${hechos} de ${todos.length}</b></div><div class="pb-bar"><i style="width:${Math.round(hechos / todos.length * 100)}%;background:var(--acc)"></i></div><p class="note">Marca lo que ya tienes. Empieza por lo marcado como «Importante».</p></div>
    ${FALTA.map(([g, its]) => `<div class="card"><h3>${esc(g)}</h3>${its.map(([id, tx, im]) => `<label class="chk" style="align-items:flex-start;margin:8px 0"><input type="checkbox" data-fa="${id}" ${t.falta[id] ? 'checked' : ''}> <span>${esc(tx)} <span class="rv ${imp[im][1]}">${imp[im][0]}</span></span></label>`).join('')}</div>`).join('')}`;
  }

  function aprHtml() {
    const t = E(), d = dow(hoy()), tema = TEMA_DIA[d];
    return `<div class="card" style="border-color:var(--acc)"><small class="cap">HOY · ${esc(DIAS[d].toUpperCase())}</small><h3 style="margin:4px 0">${esc(tema[0])}</h3><p class="rk-p" style="margin:0">${esc(tema[1])}</p></div>
    <div class="card"><h3>Un tema por día</h3>${[1, 2, 3, 4, 5, 6, 0].map(i => `<div class="it-s" style="margin:6px 0"><b>${DIAS[i]}:</b> ${esc(TEMA_DIA[i][0])}</div>`).join('')}</div>
    ${SEMANAS.map(([s, its], si) => `<div class="card"><h3>${esc(s)}</h3>${its.map((x, i) => { const id = 's' + si + '-' + i; return `<label class="chk" style="align-items:flex-start;margin:8px 0"><input type="checkbox" data-ap="${id}" ${t.apr[id] ? 'checked' : ''}> <span>${esc(x)}</span></label>`; }).join('')}</div>`).join('')}`;
  }

  function regHtml() {
    const t = E(), f = hoy(), r = t.reg[f] || {};
    const sem = [...Array(7)].map((_, i) => mover(f, -i)).map(d => t.reg[d] || {});
    const sm = k => sem.reduce((s, x) => s + num(x[k]), 0);
    const campo = (k, l) => `<div class="field"><label>${l}</label><input data-r="${k}" type="number" min="0" inputmode="numeric" value="${r[k] ?? ''}"></div>`;
    return `<div class="card"><h3>Registro de hoy</h3><p class="sub">${esc(fechaLarga(f))}</p><div class="row">${campo('videos', 'Videos publicados')}${campo('imagenes', 'Imágenes publicadas')}${campo('mensajes', 'Mensajes recibidos')}${campo('pedidos', 'Pedidos confirmados')}</div>
      <div class="field"><label>¿Qué salió bien, qué falló, qué haremos mañana?</label><input data-r="nota" type="text" maxlength="300" value="${esc(r.nota || '')}"></div></div>
    <div class="tiles"><div class="t"><small>Videos (7 días)</small><b>${sm('videos')}</b></div><div class="t"><small>Imágenes (7 días)</small><b>${sm('imagenes')}</b></div><div class="t"><small>Mensajes (7 días)</small><b>${sm('mensajes')}</b></div><div class="t"><small>Pedidos (7 días)</small><b>${sm('pedidos')}</b></div></div>`;
  }

  function ajustesHtml() {
    const t = E();
    return `<div class="card"><h3>Nombres del equipo</h3><div class="row"><div class="field"><label>Persona 1</label><input data-n="0" type="text" maxlength="30" value="${esc(t.personas[0])}"></div><div class="field"><label>Persona 2</label><input data-n="1" type="text" maxlength="30" value="${esc(t.personas[1])}"></div></div></div>
    <div class="card"><h3>Volver a la agenda original</h3><p class="sub">Borra tus cambios en las tareas y deja la agenda que venía de fábrica. Lo ya marcado como hecho se conserva.</p><button class="btn btn-del" id="tp-reset">Restaurar agenda</button></div>`;
  }

  function vista(el) {
    const t = E();
    const tabs = { hoy: 'Hoy', plan: 'Plan semanal', falta: 'Qué falta', apr: 'Aprender', reg: 'Registro', aj: 'Ajustes' };
    el.innerHTML = `${secH('tareas', 'Tareas diarias', 'La agenda del día para los dos, paso a paso', tab === 'hoy' ? '<button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Tarea</button>' : '')}
    <div class="chips" id="tp-t">${Object.entries(tabs).map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    ${{ hoy: hoyHtml, plan: planHtml, falta: faltaHtml, apr: aprHtml, reg: regHtml, aj: ajustesHtml }[tab]()}`;
    el.querySelectorAll('#tp-t [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    const nv = $('#nuevo'); if (nv) nv.onclick = () => openForm('Nueva tarea', campos(), { f: fecha || hoy() }, v => t.lista.push({ id: uid(), ...guardarForm(v) }));
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { fecha = b.dataset.m === '0' ? null : mover(fecha || hoy(), +b.dataset.m); render(); });
    el.querySelectorAll('#tp-f [data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; render(); });
    el.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { const f = fecha || hoy(), a = (t.hechas[f] = t.hechas[f] || []); const k = i.dataset.k; t.hechas[f] = i.checked ? [...new Set([...a, k])] : a.filter(x => x !== k); Store.save(); render(); });
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const x = t.lista.find(y => y.id === b.dataset.e); openForm('Editar tarea', campos(), x, v => Object.assign(x, guardarForm(v))); });
    el.querySelectorAll('#view [data-d]').forEach(b => { if (b.closest('#tp-d')) b.onclick = () => { diaPlan = +b.dataset.d; render(); }; else b.onclick = () => confirmDel('¿Quitar esta tarea?', () => { t.lista = t.lista.filter(y => y.id !== b.dataset.d); }); });
    el.querySelectorAll('[data-fa]').forEach(i => i.onchange = () => { t.falta[i.dataset.fa] = i.checked; Store.save(); render(); });
    el.querySelectorAll('[data-ap]').forEach(i => i.onchange = () => { t.apr[i.dataset.ap] = i.checked; Store.save(); render(); });
    el.querySelectorAll('[data-r]').forEach(i => i.onchange = () => { const f = hoy(); t.reg[f] = t.reg[f] || {}; t.reg[f][i.dataset.r] = i.dataset.r === 'nota' ? i.value.trim() : num(i.value); Store.save(); render(); });
    el.querySelectorAll('[data-n]').forEach(i => i.onchange = () => { t.personas[+i.dataset.n] = i.value.trim() || 'Persona ' + (+i.dataset.n + 1); Store.save(); render(); });
    const rs = $('#tp-reset'); if (rs) rs.onclick = () => confirmDel('¿Restaurar la agenda original? Se pierden tus cambios en las tareas.', () => { t.lista = PLANTILLA.map(x => ({ id: uid(), ...x })); });
  }
  window.Tareas = { vista };
  if ((location.hash || '').slice(1) === 'tareas') render();
})();
