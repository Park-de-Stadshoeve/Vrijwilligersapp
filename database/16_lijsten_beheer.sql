-- =====================================================================
-- 16_lijsten_beheer.sql — werkgroepen en plekken in het beheerscherm
-- =====================================================================
-- Wat doet dit bestand?
--   Beheerders mochten werkgroepen en plekken al toevoegen, wijzigen en
--   uitzetten (regels in 03_rechten.sql). Dit bestand voegt twee kleine
--   vaste acties toe voor het beheerscherm:
--
--   1. werkgroep_gebruik: hoeveel mensen zitten er in een werkgroep, hoeveel
--      open taken staan er, en hoeveel plekken hebben deze werkgroep als
--      standaard? Voor de waarschuwing bij "Uitzetten". (Een beheerder die
--      geen bestuurslid is, ziet zelf niet alle taken; deze actie telt ze
--      wel, maar geeft alleen aantallen terug.)
--
--   2. plek_verplaatsen: een plek één plaats omhoog of omlaag zetten in de
--      volgorde van de knoppen. Wisselt in één keer van plaats met de buur
--      (de eerstvolgende plek die aan staat), zodat de volgorde nooit half
--      verandert.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 15_vervallen.sql. Daarna test_16_lijsten_beheer.sql.
-- =====================================================================


-- 1. 📊 Hoe vaak wordt een werkgroep gebruikt? (alleen voor beheerders)
create function werkgroep_gebruik(werkgroep_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_beheerder() then
    raise exception 'Alleen beheerders kunnen dit zien.';
  end if;
  return jsonb_build_object(
    'mensen', (select count(*) from lidmaatschappen l join gebruikers g on g.id = l.gebruiker
               where l.werkgroep = werkgroep_id and g.actief),
    'open_taken', (select count(*) from taken where werkgroep = werkgroep_id and status = 'open'),
    'plekken', (select count(*) from plekken where standaard_werkgroep = werkgroep_id and actief)
  );
end;
$$;


-- 2. ▲▼ Een plek één plaats omhoog (omhoog = true) of omlaag zetten.
-- Eerst krijgen alle plekken een net volgnummer (10, 20, 30, …), dan
-- wisselt deze plek van nummer met de buur.
create function plek_verplaatsen(plek_id bigint, omhoog boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  mijn_nummer  integer;
  buur         bigint;
  buur_nummer  integer;
begin
  if not is_beheerder() then
    raise exception 'Alleen beheerders kunnen de volgorde veranderen.';
  end if;

  -- Nette nummers: in de huidige volgorde 10, 20, 30, …
  update plekken p set volgorde = n.nieuw
  from (select id, row_number() over (order by volgorde, id) * 10 as nieuw from plekken) n
  where p.id = n.id;

  select volgorde into mijn_nummer from plekken where id = plek_id;
  if mijn_nummer is null then
    raise exception 'Deze plek bestaat niet meer. Ververs het scherm.';
  end if;

  -- De buur: de plek die aan staat, direct erboven (of eronder).
  -- Uitgezette plekken zie je niet als knop, dus die slaan we over.
  if omhoog then
    select id, volgorde into buur, buur_nummer from plekken
    where volgorde < mijn_nummer and actief order by volgorde desc limit 1;
  else
    select id, volgorde into buur, buur_nummer from plekken
    where volgorde > mijn_nummer and actief order by volgorde limit 1;
  end if;
  if buur is null then
    return;   -- staat al bovenaan (of onderaan): niets te doen
  end if;

  update plekken set volgorde = buur_nummer where id = plek_id;
  update plekken set volgorde = mijn_nummer where id = buur;
end;
$$;

revoke execute on function werkgroep_gebruik(bigint) from public, anon;
revoke execute on function plek_verplaatsen(bigint, boolean) from public, anon;
grant  execute on function werkgroep_gebruik(bigint) to authenticated;
grant  execute on function plek_verplaatsen(bigint, boolean) to authenticated;
