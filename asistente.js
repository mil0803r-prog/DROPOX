'use strict';
/* DROPOX — chat con el asistente IA (Gemini). La clave está en el servidor; aquí solo se envían cifras agregadas, sin nombres ni teléfonos. */
const Asistente = (() => {
  const hist = [];
  let enviando = false;
  const CHIPS = ['¿Cómo voy en este periodo?', '¿Dónde estoy perdiendo plata?', '¿Qué haría para subir mi utilidad?'];

  function contexto() {
    const k = S.config.periodo, A = analizar(k);
    const r = x => Math.round(x * 100) / 100;
    const prod = {};
    A.P.forEach(p => { prod[p.producto || 'Sin nombre'] = (prod[p.producto || 'Sin nombre'] || 0) + 1; });
    return {
      periodo: PERIODOS[k], moneda: S.config.moneda,
      pedidos: A.P.length, entregados: A.ent.length, devueltos: A.dev.length, en_curso: A.curso.length,
      tasa_entrega_pct: A.tasa == null ? null : r(A.tasa), por_cobrar: r(A.porCobrar),
      ventas: r(A.D.ventas), igv: r(A.D.igv), costo_producto: r(A.D.producto), fletes: r(A.D.flete), comisiones: r(A.D.comis), renta: r(A.D.renta), otros: r(A.D.otros),
      utilidad_por_pedidos: r(A.utilPed), gastos_fijos_y_suscripciones: r(A.fijos), pauta: r(A.vars), utilidad_neta: r(A.neta),
      productos_mas_pedidos: Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => ({ producto: n, pedidos: c })),
    };
  }

  const fmtTxt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const burbuja = (rol, html) => `<div class="as-m as-${rol}">${html}</div>`;
  const BIENVENIDA = 'Hola, soy tu asistente. Pregúntame por tus ventas, tus gastos, tu utilidad o el precio de un producto. Uso las cifras de tu panel para responderte.';

  // ───────── Conversación ─────────
  function chatHtml() {
    if (!window.Nube || !Nube.listo) return '<div class="as-nota">El chat con la IA funciona en la versión con cuenta, en dropox-peru.vercel.app. La Guía sí está disponible aquí.</div>';
    if (!Nube.activo) return '<div class="as-nota">Inicia sesión para conversar con el asistente IA sobre tu negocio.</div>';
    return `<div class="as-chat">
      <div class="as-chips">${CHIPS.map(c => `<button type="button" class="as-chip">${esc(c)}</button>`).join('')}</div>
      <div class="as-msgs" id="asMsgs">${burbuja('a', esc(BIENVENIDA))}${hist.map(m => burbuja(m.rol === 'user' ? 'u' : 'a', fmtTxt(m.texto))).join('')}</div>
      <div class="as-fila"><input id="asIn" type="text" maxlength="500" placeholder="Escribe tu pregunta" autocomplete="off"><button type="button" class="btn btn-pri" id="asOk">Enviar</button></div>
      <div class="as-pie"><span class="as-nota">Envío solo cifras de tu negocio, sin nombres ni teléfonos.</span>${hist.length ? '<button type="button" class="nube-link" id="asNuevo">Nueva conversación</button>' : ''}</div></div>`;
  }

  async function enviar(texto) {
    texto = (texto || '').trim();
    if (!texto || enviando) return;
    const box = document.getElementById('asMsgs'), inp = document.getElementById('asIn');
    if (!box) return;
    hist.push({ rol: 'user', texto });
    box.insertAdjacentHTML('beforeend', burbuja('u', fmtTxt(texto)));
    box.insertAdjacentHTML('beforeend', burbuja('a as-esp', 'Pensando…'));
    box.scrollTop = box.scrollHeight; if (inp) inp.value = '';
    enviando = true;
    let out;
    try {
      const token = await Nube.token();
      const r = await fetch('/api/asistente', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ mensajes: hist, contexto: contexto() }) });
      const d = await r.json().catch(() => ({}));
      out = r.ok && d.texto ? d.texto : (d.error || 'No se pudo obtener respuesta. Intenta de nuevo.');
      if (r.ok && d.texto) hist.push({ rol: 'model', texto: d.texto }); else hist.pop();
    } catch (e) { out = 'Sin conexión. Intenta de nuevo.'; hist.pop(); }
    enviando = false;
    const esp = box.querySelector('.as-esp'); if (esp) { esp.classList.remove('as-esp'); esp.innerHTML = fmtTxt(out); }
    box.scrollTop = box.scrollHeight;
    const pie = document.querySelector('.as-pie');
    if (pie && hist.length && !document.getElementById('asNuevo')) {
      pie.insertAdjacentHTML('beforeend', '<button type="button" class="nube-link" id="asNuevo">Nueva conversación</button>');
      document.getElementById('asNuevo').onclick = () => { hist.length = 0; mostrar('chat'); };
    }
  }

  function bindChat() {
    const inp = document.getElementById('asIn'); if (!inp) return;
    document.getElementById('asOk').onclick = () => enviar(inp.value);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); enviar(inp.value); } };
    document.querySelectorAll('.as-chip').forEach(b => b.onclick = () => enviar(b.textContent));
    const nuevo = document.getElementById('asNuevo'); if (nuevo) nuevo.onclick = () => { hist.length = 0; mostrar('chat'); };
    const box = document.getElementById('asMsgs'); if (box) box.scrollTop = box.scrollHeight;
  }

  // ───────── Guía ─────────
  const GUIA = [
    ['Empieza en 3 pasos', 'Primero ve a **Gastos** y anota tus gastos fijos (alquiler, contador, internet) y el monto de tus plataformas (Shopify, Dropi, Meta Ads). Después registra tus pedidos en **Pedidos**. Por último abre el **Dashboard** para ver cuánto ganas de verdad.', 'Explícame cómo empezar a usar DROPOX con mi negocio.'],
    ['Registrar un pedido y avanzar su estado', 'En **Pedidos** agrega cada venta con producto, precio, costo, flete y ciudad. El pedido avanza de pendiente a en ruta, y termina en entregado o devuelto. Solo los entregados y los devueltos entran al cálculo de utilidad, así que mantén los estados al día.', '¿Por qué mis pedidos pendientes no suman a la utilidad?'],
    ['Cómo se calcula tu utilidad neta', 'A tus ventas se les restan el IGV, el costo del producto, los fletes, las comisiones, el impuesto a la renta y otros costos. Eso da la utilidad de los pedidos. Luego se restan tus gastos fijos, tus suscripciones y la pauta. El resultado es la utilidad neta del periodo.', 'Explícame con mis números cómo se calcula mi utilidad neta.'],
    ['Fijar el precio con la Calculadora', 'En **Calculadora** pones el costo del producto, el flete y tu pauta, y te dice la utilidad, el margen, el CPA y el ROAS. El semáforo te avisa si el margen es sano o si estás en riesgo de perder plata.', '¿A qué precio debería vender mi producto para tener buen margen?'],
    ['Seguir tu pauta en Meta y TikTok', 'En **Meta Ads** y **TikTok Ads** registras el gasto diario, las compras y las ventas. Si cargas el gasto real, el Dashboard usa ese monto en lugar del mensual de Gastos. Vigila que la pauta no se coma más del 35% de tus ventas.', '¿Mi pauta está muy cara para lo que vendo?'],
    ['Proyectar los próximos meses', 'En **Proyección** mueves el deslizador para probar escenarios a 12 meses: qué pasa si vendes más, o si bajan las devoluciones. Sirve para decidir cuánto invertir antes de gastar.', '¿Qué pasaría si subo mis ventas un 20%?'],
    ['Respaldos y tu cuenta', 'Con tu cuenta, tus datos se guardan solos y se ven en tu PC y en tu celular. Igual puedes bajar un respaldo desde **Ajustes**, restaurarlo o exportar tus pedidos a CSV. Cerrar sesión se hace en la tarjeta Cuenta.', ''],
  ];

  function guiaHtml() {
    const hacer = alertasHtml(insights(analizar(S.config.periodo)));
    return `<div class="as-guia">
      <h3>Qué hacer ahora</h3><div class="as-hacer">${hacer}</div>
      <h3>Cómo usar DROPOX</h3>
      ${GUIA.map((g, i) => `<details><summary>${esc(g[0])}</summary><p>${fmtTxt(g[1])}</p>${g[2] ? `<button type="button" class="as-chip" data-q="${i}">Preguntarle a la IA</button>` : ''}</details>`).join('')}
    </div>`;
  }
  function bindGuia() {
    document.querySelectorAll('.as-guia [data-q]').forEach(b => b.onclick = () => {
      const q = GUIA[+b.dataset.q][2];
      mostrar('chat');
      if (window.Nube && Nube.activo) enviar(q);
    });
  }

  // ───────── Pestañas ─────────
  let tab = 'chat';
  function mostrar(t) {
    tab = t;
    const body = document.getElementById('asBody'); if (!body) return;
    document.querySelectorAll('.as-tabs button').forEach(b => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    body.innerHTML = t === 'chat' ? chatHtml() : guiaHtml();
    if (t === 'chat') bindChat(); else bindGuia();
  }

  $('#fab').onclick = () => {
    openInfo(`<h2>Asistente</h2>
      <div class="as-tabs" role="tablist"><button type="button" role="tab" data-t="chat">Conversación</button><button type="button" role="tab" data-t="guia">Guía</button></div>
      <div id="asBody"></div>`);
    document.querySelectorAll('.as-tabs button').forEach(b => b.onclick = () => mostrar(b.dataset.t));
    mostrar(tab);
  };
  return { chatHtml };
})();
