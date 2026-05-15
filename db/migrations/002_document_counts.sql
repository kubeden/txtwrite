create table if not exists public.document_counts (
  document_id text primary key references public.documents(id) on delete cascade,
  user_id text not null default auth.user_id(),
  document_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists document_counts_user_idx
  on public.document_counts (user_id);

alter table public.document_counts enable row level security;

grant select, insert, update, delete on public.document_counts to authenticated;
revoke all on public.document_counts from anonymous;

drop policy if exists document_counts_select_own on public.document_counts;
drop policy if exists document_counts_insert_own on public.document_counts;
drop policy if exists document_counts_update_own on public.document_counts;
drop policy if exists document_counts_delete_own on public.document_counts;

create policy document_counts_select_own
  on public.document_counts for select to authenticated
  using ((select auth.user_id()) = user_id);

create policy document_counts_insert_own
  on public.document_counts for insert to authenticated
  with check (
    (select auth.user_id()) = user_id
    and exists (
      select 1 from public.documents
      where documents.id = document_counts.document_id
      and documents.user_id = (select auth.user_id())
    )
  );

create policy document_counts_update_own
  on public.document_counts for update to authenticated
  using ((select auth.user_id()) = user_id)
  with check (
    (select auth.user_id()) = user_id
    and exists (
      select 1 from public.documents
      where documents.id = document_counts.document_id
      and documents.user_id = (select auth.user_id())
    )
  );

create policy document_counts_delete_own
  on public.document_counts for delete to authenticated
  using ((select auth.user_id()) = user_id);
