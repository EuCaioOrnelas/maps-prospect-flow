-- Tracking / marketing tags configuration (singleton)
create table if not exists public.tracking_settings (
  id boolean primary key default true,
  gtm_id text,
  ga4_id text,
  google_ads_id text,
  google_ads_conversion_label text,
  meta_pixel_id text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint tracking_settings_singleton check (id)
);

insert into public.tracking_settings (id) values (true) on conflict (id) do nothing;

grant select on public.tracking_settings to anon;
grant select on public.tracking_settings to authenticated;
grant all on public.tracking_settings to service_role;
alter table public.tracking_settings enable row level security;

drop policy if exists "tracking_settings_read" on public.tracking_settings;
create policy "tracking_settings_read" on public.tracking_settings for select to anon, authenticated using (true);

drop policy if exists "tracking_settings_admin_write" on public.tracking_settings;
create policy "tracking_settings_admin_write" on public.tracking_settings for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));
grant update on public.tracking_settings to authenticated;

-- Cookie consent log (LGPD proof of consent)
create table if not exists public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  anon_id text,
  necessary boolean not null default true,
  functional boolean not null default false,
  analytics boolean not null default false,
  marketing boolean not null default false,
  policy_version text not null default 'v1',
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_cookie_consents_anon on public.cookie_consents (anon_id, created_at desc);
grant insert on public.cookie_consents to anon;
grant insert, select on public.cookie_consents to authenticated;
grant all on public.cookie_consents to service_role;
alter table public.cookie_consents enable row level security;

drop policy if exists "cookie_consents_insert_any" on public.cookie_consents;
create policy "cookie_consents_insert_any" on public.cookie_consents for insert to anon, authenticated with check (true);

drop policy if exists "cookie_consents_read_own" on public.cookie_consents;
create policy "cookie_consents_read_own" on public.cookie_consents for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- Account deletion verification codes
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_adr_user on public.account_deletion_requests (user_id, created_at desc);
grant all on public.account_deletion_requests to service_role;
alter table public.account_deletion_requests enable row level security;

-- Permanent purge of every record owned by a user across the public schema
create or replace function public.purge_account_data(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  removed jsonb := '{}'::jsonb;
  cnt bigint;
begin
  if _user_id is null then
    raise exception 'user id is required';
  end if;

  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.data_type = 'uuid'
      and c.column_name in ('user_id','owner_id','account_owner_id','parent_owner_id','created_by')
      and c.table_name not in ('account_deletion_requests','security_audit_log','profiles')
    order by c.table_name
  loop
    begin
      execute format('delete from public.%I where %I = $1', r.table_name, r.column_name) using _user_id;
      get diagnostics cnt = row_count;
      if cnt > 0 then
        removed := removed || jsonb_build_object(r.table_name || '.' || r.column_name, cnt);
      end if;
    exception when others then
      removed := removed || jsonb_build_object(r.table_name || '.' || r.column_name, 'error: ' || sqlerrm);
    end;
  end loop;

  begin
    delete from public.user_roles where user_id = _user_id;
  exception when others then null;
  end;

  delete from public.account_deletion_requests where user_id = _user_id;
  delete from public.profiles where id = _user_id;

  return removed;
end;
$$;

revoke all on function public.purge_account_data(uuid) from public, anon, authenticated;
grant execute on function public.purge_account_data(uuid) to service_role;