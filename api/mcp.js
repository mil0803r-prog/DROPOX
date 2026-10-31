/* Conector MCP (solo lectura) para que Claude lea los chats de WhatsApp de DROPOX con los permisos que el dueño elige en Ajustes.
   Protocolo MCP «Streamable HTTP» sin sesión: cada petición es un mensaje JSON-RPC. El token va en ?t= o en la cabecera Authorization: Bearer.
   Solo se guarda el hash del token en Supabase (supabase/mcp.sql); la función mcp_leer devuelve únicamente la parte de WhatsApp del dueño. */
const crypto = require('crypto');
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';
const VERSIONES = ['2025-06-18', '2025-03-26', '2024-11-05'];

const hash = t => crypto.createHash('sha256').update(String(t)).digest('hex');
async function leer(token, herr, det) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/mcp_leer`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: 'Bearer ' + KEY_SB, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_hash: hash(token), p_herr: herr || '', p_det: det || '' }), signal: AbortSignal.timeout(10000) });
  if (!r.ok) { const e = await r.text().catch(() => ''); throw new Error(/mcp_leer|function|schema cache/i.test(e) ? 'Falta ejecutar supabase/mcp.sql en Supabase.' : 'No se pudo consultar los datos (' + r.status + ').'); }
  return r.json();
}

// ── Privacidad ──
const soloDig = t => String(t || '').replace(/\D/g, '');
const telVer = (t, P) => { const d = soloDig(t); if (!d) return ''; return P.telefonos ? '+' + d : '+' + d.slice(0, 2) + '*'.repeat(Math.max(0, d.length - 5)) + d.slice(-3); };
const txtVer = (t, P) => P.telefonos ? String(t || '') : String(t || '').replace(/\+?\d[\d\s().-]{6,}\d/g, '[número oculto]');
const cortar = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n) + '…' : t; };

function contexto(d) {
  const P = d.permisos || {}, W = d.wa || {}, tabs = Array.isArray(W.tabs) ? W.tabs : [], etq = Array.isArray(W.etq) ? W.etq : [];
  const permit = Array.isArray(P.tableros) ? P.tableros.filter(Boolean) : [];
  const chats = (Array.isArray(W.chats) ? W.chats : []).filter(c => (P.grupos || !c.grupo) && (!permit.length || permit.includes(c.tab)));
  const nomTab = c => (tabs.find(t => t.id === c.tab) || {}).n || '';
  return { P, tabs, etq, chats, nomTab, permit };
}
const fila = (c, X) => ({ id: c.id, nombre: c.nombre || '', celular: telVer(c.tel, X.P), ciudad: c.ciudad || '', producto: c.producto || '', tablero: X.nomTab(c) || 'Sin tablero', etiquetas: c.etq || [], estado: c.estado || '', seguimiento: c.seg || '', grupo: !!c.grupo, mensajes: (c.msgs || []).length, ultimoMensaje: X.P.mensajes ? cortar(txtVer(((c.msgs || [])[(c.msgs || []).length - 1] || {}).t, X.P), 120) : undefined, ultimaActividad: c.ult ? new Date(c.ult).toISOString() : '' });

const TOOLS = [
  { name: 'resumen_tableros', description: 'Resumen de los chats de WhatsApp: cuántos hay en cada tablero (Guía generada en Shalom, En ruta, Entregado, Recompra…), por etiqueta y por estado.', inputSchema: { type: 'object', properties: {} } },
  { name: 'listar_chats', description: 'Lista chats con sus datos básicos. Filtros opcionales por tablero (nombre), etiqueta, estado o texto (nombre, ciudad, producto).', inputSchema: { type: 'object', properties: { tablero: { type: 'string', description: 'Nombre del tablero, o «Sin tablero»' }, etiqueta: { type: 'string' }, estado: { type: 'string', description: 'nuevo, interesado, esperando, confirmado, enviado, entregado, perdido' }, buscar: { type: 'string' }, limite: { type: 'integer', description: 'Máximo 100 (por defecto 30)' } } } },
  { name: 'leer_chat', description: 'Lee los mensajes de un chat (id de listar_chats). Solo si el permiso de mensajes está activo.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, ultimos: { type: 'integer', description: 'Cuántos mensajes finales leer (máx. 200, por defecto 40)' } }, required: ['id'] } },
  { name: 'buscar_mensajes', description: 'Busca un texto dentro de los mensajes de todos los chats permitidos. Solo si el permiso de mensajes está activo.', inputSchema: { type: 'object', properties: { texto: { type: 'string' }, limite: { type: 'integer', description: 'Máximo 50 (por defecto 20)' } }, required: ['texto'] } },
];

function ejecutar(nombre, a, d) {
  const X = contexto(d), P = X.P; a = a || {};
  if (nombre === 'resumen_tableros') {
    const por = {}, cuenta = (o, k) => { o[k] = (o[k] || 0) + 1; }, tab = {}, et = {}, es = {};
    X.chats.forEach(c => { cuenta(tab, X.nomTab(c) || 'Sin tablero'); (c.etq || []).forEach(e => cuenta(et, e)); cuenta(es, c.estado || 'sin estado'); });
    const hoy = new Date().toISOString().slice(0, 10);
    return { totalChats: X.chats.length, tableros: X.tabs.filter(t => !X.permit.length || X.permit.includes(t.id)).map(t => ({ nombre: t.n, chats: tab[t.n] || 0 })).concat([{ nombre: 'Sin tablero', chats: tab['Sin tablero'] || 0 }]), etiquetas: et, estados: es, seguimientoVencido: X.chats.filter(c => c.seg && c.seg <= hoy && !['entregado', 'perdido'].includes(c.estado)).length, permisos: { mensajes: !!P.mensajes, telefonosCompletos: !!P.telefonos, grupos: !!P.grupos, tablerosPermitidos: X.permit.length ? X.tabs.filter(t => X.permit.includes(t.id)).map(t => t.n) : 'todos' } };
  }
  if (nombre === 'listar_chats') {
    const q = String(a.buscar || '').toLowerCase(), lim = Math.min(100, Math.max(1, +a.limite || 30));
    const L = X.chats.filter(c => (!a.tablero || (X.nomTab(c) || 'Sin tablero').toLowerCase() === String(a.tablero).toLowerCase()) && (!a.etiqueta || (c.etq || []).some(e => e.toLowerCase() === String(a.etiqueta).toLowerCase())) && (!a.estado || c.estado === a.estado) && (!q || [c.nombre, c.ciudad, c.producto].join(' ').toLowerCase().includes(q)))
      .sort((x, y) => (y.ult || 0) - (x.ult || 0));
    return { total: L.length, mostrados: Math.min(L.length, lim), chats: L.slice(0, lim).map(c => fila(c, X)) };
  }
  if (nombre === 'leer_chat') {
    if (!P.mensajes) throw new Error('El permiso «leer mensajes» está desactivado en Ajustes.');
    const c = X.chats.find(x => x.id === a.id); if (!c) throw new Error('No encontré ese chat (o no tienes permiso para verlo).');
    const n = Math.min(200, Math.max(1, +a.ultimos || 40)), M = (c.msgs || []).slice(-n);
    return { chat: fila(c, X), mensajes: M.map(m => ({ de: m.d === 'out' ? 'tienda' : (c.grupo && m.nombre ? m.nombre : 'cliente'), fecha: m.ts ? new Date(m.ts).toISOString() : '', tipo: m.tipo || 'texto', texto: cortar(txtVer(m.t, P), 1500) })) };
  }
  if (nombre === 'buscar_mensajes') {
    if (!P.mensajes) throw new Error('El permiso «leer mensajes» está desactivado en Ajustes.');
    const q = String(a.texto || '').toLowerCase().trim(); if (q.length < 2) throw new Error('Escribe al menos 2 letras.');
    const lim = Math.min(50, Math.max(1, +a.limite || 20)), out = [];
    for (const c of X.chats) for (const m of (c.msgs || [])) { if (out.length >= lim) break; if (m.t && String(m.t).toLowerCase().includes(q)) out.push({ chat: c.id, nombre: c.nombre, tablero: X.nomTab(c) || 'Sin tablero', de: m.d === 'out' ? 'tienda' : 'cliente', fecha: m.ts ? new Date(m.ts).toISOString() : '', texto: cortar(txtVer(m.t, P), 300) }); }
    return { coincidencias: out.length, resultados: out };
  }
  throw new Error('Herramienta desconocida: ' + nombre);
}

async function manejar(msg, token) {
  const { id, method, params } = msg || {};
  const ok = result => ({ jsonrpc: '2.0', id, result }), mal = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (id === undefined) return null; // notificación
  if (method === 'initialize') {
    const d = await leer(token); if (!d) return mal(-32001, 'Token inválido, vencido o revocado.');
    const v = params && VERSIONES.includes(params.protocolVersion) ? params.protocolVersion : VERSIONES[1];
    return ok({ protocolVersion: v, capabilities: { tools: {} }, serverInfo: { name: 'dropox-whatsapp', version: '1.0.0' }, instructions: 'Solo lectura de los chats de WhatsApp de DROPOX. Empieza con resumen_tableros; luego listar_chats y leer_chat. Respeta la privacidad de los clientes.' });
  }
  if (method === 'ping') return ok({});
  if (method === 'tools/list') { const d = await leer(token); if (!d) return mal(-32001, 'Token inválido, vencido o revocado.'); return ok({ tools: TOOLS.filter(t => d.permisos && d.permisos.mensajes ? true : !['leer_chat', 'buscar_mensajes'].includes(t.name)) }); }
  if (method === 'tools/call') {
    const n = params && params.name, a = (params && params.arguments) || {};
    const d = await leer(token, n, JSON.stringify(a).slice(0, 200)); if (!d) return mal(-32001, 'Token inválido, vencido o revocado.');
    try { return ok({ content: [{ type: 'text', text: JSON.stringify(ejecutar(n, a, d), null, 1) }] }); }
    catch (e) { return ok({ isError: true, content: [{ type: 'text', text: e.message }] }); }
  }
  return mal(-32601, 'Método no soportado: ' + method);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return res.status(405).json({ error: 'Usa POST (MCP Streamable HTTP).' }); }
  const auth = String(req.headers.authorization || ''), token = (req.query && req.query.t) || (auth.startsWith('Bearer ') ? auth.slice(7).trim() : '');
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return res.status(401).json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Falta el token del conector.' } });
  try {
    let body = req.body; if (typeof body === 'string') body = JSON.parse(body);
    if (Array.isArray(body)) { const r = (await Promise.all(body.map(m => manejar(m, token)))).filter(Boolean); return r.length ? res.status(200).json(r) : res.status(202).end(); }
    const r = await manejar(body, token);
    return r ? res.status(200).json(r) : res.status(202).end();
  } catch (e) { return res.status(200).json({ jsonrpc: '2.0', id: (req.body && req.body.id) || null, error: { code: -32603, message: e.message || 'Error interno' } }); }
};
