-- =====================================================================
-- 06_meldingen.sql — een taak maken van een melding ("Maak taak")
-- =====================================================================
-- Wat doet dit bestand?
--   Een nieuwe vaste actie taak_uit_melding. Die doet twee dingen in één
--   keer: een taak maken én die aan de melding koppelen. Lukt het tweede
--   niet, dan wordt het eerste ook teruggedraaid. Zo krijg je nooit een
--   taak zonder melding, of een melding die op "Nieuw" blijft staan
--   terwijl er al een taak van is.
--
--   De database controleert zelf:
--     - ben je bestuur of coördinator (en actief)?
--     - is de melding nog "Nieuw"? (Belangrijk als twee bestuursleden
--       tegelijk dezelfde melding afhandelen.)
--     - is de gekozen persoon (als die er is) nog actief?
--   Titel, plek en werkgroep controleert de tabel taken zelf al.
--
--   "Ongedaan maken" in de app verwijdert de taak weer. De melding staat
--   dan vanzelf weer op "Nieuw" (zie "on delete set null" in
--   01_tabellen.sql).
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 05_toewijzen.sql. Daarna test_06_meldingen.sql.
-- =====================================================================


-- 📋 Maak taak. Geeft het nummer van de nieuwe taak terug.
create function taak_uit_melding(
  melding_id    bigint,
  titel         text,
  omschrijving  text,
  plek          bigint,
  werkgroep     bigint,
  persoon       uuid,     -- leeg (null) = nog niemand
  deadline      date
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  m          meldingen;
  nieuwe_id  bigint;
begin
  if not is_bestuur() then
    raise exception 'Alleen bestuur en coördinator kunnen een taak maken van een melding.';
  end if;

  -- "for update" = houd deze melding even vast, zodat niemand anders hem
  -- tegelijk kan afhandelen
  select * into m from meldingen where id = melding_id for update;
  if not found then
    raise exception 'Deze melding bestaat niet meer. Misschien is hij ingetrokken. Ververs het scherm.';
  end if;
  if m.taak is not null or m.geen_actie_reden is not null then
    raise exception 'Deze melding is al afgehandeld. Ververs het scherm.';
  end if;
  if persoon is not null
     and not exists (select 1 from gebruikers where id = persoon and actief) then
    raise exception 'Deze persoon doet niet (meer) mee. Kies iemand anders.';
  end if;

  insert into taken (titel, omschrijving, plek, werkgroep, toegewezen_aan, deadline, aangemaakt_door)
  values (titel, omschrijving, plek, werkgroep, persoon, deadline, auth.uid())
  returning id into nieuwe_id;

  update meldingen set taak = nieuwe_id where id = melding_id;
  return nieuwe_id;
end;
$$;

-- Alleen ingelogde gebruikers mogen de functie aanroepen (de functie
-- controleert daarna zelf of je bestuur bent).
revoke execute on function taak_uit_melding(bigint, text, text, bigint, bigint, uuid, date) from public, anon;
grant  execute on function taak_uit_melding(bigint, text, text, bigint, bigint, uuid, date) to authenticated;
