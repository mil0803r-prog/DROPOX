/* Función de Vercel: puente entre la plataforma y tu WhatsApp conectado con QR (Evolution API en tu servidor).
   Exige sesión iniciada. La dirección y la clave del servidor van en variables de Vercel: WA_URL, WA_KEY y WA_INSTANCE (opcional). */
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';

async function sesionValida(token) {
  try {
    const r = await fetch(`${URL_SB}/auth/v1/user`, { headers: { apikey: KEY_SB, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch (e) { return false; }
}
const texto = m => {
  const x = (m && m.message) || {};
  const t = x.conversation || (x.extendedTextMessage && x.extendedTextMessage.text) || (x.imageMessage && (x.imageMessage.caption || '📷 Foto')) || (x.videoMessage && (x.videoMessage.caption || '🎥 Video')) || (x.audioMessage && '🎤 Audio') || (x.documentMessage && '📄 Documento') || (x.stickerMessage && 'Sticker') || (x.ephemeralMessage && texto({ message: x.ephemeralMessage.message })) || '';
  return t;
};
const tipoDe = m => {
  const x = (m && m.message) || {};
  if (x.ephemeralMessage) return tipoDe({ message: x.ephemeralMessage.message });
  return x.imageMessage ? 'imagen' : x.videoMessage ? 'video' : x.audioMessage ? 'audio' : x.documentMessage ? 'doc' : x.stickerMessage ? 'sticker' : '';
};
const ms = t => { const n = Number(t && t.low !== undefined ? t.low : t); return n ? (n < 1e12 ? n * 1000 : n) : 0; };
const telDe = jid => (/@s\.whatsapp\.net$/.test(jid || '') ? jid.split('@')[0] : '');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !(await sesionValida(token))) return res.status(401).json({ error: 'Inicia sesión para usar WhatsApp.' });
  const BASE = (process.env.WA_URL || '').replace(/\/+$/, ''), KEY = process.env.WA_KEY, INST = process.env.WA_INSTANCE || 'dropox';
  if (!BASE || !KEY) return res.status(200).json({ ok: false, sinConfig: true, error: 'Falta conectar el servidor de WhatsApp (WA_URL y WA_KEY en Vercel).' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const evo = async (metodo, ruta, cuerpo) => {
    const r = await fetch(BASE + ruta, { method: metodo, headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, j };
  };
  try {
    if (b.accion === 'estado') {
      const r = await evo('GET', `/instance/connectionState/${INST}`);
      if (r.status === 404) return res.json({ ok: true, estado: 'sin_instancia' });
      if (!r.ok) return res.json({ ok: false, error: 'El servidor de WhatsApp respondió con error ' + r.status });
      const e = (r.j && ((r.j.instance && r.j.instance.state) || r.j.state)) || 'close';
      return res.json({ ok: true, estado: e });
    }
    if (b.accion === 'qr') {
      let r = await evo('GET', `/instance/connectionState/${INST}`);
      if (r.status === 404) {
        const c = await evo('POST', '/instance/create', { instanceName: INST, integration: 'WHATSAPP-BAILEYS', qrcode: true });
        if (!c.ok) return res.json({ ok: false, error: 'No pude crear la conexión (' + c.status + ').' });
      }
      const q = await evo('GET', `/instance/connect/${INST}`);
      const img = q.j && (q.j.base64 || (q.j.qrcode && q.j.qrcode.base64));
      if (!q.ok || !img) return res.json({ ok: true, qr: '', esperando: true });
      return res.json({ ok: true, qr: img });
    }
    if (b.accion === 'salir') { await evo('DELETE', `/instance/logout/${INST}`); return res.json({ ok: true }); }
    if (b.accion === 'diag') {
      const rc = await evo('POST', `/chat/findChats/${INST}`, {}), rk = await evo('POST', `/chat/findContacts/${INST}`, { where: {} });
      const ch = Array.isArray(rc.j) ? rc.j : [], ko = Array.isArray(rk.j) ? rk.j : [];
      const tipo = j => (/@lid$/.test(j || '') ? 'lid' : /@s\.whatsapp\.net$/.test(j || '') ? 'numero' : /@g\.us$/.test(j || '') ? 'grupo' : 'otro');
      return res.json({ ok: true, estadoChats: rc.status, estadoContactos: rk.status, chats: ch.length, contactos: ko.length, contactosConNombre: ko.filter(k => k.pushName || k.name).length,
        chatsConNombre: ch.filter(c => c.pushName || c.name).length, tipos: ch.reduce((a, c) => { const t = tipo(c.remoteJid || c.id); a[t] = (a[t] || 0) + 1; return a; }, {}),
        camposChat: ch[0] ? Object.keys(ch[0]) : [], camposContacto: ko[0] ? Object.keys(ko[0]) : [], camposUltimoMensaje: ch[0] && ch[0].lastMessage ? Object.keys(ch[0].lastMessage) : [],
        camposClave: ch[0] && ch[0].lastMessage && ch[0].lastMessage.key ? Object.keys(ch[0].lastMessage.key) : [] });
    }
    if (b.accion === 'media') {
      if (!b.id) return res.status(400).json({ error: 'Falta el mensaje.' });
      const r = await evo('POST', `/chat/getBase64FromMediaMessage/${INST}`, { message: { key: { id: b.id } }, convertToMp4: false });
      const j = r.j || {};
      if (!r.ok || !j.base64) return res.json({ ok: false, error: 'No se pudo descargar el archivo.' });
      return res.json({ ok: true, base64: String(j.base64).replace(/^data:[^,]*,/, ''), mime: j.mimetype || '', nombre: j.fileName || '' });
    }
    if (b.accion === 'enviarMedia') {
      const num = String(b.numero || '').replace(/[^\d@a-z.]/gi, '');
      const tipo = ['image', 'video', 'audio', 'document'].includes(b.tipo) ? b.tipo : 'document';
      if (!num || !b.base64) return res.status(400).json({ error: 'Falta el número o el archivo.' });
      const cuerpo = { number: num, mediatype: tipo, mimetype: String(b.mime || ''), caption: String(b.texto || '').slice(0, 1000), media: String(b.base64), fileName: String(b.nombre || 'archivo').slice(0, 120) };
      const r = await evo('POST', `/message/sendMedia/${INST}`, cuerpo);
      if (!r.ok) return res.json({ ok: false, error: 'No se pudo enviar el archivo (' + r.status + ').' });
      return res.json({ ok: true, id: r.j && r.j.key && r.j.key.id });
    }
    if (b.accion === 'perfil') {
      const num = String(b.numero || '').replace(/[^\d@a-z.]/gi, '');
      if (!num) return res.status(400).json({ error: 'Falta el número.' });
      const [f, i] = await Promise.all([evo('POST', `/chat/fetchProfilePictureUrl/${INST}`, { number: num }).catch(() => ({})), evo('POST', `/chat/fetchProfile/${INST}`, { number: num }).catch(() => ({}))]);
      const fj = f.j || {}, ij = i.j || {};
      return res.json({ ok: true, foto: fj.profilePictureUrl || fj.picture || ij.picture || '', nombre: ij.name || '', info: typeof ij.status === 'string' ? ij.status : (ij.status && ij.status.status) || '', negocio: !!ij.isBusiness });
    }
    if (b.accion === 'chats') {
      const r = await evo('POST', `/chat/findChats/${INST}`, {});
      const arr = Array.isArray(r.j) ? r.j : [];
      const rc = await evo('POST', `/chat/findContacts/${INST}`, { where: {} }).catch(() => ({ j: [] }));
      const cont = {};
      (Array.isArray(rc.j) ? rc.j : []).forEach(k => { const id = k.remoteJid || k.id; if (id) cont[id] = k; });
      const rg = await evo('GET', `/group/fetchAllGroups/${INST}?getParticipants=false`).catch(() => ({ j: [] }));
      const grupos = {};
      (Array.isArray(rg.j) ? rg.j : []).forEach(g => { if (g.id) grupos[g.id] = g; });
      const chats = arr.map(c => {
        const jid = c.remoteJid || c.id || '';
        if (/@g\.us$/.test(jid)) { const g = grupos[jid] || {}; return { jid, tel: '', grupo: true, nombre: g.subject || c.name || c.pushName || 'Grupo', foto: g.pictureUrl || c.profilePicUrl || '', ult: ms(c.updatedAt ? Date.parse(c.updatedAt) : (c.lastMessage && c.lastMessage.messageTimestamp)), noLeidos: c.unreadMessages || 0 }; }
        const lm = c.lastMessage || {}, lk = lm.key || {};
        const alt = lk.remoteJidAlt || c.remoteJidAlt || lk.senderPn || '';
        const k = cont[jid] || cont[alt] || {};
        const nombre = k.pushName || k.name || c.pushName || c.name || (!lk.fromMe && lm.pushName) || '';
        return { jid, tel: telDe(jid) || telDe(alt), nombre, foto: k.profilePicUrl || c.profilePicUrl || '', ult: ms(c.updatedAt ? Date.parse(c.updatedAt) : lm.messageTimestamp), noLeidos: c.unreadMessages || 0 };
      }).filter(c => c.jid && !/@broadcast$|status@/.test(c.jid)).sort((a, c) => c.ult - a.ult).slice(0, 80);
      return res.json({ ok: true, chats });
    }
    if (b.accion === 'mensajes') {
      if (!b.jid) return res.status(400).json({ error: 'Falta el chat.' });
      const r = await evo('POST', `/chat/findMessages/${INST}`, { where: { key: { remoteJid: b.jid } }, page: 1, offset: 40 });
      const rec = Array.isArray(r.j) ? r.j : (r.j && r.j.messages && (r.j.messages.records || r.j.messages)) || [];
      const msgs = (Array.isArray(rec) ? rec : []).map(m => ({ id: (m.key && m.key.id) || m.id, d: m.key && m.key.fromMe ? 'out' : 'in', t: texto(m), tipo: tipoDe(m), ts: ms(m.messageTimestamp), nombre: m.pushName || '' })).filter(m => m.id && m.t).sort((a, c) => a.ts - c.ts);
      let nombre = '', tel = '';
      (Array.isArray(rec) ? rec : []).forEach(m => { const k = m.key || {}; if (!k.fromMe && !nombre && m.pushName) nombre = m.pushName; if (!tel) tel = telDe(k.remoteJidAlt) || telDe(k.senderPn) || telDe(k.participantPn) || ''; });
      return res.json({ ok: true, msgs, nombre, tel });
    }
    if (b.accion === 'enviar') {
      const num = String(b.numero || '').replace(/[^\d@a-z.]/gi, ''), t = String(b.texto || '').slice(0, 4000);
      if (!num || !t.trim()) return res.status(400).json({ error: 'Falta el número o el texto.' });
      const r = await evo('POST', `/message/sendText/${INST}`, { number: num, text: t });
      if (!r.ok) return res.json({ ok: false, error: 'No se pudo enviar (' + r.status + ').' });
      return res.json({ ok: true, id: r.j && r.j.key && r.j.key.id });
    }
    return res.status(400).json({ error: 'Acción desconocida.' });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'No pude hablar con el servidor de WhatsApp. ¿Está encendido?' });
  }
};
