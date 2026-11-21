-- =====================================================================
-- 15_vervallen.sql — een taak "laten vervallen" in plaats van verwijderen
-- =====================================================================
-- Wat doet dit bestand?
--   Een taak die niet meer nodig is (of per ongeluk is aangemaakt), wordt
--   niet weggegooid, maar krijgt de status "vervallen". Zo blijft zichtbaar
--   wat er gepland was en waarom het niet doorging, en gaat het later mee
--   naar het archief.
--
--   1. Status "vervallen" erbij, met wie en wanneer (vervallen_door,
--      vervallen_op). Een reden kan in de opmerking (niet verplicht).
--   2. Vaste actie taak_laten_vervallen (alleen bestuur en coördinator,
--      alleen open taken). Komt de taak uit een melding, dan wordt de
--      melding losgekoppeld en staat die weer op "Nieuw".
--   3. Vaste actie taak_vervallen_terug ("Weer openen"): mag iedereen die
--      de taak mag bewerken (werkgroep, toegewezen persoon, bestuur). Bij
--      "Ongedaan maken" koppelt hij ook de melding weer, als die nog vrij is.
--   4. Een opmerking mag nu ook bij een vervallen taak.
--   5. Echt verwijderen kan alleen nog bij open taken (de app doet dat
--      alleen bij "Ongedaan maken" direct na het aanmaken).
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 14_gevaar_mail.sql (of na 13_herstel.sql, als
--   je 14 nog niet hebt uitgevoerd). Daarna test_15_vervallen.sql.
-- =====================================================================


-- 1. De status en de kolommen
alter table taken drop constraint taken_status_check;
alter table taken add constraint taken_status_check
  check (status in ('open', 'gereed', 'vervallen'));

alter table taken
  add column vervallen_door  uuid references gebruikers(id),
  add column vervallen_op    timestamptz;

-- Een gereed gemelde taak moet op naam staan (was: "alleen een open taak
-- mag zonder persoon"; nu mag een vervallen taak ook zonder persoon)
alter table taken drop constraint gereed_alleen_als_toegewezen;
alter table taken add constraint gereed_alleen_als_toegewezen
  check (status <> 'gereed' or toegewezen_aan is not null);

-- Gereed-gegevens alleen bij "gereed" (was: open of gereed)
alter table taken drop constraint gereed_gegevens_kloppen;
alter table taken add constraint gereed_gegevens_kloppen
  check (
    (status = 'gereed' and gereed_gemeld_door is not null and gereed_gemeld_op is not null)
    or
    (status <> 'gereed' and gereed_gemeld_door is null and gereed_gemeld_op is null)
  );

-- Vervallen-gegevens alleen (en altijd) bij "vervallen"
alter table taken add constraint vervallen_gegevens_kloppen
  check (
    (status = 'vervallen' and vervallen_door is not null and vervallen_op is not null)
    or
    (status <> 'vervallen' and vervallen_door is null and vervallen_op is null)
  );

-- 4. Opmerking ook bij vervallen taken
alter table taken drop constraint opmerking_alleen_bij_gereed;
alter table taken add constraint opmerking_alleen_bij_gereed_of_vervallen
  check (status in ('gereed', 'vervallen') or (opmerking is null and opmerking_door is null));


-- 2. ✕ Laten vervallen. Geeft het nummer van de losgekoppelde melding
--    terug (of niets), zodat "Ongedaan maken" hem weer kan koppelen.
create function taak_laten_vervallen(taak_id bigint, reden text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  t        taken;
  tekst    text := nullif(trim(coalesce(reden, '')), '');
  melding  bigint;
begin
  if not is_bestuur() then
    raise exception 'Alleen bestuur en coördinator kunnen een taak laten vervallen.';
  end if;
  select * into t from taken where id = taak_id for update;
  if not found then
    raise exception 'Deze taak bestaat niet meer. Ververs het scherm.';
  end if;
  if t.status <> 'open' then
    raise exception 'Alleen een open taak kan vervallen. Zet hem eerst weer open.';
  end if;
  if length(tekst) > 500 then
    raise exception 'De reden is te lang (hooguit 500 tekens). Maak hem korter.';
  end if;

  -- Komt de taak uit een melding? Dan de melding loskoppelen (weer "Nieuw")
  update meldingen set taak = null where taak = taak_id returning id into melding;

  update taken
  set status = 'vervallen',
      vervallen_door = auth.uid(),
      vervallen_op = now(),
      opmerking = tekst,
      opmerking_door = case when tekst is null then null else auth.uid() end
  where id = taak_id;

  return melding;
end;
$$;


-- 3. ↺ Weer openen (ook voor "Ongedaan maken"). "melding_id" (niet
--    verplicht) = deze melding weer aan de taak koppelen, als die nog vrij is.
create function taak_vervallen_terug(taak_id bigint, melding_id bigint default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id for update;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag deze taak niet weer openen.';
  end if;
  if t.status <> 'vervallen' then
    raise exception 'Deze taak is niet vervallen. Ververs het scherm.';
  end if;

  update taken
  set status = 'open',
      vervallen_door = null,
      vervallen_op = null,
      opmerking = null,
      opmerking_door = null,
      -- Doet de toegewezen persoon niet meer mee? Dan weer vrij.
      toegewezen_aan = case
        when exists (select 1 from gebruikers where id = t.toegewezen_aan and actief)
        then t.toegewezen_aan else null end
  where id = taak_id;

  -- De melding weer koppelen (alleen bestuur, en alleen als die nog vrij is)
  if melding_id is not null and is_bestuur() then
    update meldingen set taak = taak_id
    where id = melding_id and taak is null and geen_actie_reden is null;
  end if;
end;
$$;

revoke execute on function taak_laten_vervallen(bigint, text) from public, anon;
revoke execute on function taak_vervallen_terug(bigint, bigint) from public, anon;
grant  execute on function taak_laten_vervallen(bigint, text) to authenticated;
grant  execute on function taak_vervallen_terug(bigint, bigint) to authenticated;


-- 4b. Opmerking zetten: nu ook bij vervallen taken (vervangt 11_opmerking.sql)
create or replace function taak_opmerking_zetten(taak_id bigint, opmerking text) returns void
language plpgsql security definer set search_path = public as $$
declare
  t      taken;
  tekst  text := nullif(trim(coalesce(opmerking, '')), '');   -- leeg wordt "niets"
begin
  select * into t from taken where id = taak_id;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag de opmerking bij deze taak niet aanpassen.';
  end if;
  if t.status not in ('gereed', 'vervallen') then
    raise exception 'Een opmerking kan alleen bij een gereed gemelde of vervallen taak.';
  end if;
  if length(tekst) > 500 then
    raise exception 'De opmerking is te lang (hooguit 500 tekens). Maak hem korter.';
  end if;
  update taken
  set opmerking = tekst,
      opmerking_door = case when tekst is null then null else auth.uid() end
  where id = taak_id;
end;
$$;


-- 5. Echt verwijderen: alleen nog open taken (bestuur)
drop policy "verwijderen: bestuur" on taken;
create policy "verwijderen: bestuur, alleen open" on taken
  for delete to authenticated using (is_bestuur() and status = 'open');
