-- ============================================================
-- Wiize ChatWeb — criar a pasta privada de fotos (chatweb-avatars)
-- Rodar na produção, uma vez. Pode rodar de novo sem quebrar nada.
-- ============================================================

-- 1) Criar a pasta privada com limite de 1 MB por arquivo
insert into storage.buckets (id, name, public, file_size_limit)
values ('chatweb-avatars', 'chatweb-avatars', false, 1048576)
on conflict (id) do update
  set public = false,
      file_size_limit = 1048576;

-- 2) Regras de acesso: cada conta só lê, envia e apaga as próprias fotos
--    (o visitante do ChatWeb recebe a foto por link temporado gerado
--    pelo sistema, então não precisa de acesso público aqui)
drop policy if exists chatweb_avatars_read on storage.objects;
create policy chatweb_avatars_read on storage.objects
  for select
  using (
    bucket_id = 'chatweb-avatars'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists chatweb_avatars_insert on storage.objects;
create policy chatweb_avatars_insert on storage.objects
  for insert
  with check (
    bucket_id = 'chatweb-avatars'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists chatweb_avatars_update on storage.objects;
create policy chatweb_avatars_update on storage.objects
  for update
  using (
    bucket_id = 'chatweb-avatars'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists chatweb_avatars_delete on storage.objects;
create policy chatweb_avatars_delete on storage.objects
  for delete
  using (
    bucket_id = 'chatweb-avatars'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );
