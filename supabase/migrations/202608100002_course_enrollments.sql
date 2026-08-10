insert into public.course_enrollments (user_id, course_id, enrolled_at)
select user_id, course_id, min(updated_at)
from public.lesson_progress
group by user_id, course_id
on conflict (user_id, course_id) do nothing;

create or replace function public.ensure_course_enrollment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.course_enrollments (user_id, course_id)
  values (new.user_id, new.course_id)
  on conflict (user_id, course_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_lesson_progress_enroll_user on public.lesson_progress;
create trigger on_lesson_progress_enroll_user
  before insert or update of course_id on public.lesson_progress
  for each row execute procedure public.ensure_course_enrollment();
