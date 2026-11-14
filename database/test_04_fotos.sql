-- =====================================================================
-- test_04_fotos.sql — controleert de regels voor foto's (04_fotos.sql)
-- =====================================================================
-- Wat doet dit bestand?
--   Het zet een paar nep-foto's in de fotomap (alleen de naam, geen echt
--   plaatje) en kijkt wie welke foto mag zien en neerzetten.
--
--   Verzonnen gebruikers:
--     Jan     bestuur
--     Kees    Klussen  (heeft taak K gereed gemeld, met foto)
--     Fatima  Tuinen
--     Piet    Dieren   (heeft twee meldingen gedaan, met foto)
--
--   Nep-foto's:
--     Piet/melding-k.jpg   bij melding K, daar is taak K (Klussen) van gemaakt
--     Piet/melding-n.jpg   bij melding N, nog "Nieuw"
--     Kees/na-afloop.jpg   bij taak K, foto na afloop
--
-- Opruimen: anders dan de andere testbestanden draait dit bestand aan het
-- eind ALLES terug, alsof het nooit gebeurd is. (Supabase staat niet toe
-- dat je foto's met SQL verwijdert.) Je mag het zo vaak uitvoeren als je wilt.
--
-- In de kolom "goed" moet overal "goed" staan.
-- Uitvoeren na 04_fotos.sql.
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
  foto_mk text;
  foto_mn text;
  foto_na text;
  taak_k  bigint;
  n       integer;
  -- De uitkomsten worden hierin verzameld. Een variabele wordt niet
  -- teruggedraaid, dus de uitkomsten blijven bewaard.
  uitslag jsonb := '[]';
begin
  foto_mk := piet || '/test-melding-k.jpg';
  foto_mn := piet || '/test-melding-n.jpg';
  foto_na := kees || '/test-na-afloop.jpg';

  -- Alles in dit blok wordt aan het eind teruggedraaid.
  begin

    -- ===== Voorbereiding =====
    insert into gebruikers (id, voornaam, achternaam_letter, rol) values
      (jan,    'TestJan',    'B', 'bestuur'),
      (kees,   'TestKees',   'K', 'vrijwilliger'),
      (fatima, 'TestFatima', 'T', 'vrijwilliger'),
      (piet,   'TestPiet',   'D', 'vrijwilliger');

    insert into lidmaatschappen (gebruiker, werkgroep)
    select kees,   id from werkgroepen where naam = 'Klussen' union all
    select fatima, id from werkgroepen where naam = 'Tuinen'  union all
    select piet,   id from werkgroepen where naam = 'Dieren';

    -- Taak K: Klussen, gereed gemeld door Kees, met foto na afloop
    insert into taken (titel, plek, werkgroep, toegewezen_aan, status,
                       gereed_gemeld_door, gereed_gemeld_op, foto_na_afloop, aangemaakt_door)
    select 'TEST taak K', p.id, w.id, kees, 'gereed', kees, now(), foto_na, jan
    from plekken p, werkgroepen w where p.naam = 'Gebouw' and w.naam = 'Klussen'
    returning id into taak_k;

    -- Melding K (met taak K) en melding N (nieuw), allebei van Piet
    insert into meldingen (plek, foto, gemeld_door, taak)
    select id, foto_mk, piet, taak_k from plekken where naam = 'Gebouw';
    insert into meldingen (plek, foto, gemeld_door)
    select id, foto_mn, piet from plekken where naam = 'Moestuin';

    -- De nep-foto's in de fotomap
    insert into storage.objects (bucket_id, name) values
      ('fotos', foto_mk), ('fotos', foto_mn), ('fotos', foto_na);


    -- ===== Wie ziet welke foto's? =====

    -- Test 1: Piet ziet zijn eigen twee foto's, niet de foto na afloop
    perform set_config('request.jwt.claims', json_build_object('sub', piet)::text, true);
    execute 'set local role authenticated';
    select count(*) into n from storage.objects where name in (foto_mk, foto_mn, foto_na);
    execute 'reset role';
    uitslag := uitslag || jsonb_build_object('nr', 1, 'wat', 'Piet ziet foto''s',
      'verwacht', '2', 'uitkomst', n::text, 'goed', case when n = 2 then 'goed' else 'FOUT' end);

    -- Test 2: Kees ziet de foto bij melding K (via zijn taak) en zijn eigen foto
    perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
    execute 'set local role authenticated';
    select count(*) into n from storage.objects where name in (foto_mk, foto_mn, foto_na);
    execute 'reset role';
    uitslag := uitslag || jsonb_build_object('nr', 2, 'wat', 'Kees (Klussen) ziet foto''s',
      'verwacht', '2', 'uitkomst', n::text, 'goed', case when n = 2 then 'goed' else 'FOUT' end);

    -- Test 3: Fatima (Tuinen) ziet niets
    perform set_config('request.jwt.claims', json_build_object('sub', fatima)::text, true);
    execute 'set local role authenticated';
    select count(*) into n from storage.objects where name in (foto_mk, foto_mn, foto_na);
    execute 'reset role';
    uitslag := uitslag || jsonb_build_object('nr', 3, 'wat', 'Fatima (Tuinen) ziet foto''s',
      'verwacht', '0', 'uitkomst', n::text, 'goed', case when n = 0 then 'goed' else 'FOUT' end);

    -- Test 4: Jan (bestuur) ziet alles
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    select count(*) into n from storage.objects where name in (foto_mk, foto_mn, foto_na);
    execute 'reset role';
    uitslag := uitslag || jsonb_build_object('nr', 4, 'wat', 'Jan (bestuur) ziet foto''s',
      'verwacht', '3', 'uitkomst', n::text, 'goed', case when n = 3 then 'goed' else 'FOUT' end);


    -- ===== Foto's neerzetten =====

    -- Test 5: Kees zet een foto in zijn eigen map
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
      execute 'set local role authenticated';
      insert into storage.objects (bucket_id, name) values ('fotos', kees || '/test-nieuw.jpg');
      execute 'reset role';
      uitslag := uitslag || jsonb_build_object('nr', 5, 'wat', 'Foto in eigen map',
        'verwacht', 'toegestaan', 'uitkomst', 'toegestaan', 'goed', 'goed');
    exception when others then
      uitslag := uitslag || jsonb_build_object('nr', 5, 'wat', 'Foto in eigen map',
        'verwacht', 'toegestaan', 'uitkomst', 'geweigerd: ' || sqlerrm, 'goed', 'FOUT');
    end;

    -- Test 6: Kees zet een foto in de map van Piet
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
      execute 'set local role authenticated';
      insert into storage.objects (bucket_id, name) values ('fotos', piet || '/test-indringer.jpg');
      execute 'reset role';
      uitslag := uitslag || jsonb_build_object('nr', 6, 'wat', 'Foto in map van een ander',
        'verwacht', 'geweigerd', 'uitkomst', 'toegestaan', 'goed', 'FOUT');
    exception when others then
      uitslag := uitslag || jsonb_build_object('nr', 6, 'wat', 'Foto in map van een ander',
        'verwacht', 'geweigerd', 'uitkomst', 'geweigerd', 'goed', 'goed');
    end;


    -- ===== Meldingen met foto =====

    -- Test 7: Kees doet een melding met de foto van Piet
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
      execute 'set local role authenticated';
      insert into meldingen (plek, foto, gemeld_door)
      select id, foto_mn, kees from plekken where naam = 'Stal';
      execute 'reset role';
      uitslag := uitslag || jsonb_build_object('nr', 7, 'wat', 'Melding met foto van een ander',
        'verwacht', 'geweigerd', 'uitkomst', 'toegestaan', 'goed', 'FOUT');
    exception when others then
      uitslag := uitslag || jsonb_build_object('nr', 7, 'wat', 'Melding met foto van een ander',
        'verwacht', 'geweigerd', 'uitkomst', 'geweigerd', 'goed', 'goed');
    end;

    -- Test 8: Kees doet een melding met een eigen foto
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
      execute 'set local role authenticated';
      insert into meldingen (plek, foto, gemeld_door)
      select id, kees || '/test-nieuw.jpg', kees from plekken where naam = 'Stal';
      execute 'reset role';
      uitslag := uitslag || jsonb_build_object('nr', 8, 'wat', 'Melding met eigen foto',
        'verwacht', 'toegestaan', 'uitkomst', 'toegestaan', 'goed', 'goed');
    exception when others then
      uitslag := uitslag || jsonb_build_object('nr', 8, 'wat', 'Melding met eigen foto',
        'verwacht', 'toegestaan', 'uitkomst', 'geweigerd: ' || sqlerrm, 'goed', 'FOUT');
    end;


    -- ===== Niet ingelogd en opruimoverzicht =====

    -- Test 9: iemand die niet is ingelogd ziet geen foto's
    begin
      perform set_config('request.jwt.claims', '', true);
      execute 'set local role anon';
      select count(*) into n from storage.objects where name in (foto_mk, foto_mn, foto_na);
      execute 'reset role';
      uitslag := uitslag || jsonb_build_object('nr', 9, 'wat', 'Niet ingelogd ziet foto''s',
        'verwacht', '0', 'uitkomst', n::text, 'goed', case when n = 0 then 'goed' else 'FOUT' end);
    exception when others then
      uitslag := uitslag || jsonb_build_object('nr', 9, 'wat', 'Niet ingelogd ziet foto''s',
        'verwacht', '0', 'uitkomst', 'geweigerd', 'goed', 'goed');
    end;

    -- Test 10: Kees bekijkt het opruimoverzicht
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', kees)::text, true);
      execute 'set local role authenticated';
      select count(*) into n from fotos_zonder_koppeling;
      execute 'reset role';
      uitslag := uitslag || jsonb_build_object('nr', 10, 'wat', 'Vrijwilliger bekijkt opruimoverzicht',
        'verwacht', 'geweigerd', 'uitkomst', 'toegestaan', 'goed', 'FOUT');
    exception when others then
      uitslag := uitslag || jsonb_build_object('nr', 10, 'wat', 'Vrijwilliger bekijkt opruimoverzicht',
        'verwacht', 'geweigerd', 'uitkomst', 'geweigerd', 'goed', 'goed');
    end;

    -- Klaar: met deze "fout" wordt alles in dit blok teruggedraaid.
    raise exception 'TESTS_KLAAR';

  exception when others then
    if sqlerrm <> 'TESTS_KLAAR' then
      -- Er ging iets onverwachts mis; laat zien wat.
      uitslag := uitslag || jsonb_build_object('nr', 0, 'wat', 'Onverwachte fout',
        'verwacht', '-', 'uitkomst', sqlerrm, 'goed', 'FOUT');
    end if;
  end;

  -- De verzamelde uitkomsten in de tabel zetten
  insert into testuitslag
  select * from jsonb_to_recordset(uitslag)
    as x(nr integer, wat text, verwacht text, uitkomst text, goed text);
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
