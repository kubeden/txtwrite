create extension if not exists pg_session_jwt;
create extension if not exists pgcrypto;

create table if not exists public.documents (
  id text primary key default gen_random_uuid()::text,
  user_id text not null default auth.user_id(),
  uuid text not null default gen_random_uuid()::text,
  title text not null default 'New Document',
  content text not null default '',
  version integer not null default 1,
  is_published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  folder_id text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now()
);

create index if not exists documents_user_updated_idx
  on public.documents (user_id, updated_at desc);

create table if not exists public.document_versions (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  user_id text not null default auth.user_id(),
  version integer not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists document_versions_user_document_idx
  on public.document_versions (user_id, document_id, created_at desc);

create table if not exists public.user_workspace_state (
  user_id text primary key default auth.user_id(),
  file_system jsonb not null default '[]'::jsonb,
  document_tabs jsonb not null default '[]'::jsonb,
  active_document_id text,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.user_workspace_state enable row level security;

grant usage on schema public to authenticated;
revoke usage on schema public from anonymous;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.document_versions to authenticated;
grant select, insert, update, delete on public.user_workspace_state to authenticated;
revoke all on public.documents from anonymous;
revoke all on public.document_versions from anonymous;
revoke all on public.user_workspace_state from anonymous;

drop policy if exists documents_select_own on public.documents;
drop policy if exists documents_insert_own on public.documents;
drop policy if exists documents_update_own on public.documents;
drop policy if exists documents_delete_own on public.documents;

create policy documents_select_own
  on public.documents for select to authenticated
  using ((select auth.user_id()) = user_id);

create policy documents_insert_own
  on public.documents for insert to authenticated
  with check ((select auth.user_id()) = user_id);

create policy documents_update_own
  on public.documents for update to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy documents_delete_own
  on public.documents for delete to authenticated
  using ((select auth.user_id()) = user_id);

drop policy if exists document_versions_select_own on public.document_versions;
drop policy if exists document_versions_insert_own on public.document_versions;
drop policy if exists document_versions_update_own on public.document_versions;
drop policy if exists document_versions_delete_own on public.document_versions;

create policy document_versions_select_own
  on public.document_versions for select to authenticated
  using ((select auth.user_id()) = user_id);

create policy document_versions_insert_own
  on public.document_versions for insert to authenticated
  with check (
    (select auth.user_id()) = user_id
    and exists (
      select 1 from public.documents
      where documents.id = document_versions.document_id
      and documents.user_id = (select auth.user_id())
    )
  );

create policy document_versions_update_own
  on public.document_versions for update to authenticated
  using ((select auth.user_id()) = user_id)
  with check (
    (select auth.user_id()) = user_id
    and exists (
      select 1 from public.documents
      where documents.id = document_versions.document_id
      and documents.user_id = (select auth.user_id())
    )
  );

create policy document_versions_delete_own
  on public.document_versions for delete to authenticated
  using ((select auth.user_id()) = user_id);

drop policy if exists user_workspace_state_select_own on public.user_workspace_state;
drop policy if exists user_workspace_state_insert_own on public.user_workspace_state;
drop policy if exists user_workspace_state_update_own on public.user_workspace_state;
drop policy if exists user_workspace_state_delete_own on public.user_workspace_state;

create policy user_workspace_state_select_own
  on public.user_workspace_state for select to authenticated
  using ((select auth.user_id()) = user_id);

create policy user_workspace_state_insert_own
  on public.user_workspace_state for insert to authenticated
  with check (
    (select auth.user_id()) = user_id
    and (
      active_document_id is null
      or exists (
        select 1 from public.documents
        where documents.id = user_workspace_state.active_document_id
        and documents.user_id = (select auth.user_id())
      )
    )
  );

create policy user_workspace_state_update_own
  on public.user_workspace_state for update to authenticated
  using ((select auth.user_id()) = user_id)
  with check (
    (select auth.user_id()) = user_id
    and (
      active_document_id is null
      or exists (
        select 1 from public.documents
        where documents.id = user_workspace_state.active_document_id
        and documents.user_id = (select auth.user_id())
      )
    )
  );

create policy user_workspace_state_delete_own
  on public.user_workspace_state for delete to authenticated
  using ((select auth.user_id()) = user_id);
