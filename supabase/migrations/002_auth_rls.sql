-- 002: Auth-based RLS policies (sostituisce le policy permissive del 001)
-- Schema: veltra. Richiede Supabase Auth attivo con Google + Email providers.
-- Ogni utente vede solo i propri dati (tenant_id = auth.uid()).

set search_path to veltra, public;


-- Rimuovi le policy permissive create nel 001
drop policy if exists "tenant_all_profili_fiscali" on veltra.profili_fiscali;
drop policy if exists "anon_all_profili_fiscali" on veltra.profili_fiscali;
drop policy if exists "tenant_all_clienti" on veltra.clienti;
drop policy if exists "anon_all_clienti" on veltra.clienti;
drop policy if exists "tenant_all_fatture" on veltra.fatture;
drop policy if exists "anon_all_fatture" on veltra.fatture;
drop policy if exists "tenant_all_f24_generati" on veltra.f24_generati;
drop policy if exists "anon_all_f24_generati" on veltra.f24_generati;
drop policy if exists "tenant_all_scadenze" on veltra.scadenze;
drop policy if exists "anon_all_scadenze" on veltra.scadenze;
drop policy if exists "tenant_all_dichiarazioni" on veltra.dichiarazioni;
drop policy if exists "anon_all_dichiarazioni" on veltra.dichiarazioni;
drop policy if exists "tenant_all_chat_messages" on veltra.chat_messages;
drop policy if exists "anon_all_chat_messages" on veltra.chat_messages;
drop policy if exists "tenant_all_alert_log" on veltra.alert_log;
drop policy if exists "anon_all_alert_log" on veltra.alert_log;

-- Policy autenticati: ogni utente vede e modifica solo i propri record
-- (tenant_id = auth.uid()). anon non ha accesso a nulla.
do $$
declare t text;
begin
  foreach t in array array[
    'profili_fiscali','clienti','fatture','f24_generati',
    'scadenze','dichiarazioni','chat_messages','alert_log'
  ]
  loop
    execute format(
      'create policy "%1$s_select" on veltra.%1$I for select to authenticated
       using (tenant_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_insert" on veltra.%1$I for insert to authenticated
       with check (tenant_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_update" on veltra.%1$I for update to authenticated
       using (tenant_id = auth.uid()) with check (tenant_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_delete" on veltra.%1$I for delete to authenticated
       using (tenant_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- dati_normativi: leggibile da tutti gli autenticati (dati pubblici, non per-tenant)
drop policy if exists "dati_normativi_all" on veltra.dati_normativi;
create policy "dati_normativi_select" on veltra.dati_normativi
  for select to authenticated using (true);
