-- Aurelia Estates: Supabase schema. Paste in Supabase > SQL Editor > Run.

create table if not exists public.properties (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key check (id = 1),
  data jsonb not null
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  property_id text,
  property_title text,
  kind text not null default 'enquiry' check (kind in ('enquiry','visit')),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 6 and 20),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text check (message is null or char_length(message) <= 2000),
  visit_date text,
  visit_time text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

alter table public.properties enable row level security;
alter table public.settings   enable row level security;
alter table public.leads      enable row level security;
alter table public.admins     enable row level security;

-- Public: read listings and site settings
create policy "public read properties" on public.properties for select using (true);
create policy "public read settings"   on public.settings   for select using (true);
-- Admin: full control
create policy "admin write properties" on public.properties for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write settings"   on public.settings   for all using (public.is_admin()) with check (public.is_admin());
-- Leads: anyone may submit, only admin may read/change/delete
create policy "anyone inserts leads" on public.leads for insert with check (status = 'new');
create policy "admin reads leads"    on public.leads for select using (public.is_admin());
create policy "admin updates leads"  on public.leads for update using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes leads"  on public.leads for delete using (public.is_admin());
-- Admins table: a signed-in user can only check their own row
create policy "read own admin row" on public.admins for select using (user_id = auth.uid());

-- Storage bucket for photos / videos (public read, admin write)
insert into storage.buckets (id, name, public) values ('property-media', 'property-media', true)
on conflict (id) do nothing;

create policy "media public read" on storage.objects for select using (bucket_id = 'property-media');
create policy "media admin insert" on storage.objects for insert with check (bucket_id = 'property-media' and public.is_admin());
create policy "media admin update" on storage.objects for update using (bucket_id = 'property-media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete using (bucket_id = 'property-media' and public.is_admin());

-- AFTER creating your admin user (Authentication > Users > Add user), run:
-- insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL';
