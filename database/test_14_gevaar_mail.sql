-- =====================================================================
-- test_14_gevaar_mail.sql — controleert 14_gevaar_mail.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het controleert:
--     - dat het adres van de Edge Function is ingevuld;
--     - dat een gevaarlijke melding een seintje geeft (in de wachtrij van
--       pg_net) en een gewone melding niet;
--     - dat de app de tabel app_instellingen niet kan lezen;
--     - dat "is er iemand voor de gevaar-mail" werkt.
--   Alles wat dit bestand doet, wordt aan het eind teruggedraaid: er gaat
--   dus geen echte mail. Je mag het zo vaak uitvoeren als je wilt.
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 14_gevaar_mail.sql en na het invullen van het adres.
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
  kees     uuid := gen_random_uuid();
  voor     bigint;
  na       bigint;
  antwoord boolean;
  aantal   integer;
  gewoon   bigint;   -- aantal seintjes na een gewone melding
  gevaar   bigint;   -- aantal seintjes na een gevaarlijke melding
begin
  -- Test 1: het adres is ingevuld
  select count(*) into aantal from app_instellingen
  where naam = 'gevaar_mail_adres' and waarde like 'https://%/functions/v1/gevaar-mail';
  insert into testuitslag values (1, 'Adres van de Edge Function ingevuld', 'ja',
    case when aantal = 1 then 'ja' else 'nee' end, case when aantal = 1 then 'goed' else 'FOUT' end);

  -- Tests 2 en 3 in een blok dat aan het eind wordt teruggedraaid
  begin
    insert into gebruikers (id, voornaam, achternaam_letter, rol) values (kees, 'TestKees', 'K', 'vrijwilliger');

    select count(*) into voor from net.http_request_queue;
    insert into meldingen (plek, foto, gemeld_door, gevaarlijk)
    select id, kees || '/test.jpg', kees, false from plekken limit 1;
    select count(*) into na from net.http_request_queue;
    gewoon := na - voor;

    voor := na;
    insert into meldingen (plek, foto, gemeld_door, gevaarlijk)
    select id, kees || '/test2.jpg', kees, true from plekken limit 1;
    select count(*) into na from net.http_request_queue;
    gevaar := na - voor;

    raise exception 'TERUGDRAAIEN';   -- alles hierboven weer weg (ook het seintje)
  exception when others then
    if sqlerrm <> 'TERUGDRAAIEN' then
      insert into testuitslag values (2, 'Seintjes testen', 'gelukt', 'fout: ' || sqlerrm, 'FOUT');
    end if;
  end;
  -- De uitslagen pas NA het terugdraaien opschrijven (anders zijn ze ook weg)
  if gewoon is not null then
    insert into testuitslag values (2, 'Gewone melding geeft geen seintje', 'geen seintje',
      gewoon || ' seintje(s)', case when gewoon = 0 then 'goed' else 'FOUT' end);
    insert into testuitslag values (3, 'Gevaarlijke melding geeft een seintje', '1 seintje',
      gevaar || ' seintje(s)', case when gevaar = 1 then 'goed' else 'FOUT' end);
  end if;

  -- Test 4: de app (ingelogd) leest app_instellingen
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    perform * from app_instellingen;
    execute 'reset role';
    insert into testuitslag values (4, 'App leest app_instellingen', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'App leest app_instellingen', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 5: "is er iemand voor de gevaar-mail" geeft een antwoord
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    antwoord := er_is_iemand_voor_gevaar_mail();
    execute 'reset role';
    insert into testuitslag values (5, 'Vraag "is er iemand voor de gevaar-mail"', 'ja of nee',
      case when antwoord then 'ja' else 'nee' end, 'goed');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (5, 'Vraag "is er iemand voor de gevaar-mail"', 'ja of nee', 'fout: ' || sqlerrm, 'FOUT');
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
