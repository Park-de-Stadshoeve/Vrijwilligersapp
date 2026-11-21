-- =====================================================================
-- test_15_vervallen.sql — controleert 15_vervallen.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers, taken en een melding, doet zich voor
--   als elk van hen en kijkt of "laten vervallen" en "weer openen" mogen of
--   geweigerd worden. Daarna ruimt het alles weer op. Je mag het zo vaak
--   uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Jan     bestuur
--     Kees    vrijwilliger, werkgroep Klussen
--     Tom     vrijwilliger, werkgroep Tuinen
--   De testtaken (allemaal Klussen):
--     taak 1  op naam van Kees
--     taak 2  gemaakt uit een melding
--     taak 3  op naam van Kees, wordt gereed gemeld
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 15_vervallen.sql. Supabase kan waarschuwen voor
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
  jan      uuid := gen_random_uuid();
  kees     uuid := gen_random_uuid();
  tom      uuid := gen_random_uuid();
  taak1    bigint;
  taak2    bigint;
  taak3    bigint;
  melding  bigint;
  los      bigint;
  t        taken;
  aantal   integer;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  insert into gebruikers (id, voornaam, achternaam_letter, rol) values
    (jan,  'TestJan',  'J', 'bestuur'),
    (kees, 'TestKees', 'K', 'vrijwilliger'),
    (tom,  'TestTom',  'T', 'vrijwilliger');
  insert into lidmaatschappen (gebruiker, werkgroep) select kees, id from werkgroepen where naam = 'Klussen';
  insert into lidmaatschappen (gebruiker, werkgroep) select tom,  id from werkgroepen where naam = 'Tuinen';

  insert into taken (titel, plek, werkgroep, toegewezen_aan, aangemaakt_door)
  select 'TEST taak 1', p.id, w.id, kees, jan from plekken p, werkgroepen w
  where p.naam = 'Gebouw' and w.naam = 'Klussen' returning id into taak1;
  insert into taken (titel, plek, werkgroep, aangemaakt_door)
  select 'TEST taak 2', p.id, w.id, jan from plekken p, werkgroepen w
  where p.naam = 'Gebouw' and w.naam = 'Klussen' returning id into taak2;
  insert into taken (titel, plek, werkgroep, toegewezen_aan, aangemaakt_door)
  select 'TEST taak 3', p.id, w.id, kees, jan from plekken p, werkgroepen w
  where p.naam = 'Gebouw' and w.naam = 'Klussen' returning id into taak3;
  insert into meldingen (plek, foto, gemeld_door, taak)
  select id, kees || '/test.jpg', kees, taak2 from plekken where naam = 'Gebouw'
  returning id into melding;


  -- Test 1: Kees (vrijwilliger) laat taak 1 vervallen
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_laten_vervallen(taak1, null);
    execute 'reset role';
    insert into testuitslag values (1, 'Vrijwilliger laat een taak vervallen', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'Vrijwilliger laat een taak vervallen', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 2: Jan (bestuur) laat taak 1 vervallen, met een reden
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_laten_vervallen(taak1, '  Hek wordt vervangen  ');
    execute 'reset role';
    select * into t from taken where id = taak1;
    insert into testuitslag values (2, 'Bestuur laat taak vervallen met reden', 'toegestaan',
      t.status || ' / ' || coalesce(t.opmerking, 'geen reden'),
      case when t.status = 'vervallen' and t.vervallen_door = jan and t.opmerking = 'Hek wordt vervangen'
           then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Bestuur laat taak vervallen met reden', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 3: Jan laat taak 1 nog een keer vervallen
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_laten_vervallen(taak1, null);
    execute 'reset role';
    insert into testuitslag values (3, 'Al vervallen taak nog eens', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Al vervallen taak nog eens', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: Tom (andere werkgroep) zet taak 1 weer open
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', tom)::text, true);
    execute 'set local role authenticated';
    perform taak_vervallen_terug(taak1, null);
    execute 'reset role';
    insert into testuitslag values (4, 'Vrijwilliger uit andere werkgroep opent weer', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Vrijwilliger uit andere werkgroep opent weer', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 5: Kees (werkgroep Klussen) zet taak 1 weer open
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_vervallen_terug(taak1, null);
    execute 'reset role';
    select * into t from taken where id = taak1;
    insert into testuitslag values (5, 'Vrijwilliger uit de werkgroep opent weer', 'toegestaan',
      t.status || ' / reden ' || coalesce(t.opmerking, 'weg'),
      case when t.status = 'open' and t.opmerking is null and t.toegewezen_aan = kees then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (5, 'Vrijwilliger uit de werkgroep opent weer', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 6: Jan laat taak 2 (uit een melding) vervallen: melding weer Nieuw
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    los := taak_laten_vervallen(taak2, null);
    execute 'reset role';
    insert into testuitslag values (6, 'Taak uit melding vervalt: melding weer Nieuw', 'toegestaan',
      (select status from meldingen_met_status where id = melding),
      case when los = melding and (select status from meldingen_met_status where id = melding) = 'Nieuw'
           then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (6, 'Taak uit melding vervalt: melding weer Nieuw', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 7: Ongedaan maken: taak 2 weer open en weer aan de melding
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_vervallen_terug(taak2, melding);
    execute 'reset role';
    insert into testuitslag values (7, 'Ongedaan maken koppelt de melding weer', 'toegestaan',
      (select status from meldingen_met_status where id = melding),
      case when (select taak from meldingen where id = melding) = taak2 then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (7, 'Ongedaan maken koppelt de melding weer', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 8: een gereed gemelde taak laten vervallen
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_gereed_melden(taak3, null);
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    perform taak_laten_vervallen(taak3, null);
    execute 'reset role';
    insert into testuitslag values (8, 'Gereed gemelde taak laten vervallen', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (8, 'Gereed gemelde taak laten vervallen', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 9: bestuur verwijdert een gereed gemelde taak via de tabel
  update taken set status = 'gereed', gereed_gemeld_door = kees, gereed_gemeld_op = now() where id = taak3;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    delete from taken where id = taak3;
    execute 'reset role';
    select count(*) into aantal from taken where id = taak3;
    insert into testuitslag values (9, 'Bestuur verwijdert gereed gemelde taak', 'niet verwijderd',
      case when aantal = 1 then 'niet verwijderd' else 'verwijderd' end,
      case when aantal = 1 then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (9, 'Bestuur verwijdert gereed gemelde taak', 'niet verwijderd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 10: weer openen terwijl de toegewezen persoon gestopt is: taak weer vrij
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_laten_vervallen(taak1, null);
    execute 'reset role';
    update gebruikers set actief = false where id = kees;
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_vervallen_terug(taak1, null);
    execute 'reset role';
    select * into t from taken where id = taak1;
    insert into testuitslag values (10, 'Weer openen, toegewezen persoon is gestopt', 'taak vrij',
      case when t.toegewezen_aan is null then 'taak vrij' else 'nog op naam' end,
      case when t.status = 'open' and t.toegewezen_aan is null then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (10, 'Weer openen, toegewezen persoon is gestopt', 'taak vrij', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from meldingen where gemeld_door in (jan, kees, tom);
  delete from taken     where aangemaakt_door in (jan, kees, tom);
  delete from gebruikers where id in (jan, kees, tom);
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
