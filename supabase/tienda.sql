-- Ejecutar una vez en Supabase > SQL Editor (después de schema.sql y privado.sql).
-- Tienda pública: la configuración publicada se lee sin sesión (solo si publicada = true); escribirla requiere uno de los dos correos permitidos.
create table if not exists public.tiendas (
  slug text primary key,
  dominios text[] not null default '{}',
  config jsonb not null,
  publicada boolean not null default true,
  actualizado timestamptz not null default now()
);
create index if not exists tiendas_dominios on public.tiendas using gin (dominios);
alter table public.tiendas enable row level security;
drop policy if exists "ver publicadas" on public.tiendas;
drop policy if exists "dueños" on public.tiendas;
create policy "ver publicadas" on public.tiendas for select using (publicada);
create policy "dueños" on public.tiendas for all
  using (lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));

-- Pedidos que llegan desde la tienda: cualquiera puede crear uno (el formulario), solo los dueños los ven y gestionan.
create table if not exists public.tienda_pedidos (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  creado timestamptz not null default now(),
  estado text not null default 'nuevo',
  datos jsonb not null
);
create index if not exists tienda_pedidos_slug on public.tienda_pedidos (slug, creado desc);
alter table public.tienda_pedidos enable row level security;
drop policy if exists "crear pedido" on public.tienda_pedidos;
drop policy if exists "dueños ven pedidos" on public.tienda_pedidos;
create policy "crear pedido" on public.tienda_pedidos for insert to anon, authenticated
  with check (estado = 'nuevo' and exists (select 1 from public.tiendas t where t.slug = tienda_pedidos.slug and t.publicada));
create policy "dueños ven pedidos" on public.tienda_pedidos for all
  using (lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));

-- ───────── Subir fotos del dispositivo (Storage) ─────────
-- Crea el almacén público «tienda» (cualquiera puede ver las fotos; solo los dos correos permitidos pueden subir, cambiar o borrar).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tienda', 'tienda', true, 8388608, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/gif'];

drop policy if exists "tienda ver fotos" on storage.objects;
drop policy if exists "tienda subir fotos" on storage.objects;
drop policy if exists "tienda cambiar fotos" on storage.objects;
drop policy if exists "tienda borrar fotos" on storage.objects;
create policy "tienda ver fotos" on storage.objects for select using (bucket_id = 'tienda');
create policy "tienda subir fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'tienda' and lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));
create policy "tienda cambiar fotos" on storage.objects for update to authenticated
  using (bucket_id = 'tienda' and lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));
create policy "tienda borrar fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'tienda' and lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));
