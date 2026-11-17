-- =====================================================================
-- 13_herstel.sql — een back-up terugzetten in een lege database
-- =====================================================================
-- Wat doet dit bestand?
--   1. Een vaste actie herstel_backup. Die zet alle tabellen uit een
--      back-up (gegevens.json) in één keer terug, met hun oorspronkelijke
--      nummers. Zo blijven alle koppelingen kloppen (welke taak bij welke
--      melding hoort, wie wat deed). Lukt één ding niet, dan wordt alles
--      teruggedraaid: er blijft nooit een halve back-up staan.
--
--      Dit kan ALLEEN in een lege database:
--        - geen taken en geen meldingen;
--        - hooguit één gebruiker: degene die terugzet (de "hersteller").
--      De werkgroepen en plekken die er al staan (bijvoorbeeld uit
--      02_startgegevens.sql) worden vervangen door die uit de back-up.
--
--   2. Een vaste actie herstel_tijdelijke_gebruiker_weg. Die haalt aan het
--      eind de tijdelijke gebruiker van de hersteller weg; die staat dan
--      zelf al in de terugzette gegevens.
--
--   De inlogaccounts en de foto's zet de Edge Function "beheer" terug;
--   dat kan niet met SQL.
--
-- Wie mag het gebruiken?
--   Alleen de Edge Function "beheer" (rol service_role), nadat die heeft
--   gecontroleerd dat je een beheerder bent.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 12_backup.sql. Daarna test_13_herstel.sql.
--   Hoe je een back-up terugzet: zie BEHEER.md, "Back-up terugzetten".
-- =====================================================================


-- ♻️ Alle tabellen uit de back-up terugzetten
create function herstel_backup(gegevens jsonb, hersteller uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t  jsonb := gegevens->'tabellen';
begin
  -- Klopt de back-up?
  if coalesce(gegevens->>'versie', '') not in ('1', '2') or t is null then
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
  -- ingelogd blijven tot het eind)
  delete from lidmaatschappen;
  delete from back_ups;
  delete from onderdelen;
  delete from plekken;
  delete from werkgroepen;

  -- Terugzetten, in een volgorde waarin alles waar naar verwezen wordt er
  -- al staat. "overriding system value" = de nummers uit de back-up
  -- gebruiken in plaats van nieuwe.
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
  perform setval(pg_get_serial_sequence('taken',       'id'), coalesce((select max(id) from taken),       0) + 1, false);
  perform setval(pg_get_serial_sequence('meldingen',   'id'), coalesce((select max(id) from meldingen),   0) + 1, false);
  perform setval(pg_get_serial_sequence('back_ups',    'id'), coalesce((select max(id) from back_ups),    0) + 1, false);

  return jsonb_build_object(
    'gebruikers', (select count(*) from gebruikers),
    'taken',      (select count(*) from taken),
    'meldingen',  (select count(*) from meldingen)
  );
end;
$$;


-- 🧹 Aan het eind: de tijdelijke gebruiker van de hersteller weghalen.
-- Alleen als die zelf niet in de terugzette gegevens voorkomt (dan heeft
-- hij of zij een ander nummer) en nergens naar verwezen wordt.
create function herstel_tijdelijke_gebruiker_weg(hersteller uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from lidmaatschappen where gebruiker = hersteller;
  delete from gebruikers where id = hersteller;
end;
$$;


-- Alleen de Edge Function (service_role) mag deze acties gebruiken
revoke execute on function herstel_backup(jsonb, uuid) from public, anon, authenticated;
revoke execute on function herstel_tijdelijke_gebruiker_weg(uuid) from public, anon, authenticated;
grant  execute on function herstel_backup(jsonb, uuid) to service_role;
grant  execute on function herstel_tijdelijke_gebruiker_weg(uuid) to service_role;
