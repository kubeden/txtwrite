create table if not exists public.document_counts (
  document_id text primary key references public.documents(id) on delete cascade,
  user_id text not null default auth.user_id(),
  character_count integer not null default 0,
  word_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists document_counts_user_updated_idx
  on public.document_counts (user_id, updated_at desc);

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

create or replace function public.update_document_counts()
returns trigger
language plpgsql
as $$
begin
  insert into public.document_counts (
    document_id,
    user_id,
    character_count,
    word_count,
    updated_at
  )
  values (
    new.id,
    new.user_id,
    length(new.content),
    case
      when btrim(new.content) = '' then 0
      else cardinality(regexp_split_to_array(btrim(new.content), '[[:space:]]+'))
    end,
    now()
  )
  on conflict (document_id) do update
  set
    user_id = excluded.user_id,
    character_count = excluded.character_count,
    word_count = excluded.word_count,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists documents_update_counts on public.documents;

create trigger documents_update_counts
  after insert or update of content, user_id
  on public.documents
  for each row
  execute function public.update_document_counts();

insert into public.document_counts (
  document_id,
  user_id,
  character_count,
  word_count,
  updated_at
)
select
  documents.id,
  documents.user_id,
  length(documents.content),
  case
    when btrim(documents.content) = '' then 0
    else cardinality(regexp_split_to_array(btrim(documents.content), '[[:space:]]+'))
  end,
  now()
from public.documents
on conflict (document_id) do update
set
  user_id = excluded.user_id,
  character_count = excluded.character_count,
  word_count = excluded.word_count,
  updated_at = excluded.updated_at;
