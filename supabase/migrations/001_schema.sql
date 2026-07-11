-- Neurora Fiscale — schema MVP (multi-tenant-ready, D-001)
-- Le tabelle coincidono con il modello dati dell'app (localStorage ↔ Supabase).
-- RLS: ogni tabella filtra per tenant_id. In single-tenant c'è un solo tenant.

create extension if not exists "pgcrypto";

-- ————— Profili fiscali —————
create table if not exists profili_fiscali (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  denominazione text not null default '',
  piva text not null default '',
  cf text not null default '',
  indirizzo text not null default '',
  comune text not null default '',
  provincia text not null default '',
  cap text not null default '',
  pec text not null default '',
  rea text not null default '',
  regime text not null default 'forfettario',
  ateco_codici jsonb not null default '[]',
  aliquota_sostitutiva numeric not null default 0.15,
  aliquota_inps numeric not null default 0.2607,
  gestione_inps text not null default 'separata',
  data_apertura_piva date,
  created_at timestamptz not null default now()
);

-- ————— Clienti —————
create table if not exists clienti (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  denominazione text not null,
  piva text default '',
  cf text default '',
  codice_destinatario text default '',
  pec_destinatario text default '',
  indirizzo text default '',
  comune text default '',
  provincia text default '',
  cap text default '',
  paese text default 'IT',
  created_at timestamptz not null default now()
);

-- ————— Fatture —————
create table if not exists fatture (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  numero text not null,
  data date not null,
  tipo text not null check (tipo in ('attiva','passiva')),
  cliente_id uuid,
  cliente_denominazione text default '',
  importo numeric not null default 0,
  descrizione text default '',
  ateco_codice text default '',
  bollo boolean not null default false,
  stato_sdi text not null default 'bozza'
    check (stato_sdi in ('bozza','inviata','consegnata','scartata','ricevuta')),
  sdi_identificativo text,
  xml text,
  created_at timestamptz not null default now()
);
create index if not exists fatture_data_idx on fatture (tenant_id, data);

-- ————— F24 generati —————
create table if not exists f24_generati (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  anno_riferimento int not null,
  tipo text not null check (tipo in ('saldo_acconto1','acconto2','bollo')),
  data_scadenza date not null,
  righe jsonb not null default '[]',
  totale numeric not null default 0,
  stato text not null default 'bozza' check (stato in ('bozza','pronto','pagato')),
  created_at timestamptz not null default now()
);

-- ————— Scadenze —————
create table if not exists scadenze (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  tipo text not null,
  data date not null,
  descrizione text default '',
  importo_stimato numeric,
  stato text not null default 'pendente' check (stato in ('pendente','notificata','completata')),
  created_at timestamptz not null default now()
);

-- ————— Dichiarazioni —————
create table if not exists dichiarazioni (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  anno_imposta int not null,
  stato text not null default 'bozza'
    check (stato in ('bozza','precompilata','pronta','inviata_manualmente')),
  quadro_lm jsonb not null default '{}',
  note text default '',
  created_at timestamptz not null default now()
);

-- ————— Chat commercialista AI —————
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ————— Dati normativi (fonti verificate, D-006) —————
create table if not exists dati_normativi (
  id uuid primary key default gen_random_uuid(),
  chiave text unique not null,
  valore text not null,
  descrizione text default '',
  fonte_url text default '',
  fonte_nome text default '',
  data_verifica date,
  data_validita_da date,
  data_validita_a date,
  created_at timestamptz not null default now()
);

-- ————— Alert log —————
create table if not exists alert_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'local',
  tipo text not null,
  messaggio text not null,
  canale text not null default 'in_app' check (canale in ('email','in_app')),
  inviato_at timestamptz not null default now(),
  letto boolean not null default false
);

-- ————— RLS (multi-tenant-ready) —————
-- Nota MVP: policy permissive per utenti autenticati; quando si passa al SaaS
-- si sostituisce 'true' con il match tenant_id ↔ auth.uid()/claims.
alter table profili_fiscali enable row level security;
alter table clienti enable row level security;
alter table fatture enable row level security;
alter table f24_generati enable row level security;
alter table scadenze enable row level security;
alter table dichiarazioni enable row level security;
alter table chat_messages enable row level security;
alter table alert_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profili_fiscali','clienti','fatture','f24_generati','scadenze','dichiarazioni','chat_messages','alert_log']
  loop
    execute format('create policy "tenant_all_%s" on %I for all to authenticated using (true) with check (true)', t, t);
    execute format('create policy "anon_all_%s" on %I for all to anon using (true) with check (true)', t, t);
  end loop;
end $$;
-- ⚠ Le policy "anon" servono solo per l'uso single-tenant senza login.
--   Rimuoverle appena si attiva l'autenticazione Supabase.

-- ————— Seed dati normativi (verificati 11/07/2026) —————
insert into dati_normativi (chiave, valore, descrizione, fonte_nome, data_verifica, data_validita_da) values
  ('imposta_sostitutiva_forfettario','0.15','Imposta sostitutiva forfettario','Art. 1 c.54-89 L.190/2014','2026-07-11','2026-01-01'),
  ('imposta_sostitutiva_agevolata','0.05','Imposta agevolata primi 5 anni','Art. 1 c.54 L.190/2014','2026-07-11','2026-01-01'),
  ('coeff_ateco_59.20.3','0.67','Coefficiente redditività','Allegato 2 L.190/2014','2026-07-11','2026-01-01'),
  ('coeff_ateco_62.01.00','0.67','Coefficiente redditività','Allegato 2 L.190/2014','2026-07-11','2026-01-01'),
  ('aliquota_inps_gestione_separata','0.2607','INPS Gestione Separata 2026','INPS 2026','2026-07-11','2026-01-01'),
  ('soglia_ricavi_forfettario','85000','Soglia ricavi','Art. 1 c.54 L.190/2014','2026-07-11','2026-01-01'),
  ('soglia_esclusione_immediata','100000','Esclusione immediata','Art. 1 c.57 L.190/2014','2026-07-11','2026-01-01'),
  ('acconto_prima_rata','0.50','1ª rata acconto (ISA)','Art. 58 DL 124/2019','2026-07-11','2026-01-01'),
  ('acconto_seconda_rata','0.50','2ª rata acconto (ISA)','Art. 58 DL 124/2019','2026-07-11','2026-01-01'),
  ('natura_iva_forfettario','N2.2','Natura IVA XML','Specifiche FatturaPA','2026-07-11','2021-01-01'),
  ('tasso_legale_2026','0.016','Tasso legale 2026','DM Economia 10/12/2025','2026-07-11','2026-01-01'),
  ('sanzione_base_omesso_versamento','0.25','Base sanzione','D.Lgs. 87/2024','2026-07-11','2024-09-01'),
  ('codice_tributo_saldo','1790','Saldo imposta sostitutiva','AdE','2026-07-11','2026-01-01'),
  ('codice_tributo_acconto_1','1791','1° acconto','AdE','2026-07-11','2026-01-01'),
  ('codice_tributo_acconto_2','1792','2° acconto','AdE','2026-07-11','2026-01-01'),
  ('causale_inps_gestione_separata','P10','Causale INPS F24','INPS','2026-07-11','2026-01-01'),
  ('codice_tributo_bollo_1','2521','Bollo I trim','AdE','2026-07-11','2026-01-01'),
  ('codice_tributo_bollo_2','2522','Bollo II trim','AdE','2026-07-11','2026-01-01'),
  ('codice_tributo_bollo_3','2523','Bollo III trim','AdE','2026-07-11','2026-01-01'),
  ('codice_tributo_bollo_4','2524','Bollo IV trim','AdE','2026-07-11','2026-01-01')
on conflict (chiave) do nothing;
