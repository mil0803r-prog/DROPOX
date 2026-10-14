/* Conexión con Supabase. La anon key es pública por diseño; la seguridad está en las reglas RLS (supabase/schema.sql).
   Mientras url y key estén vacías, la app funciona solo en este dispositivo, sin login. */
window.DROPOX_CFG = { url: '', key: '' };
