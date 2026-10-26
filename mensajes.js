'use strict';
/* DROPOX — Estructura de mensajes: el camino de una venta por WhatsApp y mensajes listos para copiar, con tus datos del producto. */
(() => {
  // Etapas del camino de una venta por WhatsApp o Messenger
  const ETAPAS = [
    ['bienvenida', 'Bienvenida', 'Responder rápido y dar confianza', 'Contesta en menos de 15 minutos. Saluda por su nombre, preséntate y haz UNA pregunta fácil. No mandes el precio en el primer mensaje si no lo pidieron.'],
    ['descubrir', 'Entender qué busca', 'Saber para qué lo quiere', 'Una o dos preguntas cortas. Con la respuesta le explicas el beneficio que a esa persona le importa.'],
    ['producto', 'Presentar el producto', 'Mostrar el beneficio, no la lista de características', 'Foto o video corto, 3 beneficios y cómo se usa. Mensajes cortos: nadie lee un párrafo largo en WhatsApp.'],
    ['precio', 'Precio y oferta', 'Decir el precio junto con lo que incluye', 'Da el precio, la oferta y el envío en un solo mensaje. Menciona que paga al recibir. Termina con una pregunta que lleve al pedido.'],
    ['objeciones', 'Dudas y objeciones', 'Quitar el miedo sin presionar', 'Responde con calma, con datos reales y sin prometer lo que no puedes cumplir. Después de resolver la duda, vuelve a invitar al pedido.'],
    ['cierre', 'Tomar el pedido', 'Conseguir los datos de entrega', 'Pide todos los datos en un solo mensaje, con formato fácil de copiar. Confirma lo que va a recibir y cuánto pagará.'],
    ['confirmacion', 'Confirmación del pedido', 'Evitar entregas fallidas', 'Repite los datos, avisa cuándo llegará y pide que alguien esté disponible para recibir. Es la clave para bajar las devoluciones.'],
    ['envio', 'Seguimiento del envío', 'Mantener al cliente informado', 'Avisa cuando sale el pedido y el día de la entrega. Si hay retraso, avísalo tú primero.'],
    ['postventa', 'Después de la entrega', 'Pedir opinión y volver a vender', 'Pregunta si todo salió bien, pide una foto o comentario y ofrece un producto que combine.'],
    ['recuperar', 'Recuperar al que no respondió', 'Dar un segundo empujón amable', 'Escribe a las 3 horas, al día siguiente y a los 3 días. Máximo tres intentos, cada uno con un motivo distinto.'],
    ['comentarios', 'Comentarios en publicaciones', 'Pasar el comentario a un chat', 'Responde cada comentario. No pongas el precio en público: invita a escribir por mensaje privado o WhatsApp.'],
    ['negocio', 'Configuración de WhatsApp Business', 'Que el chat trabaje aunque no estés', 'Mensaje de bienvenida, mensaje de ausencia y respuestas rápidas con atajos (por ejemplo /precio, /envio).'],
  ];
  const M = (e, id, t, x) => ({ id, e, t, x });
  const BASE = [
    M('bienvenida', 'b1', 'Primera respuesta', '¡Hola {cliente}! 👋 Gracias por escribir a {negocio}. Soy {asesor}. ¿Te interesa el {producto}? Cuéntame y te ayudo.'),
    M('bienvenida', 'b2', 'Cuando preguntan «precio» sin más', '¡Hola {cliente}! Claro que sí 😊 Para darte la mejor opción, ¿es para ti o es un regalo?'),
    M('bienvenida', 'b3', 'Cuando vienen de un anuncio', '¡Hola {cliente}! Gracias por escribir 🙌 Vi que te interesó el {producto}. ¿Quieres que te cuente cómo funciona y qué incluye?'),
    M('descubrir', 'd1', 'Pregunta de necesidad', '¿Para qué lo quieres usar principalmente? Así te digo si es lo que necesitas.'),
    M('descubrir', 'd2', 'Pregunta sobre el uso', '¿Lo usarías en casa, en el trabajo o para llevarlo contigo?'),
    M('producto', 'p1', 'Presentación corta', 'El {producto} te ayuda a {beneficio1}.\n✅ {beneficio1}\n✅ {beneficio2}\n✅ {beneficio3}\nTe mando una foto y un video para que lo veas 👇'),
    M('producto', 'p2', 'Cómo se usa', 'Es muy fácil de usar: {como_se_usa}. Si tienes alguna duda, yo te explico por aquí.'),
    M('precio', 'pr1', 'Precio con oferta y envío', 'Hoy el {producto} está en {oferta} 🎁\n🚚 {envio}\n💵 Pagas al recibir en tu casa ({pago}).\n¿Te separo uno?'),
    M('precio', 'pr2', 'Oferta de 2 unidades', 'Si te llevas 2 te sale más barato: {oferta2}. Es ideal para regalar o para tener uno de repuesto. ¿Cuál prefieres, 1 o 2?'),
    M('objeciones', 'o1', '«Está caro»', 'Te entiendo, {cliente} 🙏 Por eso ahora tiene la oferta de {oferta} y el envío ya está incluido. Además {garantia}. ¿Te animas a probarlo?'),
    M('objeciones', 'o2', '«Lo voy a pensar»', 'Claro, tómate tu tiempo 😊 Solo te cuento que {limite}. ¿Qué duda te falta resolver? Con gusto te ayudo.'),
    M('objeciones', 'o3', '«No confío / ¿cómo sé que llega?»', 'Es normal preguntarlo 🙌 Pagas SOLO cuando recibes el producto en tu mano, así no arriesgas nada. Te enviamos con {transportadora} y te aviso en cada paso.'),
    M('objeciones', 'o4', '«¿Cuánto demora?»', 'En Lima llega en {tiempo_lima} y a provincia en {tiempo_provincia}. Apenas salga tu pedido te aviso con el código de seguimiento.'),
    M('objeciones', 'o5', '«¿Tiene garantía? ¿Se puede cambiar?»', 'Sí. {garantia} Si llega con algún problema, me escribes por aquí el mismo día y lo resolvemos.'),
    M('objeciones', 'o6', '«¿Envían a mi ciudad / provincia?»', '¡Sí, enviamos a todo el Perú! 🇵🇪 Dime tu departamento, provincia y distrito para confirmar la entrega y el tiempo.'),
    M('objeciones', 'o7', '«No tengo plata ahora»', 'Sin problema 😊 Pagas recién al recibirlo. Si prefieres, te lo reservo y me confirmas cuando puedas. ¿Te lo separo?'),
    M('cierre', 'c1', 'Pedir los datos', '¡Perfecto, {cliente}! Para tu pedido necesito estos datos 👇\n1) Nombre completo:\n2) DNI:\n3) Celular:\n4) Departamento, provincia y distrito:\n5) Dirección y una referencia:\n6) Cantidad:'),
    M('cierre', 'c2', 'Cuando envía los datos incompletos', 'Gracias 🙌 Me falta {dato_faltante} para poder enviarlo. ¿Me lo puedes escribir?'),
    M('confirmacion', 'cf1', 'Confirmar el pedido', '✅ Pedido confirmado\nProducto: {producto}\nCantidad: {cantidad}\nTotal a pagar al recibir: {total}\nEntrega a: {direccion}\nLlega en: {tiempo}\nPor favor, que alguien esté disponible para recibirlo. ¡Gracias por tu compra!'),
    M('confirmacion', 'cf2', 'Un día antes de la entrega', 'Hola {cliente} 👋 Mañana te entregamos tu {producto}. Recuerda tener {total} listo y a alguien en casa. ¿Confirmas que estarás?'),
    M('envio', 'e1', 'Pedido en camino', 'Tu pedido ya salió 🚚 Te llega el {fecha_entrega}. Código de seguimiento: {codigo}. Cualquier consulta, me escribes.'),
    M('envio', 'e2', 'Aviso de retraso', 'Hola {cliente}, quería avisarte que tu pedido se retrasó un poco por {motivo}. Llegará el {fecha_entrega}. Disculpa la demora y gracias por tu paciencia 🙏'),
    M('envio', 'e3', 'Llegó a la agencia para recoger', 'Tu pedido ya llegó a la agencia de {agencia} en {ciudad}. Puedes recogerlo con tu DNI y pagando {total}. El horario es {horario_agencia}.'),
    M('postventa', 'pv1', 'Preguntar si llegó bien', 'Hola {cliente} 😊 ¿Te llegó bien tu {producto}? Cuéntame cómo te fue.'),
    M('postventa', 'pv2', 'Pedir una foto o comentario', '¡Qué bueno! 🙌 ¿Nos regalas una foto o un comentario contando tu experiencia? Nos ayuda mucho a otras personas a decidirse.'),
    M('postventa', 'pv3', 'Ofrecer otro producto', 'Como compraste el {producto}, te puede servir {producto_extra}. Para clientes como tú tiene un precio especial: {oferta_extra}. ¿Te lo muestro?'),
    M('recuperar', 'r1', 'A las 3 horas', 'Hola {cliente} 👋 ¿Pudiste ver la información del {producto}? Si tienes alguna duda, dime y te ayudo.'),
    M('recuperar', 'r2', 'Al día siguiente', 'Hola {cliente}, te escribo porque {limite}. ¿Quieres que te separe uno?'),
    M('recuperar', 'r3', 'A los 3 días (último)', 'Hola {cliente} 😊 Última vez que te escribo para no molestarte: la oferta del {producto} termina pronto. Si te interesa, aquí estoy. ¡Que tengas un lindo día!'),
    M('comentarios', 'cm1', 'Responder «precio» en un comentario', 'Hola {cliente} 👋 Te escribimos por mensaje privado con toda la información. ¡Revisa tu bandeja!'),
    M('comentarios', 'cm2', 'Responder «¿hacen envíos?»', '¡Sí, enviamos a todo el Perú! 🇵🇪 Escríbenos por WhatsApp {whatsapp} y pagas al recibir.'),
    M('comentarios', 'cm3', 'Responder un comentario positivo', '¡Gracias, {cliente}! 💜 Nos alegra mucho que te guste. Cualquier duda, aquí estamos.'),
    M('comentarios', 'cm4', 'Responder un comentario negativo', 'Lamentamos lo que pasó, {cliente} 🙏 Queremos ayudarte. Escríbenos por mensaje privado y lo resolvemos hoy.'),
    M('negocio', 'n1', 'Mensaje de bienvenida (WhatsApp Business)', '¡Hola! 👋 Gracias por escribir a {negocio}. Cuéntanos qué producto te interesa y en un momento te atendemos. Horario: {horario}.'),
    M('negocio', 'n2', 'Mensaje de ausencia', 'Gracias por escribirnos 🙏 En este momento no estamos disponibles. Nuestro horario es {horario}. Te respondemos apenas volvamos.'),
    M('negocio', 'n3', 'Respuesta rápida «/precio»', 'El {producto} está en {oferta}. Envío: {envio}. Pagas al recibir. ¿Te lo separo?'),
    M('negocio', 'n4', 'Respuesta rápida «/envio»', 'Enviamos a todo el Perú 🇵🇪 Lima: {tiempo_lima}. Provincia: {tiempo_provincia}. Pagas al recibir.'),
  ];
  const DATOS = [
    ['negocio', 'Nombre del negocio', 'Ej. D\' RAYO'], ['asesor', 'Tu nombre (quien atiende)', 'Ej. Daniel'], ['producto', 'Producto', 'Ej. Set Llave y Corazón'],
    ['beneficio1', 'Beneficio 1', 'Ej. un regalo que dura para siempre'], ['beneficio2', 'Beneficio 2', ''], ['beneficio3', 'Beneficio 3', ''], ['como_se_usa', 'Cómo se usa', ''],
    ['oferta', 'Precio u oferta', 'Ej. S/ 79'], ['oferta2', 'Oferta por 2 unidades', 'Ej. 2 por S/ 129'], ['envio', 'Envío', 'Ej. Envío gratis a todo el Perú'], ['pago', 'Forma de pago', 'Ej. pago contra entrega'],
    ['garantia', 'Garantía o cambio', 'Ej. tienes 7 días para cambio si llega con falla'], ['limite', 'Motivo de urgencia real', 'Ej. quedan pocas unidades con este precio'],
    ['transportadora', 'Transportadora', 'Ej. Shalom'], ['tiempo_lima', 'Tiempo en Lima', 'Ej. 24 a 48 horas'], ['tiempo_provincia', 'Tiempo en provincia', 'Ej. 3 a 5 días'],
    ['horario', 'Horario de atención', 'Ej. lunes a sábado de 8 am a 8 pm'], ['whatsapp', 'Tu WhatsApp', 'Ej. 987 654 321'],
  ];
  let tab = 'flujo', etapa = '';
  const datos = () => { const m = (S.mensajes = S.mensajes || {}); m.datos = m.datos || {}; m.edit = m.edit || {}; m.extra = m.extra || []; return m; };
  const lista = () => { const m = datos(); return BASE.map(b => ({ ...b, x: m.edit[b.id] != null ? m.edit[b.id] : b.x, editado: m.edit[b.id] != null })).concat(m.extra.map(x => ({ ...x, propio: 1 }))); };
  const lleno = txt => { const d = datos().datos; return txt.replace(/\{(\w+)\}/g, (a, k) => (d[k] && d[k].trim()) || '[' + k.replace(/_/g, ' ') + ']'); };
  const copiar = (t, m) => (navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast(m), () => toast('No se pudo copiar')) : toast('No se pudo copiar'));
  const nombreEtapa = e => (ETAPAS.find(x => x[0] === e) || [])[1] || e;

  function flujoHtml() {
    return `<p class="rk-p">El camino de una venta por WhatsApp tiene 12 pasos. Toca un paso para ver sus mensajes listos para copiar.</p>
    ${ETAPAS.map(([k, t, obj, tip], i) => `<div class="card" style="cursor:pointer" data-go="${k}"><div class="it-h"><b>${i + 1}. ${esc(t)}</b><span class="tag">${lista().filter(x => x.e === k).length} mensajes</span></div><div class="it-s"><b>Objetivo:</b> ${esc(obj)}</div><div class="it-s">${esc(tip)}</div></div>`).join('')}`;
  }
  function msgHtml() {
    const L = lista().filter(x => !etapa || x.e === etapa);
    return `<div class="chips"><button class="chip ${etapa === '' ? 'on' : ''}" data-et="">Todos</button>${ETAPAS.map(([k, t]) => `<button class="chip ${etapa === k ? 'on' : ''}" data-et="${k}">${esc(t)}</button>`).join('')}</div>
    <p class="note" style="margin:0 0 10px">Las partes entre corchetes [así] se llenan con tus datos en la pestaña «Mis datos». Lo que no llenes queda entre corchetes para que lo escribas al enviar.</p>
    ${L.map(x => `<div class="card"><div class="it-h"><b>${esc(x.t)}</b><span class="tag">${esc(nombreEtapa(x.e))}</span></div><pre class="prompt" style="max-height:none;font-family:inherit;font-size:13.5px;margin:8px 0">${esc(lleno(x.x))}</pre><div class="it-a" style="margin:0"><button class="btn btn-sm btn-pri" data-cp="${x.id}">Copiar</button><button class="btn btn-sm" data-ed="${x.id}">Editar</button>${x.editado ? `<button class="btn btn-sm" data-rs="${x.id}">Restaurar</button>` : ''}${x.propio ? `<button class="btn btn-sm btn-del" data-del="${x.id}">✕</button>` : ''}</div></div>`).join('') || '<div class="card empty">No hay mensajes en este paso.</div>'}`;
  }
  function datosHtml() {
    const d = datos().datos;
    return `<div class="card"><h3>Mis datos</h3><p class="sub">Llénalos una vez y todos los mensajes salen con tu producto, tu precio y tu forma de envío.</p>
      ${DATOS.map(([k, l, ph]) => `<div class="field" style="margin:8px 0"><label>${esc(l)}</label><input data-v="${k}" type="text" maxlength="160" placeholder="${esc(ph)}" value="${esc(d[k] || '')}"></div>`).join('')}</div>`;
  }

  function vista(el) {
    const m = datos();
    const tabs = { flujo: 'Estructura', msg: 'Mensajes', datos: 'Mis datos' };
    el.innerHTML = `${secH('mensajes', 'Estructura de mensajes', 'El camino de la venta por WhatsApp y mensajes listos para copiar', tab === 'msg' ? '<button class="btn btn-pri" id="nuevo" style="white-space:nowrap">+ Mensaje</button>' : '')}
    <div class="chips" id="ms-t">${Object.entries(tabs).map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    ${{ flujo: flujoHtml, msg: msgHtml, datos: datosHtml }[tab]()}`;
    el.querySelectorAll('#ms-t [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { etapa = b.dataset.go; tab = 'msg'; render(); scrollTo(0, 0); });
    el.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { etapa = b.dataset.et; render(); });
    el.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => copiar(lleno(lista().find(x => x.id === b.dataset.cp).x), 'Mensaje copiado'));
    el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.ed); openForm('Editar mensaje', [{ k: 't', l: 'Título', full: 1 }, { k: 'x', l: 'Texto (usa {producto}, {cliente}, {oferta}…)', full: 1 }], { t: x.t, x: x.x }, v => { if (x.propio) Object.assign(m.extra.find(y => y.id === x.id), v); else m.edit[x.id] = v.x; }); });
    el.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { delete m.edit[b.dataset.rs]; Store.save(); render(); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmDel('¿Quitar este mensaje?', () => { m.extra = m.extra.filter(y => y.id !== b.dataset.del); }));
    const nv = $('#nuevo'); if (nv) nv.onclick = () => openForm('Nuevo mensaje', [{ k: 'e', l: 'Paso', t: 'select', opts: Object.fromEntries(ETAPAS.map(x => [x[0], x[1]])), def: etapa || 'bienvenida' }, { k: 't', l: 'Título', req: 1, full: 1 }, { k: 'x', l: 'Texto', req: 1, full: 1 }], { e: etapa || 'bienvenida' }, v => m.extra.push({ id: uid(), ...v }));
    el.querySelectorAll('[data-v]').forEach(i => i.onchange = () => { m.datos[i.dataset.v] = i.value; Store.save(); });
  }
  window.Mensajes = { vista };
  if ((location.hash || '').slice(1) === 'mensajes') render();
})();
