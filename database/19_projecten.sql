-- =====================================================================
-- 19_projecten.sql — projecten bij taken
-- =====================================================================
-- Wat doet dit bestand?
--   Een project bundelt taken die bij elkaar horen, bijvoorbeeld
--   "Ren konijnenhok", "Nieuw varkenshok" of "Klusochtend 12 december".
--   Een project kan taken van verschillende werkgroepen hebben.
--
--   1. Tabel projecten: nummer, naam, en of het project nog loopt (actief).
--      Een afgerond project (actief = false) verdwijnt uit de keuzes in de
--      app; oude taken houden de naam.
--   2. Kolom project bij taken (niet verplicht, hooguit één project).
--   3. Regels: wie mag wat.
--
--   Wie wat ziet verandert NIET: een vrijwilliger ziet nog steeds alleen de
--   taken van zijn of haar eigen werkgroepen (03_rechten.sql). Een project
--   groepeert alleen (besluit eigenaar, november 2026).
--
-- Wie mag wat?
--   Zien (de namen):           iedereen die is ingelogd en actief is
--                              (nodig om op project te kunnen filteren).
--   Aanmaken, wijzigen:        bestuur en coördinator.
--   Verwijderen:               bestuur en coördinator, en alleen als er geen
--                              taken aan hangen (voor "Ongedaan maken" na
--                              aanmaken). Anders: afronden (actief = false).
--
-- Let op (back-up): voer dit bestand pas in het echte project (PROD) uit
-- als de back-up en het terugzetten de projecten ook meenemen.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 18_tabelrechten.sql. Daarna
--   test_19_projecten.sql.
-- =====================================================================


-- 1. De tabel
create table projecten (
  id      bigint generated always as identity primary key,
  -- naam: 1 tot 60 tekens (zonder spaties aan begin en eind)
  naam    text not null check (length(trim(naam)) between 1 and 60),
  actief  boolean not null default true   -- false = afgerond
);

-- Twee projecten met dezelfde naam mag niet, ook niet met andere
-- hoofdletters of spaties eromheen ("Varkenshok" en "varkenshok ").
create unique index projecten_naam_uniek on projecten (lower(trim(naam)));


-- 2. De kolom bij taken. "references" = moet een bestaand project zijn.
-- Een project waar nog taken aan hangen kan daardoor niet weg.
alter table taken add column project bigint references projecten(id);


-- 3. Regels. Rijbeveiliging aan: zonder regel mag niets.
alter table projecten enable row level security;

create policy "zien: actieve gebruikers" on projecten
  for select to authenticated using (is_actief());
create policy "aanmaken: bestuur" on projecten
  for insert to authenticated with check (is_bestuur());
create policy "wijzigen: bestuur" on projecten
  for update to authenticated using (is_bestuur()) with check (is_bestuur());
create policy "verwijderen: bestuur" on projecten
  for delete to authenticated using (is_bestuur());

-- Wie überhaupt bij de tabel mag (zoals in 18_tabelrechten.sql).
-- Niet ingelogd (anon): niets.
revoke all on projecten from anon;
grant select, insert, update, delete on projecten to authenticated;
grant all on projecten to service_role;
grant usage, select on sequence projecten_id_seq to authenticated;
grant all on sequence projecten_id_seq to service_role;
