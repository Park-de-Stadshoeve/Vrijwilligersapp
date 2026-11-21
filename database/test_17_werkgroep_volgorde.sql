-- =====================================================================
-- test_17_werkgroep_volgorde.sql — controleert 17_werkgroep_volgorde.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt drie verzonnen werkgroepen en kijkt of verplaatsen goed gaat
--   en wie het mag. Alles wordt aan het eind teruggedraaid. Je mag het zo
--   vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Bea     vrijwilliger met vinkje beheerder
--     Jan     bestuur, geen beheerder
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 17_werkgroep_volgorde.sql.
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
  w1       bigint;
  w2       bigint;
  w3       bigint;
  rij      text;   -- de volgorde van de testwerkgroepen, als tekst
  uitslag  text[] := '{}';   -- uitslagen, opgeschreven na het terugdraaien
begin
  begin
    -- ===== Voorbereiding =====
    insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder) values
      (bea, 'TestBea', 'B', 'vrijwilliger', true),
      (jan, 'TestJan', 'J', 'bestuur',      false);
    insert into werkgroepen (naam, volgorde) values ('TestWG1', 900001) returning id into w1;
    insert into werkgroepen (naam, volgorde) values ('TestWG2', 900002) returning id into w2;
    insert into werkgroepen (naam, volgorde) values ('TestWG3', 900003) returning id into w3;

    -- Test 1: elke bestaande werkgroep heeft een volgorde
    select count(*)::text into rij from werkgroepen where volgorde is null;
    uitslag := uitslag || ('1|Alle werkgroepen hebben een volgorde|0 zonder|' || rij || ' zonder|' ||
      case when rij = '0' then 'goed' else 'FOUT' end);

    -- Test 2: Bea zet TestWG3 omhoog
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform werkgroep_verplaatsen(w3, true);
    execute 'reset role';
    select string_agg(naam, ', ' order by volgorde) into rij from werkgroepen where id in (w1, w2, w3);
    uitslag := uitslag || ('2|Werkgroep 3 omhoog|TestWG1, TestWG3, TestWG2|' || rij || '|' ||
      case when rij = 'TestWG1, TestWG3, TestWG2' then 'goed' else 'FOUT' end);

    -- Test 3: een uitgezette werkgroep wordt overgeslagen
    update werkgroepen set actief = false where id = w3;
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform werkgroep_verplaatsen(w2, true);   -- springt over de uitgezette TestWG3 heen
    execute 'reset role';
    select string_agg(naam, ', ' order by volgorde) into rij from werkgroepen where id in (w1, w2, w3);
    uitslag := uitslag || ('3|Uitgezette werkgroep overgeslagen|TestWG2, TestWG3, TestWG1|' || rij || '|' ||
      case when rij = 'TestWG2, TestWG3, TestWG1' then 'goed' else 'FOUT' end);

    -- Test 4: Jan (bestuur, geen beheerder) verplaatst een werkgroep
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
      execute 'set local role authenticated';
      perform werkgroep_verplaatsen(w1, true);
      execute 'reset role';
      uitslag := uitslag || '4|Bestuur (geen beheerder) verplaatst werkgroep|geweigerd|toegestaan|FOUT'::text;
    exception when others then
      execute 'reset role';
      uitslag := uitslag || ('4|Bestuur (geen beheerder) verplaatst werkgroep|geweigerd|geweigerd: ' || sqlerrm || '|goed');
    end;

    -- Test 5: een werkgroep zonder volgorde (zoals uit een oude back-up) mag
    insert into werkgroepen (naam, volgorde) values ('TestWG4', null);
    uitslag := uitslag || '5|Werkgroep zonder volgorde toevoegen|toegestaan|toegestaan|goed'::text;

    raise exception 'TERUGDRAAIEN';   -- alles hierboven weer weg
  exception when others then
    execute 'reset role';
    if sqlerrm <> 'TERUGDRAAIEN' then
      uitslag := uitslag || ('0|Test kon niet draaien|gelukt|fout: ' || sqlerrm || '|FOUT');
    end if;
  end;

  insert into testuitslag
  select split_part(u, '|', 1)::integer, split_part(u, '|', 2), split_part(u, '|', 3),
         split_part(u, '|', 4), split_part(u, '|', 5)
  from unnest(uitslag) u;
  perform set_config('request.jwt.claims', '', true);
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
