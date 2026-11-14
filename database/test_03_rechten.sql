-- =====================================================================
-- test_03_rechten.sql — controleert wie wat mag (03_rechten.sql)
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt vijf verzonnen gebruikers en doet zich om de beurt voor
--   als elk van hen, alsof die persoon via de app is ingelogd. Dan kijkt
--   het wat die persoon ziet en mag. Daarna ruimt het alles weer op.
--   Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Jan     bestuur, geen beheerder
--     Kees    vrijwilliger, werkgroep Klussen
--     Fatima  vrijwilliger, werkgroep Tuinen
--     Piet    vrijwilliger, werkgroep Dieren (doet de meldingen)
--     Bea     vrijwilliger met vinkje beheerder
--
--   De testgegevens:
--     taak K   Klussen, nog niet toegewezen
--     taak T   Tuinen, nog niet toegewezen
--     melding K  van Piet, daar is taak K van gemaakt
--     melding N  van Piet, nog "Nieuw"
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan. Bij geweigerde acties
--   zie je ook de foutmelding die de app straks laat zien.
--
-- Hoe werkt "doen alsof"?
--   set_config('request.jwt.claims', ...) = vertel de database wie er is
--   ingelogd. "set local role authenticated" = gedraag je als gewone
--   ingelogde gebruiker, niet als beheerder van de database.
--   "reset role" = terug naar de beheerder van de database.
--
-- Uitvoeren na 03_rechten.sql. Supabase kan waarschuwen voor
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
  fatima  uuid := gen_random_uuid();
  piet    uuid := gen_random_uuid();
  bea     uuid := gen_random_uuid();
  taak_k     bigint;
  taak_t     bigint;
  melding_k  bigint;
  melding_n  bigint;
  n          integer;
  tekst      text;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder) values
    (jan,    'TestJan',    'B', 'bestuur',      false),
    (kees,   'TestKees',   'K', 'vrijwilliger', false),
    (fatima, 'TestFatima', 'T', 'vrijwilliger', false),
    (piet,   'TestPiet',   'D', 'vrijwilliger', false),
    (bea,    'TestBea',    'A', 'vrijwilliger', true);

  insert into lidmaatschappen (gebruiker, werkgroep)
  select kees,   id from werkgroepen where naam = 'Klussen' union all
  select fatima, id from werkgroepen where naam = 'Tuinen'  union all
  select piet,   id from werkgroepen where naam = 'Dieren';

  insert into taken (titel, plek, werkgroep, aangemaakt_door)
  select 'TEST taak K', p.id, w.id, jan
  from plekken p, werkgroepen w where p.naam = 'Gebouw' and w.naam = 'Klussen'
  returning id into taak_k;

  insert into taken (titel, plek, werkgroep, aangemaakt_door)
  select 'TEST taak T', p.id, w.id, jan
  from plekken p, werkgroepen w where p.naam = 'Moestuin' and w.naam = 'Tuinen'
  returning id into taak_t;

  insert into meldingen (plek, foto, gemeld_door)
  select id, 'test-03.jpg', piet from plekken where naam = 'Gebouw'
  returning id into melding_k;
  update meldingen set taak = taak_k where id = melding_k;

  insert into meldingen (plek, foto, gemeld_door)
  select id, 'test-03.jpg', piet from plekken where naam = 'Moestuin'
  returning id into melding_n;


  -- ===== Wie ziet welke taken? =====

  -- Test 1: Kees (Klussen)
  perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from taken where titel like 'TEST taak%';
  execute 'reset role';
  insert into testuitslag values (1, 'Kees (Klussen) ziet taken', '1', n::text,
    case when n = 1 then 'goed' else 'FOUT' end);

  -- Test 2: Fatima (Tuinen)
  perform set_config('request.jwt.claims', json_build_object('sub', fatima)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from taken where titel like 'TEST taak%';
  execute 'reset role';
  insert into testuitslag values (2, 'Fatima (Tuinen) ziet taken', '1', n::text,
    case when n = 1 then 'goed' else 'FOUT' end);

  -- Test 3: Jan (bestuur)
  perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from taken where titel like 'TEST taak%';
  execute 'reset role';
  insert into testuitslag values (3, 'Jan (bestuur) ziet taken', '2', n::text,
    case when n = 2 then 'goed' else 'FOUT' end);

  -- Test 4: Piet (Dieren)
  perform set_config('request.jwt.claims', json_build_object('sub', piet)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from taken where titel like 'TEST taak%';
  execute 'reset role';
  insert into testuitslag values (4, 'Piet (Dieren) ziet taken', '0', n::text,
    case when n = 0 then 'goed' else 'FOUT' end);


  -- ===== Wie ziet welke meldingen? =====

  -- Test 5: Kees ziet melding K, want die hoort bij een Klussen-taak
  perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from meldingen where foto = 'test-03.jpg';
  execute 'reset role';
  insert into testuitslag values (5, 'Kees ziet meldingen (via taak)', '1', n::text,
    case when n = 1 then 'goed' else 'FOUT' end);

  -- Test 6: Fatima ziet geen meldingen
  perform set_config('request.jwt.claims', json_build_object('sub', fatima)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from meldingen where foto = 'test-03.jpg';
  execute 'reset role';
  insert into testuitslag values (6, 'Fatima ziet meldingen', '0', n::text,
    case when n = 0 then 'goed' else 'FOUT' end);

  -- Test 7: Piet ziet zijn eigen twee meldingen
  perform set_config('request.jwt.claims', json_build_object('sub', piet)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from meldingen where foto = 'test-03.jpg';
  execute 'reset role';
  insert into testuitslag values (7, 'Piet ziet eigen meldingen', '2', n::text,
    case when n = 2 then 'goed' else 'FOUT' end);


  -- ===== Taken wijzigen =====

  -- Test 8: Kees probeert de titel rechtstreeks te veranderen
  perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
  execute 'set local role authenticated';
  update taken set titel = 'TEST gehackt' where id = taak_k;
  get diagnostics n = row_count;   -- hoeveel regels zijn er gewijzigd?
  execute 'reset role';
  insert into testuitslag values (8, 'Kees wijzigt titel rechtstreeks', '0 gewijzigd', n || ' gewijzigd',
    case when n = 0 then 'goed' else 'FOUT' end);

  -- Test 9: Fatima probeert taak K (Klussen) op te pakken
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', fatima)::text, true);
    execute 'set local role authenticated';
    perform taak_oppakken(taak_k);
    execute 'reset role';
    insert into testuitslag values (9, 'Fatima pakt Klussen-taak op', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (9, 'Fatima pakt Klussen-taak op', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 10: Kees pakt taak K op
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_oppakken(taak_k);
    execute 'reset role';
    insert into testuitslag values (10, 'Kees pakt Klussen-taak op', 'toegestaan', 'toegestaan', 'goed');
  exception when others then
    insert into testuitslag values (10, 'Kees pakt Klussen-taak op', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 11: Piet ziet de status van zijn melding (taak is van Klussen)
  perform set_config('request.jwt.claims', json_build_object('sub', piet)::text, true);
  execute 'set local role authenticated';
  select status into tekst from meldingen_met_status where id = melding_k;
  execute 'reset role';
  insert into testuitslag values (11, 'Piet ziet status na oppakken', 'Toegewezen', coalesce(tekst, '(niets)'),
    case when tekst = 'Toegewezen' then 'goed' else 'FOUT' end);

  -- Test 12: Kees meldt taak K gereed, met foto
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_gereed_melden(taak_k, 'test-na-afloop.jpg');
    execute 'reset role';
    insert into testuitslag values (12, 'Kees meldt taak gereed', 'toegestaan', 'toegestaan', 'goed');
  exception when others then
    insert into testuitslag values (12, 'Kees meldt taak gereed', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 13: Piet ziet nu "Gereed"
  perform set_config('request.jwt.claims', json_build_object('sub', piet)::text, true);
  execute 'set local role authenticated';
  select status into tekst from meldingen_met_status where id = melding_k;
  execute 'reset role';
  insert into testuitslag values (13, 'Piet ziet status na gereed', 'Gereed', coalesce(tekst, '(niets)'),
    case when tekst = 'Gereed' then 'goed' else 'FOUT' end);

  -- Test 14: Fatima probeert taak K weer te openen
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', fatima)::text, true);
    execute 'set local role authenticated';
    perform taak_heropenen(taak_k);
    execute 'reset role';
    insert into testuitslag values (14, 'Fatima heropent Klussen-taak', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (14, 'Fatima heropent Klussen-taak', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 15: Kees opent taak K weer
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_heropenen(taak_k);
    execute 'reset role';
    insert into testuitslag values (15, 'Kees heropent taak', 'toegestaan', 'toegestaan', 'goed');
  exception when others then
    insert into testuitslag values (15, 'Kees heropent taak', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 16: Kees geeft taak K terug
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform taak_teruggeven(taak_k);
    execute 'reset role';
    insert into testuitslag values (16, 'Kees geeft taak terug', 'toegestaan', 'toegestaan', 'goed');
  exception when others then
    insert into testuitslag values (16, 'Kees geeft taak terug', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;


  -- ===== Meldingen doen en intrekken =====

  -- Test 17: Kees doet een melding op naam van Piet
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    insert into meldingen (plek, foto, gemeld_door)
    select id, 'test-03.jpg', piet from plekken where naam = 'Stal';
    execute 'reset role';
    insert into testuitslag values (17, 'Melding op naam van een ander', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (17, 'Melding op naam van een ander', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- Test 18: Piet trekt melding K in (daar is al een taak van)
  perform set_config('request.jwt.claims', json_build_object('sub', piet)::text, true);
  execute 'set local role authenticated';
  delete from meldingen where id = melding_k;
  get diagnostics n = row_count;
  execute 'reset role';
  insert into testuitslag values (18, 'Piet trekt melding met taak in', '0 verwijderd', n || ' verwijderd',
    case when n = 0 then 'goed' else 'FOUT' end);

  -- Test 19: Piet trekt melding N in (nog "Nieuw")
  perform set_config('request.jwt.claims', json_build_object('sub', piet)::text, true);
  execute 'set local role authenticated';
  delete from meldingen where id = melding_n;
  get diagnostics n = row_count;
  execute 'reset role';
  insert into testuitslag values (19, 'Piet trekt nieuwe melding in', '1 verwijderd', n || ' verwijderd',
    case when n = 1 then 'goed' else 'FOUT' end);


  -- ===== Gebruikers en beheer =====

  -- Test 20: Kees ziet de namen van alle vijf testgebruikers
  perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from gebruikers_weergave where id in (jan, kees, fatima, piet, bea);
  execute 'reset role';
  insert into testuitslag values (20, 'Kees ziet namen van anderen', '5', n::text,
    case when n = 5 then 'goed' else 'FOUT' end);

  -- Test 21: Kees ziet van de tabel gebruikers alleen zichzelf (geen rollen van anderen)
  perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from gebruikers where id in (jan, kees, fatima, piet, bea);
  execute 'reset role';
  insert into testuitslag values (21, 'Kees ziet gebruikersgegevens', '1', n::text,
    case when n = 1 then 'goed' else 'FOUT' end);

  -- Test 22: Jan (bestuur, geen beheerder) voegt een werkgroep toe
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    insert into werkgroepen (naam) values ('TEST groep');
    execute 'reset role';
    insert into testuitslag values (22, 'Bestuur (geen beheerder) voegt werkgroep toe', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (22, 'Bestuur (geen beheerder) voegt werkgroep toe', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- Test 23: Bea (beheerder) voegt een werkgroep toe
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    insert into werkgroepen (naam) values ('TEST groep');
    execute 'reset role';
    insert into testuitslag values (23, 'Beheerder voegt werkgroep toe', 'toegestaan', 'toegestaan', 'goed');
  exception when others then
    insert into testuitslag values (23, 'Beheerder voegt werkgroep toe', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 24: iemand die niet is ingelogd leest de plekken
  begin
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    select count(*) into n from plekken;
    execute 'reset role';
    insert into testuitslag values (24, 'Niet ingelogd leest plekken', 'geweigerd', 'toegestaan (' || n || ')', 'FOUT');
  exception when others then
    insert into testuitslag values (24, 'Niet ingelogd leest plekken', 'geweigerd', 'geweigerd', 'goed');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from meldingen   where gemeld_door in (jan, kees, fatima, piet, bea);
  delete from taken       where aangemaakt_door in (jan, kees, fatima, piet, bea);
  delete from werkgroepen where naam = 'TEST groep';
  delete from gebruikers  where id in (jan, kees, fatima, piet, bea);  -- lidmaatschappen gaan vanzelf mee
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
