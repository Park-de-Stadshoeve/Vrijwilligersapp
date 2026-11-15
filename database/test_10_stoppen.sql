-- =====================================================================
-- test_10_stoppen.sql — controleert 10_stoppen.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers en taken, laat iemand stoppen en weer
--   meedoen, en kijkt of alles klopt. Daarna ruimt het alles weer op.
--   Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Bea     vrijwilliger met vinkje beheerder
--     Jan     bestuur, geen beheerder
--     Kees    vrijwilliger in Klussen, krijgt mail bij gevaar
--             met taak 1 (open), taak 2 (open) en taak 3 (gereed)
--
--   Let op: voor test 7 zet dit bestand de vinkjes "beheerder" van de
--   echte gebruikers heel even uit (net als test_08_beheer.sql). Aan het
--   eind worden ze teruggezet.
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 10_stoppen.sql. Supabase kan waarschuwen voor
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
  jan      uuid := gen_random_uuid();
  kees     uuid := gen_random_uuid();
  taak1    bigint;
  taak2    bigint;
  taak3    bigint;
  uitslag  jsonb;
  g        gebruikers;
  aantal   integer;
  echte_beheerders uuid[];
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder, krijgt_gevaar_mail) values
    (bea,  'TestBea',  'B', 'vrijwilliger', true,  false),
    (jan,  'TestJan',  'J', 'bestuur',      false, false),
    (kees, 'TestKees', 'K', 'vrijwilliger', false, true);
  insert into lidmaatschappen (gebruiker, werkgroep)
  select kees, id from werkgroepen where naam = 'Klussen';

  insert into taken (titel, plek, werkgroep, toegewezen_aan, aangemaakt_door)
  select 'TEST taak 1', p.id, w.id, kees, jan
  from plekken p, werkgroepen w where p.naam = 'Gebouw' and w.naam = 'Klussen'
  returning id into taak1;
  insert into taken (titel, plek, werkgroep, toegewezen_aan, aangemaakt_door)
  select 'TEST taak 2', p.id, w.id, kees, jan
  from plekken p, werkgroepen w where p.naam = 'Gebouw' and w.naam = 'Klussen'
  returning id into taak2;
  insert into taken (titel, plek, werkgroep, toegewezen_aan, status, gereed_gemeld_door, gereed_gemeld_op, aangemaakt_door)
  select 'TEST taak 3', p.id, w.id, kees, 'gereed', kees, now(), jan
  from plekken p, werkgroepen w where p.naam = 'Gebouw' and w.naam = 'Klussen'
  returning id into taak3;


  -- Test 1: de app (ingelogde beheerder Bea) roept zet_gebruiker_stop rechtstreeks aan
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform zet_gebruiker_stop(kees);
    execute 'reset role';
    insert into testuitslag values (1, 'App roept stoppen rechtstreeks aan', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'App roept stoppen rechtstreeks aan', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 2: de Edge Function (service_role) laat Kees stoppen
  begin
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role service_role';
    uitslag := zet_gebruiker_stop(kees);
    execute 'reset role';
    select * into g from gebruikers where id = kees;
    select count(*) into aantal from taken where toegewezen_aan = kees;
    insert into testuitslag values (2, 'Kees stopt: gestopt, vinkje uit, 2 open taken vrij, gereed blijft', 'toegestaan',
      'gestopt=' || (not g.actief) || ', mail=' || g.krijgt_gevaar_mail || ', vrij=' || jsonb_array_length(uitslag->'taken')
        || ', nog op naam=' || aantal,
      case when not g.actief and not g.krijgt_gevaar_mail and jsonb_array_length(uitslag->'taken') = 2
                and aantal = 1 and (uitslag->>'kreeg_gevaar_mail')::boolean
           then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Kees stopt: gestopt, vinkje uit, 2 open taken vrij, gereed blijft', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 3: Kees een tweede keer laten stoppen
  begin
    execute 'set local role service_role';
    perform zet_gebruiker_stop(kees);
    execute 'reset role';
    insert into testuitslag values (3, 'Twee keer stoppen', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Twee keer stoppen', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: intussen pakt Jan taak 2 op. Daarna "Ongedaan maken" voor Kees:
  -- taak 1 komt terug bij Kees, taak 2 blijft bij Jan.
  update taken set toegewezen_aan = jan where id = taak2;
  begin
    execute 'set local role service_role';
    perform zet_gebruiker_terug(kees, array[taak1, taak2], false, true);
    execute 'reset role';
    select * into g from gebruikers where id = kees;
    insert into testuitslag values (4, 'Terugzetten: taak 1 terug, taak 2 blijft bij Jan', 'toegestaan',
      'actief=' || g.actief || ', mail=' || g.krijgt_gevaar_mail
        || ', taak1=' || ((select toegewezen_aan from taken where id = taak1) = kees)
        || ', taak2 bij Jan=' || ((select toegewezen_aan from taken where id = taak2) = jan),
      case when g.actief and g.krijgt_gevaar_mail
                and (select toegewezen_aan from taken where id = taak1) = kees
                and (select toegewezen_aan from taken where id = taak2) = jan
           then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Terugzetten: taak 1 terug, taak 2 blijft bij Jan', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 5: iemand terugzetten die al meedoet
  begin
    execute 'set local role service_role';
    perform zet_gebruiker_terug(kees, null, false, false);
    execute 'reset role';
    insert into testuitslag values (5, 'Terugzetten van iemand die al meedoet', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (5, 'Terugzetten van iemand die al meedoet', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 6: de app (Bea) roept zet_gebruiker_terug rechtstreeks aan
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform zet_gebruiker_terug(kees, null, true, false);
    execute 'reset role';
    insert into testuitslag values (6, 'App roept terugzetten rechtstreeks aan', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (6, 'App roept terugzetten rechtstreeks aan', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 7: de laatste beheerder (Bea) laten stoppen
  select array_agg(id) into echte_beheerders
  from gebruikers where is_beheerder and actief and id <> bea;
  update gebruikers set is_beheerder = false where id = any(echte_beheerders);
  begin
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role service_role';
    perform zet_gebruiker_stop(bea);
    execute 'reset role';
    insert into testuitslag values (7, 'Laatste beheerder laten stoppen', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (7, 'Laatste beheerder laten stoppen', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;
  update gebruikers set is_beheerder = true where id = any(echte_beheerders);


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from taken where aangemaakt_door in (bea, jan, kees);
  alter table gebruikers disable trigger altijd_een_beheerder;
  delete from gebruikers where id in (bea, jan, kees);  -- lidmaatschappen gaan vanzelf mee
  alter table gebruikers enable trigger altijd_een_beheerder;
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
