-- =====================================================================
-- 17_werkgroep_volgorde.sql — volgorde van de werkgroepen
-- =====================================================================
-- Wat doet dit bestand?
--   1. Een kolom volgorde bij werkgroepen. De app zet de werkgroepen
--      overal in deze volgorde (scherm Werkgroep, taakformulier,
--      beheerscherm). Eerst krijgen ze de volgorde van hun nummer
--      (10, 20, 30, …), dus er verandert niets aan wat je nu ziet.
--      De kolom mag leeg zijn: dan kun je ook een back-up van vóór dit
--      bestand terugzetten. Lege volgorde = achteraan.
--
--   2. Vaste actie werkgroep_verplaatsen: een werkgroep één plaats omhoog
--      of omlaag (alleen beheerders), net als plek_verplaatsen in
--      16_lijsten_beheer.sql.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 16_lijsten_beheer.sql. Daarna
--   test_17_werkgroep_volgorde.sql.
-- =====================================================================


-- 1. De kolom, met als begin de volgorde van de nummers
alter table werkgroepen add column volgorde integer default 0;

update werkgroepen w set volgorde = n.nieuw
from (select id, row_number() over (order by id) * 10 as nieuw from werkgroepen) n
where w.id = n.id;


-- 2. ▲▼ Een werkgroep één plaats omhoog (omhoog = true) of omlaag zetten.
-- Eerst krijgen alle werkgroepen een net volgnummer (10, 20, 30, …), dan
-- wisselt deze werkgroep van nummer met de buur (die aan staat).
create function werkgroep_verplaatsen(werkgroep_id bigint, omhoog boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  mijn_nummer  integer;
  buur         bigint;
  buur_nummer  integer;
begin
  if not is_beheerder() then
    raise exception 'Alleen beheerders kunnen de volgorde veranderen.';
  end if;

  update werkgroepen w set volgorde = n.nieuw
  from (select id, row_number() over (order by volgorde nulls last, id) * 10 as nieuw from werkgroepen) n
  where w.id = n.id;

  select volgorde into mijn_nummer from werkgroepen where id = werkgroep_id;
  if mijn_nummer is null then
    raise exception 'Deze werkgroep bestaat niet meer. Ververs het scherm.';
  end if;

  if omhoog then
    select id, volgorde into buur, buur_nummer from werkgroepen
    where volgorde < mijn_nummer and actief order by volgorde desc limit 1;
  else
    select id, volgorde into buur, buur_nummer from werkgroepen
    where volgorde > mijn_nummer and actief order by volgorde limit 1;
  end if;
  if buur is null then
    return;   -- staat al bovenaan (of onderaan): niets te doen
  end if;

  update werkgroepen set volgorde = buur_nummer where id = werkgroep_id;
  update werkgroepen set volgorde = mijn_nummer where id = buur;
end;
$$;

revoke execute on function werkgroep_verplaatsen(bigint, boolean) from public, anon;
grant  execute on function werkgroep_verplaatsen(bigint, boolean) to authenticated;
