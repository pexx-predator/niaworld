
-- NiaWorld initial database schema
-- PostgreSQL / Supabase
-- Designed to be safely re-run for this initial schema.

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- 1. PROFILES
-- A profile is created automatically when a user registers.
-- =========================================================

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null
    check (char_length(trim(display_name)) between 1 and 80),
  bio text not null default ''
    check (char_length(bio) <= 500),
  country text not null default ''
    check (char_length(country) <= 100),
  languages text[] not null default '{}'
    check (cardinality(languages) <= 20),
  interests text[] not null default '{}'
    check (cardinality(interests) <= 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_country_idx
  on public.profiles (country);

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

-- =========================================================
-- 2. CULTURAL POSTS
-- =========================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(user_id)
    on delete cascade,
  body text not null
    check (char_length(trim(body)) between 1 and 3000),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

create index if not exists posts_author_created_idx
  on public.posts (author_id, created_at desc);

-- =========================================================
-- 3. COMMENTS
-- =========================================================

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id)
    on delete cascade,
  author_id uuid not null references public.profiles(user_id)
    on delete cascade,
  body text not null
    check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_created_idx
  on public.comments (post_id, created_at asc);

create index if not exists comments_author_idx
  on public.comments (author_id);

-- =========================================================
-- 4. POST LIKES
-- One like per member per post.
-- =========================================================

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id)
    on delete cascade,
  user_id uuid not null references public.profiles(user_id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx
  on public.post_likes (user_id);

-- =========================================================
-- 5. CONNECTION REQUESTS
-- =========================================================

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(user_id)
    on delete cascade,
  addressee_id uuid not null references public.profiles(user_id)
    on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_no_self check (requester_id <> addressee_id)
);

-- Prevent duplicate requests in either direction.
create unique index if not exists connections_unique_pair_idx
  on public.connections (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists connections_addressee_status_idx
  on public.connections (addressee_id, status);

create index if not exists connections_requester_status_idx
  on public.connections (requester_id, status);

-- =========================================================
-- 6. UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at
  on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at
  on public.posts;

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists connections_set_updated_at
  on public.connections;

create trigger connections_set_updated_at
before update on public.connections
for each row execute function public.set_updated_at();

-- =========================================================
-- 7. AUTOMATIC PROFILE CREATION
-- Do not trust user metadata for permissions or roles.
-- The username is generated from the auth UUID.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := coalesce(
    nullif(
      pg_catalog.left(
        pg_catalog.btrim(
          coalesce(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            ''
          )
        ),
        80
      ),
      ''
    ),
    nullif(
      pg_catalog.split_part(
        coalesce(new.email, 'member'),
        '@',
        1
      ),
      ''
    ),
    'NiaWorld member'
  );

  insert into public.profiles (
    user_id,
    username,
    display_name
  )
  values (
    new.id,
    'member_' || pg_catalog.replace(
      pg_catalog.left(new.id::text, 8),
      '-',
      ''
    ),
    chosen_name
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
  on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Trigger functions are not callable directly by API roles.
revoke all on function public.handle_new_user()
  from public, anon, authenticated;

revoke all on function public.set_updated_at()
  from public, anon, authenticated;

-- =========================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.connections enable row level security;

-- Revoke default API table privileges before granting only
-- the operations that the first version requires.

revoke all on table public.profiles
  from anon, authenticated;
revoke all on table public.posts
  from anon, authenticated;
revoke all on table public.comments
  from anon, authenticated;
revoke all on table public.post_likes
  from anon, authenticated;
revoke all on table public.connections
  from anon, authenticated;

-- Profiles: signed-in members can discover profiles.
grant select on public.profiles to authenticated;
grant update (
  username,
  display_name,
  bio,
  country,
  languages,
  interests,
  avatar_url
) on public.profiles to authenticated;

-- Posts: signed-in members can read and create posts.
-- Only editable content fields can be updated.
grant select, insert, delete on public.posts to authenticated;
grant update (body, image_url) on public.posts to authenticated;

-- Comments: create, read and delete your own comments.
grant select, insert, delete on public.comments to authenticated;

-- Likes: create and remove your own likes.
grant select, insert, delete on public.post_likes to authenticated;

-- Connections: request, view, update status and remove.
grant select, insert, delete on public.connections to authenticated;
grant update (status) on public.connections to authenticated;

-- =========================================================
-- 9. PROFILES POLICIES
-- =========================================================

drop policy if exists "Authenticated members can view profiles"
  on public.profiles;

create policy "Authenticated members can view profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Members can update their own profile"
  on public.profiles;

create policy "Members can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Client-side profile insertion is intentionally not granted.
-- The trusted auth trigger creates the initial profile.

-- =========================================================
-- 10. POSTS POLICIES
-- =========================================================

drop policy if exists "Authenticated members can view posts"
  on public.posts;

create policy "Authenticated members can view posts"
on public.posts
for select
to authenticated
using (true);

drop policy if exists "Members can create their own posts"
  on public.posts;

create policy "Members can create their own posts"
on public.posts
for insert
to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "Members can edit their own posts"
  on public.posts;

create policy "Members can edit their own posts"
on public.posts
for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

drop policy if exists "Members can delete their own posts"
  on public.posts;

create policy "Members can delete their own posts"
on public.posts
for delete
to authenticated
using ((select auth.uid()) = author_id);

-- =========================================================
-- 11. COMMENTS POLICIES
-- =========================================================

drop policy if exists "Authenticated members can view comments"
  on public.comments;

create policy "Authenticated members can view comments"
on public.comments
for select
to authenticated
using (true);

drop policy if exists "Members can comment as themselves"
  on public.comments;

create policy "Members can comment as themselves"
on public.comments
for insert
to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "Members can delete their own comments"
  on public.comments;

create policy "Members can delete their own comments"
on public.comments
for delete
to authenticated
using ((select auth.uid()) = author_id);

-- =========================================================
-- 12. POST LIKES POLICIES
-- =========================================================

drop policy if exists "Authenticated members can view likes"
  on public.post_likes;

create policy "Authenticated members can view likes"
on public.post_likes
for select
to authenticated
using (true);

drop policy if exists "Members can like posts as themselves"
  on public.post_likes;

create policy "Members can like posts as themselves"
on public.post_likes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can remove their own likes"
  on public.post_likes;

create policy "Members can remove their own likes"
on public.post_likes
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- =========================================================
-- 13. CONNECTION POLICIES
-- =========================================================

drop policy if exists "Members can view their connections"
  on public.connections;

create policy "Members can view their connections"
on public.connections
for select
to authenticated
using (
  (select auth.uid()) = requester_id
  or (select auth.uid()) = addressee_id
);

drop policy if exists "Members can send connection requests"
  on public.connections;

create policy "Members can send connection requests"
on public.connections
for insert
to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> addressee_id
  and status = 'pending'
);

drop policy if exists "Recipients can respond to pending requests"
  on public.connections;

create policy "Recipients can respond to pending requests"
on public.connections
for update
to authenticated
using (
  (select auth.uid()) = addressee_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = addressee_id
  and status in ('accepted', 'declined')
);

drop policy if exists "Participants can remove connections"
  on public.connections;

create policy "Participants can remove connections"
on public.connections
for delete
to authenticated
using (
  (select auth.uid()) = requester_id
  or (select auth.uid()) = addressee_id
);

commit;
