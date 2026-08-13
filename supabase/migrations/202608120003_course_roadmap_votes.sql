create table if not exists public.course_roadmap_votes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  course_slug text not null check (course_slug in ('frontend-architecture', 'platform-engineering')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_roadmap_votes_slug_idx
  on public.course_roadmap_votes(course_slug);

alter table public.course_roadmap_votes enable row level security;

revoke all on public.course_roadmap_votes from anon;
grant select, insert, update, delete on public.course_roadmap_votes to authenticated;

drop policy if exists "Users read own roadmap vote" on public.course_roadmap_votes;
drop policy if exists "Users insert own roadmap vote" on public.course_roadmap_votes;
drop policy if exists "Users update own roadmap vote" on public.course_roadmap_votes;
drop policy if exists "Users delete own roadmap vote" on public.course_roadmap_votes;

create policy "Users read own roadmap vote"
  on public.course_roadmap_votes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own roadmap vote"
  on public.course_roadmap_votes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own roadmap vote"
  on public.course_roadmap_votes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own roadmap vote"
  on public.course_roadmap_votes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.course_roadmap_vote_totals()
returns table(course_slug text, vote_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select allowed.course_slug, count(votes.user_id)::bigint as vote_count
  from (values ('frontend-architecture'::text), ('platform-engineering'::text)) as allowed(course_slug)
  left join public.course_roadmap_votes votes using (course_slug)
  group by allowed.course_slug
  order by allowed.course_slug;
$$;

revoke all on function public.course_roadmap_vote_totals() from public;
grant execute on function public.course_roadmap_vote_totals() to anon, authenticated;
