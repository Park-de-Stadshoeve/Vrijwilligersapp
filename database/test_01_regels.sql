-- =====================================================================
-- test_01_regels.sql — controleert of de regels uit 01_tabellen.sql werken
-- =====================================================================
-- Wat doet dit bestand?
--   Het probeert met verzonnen gegevens dingen die wel en niet mogen,
--   en kijkt of de database ze toestaat of weigert. Daarna ruimt het alle
--   testgegevens weer op. Je mag het zo vaak uitvoeren als je wilt.
--
-- Hoe lees je de uitkomst?
--   Je krijgt een tabel. In de kolom "goed" moet overal "goed" staan.
--   Staat er "FOUT", dan werkt die regel niet zoals bedoeld.
--
-- Supabase kan waarschuwen dat dit bestand iets verwijdert ("destructive
-- operation"). Dat klopt: het ruimt zijn eigen testgegevens op. Je kunt
-- bevestigen.
--
-- Uitvoeren na 01_tabellen.sql en 02_startgegevens.sql.
-- =====================================================================

-- Tijdelijke tabel voor de uitkomsten. Verdwijnt vanzelf.
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
  -- Twee verzonnen testgebruikers met dezelfde voornaam
  piet1     uuid := gen_random_uuid();
  piet2     uuid := gen_random_uuid();
  test9     uuid := gen_random_uuid();
  hummel    bigint;
  stal      bigint;
  klussen   bigint;
  schommel  bigint;
  taak_a    bigint;
  taak_b    bigint;
  melding   bigint;
  tekst     text;
begin
  -- ===== Voorbereiding =====
  select id into hummel  from plekken     where naam = 'Hummelhoeve';
  select id into stal    from plekken     where naam = 'Stal';
  select id into klussen from werkgroepen where naam = 'Klussen';

  insert into gebruikers (id, voornaam, achternaam_letter)
  values (piet1, 'Piet', 'P'), (piet2, 'Piet', 'V');

  insert into onderdelen (plek, naam)
  values (hummel, 'TEST nestschommel')
  returning id into schommel;

  -- Werking van elke test: probeer iets. Lukt het, dan wordt de regel na
  -- de poging opgeschreven. Mislukt het, dan springt het naar "exception"
  -- en wordt dat opgeschreven.

  -- ===== Test 1: taak gereed zonder toegewezen persoon =====
  begin
    insert into taken (titel, plek, werkgroep, status, gereed_gemeld_door, gereed_gemeld_op, aangemaakt_door)
    values ('TEST 1', hummel, klussen, 'gereed', piet1, now(), piet1);
    insert into testuitslag values (1, 'Taak gereed zonder toegewezen persoon', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (1, 'Taak gereed zonder toegewezen persoon', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- ===== Test 2: taak gereed, toegewezen, met door wie en wanneer =====
  begin
    insert into taken (titel, plek, werkgroep, toegewezen_aan, status, gereed_gemeld_door, gereed_gemeld_op, aangemaakt_door)
    values ('TEST 2', hummel, klussen, piet1, 'gereed', piet1, now(), piet1);
    insert into testuitslag values (2, 'Taak gereed, toegewezen, compleet', 'toegestaan', 'toegestaan', 'goed');
  exception when others then
    insert into testuitslag values (2, 'Taak gereed, toegewezen, compleet', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- ===== Test 3: taak gereed zonder "door wie" =====
  begin
    insert into taken (titel, plek, werkgroep, toegewezen_aan, status, gereed_gemeld_op, aangemaakt_door)
    values ('TEST 3', hummel, klussen, piet1, 'gereed', now(), piet1);
    insert into testuitslag values (3, 'Taak gereed zonder "door wie"', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (3, 'Taak gereed zonder "door wie"', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- ===== Test 4: onderdeel van de Hummelhoeve bij plek Stal =====
  begin
    insert into taken (titel, plek, onderdeel, werkgroep, aangemaakt_door)
    values ('TEST 4', stal, schommel, klussen, piet1);
    insert into testuitslag values (4, 'Onderdeel hoort bij andere plek', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (4, 'Onderdeel hoort bij andere plek', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- ===== Test 5: onderdeel van de Hummelhoeve bij plek Hummelhoeve =====
  begin
    insert into taken (titel, plek, onderdeel, werkgroep, toegewezen_aan, aangemaakt_door)
    values ('TEST 5', hummel, schommel, klussen, piet1, piet1)
    returning id into taak_a;
    insert into testuitslag values (5, 'Onderdeel hoort bij juiste plek', 'toegestaan', 'toegestaan', 'goed');
  exception when others then
    insert into testuitslag values (5, 'Onderdeel hoort bij juiste plek', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- ===== Test 6: melding zonder foto =====
  begin
    insert into meldingen (plek, gemeld_door)
    values (hummel, piet2);
    insert into testuitslag values (6, 'Melding zonder foto', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (6, 'Melding zonder foto', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- ===== Test 7: melding met taak én "geen actie nodig" =====
  begin
    insert into taken (titel, plek, werkgroep, aangemaakt_door)
    values ('TEST 7', hummel, klussen, piet1)
    returning id into taak_b;
    insert into meldingen (plek, foto, gemeld_door, taak, geen_actie_reden, geen_actie_door)
    values (hummel, 'test.jpg', piet2, taak_b, 'Niet nodig', piet1);
    insert into testuitslag values (7, 'Melding met taak én geen actie', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (7, 'Melding met taak én geen actie', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- ===== Test 8: "geen actie nodig" met een lege reden =====
  begin
    insert into meldingen (plek, foto, gemeld_door, geen_actie_reden, geen_actie_door)
    values (hummel, 'test.jpg', piet2, '   ', piet1);
    insert into testuitslag values (8, 'Geen actie met lege reden', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (8, 'Geen actie met lege reden', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- ===== Test 9: onbekende rol =====
  begin
    insert into gebruikers (id, voornaam, achternaam_letter, rol)
    values (test9, 'Test', 'T', 'beheerder');
    insert into testuitslag values (9, 'Onbekende rol "beheerder"', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    insert into testuitslag values (9, 'Onbekende rol "beheerder"', 'geweigerd', 'geweigerd', 'goed');
  end;

  -- ===== Test 10: twee keer Piet → "Piet P." en "Piet V." =====
  -- Na 03_rechten.sql laat dit overzicht alleen iets zien aan een
  -- ingelogde, actieve gebruiker. Daarom doen we even alsof piet1 is
  -- ingelogd (dit geldt alleen binnen deze test).
  perform set_config('request.jwt.claims', json_build_object('sub', piet1)::text, true);
  select string_agg(naam, ', ' order by naam) into tekst
  from gebruikers_weergave where id in (piet1, piet2);
  insert into testuitslag values (10, 'Naam bij dubbele voornaam', 'Piet P., Piet V.', tekst,
    case when tekst = 'Piet P., Piet V.' then 'goed' else 'FOUT' end);

  -- ===== Test 11: status van een melding met een toegewezen, open taak =====
  insert into meldingen (plek, foto, gemeld_door, taak)
  values (hummel, 'test.jpg', piet2, taak_a)
  returning id into melding;
  select status into tekst from meldingen_met_status where id = melding;
  insert into testuitslag values (11, 'Status melding met toegewezen taak', 'Toegewezen', tekst,
    case when tekst = 'Toegewezen' then 'goed' else 'FOUT' end);

  -- ===== Test 12: dezelfde melding, nadat de taak gereed is =====
  update taken set status = 'gereed', gereed_gemeld_door = piet1, gereed_gemeld_op = now()
  where id = taak_a;
  select status into tekst from meldingen_met_status where id = melding;
  insert into testuitslag values (12, 'Status melding na gereed melden', 'Gereed', tekst,
    case when tekst = 'Gereed' then 'goed' else 'FOUT' end);

  -- ===== Opruimen: alle testgegevens weer weg =====
  delete from meldingen  where gemeld_door in (piet1, piet2);
  delete from taken      where aangemaakt_door in (piet1, piet2);
  delete from onderdelen where id = schommel;
  delete from gebruikers where id in (piet1, piet2, test9);
end $$;

-- De uitkomst laten zien
select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
