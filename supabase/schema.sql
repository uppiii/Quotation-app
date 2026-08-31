-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query)

-- 1. QUOTATIONS TABLE
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quotation_number text not null,
  customer_name text not null,
  company_name text,
  email text,
  phone text,
  quotation_date date not null,
  valid_until date,
  subtotal numeric(12,2) not null default 0,
  gst_percent numeric(5,2) not null default 18,
  gst numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamp with time zone default now()
);

-- 2. QUOTATION ITEMS TABLE
create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  product_name text not null,
  quantity numeric(10,2) not null,
  unit_price numeric(12,2) not null,
  discount numeric(5,2) not null default 0,
  amount numeric(12,2) not null default 0
);

-- 3. INDEXES
create index if not exists idx_quotations_user_id on quotations(user_id);
create index if not exists idx_quotation_items_quotation_id on quotation_items(quotation_id);

-- 4. ROW LEVEL SECURITY
alter table quotations enable row level security;
alter table quotation_items enable row level security;

-- Quotations: a user can only read/write their own rows
create policy "Users can view own quotations"
  on quotations for select
  using (auth.uid() = user_id);

create policy "Users can insert own quotations"
  on quotations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own quotations"
  on quotations for delete
  using (auth.uid() = user_id);

create policy "Users can update own quotations"
  on quotations for update
  using (auth.uid() = user_id);

-- Quotation items: allowed if the parent quotation belongs to the user
create policy "Users can view own quotation items"
  on quotation_items for select
  using (
    exists (
      select 1 from quotations
      where quotations.id = quotation_items.quotation_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can insert own quotation items"
  on quotation_items for insert
  with check (
    exists (
      select 1 from quotations
      where quotations.id = quotation_items.quotation_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can delete own quotation items"
  on quotation_items for delete
  using (
    exists (
      select 1 from quotations
      where quotations.id = quotation_items.quotation_id
      and quotations.user_id = auth.uid()
    )
  );
