-- Optional PRIVATE shared storage for Our Budget.
-- Run in the Supabase SQL editor of your own project.
-- Use only your Supabase project's public / anon key in the web app.
create extension if not exists pgcrypto;
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Budget',
  created_by uuid not null references auth.users(id),
  invite_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (family_id,user_id)
);
create table if not exists public.budget_snapshots (
  family_id uuid primary key references public.families(id) on delete cascade,
  revision integer not null default 1,
  data jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create index if not exists family_members_user_idx on public.family_members (user_id);
create or replace function public.is_family_member(fid uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.family_members m where m.family_id=fid and m.user_id=(select auth.uid()))
$$;
revoke all on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;
create or replace function public.join_family(invite uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select f.id into fid from public.families f where f.invite_token=invite;
  if fid is null then raise exception 'Invalid invitation'; end if;
  insert into public.family_members(family_id,user_id) values(fid,auth.uid()) on conflict do nothing;
  return fid;
end;$$;
revoke all on function public.join_family(uuid) from public;
grant execute on function public.join_family(uuid) to authenticated;
create or replace function public.add_creator_membership()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.family_members (family_id,user_id) values(new.id,new.created_by);
 return new;
end;$$;
drop trigger if exists add_creator_membership on public.families;
create trigger add_creator_membership after insert on public.families
for each row execute function public.add_creator_membership();
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.budget_snapshots enable row level security;
drop policy if exists families_read on public.families;
create policy families_read on public.families for select to authenticated using (public.is_family_member(id));
drop policy if exists families_create on public.families;
create policy families_create on public.families for insert to authenticated with check (created_by=(select auth.uid()));
drop policy if exists members_read on public.family_members;
create policy members_read on public.family_members for select to authenticated using(public.is_family_member(family_id));
drop policy if exists snapshots_read on public.budget_snapshots;
create policy snapshots_read on public.budget_snapshots for select to authenticated using (public.is_family_member(family_id));
drop policy if exists snapshots_create on public.budget_snapshots;
create policy snapshots_create on public.budget_snapshots for insert to authenticated with check (public.is_family_member(family_id) and updated_by=(select auth.uid()));
drop policy if exists snapshots_write on public.budget_snapshots;
create policy snapshots_write on public.budget_snapshots for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and updated_by=(select auth.uid()));
-- Enable Supabase Realtime for budget_snapshots through Dashboard > Database > Publications > supabase_realtime.
-- Never store passwords, bank login details, or API service-role keys in this database.
