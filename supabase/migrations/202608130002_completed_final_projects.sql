alter table public.saved_architectures
  add column if not exists project_id text,
  add column if not exists project_version integer check (project_version is null or project_version > 0),
  add column if not exists completed_at timestamptz;

create index if not exists saved_architectures_user_completed_idx
  on public.saved_architectures(user_id, completed_at desc)
  where completed_at is not null;

comment on column public.saved_architectures.project_id is 'Stable Systema final-project definition id.';
comment on column public.saved_architectures.project_version is 'Immutable final-project content version used for validation.';
comment on column public.saved_architectures.completed_at is 'First server-verified completion; later edits do not clear it.';

-- Existing owner-only RLS policy continues to cover the new metadata columns.
