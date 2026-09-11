-- FixiGo production database schema for Supabase Postgres.
-- Run this in Supabase Dashboard > SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text,
  last_name text,
  full_name text,
  email text unique,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text not null,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  category text not null,
  other_category text,
  issue_type text not null,
  other_issue text,
  description text not null,
  device_info text,
  location text not null,
  appointment_preference text,
  status text not null default 'New',
  priority text not null default 'Regular',
  assigned_provider_id uuid references public.providers(id) on delete set null,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  file_name text,
  mime_type text,
  file_size bigint,
  storage_bucket text not null default 'service-media',
  storage_path text not null,
  public_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  assigned_to text,
  status text not null default 'Assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_role text not null,
  sender_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete set null,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_requests_customer_id on public.service_requests(customer_id);
create index if not exists idx_service_requests_status on public.service_requests(status);
create index if not exists idx_service_requests_created_at on public.service_requests(created_at desc);
create index if not exists idx_service_media_request_id on public.service_media(request_id);
create index if not exists idx_messages_request_id on public.messages(request_id);

alter table public.customers enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_media enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;

create policy "customers can read their own profile"
on public.customers for select
using (auth.uid() = auth_user_id);

create policy "customers can update their own profile"
on public.customers for update
using (auth.uid() = auth_user_id);

create policy "customers can read own service requests"
on public.service_requests for select
using (
  customer_id in (
    select id from public.customers where auth_user_id = auth.uid()
  )
);

create policy "customers can create service requests"
on public.service_requests for insert
with check (
  customer_id in (
    select id from public.customers where auth_user_id = auth.uid()
  )
);

create policy "customers can read own request media"
on public.service_media for select
using (
  request_id in (
    select sr.id
    from public.service_requests sr
    join public.customers c on c.id = sr.customer_id
    where c.auth_user_id = auth.uid()
  )
);

create policy "customers can read own messages"
on public.messages for select
using (
  request_id in (
    select sr.id
    from public.service_requests sr
    join public.customers c on c.id = sr.customer_id
    where c.auth_user_id = auth.uid()
  )
);

insert into public.service_categories (name, sort_order)
values
  ('Lawn & Yard', 1),
  ('Plumbing', 2),
  ('Electrical', 3),
  ('HVAC', 4),
  ('Appliance Repair', 5),
  ('Roofing', 6),
  ('Gutter', 7),
  ('Painting', 8),
  ('Carpentry', 9),
  ('Doors & Windows', 10),
  ('Flooring', 11),
  ('Drywall', 12),
  ('Pest Control', 13),
  ('Cleaning', 14),
  ('Snow Removal', 15),
  ('General Handyman', 16),
  ('Other', 99)
on conflict (name) do nothing;
