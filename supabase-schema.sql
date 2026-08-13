-- Run this once in Supabase SQL Editor.
-- The anon key is safe in a static GitHub Pages app when these policies are enabled.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 32),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_date date not null,
  attempts integer not null check (attempts between 1 and 7),
  won boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, user_id, game_date)
);

-- Create a profile automatically for anonymous or permanent users.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Player'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Also cover users that existed before this schema was installed.
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.scores enable row level security;

-- Make this setup safe to rerun after an earlier version of the schema.
drop policy if exists "profiles are visible to signed-in users" on public.profiles;
drop policy if exists "users can update their profile" on public.profiles;
drop policy if exists "users can update their display name" on public.profiles;
drop policy if exists "signed-in users can create groups" on public.groups;
drop policy if exists "signed-in users can look up groups" on public.groups;
drop policy if exists "members can view their groups" on public.groups;
drop policy if exists "members can view memberships" on public.group_members;
drop policy if exists "users can view their membership" on public.group_members;
drop policy if exists "users can join groups" on public.group_members;
drop policy if exists "owners can add themselves to groups" on public.group_members;
drop policy if exists "members can view scores" on public.scores;
drop policy if exists "users can submit their score" on public.scores;
drop policy if exists "users can update their score" on public.scores;

-- If an older version created a profiles.email column, do not expose it.
-- The app only needs id and display_name.
revoke all on table public.profiles from anon, authenticated;
grant select (id, display_name) on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "profiles are visible to signed-in users" on public.profiles for select to authenticated using (true);
create policy "users can update their display name" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "signed-in users can create groups" on public.groups for insert to authenticated with check (auth.uid() = owner_id);
create policy "members can view their groups" on public.groups for select to authenticated using (
  owner_id = auth.uid() or exists (
    select 1 from public.group_members gm
    where gm.group_id = public.groups.id and gm.user_id = auth.uid()
  )
);
-- Keep membership rows private; the app can still show the shared leaderboard
-- because scores are readable to members and display names are non-sensitive.
create policy "users can view their membership" on public.group_members for select to authenticated using (user_id = auth.uid());
create policy "owners can add themselves to groups" on public.group_members for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()
  )
);

-- Join by invite code without exposing every group and code to every user.
create or replace function public.join_group_by_code(input_code text)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select g.* into target_group
  from public.groups g
  where g.code = upper(trim(input_code));

  if not found then
    raise exception 'Group not found';
  end if;

  insert into public.group_members (group_id, user_id)
  values (target_group.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return query select target_group.id, target_group.name, target_group.code;
end;
$$;

revoke all on function public.join_group_by_code(text) from public;
grant execute on function public.join_group_by_code(text) to authenticated;

-- Return a circle's members only to people already in that circle. This keeps
-- membership private outside the group while letting the in-app count be accurate.
create or replace function public.get_group_members(input_group_id uuid)
returns table (user_id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select gm.user_id, coalesce(p.display_name, 'Player')
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  where gm.group_id = input_group_id
    and exists (
      select 1
      from public.group_members viewer_membership
      where viewer_membership.group_id = input_group_id
        and viewer_membership.user_id = auth.uid()
    )
  order by gm.joined_at asc;
$$;

revoke all on function public.get_group_members(uuid) from public;
grant execute on function public.get_group_members(uuid) to authenticated;

create policy "members can view scores" on public.scores for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.group_members gm where gm.group_id = public.scores.group_id and gm.user_id = auth.uid())
);
create policy "users can submit their score" on public.scores for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.group_members gm where gm.group_id = public.scores.group_id and gm.user_id = auth.uid())
);
create policy "users can update their score" on public.scores for update to authenticated
using (
  user_id = auth.uid() and exists (select 1 from public.group_members gm where gm.group_id = public.scores.group_id and gm.user_id = auth.uid())
)
with check (
  user_id = auth.uid() and exists (select 1 from public.group_members gm where gm.group_id = public.scores.group_id and gm.user_id = auth.uid())
);
