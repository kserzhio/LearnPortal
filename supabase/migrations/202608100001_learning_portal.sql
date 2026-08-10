create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  lesson_count integer not null default 0 check (lesson_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  position integer not null check (position > 0),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  position numeric(7, 4) not null default 0 check (position between 0 and 1),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, lesson_id)
);

create table if not exists public.simulator_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  simulator_id text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  state jsonb not null default '{}'::jsonb,
  validation_code text,
  score numeric(5, 2) check (score between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_architectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  lesson_id text references public.lessons(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  schema_version integer not null default 1 check (schema_version > 0),
  diagram jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_progress_user_updated_idx on public.lesson_progress(user_id, updated_at desc);
create index if not exists simulator_attempts_user_lesson_idx on public.simulator_attempts(user_id, lesson_id, created_at desc);
create index if not exists saved_architectures_user_updated_idx on public.saved_architectures(user_id, updated_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.simulator_attempts enable row level security;
alter table public.saved_architectures enable row level security;

create policy "Published courses are readable"
  on public.courses for select
  to anon, authenticated
  using (status = 'published');

create policy "Published lessons are readable"
  on public.lessons for select
  to anon, authenticated
  using (status = 'published' and exists (
    select 1 from public.courses where courses.id = lessons.course_id and courses.status = 'published'
  ));

create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users manage own enrollments"
  on public.course_enrollments for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own progress"
  on public.lesson_progress for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own simulator attempts"
  on public.simulator_attempts for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own architectures"
  on public.saved_architectures for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into public.courses (id, slug, title, description, status, lesson_count)
values ('high-load-architecture', 'high-load-architecture', 'Архітектура високонавантажених систем', 'Від оцінки навантаження до відмовостійкого multi-region System Design.', 'published', 19)
on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status, lesson_count = excluded.lesson_count, updated_at = now();

insert into public.lessons (id, course_id, position, title, status) values
  ('high-load-01', 'high-load-architecture', 1, 'Що таке високонавантажена система', 'published'),
  ('high-load-02', 'high-load-architecture', 2, 'Функціональні та нефункціональні вимоги', 'published'),
  ('high-load-03', 'high-load-architecture', 3, 'Оцінка навантаження', 'published'),
  ('high-load-04', 'high-load-architecture', 4, 'Як проєктувати систему', 'published'),
  ('high-load-05', 'high-load-architecture', 5, 'Монолітна архітектура', 'published'),
  ('high-load-06', 'high-load-architecture', 6, 'Мікросервісна архітектура', 'published'),
  ('high-load-07', 'high-load-architecture', 7, 'Архітектурні стилі', 'published'),
  ('high-load-08', 'high-load-architecture', 8, 'Проєктування API', 'published'),
  ('high-load-09', 'high-load-architecture', 9, 'Синхронна та асинхронна обробка', 'published'),
  ('high-load-10', 'high-load-architecture', 10, 'Реляційні бази даних', 'published'),
  ('high-load-11', 'high-load-architecture', 11, 'NoSQL та вибір бази', 'published'),
  ('high-load-12', 'high-load-architecture', 12, 'Реплікація, партиціювання та шардинг', 'published'),
  ('high-load-13', 'high-load-architecture', 13, 'Консистентність даних', 'published'),
  ('high-load-14', 'high-load-architecture', 14, 'Вертикальне масштабування', 'published'),
  ('high-load-15', 'high-load-architecture', 15, 'Горизонтальне масштабування', 'published'),
  ('high-load-16', 'high-load-architecture', 16, 'Кешування', 'published'),
  ('high-load-17', 'high-load-architecture', 17, 'CDN та робота зі статичними файлами', 'published'),
  ('high-load-18', 'high-load-architecture', 18, 'Моніторинг, логування та алертинг', 'published'),
  ('high-load-19', 'high-load-architecture', 19, 'Відмовостійкість і фінальний System Design', 'published')
on conflict (id) do update set title = excluded.title, status = excluded.status, position = excluded.position, updated_at = now();
