create table if not exists public.course_worlds (
  id text not null,
  course_id text not null references public.courses(id) on delete cascade,
  position integer not null check (position > 0),
  content_version integer not null default 1 check (content_version > 0),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (course_id, id),
  unique (course_id, position)
);

create table if not exists public.course_levels (
  id text not null,
  course_id text not null references public.courses(id) on delete cascade,
  world_id text not null,
  position integer not null check (position > 0),
  content_version integer not null default 1 check (content_version > 0),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (course_id, world_id, id),
  unique (course_id, world_id, position),
  foreign key (course_id, world_id) references public.course_worlds(course_id, id) on delete cascade
);

create table if not exists public.kids_level_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  world_id text not null,
  level_id text not null,
  completed boolean not null default false,
  stars smallint not null default 0 check (stars between 0 and 3),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  best_attempt_id uuid,
  best_stars smallint check (best_stars between 1 and 3),
  best_command_count integer check (best_command_count >= 0),
  best_challenge_content_version integer check (best_challenge_content_version > 0),
  best_program jsonb check (best_program is null or (jsonb_typeof(best_program) = 'object' and octet_length(best_program::text) <= 65536)),
  best_recorded_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, world_id, level_id),
  foreign key (course_id, world_id, level_id) references public.course_levels(course_id, world_id, id) on delete cascade
);

create table if not exists public.kids_level_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  world_id text not null,
  level_id text not null,
  challenge_id text not null,
  challenge_content_version integer not null check (challenge_content_version > 0),
  program_schema text not null check (program_schema = 'systema.kids-program'),
  program_schema_version integer not null check (program_schema_version = 1),
  program jsonb not null check (jsonb_typeof(program) = 'object' and octet_length(program::text) <= 65536),
  attempt_payload jsonb not null check (jsonb_typeof(attempt_payload) = 'object' and octet_length(attempt_payload::text) <= 65536),
  validation_code text not null,
  valid boolean not null,
  stars smallint not null check (stars between 0 and 3),
  command_count integer not null check (command_count >= 0),
  operation_count integer not null check (operation_count >= 0),
  used_concepts text[] not null default '{}',
  created_at timestamptz not null,
  foreign key (course_id, world_id, level_id) references public.course_levels(course_id, world_id, id) on delete cascade
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.kids_level_progress'::regclass
      and conname = 'kids_level_progress_best_attempt_fk'
  ) then
    alter table public.kids_level_progress
      add constraint kids_level_progress_best_attempt_fk
      foreign key (best_attempt_id) references public.kids_level_attempts(id) on delete set null
      deferrable initially deferred;
  end if;
end;
$$;

create table if not exists public.kids_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  unlock_kind text not null check (unlock_kind in ('world', 'achievement', 'reward')),
  reference_id text not null check (reference_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  unlocked_at timestamptz not null default now(),
  unique (user_id, course_id, unlock_kind, reference_id)
);

create index if not exists course_levels_course_world_idx on public.course_levels(course_id, world_id, position);
create index if not exists kids_level_progress_user_course_idx on public.kids_level_progress(user_id, course_id, updated_at desc);
create index if not exists kids_level_attempts_user_course_idx on public.kids_level_attempts(user_id, course_id, created_at desc);
create index if not exists kids_unlocks_user_course_idx on public.kids_unlocks(user_id, course_id, unlocked_at desc);

create or replace function public.apply_kids_level_attempt()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.course_enrollments (user_id, course_id)
  values (new.user_id, new.course_id)
  on conflict (user_id, course_id) do nothing;

  insert into public.kids_level_progress (
    user_id, course_id, world_id, level_id, completed, stars, attempt_count,
    best_attempt_id, best_stars, best_command_count, best_challenge_content_version,
    best_program, best_recorded_at, completed_at, updated_at
  ) values (
    new.user_id, new.course_id, new.world_id, new.level_id, new.valid, case when new.valid then new.stars else 0 end, 1,
    case when new.valid then new.id end, case when new.valid then new.stars end,
    case when new.valid then new.command_count end, case when new.valid then new.challenge_content_version end,
    case when new.valid then new.program end, case when new.valid then new.created_at end,
    case when new.valid then new.created_at end, new.created_at
  )
  on conflict (user_id, course_id, world_id, level_id) do update set
    completed = kids_level_progress.completed or excluded.completed,
    stars = greatest(kids_level_progress.stars, excluded.stars),
    attempt_count = kids_level_progress.attempt_count + 1,
    best_attempt_id = case
      when excluded.completed and (
        kids_level_progress.best_attempt_id is null
        or excluded.best_stars > kids_level_progress.best_stars
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count < kids_level_progress.best_command_count)
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count = kids_level_progress.best_command_count and excluded.best_recorded_at < kids_level_progress.best_recorded_at)
      ) then excluded.best_attempt_id else kids_level_progress.best_attempt_id end,
    best_stars = case
      when excluded.completed and (
        kids_level_progress.best_attempt_id is null
        or excluded.best_stars > kids_level_progress.best_stars
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count < kids_level_progress.best_command_count)
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count = kids_level_progress.best_command_count and excluded.best_recorded_at < kids_level_progress.best_recorded_at)
      ) then excluded.best_stars else kids_level_progress.best_stars end,
    best_command_count = case
      when excluded.completed and (
        kids_level_progress.best_attempt_id is null
        or excluded.best_stars > kids_level_progress.best_stars
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count < kids_level_progress.best_command_count)
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count = kids_level_progress.best_command_count and excluded.best_recorded_at < kids_level_progress.best_recorded_at)
      ) then excluded.best_command_count else kids_level_progress.best_command_count end,
    best_challenge_content_version = case
      when excluded.completed and (
        kids_level_progress.best_attempt_id is null
        or excluded.best_stars > kids_level_progress.best_stars
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count < kids_level_progress.best_command_count)
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count = kids_level_progress.best_command_count and excluded.best_recorded_at < kids_level_progress.best_recorded_at)
      ) then excluded.best_challenge_content_version else kids_level_progress.best_challenge_content_version end,
    best_program = case
      when excluded.completed and (
        kids_level_progress.best_attempt_id is null
        or excluded.best_stars > kids_level_progress.best_stars
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count < kids_level_progress.best_command_count)
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count = kids_level_progress.best_command_count and excluded.best_recorded_at < kids_level_progress.best_recorded_at)
      ) then excluded.best_program else kids_level_progress.best_program end,
    best_recorded_at = case
      when excluded.completed and (
        kids_level_progress.best_attempt_id is null
        or excluded.best_stars > kids_level_progress.best_stars
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count < kids_level_progress.best_command_count)
        or (excluded.best_stars = kids_level_progress.best_stars and excluded.best_command_count = kids_level_progress.best_command_count and excluded.best_recorded_at < kids_level_progress.best_recorded_at)
      ) then excluded.best_recorded_at else kids_level_progress.best_recorded_at end,
    completed_at = coalesce(kids_level_progress.completed_at, excluded.completed_at),
    updated_at = greatest(kids_level_progress.updated_at, excluded.updated_at);

  insert into public.kids_unlocks (user_id, course_id, unlock_kind, reference_id, unlocked_at)
  values (new.user_id, new.course_id, 'world', new.world_id, new.created_at)
  on conflict (user_id, course_id, unlock_kind, reference_id) do nothing;

  if not exists (
    select 1
    from public.course_levels level
    where level.course_id = new.course_id
      and level.world_id = new.world_id
      and level.status = 'published'
      and not exists (
        select 1 from public.kids_level_progress progress
        where progress.user_id = new.user_id
          and progress.course_id = level.course_id
          and progress.world_id = level.world_id
          and progress.level_id = level.id
          and progress.completed
      )
  ) then
    insert into public.kids_unlocks (user_id, course_id, unlock_kind, reference_id, unlocked_at)
    select new.user_id, new.course_id, 'world', next_world.id, new.created_at
    from public.course_worlds current_world
    join public.course_worlds next_world
      on next_world.course_id = current_world.course_id
      and next_world.position = current_world.position + 1
      and next_world.status = 'published'
    where current_world.course_id = new.course_id and current_world.id = new.world_id
    on conflict (user_id, course_id, unlock_kind, reference_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_kids_level_attempt_recorded on public.kids_level_attempts;
create trigger on_kids_level_attempt_recorded
  after insert on public.kids_level_attempts
  for each row execute procedure public.apply_kids_level_attempt();

create or replace function public.claim_kids_world_unlock(p_course_id text, p_world_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  world_position integer;
begin
  if current_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select position into world_position
  from public.course_worlds
  where course_id = p_course_id and id = p_world_id and status = 'published';
  if world_position is null then raise exception 'world unavailable' using errcode = '22023'; end if;

  if world_position > 1 and exists (
    select 1
    from public.course_worlds previous_world
    join public.course_levels level on level.course_id = previous_world.course_id and level.world_id = previous_world.id and level.status = 'published'
    where previous_world.course_id = p_course_id
      and previous_world.position = world_position - 1
      and not exists (
        select 1 from public.kids_level_progress progress
        where progress.user_id = current_user_id
          and progress.course_id = level.course_id
          and progress.world_id = level.world_id
          and progress.level_id = level.id
          and progress.completed
      )
  ) then
    raise exception 'previous world incomplete' using errcode = '42501';
  end if;

  insert into public.kids_unlocks (user_id, course_id, unlock_kind, reference_id)
  values (current_user_id, p_course_id, 'world', p_world_id)
  on conflict (user_id, course_id, unlock_kind, reference_id) do nothing;
end;
$$;

alter table public.course_worlds enable row level security;
alter table public.course_levels enable row level security;
alter table public.kids_level_progress enable row level security;
alter table public.kids_level_attempts enable row level security;
alter table public.kids_unlocks enable row level security;

drop policy if exists "Published course worlds are readable" on public.course_worlds;
create policy "Published course worlds are readable" on public.course_worlds for select to anon, authenticated
using (status = 'published' and exists (select 1 from public.courses where courses.id = course_worlds.course_id and courses.status = 'published'));

drop policy if exists "Published course levels are readable" on public.course_levels;
create policy "Published course levels are readable" on public.course_levels for select to anon, authenticated
using (status = 'published' and exists (select 1 from public.course_worlds where course_worlds.course_id = course_levels.course_id and course_worlds.id = course_levels.world_id and course_worlds.status = 'published'));

drop policy if exists "Users read own Kids level progress" on public.kids_level_progress;
create policy "Users read own Kids level progress" on public.kids_level_progress for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read own Kids attempts" on public.kids_level_attempts;
create policy "Users read own Kids attempts" on public.kids_level_attempts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own Kids attempts" on public.kids_level_attempts;
create policy "Users insert own Kids attempts" on public.kids_level_attempts for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users read own Kids unlocks" on public.kids_unlocks;
create policy "Users read own Kids unlocks" on public.kids_unlocks for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.claim_kids_world_unlock(text, text) from public;
revoke all on function public.claim_kids_world_unlock(text, text) from anon;
grant execute on function public.claim_kids_world_unlock(text, text) to authenticated;

insert into public.courses (id, slug, title, description, status, lesson_count) values
  ('robot-quest-algorithms', 'robot-quest-algorithms', 'Robot Quest — Algorithms', 'Ігровий курс з алгоритмічного мислення для дітей від 6 років.', 'published', 0),
  ('code-adventure-javascript', 'code-adventure-javascript', 'Code Adventure — JavaScript', 'Перші видимі програми JavaScript у безпечному ігровому середовищі.', 'published', 0)
on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status, updated_at = now();

insert into public.course_worlds (id, course_id, position, content_version, title, status) values
  ('village', 'robot-quest-algorithms', 1, 1, 'Village', 'published'),
  ('village', 'code-adventure-javascript', 1, 1, 'Village', 'published')
on conflict (course_id, id) do update set title = excluded.title, position = excluded.position, content_version = excluded.content_version, status = excluded.status, updated_at = now();

insert into public.course_levels (id, course_id, world_id, position, content_version, title, status) values
  ('robot-village-01', 'robot-quest-algorithms', 'village', 1, 1, 'Перший крок', 'published'),
  ('robot-village-02', 'robot-quest-algorithms', 'village', 2, 1, 'Кілька кроків', 'published'),
  ('robot-village-03', 'robot-quest-algorithms', 'village', 3, 1, 'Поворот', 'published'),
  ('robot-village-04', 'robot-quest-algorithms', 'village', 4, 1, 'Обхід перешкоди', 'published'),
  ('robot-village-05', 'robot-quest-algorithms', 'village', 5, 1, 'Повторення', 'published'),
  ('code-village-01', 'code-adventure-javascript', 'village', 1, 1, 'hero.move()', 'published'),
  ('code-village-02', 'code-adventure-javascript', 'village', 2, 1, 'hero.move(3)', 'published'),
  ('code-village-03', 'code-adventure-javascript', 'village', 3, 1, 'hero.jump()', 'published'),
  ('code-village-04', 'code-adventure-javascript', 'village', 4, 1, 'Змінна та рух', 'published'),
  ('code-village-05', 'code-adventure-javascript', 'village', 5, 1, 'Перший цикл', 'published')
on conflict (course_id, world_id, id) do update set title = excluded.title, position = excluded.position, content_version = excluded.content_version, status = excluded.status, updated_at = now();
