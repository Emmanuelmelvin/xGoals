-- X OAuth tokens vault — per-user, encrypted at rest via Supabase Vault
-- (https://supabase.com/docs/guides/database/vault). Vault is available on
-- Free and Pro (extension enabled by default, key managed outside DB).
--
-- Why Vault and not Secrets Manager: Secrets Manager holds ONE service secret
-- (agent_writer password, AGENT.md:66). X tokens are per-user (thousands of
-- rows), rotated per-user, and need row-level ownership — Vault + pgsodium
-- is the right fit. All writes go through SECURITY DEFINER functions that
-- only service_role can EXECUTE; anon/authenticated have no access at all.
-- Raw tokens never leave the DB except as decrypted_secret via the
-- service_role view inside the function, never to the browser.

-- Ensure pgsodium / vault are available (no-op if already enabled on hosted).
create extension if not exists "pgsodium" cascade;
-- On Supabase the extension is named "supabase_vault" (schema "vault").
-- Keep both spellings idempotent for local vs hosted.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'supabase_vault') then
    begin
      create extension "supabase_vault" cascade;
    exception when others then null;
    end;
  end if;
  if not exists (select 1 from pg_extension where extname = 'vault') then
    begin
      create extension "vault" cascade;
    exception when others then null;
    end;
  end if;
end
$$;

create table if not exists public.x_tokens (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  -- Vault secret ids (see vault.secrets). No FK to vault.secrets to avoid
  -- cross-schema permission issues; the functions manage lifecycle.
  access_secret_id uuid,
  refresh_secret_id uuid,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  x_user_id text,
  x_handle text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists x_tokens_access_expires_at_idx
  on public.x_tokens (access_token_expires_at) where access_token_expires_at is not null;

alter table public.x_tokens enable row level security;

-- Lock down: no anon / authenticated access at all. Only service_role
-- (and the SECURITY DEFINER functions below) can touch this table.
revoke all on table public.x_tokens from anon, authenticated;
grant all on table public.x_tokens to service_role;

-- No policies for anon/authenticated — they get 0 rows. Service_role bypasses
-- RLS, but we still create an explicit service_role policy for clarity.
drop policy if exists "Service can manage x_tokens" on public.x_tokens;
create policy "Service can manage x_tokens"
  on public.x_tokens for all to service_role using (true) with check (true);

drop trigger if exists set_x_tokens_updated_at on public.x_tokens;
create trigger set_x_tokens_updated_at
  before update on public.x_tokens
  for each row
  execute procedure public.set_updated_at();

-- Helper: upsert X tokens for an owner. Creates vault secrets on first login,
-- updates them on refresh/reconnect. Only service_role may call it.
-- p_access_token / p_refresh_token are the raw X OAuth tokens (never logged).
-- p_expires_in is seconds until expiry (X returns 7200); we store expires_at.
create or replace function public.set_x_tokens(
  p_owner_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_expires_in integer default 7200,
  p_scopes text[] default null,
  p_x_user_id text default null,
  p_x_handle text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.x_tokens%rowtype;
  v_access_id uuid;
  v_refresh_id uuid;
  v_expires_at timestamptz;
  v_scopes text[];
begin
  if p_owner_id is null then
    raise exception 'owner_id is required';
  end if;
  if p_access_token is null or char_length(trim(p_access_token)) = 0 then
    raise exception 'access_token is required';
  end if;

  -- Expires_at: now + expires_in (default 7200s = 2h for X). Clamp to sane range.
  if p_expires_in is null or p_expires_in < 60 then
    p_expires_in := 7200;
  elsif p_expires_in > 86400 then
    p_expires_in := 86400;
  end if;
  v_expires_at := timezone('utc', now()) + (p_expires_in || ' seconds')::interval;

  v_scopes := coalesce(p_scopes, '{}');

  select * into v_row from public.x_tokens where owner_id = p_owner_id;

  if v_row.owner_id is not null then
    -- Update existing vault secrets, or create if missing (e.g., old row)
    if v_row.access_secret_id is not null then
      perform vault.update_secret(v_row.access_secret_id, p_access_token);
      v_access_id := v_row.access_secret_id;
    else
      select vault.create_secret(p_access_token) into v_access_id;
    end if;

    if p_refresh_token is not null and char_length(trim(p_refresh_token)) > 0 then
      if v_row.refresh_secret_id is not null then
        perform vault.update_secret(v_row.refresh_secret_id, p_refresh_token);
        v_refresh_id := v_row.refresh_secret_id;
      else
        select vault.create_secret(p_refresh_token) into v_refresh_id;
      end if;
    else
      v_refresh_id := v_row.refresh_secret_id;
    end if;

    update public.x_tokens
       set access_secret_id = v_access_id,
           refresh_secret_id = v_refresh_id,
           access_token_expires_at = v_expires_at,
           scopes = v_scopes,
           x_user_id = coalesce(p_x_user_id, x_user_id),
           x_handle = coalesce(p_x_handle, x_handle),
           updated_at = timezone('utc', now())
     where owner_id = p_owner_id;
  else
    -- First time: create vault secrets then row
    select vault.create_secret(p_access_token) into v_access_id;
    if p_refresh_token is not null and char_length(trim(p_refresh_token)) > 0 then
      select vault.create_secret(p_refresh_token) into v_refresh_id;
    end if;

    insert into public.x_tokens (owner_id, access_secret_id, refresh_secret_id, access_token_expires_at, scopes, x_user_id, x_handle)
    values (p_owner_id, v_access_id, v_refresh_id, v_expires_at, v_scopes, p_x_user_id, p_x_handle);
  end if;
end;
$$;

revoke all on function public.set_x_tokens(uuid, text, text, integer, text[], text, text) from public, anon, authenticated;
grant execute on function public.set_x_tokens(uuid, text, text, integer, text[], text, text) to service_role;

-- Helper: read decrypted tokens for a single owner (service_role only).
-- Returns jsonb {access_token, refresh_token, expires_at, scopes, x_user_id, x_handle}
-- or null if no row. The view vault.decrypted_secrets exposes decrypted_secret.
create or replace function public.get_x_tokens(p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.x_tokens%rowtype;
  v_access text;
  v_refresh text;
begin
  if p_owner_id is null then return null; end if;
  select * into v_row from public.x_tokens where owner_id = p_owner_id;
  if not found then return null; end if;

  if v_row.access_secret_id is not null then
    select decrypted_secret into v_access from vault.decrypted_secrets where id = v_row.access_secret_id;
  end if;
  if v_row.refresh_secret_id is not null then
    select decrypted_secret into v_refresh from vault.decrypted_secrets where id = v_row.refresh_secret_id;
  end if;

  return jsonb_build_object(
    'access_token', coalesce(v_access, ''),
    'refresh_token', coalesce(v_refresh, ''),
    'expires_at', v_row.access_token_expires_at,
    'scopes', to_jsonb(coalesce(v_row.scopes, '{}')),
    'x_user_id', v_row.x_user_id,
    'x_handle', v_row.x_handle,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.get_x_tokens(uuid) from public, anon, authenticated;
grant execute on function public.get_x_tokens(uuid) to service_role;

-- Helper: delete tokens (disconnect X). Removes vault secrets and row.
create or replace function public.delete_x_tokens(p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.x_tokens%rowtype;
begin
  if p_owner_id is null then return; end if;
  select * into v_row from public.x_tokens where owner_id = p_owner_id;
  if not found then return; end if;

  -- Best-effort vault cleanup; ignore if secret already gone
  begin
    if v_row.access_secret_id is not null then
      delete from vault.secrets where id = v_row.access_secret_id;
    end if;
  exception when others then null;
  end;
  begin
    if v_row.refresh_secret_id is not null then
      delete from vault.secrets where id = v_row.refresh_secret_id;
    end if;
  exception when others then null;
  end;

  delete from public.x_tokens where owner_id = p_owner_id;
end;
$$;

revoke all on function public.delete_x_tokens(uuid) from public, anon, authenticated;
grant execute on function public.delete_x_tokens(uuid) to service_role;

comment on table public.x_tokens is 'Per-user X OAuth tokens encrypted via Supabase Vault (vault.secrets). Only service_role via SECURITY DEFINER functions may read/write; anon/authenticated have no access. Browser never sees tokens.';
comment on function public.set_x_tokens(uuid, text, text, integer, text[], text, text) is 'Upsert X OAuth tokens for owner_id into Vault. Creates/updates vault.secrets and x_tokens row. Call from auth callback with service_role after exchangeCodeForSession.';
comment on function public.get_x_tokens(uuid) is 'Return decrypted X tokens for owner_id (service_role only). Used by agent dispatcher/publisher to call api.x.com on behalf of the user.';
