-- 004: Chat sessioni multiple per il commercialista AI
-- Permette di gestire piu conversazioni simultanee (sidebar a destra)

-- Tabella sessioni di chat
create table if not exists veltra_chat_sessioni (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  titolo text not null default 'Nuova conversazione',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists veltra_chat_sessioni_tenant_idx on veltra_chat_sessioni (tenant_id);

-- Aggiungi session_id a chat_messages (nullable per retrocompatibilita)
alter table veltra_chat_messages add column if not exists session_id uuid;
create index if not exists veltra_chat_messages_session_idx on veltra_chat_messages (session_id);

-- RLS per chat_sessioni
drop policy if exists "chat_sessioni_select" on veltra_chat_sessioni;
create policy "chat_sessioni_select" on veltra_chat_sessioni
  for select to authenticated using (tenant_id = auth.uid()::text);

drop policy if exists "chat_sessioni_insert" on veltra_chat_sessioni;
create policy "chat_sessioni_insert" on veltra_chat_sessioni
  for insert to authenticated with check (tenant_id = auth.uid()::text);

drop policy if exists "chat_sessioni_update" on veltra_chat_sessioni;
create policy "chat_sessioni_update" on veltra_chat_sessioni
  for update to authenticated using (tenant_id = auth.uid()::text) with check (tenant_id = auth.uid()::text);

drop policy if exists "chat_sessioni_delete" on veltra_chat_sessioni;
create policy "chat_sessioni_delete" on veltra_chat_sessioni
  for delete to authenticated using (tenant_id = auth.uid()::text);
