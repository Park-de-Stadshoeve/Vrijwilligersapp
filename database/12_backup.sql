-- =====================================================================
-- 12_backup.sql — onthouden wanneer er een back-up is gemaakt
-- =====================================================================
-- Wat doet dit bestand?
--   Een kleine tabel back_ups. Elke keer dat een beheerder in het
--   beheerscherm op "Back-up downloaden" tikt, zet de Edge Function
--   "beheer" hier een regel in: wanneer, en door wie. Het beheerscherm
--   laat zo zien wanneer de laatste back-up is gemaakt, en waarschuwt als
--   dat langer dan 31 dagen geleden is.
--
--   De back-up zelf staat NIET in de database, maar op de SharePoint van
--   de stichting (zie BEHEER.md, "Back-up").
--
-- Wie mag wat?
--   Zien: alleen beheerders. Toevoegen: alleen de Edge Function
--   (service_role). Niemand kan via de app iets wijzigen of weghalen.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 11_opmerking.sql. Daarna test_12_backup.sql.
-- =====================================================================

create table back_ups (
  id            bigint generated always as identity primary key,
  gemaakt_op    timestamptz not null default now(),
  gemaakt_door  uuid references gebruikers(id)
);

alter table back_ups enable row level security;

create policy "zien: beheerders" on back_ups
  for select to authenticated using (is_beheerder());

-- Dubbel slot: niet ingelogd mag niets, ingelogd alleen lezen
-- (de regel hierboven bepaalt WIE mag lezen).
revoke all on back_ups from anon;
revoke insert, update, delete on back_ups from authenticated;
