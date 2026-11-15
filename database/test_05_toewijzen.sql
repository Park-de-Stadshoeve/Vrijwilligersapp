-- =====================================================================
-- test_05_toewijzen.sql — controleert taak_toewijzen (05_toewijzen.sql)
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers en een verzonnen taak, doet zich voor
--   als elk van hen (zoals in test_03_rechten.sql) en kijkt of toewijzen
--   mag of geweigerd wordt. Daarna ruimt het alles weer op.
--   Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Jan     bestuur
--     Kees    vrijwilliger, werkgroep Klussen
--     Oud     vrijwilliger die gestopt is (niet meer actief)
--   De testtaak:
--     taak K  Klussen
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan. Bij geweigerde acties
--   zie je ook de foutmelding die de app laat zien.
--
-- Uitvoeren na 05_toewijzen.sql. Supabase kan waarschuwen voor
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
  oud     uuid := gen_random_uuid();
  taak_k  bigint;
  wie     uuid;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  insert into gebruikers (id, voornaam, achternaam_letter, rol, actief) values
    (jan,  'TestJan',  'B', 'bestuur',      true),
    (kees, 'TestKees', 'K', 'vrijwilliger', true),
    (oud,  'TestOud',  'O', 'vrijwilliger', false);

  insert into lidmaatschappen (gebruiker, werkgroep)
  select kees, id from werkgroepen where naam = 'Klussen';

  insert into taken (titel, plek, werkgroep, aangemaakt_door)
  select 'TEST taak K', p.id, w.id, jan
  from plekken p, werkgroepen w where p.naam = 'Gebouw' and w.naam = 'Klussen'
  returning id into taak_k;


  -- Test 1: Jan (bestuur) wijst taak K toe aan Kees
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_toewijzen(taak_k, kees);
    execute 'reset role';
    select toegewezen_aan into wie from taken where id = taak_k;
    insert into testuitslag values (1, 'Bestuur wijst toe aan Kees', 'toegestaan',
      case when wie = kees then 'toegestaan' else 'niet bewaard' end,
      case when wie = kees then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'Bestuur wijst toe aan Kees', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 2: Kees (vrijwilliger) wijst taak K toe aan Jan
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_toewijzen(taak_k, jan);
    execute 'reset role';
    insert into testuitslag values (2, 'Vrijwilliger wijst toe', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Vrijwilliger wijst toe', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 3: Jan wijst toe aan iemand die gestopt is
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_toewijzen(taak_k, oud);
    execute 'reset role';
    insert into testuitslag values (3, 'Toewijzen aan iemand die gestopt is', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Toewijzen aan iemand die gestopt is', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: Jan zet taak K weer op niemand
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_toewijzen(taak_k, null);
    execute 'reset role';
    select toegewezen_aan into wie from taken where id = taak_k;
    insert into testuitslag values (4, 'Bestuur zet taak op niemand', 'toegestaan',
      case when wie is null then 'toegestaan' else 'niet bewaard' end,
      case when wie is null then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Bestuur zet taak op niemand', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 5: Kees meldt taak K gereed terwijl die aan niemand is toegewezen
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_gereed_melden(taak_k);
    execute 'reset role';
    insert into testuitslag values (5, 'Gereed melden zonder toegewezen persoon', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (5, 'Gereed melden zonder toegewezen persoon', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 6: Jan wijst een gereed gemelde taak toe
  begin
    update taken set toegewezen_aan = kees, status = 'gereed',
                     gereed_gemeld_door = kees, gereed_gemeld_op = now()
    where id = taak_k;
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform taak_toewijzen(taak_k, jan);
    execute 'reset role';
    insert into testuitslag values (6, 'Gereed gemelde taak toewijzen', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (6, 'Gereed gemelde taak toewijzen', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from taken      where aangemaakt_door in (jan, kees, oud);
  delete from gebruikers where id in (jan, kees, oud);  -- lidmaatschappen gaan vanzelf mee
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
