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

  function chatHtml() {
    if (!window.Nube || !Nube.listo) return '';
    if (!Nube.activo) return '<div class="as-nota">Inicia sesión para preguntarle al asistente IA sobre tu negocio.</div>';
    return `<div class="as-chat"><h3>Pregúntale a la IA</h3>
      <div class="as-chips">${CHIPS.map(c => `<button type="button" class="as-chip">${esc(c)}</button>`).join('')}</div>
      <div class="as-msgs" id="asMsgs">${hist.map(m => burbuja(m.rol === 'user' ? 'u' : 'a', fmtTxt(m.texto))).join('')}</div>
      <div class="as-fila"><input id="asIn" type="text" maxlength="500" placeholder="Escribe tu pregunta" autocomplete="off"><button type="button" class="btn btn-pri" id="asOk">Enviar</button></div>
      <div class="as-nota">Envío solo cifras de tu negocio, sin nombres ni teléfonos de clientes.</div></div>`;
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
  }

  function bind() {
    const inp = document.getElementById('asIn'); if (!inp) return;
    document.getElementById('asOk').onclick = () => enviar(inp.value);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); enviar(inp.value); } };
    document.querySelectorAll('.as-chip').forEach(b => b.onclick = () => enviar(b.textContent));
    const box = document.getElementById('asMsgs'); if (box) box.scrollTop = box.scrollHeight;
  }

  $('#fab').onclick = () => {
    openInfo(`<h2>Asistente</h2><p class="sub" style="margin-top:-8px;color:var(--mut)">Lo que veo en tu negocio (${PERIODOS[S.config.periodo].toLowerCase()})</p>${alertasHtml(insights(analizar(S.config.periodo)))}${chatHtml()}`);
    bind();
  };
  return { chatHtml, bind };
})();
