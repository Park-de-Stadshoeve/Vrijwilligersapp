-- =====================================================================
-- 02_startgegevens.sql — werkgroepen en plekken om mee te beginnen
-- =====================================================================
-- Wat doet dit bestand?
--   Het vult de tabellen werkgroepen en plekken met de lijsten die nu
--   ook in de demo staan. Later pas je ze aan via het beheerscherm,
--   niet meer hier.
--
-- Wat staat er NIET in?
--   - Gebruikers: die voegt de beheerder toe (namen horen niet in deze
--     openbare code).
--   - Onderdelen: die zijn nog niet bekend. Toevoegen via het beheerscherm.
--
-- Eén keer uitvoeren, na 01_tabellen.sql.
-- =====================================================================


-- Werkgroepen
insert into werkgroepen (naam) values
  ('Dieren'),
  ('Tuinen'),
  ('Avontuurlijk spelen'),
  ('Klussen'),
  ('Educatie'),
  ('Evenementen'),
  ('Geschiedenis');


-- Plekken, met de werkgroep die er meestal bij hoort.
-- De werkgroep wordt opgezocht op naam, zodat je geen nummers hoeft te kennen.
-- "volgorde" bepaalt de volgorde van de knoppen; "Overig" staat altijd achteraan.
insert into plekken (naam, standaard_werkgroep, volgorde)
select plek.naam, werkgroepen.id, plek.volgorde
from (values
  ('Stal',          'Dieren',               10),
  ('Weides',        'Dieren',               20),
  ('Wortelhoeve',   'Dieren',               30),
  ('Hummelhoeve',   'Avontuurlijk spelen',  40),
  ('Speelkasteel',  'Avontuurlijk spelen',  50),
  ('Waterspelen',   'Avontuurlijk spelen',  60),
  ('Trekvlot',      'Avontuurlijk spelen',  70),
  ('Wilgenburcht',  'Avontuurlijk spelen',  80),
  ('Moestuin',      'Tuinen',               90),
  ('Belevenistuin', 'Tuinen',              100),
  ('Gebouw',        'Klussen',             110),
  ('Overig',        null,                  999)
) as plek(naam, werkgroep, volgorde)
left join werkgroepen on werkgroepen.naam = plek.werkgroep;
-- Tip: volgorde in stappen van 10, dan kun je later iets tussenvoegen (bijv. 15).
