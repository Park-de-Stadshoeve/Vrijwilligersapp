-- =====================================================================
-- test_06_meldingen.sql — controleert taak_uit_melding (06_meldingen.sql)
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers en meldingen, doet zich voor als elk
--   van hen (zoals in test_03_rechten.sql) en kijkt of "Maak taak" en
--   "Geen actie nodig" werken zoals bedoeld. Daarna ruimt het alles op.
--   Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Jan     bestuur
--     Kees    vrijwilliger, werkgroep Klussen
--     Piet    vrijwilliger, werkgroep Dieren (doet de meldingen)
--   De testmeldingen (van Piet):
--     melding A  nieuw
--     melding B  nieuw (wordt "Geen actie nodig")
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan. Bij geweigerde acties
--   zie je ook de foutmelding die de app laat zien.
--
-- Uitvoeren na 06_meldingen.sql. Supabase kan waarschuwen voor
-- "destructive operation" (het opruimen); je kunt bevestigen.
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
  jan        uuid := gen_random_uuid();
  kees       uuid := gen_random_uuid();
  piet       uuid := gen_random_uuid();
  gebouw     bigint;
  klussen    bigint;
  melding_a  bigint;
  melding_b  bigint;
  taak_a     bigint;
  n          integer;
  tekst      text;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  insert into gebruikers (id, voornaam, achternaam_letter, rol) values
    (jan,  'TestJan',  'B', 'bestuur'),
    (kees, 'TestKees', 'K', 'vrijwilliger'),
    (piet, 'TestPiet', 'D', 'vrijwilliger');

  select id into gebouw  from plekken     where naam = 'Gebouw';
  select id into klussen from werkgroepen where naam = 'Klussen';

  insert into lidmaatschappen (gebruiker, werkgroep)
  select kees, klussen union all
  select piet, id from werkgroepen where naam = 'Dieren';

  insert into meldingen (plek, foto, gemeld_door, toelichting)
  values (gebouw, 'test-06.jpg', piet, 'TEST melding A')
  returning id into melding_a;
  insert into meldingen (plek, foto, gemeld_door, toelichting)
  values (gebouw, 'test-06.jpg', piet, 'TEST melding B')
  returning id into melding_b;


  -- Test 1: Kees (vrijwilliger) maakt een taak van melding A
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_uit_melding(melding_a, 'TEST taak A', null, gebouw, klussen, null, current_date + 14);
    execute 'reset role';
    insert into testuitslag values (1, 'Vrijwilliger maakt taak van melding', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (1, 'Vrijwilliger maakt taak van melding', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 2: Jan (bestuur) maakt een taak van melding A, voor Kees
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    taak_a := taak_uit_melding(melding_a, 'TEST taak A', 'uit melding', gebouw, klussen, kees, current_date + 14);
    execute 'reset role';
    select count(*) into n from meldingen where id = melding_a and taak = taak_a;
    insert into testuitslag values (2, 'Bestuur maakt taak van melding (gekoppeld)', 'toegestaan',
      case when n = 1 then 'toegestaan, gekoppeld' else 'niet gekoppeld' end,
      case when n = 1 then 'goed' else 'FOUT' end);
  exception when others then
    insert into testuitslag values (2, 'Bestuur maakt taak van melding (gekoppeld)', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 3: Jan maakt nog een keer een taak van melding A
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_uit_melding(melding_a, 'TEST taak A2', null, gebouw, klussen, null, current_date + 14);
    execute 'reset role';
    insert into testuitslag values (3, 'Tweede taak van dezelfde melding', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (3, 'Tweede taak van dezelfde melding', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: Kees (Klussen) ziet melding A, want de taak is van Klussen
  perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from meldingen where id = melding_a;
  execute 'reset role';
  insert into testuitslag values (4, 'Werkgroep van de taak ziet de melding', '1', n::text,
    case when n = 1 then 'goed' else 'FOUT' end);

  -- Test 5: Jan zet melding B op "Geen actie nodig"
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    update meldingen set geen_actie_reden = 'TEST al opgelost', geen_actie_door = jan where id = melding_b;
    execute 'reset role';
    select melding_status(m) into tekst from meldingen m where id = melding_b;
    insert into testuitslag values (5, 'Bestuur: geen actie nodig', 'Geen actie nodig', tekst,
      case when tekst = 'Geen actie nodig' then 'goed' else 'FOUT' end);
  exception when others then
    insert into testuitslag values (5, 'Bestuur: geen actie nodig', 'Geen actie nodig', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 6: Jan maakt een taak van melding B (die op "Geen actie nodig" staat)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_uit_melding(melding_b, 'TEST taak B', null, gebouw, klussen, null, current_date + 14);
    execute 'reset role';
    insert into testuitslag values (6, 'Taak van melding met "Geen actie nodig"', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (6, 'Taak van melding met "Geen actie nodig"', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 7: Jan zet "Geen actie nodig" zonder toelichting
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    update meldingen set geen_actie_reden = '  ', geen_actie_door = jan where id = melding_b;
    execute 'reset role';
    insert into testuitslag values (7, 'Geen actie nodig zonder toelichting', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (7, 'Geen actie nodig zonder toelichting', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- Test 8: Jan verwijdert taak A ("Ongedaan maken"): melding A is weer Nieuw
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    delete from taken where id = taak_a;
    execute 'reset role';
    select melding_status(m) into tekst from meldingen m where id = melding_a;
    insert into testuitslag values (8, 'Taak weg: melding weer Nieuw', 'Nieuw', tekst,
      case when tekst = 'Nieuw' then 'goed' else 'FOUT' end);
  exception when others then
    insert into testuitslag values (8, 'Taak weg: melding weer Nieuw', 'Nieuw', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from meldingen  where gemeld_door in (jan, kees, piet);
  delete from taken      where aangemaakt_door in (jan, kees, piet);
  delete from gebruikers where id in (jan, kees, piet);  -- lidmaatschappen gaan vanzelf mee
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
