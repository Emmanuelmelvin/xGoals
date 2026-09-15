-- Fix anon exposure of profiles.email / profile_url.
-- Discovery pages only need public X identity. Serve that through a view
-- and lock the base table back to owner-only + service_role.
-- Authenticated keeps its owner-scoped select/update grant from the initial
-- migration; after the permissive policy below is dropped, RLS restricts
-- authenticated reads to their own row (email stays private).
-- Anon gets no base-table access at all.

-- Safe public identity for attribution (display name, X handle, avatar).
-- Definer view: runs as owner so anon can read safe columns without
-- base-table access. No emails, urls, or tokens here.
drop view if exists public.public_profiles;
create view public.public_profiles
as
  select id, display_name, x_handle, avatar_url
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Remove the overly broad policy; owner policies from the initial
-- migration (Users can view/update their own profile) stay in place.
drop policy if exists "Profiles are readable by everyone" on public.profiles;

revoke all on table public.profiles from anon;
-- Authenticated keeps owner-scoped select/update via RLS; the view covers
-- public reads so emails and profile urls never leak to anon.
