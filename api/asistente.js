/* Función de Vercel: recibe la pregunta del asistente y llama a Gemini.
   La clave vive solo en la variable de entorno GEMINI_API_KEY (Vercel > Settings > Environment Variables). */
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MODELO_RESPALDO = 'gemini-flash-latest';

const SISTEMA = `Eres el asistente de DROPOX, un panel de finanzas para vendedores de ecommerce con pago contra entrega en Perú. La moneda es el sol (S/) salvo que el contexto diga otra.
Responde en español claro y breve (máximo 150 palabras, salvo que pidan más detalle). Usa solo las cifras del contexto. Si falta un dato, dilo y no lo inventes.
Da recomendaciones concretas con números cuando se pueda. Si hablas de impuestos, aclara que debe confirmarlo con su contador.
Estas son las cifras actuales del negocio del usuario:
`;

const limpiar = (t, n) => String(t == null ? '' : t).slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return res.status(503).json({ error: 'El asistente IA todavía no está activado.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Inicia sesión para usar el asistente.' });
  try {
    const u = await fetch(`${URL_SB}/auth/v1/user`, { headers: { apikey: KEY_SB, Authorization: `Bearer ${token}` } });
    if (!u.ok) return res.status(401).json({ error: 'Tu sesión venció. Vuelve a entrar.' });
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo verificar tu sesión.' });
  }

  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch (e) { body = null; }
  const msgs = Array.isArray(body && body.mensajes) ? body.mensajes.slice(-12) : [];
  const contents = msgs
    .map(m => ({ role: m && m.rol === 'model' ? 'model' : 'user', parts: [{ text: limpiar(m && m.texto, 2000) }] }))
    .filter(m => m.parts[0].text.trim());
  if (!contents.length || contents[contents.length - 1].role !== 'user') return res.status(400).json({ error: 'Escribe una pregunta.' });
  const contexto = limpiar(JSON.stringify((body && body.contexto) || {}), 6000);

  const cuerpo = JSON.stringify({
    systemInstruction: { parts: [{ text: SISTEMA + contexto }] },
    contents,
    generationConfig: { maxOutputTokens: 900, temperature: 0.5 },
  });
  const llamar = modelo => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave }, body: cuerpo,
  });

  try {
    let r = await llamar(MODELO);
    if (r.status === 404 && MODELO !== MODELO_RESPALDO) r = await llamar(MODELO_RESPALDO);
    if (!r.ok) {
      const det = await r.json().catch(() => ({}));
      const msg = String((det.error && det.error.message) || '');
      console.error('Gemini error', r.status, msg.slice(0, 300));
      if (r.status === 429) return res.status(429).json({ error: 'Se agotó el límite de la IA por ahora. Intenta en unos minutos.' });
      if (/api key not valid|API_KEY_INVALID|expired/i.test(msg)) return res.status(502).json({ error: 'La clave de Gemini no es válida. Crea una nueva en aistudio.google.com/apikey y guárdala en Vercel.' });
      if (r.status === 403) return res.status(502).json({ error: 'La clave de Gemini no tiene permiso. Crea una nueva clave en aistudio.google.com/apikey.' });
      if (r.status === 404) return res.status(502).json({ error: 'El modelo de IA ya no está disponible. Avisa para actualizarlo.' });
      return res.status(502).json({ error: `La IA no respondió (código ${r.status}). Intenta de nuevo.` });
    }
    const d = await r.json();
    const texto = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
    if (!texto) {
      console.error('Gemini sin texto', JSON.stringify(d).slice(0, 300));
      return res.status(502).json({ error: 'La IA no tuvo respuesta para eso. Reformula la pregunta.' });
    }
    return res.status(200).json({ texto });
  } catch (e) {
    console.error('Gemini fetch', e && e.message);
    return res.status(502).json({ error: 'No se pudo conectar con la IA.' });
  }
};
