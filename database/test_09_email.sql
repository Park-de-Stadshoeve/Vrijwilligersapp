-- =====================================================================
-- test_09_email.sql — controleert gebruiker_email (09_email.sql)
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers (met een verzonnen inlogaccount) en
--   kijkt wie het e-mailadres mag zien. Daarna ruimt het alles op.
--   Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Bea     vrijwilliger met vinkje beheerder
--     Jan     bestuur, geen beheerder
--     Kees    vrijwilliger, adres kees@voorbeeld.invalid
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 09_email.sql. Supabase kan waarschuwen voor
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
  bea    uuid := gen_random_uuid();
  jan    uuid := gen_random_uuid();
  kees   uuid := gen_random_uuid();
  adres  text;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  -- ".invalid" is een domein dat nooit bestaat: hier gaat nooit mail heen.
  insert into auth.users (id, email) values (kees, 'kees@voorbeeld.invalid');
  insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder) values
    (bea,  'TestBea',  'B', 'vrijwilliger', true),
    (jan,  'TestJan',  'J', 'bestuur',      false),
    (kees, 'TestKees', 'K', 'vrijwilliger', false);


  -- Test 1: Bea (beheerder) vraagt het adres van Kees
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    adres := gebruiker_email(kees);
    execute 'reset role';
    insert into testuitslag values (1, 'Beheerder ziet adres van Kees', 'toegestaan',
      coalesce(adres, 'leeg'),
      case when adres = 'kees@voorbeeld.invalid' then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'Beheerder ziet adres van Kees', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 2: Jan (bestuur, geen beheerder) vraagt het adres van Kees
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    adres := gebruiker_email(kees);
    execute 'reset role';
    insert into testuitslag values (2, 'Bestuur (geen beheerder) vraagt adres', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Bestuur (geen beheerder) vraagt adres', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 3: Kees vraagt zijn eigen adres (ook dat mag alleen een beheerder)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    adres := gebruiker_email(kees);
    execute 'reset role';
    insert into testuitslag values (3, 'Vrijwilliger vraagt adres', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Vrijwilliger vraagt adres', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: niet ingelogd (anon) vraagt het adres
  begin
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    adres := gebruiker_email(kees);
    execute 'reset role';
    insert into testuitslag values (4, 'Niet ingelogd vraagt adres', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Niet ingelogd vraagt adres', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from gebruikers where id in (bea, jan, kees);
  delete from auth.users where id = kees;
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
