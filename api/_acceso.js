/* Acceso privado: solo los correos permitidos pueden usar las funciones de la plataforma.
   Para cambiar la lista sin tocar el código, pon en Vercel la variable PERMITIDOS con los correos separados por coma. */
const URL_SB = process.env.SUPABASE_URL || 'https://ehlkytblkxupiepbtgja.supabase.co';
const KEY_SB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU';
const PERMITIDOS = (process.env.PERMITIDOS || 'milderrss03@gmail.com,frayrojas2327@gmail.com').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

async function validar(token) {
  if (!token) return false;
  try {
    const r = await fetch(`${URL_SB}/auth/v1/user`, { headers: { apikey: KEY_SB, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return false;
    const u = await r.json().catch(() => null);
    return !!(u && u.email && PERMITIDOS.includes(String(u.email).toLowerCase()));
  } catch (e) { return false; }
}
module.exports = { validar, PERMITIDOS };
