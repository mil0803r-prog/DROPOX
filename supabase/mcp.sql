-- Ejecutar una vez en Supabase > SQL Editor (después de schema.sql y privado.sql).
-- Conector MCP de solo lectura: deja que Claude lea tus chats de WhatsApp con los permisos que tú elijas en Ajustes.
-- Solo se guarda el HASH del token (nunca el token). Cada consulta queda en el registro.
create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  token_hash text not null unique,
  permisos jsonb not null default '{}'::jsonb,
  vence timestamptz,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz,
  revocado boolean not null default false
);
create table if not exists public.mcp_log (
  id bigserial primary key,
  token_id uuid not null references public.mcp_tokens(id) on delete cascade,
  user_id uuid not null,
  cuando timestamptz not null default now(),
  herramienta text,
  detalle text
);
alter table public.mcp_tokens enable row level security;
alter table public.mcp_log enable row level security;
drop policy if exists "mis tokens" on public.mcp_tokens;
drop policy if exists "mi registro" on public.mcp_log;
create policy "mis tokens" on public.mcp_tokens for all
  using (auth.uid() = user_id and lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'))
  with check (auth.uid() = user_id and lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));
create policy "mi registro" on public.mcp_log for select
  using (auth.uid() = user_id and lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));

-- La usa la función /api/mcp: recibe el hash del token y devuelve SOLO la parte de WhatsApp de ese dueño y los permisos del token.
create or replace function public.mcp_leer(p_hash text, p_herr text default '', p_det text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.mcp_tokens; w jsonb;
begin
  select * into t from public.mcp_tokens where token_hash = p_hash and not revocado and (vence is null or vence > now());
  if not found then return null; end if;
  update public.mcp_tokens set ultimo_uso = now() where id = t.id;
  if coalesce(p_herr, '') <> '' then
    insert into public.mcp_log (token_id, user_id, herramienta, detalle) values (t.id, t.user_id, left(p_herr, 40), left(coalesce(p_det, ''), 200));
  end if;
  select contenido -> 'wa' into w from public.datos where user_id = t.user_id;
  return jsonb_build_object('permisos', t.permisos, 'wa', coalesce(w, '{}'::jsonb));
end $$;
revoke all on function public.mcp_leer(text, text, text) from public;
grant execute on function public.mcp_leer(text, text, text) to anon, authenticated;
