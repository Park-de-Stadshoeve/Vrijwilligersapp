-- =====================================================================
-- test_16_lijsten_beheer.sql — controleert 16_lijsten_beheer.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers, een werkgroep en drie plekken, en kijkt
--   of tellen en verplaatsen goed gaan en wie het mag. Alles wordt aan het
--   eind teruggedraaid. Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Bea     vrijwilliger met vinkje beheerder
--     Jan     bestuur, geen beheerder
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 16_lijsten_beheer.sql.
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
  wg       bigint;
  p1       bigint;
  p2       bigint;
  p3       bigint;
  gebruik  jsonb;
  rij      text;   -- de volgorde van de testplekken, als tekst
  uitslag  text[] := '{}';   -- uitslagen, opgeschreven na het terugdraaien
begin
  begin
    -- ===== Voorbereiding =====
    insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder) values
      (bea, 'TestBea', 'B', 'vrijwilliger', true),
      (jan, 'TestJan', 'J', 'bestuur',      false);
    insert into werkgroepen (naam) values ('TestWerkgroep') returning id into wg;
    insert into lidmaatschappen values (bea, wg), (jan, wg);
    insert into plekken (naam, standaard_werkgroep, volgorde) values ('TestPlek1', wg, 900001) returning id into p1;
    insert into plekken (naam, standaard_werkgroep, volgorde) values ('TestPlek2', null, 900002) returning id into p2;
    insert into plekken (naam, standaard_werkgroep, volgorde) values ('TestPlek3', null, 900003) returning id into p3;
    insert into taken (titel, plek, werkgroep, aangemaakt_door) values ('TEST open taak', p1, wg, jan);

    -- Test 1: Bea (beheerder) telt het gebruik van de werkgroep
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    gebruik := werkgroep_gebruik(wg);
    execute 'reset role';
    uitslag := uitslag || ('1|Beheerder telt gebruik werkgroep|2 mensen, 1 taak, 1 plek|' ||
      (gebruik->>'mensen') || ' mensen, ' || (gebruik->>'open_taken') || ' taak, ' || (gebruik->>'plekken') || ' plek|' ||
      case when gebruik = '{"mensen": 2, "open_taken": 1, "plekken": 1}'::jsonb then 'goed' else 'FOUT' end);

    -- Test 2: Bea zet TestPlek3 één plaats omhoog (boven TestPlek2)
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform plek_verplaatsen(p3, true);
    execute 'reset role';
    select string_agg(naam, ', ' order by volgorde) into rij from plekken where id in (p1, p2, p3);
    uitslag := uitslag || ('2|Plek 3 omhoog|TestPlek1, TestPlek3, TestPlek2|' || rij || '|' ||
      case when rij = 'TestPlek1, TestPlek3, TestPlek2' then 'goed' else 'FOUT' end);

    -- Test 3: Bea zet TestPlek3 weer één plaats omlaag
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform plek_verplaatsen(p3, false);   -- TestPlek3 weer omlaag
    execute 'reset role';
    select string_agg(naam, ', ' order by volgorde) into rij from plekken where id in (p1, p2, p3);
    uitslag := uitslag || ('3|Plek 3 weer omlaag|TestPlek1, TestPlek2, TestPlek3|' || rij || '|' ||
      case when rij = 'TestPlek1, TestPlek2, TestPlek3' then 'goed' else 'FOUT' end);

    -- Test 4: de onderste plek nog verder omlaag: er gebeurt niets
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    perform plek_verplaatsen(p3, false);
    execute 'reset role';
    select string_agg(naam, ', ' order by volgorde) into rij from plekken where id in (p1, p2, p3);
    uitslag := uitslag || ('4|Onderste plek omlaag: niets|TestPlek1, TestPlek2, TestPlek3|' || rij || '|' ||
      case when rij = 'TestPlek1, TestPlek2, TestPlek3' then 'goed' else 'FOUT' end);

    -- Test 5: Jan (bestuur, geen beheerder) telt het gebruik
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
      execute 'set local role authenticated';
      gebruik := werkgroep_gebruik(wg);
      execute 'reset role';
      uitslag := uitslag || '5|Bestuur (geen beheerder) telt gebruik|geweigerd|toegestaan|FOUT'::text;
    exception when others then
      execute 'reset role';
      uitslag := uitslag || ('5|Bestuur (geen beheerder) telt gebruik|geweigerd|geweigerd: ' || sqlerrm || '|goed');
    end;

    -- Test 6: Jan verplaatst een plek
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
      execute 'set local role authenticated';
      perform plek_verplaatsen(p2, true);
      execute 'reset role';
      uitslag := uitslag || '6|Bestuur (geen beheerder) verplaatst plek|geweigerd|toegestaan|FOUT'::text;
    exception when others then
      execute 'reset role';
      uitslag := uitslag || ('6|Bestuur (geen beheerder) verplaatst plek|geweigerd|geweigerd: ' || sqlerrm || '|goed');
    end;

    raise exception 'TERUGDRAAIEN';   -- alles hierboven weer weg
  exception when others then
    execute 'reset role';
    if sqlerrm <> 'TERUGDRAAIEN' then
      uitslag := uitslag || ('0|Test kon niet draaien|gelukt|fout: ' || sqlerrm || '|FOUT');
    end if;
  end;

  -- Pas nu opschrijven (na het terugdraaien)
  insert into testuitslag
  select split_part(u, '|', 1)::integer, split_part(u, '|', 2), split_part(u, '|', 3),
         split_part(u, '|', 4), split_part(u, '|', 5)
  from unnest(uitslag) u;
  perform set_config('request.jwt.claims', '', true);
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
