-- Ejecutar una vez en Supabase > SQL Editor. Deja la plataforma privada: solo estos correos pueden crear cuenta y ver datos.
create or replace function public.solo_permitidos() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) not in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com') then
    raise exception 'Esta plataforma es privada.';
  end if;
  return new;
end $$;

drop trigger if exists solo_permitidos on auth.users;
create trigger solo_permitidos before insert on auth.users for each row execute function public.solo_permitidos();

-- Aunque ya exista otra cuenta, sin estos correos no puede leer ni escribir datos.
drop policy if exists "solo permitidos" on public.datos;
create policy "solo permitidos" on public.datos as restrictive for all
  using (lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('milderrss03@gmail.com', 'frayrojas2327@gmail.com'));
