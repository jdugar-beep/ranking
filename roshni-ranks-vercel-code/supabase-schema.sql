-- Run this in Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamp with time zone default now()
);

create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  rating numeric not null check (rating >= 0 and rating <= 5),
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected')),
  created_at timestamp with time zone default now(),
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.profiles enable row level security;
alter table public.rankings enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profiles are searchable by signed in users" on public.profiles;
create policy "profiles are searchable by signed in users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id);

drop policy if exists "users can insert own rankings" on public.rankings;
create policy "users can insert own rankings"
on public.rankings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can view own or friend rankings" on public.rankings;
create policy "users can view own or friend rankings"
on public.rankings for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = rankings.user_id)
        or
        (f.addressee_id = auth.uid() and f.requester_id = rankings.user_id)
      )
  )
);

drop policy if exists "users can manage own rankings" on public.rankings;
create policy "users can manage own rankings"
on public.rankings for update
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can delete own rankings" on public.rankings;
create policy "users can delete own rankings"
on public.rankings for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can view relevant friendships" on public.friendships;
create policy "users can view relevant friendships"
on public.friendships for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "users can request friendships" on public.friendships;
create policy "users can request friendships"
on public.friendships for insert
to authenticated
with check (auth.uid() = requester_id);

drop policy if exists "addressee can respond to requests" on public.friendships;
create policy "addressee can respond to requests"
on public.friendships for update
to authenticated
using (auth.uid() = addressee_id);

create or replace view public.visible_rankings as
select r.*, p.email, p.display_name
from public.rankings r
join public.profiles p on p.id = r.user_id;

create or replace view public.friend_requests_view as
select f.id, f.requester_id, f.addressee_id, f.status, f.created_at, p.email, p.display_name
from public.friendships f
join public.profiles p on p.id = f.requester_id
where f.addressee_id = auth.uid() and f.status = 'pending';

create or replace view public.friends_view as
select 
  case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id,
  p.email,
  p.display_name
from public.friendships f
join public.profiles p
  on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
where f.status = 'accepted'
  and (f.requester_id = auth.uid() or f.addressee_id = auth.uid());
