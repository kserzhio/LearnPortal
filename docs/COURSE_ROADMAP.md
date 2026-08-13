# Course roadmap voting

## Product policy

- Roadmap candidates come only from the shared course catalog entries with `status: "planned"`.
- Only authenticated users can vote. Guests see a sign-in prompt; SYSTEMA does not create an anonymous identity or keep authorization state in `localStorage`.
- One account has one vote across the entire roadmap. Choosing another course transfers that vote atomically through an upsert on `user_id`.
- Choosing the currently selected course deletes the vote. A vote can therefore be transferred or cancelled at any time.
- Vote totals are planning signals, not a promise of a release date.

## Data and privacy

`public.course_roadmap_votes` stores the authenticated `user_id`, selected `course_slug`, and timestamps. The primary key on `user_id` makes duplicate votes impossible. Row Level Security limits reads and mutations to the vote owner.

Clients do not receive other voters or their identifiers. Public totals come from the `course_roadmap_vote_totals()` security-definer function, which exposes only allowlisted course slugs and aggregate counts.

When a planned course is added or removed, update both the application catalog and the database check/function allowlist in a reviewed migration.

## Ranked admin query

Run this query in the Supabase SQL editor when a simple ranked view is needed:

```sql
select
  course_slug,
  count(*)::bigint as vote_count
from public.course_roadmap_votes
group by course_slug
order by vote_count desc, course_slug asc;
```

No separate roadmap CMS is required for the current catalog size.
