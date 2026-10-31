/* DROPOX — Ajustes › Conector MCP: crea tokens de solo lectura para que Claude lea tus chats de WhatsApp con los permisos que elijas.
   Solo se guarda el hash del token (supabase/mcp.sql). El token completo se muestra una única vez al crearlo. */
(function () {
  const DIAS = { 7: '7 días', 30: '30 días', 90: '90 días', 0: 'Sin vencimiento' };
  let lista = null, error = '';
  const cfg = () => window.DROPOX_CFG || {};
  async function sb(ruta, opt = {}) {
    const tk = window.Nube && (await Nube.token());
    if (!tk) throw new Error('Inicia sesión para usar el conector.');
    const c = cfg();
    const r = await fetch(c.url + '/rest/v1/' + ruta, { ...opt, headers: { apikey: c.key, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
    const t = await r.text();
    if (!r.ok) { let m = t; try { const j = JSON.parse(t); m = j.message || j.hint || t; } catch (e) {} throw new Error(/relation|does not exist|schema cache|mcp_/i.test(m) ? 'Falta ejecutar supabase/mcp.sql en Supabase (SQL Editor).' : m); }
    return t ? JSON.parse(t) : null;
  }
  const tableros = () => ((window.S && S.wa && Array.isArray(S.wa.tabs)) ? S.wa.tabs : [{ id: 't1', n: 'Guía generada en Shalom' }, { id: 't2', n: 'En ruta' }, { id: 't3', n: 'Entregado' }, { id: 't4', n: 'Recompra' }]);
  const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const fecha = iso => iso ? new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const resumen = p => [p.mensajes ? 'lee mensajes' : 'solo datos básicos', p.telefonos ? 'celulares completos' : 'celulares ocultos', p.grupos ? 'con grupos' : 'sin grupos', (p.tableros || []).length ? 'tableros: ' + (p.tableros || []).map(id => (tableros().find(t => t.id === id) || { n: '?' }).n).join(', ') : 'todos los tableros'].join(' · ');
  const campos = p => [
    { k: 'mensajes', t: 'check', l: 'Puede leer el texto de los mensajes', def: p.mensajes !== false },
    { k: 'telefonos', t: 'check', l: 'Puede ver los celulares completos (si no, salen ocultos)', def: !!p.telefonos },
    { k: 'grupos', t: 'check', l: 'Puede ver los grupos de WhatsApp', def: !!p.grupos },
  ].concat(tableros().map(t => ({ k: 't_' + t.id, t: 'check', l: 'Tablero permitido: ' + t.n, def: !(p.tableros || []).length || p.tableros.includes(t.id) })));
  const leerPermisos = v => { const T = tableros(), marcados = T.filter(t => v['t_' + t.id]).map(t => t.id); return { mensajes: !!v.mensajes, telefonos: !!v.telefonos, grupos: !!v.grupos, tableros: marcados.length === T.length ? [] : marcados }; };

  async function cargar(el) {
    try { lista = await sb('mcp_tokens?select=*&order=creado.desc'); error = ''; } catch (e) { lista = []; error = e.message; }
    pintar(el);
  }
  function pintar(el) {
    const box = el.querySelector('#mcpBox'); if (!box) return;
    const hoy = Date.now();
    box.innerHTML = (error ? `<p class="note" style="color:var(--bad,#dc2626)">⚠ ${esc(error)}</p>` : '') +
      (lista === null ? '<p class="note">Cargando…</p>' : lista.length ? lista.map(t => { const vig = !t.revocado && (!t.vence || new Date(t.vence) > hoy); return `<div class="card" style="margin:8px 0;padding:12px"><div class="card-row"><div><b>${esc(t.nombre)}</b> ${t.revocado ? '<span class="tag">Revocado</span>' : vig ? '<span class="tag t-entregado">Activo</span>' : '<span class="tag">Vencido</span>'}<div class="note">${esc(resumen(t.permisos || {}))}<br>Vence: ${t.vence ? fecha(t.vence) : 'nunca'} · Último uso: ${fecha(t.ultimo_uso)}</div></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${vig ? `<button class="btn btn-sm" data-mp="${t.id}">Permisos</button>` : ''}<button class="btn btn-sm" data-ml="${t.id}">Registro</button>${vig ? `<button class="btn btn-sm btn-del" data-mr="${t.id}">Revocar</button>` : ''}<button class="btn btn-sm btn-del" data-me="${t.id}">Eliminar</button></div></div>`; }).join('') : '<p class="note">Todavía no has creado ningún conector.</p>');
    box.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => { const t = lista.find(x => x.id === b.dataset.mp); openForm('Permisos de «' + t.nombre + '»', campos(t.permisos || {}), {}, async v => { try { await sb('mcp_tokens?id=eq.' + t.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ permisos: leerPermisos(v) }) }); toast('Permisos actualizados'); } catch (e) { toast(e.message); } cargar(el); }); });
    box.querySelectorAll('[data-mr]').forEach(b => b.onclick = () => ask('¿Revocar este conector? Claude dejará de poder leer tus chats al instante.', async () => { try { await sb('mcp_tokens?id=eq.' + b.dataset.mr, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ revocado: true }) }); toast('Conector revocado'); } catch (e) { toast(e.message); } cargar(el); }, 'Revocar'));
    box.querySelectorAll('[data-me]').forEach(b => b.onclick = () => ask('¿Eliminar este conector y su registro?', async () => { try { await sb('mcp_tokens?id=eq.' + b.dataset.me, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); } catch (e) { toast(e.message); } cargar(el); }, 'Eliminar'));
    box.querySelectorAll('[data-ml]').forEach(b => b.onclick = async () => { try { const L = await sb('mcp_log?select=*&token_id=eq.' + b.dataset.ml + '&order=cuando.desc&limit=30'); openInfo('<h2>Registro de consultas</h2>' + (L.length ? '<div style="max-height:50vh;overflow:auto">' + L.map(x => `<div class="note" style="padding:5px 0;border-bottom:1px solid var(--line)"><b>${esc(x.herramienta)}</b> · ${fecha(x.cuando)}<br>${esc(x.detalle || '')}</div>`).join('') + '</div>' : '<p class="note">Todavía no consultó nada.</p>')); } catch (e) { toast(e.message); } });
  }
  function crear(el) {
    openForm('Nuevo conector MCP', [{ k: 'nombre', l: 'Nombre (ej. Claude – análisis de chats)', req: 1, full: 1, def: 'Claude' }, { k: 'dias', l: 'Vence en', t: 'select', opts: DIAS, def: '30' }].concat(campos({ mensajes: true })), {}, async v => {
      try {
        const token = b64(crypto.getRandomValues(new Uint8Array(32))), uid = (await sbUser());
        const vence = +v.dias ? new Date(Date.now() + (+v.dias) * 864e5).toISOString() : null;
        await sb('mcp_tokens', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: uid, nombre: v.nombre.trim() || 'Claude', token_hash: await sha(token), permisos: leerPermisos(v), vence }) });
        const url = location.origin + '/api/mcp?t=' + token;
        setTimeout(() => { openInfo(`<h2>Conector creado ✅</h2><p class="note"><b>Copia esta dirección ahora: no se vuelve a mostrar.</b> Quien la tenga puede leer tus chats según los permisos.</p><textarea readonly rows="4" id="mcpUrl" style="width:100%;font-family:monospace;font-size:12px">${esc(url)}</textarea><div style="margin:8px 0"><button class="btn btn-pri" type="button" id="mcpCopiar">Copiar dirección</button></div><p class="note">En Claude: <b>Ajustes › Conectores › Añadir conector personalizado</b>, pega la dirección y listo. Es de solo lectura.</p>`); const c = document.getElementById('mcpCopiar'); if (c) c.onclick = () => { const t = document.getElementById('mcpUrl'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Copiada'), () => { document.execCommand('copy'); toast('Copiada'); }); }; }, 150);
      } catch (e) { toast(e.message); }
      cargar(el);
    });
  }
  async function sbUser() {
    const tk = await Nube.token(), c = cfg();
    const r = await fetch(c.url + '/auth/v1/user', { headers: { apikey: c.key, Authorization: 'Bearer ' + tk } });
    const u = await r.json(); if (!u.id) throw new Error('No se pudo identificar tu cuenta.'); return u.id;
  }
  function cardHtml() {
    if (!window.Nube || !Nube.activo) return '';
    return `<div class="card"><h3>Conector MCP · Claude lee tus chats</h3><p class="sub">Solo lectura. Tú eliges qué puede ver (mensajes, celulares, grupos y tableros) y puedes revocarlo cuando quieras. Cada consulta queda en el registro.</p>
      <div id="mcpBox"><p class="note">Cargando…</p></div><div style="margin-top:10px"><button class="btn btn-pri" id="mcpNew">+ Nuevo conector</button></div></div>`;
  }
  function bind(el) { const n = el.querySelector('#mcpNew'); if (!n) return; n.onclick = () => crear(el); cargar(el); }
  window.McpAjustes = { cardHtml, bind };
})();
