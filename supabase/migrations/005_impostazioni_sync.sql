-- 005: Impostazioni per tenant (per il sync automatico FiC).
-- L'app salva qui le credenziali Fatture in Cloud (token + company id) lato server,
-- così l'Edge Function schedulata `fic-sync` può leggerle senza dipendere dal browser.

create table if not exists veltra_impostazioni (
  tenant_id text not null default 'local',
  chiave text not null,
  valore text,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, chiave)
);

alter table veltra_impostazioni enable row level security;

drop policy if exists "impostazioni_select" on veltra_impostazioni;
create policy "impostazioni_select" on veltra_impostazioni
  for select to authenticated using (tenant_id = auth.uid()::text);

drop policy if exists "impostazioni_insert" on veltra_impostazioni;
create policy "impostazioni_insert" on veltra_impostazioni
  for insert to authenticated with check (tenant_id = auth.uid()::text);

drop policy if exists "impostazioni_update" on veltra_impostazioni;
create policy "impostazioni_update" on veltra_impostazioni
  for update to authenticated using (tenant_id = auth.uid()::text) with check (tenant_id = auth.uid()::text);
