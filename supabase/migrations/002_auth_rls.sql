-- 002: Auth-based RLS policies (sostituisce le policy permissive del 001)
-- Richiede Supabase Auth attivo con Google + Email providers.
-- Ogni utente vede solo i propri dati (tenant_id = auth.uid()).

-- Rimuovi le policy permissive create nel 001
drop policy if exists "tenant_all_profili_fiscali" on profili_fiscali;
drop policy if exists "anon_all_profili_fiscali" on profili_fiscali;
drop policy if exists "tenant_all_clienti" on clienti;
drop policy if exists "anon_all_clienti" on clienti;
drop policy if exists "tenant_all_fatture" on fatture;
drop policy if exists "anon_all_fatture" on fatture;
drop policy if exists "tenant_all_f24_generati" on f24_generati;
drop policy if exists "anon_all_f24_generati" on f24_generati;
drop policy if exists "tenant_all_scadenze" on scadenze;
drop policy if exists "anon_all_scadenze" on scadenze;
drop policy if exists "tenant_all_dichiarazioni" on dichiarazioni;
drop policy if exists "anon_all_dichiarazioni" on dichiarazioni;
drop policy if exists "tenant_all_chat_messages" on chat_messages;
drop policy if exists "anon_all_chat_messages" on chat_messages;
drop policy if exists "tenant_all_alert_log" on alert_log;
drop policy if exists "anon_all_alert_log" on alert_log;

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
      'create policy "%1$s_select" on %1$I for select to authenticated
       using (tenant_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_insert" on %1$I for insert to authenticated
       with check (tenant_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_update" on %1$I for update to authenticated
       using (tenant_id = auth.uid()) with check (tenant_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_delete" on %1$I for delete to authenticated
       using (tenant_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- dati_normativi: leggibile da tutti gli autenticati (dati pubblici, non per-tenant)
drop policy if exists "dati_normativi_all" on dati_normativi;
create policy "dati_normativi_select" on dati_normativi
  for select to authenticated using (true);
