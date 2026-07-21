-- 002: Auth-based RLS policies (sostituisce le policy permissive del 001)
-- Prefisso: veltra_. Richiede Supabase Auth attivo con Google + Email providers.
-- Ogni utente vede solo i propri dati (tenant_id = auth.uid()::text).



-- Rimuovi le policy permissive create nel 001
drop policy if exists "tenant_all_profili_fiscali" on veltra_profili_fiscali;
drop policy if exists "anon_all_profili_fiscali" on veltra_profili_fiscali;
drop policy if exists "tenant_all_clienti" on veltra_clienti;
drop policy if exists "anon_all_clienti" on veltra_clienti;
drop policy if exists "tenant_all_fatture" on veltra_fatture;
drop policy if exists "anon_all_fatture" on veltra_fatture;
drop policy if exists "tenant_all_f24_generati" on veltra_f24_generati;
drop policy if exists "anon_all_f24_generati" on veltra_f24_generati;
drop policy if exists "tenant_all_scadenze" on veltra_scadenze;
drop policy if exists "anon_all_scadenze" on veltra_scadenze;
drop policy if exists "tenant_all_dichiarazioni" on veltra_dichiarazioni;
drop policy if exists "anon_all_dichiarazioni" on veltra_dichiarazioni;
drop policy if exists "tenant_all_chat_messages" on veltra_chat_messages;
drop policy if exists "anon_all_chat_messages" on veltra_chat_messages;
drop policy if exists "tenant_all_alert_log" on veltra_alert_log;
drop policy if exists "anon_all_alert_log" on veltra_alert_log;

-- Policy autenticati: ogni utente vede e modifica solo i propri record
-- (tenant_id = auth.uid()::text). anon non ha accesso a nulla.
do $$
declare t text;
begin
  foreach t in array array[
    'profili_fiscali','clienti','fatture','f24_generati',
    'scadenze','dichiarazioni','chat_messages','alert_log'
  ]
  loop
    execute format(
      'create policy "%1$s_select" on %2$I for select to authenticated
       using (tenant_id = auth.uid()::text)',
      t, 'veltra_' || t
    );
    execute format(
      'create policy "%1$s_insert" on %2$I for insert to authenticated
       with check (tenant_id = auth.uid()::text)',
      t, 'veltra_' || t
    );
    execute format(
      'create policy "%1$s_update" on %2$I for update to authenticated
       using (tenant_id = auth.uid()::text) with check (tenant_id = auth.uid()::text)',
      t, 'veltra_' || t
    );
    execute format(
      'create policy "%1$s_delete" on %2$I for delete to authenticated
       using (tenant_id = auth.uid()::text)',
      t, 'veltra_' || t
    );
  end loop;
end $$;

-- dati_normativi: leggibile da tutti gli autenticati (dati pubblici, non per-tenant)
drop policy if exists "dati_normativi_all" on veltra_dati_normativi;
create policy "dati_normativi_select" on veltra_dati_normativi
  for select to authenticated using (true);
