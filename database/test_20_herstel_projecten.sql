-- =====================================================================
-- test_20_herstel_projecten.sql — controleert 20_herstel_projecten.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het controleert dat de nieuwe versie van "terugzetten" back-ups van
--   versie 3 (met projecten) kent, onbekende versies weigert, nog steeds
--   alleen in een lege database werkt, en dat de app hem niet zelf kan
--   aanroepen. (Het echte terugzetten test je in de app: de hersteltest,
--   zie BEHEER.md.)
--   Er verandert niets aan je gegevens. Je mag het zo vaak uitvoeren als
--   je wilt.
--
--   Werkt alleen als er al minstens één taak of melding in het project
--   staat (in het testproject is dat zo).
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan (4 tests).
--
-- Uitvoeren na 20_herstel_projecten.sql.
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
  -- Een kleine, verzonnen back-up van versie 3, met een project
  v3      jsonb := jsonb_build_object('versie', 3, 'tabellen', jsonb_build_object(
             'werkgroepen', jsonb_build_array(jsonb_build_object('id', 999001, 'naam', 'TestWerkgroep', 'actief', true)),
             'projecten',   jsonb_build_array(jsonb_build_object('id', 999001, 'naam', 'TestProject', 'actief', true)),
             'gebruikers',  jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'voornaam', 'TestBea',
                              'achternaam_letter', 'B', 'rol', 'bestuur', 'is_beheerder', true, 'actief', true))));
  v4      jsonb;
begin
  v4 := jsonb_set(v3, '{versie}', '4');

  -- Test 1: versie 3 wordt herkend (en dan geweigerd omdat de database niet leeg is)
  begin
    execute 'set local role service_role';
    perform herstel_backup(v3, iemand);
    raise exception 'TEST: terugzetten werd toegestaan';
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'Back-up versie 3 in een volle database', 'geweigerd: niet leeg',
      case when sqlerrm like 'TEST:%' then 'toegestaan (teruggedraaid)' else 'geweigerd: ' || sqlerrm end,
      case when sqlerrm like '%lege database%' then 'goed' else 'FOUT' end);
  end;

  -- Test 2: een onbekende versie (4)
  begin
    execute 'set local role service_role';
    perform herstel_backup(v4, iemand);
    raise exception 'TEST: terugzetten werd toegestaan';
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Back-up met onbekende versie 4', 'geweigerd: onbekende versie',
      case when sqlerrm like 'TEST:%' then 'toegestaan (teruggedraaid)' else 'geweigerd: ' || sqlerrm end,
      case when sqlerrm like '%onbekende versie%' then 'goed' else 'FOUT' end);
  end;

  -- Test 3: de app (ingelogd) roept terugzetten zelf aan
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', iemand)::text, true);
    execute 'set local role authenticated';
    perform herstel_backup(v3, iemand);
    execute 'reset role';
    insert into testuitslag values (3, 'App roept terugzetten zelf aan', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'App roept terugzetten zelf aan', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: de nieuwe versie van de functie staat erin (zet projecten terug)
  insert into testuitslag
  select 4, 'Terugzetten neemt projecten mee', 'ja',
         case when pg_get_functiondef('herstel_backup(jsonb, uuid)'::regprocedure) like '%insert into projecten%'
              then 'ja' else 'nee' end,
         case when pg_get_functiondef('herstel_backup(jsonb, uuid)'::regprocedure) like '%insert into projecten%'
              then 'goed' else 'FOUT' end;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
