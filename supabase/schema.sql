-- Ejecutar una vez en Supabase > SQL Editor.
create table if not exists public.datos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  contenido jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

alter table public.datos enable row level security;

drop policy if exists "ver lo propio" on public.datos;
drop policy if exists "crear lo propio" on public.datos;
drop policy if exists "editar lo propio" on public.datos;
drop policy if exists "borrar lo propio" on public.datos;

create policy "ver lo propio" on public.datos for select using (auth.uid() = user_id);
create policy "crear lo propio" on public.datos for insert with check (auth.uid() = user_id);
create policy "editar lo propio" on public.datos for update using (auth.uid() = user_id);
create policy "borrar lo propio" on public.datos for delete using (auth.uid() = user_id);
