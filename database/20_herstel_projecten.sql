-- =====================================================================
-- 20_herstel_projecten.sql — terugzetten van een back-up, nu met projecten
-- =====================================================================
-- Wat doet dit bestand?
--   Het vervangt de vaste actie herstel_backup uit 13_herstel.sql door een
--   nieuwe versie die ook de tabel projecten (19_projecten.sql) terugzet.
--   Verder werkt alles hetzelfde: alleen in een lege database, alles of
--   niets, met de oorspronkelijke nummers.
--
--   Wat is er anders dan in 13?
--     - Back-ups van versie 3 (met projecten) worden geaccepteerd. Oude
--       back-ups (versie 1 en 2, zonder projecten) blijven werken: hun
--       taken krijgen dan geen project.
--     - De projecten worden teruggezet vóór de taken (een taak verwijst
--       naar zijn project).
--     - De teller voor nieuwe projectnummers wordt goed gezet.
--     - Het antwoord noemt ook het aantal projecten.
--
-- Waarom een nieuw bestand en 13 niet aanpassen?
--   13 is al uitgevoerd in het testproject en in het echte project. Zo kun
--   je precies zien wat er veranderd is, en blijft de volgorde 01, 02, …
--   kloppen voor een nieuw project.
--
-- Wie mag het gebruiken?
--   Alleen de Edge Function "beheer" (rol service_role), zoals in 13.
--
-- Hoe gebruik je het?
--   Uitvoeren na 19_projecten.sql. Daarna test_20_herstel_projecten.sql.
--   Opnieuw uitvoeren mag ("create or replace" vervangt de oude versie).
--   De Edge Function "beheer" moet de versie hebben die back-ups van
--   versie 3 maakt (BACKUP_VERSIE = 3).
-- =====================================================================


-- ♻️ Alle tabellen uit de back-up terugzetten
create or replace function herstel_backup(gegevens jsonb, hersteller uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t  jsonb := gegevens->'tabellen';
begin
  -- Klopt de back-up?
  if coalesce(gegevens->>'versie', '') not in ('1', '2', '3') or t is null then
    raise exception 'Dit is geen back-up van deze app, of een onbekende versie.';
  end if;
  -- Een echte back-up heeft altijd werkgroepen en minstens één actieve
  -- beheerder (de bewaker uit 08_beheer.sql zorgt daarvoor)
  if jsonb_array_length(coalesce(t->'werkgroepen', '[]')) = 0
     or not exists (select 1 from jsonb_array_elements(coalesce(t->'gebruikers', '[]')) g
                    where (g->>'is_beheerder')::boolean and (g->>'actief')::boolean) then
    raise exception 'Deze back-up is onvolledig (geen werkgroepen of geen beheerder). Er is niets veranderd.';
  end if;

  -- Is de database leeg genoeg?
  if exists (select 1 from taken) or exists (select 1 from meldingen) then
    raise exception 'Terugzetten kan alleen in een lege database. Er staan al taken of meldingen in. Er is niets veranderd.';
  end if;
  if exists (select 1 from gebruikers where id <> hersteller) then
    raise exception 'Terugzetten kan alleen in een lege database. Er staan al andere gebruikers in. Er is niets veranderd.';
  end if;

  -- Wat er nu staat, opruimen (behalve de hersteller zelf, die moet
  -- ingelogd blijven tot het eind).
  -- "where true" = alles. Supabase weigert een delete zonder "where" als
  -- die via de app of de Edge Function binnenkomt (bescherming tegen per
  -- ongeluk een hele tabel leegmaken). Hier is "alles" de bedoeling.
  -- Projecten mogen weg: er zijn geen taken die ernaar verwijzen (zie boven).
  delete from lidmaatschappen where true;
  delete from back_ups where true;
  delete from projecten where true;
  delete from onderdelen where true;
  delete from plekken where true;
  delete from werkgroepen where true;

  -- Terugzetten, in een volgorde waarin alles waar naar verwezen wordt er
  -- al staat. "overriding system value" = de nummers uit de back-up
  -- gebruiken in plaats van nieuwe. coalesce(…, '[]') = een oude back-up
  -- zonder projecten geeft een lege lijst.
  insert into werkgroepen overriding system value
    select * from jsonb_populate_recordset(null::werkgroepen, t->'werkgroepen');
  insert into plekken overriding system value
    select * from jsonb_populate_recordset(null::plekken, t->'plekken');
  insert into onderdelen overriding system value
    select * from jsonb_populate_recordset(null::onderdelen, t->'onderdelen');
  insert into gebruikers
    select * from jsonb_populate_recordset(null::gebruikers, t->'gebruikers')
    where id <> hersteller;   -- (heeft de hersteller toevallig hetzelfde nummer: laten staan)
  insert into lidmaatschappen
    select * from jsonb_populate_recordset(null::lidmaatschappen, t->'lidmaatschappen');
  insert into projecten overriding system value
    select * from jsonb_populate_recordset(null::projecten, coalesce(t->'projecten', '[]'));
  insert into taken overriding system value
    select * from jsonb_populate_recordset(null::taken, t->'taken');
  insert into meldingen overriding system value
    select * from jsonb_populate_recordset(null::meldingen, t->'meldingen');
  insert into back_ups overriding system value
    select * from jsonb_populate_recordset(null::back_ups, t->'back_ups');

  -- De tellers voor nieuwe nummers voorbij het hoogste teruggezette nummer
  -- zetten, anders krijgt de volgende nieuwe taak een nummer dat al bestaat.
  perform setval(pg_get_serial_sequence('werkgroepen', 'id'), coalesce((select max(id) from werkgroepen), 0) + 1, false);
  perform setval(pg_get_serial_sequence('plekken',     'id'), coalesce((select max(id) from plekken),     0) + 1, false);
  perform setval(pg_get_serial_sequence('onderdelen',  'id'), coalesce((select max(id) from onderdelen),  0) + 1, false);
  perform setval(pg_get_serial_sequence('projecten',   'id'), coalesce((select max(id) from projecten),   0) + 1, false);
  perform setval(pg_get_serial_sequence('taken',       'id'), coalesce((select max(id) from taken),       0) + 1, false);
  perform setval(pg_get_serial_sequence('meldingen',   'id'), coalesce((select max(id) from meldingen),   0) + 1, false);
  perform setval(pg_get_serial_sequence('back_ups',    'id'), coalesce((select max(id) from back_ups),    0) + 1, false);

  return jsonb_build_object(
    'gebruikers', (select count(*) from gebruikers),
    'projecten',  (select count(*) from projecten),
    'taken',      (select count(*) from taken),
    'meldingen',  (select count(*) from meldingen)
  );
end;
$$;


-- Alleen de Edge Function (service_role) mag deze actie gebruiken
-- (create or replace houdt de rechten, maar zo staat het er duidelijk)
revoke execute on function herstel_backup(jsonb, uuid) from public, anon, authenticated;
grant  execute on function herstel_backup(jsonb, uuid) to service_role;
