/* Conexión con Supabase. La anon key es pública por diseño; la seguridad está en las reglas RLS (supabase/schema.sql).
   Mientras url y key estén vacías, la app funciona solo en este dispositivo, sin login. */
window.DROPOX_CFG = { url: 'https://ehlkytblkxupiepbtgja.supabase.co', key: 'sb_publishable_fOT8lAd9F19z1piNdCWX9A_stA2MDjU',
  // Plataforma privada: solo estos correos pueden entrar (en minúsculas). Para agregar otro, añádelo aquí, en api/_acceso.js y en supabase/privado.sql.
  permitidos: ['milderrss03@gmail.com', 'frayrojas2327@gmail.com'] };
