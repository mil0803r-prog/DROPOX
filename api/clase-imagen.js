/* Función de Vercel: lee el texto de una imagen (captura del mensaje de una clase) con Gemini.
   Usa la misma clave GEMINI_API_KEY del asistente. Solo devuelve el texto que se ve en la imagen. */
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MODELOS = [...new Set([MODELO, 'gemini-2.5-flash-lite', 'gemini-flash-latest'])];
const PEDIDO = 'Transcribe TODO el texto visible en esta imagen, tal cual aparece, en el mismo orden y con saltos de línea. Incluye fechas, horas, temas y enlaces completos (URL). No agregues comentarios, títulos ni explicaciones. Si no hay texto, responde exactamente: SIN_TEXTO';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return res.status(503).json({ error: 'La lectura de imágenes con IA todavía no está activada.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Inicia sesión para usar esta función.' });
  try { if (!(await require('./_acceso').validar(token))) return res.status(401).json({ error: 'Tu sesión venció o tu correo no tiene permiso.' }); }
  catch (e) { return res.status(502).json({ error: 'No se pudo verificar tu sesión.' }); }

  let body = req.body; try { if (typeof body === 'string') body = JSON.parse(body); } catch (e) { body = null; }
  const m = String((body && body.imagen) || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > 3500000) return res.status(400).json({ error: 'Imagen no válida o muy pesada.' });

  const cuerpo = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: PEDIDO }, { inlineData: { mimeType: m[1], data: m[2] } }] }], generationConfig: { maxOutputTokens: 1200, temperature: 0 } });
  try {
    let r;
    for (const mo of MODELOS) {
      try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mo)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave }, body: cuerpo, signal: AbortSignal.timeout(20000) }); }
      catch (e) { r = { ok: false, status: 504 }; }
      if (r.ok || ![404, 429, 500, 503, 504].includes(r.status)) break;
    }
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: r.status === 429 ? 'Se agotó el límite de la IA por ahora. Intenta en unos minutos.' : 'La IA no pudo leer la imagen. Intenta de nuevo.' });
    const d = await r.json();
    const texto = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
    return res.status(200).json({ texto: texto === 'SIN_TEXTO' ? '' : texto.slice(0, 4000) });
  } catch (e) { return res.status(502).json({ error: 'No se pudo conectar con la IA.' }); }
};
