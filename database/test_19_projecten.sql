-- =====================================================================
-- test_19_projecten.sql — controleert 19_projecten.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt twee verzonnen gebruikers, een paar projecten en een taak, en
--   kijkt wie wat mag. Alles wordt aan het eind teruggedraaid. Je mag het
--   zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Vera    vrijwilliger
--     Jan     bestuur
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan (9 tests).
--
-- Uitvoeren na 19_projecten.sql (in het testproject; er moet minstens één
-- werkgroep en één plek zijn).
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
  vera     uuid := gen_random_uuid();
  jan      uuid := gen_random_uuid();
  p1       bigint;
  p2       bigint;
  taak     bigint;
  aantal   integer;
  uitslag  text[] := '{}';   -- uitslagen, opgeschreven na het terugdraaien
begin
  begin
    -- ===== Voorbereiding =====
    insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder) values
      (vera, 'TestVera', 'V', 'vrijwilliger', false),
      (jan,  'TestJan',  'J', 'bestuur',      false);
    insert into projecten (naam) values ('TestProject Varkenshok') returning id into p1;
    insert into taken (titel, plek, werkgroep, aangemaakt_door)
      values ('TestTaak', (select min(id) from plekken), (select min(id) from werkgroepen), jan)
      returning id into taak;

    -- Test 1: Vera (vrijwilliger) ziet de projecten
    perform set_config('request.jwt.claims', json_build_object('sub', vera)::text, true);
    execute 'set local role authenticated';
    select count(*) into aantal from projecten where id = p1;
    execute 'reset role';
    uitslag := uitslag || ('1|Vrijwilliger ziet projecten|1|' || aantal || '|' ||
      case when aantal = 1 then 'goed' else 'FOUT' end);

    -- Test 2: Vera maakt een project aan
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', vera)::text, true);
      execute 'set local role authenticated';
      insert into projecten (naam) values ('TestProject van Vera');
      execute 'reset role';
      uitslag := uitslag || '2|Vrijwilliger maakt project|geweigerd|toegestaan|FOUT'::text;
    exception when others then
      execute 'reset role';
      uitslag := uitslag || ('2|Vrijwilliger maakt project|geweigerd|geweigerd: ' || sqlerrm || '|goed');
    end;

    -- Test 3: Jan (bestuur) maakt een project aan
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    insert into projecten (naam) values ('TestProject Klusochtend') returning id into p2;
    execute 'reset role';
    uitslag := uitslag || ('3|Bestuur maakt project|toegestaan|' ||
      case when p2 is not null then 'toegestaan' else 'niets' end || '|' ||
      case when p2 is not null then 'goed' else 'FOUT' end);

    -- Test 4: dezelfde naam met andere hoofdletters en een spatie
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
      execute 'set local role authenticated';
      insert into projecten (naam) values ('testproject varkenshok ');
      execute 'reset role';
      uitslag := uitslag || '4|Dubbele naam|geweigerd|toegestaan|FOUT'::text;
    exception when others then
      execute 'reset role';
      uitslag := uitslag || ('4|Dubbele naam|geweigerd|geweigerd: ' || sqlerrm || '|goed');
    end;

    -- Test 5: lege naam (alleen spaties)
    begin
      insert into projecten (naam) values ('   ');
      uitslag := uitslag || '5|Lege naam|geweigerd|toegestaan|FOUT'::text;
    exception when others then
      uitslag := uitslag || ('5|Lege naam|geweigerd|geweigerd: ' || sqlerrm || '|goed');
    end;

    -- Test 6: Jan koppelt de taak aan een project
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    update taken set project = p1 where id = taak;
    execute 'reset role';
    select count(*) into aantal from taken where id = taak and project = p1;
    uitslag := uitslag || ('6|Bestuur koppelt taak aan project|1|' || aantal || '|' ||
      case when aantal = 1 then 'goed' else 'FOUT' end);

    -- Test 7: een project met een taak kan niet weg
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
      execute 'set local role authenticated';
      delete from projecten where id = p1;
      execute 'reset role';
      uitslag := uitslag || '7|Project met taak verwijderen|geweigerd|toegestaan|FOUT'::text;
    exception when others then
      execute 'reset role';
      uitslag := uitslag || ('7|Project met taak verwijderen|geweigerd|geweigerd: ' || sqlerrm || '|goed');
    end;

    -- Test 8: Jan verwijdert een project zonder taken (Ongedaan maken)
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    delete from projecten where id = p2;
    execute 'reset role';
    select count(*) into aantal from projecten where id = p2;
    uitslag := uitslag || ('8|Bestuur verwijdert leeg project|0 over|' || aantal || ' over|' ||
      case when aantal = 0 then 'goed' else 'FOUT' end);

    -- Test 9: Vera rondt een project af (wijzigen)
    perform set_config('request.jwt.claims', json_build_object('sub', vera)::text, true);
    execute 'set local role authenticated';
    update projecten set actief = false where id = p1;   -- de regel laat dit stil niets doen
    execute 'reset role';
    select count(*) into aantal from projecten where id = p1 and actief;
    uitslag := uitslag || ('9|Vrijwilliger rondt project af|blijft actief|' ||
      case when aantal = 1 then 'blijft actief' else 'afgerond' end || '|' ||
      case when aantal = 1 then 'goed' else 'FOUT' end);

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
