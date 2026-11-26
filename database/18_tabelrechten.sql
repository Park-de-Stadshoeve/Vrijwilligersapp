-- =====================================================================
-- 18_tabelrechten.sql
-- Wie mag überhaupt bij de tabellen (los van de regels per rij)
-- =====================================================================
-- Waarom dit bestand?
--   De database heeft twee sloten:
--   1. Mag je bij deze tabel? (GRANT, dit bestand)
--   2. Welke rijen mag je zien en wijzigen? (de regels uit 03_rechten.sql)
--   Oudere Supabase-projecten (zoals het testproject) kregen slot 1
--   vanzelf. Nieuwe projecten niet meer (gemerkt in november 2026 bij het
--   echte project): dan mag een ingelogde gebruiker niets, ook niet zijn
--   eigen naam lezen, en zegt de app na het inloggen "De app kan niet bij
--   de database".
--
-- Wat doet het?
--   - Ingelogde gebruikers (authenticated): lezen, toevoegen, wijzigen en
--     verwijderen. Wat ze echt mogen, bepalen nog steeds de regels uit
--     03_rechten.sql (rijbeveiliging staat op elke tabel aan).
--   - Niet ingelogd (anon): niets (dat regelde 03_rechten.sql al).
--   - service_role (alleen de Edge Functions): alles.
--   - Dezelfde uitzonderingen als in 04, 12 en 14 blijven gelden.
--   - Tabellen die later nog bijkomen, krijgen vanzelf dezelfde rechten.
--   - TRUNCATE (in één klap een hele tabel leegmaken, zonder de regels per
--     rij) mag een ingelogde gebruiker nooit. Dat zat in het testproject
--     er nog wel bij; dit bestand haalt het daar weg.
--
-- Mag je dit vaker uitvoeren? Ja, er verandert dan niets meer.
-- Uitvoeren: na 01 t/m 17, in elk project (eerst het testproject).
-- =====================================================================

-- Bij het schema (de "map" met onze tabellen) mogen komen.
grant usage on schema public to authenticated, service_role;

-- Ingelogde gebruikers: de vier gewone handelingen. De rest weg.
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke truncate, references, trigger on all tables in schema public from authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Edge Functions (service_role): alles.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Uitzonderingen (dezelfde als in 04_fotos, 12_backup en 14_gevaar_mail):
revoke all on fotos_zonder_koppeling from anon, authenticated;   -- alleen via het dashboard
revoke insert, update, delete on back_ups from authenticated;    -- alleen de Edge Function schrijft
revoke all on app_instellingen from anon, authenticated;         -- de app mag hier niet bij

-- Voor tabellen die later worden aangemaakt: dezelfde rechten.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  revoke truncate, references, trigger on tables from authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;

-- Controle: dit moet in elk project hetzelfde geven
-- (ingelogd 37, service_role 84):
select 'tabelrechten ingelogd' as wat, count(*) from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated'
union all select 'tabelrechten service_role', count(*) from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'service_role';
