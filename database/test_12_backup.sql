-- =====================================================================
-- test_12_backup.sql — controleert 12_backup.sql
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt verzonnen gebruikers en een verzonnen back-up-regel, en
--   kijkt wie die mag zien of wijzigen. Daarna ruimt het alles op.
--   Je mag het zo vaak uitvoeren als je wilt.
--
--   De verzonnen gebruikers:
--     Bea     vrijwilliger met vinkje beheerder
--     Jan     bestuur, geen beheerder
--
-- Hoe lees je de uitkomst?
--   In de kolom "goed" moet overal "goed" staan.
--
-- Uitvoeren na 12_backup.sql.
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
  bea     uuid := gen_random_uuid();
  jan     uuid := gen_random_uuid();
  regel   bigint;
  aantal  integer;
begin
  -- ===== Voorbereiding (als beheerder van de database) =====
  insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder) values
    (bea, 'TestBea', 'B', 'vrijwilliger', true),
    (jan, 'TestJan', 'J', 'bestuur',      false);
  insert into back_ups (gemaakt_door) values (bea) returning id into regel;


  -- Test 1: Bea (beheerder) ziet de back-up-regel
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    select count(*) into aantal from back_ups where id = regel;
    execute 'reset role';
    insert into testuitslag values (1, 'Beheerder ziet de back-ups', 'toegestaan',
      aantal || ' regel(s)', case when aantal = 1 then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (1, 'Beheerder ziet de back-ups', 'toegestaan', 'geweigerd: ' || sqlerrm, 'FOUT');
  end;

  -- Test 2: Jan (bestuur, geen beheerder) ziet niets
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', jan)::text, true);
    execute 'set local role authenticated';
    select count(*) into aantal from back_ups;
    execute 'reset role';
    insert into testuitslag values (2, 'Bestuur (geen beheerder) ziet de back-ups', 'niets te zien',
      aantal || ' regel(s)', case when aantal = 0 then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (2, 'Bestuur (geen beheerder) ziet de back-ups', 'niets te zien', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 3: Bea (beheerder) zet zelf een regel erbij via de app
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    insert into back_ups (gemaakt_door) values (bea);
    execute 'reset role';
    insert into testuitslag values (3, 'Beheerder voegt zelf een regel toe', 'geweigerd', 'toegestaan', 'FOUT');
  exception when others then
    execute 'reset role';
    insert into testuitslag values (3, 'Beheerder voegt zelf een regel toe', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;

  -- Test 4: Bea (beheerder) haalt een regel weg via de app
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bea)::text, true);
    execute 'set local role authenticated';
    delete from back_ups where id = regel;
    execute 'reset role';
    select count(*) into aantal from back_ups where id = regel;
    insert into testuitslag values (4, 'Beheerder haalt een regel weg', 'geweigerd',
      case when aantal = 1 then 'niets weggehaald' else 'weggehaald' end,
      case when aantal = 1 then 'goed' else 'FOUT' end);
  exception when others then
    execute 'reset role';
    insert into testuitslag values (4, 'Beheerder haalt een regel weg', 'geweigerd', 'geweigerd: ' || sqlerrm, 'goed');
  end;


  -- ===== Opruimen (als beheerder van de database) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from back_ups   where gemaakt_door in (bea, jan);
  delete from gebruikers where id in (bea, jan);
end $$;

select nr, wat, verwacht, uitkomst, goed
from testuitslag
order by nr;
