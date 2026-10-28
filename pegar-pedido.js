/* DROPOX — Botón flotante «Pegar datos»: pegas lo que te escribió el cliente, reconoce nombre, DNI, celular, zona, agencia y cantidad,
   y lo manda a Pedidos con cada dato en su lugar. Sirve en cualquier pantalla. */
(function () {
  const CAMPOS = [['nombre', 'Nombre', 1], ['dni', 'DNI'], ['cel', 'Celular'], ['ciudad', 'Departamento, provincia y distrito', 1], ['direccion', 'Dirección / agencia', 1], ['cantidad', 'Cantidad'], ['precio', 'Precio unit. (S/)'], ['producto', 'Producto', 1]];
  let dlg, bloques = [], AG = null;
  // ── Agencias Shalom: elige sola la que coincide con el distrito, provincia, departamento o dirección ──
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const PALABRAS_FLOJAS = new Set(['avenida', 'jiron', 'calle', 'pasaje', 'urbanizacion', 'agencia', 'shalom', 'lima', 'plaza', 'centro', 'capital', 'frente', 'costado', 'cuadra']);
  async function cargarAg() {
    if (AG) return AG;
    try { const r = await fetch('datos/shalom.json'); AG = (await r.json()).map(a => ({ ...a, _d: norm(a.d), _p: norm(a.p), _z: norm(a.z), _n: norm(a.n), _a: new Set(norm(a.a).split(' ').filter(w => w.length >= 4 && !PALABRAS_FLOJAS.has(w))) })); } catch (e) { AG = []; }
    return AG;
  }
  const tiene = (txt, frase) => frase.length >= 3 && (' ' + txt + ' ').includes(' ' + frase + ' ');
  function ranking(texto) {
    const t = norm(texto), pal = new Set(t.split(' ').filter(w => w.length >= 4));
    return (AG || []).map(a => {
      let sc = 0;
      if (tiene(t, a._d)) sc += 2; if (tiene(t, a._p)) sc += 3; if (tiene(t, a._z)) sc += 4; if (tiene(t, a._n)) sc += 4;
      const pn = new Set(); [a._n, a._z, a._p].forEach(f => f.split(' ').forEach(w => { if (w.length >= 4 && !PALABRAS_FLOJAS.has(w)) pn.add(w); }));
      let pc = 0; pn.forEach(w => { if (pal.has(w)) pc++; }); sc += Math.min(pc * 2, 4);
      let ov = 0; a._a.forEach(w => { if (pal.has(w)) ov++; }); sc += Math.min(ov, 3);
      if ((a._d === 'lima' || a._d === 'callao') && !/\b(lima|callao)\b/.test(t)) sc -= 3; // evita confundir una calle de Lima con una ciudad
      return { a, sc };
    }).sort((x, y) => y.sc - x.sc || x.a.n.localeCompare(y.a.n));
  }
  const etiqueta = a => `${a.n} — ${a.a}${a.t === 'pro' ? ' (Punto Pro)' : ''}`;
  const textoAg = a => `Shalom ${a.n} · ${a.a}`;
  function pegarAgencia(b, forzar) {
    const rk = ranking([String(b.raw || '').replace(b.nombre || '\u0000', ' '), b.ciudad, b.direccion0].join(' ')); b.cand = rk.slice(0, 40).map(x => x.a);
    if (forzar !== false && rk.length && rk[0].sc >= 4) { b.ag = rk[0].a; b.direccion = textoAg(rk[0].a); b.auto = true; }
  }
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
    return separar(txt).map(t => ({ t, d: leer(t) })).filter(x => x.d.puntos >= 2).map(({ d, t }) => ({ ...d, precio: num((of.match(/[\d.]+/) || [''])[0]) || '', producto: prod, ok: true, cantidad: d.cantidad || 1, raw: t, direccion0: d.direccion })).map(b => { pegarAgencia(b); return b; });
  }
  function html() {
    const hay = bloques.length;
    return `<h2>Pegar datos del cliente</h2>
    <p class="note" style="margin:0 0 8px">Copia lo que te escribió el cliente en WhatsApp y pégalo aquí. Si pegas varios clientes juntos, los separa solo.</p>
    <textarea id="pgT" rows="${hay ? 4 : 9}" placeholder="Pega aquí: Nombre, DNI, celular, zona, agencia…" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit"></textarea>
    <div id="pgR">${hay ? bloques.map((b, i) => `<div class="card" style="margin:10px 0"><label class="chk"><input type="checkbox" data-ok="${i}" ${b.ok ? 'checked' : ''}> <b>Cliente ${i + 1}</b> <small style="color:var(--mut)">(revisa y corrige si hace falta)</small></label><div class="row" style="margin-top:8px">${CAMPOS.map(([k, l, full]) => `<div class="field" style="${full ? 'grid-column:1/-1' : ''}"><label>${l}</label><input data-b="${i}" data-k="${k}" value="${esc(b[k] ?? '')}"></div>`).join('')}<div class="field" style="grid-column:1/-1"><label>Agencia Shalom ${b.auto ? '<small style="color:var(--ok)">✔ elegida sola</small>' : ''}</label><input data-sf="${i}" placeholder="Buscar agencia: distrito, provincia, calle…" style="margin-bottom:6px"><select data-sa="${i}" style="width:100%"><option value="">— Sin agencia / otra empresa —</option>${(b.cand || []).map((a, j) => `<option value="${j}" ${b.ag === a ? 'selected' : ''}>${esc(etiqueta(a))}</option>`).join('')}</select></div></div></div>`).join('') : '<p class="note" style="margin:10px 0 0">Aquí aparecerán los datos reconocidos.</p>'}</div>
    <div class="dlg-foot"><button type="button" class="btn" id="pgX">Cerrar</button><button type="button" class="btn btn-pri" id="pgOk" ${hay ? '' : 'disabled'}>Enviar a Pedidos${hay ? ' (' + bloques.filter(b => b.ok).length + ')' : ''}</button></div>`;
  }
  function pintar(conservar) {
    const t = conservar != null ? conservar : (dlg.querySelector('#pgT') || {}).value || '';
    dlg.innerHTML = html(); const T = dlg.querySelector('#pgT'); T.value = t;
    T.oninput = () => { const f = analizar(T.value); bloques = f; const pos = T.selectionStart; pintar(T.value); const n = dlg.querySelector('#pgT'); n.focus(); n.setSelectionRange(pos, pos); };
    dlg.querySelectorAll('[data-b]').forEach(i => i.oninput = () => { bloques[+i.dataset.b][i.dataset.k] = i.value; });
    dlg.querySelectorAll('[data-ok]').forEach(i => i.onchange = () => { bloques[+i.dataset.ok].ok = i.checked; const b = dlg.querySelector('#pgOk'); b.textContent = 'Enviar a Pedidos (' + bloques.filter(x => x.ok).length + ')'; });
    dlg.querySelectorAll('[data-sa]').forEach(sl => sl.onchange = () => { const b = bloques[+sl.dataset.sa], a = b.cand[+sl.value]; if (a) { b.ag = a; b.direccion = textoAg(a); } else { b.ag = null; b.direccion = b.direccion0 || ''; } b.auto = false; const inp = dlg.querySelector(`[data-b="${sl.dataset.sa}"][data-k="direccion"]`); if (inp) inp.value = b.direccion; });
    dlg.querySelectorAll('[data-sf]').forEach(i => i.oninput = () => { const b = bloques[+i.dataset.sf]; const q = i.value; const rk = ranking(q ? q : [String(b.raw || '').replace(b.nombre || '\u0000', ' '), b.ciudad, b.direccion0].join(' ')); b.cand = rk.slice(0, 40).map(x => x.a); const sl = dlg.querySelector(`[data-sa="${i.dataset.sf}"]`); sl.innerHTML = '<option value="">— Sin agencia / otra empresa —</option>' + b.cand.map((a, j) => `<option value="${j}">${esc(etiqueta(a))}</option>`).join(''); });
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
    cargarAg(); bloques = []; pintar(''); dlg.showModal();
    setTimeout(() => { const t = dlg.querySelector('#pgT'); if (t) t.focus(); }, 50);
  }
  function boton() {
    if (document.getElementById('fabPegar')) return;
    const b = document.createElement('button'); b.id = 'fabPegar'; b.className = 'fab-pegar'; b.type = 'button'; b.title = 'Pegar datos de un cliente y enviarlos a Pedidos';
    b.innerHTML = '<span>📋</span> Pegar datos'; b.onclick = abrir; document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boton); else boton();
})();
