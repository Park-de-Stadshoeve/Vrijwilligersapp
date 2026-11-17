-- =====================================================================
-- test_13_herstel.sql — controleert 13_herstel.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het controleert dat terugzetten NIET kan als er al gegevens zijn, en
--   dat de app de vaste acties niet zelf kan aanroepen. (Het echte
--   terugzetten test je in de app, zie BEHEER.md.)
--   Er verandert niets aan je gegevens: als een test toch iets zou doen,
--   wordt dat meteen teruggedraaid. Je mag het zo vaak uitvoeren als je
--   wilt.
--
--   Test 3 werkt alleen als er al minstens één taak of melding in het
--   project staat (in het testproject is dat zo).
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 13_herstel.sql.
-- =====================================================================

drop table if exists testuitslag;
create temp table testuitslag (
  nr        integer,
  wat       text,
  verwacht  text,
  uitkomst  text,
  goed      text
);

do $$
declare
  iemand  uuid := (select id from gebruikers limit 1);
  leeg    jsonb := '{"versie": 2, "tabellen": {}}';
  -- Een kleine, verzonnen back-up die er "echt" uitziet
  klein   jsonb := jsonb_build_object('versie', 2, 'tabellen', jsonb_build_object(
             'werkgroepen', jsonb_build_array(jsonb_build_object('id', 999001, 'naam', 'TestWerkgroep', 'actief', true)),
             'gebruikers',  jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'voornaam', 'TestBea',
                              'achternaam_letter', 'B', 'rol', 'bestuur', 'is_beheerder', true, 'actief', true))));
begin
  -- Test 1: de app (ingelogd) roept herstel_backup zelf aan
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', iemand)::text, true);
    execute 'set local role authenticated';
    perform herstel_backup(leeg, iemand);
    execute 'reset role';
    insert into testuitslag values (1, 'App roept terugzetten zelf aan', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'App roept terugzetten zelf aan', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 2: de app roept "tijdelijke gebruiker weg" zelf aan
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', iemand)::text, true);
    execute 'set local role authenticated';
    perform herstel_tijdelijke_gebruiker_weg(iemand);
    execute 'reset role';
    insert into testuitslag values (2, 'App haalt zelf een gebruiker weg', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'App haalt zelf een gebruiker weg', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 3: de Edge Function zet terug in een database die NIET leeg is
  begin
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role service_role';
    perform herstel_backup(klein, iemand);
    -- Gelukt? Dan meteen terugdraaien (via een fout) en FOUT noteren
    raise exception 'TEST: terugzetten werd toegestaan';
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Terugzetten als er al gegevens zijn', 'geweigerd',
      case when sqlerrm like 'TEST:%' then 'toegestaan (teruggedraaid)' else 'geweigerd: ' || sqlerrm end,
      case when sqlerrm like 'TEST:%' then 'FOUT' else 'goed' end);
  end;

  -- Test 4: een bestand dat geen back-up is
  begin
    execute 'set local role service_role';
    perform herstel_backup('{"iets": "anders"}', iemand);
    raise exception 'TEST: terugzetten werd toegestaan';
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Bestand zonder back-up', 'geweigerd',
      case when sqlerrm like 'TEST:%' then 'toegestaan (teruggedraaid)' else 'geweigerd: ' || sqlerrm end,
      case when sqlerrm like 'TEST:%' then 'FOUT' else 'goed' end);
  end;

  -- Test 5: een back-up met lege tabellen (zou alles leegmaken)
  begin
    execute 'set local role service_role';
    perform herstel_backup(leeg, iemand);
    raise exception 'TEST: terugzetten werd toegestaan';
  exception when others then
    execute 'reset role';
    insert into testuitslag values (5, 'Back-up zonder werkgroepen en beheerder', 'geweigerd',
      case when sqlerrm like 'TEST:%' then 'toegestaan (teruggedraaid)' else 'geweigerd: ' || sqlerrm end,
      case when sqlerrm like 'TEST:%' then 'FOUT' else 'goed' end);
  end;

  execute 'reset role';
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
