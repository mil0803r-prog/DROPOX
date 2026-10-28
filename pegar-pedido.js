/* DROPOX — Botón flotante «Pegar datos»: pegas lo que te escribió el cliente, reconoce nombre, DNI, celular, zona, agencia y cantidad,
   y lo manda a Pedidos con cada dato en su lugar. Sirve en cualquier pantalla. */
(function () {
  const CAMPOS = [['nombre', 'Nombre', 1], ['dni', 'DNI'], ['cel', 'Celular'], ['ciudad', 'Departamento, provincia y distrito', 1], ['direccion', 'Dirección / agencia', 1], ['cantidad', 'Cantidad'], ['precio', 'Precio unit. (S/)'], ['producto', 'Producto', 1]];
  let dlg, bloques = [];
  const num = x => parseFloat(String(x).replace(',', '.')) || 0;

  // separa varios clientes pegados juntos: por líneas en blanco o cuando vuelve a aparecer «Nombre»
  function separar(txt) {
    const lineas = String(txt).split(/\r?\n/);
    const out = []; let act = [];
    const cierra = () => { if (act.join('').trim()) out.push(act.join('\n')); act = []; };
    lineas.forEach((l, i) => {
      if (!l.trim()) { if (act.length) cierra(); return; }
      if (/^[^\p{L}\p{N}]*(?:\d{1,2}\s*[).]\s*)?nombre/iu.test(l) && act.some(x => /^[^\p{L}\p{N}]*(?:\d{1,2}\s*[).]\s*)?nombre/iu.test(x))) cierra();
      act.push(l);
    });
    cierra();
    return out;
  }
  function analizar(txt) {
    const leer = window.LeerDatos; if (!leer) return [];
    const of = window.Mensajes && Mensajes.dato ? Mensajes.dato('oferta') : '';
    const prod = (window.Mensajes && Mensajes.dato && Mensajes.dato('producto')) || '';
    return separar(txt).map(t => ({ t, d: leer(t) })).filter(x => x.d.puntos >= 2).map(({ d }) => ({ ...d, precio: num((of.match(/[\d.]+/) || [''])[0]) || '', producto: prod, ok: true, cantidad: d.cantidad || 1 }));
  }
  function html() {
    const hay = bloques.length;
    return `<h2>Pegar datos del cliente</h2>
    <p class="note" style="margin:0 0 8px">Copia lo que te escribió el cliente en WhatsApp y pégalo aquí. Si pegas varios clientes juntos, los separa solo.</p>
    <textarea id="pgT" rows="${hay ? 4 : 9}" placeholder="Pega aquí: Nombre, DNI, celular, zona, agencia…" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit"></textarea>
    <div id="pgR">${hay ? bloques.map((b, i) => `<div class="card" style="margin:10px 0"><label class="chk"><input type="checkbox" data-ok="${i}" ${b.ok ? 'checked' : ''}> <b>Cliente ${i + 1}</b> <small style="color:var(--mut)">(revisa y corrige si hace falta)</small></label><div class="row" style="margin-top:8px">${CAMPOS.map(([k, l, full]) => `<div class="field" style="${full ? 'grid-column:1/-1' : ''}"><label>${l}</label><input data-b="${i}" data-k="${k}" value="${esc(b[k] ?? '')}"></div>`).join('')}</div></div>`).join('') : '<p class="note" style="margin:10px 0 0">Aquí aparecerán los datos reconocidos.</p>'}</div>
    <div class="dlg-foot"><button type="button" class="btn" id="pgX">Cerrar</button><button type="button" class="btn btn-pri" id="pgOk" ${hay ? '' : 'disabled'}>Enviar a Pedidos${hay ? ' (' + bloques.filter(b => b.ok).length + ')' : ''}</button></div>`;
  }
  function pintar(conservar) {
    const t = conservar != null ? conservar : (dlg.querySelector('#pgT') || {}).value || '';
    dlg.innerHTML = html(); const T = dlg.querySelector('#pgT'); T.value = t;
    T.oninput = () => { const f = analizar(T.value); bloques = f; const pos = T.selectionStart; pintar(T.value); const n = dlg.querySelector('#pgT'); n.focus(); n.setSelectionRange(pos, pos); };
    dlg.querySelectorAll('[data-b]').forEach(i => i.oninput = () => { bloques[+i.dataset.b][i.dataset.k] = i.value; });
    dlg.querySelectorAll('[data-ok]').forEach(i => i.onchange = () => { bloques[+i.dataset.ok].ok = i.checked; const b = dlg.querySelector('#pgOk'); b.textContent = 'Enviar a Pedidos (' + bloques.filter(x => x.ok).length + ')'; });
    dlg.querySelector('#pgX').onclick = () => dlg.close();
    dlg.querySelector('#pgOk').onclick = () => {
      const sel = bloques.filter(b => b.ok); if (!sel.length) return toast('Marca al menos un cliente');
      sel.forEach(b => S.pedidos.push({ id: uid(), fecha: hoy(), estado: 'pendiente', producto: b.producto || 'Producto', cliente: b.nombre, telefono: b.cel, ciudad: [b.ciudad, b.direccion].filter(Boolean).join(' · '), canal: 'WhatsApp', cantidad: num(b.cantidad) || 1, precio: num(b.precio), costo: 0, flete: 0, otros: 0, dni: b.dni }));
      Store.save(); dlg.close(); bloques = [];
      toast(sel.length + ' pedido' + (sel.length === 1 ? '' : 's') + ' enviado' + (sel.length === 1 ? '' : 's') + ' a Pedidos ✅');
      if ((location.hash || '').slice(1) === 'pedidos') render();
    };
  }
  function abrir() {
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgPegar'; document.body.appendChild(dlg); }
    bloques = []; pintar(''); dlg.showModal();
    setTimeout(() => { const t = dlg.querySelector('#pgT'); if (t) t.focus(); }, 50);
  }
  function boton() {
    if (document.getElementById('fabPegar')) return;
    const b = document.createElement('button'); b.id = 'fabPegar'; b.className = 'fab-pegar'; b.type = 'button'; b.title = 'Pegar datos de un cliente y enviarlos a Pedidos';
    b.innerHTML = '<span>📋</span> Pegar datos'; b.onclick = abrir; document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boton); else boton();
})();
