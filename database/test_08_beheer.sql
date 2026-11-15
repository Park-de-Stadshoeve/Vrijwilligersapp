-- =====================================================================
-- test_08_beheer.sql — controleert 08_beheer.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers, doet zich voor als elk van hen (zoals
--   in test_03_rechten.sql) en kijkt of wijzigen mag of geweigerd wordt.
--   Daarna ruimt het alles weer op. Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Bea     vrijwilliger met vinkje beheerder
--     Bert    vrijwilliger, (nog) geen beheerder
--     Jan     bestuur, geen beheerder
--     Kees    vrijwilliger, werkgroep Klussen
--
--   Let op: voor test 6 en 7 zet dit bestand de vinkjes "beheerder" van de
--   echte gebruikers in het project heel even uit, zodat Bea de enige
--   beheerder is. Aan het eind worden ze teruggezet. Gaat er onderweg iets
--   mis, dan draait de database alles terug; er verandert dan niets.
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan. Bij geweigerde acties
--   zie je ook de foutmelding die de app laat zien.
--
-- Uitvoeren na 08_beheer.sql. Supabase kan waarschuwen voor
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
  bea      uuid := gen_random_uuid();
  bert     uuid := gen_random_uuid();
  jan      uuid := gen_random_uuid();
  kees     uuid := gen_random_uuid();
  klussen  bigint;
  tuinen   bigint;
  echte_beheerders uuid[];   -- om ze aan het eind terug te zetten
  g        gebruikers;
  aantal   integer;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  select id into klussen from werkgroepen where naam = 'Klussen';
  select id into tuinen  from werkgroepen where naam = 'Tuinen';

  insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder, actief) values
    (bea,  'TestBea',  'B', 'vrijwilliger', true,  true),
    (bert, 'TestBert', 'B', 'vrijwilliger', false, true),
    (jan,  'TestJan',  'J', 'bestuur',      false, true),
    (kees, 'TestKees', 'K', 'vrijwilliger', false, true);
  insert into lidmaatschappen (gebruiker, werkgroep) values (kees, klussen);


  -- Test 1: Bea (beheerder) maakt van Kees een bestuurslid in Klussen en Tuinen
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(kees, ' TestKees2 ', 'K', 'bestuur', false, true, array[klussen, tuinen]);
    execute 'reset role';
    select * into g from gebruikers where id = kees;
    select count(*) into aantal from lidmaatschappen where gebruiker = kees;
    insert into testuitslag values (1, 'Beheerder wijzigt Kees (naam, rol, vinkje, 2 werkgroepen)', 'toegestaan',
      case when g.voornaam = 'TestKees2' and g.rol = 'bestuur' and g.krijgt_gevaar_mail and aantal = 2
           then 'toegestaan' else 'niet goed bewaard' end,
      case when g.voornaam = 'TestKees2' and g.rol = 'bestuur' and g.krijgt_gevaar_mail and aantal = 2
           then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'Beheerder wijzigt Kees (naam, rol, vinkje, 2 werkgroepen)', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 2: Jan (bestuur, geen beheerder) wijzigt Kees
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(kees, 'TestKees', 'K', 'vrijwilliger', false, false, array[klussen]);
    execute 'reset role';
    insert into testuitslag values (2, 'Bestuur (geen beheerder) wijzigt iemand', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Bestuur (geen beheerder) wijzigt iemand', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 3: Bert (geen beheerder) maakt zichzelf beheerder
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bert)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(bert, 'TestBert', 'B', 'vrijwilliger', true, false, null);
    execute 'reset role';
    insert into testuitslag values (3, 'Vrijwilliger maakt zichzelf beheerder', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Vrijwilliger maakt zichzelf beheerder', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: Bea laat de voornaam leeg
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(kees, '   ', 'K', 'vrijwilliger', false, false, null);
    execute 'reset role';
    insert into testuitslag values (4, 'Lege voornaam', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Lege voornaam', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 5: Bea kiest een rol die niet bestaat
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(kees, 'TestKees', 'K', 'baas', false, false, null);
    execute 'reset role';
    insert into testuitslag values (5, 'Onbekende rol "baas"', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (5, 'Onbekende rol "baas"', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Voor test 6 en 7: Bea wordt (even) de enige echte beheerder
  select array_agg(id) into echte_beheerders
  from gebruikers where is_beheerder and actief and id <> bea;
  update gebruikers set is_beheerder = false where id = any(echte_beheerders);

  -- Test 6: Bea (enige beheerder) zet haar eigen vinkje uit
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(bea, 'TestBea', 'B', 'vrijwilliger', false, false, null);
    execute 'reset role';
    insert into testuitslag values (6, 'Enige beheerder zet eigen vinkje uit', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (6, 'Enige beheerder zet eigen vinkje uit', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 7: Bea maakt eerst Bert beheerder, en zet daarna haar eigen vinkje uit
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(bert, 'TestBert', 'B', 'vrijwilliger', true, false, null);
    perform gebruiker_wijzigen(bea,  'TestBea',  'B', 'vrijwilliger', false, false, null);
    execute 'reset role';
    select * into g from gebruikers where id = bea;
    insert into testuitslag values (7, 'Eerst Bert beheerder, dan eigen vinkje uit', 'toegestaan',
      case when not g.is_beheerder then 'toegestaan' else 'niet bewaard' end,
      case when not g.is_beheerder then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (7, 'Eerst Bert beheerder, dan eigen vinkje uit', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Echte beheerders terugzetten
  update gebruikers set is_beheerder = true where id = any(echte_beheerders);

  -- Test 8: Bert (nu beheerder) zet dezelfde werkgroep twee keer in de lijst
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bert)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(kees, 'TestKees', 'K', 'vrijwilliger', false, false, array[klussen, klussen]);
    execute 'reset role';
    select count(*) into aantal from lidmaatschappen where gebruiker = kees;
    insert into testuitslag values (8, 'Werkgroep dubbel in de lijst: één keer bewaard', 'toegestaan',
      case when aantal = 1 then 'toegestaan' else aantal || ' keer bewaard' end,
      case when aantal = 1 then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (8, 'Werkgroep dubbel in de lijst: één keer bewaard', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 9: Bert wijzigt iemand die niet bestaat
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bert)::text, true);
    execute 'set local role authenticated';
    perform gebruiker_wijzigen(gen_random_uuid(), 'Niemand', 'N', 'vrijwilliger', false, false, null);
    execute 'reset role';
    insert into testuitslag values (9, 'Persoon die niet bestaat', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (9, 'Persoon die niet bestaat', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  -- Eerst zijn de echte beheerders terug (zie boven), anders houdt de
  -- bewaker het verwijderen van de laatste testbeheerder tegen.
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  -- De bewaker gaat heel even uit: heeft het project geen echte beheerder,
  -- dan zou hij het weghalen van de testbeheerder Bert anders tegenhouden.
  alter table gebruikers disable trigger altijd_een_beheerder;
  delete from gebruikers where id in (bea, bert, jan, kees);  -- lidmaatschappen gaan vanzelf mee
  alter table gebruikers enable trigger altijd_een_beheerder;
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
