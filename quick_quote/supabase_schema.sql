
-- Minimal Supabase schema for Quick Quote MVP
create table if not exists products(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text,
  unit text,
  active boolean default true
);
create table if not exists price_lists(
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  customer_id uuid,
  name text not null default 'Default',
  currency text not null default 'EUR',
  valid_from date not null default now(),
  valid_to date
);
create table if not exists price_list_entries(
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid references price_lists(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  unit_price numeric not null,
  unique(price_list_id, product_id)
);
create table if not exists rule_sets(
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  version int not null,
  active_from timestamptz not null default now(),
  rules jsonb not null,
  assemblies jsonb not null,
  checksum text
);
create table if not exists quotes(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  customer_id uuid,
  created_by uuid,
  currency text not null default 'EUR',
  input_snapshot jsonb not null,
  result_snapshot jsonb not null,
  subtotal numeric not null,
  tax numeric not null,
  total numeric not null,
  created_at timestamptz not null default now()
);
create table if not exists quote_lines(
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  product_id uuid references products(id),
  code text not null,
  name text not null,
  unit text,
  qty numeric not null,
  unit_price numeric not null,
  line_total numeric not null
);
alter table products enable row level security;
alter table price_lists enable row level security;
alter table price_list_entries enable row level security;
alter table rule_sets enable row level security;
alter table quotes enable row level security;
alter table quote_lines enable row level security;
create policy "read_products_mvp" on products for select using (true);
