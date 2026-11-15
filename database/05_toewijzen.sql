-- =====================================================================
-- 05_toewijzen.sql — bestuur wijst een taak toe aan iemand
-- =====================================================================
-- Wat doet dit bestand?
--   1. Een nieuwe vaste actie taak_toewijzen: bestuur of coördinator
--      zet een open taak op naam van iemand (of van niemand).
--      De database controleert zelf:
--        - ben je bestuur of coördinator (en actief)?
--        - staat de taak nog open?
--        - is de gekozen persoon nog actief?
--      Een taak die een vrijwilliger zelf heeft opgepakt, mag bestuur
--      wel omzetten (bijvoorbeeld als iemand ziek is).
--   2. Een betere foutmelding bij "Gereed melden" van een taak die aan
--      niemand (meer) is toegewezen. De oude tekst zei 'Kies eerst
--      "Ik doe dit"', maar bestuur heeft die knop niet.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 04_fotos.sql. Daarna test_05_toewijzen.sql.
--
-- "create or replace" = maak de functie, of vervang hem als hij al
-- bestaat. Wie de functie mag gebruiken, blijft dan hetzelfde.
-- =====================================================================


-- 👤 Toewijzen. "persoon" leeg (null) = aan niemand.
create function taak_toewijzen(taak_id bigint, persoon uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  if not is_bestuur() then
    raise exception 'Alleen bestuur en coördinator kunnen taken toewijzen.';
  end if;
  select * into t from taken where id = taak_id;
  if not found then
    raise exception 'Deze taak bestaat niet meer. Ververs het scherm.';
  end if;
  if t.status <> 'open' then
    raise exception 'Deze taak is al gereed gemeld. Zet hem eerst weer open.';
  end if;
  if persoon is not null
     and not exists (select 1 from gebruikers where id = persoon and actief) then
    raise exception 'Deze persoon doet niet (meer) mee. Kies iemand anders.';
  end if;
  update taken set toegewezen_aan = persoon where id = taak_id;
end;
$$;

-- Alleen ingelogde gebruikers mogen de functie aanroepen (de functie
-- controleert daarna zelf of je bestuur bent).
revoke execute on function taak_toewijzen(bigint, uuid) from public, anon;
grant  execute on function taak_toewijzen(bigint, uuid) to authenticated;


-- ✓ "Gereed melden": hetzelfde als in 03_rechten.sql, alleen met een
-- foutmelding die voor iedereen klopt.
create or replace function taak_gereed_melden(taak_id bigint, foto text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag deze taak niet gereed melden.';
  end if;
  if t.toegewezen_aan is null then
    raise exception 'Deze taak is niet (meer) aan iemand toegewezen. Misschien heeft iemand hem net teruggegeven.';
  end if;
  if t.status <> 'open' then
    raise exception 'Deze taak is al gereed gemeld.';
  end if;
  update taken
  set status = 'gereed',
      gereed_gemeld_door = auth.uid(),
      gereed_gemeld_op = now(),
      foto_na_afloop = foto
  where id = taak_id;
end;
$$;
