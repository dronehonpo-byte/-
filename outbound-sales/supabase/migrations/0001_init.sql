-- AIアウトバウンド営業SaaS 初期スキーマ
-- マルチテナント: 全テーブルが org_id(Clerk の orgId)を持ち、RLS で分離する。
-- アプリのサーバー側は service_role で接続し、常に org_id を指定する(二重防御)。

create extension if not exists "pgcrypto";

-- Clerk の JWT(Supabase サードパーティ認証連携)から org_id を取り出すヘルパ
create or replace function requesting_org_id() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'org_id', ''),
    nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')
  );
$$;

-- ===== 営業リスト =====
create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  company_name text not null,
  contact_name text,
  phone text not null, -- E.164
  email text,
  notes text,
  status text not null default 'new'
    check (status in ('new','calling','connected','appointment','rejected','dnc')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_org_idx on leads (org_id);
create index leads_org_phone_idx on leads (org_id, phone);

-- ===== 拒否リスト(DNC) =====
create table dnc_entries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  phone text not null, -- E.164
  reason text,
  source text not null default 'manual' check (source in ('manual','call_result','import')),
  created_at timestamptz not null default now(),
  unique (org_id, phone)
);
create index dnc_org_idx on dnc_entries (org_id);

-- ===== 営業トークシナリオ =====
create table scenarios (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null,
  product_name text not null,
  business_name text not null, -- 通話冒頭で必ず名乗る事業者名(特商法)
  purpose text not null,       -- 通話冒頭で必ず告げる目的(特商法)
  talk_flow text not null default '',
  objection_handling text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scenarios_org_idx on scenarios (org_id);

-- ===== 発信キャンペーン =====
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null,
  scenario_id uuid not null references scenarios (id),
  lead_ids uuid[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft','scheduled','running','paused','completed')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_org_idx on campaigns (org_id);

-- ===== 架電結果(全通話の記録・録音同意含む) =====
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  campaign_id uuid references campaigns (id),
  lead_id uuid references leads (id),
  phone text not null,
  outcome text not null check (outcome in
    ('appointment','interested','rejected','no_answer','blocked_dnc','blocked_hours','dry_run')),
  interest_level text check (interest_level in ('high','medium','low','none')),
  recording_url text,
  recording_consent boolean not null default false,
  disclosed_identity boolean not null default false, -- 冒頭名乗りの実施記録
  memo text,
  dry_run boolean not null default false,
  called_at timestamptz not null default now()
);
create index call_logs_org_idx on call_logs (org_id);
create index call_logs_org_called_idx on call_logs (org_id, called_at desc);

-- ===== RLS(全テーブル: 自テナントの行のみ) =====
alter table leads enable row level security;
alter table dnc_entries enable row level security;
alter table scenarios enable row level security;
alter table campaigns enable row level security;
alter table call_logs enable row level security;

create policy leads_tenant on leads
  using (org_id = requesting_org_id()) with check (org_id = requesting_org_id());
create policy dnc_tenant on dnc_entries
  using (org_id = requesting_org_id()) with check (org_id = requesting_org_id());
create policy scenarios_tenant on scenarios
  using (org_id = requesting_org_id()) with check (org_id = requesting_org_id());
create policy campaigns_tenant on campaigns
  using (org_id = requesting_org_id()) with check (org_id = requesting_org_id());
create policy call_logs_tenant on call_logs
  using (org_id = requesting_org_id()) with check (org_id = requesting_org_id());
