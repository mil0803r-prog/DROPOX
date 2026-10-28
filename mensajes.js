'use strict';
/* DROPOX — Estructura de mensajes: el camino de una venta por WhatsApp y mensajes listos para copiar, con tus datos del producto. */
(() => {
  // Etapas del camino de una venta por WhatsApp o Messenger
  const ETAPAS = [
    ['bienvenida', 'Bienvenida', 'Responder rápido y dar confianza', 'Contesta en menos de 15 minutos. Saluda por su nombre, preséntate y haz UNA pregunta fácil. No mandes el precio en el primer mensaje si no lo pidieron.'],
    ['descubrir', 'Entender qué busca', 'Saber para qué lo quiere', 'Una o dos preguntas cortas. Con la respuesta le explicas el beneficio que a esa persona le importa.'],
    ['producto', 'Presentar el producto', 'Mostrar el beneficio, no la lista de características', 'Foto o video corto, 3 beneficios y cómo se usa. Mensajes cortos: nadie lee un párrafo largo en WhatsApp.'],
    ['precio', 'Precio y oferta', 'Decir el precio junto con lo que incluye', 'Da el precio, la oferta y el envío en un solo mensaje. Menciona que paga al recibir. Termina con una pregunta que lleve al pedido.'],
    ['objeciones', 'Dudas y objeciones', 'Quitar el miedo sin presionar', 'Si te dejan en visto o responden solo «ok», casi siempre es duda o desconfianza, no desinterés: haz una pregunta fácil de contestar y explica el porqué del precio, del envío y del adelanto. Responde con calma, con datos reales y sin prometer lo que no puedes cumplir. Después de resolver la duda, vuelve a invitar al pedido.'],
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
    M('precio', 'pr1', 'Precio y formas de envío', 'Hoy el {producto} está en {oferta} con envío gratis 🎁\nTienes 2 opciones:\n1️⃣ {transportadora}: contra entrega. Separas con {adelanto} de adelanto y el resto ({saldo}) lo pagas al recibir.\n2️⃣ {envio_alt}: pago anticipado de {oferta}.\n¿Cuál prefieres?'),
    M('precio', 'pr2', 'Oferta de 2 unidades', 'Si te llevas 2 te sale más barato: {oferta2}. Es ideal para regalar o para tener uno de repuesto. ¿Cuál prefieres, 1 o 2?'),
    M('cierre', 'c1', 'Pedir los datos', '¡Perfecto, {cliente}! Para tu pedido necesito estos datos 👇\n1) Nombre completo:\n2) DNI:\n3) Celular:\n4) Departamento, provincia y distrito:\n5) Dirección y una referencia:\n6) Cantidad:'),
    M('cierre', 'c3', 'Pedir el adelanto (Shalom contra entrega)', 'Para separar tu pedido necesito el adelanto de {adelanto} 🙌\nPuedes pagar por {cuenta_pago}.\nCuando lo hagas, envíame la captura. El saldo de {saldo} lo pagas al recibirlo en la agencia {transportadora}.'),
    M('cierre', 'c7', 'Enviar los métodos de pago (adelanto Shalom)', 'Para separar tu pedido, el adelanto es de {adelanto} 💳\nPuedes pagar por:\n• Yape: {yape}\n• Plin: {plin}\n• Transferencia: {cuenta_banco}\nTitular: {titular}\nCuando pagues, envíame la captura. El saldo de {saldo} lo pagas al recibir en la agencia {transportadora}.'),
    M('cierre', 'c4', 'Ofrecer Olva o bus (pago anticipado)', 'Si en tu ciudad no hay agencia {transportadora}, lo enviamos por {envio_alt}. En ese caso el pago es anticipado: {oferta} con envío gratis, por {cuenta_pago}. Cuando pagues, envíame la captura y despachamos. ¿Te sirve?'),
    M('cierre', 'c5', 'Datos para agencia (Shalom, Olva o bus)', '¡Perfecto, {cliente}! Para enviarlo necesito 👇\n1) Nombre completo:\n2) DNI:\n3) Celular:\n4) Ciudad y agencia donde recogerás:\n5) Cantidad:'),
    M('cierre', 'c6', 'Confirmar que llegó el pago', '✅ Recibimos tu pago, {cliente}. Tu pedido queda registrado y te aviso apenas salga con el código de seguimiento. ¡Gracias!'),
    M('cierre', 'c6b', 'Pago recibido: corto y directo', '✅ Pago recibido, {cliente}. ¡Gracias! Ya está tu pedido separado.'),
    M('cierre', 'c6c', 'Pago recibido: cálido, con lo que sigue', '¡Listo, {cliente}! 🙌 Ya vi tu comprobante y tu pago está confirmado. Ahora preparo tu {producto} y apenas salga te aviso con el código de seguimiento.'),
    M('cierre', 'c6d', 'Pago recibido: pedir confirmar los datos', 'Recibí tu pago ✅ Antes de despachar, confírmame que estos datos están bien 👇\nNombre: {cliente}\nCiudad: {ciudad}\nProducto: {producto}\nSi todo está correcto, respóndeme «OK» y lo despacho hoy.'),
    M('cierre', 'c6e', 'Pago recibido: cuándo se despacha', '✅ Tu pago llegó, {cliente}. Tu pedido sale {fecha_despacho} y te mando el código de seguimiento apenas salga. Cualquier duda, me escribes por aquí.'),
    M('cierre', 'c6f', 'Pago recibido: agradecer y generar confianza', 'Muchas gracias por tu confianza, {cliente} 💜 Ya tengo tu pago registrado. Cuida tu celular porque te escribiré con el seguimiento de tu {producto}. Si necesitas algo, aquí estoy.'),
    M('cierre', 'c2', 'Cuando envía los datos incompletos', 'Gracias 🙌 Me falta {dato_faltante} para poder enviarlo. ¿Me lo puedes escribir?'),
    M('confirmacion', 'cf1', 'Confirmar el pedido (Shalom)', '✅ Pedido confirmado\nProducto: {producto}\nCantidad: {cantidad}\nTotal: {oferta} (envío gratis)\nAdelanto recibido: {adelanto}\nSaldo a pagar al recibir en la agencia: {saldo}\nAgencia {transportadora}: {agencia} en {ciudad}\nTe aviso apenas salga con el código de seguimiento. ¡Gracias por tu compra!'),
    M('confirmacion', 'cf2', 'Aviso antes de recoger', 'Hola {cliente} 👋 Tu {producto} ya está por llegar a la agencia. Recuerda llevar tu DNI y {saldo} para el pago del saldo. ¿Confirmas que podrás recogerlo?'),
    M('envio', 'e1', 'Pedido en camino', 'Tu pedido ya salió 🚚 Te llega el {fecha_entrega}. Código de seguimiento: {codigo}. Cualquier consulta, me escribes.'),
    M('envio', 'e2', 'Aviso de retraso', 'Hola {cliente}, quería avisarte que tu pedido se retrasó un poco por {motivo}. Llegará el {fecha_entrega}. Disculpa la demora y gracias por tu paciencia 🙏'),
    M('envio', 'e3', 'Llegó a la agencia para recoger', 'Tu pedido ya llegó a la agencia de {agencia} en {ciudad}. Puedes recogerlo con tu DNI y pagando el saldo de {saldo}. El horario es {horario_agencia}.'),
    M('postventa', 'pv1', 'Preguntar si llegó bien', 'Hola {cliente} 😊 ¿Te llegó bien tu {producto}? Cuéntame cómo te fue.'),
    M('postventa', 'pv2', 'Pedir una foto o comentario', '¡Qué bueno! 🙌 ¿Nos regalas una foto o un comentario contando tu experiencia? Nos ayuda mucho a otras personas a decidirse.'),
    M('postventa', 'pv3', 'Ofrecer otro producto', 'Como compraste el {producto}, te puede servir {producto_extra}. Para clientes como tú tiene un precio especial: {oferta_extra}. ¿Te lo muestro?'),
    M('recuperar', 'r1', 'A las 3 horas', 'Hola {cliente} 👋 ¿Pudiste ver la información del {producto}? Si tienes alguna duda, dime y te ayudo.'),
    M('recuperar', 'r2', 'Al día siguiente', 'Hola {cliente}, te escribo porque {limite}. ¿Quieres que te separe uno?'),
    M('recuperar', 'r3', 'A los 3 días (último)', 'Hola {cliente} 😊 Última vez que te escribo para no molestarte: la oferta del {producto} termina pronto. Si te interesa, aquí estoy. ¡Que tengas un lindo día!'),
    M('comentarios', 'cm1', 'Responder «precio» en un comentario', 'Hola {cliente} 👋 Te escribimos por mensaje privado con toda la información. ¡Revisa tu bandeja!'),
    M('comentarios', 'cm2', 'Responder «¿hacen envíos?»', '¡Sí, enviamos a todo el Perú con envío gratis! 🇵🇪 Escríbenos por WhatsApp {whatsapp} y te explicamos cómo separar tu pedido.'),
    M('comentarios', 'cm3', 'Responder un comentario positivo', '¡Gracias, {cliente}! 💜 Nos alegra mucho que te guste. Cualquier duda, aquí estamos.'),
    M('comentarios', 'cm4', 'Responder un comentario negativo', 'Lamentamos lo que pasó, {cliente} 🙏 Queremos ayudarte. Escríbenos por mensaje privado y lo resolvemos hoy.'),
    M('negocio', 'n1', 'Mensaje de bienvenida (WhatsApp Business)', '¡Hola! 👋 Gracias por escribir a {negocio}. Cuéntanos qué producto te interesa y en un momento te atendemos. Horario: {horario}.'),
    M('negocio', 'n2', 'Mensaje de ausencia', 'Gracias por escribirnos 🙏 En este momento no estamos disponibles. Nuestro horario es {horario}. Te respondemos apenas volvamos.'),
    M('negocio', 'n3', 'Respuesta rápida «/precio»', 'El {producto} está en {oferta} con envío gratis. Con {transportadora}: adelanto de {adelanto} y pagas {saldo} al recibir. Con {envio_alt}: pago anticipado. ¿Te lo separo?'),
    M('negocio', 'n4', 'Respuesta rápida «/envio»', 'Enviamos a todo el Perú 🇵🇪 El envío es gratis. Por {transportadora} (contra entrega con adelanto de {adelanto}): {tiempo_provincia}. Por {envio_alt}: pago anticipado.'),
  ];
  // Desde que el cliente dice su agencia (dudas, cierre, confirmación, envío) cada transportadora tiene su estructura.
  // Del inicio al precio, y lo demás, es común: los mensajes que no están en SHALOM ni en T() sirven para las tres.
  const SHALOM = new Set(['o3', 'o4', 'o7', 'ob5', 'ob6', 'ob7', 'ob8', 'ob9', 'ob10', 'ob11', 'c1', 'c3', 'c7', 'c5', 'cf1', 'cf2', 'e3']);
  BASE.forEach(b => { b.c = SHALOM.has(b.id) ? 'shalom' : 'all'; });
  const T = (c, e, id, t, x) => BASE.push({ ...M(e, id, t, x), c });
  // OLVA — pago anticipado, guía y número de seguimiento
  T('olva', 'cierre', 'ol10', 'Pedir los datos (Olva)', '¡Perfecto, {cliente}! Para enviarlo por Olva necesito 👇\n1) Nombre completo:\n2) DNI:\n3) Celular:\n4) Departamento, provincia y distrito:\n5) Dirección y una referencia:\n6) Cantidad:');
  T('olva', 'cierre', 'ol11', 'Pedir el pago (Olva)', 'Para despachar tu pedido: {oferta} (envío gratis) por {cuenta_pago}. Cuando pagues, envíame la captura y lo enviamos por Olva 🚚');
  T('olva', 'cierre', 'ol16', 'Enviar los métodos de pago (Olva)', 'Para despachar tu pedido, el total es {oferta} (envío gratis) 💳\nPuedes pagar por:\n• Yape: {yape}\n• Plin: {plin}\n• Transferencia: {cuenta_banco}\nTitular: {titular}\nCuando pagues, envíame la captura y lo enviamos por Olva con su guía.');
  T('olva', 'confirmacion', 'ol12', 'Confirmar pedido con pago recibido (Olva)', '✅ Pedido confirmado\nProducto: {producto}\nCantidad: {cantidad}\nPago total recibido: {oferta} (envío gratis)\nEnvío por Olva a {ciudad}\nTe envío la guía y el número de seguimiento apenas salga. ¡Gracias por tu compra!');
  T('olva', 'envio', 'ol13', 'Pedido en camino con guía (Olva)', 'Tu pedido ya salió con Olva 🚚 Número de guía: {codigo}. Puedes seguirlo en la web de Olva. Llega en {tiempo_olva} aproximadamente. Cualquier consulta, me escribes.');
  T('olva', 'envio', 'ol14', 'Ya está por llegar (Olva)', 'Hola {cliente} 👋 Tu {producto} ya está en {ciudad} con Olva. Ten tu DNI a la mano y avísame apenas lo recibas.');
  // BUSES — pago anticipado, recojo en la agencia del bus
  T('bus', 'cierre', 'bu11', 'Pedir los datos (bus)', '¡Perfecto, {cliente}! Para enviarlo por bus necesito 👇\n1) Nombre completo de quien recogerá:\n2) DNI:\n3) Celular:\n4) Ciudad y agencia donde recogerás:\n5) Cantidad:');
  T('bus', 'cierre', 'bu12', 'Pedir el pago (bus)', 'Para despachar tu pedido: {oferta} (envío gratis) por {cuenta_pago}. Cuando pagues, envíame la captura y lo mandamos hoy con {empresa_bus} 🚌');
  T('bus', 'cierre', 'bu17', 'Enviar los métodos de pago (bus)', 'Para despachar tu pedido, el total es {oferta} (envío gratis) 💳\nPuedes pagar por:\n• Yape: {yape}\n• Plin: {plin}\n• Transferencia: {cuenta_banco}\nTitular: {titular}\nCuando pagues, envíame la captura y lo mandamos con {empresa_bus}. Tú lo recoges con tu DNI.');
  T('bus', 'confirmacion', 'bu13', 'Confirmar pedido con pago recibido (bus)', '✅ Pedido confirmado\nProducto: {producto}\nCantidad: {cantidad}\nPago total recibido: {oferta} (envío gratis)\nEnvío por {empresa_bus} a la agencia de {ciudad}\nTe mando la foto de la guía apenas despachemos. ¡Gracias por tu compra!');
  T('bus', 'envio', 'bu14', 'Pedido en camino con foto de la guía (bus)', 'Tu pedido ya salió con {empresa_bus} 🚌 Te mando la foto de la guía. Código: {codigo}. Llega a la agencia de {ciudad} en {tiempo_bus} aproximadamente.');
  T('bus', 'envio', 'bu15', 'Ya llegó a la agencia del bus', 'Tu pedido ya llegó a la agencia de {empresa_bus} en {ciudad}. Recógelo con tu DNI. El horario es {horario_agencia}.');
  // Objeciones: 5 variaciones de cada una, agrupadas (ver mensajes-objeciones.js)
  (window.MSG_OBJ || []).forEach(([base, g, c, V]) => V.forEach((v, i) => {
    const [id, x] = Array.isArray(v) ? v : [i ? base + '_' + (i + 1) : base, v];
    BASE.push({ ...M('objeciones', id, g.replace(/[«»]/g, '') + ' · ' + (i + 1), x), c, g });
  }));
  const DATOS = [
    ['negocio', 'Nombre del negocio', 'Ej. D\' RAYO'], ['asesor', 'Tu nombre (quien atiende)', 'Ej. Daniel'], ['producto', 'Producto', 'Ej. Set Llave y Corazón'],
    ['beneficio1', 'Beneficio 1', 'Ej. un regalo que dura para siempre'], ['beneficio2', 'Beneficio 2', ''], ['beneficio3', 'Beneficio 3', ''], ['como_se_usa', 'Cómo se usa', ''],
    ['colores', 'Colores disponibles', 'Ej. dorado, plateado y rosado'], ['oferta', 'Precio u oferta', 'Ej. S/ 69'], ['adelanto', 'Adelanto (Shalom)', 'Ej. S/ 10'], ['saldo', 'Saldo al recibir (Shalom)', 'Ej. S/ 59'], ['envio_alt', 'Otras formas de envío (pago anticipado)', 'Ej. Olva o bus'], ['cuenta_pago', 'Dónde te pagan (resumen en una frase)', 'Ej. Yape 987 654 321'], ['yape', 'Yape (número)', 'Ej. 987 654 321'], ['plin', 'Plin (número)', 'Ej. 987 654 321'], ['cuenta_banco', 'Transferencia (banco y cuenta o CCI)', 'Ej. BCP 191-1234567-0-12'], ['titular', 'Nombre del titular', 'Ej. Daniel Pérez'], ['oferta2', 'Oferta por 2 unidades', 'Ej. 2 por S/ 129'], ['envio', 'Envío', 'Ej. Envío gratis'], ['pago', 'Forma de pago', 'Ej. contra entrega con adelanto'],
    ['garantia', 'Garantía o cambio', 'Ej. tienes 7 días para cambio si llega con falla'], ['limite', 'Motivo de urgencia real', 'Ej. quedan pocas unidades con este precio'],
    ['transportadora', 'Transportadora contra entrega', 'Ej. Shalom'], ['empresa_bus', 'Empresa de bus (encomienda)', 'Ej. Cruz del Sur / Flores / Civa'], ['tiempo_olva', 'Tiempo con Olva', 'Ej. 3 a 5 días'], ['tiempo_bus', 'Tiempo por bus', 'Ej. 2 a 4 días'], ['fecha_despacho', 'Cuándo despachas', 'Ej. hoy o mañana por la mañana'], ['tiempo_lima', 'Tiempo en Lima', 'Ej. 24 a 48 horas'], ['tiempo_provincia', 'Tiempo en provincia', 'Ej. 3 a 5 días'],
    ['horario', 'Horario de atención', 'Ej. lunes a sábado de 8 am a 8 pm'], ['whatsapp', 'Tu WhatsApp', 'Ej. 987 654 321'],
  ];
  const TRANSP = [['shalom', 'Shalom', 'Contra entrega'], ['olva', 'Olva', 'Pago anticipado'], ['bus', 'Buses', 'Pago anticipado']];
  // Texto propio de cada transportadora en los pasos que cambian (objetivo, consejo)
  const TIPS = {
    shalom: {
      objeciones: ['Quitar el miedo al adelanto y al cobro del envío', 'Las dudas típicas de Shalom: «¿por qué adelanto?», «¿es estafa?», «al final cobran el envío». Explica que el adelanto es parte del precio y que el saldo se paga al recoger. Cuando te dejen en visto, haz una pregunta fácil, nunca presiones.'],
      cierre: ['Datos y adelanto', 'Pide los datos en un solo mensaje y luego el adelanto. Con el comprobante, el pedido queda separado.'],
      confirmacion: ['Que recoja y pague el saldo', 'Repite los datos y recuérdale llevar su DNI y el saldo. Es la clave para bajar las devoluciones.'],
      envio: ['Avisar cuando llega a la agencia', 'Avisa cuando sale, cuando llega a la agencia Shalom y el horario para recoger.'],
    },
    olva: {
      objeciones: ['Quitar el miedo a pagar antes', 'La duda de Olva es «¿y si pago y no llega?». Responde con la guía y el número de seguimiento que verificará él mismo, y con pruebas de envíos reales. No prometas fechas que no controlas.'],
      cierre: ['Datos de entrega y comprobante del pago', 'Pide los datos completos (con dirección y referencia) y luego el pago. Despacha solo cuando llegue la captura.'],
      confirmacion: ['Confirmar el pago y prometer la guía', 'Confirma que recibiste el pago y que le enviarás la guía con el número de seguimiento.'],
      envio: ['Compartir la guía y el seguimiento', 'Manda la guía apenas salga, avisa cuando esté por llegar y si hay retraso avísalo tú primero.'],
    },
    bus: {
      objeciones: ['Quitar el miedo a que no llegue', 'Las dudas típicas del bus: «¿y si no llega?», «¿dónde lo recojo?», «¿hay agencia en mi ciudad?». Manda la foto de la guía y confirma la agencia antes de cobrar.'],
      cierre: ['Datos de quien recoge y comprobante del pago', 'Pide nombre, DNI, celular y la agencia donde recogerá. Despacha solo cuando llegue la captura del pago.'],
      confirmacion: ['Confirmar el pago y la agencia', 'Confirma el pago, la empresa de bus y la agencia de destino, y promete la foto de la guía.'],
      envio: ['Foto de la guía y aviso de llegada', 'Manda la foto de la guía apenas despaches y avisa cuando llegue a la agencia para que lo recoja.'],
    },
  };
  const FAV = '__fav';
  const abiertos = new Set();
  const ETAPAS_TR = ['objeciones', 'cierre', 'confirmacion', 'envio'];
  const selTr = () => `<div class="tr-sel" id="ms-tr">${TRANSP.map(([k, l, d]) => `<button class="tr-b ${tr() === k ? 'on' : ''}" data-tr="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>`;
  let tab = 'flujo', etapa = '';
  const paso = () => (etapa && etapa !== FAV ? etapa : 'bienvenida');
  const datos = () => { const m = (S.mensajes = S.mensajes || {}); m.datos = m.datos || {}; m.edit = m.edit || {}; m.extra = m.extra || []; m.fav = m.fav || {}; if (!m.base1) { m.base1 = 1; const d = { oferta: 'S/ 69', adelanto: 'S/ 10', saldo: 'S/ 59', envio: 'Envío gratis', pago: 'Shalom contra entrega con adelanto de S/ 10; Olva o bus con pago anticipado', transportadora: 'Shalom', envio_alt: 'Olva o agencia de buses' }; Object.keys(d).forEach(k => { if (!m.datos[k]) m.datos[k] = d[k]; }); } return m; };
  const tr = () => datos().tr || 'shalom';
  const lista = () => { const m = datos(); const t = tr(); return BASE.filter(b => b.c === 'all' || b.c === t).map(b => ({ ...b, x: m.edit[b.id] != null ? m.edit[b.id] : b.x, editado: m.edit[b.id] != null, fav: !!m.fav[b.id] })).concat(m.extra.filter(x => !x.c || x.c === 'all' || x.c === t).map(x => ({ ...x, propio: 1, fav: !!m.fav[x.id] }))); };
  const lleno = txt => { const d = datos().datos; return txt.replace(/\{(\w+)\}/g, (a, k) => (d[k] && d[k].trim()) || '[' + k.replace(/_/g, ' ') + ']'); };
  const copiar = (t, m) => (navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast(m), () => toast('No se pudo copiar')) : toast('No se pudo copiar'));
  const nombreTr = () => (TRANSP.find(x => x[0] === tr()) || [])[1];
  const nombreEtapa = e => (ETAPAS.find(x => x[0] === e) || [])[1] || e;

  function flujoHtml() {
    const card = ([k, t, obj, tip], i) => { const o = TIPS[tr()][k]; if (ETAPAS_TR.includes(k) && o) { obj = o[0]; tip = o[1]; } return `<div class="card" style="cursor:pointer" data-go="${k}"><div class="it-h"><b>${i + 1}. ${esc(t)}</b><span class="tag">${lista().filter(x => x.e === k).length} mensajes</span></div><div class="it-s"><b>Objetivo:</b> ${esc(obj)}</div><div class="it-s">${esc(lleno(tip))}</div></div>`; };
    const grupo = (ini, fin) => ETAPAS.slice(ini, fin).map((e, i) => card(e, ini + i)).join('');
    const h = t => `<h3 style="margin:16px 0 4px">${t}</h3>`;
    return `<p class="rk-p">Del inicio de la conversación hasta el precio es igual para todos. Cuando el cliente diga a qué agencia quiere que le llegue, eliges Shalom, Olva o Buses y ves sus dudas y su cierre.</p>
    ${h('Para todos: del saludo al precio')}${grupo(0, 4)}
    ${h('El cliente ya dijo su agencia: elige')}${selTr()}<p class="note" style="margin:0 0 10px">Estos pasos cambian según la transportadora: ${esc(nombreTr())}.</p>${grupo(4, 8)}
    ${h('Para todos: después y fuera del chat')}${grupo(8, ETAPAS.length)}`;
  }
  function msgHtml() {
    const L = lista().filter(x => etapa === FAV ? x.fav : !etapa || x.e === etapa).sort((a, b) => b.fav - a.fav);
    const card = x => `<div class="card"${x.fav ? ' style="border-color:var(--acc2)"' : ''}><div class="it-h"><b>${x.fav ? '★ ' : ''}${esc(x.t)}</b><span class="tag">${esc(nombreEtapa(x.e))}</span></div><pre class="prompt" style="max-height:none;font-family:inherit;font-size:13.5px;margin:8px 0">${esc(lleno(x.x))}</pre><div class="it-a" style="margin:0"><button class="btn btn-sm btn-pri" data-cp="${x.id}">Copiar</button><button class="btn btn-sm" data-fv="${x.id}">${x.fav ? '★ Quitar' : '☆ Favorito'}</button><button class="btn btn-sm" data-ed="${x.id}">Editar</button>${x.editado ? `<button class="btn btn-sm" data-rs="${x.id}">Restaurar</button>` : ''}${x.propio ? `<button class="btn btn-sm btn-del" data-del="${x.id}">✕</button>` : ''}</div></div>`;
    const hay = new Set(), grupos = L.map(x => x.g && etapa !== FAV ? (hay.has(x.g) ? '' : (hay.add(x.g), `<details class="card" data-g="${esc(x.g)}" ${abiertos.has(x.g) ? 'open' : ''}><summary style="cursor:pointer;font-weight:700">${esc(x.g)} <span class="tag">${L.filter(y => y.g === x.g).length} variaciones</span></summary>${L.filter(y => y.g === x.g).map(card).join('')}</details>`)) : card(x)).join('');
    return `${!etapa || etapa === FAV || ETAPAS_TR.includes(etapa) ? selTr() : ''}<div class="chips"><button class="chip ${etapa === '' ? 'on' : ''}" data-et="">Todos</button><button class="chip ${etapa === FAV ? 'on' : ''}" data-et="${FAV}">★ Favoritos</button>${ETAPAS.map(([k, t]) => `<button class="chip ${etapa === k ? 'on' : ''}" data-et="${k}">${esc(t)}</button>`).join('')}</div>
    <p class="note" style="margin:0 0 10px">Las partes entre corchetes [así] se llenan con tus datos en la pestaña «Mis datos». Lo que no llenes queda entre corchetes para que lo escribas al enviar.</p>
    ${grupos || `<div class="card empty">${etapa === FAV ? 'Aún no tienes favoritos. Toca «☆ Favorito» en un mensaje para fijarlo aquí.' : 'No hay mensajes en este paso.'}</div>`}`;
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
    el.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { m.tr = b.dataset.tr; Store.save(); render(); });
    el.querySelectorAll('#ms-t [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { etapa = b.dataset.go; tab = 'msg'; render(); scrollTo(0, 0); });
    el.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { etapa = b.dataset.et; render(); });
    el.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => copiar(lleno(lista().find(x => x.id === b.dataset.cp).x), 'Mensaje copiado'));
    el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { const x = lista().find(y => y.id === b.dataset.ed); openForm('Editar mensaje', [{ k: 't', l: 'Título', full: 1 }, { k: 'x', l: 'Texto completo (usa {producto}, {cliente}, {oferta}…)', full: 1, t: 'area', rows: 14 }], { t: x.t, x: x.x }, v => { if (x.propio) Object.assign(m.extra.find(y => y.id === x.id), v); else m.edit[x.id] = v.x; }); });
    el.querySelectorAll('details[data-g]').forEach(d => d.ontoggle = () => { if (d.open) abiertos.add(d.dataset.g); else abiertos.delete(d.dataset.g); });
    el.querySelectorAll('[data-fv]').forEach(b => b.onclick = () => { const k = b.dataset.fv; if (m.fav[k]) delete m.fav[k]; else m.fav[k] = 1; Store.save(); render(); });
    el.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { delete m.edit[b.dataset.rs]; Store.save(); render(); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmDel('¿Quitar este mensaje?', () => { m.extra = m.extra.filter(y => y.id !== b.dataset.del); }));
    const nv = $('#nuevo'); if (nv) nv.onclick = () => openForm('Nuevo mensaje', [{ k: 'c', l: 'Transportadora', t: 'select', opts: { shalom: 'Shalom', olva: 'Olva', bus: 'Buses', all: 'Las tres' }, def: ETAPAS_TR.includes(etapa) ? tr() : 'all' }, { k: 'e', l: 'Paso', t: 'select', opts: Object.fromEntries(ETAPAS.map(x => [x[0], x[1]])), def: paso() }, { k: 't', l: 'Título', req: 1, full: 1 }, { k: 'x', l: 'Texto completo', req: 1, full: 1, t: 'area', rows: 14 }], { c: ETAPAS_TR.includes(etapa) ? tr() : 'all', e: paso() }, v => m.extra.push({ id: uid(), ...v }));
    el.querySelectorAll('[data-v]').forEach(i => i.onchange = () => { m.datos[i.dataset.v] = i.value; Store.save(); });
  }
  window.Mensajes = { vista, plantillas: () => lista().map(x => ({ id: x.id, t: x.t, e: x.e, x: lleno(x.x) })) };
  if ((location.hash || '').slice(1) === 'mensajes') render();
})();
