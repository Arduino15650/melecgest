-- MELECGEST: accounts are explicitly allowed by email; MFA is mandatory.
create schema if not exists melec_private;
revoke all on schema melec_private from public;
grant usage on schema melec_private to authenticated;
create table public.melec_members(email text primary key check(email=lower(email)), role text not null check(role in ('admin','team')), active boolean not null default true);
create table public.melec_items(id uuid primary key default gen_random_uuid(),ref text not null unique check(length(ref) between 1 and 160),name text not null check(length(name) between 1 and 160),type text not null check(length(type) between 1 and 160),category text not null check(length(category) between 1 and 160),supplier text not null check(length(supplier) between 1 and 160),unit text not null check(length(unit) between 1 and 30),location text not null default '' check(length(location)<=160),threshold integer not null default 5 check(threshold between 0 and 10000000),stock integer not null default 0 check(stock between 0 and 10000000));
create table public.melec_movements(id uuid primary key default gen_random_uuid(),item_id uuid not null references public.melec_items(id),kind text not null check(kind in ('in','out')),quantity integer not null check(quantity between 1 and 10000000),note text not null default '' check(length(note)<=400),created timestamptz not null default now(),author uuid default auth.uid());
create index on public.melec_movements(item_id);
create index on public.melec_movements(created desc);
create table public.melec_settings(id integer primary key check(id=1),name text not null default '' check(length(name)<=160),address text not null default '' check(length(address)<=800),logo text not null default '' check(length(logo)<=400000 and (logo='' or logo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$')));
insert into public.melec_settings(id) values(1);

-- The privileged lookup is kept outside the exposed API schema.
create function melec_private.member_role(require_mfa boolean default true) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.melec_members m join auth.users u on lower(u.email)=m.email
 where u.id=auth.uid() and u.email_confirmed_at is not null and m.active
 and (not require_mfa or auth.jwt()->>'aal'='aal2')
 and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=u.id)
$$;
revoke all on function melec_private.member_role(boolean) from public;
grant execute on function melec_private.member_role(boolean) to authenticated;
alter table public.melec_members enable row level security;
alter table public.melec_items enable row level security;
alter table public.melec_movements enable row level security;
alter table public.melec_settings enable row level security;
create policy members_read on public.melec_members for select to authenticated using(email=lower(auth.jwt()->>'email') or melec_private.member_role()='admin');
create policy members_add on public.melec_members for insert to authenticated with check(melec_private.member_role()='admin' and email<>lower(auth.jwt()->>'email'));
create policy members_edit on public.melec_members for update to authenticated using(melec_private.member_role()='admin' and email<>lower(auth.jwt()->>'email')) with check(melec_private.member_role()='admin' and email<>lower(auth.jwt()->>'email'));
create policy items_read on public.melec_items for select to authenticated using(melec_private.member_role() is not null);
create policy items_add on public.melec_items for insert to authenticated with check(melec_private.member_role() is not null);
create policy items_edit on public.melec_items for update to authenticated using(melec_private.member_role() is not null) with check(melec_private.member_role() is not null);
create policy movements_read on public.melec_movements for select to authenticated using(melec_private.member_role() is not null);
create policy movements_add on public.melec_movements for insert to authenticated with check(melec_private.member_role() is not null and author=auth.uid());
create policy settings_read on public.melec_settings for select to authenticated using(melec_private.member_role() is not null);
create policy settings_edit on public.melec_settings for update to authenticated using(melec_private.member_role()='admin') with check(melec_private.member_role()='admin');
revoke all on public.melec_members,public.melec_items,public.melec_movements,public.melec_settings from anon,authenticated;
grant select,insert,update on public.melec_members to authenticated;
grant select on public.melec_items,public.melec_movements,public.melec_settings to authenticated;
grant insert(ref,name,type,category,supplier,unit,location,threshold) on public.melec_items to authenticated;
grant update(ref,name,type,category,supplier,unit,location,threshold) on public.melec_items to authenticated;
grant insert(item_id,kind,quantity,note) on public.melec_movements to authenticated;
grant update(name,address,logo) on public.melec_settings to authenticated;

-- Stock can only change through a movement. The guarded update locks the item
-- and prevents two simultaneous withdrawals from spending the same stock.
create function melec_private.record_movement() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if melec_private.member_role() is null or new.author is distinct from auth.uid() then raise exception 'Connexion et Authenticator requis.'; end if;
 update public.melec_items set stock=stock+case when new.kind='in' then new.quantity else -new.quantity end
 where id=new.item_id and stock+case when new.kind='in' then new.quantity else -new.quantity end between 0 and 10000000;
 if not found then raise exception 'Stock insuffisant ou quantité trop élevée.'; end if;
 return new;
end $$;
revoke all on function melec_private.record_movement() from public;
create trigger record_stock after insert on public.melec_movements for each row execute function melec_private.record_movement();

create function public.melec_access() returns text language sql stable security invoker set search_path='' as $$ select melec_private.member_role(false) $$;
create function public.melec_store() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r text:=melec_private.member_role(); result jsonb;
begin
 if r is null then raise exception 'Accès refusé. Connectez-vous et validez Authenticator.'; end if;
 select jsonb_build_object('items',coalesce((select jsonb_agg(i order by i.name) from public.melec_items i),'[]'::jsonb),
 'movements',coalesce((select jsonb_agg(m) from (select m.*,i.name,i.ref,i.unit from public.melec_movements m join public.melec_items i on i.id=m.item_id order by m.created desc limit 200) m),'[]'::jsonb),
 'totals',coalesce((select jsonb_agg(t) from (select item_id,sum(case when kind='in' then quantity else 0 end) incoming,sum(case when kind='out' then quantity else 0 end) outgoing from public.melec_movements group by item_id) t),'[]'::jsonb),
 'settings',(select to_jsonb(s) from public.melec_settings s where id=1),'configured',true,'admin',r='admin',
 'members',case when r='admin' then coalesce((select jsonb_agg(m order by email) from public.melec_members m),'[]'::jsonb) else '[]'::jsonb end) into result;
 return result;
end $$;
create function public.melec_mutate(b jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item uuid; r text:=melec_private.member_role(); a text:=b->>'action'; q integer;
begin
 if r is null then raise exception 'Accès refusé. Connectez-vous et validez Authenticator.'; end if;
 if a='item' then
  q:=(b->>'stock')::integer; if q<0 or q>10000000 then raise exception 'Quantité invalide.'; end if;
  insert into public.melec_items(ref,name,type,category,supplier,unit,location,threshold) values(trim(b->>'ref'),trim(b->>'name'),b->>'type',b->>'category',b->>'supplier',b->>'unit',coalesce(b->>'location',''),(b->>'threshold')::integer) returning id into item;
  if q>0 then insert into public.melec_movements(item_id,kind,quantity,note) values(item,'in',q,'Stock initial'); end if;
 elsif a='edit' then
  update public.melec_items set ref=trim(b->>'ref'),name=trim(b->>'name'),type=b->>'type',category=b->>'category',supplier=b->>'supplier',unit=b->>'unit',location=coalesce(b->>'location',''),threshold=(b->>'threshold')::integer where id=(b->>'id')::uuid;
  if not found then raise exception 'Article introuvable.'; end if;
 elsif a='movement' then
  insert into public.melec_movements(item_id,kind,quantity,note) values((b->>'id')::uuid,b->>'kind',(b->>'quantity')::integer,coalesce(b->>'note',''));
 elsif a='settings' and r='admin' then
  update public.melec_settings set name=b->>'name',address=b->>'address',logo=coalesce(b->>'logo','') where id=1;
 elsif a='member' and r='admin' then
  if lower(b->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Adresse e-mail invalide.'; end if;
  insert into public.melec_members(email,role,active) values(lower(trim(b->>'email')),b->>'role',true) on conflict(email) do update set role=excluded.role,active=true;
 elsif a='remove_member' and r='admin' then
  update public.melec_members set active=false where email=lower(b->>'email');
  if not found then raise exception 'Impossible de désactiver votre propre accès.'; end if;
 else raise exception 'Action non autorisée.';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.melec_access(),public.melec_store(),public.melec_mutate(jsonb) from public,anon;
grant execute on function public.melec_access(),public.melec_store(),public.melec_mutate(jsonb) to authenticated;
