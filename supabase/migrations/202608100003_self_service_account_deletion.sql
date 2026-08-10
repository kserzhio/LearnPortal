create or replace function public.delete_own_account(confirmation_phrase text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  last_authenticated_at timestamptz;
begin
  if caller_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if confirmation_phrase <> 'DELETE_ACCOUNT_CONFIRMED_V1' then
    raise exception 'invalid_confirmation' using errcode = '22023';
  end if;

  select users.last_sign_in_at
  into last_authenticated_at
  from auth.users as users
  where users.id = caller_id;

  if last_authenticated_at is null or last_authenticated_at < now() - interval '15 minutes' then
    raise exception 'reauthentication_required' using errcode = '42501';
  end if;

  delete from auth.users where id = caller_id;
  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_own_account(text) from public;
revoke all on function public.delete_own_account(text) from anon;
grant execute on function public.delete_own_account(text) to authenticated;

comment on function public.delete_own_account(text) is
  'Deletes only auth.uid() after an exact confirmation phrase and a sign-in within 15 minutes.';
