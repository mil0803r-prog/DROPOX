'use strict';
/* DROPOX — Tareas diarias: agenda del día para dos personas (e-commerce con Facebook y TikTok), lista de lo que falta, plan de aprendizaje y registro del día. */
(() => {
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const REP = { diario: 'Todos los días', lv: 'Lunes a viernes', ls: 'Lunes a sábado', d1: 'Solo lunes', d2: 'Solo martes', d3: 'Solo miércoles', d4: 'Solo jueves', d5: 'Solo viernes', d6: 'Solo sábado', d0: 'Solo domingo', una: 'Una sola vez (en la fecha)' };
  const CATS = ['Organización', 'Atención al cliente', 'Pedidos y envíos', 'Imágenes', 'Video', 'Contenido y textos', 'Publicar', 'Publicidad', 'Métricas', 'Comunidad', 'Investigación', 'Aprender', 'Finanzas', 'Cierre'];
  const TODOS = [1, 2, 3, 4, 5, 6, 0], ABR = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom' };
  const diasDe = x => (Array.isArray(x.dias) ? x.dias : x.r === 'diario' ? TODOS : x.r === 'lv' ? [1, 2, 3, 4, 5] : x.r === 'ls' ? [1, 2, 3, 4, 5, 6] : /^d[0-6]$/.test(x.r) ? [+x.r[1]] : []);
  const repTxt = x => {
    if (x.r === 'una') return REP.una;
    const d = diasDe(x).slice().sort((a, b) => (a || 7) - (b || 7)), k = d.join();
    return d.length === 7 ? 'Todos los días' : k === '1,2,3,4,5' ? 'Lunes a viernes' : k === '1,2,3,4,5,6' ? 'Lunes a sábado' : d.map(n => ABR[n]).join(', ') || 'Sin días';
  };
  const rep_ok = (r, dow, fecha, f) => (r === 'diario' || (r === 'lv' && dow >= 1 && dow <= 5) || (r === 'ls' && dow >= 1 && dow <= 6) || r === 'd' + dow || (r === 'una' && fecha === f));

  // p: 0 = persona 1, 1 = persona 2, 2 = ambos
  const T = (h, d, p, c, t, n, r = 'diario') => ({ h, d, p, c, t, n, r });
  // p: 0 = Fray (logística, imágenes e investigación), 1 = Milner (publicidad y métricas), 2 = ambos
  const PLANTILLA = [
    T('08:00', 15, 2, 'Organización', 'Reunión corta: metas del día', 'Cada uno dice qué hará hoy. Revisen pedidos pendientes, qué se publica hoy y qué falló ayer.'),
    // ───── Fray: logística, imágenes e investigación ─────
    T('08:15', 45, 0, 'Pedidos y envíos', 'Confirmar pedidos de ayer y despacharlos', 'Confirma cada pedido (nombre, teléfono, dirección y referencia). Despacha lo confirmado y anota la guía de cada envío.'),
    T('09:00', 30, 0, 'Pedidos y envíos', 'Seguimiento de envíos en camino', 'Revisa en la web de la transportadora (Shalom, Olva, etc.) cuáles llegan hoy, cuáles están retenidos o con problema, y avisa al cliente.'),
    T('09:30', 15, 0, 'Organización', 'Revisar stock y confirmar con el proveedor', 'Confirma que hay stock del producto que se va a promocionar antes de que Milner lo anuncie.'),
    T('09:45', 75, 0, 'Imágenes', 'Crear o editar 3 imágenes del producto', 'En Canva: foto del producto, beneficio principal, precio u oferta. Formatos 1:1 para el feed y 9:16 para historias.'),
    T('11:00', 45, 0, 'Publicar', 'Subir imágenes a la cuenta', 'Sube las imágenes a la página de Facebook, a la tienda o catálogo. Revisa título, precio, descripción y orden de las fotos.'),
    T('14:00', 45, 0, 'Aprender', 'Aprender algo nuevo (45 minutos)', 'Sigue el tema del día en la pestaña Aprender y escribe 3 cosas que aplicarás mañana.'),
    T('14:45', 30, 0, 'Pedidos y envíos', 'Llamar a clientes con devolución y anotar el motivo', 'Pregunta por qué no recibió o rechazó el pedido y anótalo: así se reducen las devoluciones.'),
    T('15:15', 30, 0, 'Pedidos y envíos', 'Seguimiento a clientes con pedido pendiente', 'Escribe a los que dijeron «lo pienso», confirma entregas y avisa a quienes recibirán su pedido hoy.'),
    T('15:45', 30, 0, 'Finanzas', 'Anotar entregados, devueltos y gastos del día', 'Actualiza el estado de cada pedido en la plataforma y registra los gastos en Gastos diarios. Concilia pagos de Yape, Plin y transferencias.'),
    T('16:15', 45, 0, 'Contenido y textos', 'Preparar las fotos y textos de mañana', 'Deja listas las fotos del producto, los precios y las descripciones. Ordena el almacén y el empaque.'),
    // ───── Milner: publicidad, métricas y video ─────
    T('08:15', 45, 1, 'Publicidad', 'Revisar los anuncios de Meta y TikTok', 'Mira gasto, mensajes recibidos y costo por mensaje de ayer. No toques los anuncios con menos de 3 días. Pausa lo que gasta mucho y no trae mensajes.'),
    T('09:00', 30, 1, 'Métricas', 'Anotar las métricas de ayer', 'Registra en Meta Ads y TikTok Ads el gasto, los mensajes y las compras de ayer.'),
    T('09:30', 90, 1, 'Video', 'Grabar 2 o 3 videos para los anuncios', 'Muestra el producto en uso, antes y después, desempaque, 3 razones para comprarlo. Vertical, buena luz y producto en los primeros 3 segundos.'),
    T('11:00', 60, 1, 'Video', 'Editar los videos', 'En CapCut: cortar silencios, subtítulos, música sin derechos de autor, formato 9:16, portada clara.'),
    T('13:00', 45, 1, 'Publicidad', 'Segunda revisión de anuncios y presupuesto', 'Decide con la regla escrita: qué se pausa, qué se deja correr y qué sube de presupuesto. Cambia una sola cosa a la vez.'),
    T('13:45', 45, 1, 'Atención al cliente', 'Responder mensajes que llegan de los anuncios', 'Responde WhatsApp, Messenger e Instagram. Usa respuestas rápidas y etiqueta cada chat. Meta: menos de 15 minutos.'),
    T('14:30', 45, 1, 'Investigación', 'Revisar anuncios de la competencia', 'Mira 5 anuncios de la competencia en la Biblioteca de anuncios de Meta y 5 videos virales. Guarda las ideas.', 'd1'),
    T('14:30', 45, 1, 'Investigación', 'Revisar anuncios de la competencia', 'Mira 5 anuncios de la competencia en la Biblioteca de anuncios de Meta y 5 videos virales. Guarda las ideas.', 'd2'),
    T('14:30', 60, 1, 'Publicidad', 'Probar un anuncio o creativo nuevo', 'Cambia una sola cosa a la vez (imagen, texto o público). Sube el nuevo en una campaña de bajo presupuesto.', 'd3'),
    T('14:30', 45, 1, 'Investigación', 'Revisar anuncios de la competencia', 'Mira 5 anuncios de la competencia en la Biblioteca de anuncios de Meta y 5 videos virales. Guarda las ideas.', 'd4'),
    T('14:30', 45, 1, 'Investigación', 'Revisar anuncios de la competencia', 'Mira 5 anuncios de la competencia en la Biblioteca de anuncios de Meta y 5 videos virales. Guarda las ideas.', 'd5'),
    T('15:30', 30, 1, 'Comunidad', 'Responder comentarios de TikTok y Facebook', 'Responde cada comentario y pasa a los interesados a WhatsApp. Interactúa con 10 cuentas de tu nicho.'),
    T('16:00', 30, 1, 'Publicar', 'Publicar el video del día', 'Un reel en Facebook y un video en TikTok. Revisa que el botón de WhatsApp funcione.'),
    T('16:30', 45, 1, 'Métricas', 'Calcular costo por mensaje, por pedido y utilidad', 'Calcula costo por mensaje, costo por pedido, ROAS y utilidad por pedido. Anótalos en el Registro del día.', 'ls'),
    // ───── Ambos ─────
    T('17:15', 20, 2, 'Cierre', 'Cierre del día', 'Anoten en el Registro del día: videos, imágenes, mensajes, pedidos, entregados, devueltos y publicidad. Qué salió bien, qué falló y qué se hace mañana.'),
    T('12:00', 60, 2, 'Organización', 'Almuerzo y descanso', 'Desconéctense una hora. Se rinde más en la tarde.'),
    // ───── Semanales ─────
    T('09:00', 60, 2, 'Organización', 'Planificar la semana', 'Fray: qué productos y fotos se suben. Milner: qué anuncios, videos y presupuesto. Calendario de 7 días.', 'd1'),
    T('13:00', 60, 0, 'Investigación', 'Investigar: cómo funciona el contra entrega en Perú', 'Pedido, envío, cobro y devolución. Qué transportadoras hay (Shalom, Olva, Serpost) y cuánto cobran.', 'd1'),
    T('13:00', 60, 0, 'Investigación', 'Investigar: productos ganadores', 'Usa Caza y Radar. Busca 3 productos candidatos, calcula su margen en la Calculadora y guarda el mejor.', 'd2'),
    T('13:00', 60, 0, 'Investigación', 'Investigar: proveedores y precios', 'Compara 3 proveedores (Dropi, locales, importación): precio, stock, tiempo de entrega y calidad.', 'd3'),
    T('13:00', 60, 0, 'Investigación', 'Investigar: la competencia', 'Mira 5 tiendas que venden lo mismo: precio, ofertas, fotos y política de envío. Anota qué haces diferente.', 'd4'),
    T('13:00', 60, 0, 'Investigación', 'Investigar: los clientes', 'Lee comentarios de la competencia: qué dudas y quejas tienen. Escribe las 10 preguntas más repetidas.', 'd5'),
    T('13:00', 60, 0, 'Investigación', 'Resumen de lo investigado en la semana', 'Escribe una hoja con lo más importante que aprendiste y se lo cuentas a Milner.', 'd6'),
    T('16:30', 45, 2, 'Finanzas', 'Revisión semanal de números', 'Pedidos entregados y devueltos, gasto en publicidad, utilidad real de la semana (Dashboard y Calculadora). Ajusten precios u ofertas.', 'd5'),
    T('10:00', 90, 2, 'Aprender', 'Bloque de estudio y revisión', 'Repasen lo aprendido en la semana y anoten dudas. Bajen el respaldo de datos en Ajustes. Media jornada, el resto es descanso.', 'd6'),
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
    if (!t.personas) t.personas = ['Fray', 'Milner'];
    if (!t.lista) t.lista = PLANTILLA.map(x => ({ id: uid(), ...x }));
    if (!(t.ver >= 2)) { // agenda por roles: Fray (logística, imágenes, investigación) y Milner (publicidad y métricas); se conservan las tareas de una sola vez
      t.lista = PLANTILLA.map(x => ({ id: uid(), ...x })).concat(t.lista.filter(x => x.r === 'una'));
      t.personas = t.personas.map((n, i) => (/^Persona [12]$/.test(n) ? ['Fray', 'Milner'][i] : n)); t.ver = 2;
    }
    if (!(t.ver >= 4)) { t.lista = []; t.hechas = {}; t.falta = {}; t.reg = {}; t.apr = {}; t.ver = 4; } // empezar en cero: sin tareas, sin marcas, sin registro ni avances
    if (!(t.ver >= 5)) { // tareas de Fray
      t.lista.push(
        { id: uid(), h: '11:00', d: 45, p: 0, c: 'Publicar', t: 'Publicar 3 imágenes en carrusel en Facebook e Instagram (Meta Business Suite)', n: 'En Meta Business Suite: Crear publicación, marca la página de Facebook y la cuenta de Instagram, sube las 3 imágenes en orden, escribe el texto con gancho, revisa la vista previa y publica o programa.', r: 'diario' },
        { id: uid(), h: '13:00', d: 45, p: 0, c: 'Investigación', t: 'Buscar los hooks más virales del producto', n: 'Busca en TikTok, Instagram y la Biblioteca de anuncios de Meta los videos más virales de este producto. Anota la frase o escena de los primeros 3 segundos de cada uno (mínimo 5 hooks) y marca los 2 mejores para usar.', r: 'diario' });
      t.ver = 5;
    }
    t.hechas = t.hechas || {}; t.falta = t.falta || {}; t.reg = t.reg || {}; t.apr = t.apr || {};
    return t;
  };
  const nom = p => (p === 2 ? 'Ambos' : E().personas[p] || 'Persona ' + (p + 1));
  const dow = f => new Date(f + 'T12:00:00').getDay();
  const mover = (f, n) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const fechaLarga = f => { const x = new Date(f + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const delDia = f => E().lista.filter(x => (Array.isArray(x.dias) && x.r !== 'una' ? x.dias.includes(dow(f)) : rep_ok(x.r, dow(f), x.f, f))).sort((a, b) => a.h.localeCompare(b.h) || a.p - b.p);
  const hecha = (f, id) => (E().hechas[f] || []).includes(id);
  const fin = x => { const [h, m] = x.h.split(':').map(Number), t = h * 60 + m + (num(x.d) || 0), z = n => String(n).padStart(2, '0'); return z(Math.floor(t / 60) % 24) + ':' + z(t % 60); };
  const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const aMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

  const campos = () => [{ k: 'h', l: 'Hora de inicio', t: 'time', def: '09:00', req: 1 }, { k: 'd', l: 'Duración (minutos)', t: 'number', def: 30 },
    { k: 't', l: 'Tarea', req: 1, full: 1 }, { k: 'p', l: 'Quién', t: 'select', opts: { 0: nom(0), 1: nom(1), 2: 'Ambos' }, def: 2 },
    { k: 'c', l: 'Categoría', t: 'select', opts: Object.fromEntries(CATS.map(c => [c, c])) }, { k: 'r', l: 'Cuándo', t: 'select', opts: { dias: 'En los días que marque abajo', una: 'Una sola vez (en la fecha)' }, def: 'dias', full: 1 },
    { k: 'dias', l: 'Días de la semana', t: 'dias', def: TODOS, full: 1 },
    { k: 'f', l: 'Fecha (solo si es una sola vez)', t: 'date' }, { k: 'n', l: 'Cómo se hace / nota', full: 1 }];
  const guardarForm = v => {
    if (v.r === 'una') return { ...v, p: +v.p, d: num(v.d), dias: [] };
    if (!v.dias.length) { toast('No marcaste días: se asignó a todos'); v = { ...v, dias: TODOS }; }
    return { ...v, p: +v.p, d: num(v.d), r: 'dias' };
  };

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
    <div class="card"><h3>${DIAS[d]}</h3><div class="list">${L.map(x => `<div class="it"><div class="it-h"><b>${esc(x.h)}–${esc(fin(x))} · ${esc(x.t)}</b></div><div class="it-s">${esc(nom(x.p))} · ${esc(x.c)} · ${esc(repTxt(x))}</div></div>`).join('')}</div></div>
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
    return `<div class="card"><h3>Registro de hoy</h3><p class="sub">${esc(fechaLarga(f))}</p><div class="row">${campo('videos', 'Videos publicados')}${campo('imagenes', 'Imágenes publicadas')}${campo('mensajes', 'Mensajes recibidos')}${campo('pedidos', 'Pedidos confirmados')}${campo('entregados', 'Pedidos entregados')}${campo('devueltos', 'Pedidos devueltos')}${campo('pauta', 'Gasto en publicidad (S/)')}</div>
      <div class="field"><label>¿Qué salió bien, qué falló, qué haremos mañana?</label><input data-r="nota" type="text" maxlength="300" value="${esc(r.nota || '')}"></div></div>
    <div class="tiles"><div class="t"><small>Videos (7 días)</small><b>${sm('videos')}</b></div><div class="t"><small>Imágenes (7 días)</small><b>${sm('imagenes')}</b></div><div class="t"><small>Mensajes (7 días)</small><b>${sm('mensajes')}</b></div><div class="t"><small>Pedidos (7 días)</small><b>${sm('pedidos')}</b></div><div class="t"><small>Publicidad (7 días)</small><b>S/ ${sm('pauta').toFixed(0)}</b></div></div>`;
  }


  // Análisis: revisa los últimos 7 días de tareas y registro, y dice qué atender primero
  function analisis() {
    const t = E(), f0 = hoy(), A = [];
    const dias = [...Array(7)].map((_, i) => mover(f0, -(i + 1)));
    const usados = dias.filter(f => (t.hechas[f] || []).length || t.reg[f]);
    let tot = 0, ok = 0; const porCat = {}, porP = [[0, 0], [0, 0]];
    usados.forEach(f => delDia(f).forEach(x => {
      const h = hecha(f, x.id); tot++; if (h) ok++;
      const c = (porCat[x.c] = porCat[x.c] || [0, 0]); c[1]++; if (h) c[0]++;
      [0, 1].forEach(p => { if (x.p === p || x.p === 2) { porP[p][1]++; if (h) porP[p][0]++; } });
    }));
    const pct = (a, b) => (b ? Math.round(a / b * 100) : null);
    const cump = pct(ok, tot);
    if (!usados.length) A.push(['media', 'Todavía no hay días marcados. Marca tus tareas y llena el Registro al cerrar el día para que el análisis funcione.']);
    else if (cump < 50) A.push(['alta', `Solo cumpliste el ${cump}% de las tareas en los últimos días. Quita las que no usas o baja la carga: es mejor una agenda corta que se cumple.`]);
    else if (cump >= 80) A.push(['ok', `Buen ritmo: cumpliste el ${cump}% de las tareas de los últimos días.`]);
    else A.push(['media', `Cumpliste el ${cump}% de las tareas de los últimos días. La meta es 80%.`]);
    const peor = Object.entries(porCat).filter(([, v]) => v[1] >= 3).map(([k, v]) => [k, pct(v[0], v[1])]).sort((a, b) => a[1] - b[1])[0];
    if (peor && peor[1] < 60) A.push(['alta', `Lo que más se te queda sin hacer es «${peor[0]}» (${peor[1]}% hecho). Muévelo a una hora más temprana o repártelo.`]);
    [0, 1].forEach(p => { const v = pct(porP[p][0], porP[p][1]); if (v != null && v < 50 && porP[p][1] >= 5) A.push(['media', `${nom(p)} cumple solo el ${v}% de sus tareas. Revisen si tiene demasiadas.`]); });
    const hp = p => delDia(f0).filter(x => x.p === p || x.p === 2).reduce((s, x) => s + num(x.d), 0);
    if (Math.abs(hp(0) - hp(1)) > 120) A.push(['media', `La carga de hoy está desigual: ${nom(0)} ${(hp(0) / 60).toFixed(1)} h y ${nom(1)} ${(hp(1) / 60).toFixed(1)} h. Pasen alguna tarea al otro.`]);
    const am = ahoraMin(), atras = delDia(f0).filter(x => !hecha(f0, x.id) && am >= aMin(fin(x)));
    if (atras.length) A.push(['alta', `Hoy tienes ${atras.length} tarea${atras.length > 1 ? 's' : ''} atrasada${atras.length > 1 ? 's' : ''}: ${atras.slice(0, 3).map(x => x.t).join('; ')}.`]);
    const reg = dias.concat([f0]).filter(f => t.reg[f]).map(f => t.reg[f]);
    const sm = k => reg.reduce((s, x) => s + num(x[k]), 0);
    const sinPub = reg.filter(x => !num(x.videos) && !num(x.imagenes)).length;
    if (sinPub >= 2) A.push(['alta', `${sinPub} días de los últimos 7 sin publicar videos ni imágenes. Sin contenido no hay mensajes.`]);
    const sinReg = dias.filter(f => (t.hechas[f] || []).length && !t.reg[f]).length;
    if (sinReg) A.push(['media', `${sinReg} día${sinReg > 1 ? 's' : ''} con tareas marcadas pero sin Registro. Llénalo al cierre del día.`]);
    if (sm('mensajes') >= 20) {
      const cv = Math.round(sm('pedidos') / sm('mensajes') * 100);
      A.push([cv < 5 ? 'alta' : cv >= 15 ? 'ok' : 'media', `De cada 100 mensajes cierras ${cv} pedidos. ${cv < 5 ? 'Es bajo: revisa el guion de venta y el seguimiento a quienes dijeron «lo pienso».' : cv >= 15 ? 'Muy bien.' : 'Se puede subir con mejor seguimiento.'}`]);
    }
    if (sm('pauta') > 0) {
      if (!sm('pedidos')) A.push(['alta', `Gastaste S/ ${sm('pauta').toFixed(0)} en publicidad y no registraste pedidos. Revisa los anuncios hoy.`]);
      else A.push(['media', `Costo de publicidad por pedido: S/ ${(sm('pauta') / sm('pedidos')).toFixed(2)}. Compáralo con tu utilidad por pedido en la Calculadora.`]);
    }
    const ent = sm('entregados'), dev = sm('devueltos');
    if (ent + dev >= 5 && dev / (ent + dev) > 0.25) A.push(['alta', `${Math.round(dev / (ent + dev) * 100)}% de tus pedidos terminados fueron devoluciones. Confirma mejor cada pedido antes de despachar.`]);
    const imp = FALTA.flatMap(g => g[1]).filter(x => x[2] === 'alta' && !t.falta[x[0]]);
    if (imp.length) A.push(['media', `Te faltan ${imp.length} puntos importantes en «Qué falta». El siguiente: ${imp[0][1]}.`]);
    const sug = t.lista.length ? PLANTILLA.filter(p => !t.lista.some(x => x.t === p.t)) : [];
    return { A, sug, cump };
  }

  function anaHtml() {
    const { A, sug } = analisis(), cl = { alta: ['Atender ya', 'rv-no'], media: ['Revisar', 'rv-mid'], ok: ['Bien', 'rv-ok'] };
    const ord = ['alta', 'media', 'ok'];
    return `<div class="card"><h3>Análisis de tus últimos 7 días</h3><p class="note">Se calcula con tus tareas marcadas y tu Registro. Lo más urgente va primero.</p></div>
    ${A.sort((a, b) => ord.indexOf(a[0]) - ord.indexOf(b[0])).map(([n, tx]) => `<div class="card"><span class="rv ${cl[n][1]}">${cl[n][0]}</span> <span>${esc(tx)}</span></div>`).join('')}
    ${sug.length ? `<div class="card"><h3>Tareas que te faltan en la agenda</h3><p class="note">Son tareas recomendadas que no tienes. Agrégalas con un toque.</p>${sug.map((x, i) => `<div class="it"><div class="it-h"><b>${esc(x.h)} · ${esc(x.t)}</b></div><div class="it-s">${esc(nom(x.p))} · ${esc(x.c)} · ${esc(repTxt(x))}</div><div class="it-s">${esc(x.n)}</div><div class="it-a" style="margin:0"><button class="btn btn-sm btn-pri" data-sg="${i}">Agregar</button></div></div>`).join('')}${sug.length > 1 ? '<button class="btn btn-pri" id="tp-sgall" style="margin-top:10px">Agregar todas</button>' : ''}</div>` : ''}`;
  }

  function ajustesHtml() {
    const t = E();
    return `<div class="card"><h3>Nombres del equipo</h3><div class="row"><div class="field"><label>Persona 1</label><input data-n="0" type="text" maxlength="30" value="${esc(t.personas[0])}"></div><div class="field"><label>Persona 2</label><input data-n="1" type="text" maxlength="30" value="${esc(t.personas[1])}"></div></div></div>
    <div class="card"><h3>Empezar de cero</h3><p class="sub">Borra todo el historial: tareas marcadas, Registro del día, «Qué falta» y «Aprender». La agenda y los nombres se conservan.</p><button class="btn btn-del" id="tp-cero">Borrar historial</button></div>
    <div class="card"><h3>Volver a la agenda original</h3><p class="sub">Borra tus cambios en las tareas y deja la agenda que venía de fábrica. Lo ya marcado como hecho se conserva.</p><button class="btn btn-del" id="tp-reset">Restaurar agenda</button></div>`;
  }

  function vista(el) {
    const t = E();
    const tabs = { hoy: 'Hoy', plan: 'Plan semanal', falta: 'Qué falta', ana: 'Análisis', apr: 'Aprender', reg: 'Registro', aj: 'Ajustes' };
    el.innerHTML = `${secH('tareas', 'Tareas diarias', 'La agenda del día para los dos, paso a paso', tab === 'hoy' ? '<button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Tarea</button>' : '')}
    <div class="chips" id="tp-t">${Object.entries(tabs).map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    ${{ hoy: hoyHtml, plan: planHtml, falta: faltaHtml, ana: anaHtml, apr: aprHtml, reg: regHtml, aj: ajustesHtml }[tab]()}`;
    el.querySelectorAll('#tp-t [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    const nv = $('#nuevo'); if (nv) nv.onclick = () => openForm('Nueva tarea', campos(), { f: fecha || hoy(), r: 'dias', dias: TODOS }, v => t.lista.push({ id: uid(), ...guardarForm(v) }));
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { fecha = b.dataset.m === '0' ? null : mover(fecha || hoy(), +b.dataset.m); render(); });
    el.querySelectorAll('#tp-f [data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; render(); });
    el.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { const f = fecha || hoy(), a = (t.hechas[f] = t.hechas[f] || []); const k = i.dataset.k; t.hechas[f] = i.checked ? [...new Set([...a, k])] : a.filter(x => x !== k); Store.save(); render(); });
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const x = t.lista.find(y => y.id === b.dataset.e); openForm('Editar tarea', campos(), { ...x, r: x.r === 'una' ? 'una' : 'dias', dias: diasDe(x) }, v => Object.assign(x, guardarForm(v))); });
    el.querySelectorAll('#view [data-d]').forEach(b => { if (b.closest('#tp-d')) b.onclick = () => { diaPlan = +b.dataset.d; render(); }; else b.onclick = () => confirmDel('¿Quitar esta tarea?', () => { t.lista = t.lista.filter(y => y.id !== b.dataset.d); }); });
    el.querySelectorAll('[data-fa]').forEach(i => i.onchange = () => { t.falta[i.dataset.fa] = i.checked; Store.save(); render(); });
    el.querySelectorAll('[data-ap]').forEach(i => i.onchange = () => { t.apr[i.dataset.ap] = i.checked; Store.save(); render(); });
    el.querySelectorAll('[data-r]').forEach(i => i.onchange = () => { const f = hoy(); t.reg[f] = t.reg[f] || {}; t.reg[f][i.dataset.r] = i.dataset.r === 'nota' ? i.value.trim() : num(i.value); Store.save(); render(); });
    el.querySelectorAll('[data-n]').forEach(i => i.onchange = () => { t.personas[+i.dataset.n] = i.value.trim() || 'Persona ' + (+i.dataset.n + 1); Store.save(); render(); });
    const sg = analisis().sug, addSg = x => t.lista.push({ id: uid(), h: x.h, d: x.d, p: x.p, c: x.c, t: x.t, n: x.n, r: x.r });
    el.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => { addSg(sg[+b.dataset.sg]); Store.save(); toast('Tarea agregada'); render(); });
    const sa = $('#tp-sgall'); if (sa) sa.onclick = () => { sg.forEach(addSg); Store.save(); toast('Tareas agregadas'); render(); };
    const cz = $('#tp-cero'); if (cz) cz.onclick = () => confirmDel('¿Borrar todo el historial de Tareas diarias? No se puede deshacer.', () => { t.hechas = {}; t.falta = {}; t.reg = {}; t.apr = {}; });
    const rs = $('#tp-reset'); if (rs) rs.onclick = () => confirmDel('¿Restaurar la agenda original? Se pierden tus cambios en las tareas.', () => { t.lista = PLANTILLA.map(x => ({ id: uid(), ...x })); });
  }
  window.Tareas = { vista };
  if ((location.hash || '').slice(1) === 'tareas') render();
})();
