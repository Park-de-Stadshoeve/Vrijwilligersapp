-- =====================================================================
-- test_11_opmerking.sql — controleert 11_opmerking.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers en een verzonnen taak, doet zich voor
--   als elk van hen en kijkt of een opmerking zetten mag of geweigerd
--   wordt. Daarna ruimt het alles weer op. Je mag het zo vaak uitvoeren
--   als je wilt.
--
--   De verzonnen gebruikers:
--     Jan     bestuur
--     Kees    vrijwilliger, werkgroep Klussen (de taak staat op zijn naam)
--     Tom     vrijwilliger, werkgroep Tuinen
--   De testtaak:
--     taak K  Klussen, toegewezen aan Kees
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 11_opmerking.sql. Supabase kan waarschuwen voor
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
  jan     uuid := gen_random_uuid();
  kees    uuid := gen_random_uuid();
  tom     uuid := gen_random_uuid();
  taak_k  bigint;
  t       taken;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  insert into gebruikers (id, voornaam, achternaam_letter, rol) values
    (jan,  'TestJan',  'J', 'bestuur'),
    (kees, 'TestKees', 'K', 'vrijwilliger'),
    (tom,  'TestTom',  'T', 'vrijwilliger');
  insert into lidmaatschappen (gebruiker, werkgroep)
  select kees, id from werkgroepen where naam = 'Klussen';
  insert into lidmaatschappen (gebruiker, werkgroep)
  select tom, id from werkgroepen where naam = 'Tuinen';

  insert into taken (titel, plek, werkgroep, toegewezen_aan, aangemaakt_door)
  select 'TEST taak K', p.id, w.id, kees, jan
  from plekken p, werkgroepen w where p.naam = 'Gebouw' and w.naam = 'Klussen'
  returning id into taak_k;


  -- Test 1: Kees zet een opmerking bij een taak die nog open staat
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_opmerking_zetten(taak_k, 'Te vroeg');
    execute 'reset role';
    insert into testuitslag values (1, 'Opmerking bij open taak', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'Opmerking bij open taak', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 2: Kees meldt gereed en zet een opmerking
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_gereed_melden(taak_k, null);
    perform taak_opmerking_zetten(taak_k, '  Nieuwe scharnieren.  ');
    execute 'reset role';
    select * into t from taken where id = taak_k;
    insert into testuitslag values (2, 'Kees: gereed melden en opmerking zetten', 'toegestaan',
      coalesce(t.opmerking, 'leeg') || ' / door Kees: ' || (t.opmerking_door = kees),
      case when t.opmerking = 'Nieuwe scharnieren.' and t.opmerking_door = kees then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Kees: gereed melden en opmerking zetten', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 3: Tom (andere werkgroep) wijzigt de opmerking
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', tom)::text, true);
    execute 'set local role authenticated';
    perform taak_opmerking_zetten(taak_k, 'Van Tom');
    execute 'reset role';
    insert into testuitslag values (3, 'Vrijwilliger uit andere werkgroep', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Vrijwilliger uit andere werkgroep', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: Jan (bestuur) wijzigt de opmerking
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_opmerking_zetten(taak_k, 'Aangevuld door Jan');
    execute 'reset role';
    select * into t from taken where id = taak_k;
    insert into testuitslag values (4, 'Bestuur wijzigt de opmerking', 'toegestaan',
      coalesce(t.opmerking, 'leeg'),
      case when t.opmerking = 'Aangevuld door Jan' and t.opmerking_door = jan then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Bestuur wijzigt de opmerking', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 5: een opmerking van 501 tekens
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_opmerking_zetten(taak_k, repeat('x', 501));
    execute 'reset role';
    insert into testuitslag values (5, 'Opmerking van 501 tekens', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (5, 'Opmerking van 501 tekens', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 6: Kees maakt de opmerking leeg (= weghalen)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_opmerking_zetten(taak_k, '   ');
    execute 'reset role';
    select * into t from taken where id = taak_k;
    insert into testuitslag values (6, 'Lege opmerking haalt hem weg', 'toegestaan',
      coalesce(t.opmerking, 'leeg'),
      case when t.opmerking is null and t.opmerking_door is null then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (6, 'Lege opmerking haalt hem weg', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 7: Weer openen maakt de opmerking leeg
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_opmerking_zetten(taak_k, 'Bijna klaar');
    perform taak_heropenen(taak_k);
    execute 'reset role';
    select * into t from taken where id = taak_k;
    insert into testuitslag values (7, 'Weer openen maakt opmerking leeg', 'toegestaan',
      t.status || ' / ' || coalesce(t.opmerking, 'leeg'),
      case when t.status = 'open' and t.opmerking is null then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (7, 'Weer openen maakt opmerking leeg', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 8: bestuur zet via de tabel een opmerking bij een open taak
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    update taken set opmerking = 'Stiekem' where id = taak_k;
    execute 'reset role';
    insert into testuitslag values (8, 'Opmerking bij open taak via de tabel', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (8, 'Opmerking bij open taak via de tabel', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from taken      where aangemaakt_door in (jan, kees, tom);
  delete from gebruikers where id in (jan, kees, tom);  -- lidmaatschappen gaan vanzelf mee
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
