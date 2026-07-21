-- 003: Tabella news fiscali per RAG (feed RSS + web search results)
-- Memorizza articoli normativi fiscali per arricchire le risposte del commercialista AI

create table if not exists veltra_news_fiscali (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  fonte text not null,
  titolo text not null,
  url text not null default '',
  contenuto text not null default '',
  data_pubblicazione date,
  tags text[] not null default '{}',
  rilevante_forfettario boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists veltra_news_fiscali_data_idx on veltra_news_fiscali (data_pubblicazione desc);
create index if not exists veltra_news_fiscali_tags_idx on veltra_news_fiscali using gin (tags);
create index if not exists veltra_news_fiscali_titolo_idx on veltra_news_fiscali using gin (to_tsvector('italian', titolo));
create index if not exists veltra_news_fiscali_contenuto_idx on veltra_news_fiscali using gin (to_tsvector('italian', contenuto));

drop policy if exists "news_fiscali_select" on veltra_news_fiscali;
create policy "news_fiscali_select" on veltra_news_fiscali
  for select to authenticated using (true);

drop policy if exists "news_fiscali_insert" on veltra_news_fiscali;
create policy "news_fiscali_insert" on veltra_news_fiscali
  for insert to authenticated with check (tenant_id = auth.uid()::text);

drop policy if exists "news_fiscali_delete" on veltra_news_fiscali;
create policy "news_fiscali_delete" on veltra_news_fiscali
  for delete to authenticated using (true);
