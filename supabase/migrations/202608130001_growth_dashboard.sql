create or replace function public.growth_dashboard_snapshot(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_learning_moderator() then
    raise exception 'growth_dashboard_forbidden' using errcode = '42501';
  end if;

  if p_start is null or p_end is null or p_end <= p_start or p_end - p_start > interval '366 days' then
    raise exception 'growth_dashboard_invalid_range' using errcode = '22023';
  end if;

  with
  adult_activity as (
    select user_id, course_id, updated_at as occurred_at from public.lesson_progress
    where updated_at >= p_start and updated_at < p_end
  ),
  kids_activity as (
    select user_id, course_id, created_at as occurred_at from public.kids_level_attempts
    where created_at >= p_start and created_at < p_end
  ),
  check_activity as (
    select user_id, course_id, created_at as occurred_at from public.knowledge_check_attempts
    where user_id is not null and created_at >= p_start and created_at < p_end
  ),
  active_users as (
    select user_id from adult_activity
    union select user_id from kids_activity
    union select user_id from check_activity
  ),
  completed_courses as (
    select progress.user_id, progress.course_id, max(progress.completed_at) as completed_at
    from public.lesson_progress progress
    join public.courses course on course.id = progress.course_id
    where progress.completed
    group by progress.user_id, progress.course_id, course.lesson_count
    having count(distinct progress.lesson_id) >= course.lesson_count and course.lesson_count > 0
  ),
  course_rows as (
    select course.id,
      course.title,
      (select count(*) from public.course_enrollments enrollment where enrollment.course_id = course.id)::integer as enrollments,
      (select count(distinct activity.user_id) from (
        select user_id, course_id from adult_activity
        union all select user_id, course_id from kids_activity
      ) activity where activity.course_id = course.id)::integer as active_learners,
      (select count(*) from public.lesson_progress progress where progress.course_id = course.id and progress.completed_at >= p_start and progress.completed_at < p_end)::integer as lesson_completions,
      (select count(*) from completed_courses completion where completion.course_id = course.id and completion.completed_at >= p_start and completion.completed_at < p_end)::integer as course_completions
    from public.courses course
    where course.status = 'published'
    order by course.title
  ),
  vote_rows as (
    select allowed.course_slug, count(vote.user_id)::integer as vote_count
    from (values ('frontend-architecture'::text), ('platform-engineering'::text)) allowed(course_slug)
    left join public.course_roadmap_votes vote using (course_slug)
    group by allowed.course_slug
    order by vote_count desc, allowed.course_slug
  )
  select jsonb_build_object(
    'period', jsonb_build_object('start', p_start, 'end', p_end),
    'learning', jsonb_build_object(
      'activeLearners', (select count(*) from active_users),
      'adultLessonRecords', (select count(*) from adult_activity),
      'lessonCompletions', (select count(*) from public.lesson_progress where completed_at >= p_start and completed_at < p_end),
      'courseCompletions', (select count(*) from completed_courses where completed_at >= p_start and completed_at < p_end),
      'kidsAttempts', (select count(*) from kids_activity),
      'kidsCompletions', (select count(*) from public.kids_level_attempts where valid and created_at >= p_start and created_at < p_end)
    ),
    'quality', jsonb_build_object(
      'feedbackTotal', (select count(*) from public.lesson_feedback where created_at >= p_start and created_at < p_end),
      'feedbackHelpful', (select count(*) from public.lesson_feedback where helpful and created_at >= p_start and created_at < p_end),
      'knowledgeAttempts', (select count(*) from public.knowledge_check_attempts where created_at >= p_start and created_at < p_end),
      'knowledgeCorrect', (select count(*) from public.knowledge_check_attempts where correct and created_at >= p_start and created_at < p_end),
      'questions', (select count(*) from public.lesson_questions where created_at >= p_start and created_at < p_end),
      'questionsResolved', (select count(*) from public.lesson_questions where status = 'resolved' and created_at >= p_start and created_at < p_end)
    ),
    'courses', coalesce((select jsonb_agg(to_jsonb(course_rows)) from course_rows), '[]'::jsonb),
    'roadmapVotes', coalesce((select jsonb_agg(to_jsonb(vote_rows)) from vote_rows), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.growth_dashboard_snapshot(timestamptz, timestamptz) from public;
grant execute on function public.growth_dashboard_snapshot(timestamptz, timestamptz) to authenticated;

comment on function public.growth_dashboard_snapshot(timestamptz, timestamptz) is
  'Moderator-only aggregate product snapshot. Returns no user identifiers, content bodies, comments, emails, or profiles.';
