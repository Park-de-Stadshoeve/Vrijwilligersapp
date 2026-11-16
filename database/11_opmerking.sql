-- =====================================================================
-- 11_opmerking.sql — opmerking bij een gereed gemelde taak
-- =====================================================================
-- Wat doet dit bestand?
--   1. Twee nieuwe kolommen in de tabel taken:
--        opmerking       korte tekst (hooguit 500 tekens), niet verplicht
--        opmerking_door  wie de opmerking schreef
--      De opmerking staat in dezelfde rij als de taak. Zo gaat hij later
--      vanzelf mee bij het archiveren van de taak.
--      Regel: alleen een gereed gemelde taak kan een opmerking hebben.
--
--   2. Een nieuwe vaste actie taak_opmerking_zetten: opmerking toevoegen,
--      wijzigen of weghalen (leeg = weghalen). Wie dat mag, is hetzelfde
--      als bij de foto: de werkgroep, de toegewezen persoon, het bestuur
--      en de coördinator.
--
--   3. "Weer openen" (taak_heropenen) maakt voortaan ook de opmerking
--      leeg, net als de foto. "Ongedaan maken" in de app zet hem terug.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 10_stoppen.sql. Daarna test_11_opmerking.sql.
-- =====================================================================


-- 1. De kolommen en de regels
alter table taken
  add column opmerking       text check (length(opmerking) <= 500),
  add column opmerking_door  uuid references gebruikers(id);

alter table taken
  add constraint opmerking_alleen_bij_gereed
    check (status = 'gereed' or (opmerking is null and opmerking_door is null));


-- 2. 💬 Opmerking zetten (leeg = weghalen)
create function taak_opmerking_zetten(taak_id bigint, opmerking text) returns void
language plpgsql security definer set search_path = public as $$
declare
  t      taken;
  tekst  text := nullif(trim(coalesce(opmerking, '')), '');   -- leeg wordt "niets"
begin
  select * into t from taken where id = taak_id;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag de opmerking bij deze taak niet aanpassen.';
  end if;
  if t.status <> 'gereed' then
    raise exception 'Een opmerking kan alleen bij een gereed gemelde taak.';
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

revoke execute on function taak_opmerking_zetten(bigint, text) from public, anon;
grant  execute on function taak_opmerking_zetten(bigint, text) to authenticated;


-- 3. ↺ "Weer openen": nu ook de opmerking leeg maken.
-- "create or replace" vervangt de versie uit 03_rechten.sql; wie de
-- functie mag gebruiken, blijft hetzelfde.
create or replace function taak_heropenen(taak_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag deze taak niet weer openen.';
  end if;
  if t.status <> 'gereed' then
    raise exception 'Deze taak staat al open.';
  end if;
  update taken
  set status = 'open',
      gereed_gemeld_door = null,
      gereed_gemeld_op = null,
      foto_na_afloop = null,
      opmerking = null,
      opmerking_door = null
  where id = taak_id;
end;
$$;
