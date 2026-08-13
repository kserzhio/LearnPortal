alter table public.profiles
  add column if not exists role text not null default 'USER'
  check (role in ('USER', 'INSTRUCTOR', 'ADMIN'));

create or replace function public.is_learning_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('INSTRUCTOR', 'ADMIN')
  );
$$;

revoke all on function public.is_learning_moderator() from public;
grant execute on function public.is_learning_moderator() to anon, authenticated;

create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  content_id text not null check (content_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  type text not null check (type in ('question', 'idea', 'lesson-problem')),
  title text not null check (char_length(title) between 5 and 140),
  body text not null check (char_length(body) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.lesson_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  body text not null check (char_length(body) between 2 and 4000),
  is_official_answer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reply_useful_votes (
  reply_id uuid not null references public.lesson_replies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create table if not exists public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  content_id text not null check (content_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_key uuid,
  subject_key text not null,
  helpful boolean not null,
  reasons text[] not null default '{}',
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((user_id is not null) <> (anonymous_key is not null))
);

create table if not exists public.knowledge_check_attempts (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  content_id text not null check (content_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  check_id text not null check (check_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_key uuid,
  selected_answer text not null check (char_length(selected_answer) between 1 and 100),
  correct boolean not null,
  created_at timestamptz not null default now(),
  check ((user_id is not null) <> (anonymous_key is not null))
);

create unique index if not exists lesson_feedback_user_content_idx
  on public.lesson_feedback(subject_key, course_id, content_id);
create index if not exists lesson_questions_content_idx on public.lesson_questions(course_id, content_id, created_at desc);
create index if not exists lesson_replies_question_idx on public.lesson_replies(question_id, created_at);
create index if not exists knowledge_check_attempts_content_idx on public.knowledge_check_attempts(course_id, content_id, check_id, created_at desc);

alter table public.lesson_questions enable row level security;
alter table public.lesson_replies enable row level security;
alter table public.reply_useful_votes enable row level security;
alter table public.lesson_feedback enable row level security;
alter table public.knowledge_check_attempts enable row level security;

create policy "Lesson questions are readable" on public.lesson_questions for select to anon, authenticated using (true);
create policy "Authenticated users create questions" on public.lesson_questions for insert to authenticated with check (auth.uid() = user_id);
create policy "Owners or moderators delete questions" on public.lesson_questions for delete to authenticated using (auth.uid() = user_id or public.is_learning_moderator());
create policy "Moderators resolve questions" on public.lesson_questions for update to authenticated using (public.is_learning_moderator()) with check (public.is_learning_moderator());

create policy "Lesson replies are readable" on public.lesson_replies for select to anon, authenticated using (true);
create policy "Authenticated users create replies" on public.lesson_replies for insert to authenticated with check (auth.uid() = user_id and not is_official_answer);
create policy "Owners or moderators delete replies" on public.lesson_replies for delete to authenticated using (auth.uid() = user_id or public.is_learning_moderator());
create policy "Moderators mark official answers" on public.lesson_replies for update to authenticated using (public.is_learning_moderator()) with check (public.is_learning_moderator());

create policy "Users read own useful votes" on public.reply_useful_votes for select to authenticated using (auth.uid() = user_id);
create policy "Users manage own useful votes" on public.reply_useful_votes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.reply_useful_counts
with (security_invoker = false)
as select reply_id, count(*)::integer as useful_count from public.reply_useful_votes group by reply_id;
revoke all on public.reply_useful_counts from public;
grant select on public.reply_useful_counts to anon, authenticated;

create policy "Users create own lesson feedback" on public.lesson_feedback for insert to authenticated with check (auth.uid() = user_id and anonymous_key is null and subject_key = auth.uid()::text);
create policy "Users update own lesson feedback" on public.lesson_feedback for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and anonymous_key is null and subject_key = auth.uid()::text);
create policy "Guests create anonymous lesson feedback" on public.lesson_feedback for insert to anon with check (user_id is null and anonymous_key is not null and subject_key = anonymous_key::text);
create policy "Guests update anonymous lesson feedback" on public.lesson_feedback for update to anon using (user_id is null and anonymous_key is not null and subject_key = anonymous_key::text) with check (user_id is null and anonymous_key is not null and subject_key = anonymous_key::text);
create policy "Moderators read lesson feedback" on public.lesson_feedback for select to authenticated using (public.is_learning_moderator());
create policy "Users create own knowledge attempts" on public.knowledge_check_attempts for insert to authenticated with check (auth.uid() = user_id and anonymous_key is null);
create policy "Guests create anonymous knowledge attempts" on public.knowledge_check_attempts for insert to anon with check (user_id is null and anonymous_key is not null);
create policy "Users read own knowledge attempts" on public.knowledge_check_attempts for select to authenticated using (auth.uid() = user_id or public.is_learning_moderator());

comment on table public.lesson_questions is 'Flat, lesson-scoped learning Q&A; content_id supports lessons and Kids levels.';
comment on table public.lesson_feedback is 'Queryable helpful ratio and optional negative reasons; no public read policy.';
