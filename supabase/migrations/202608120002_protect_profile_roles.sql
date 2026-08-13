begin;

-- RLS controls rows, not individual columns. Once `role` was added to profiles,
-- the existing "Users update own profile" policy also covered that column.
-- Keep ordinary profile editing available while preventing self-promotion.
revoke update (role) on public.profiles from authenticated;

comment on column public.profiles.role is
  'Authorization role. Changes require an administrative database or service context.';

commit;
