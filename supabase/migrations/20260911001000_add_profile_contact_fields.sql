-- Store contact and profile details from Supabase Auth/X.
alter table public.profiles
  add column if not exists email text,
  add column if not exists profile_url text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  handle text;
begin
  handle := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    new.raw_user_meta_data ->> 'screen_name',
    new.raw_user_meta_data ->> 'username'
  );

  insert into public.profiles (
    id,
    email,
    display_name,
    x_handle,
    x_user_id,
    avatar_url,
    profile_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    handle,
    coalesce(new.raw_user_meta_data ->> 'sub', new.raw_user_meta_data ->> 'id'),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'profile_image_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'profile_url',
      new.raw_user_meta_data ->> 'url',
      case when handle is not null then 'https://x.com/' || handle end
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    x_handle = excluded.x_handle,
    x_user_id = excluded.x_user_id,
    avatar_url = excluded.avatar_url,
    profile_url = excluded.profile_url;

  return new;
end;
$$;

-- Backfill users who authenticated before these columns were added.
update public.profiles as profiles
set
  email = users.email,
  profile_url = coalesce(
    users.raw_user_meta_data ->> 'profile_url',
    users.raw_user_meta_data ->> 'url',
    case when profiles.x_handle is not null then 'https://x.com/' || profiles.x_handle end
  )
from auth.users as users
where profiles.id = users.id;
