-- Only active accounts receive an application profile; hide the internal label helper from API clients.
begin;
revoke execute on function public.actor_label() from public, anon, authenticated;
create or replace function public.get_my_profile()
returns table (user_id uuid, role public.app_role, display_name text, team_member_id uuid, base public.base_code)
language sql stable security definer set search_path = '' as $$
  select auth.uid(), r.role, public.actor_label(), t.id, t.base
  from public.user_roles r
  left join public.team_members t on t.auth_user_id = r.user_id and t.active
  where r.user_id = auth.uid() and r.is_active
$$;
commit;
