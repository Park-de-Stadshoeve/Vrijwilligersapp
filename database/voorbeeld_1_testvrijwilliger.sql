-- =====================================================================
-- voorbeeld_1_testvrijwilliger.sql — een testvrijwilliger in Klussen
-- =====================================================================
-- ALLEEN VOOR HET TESTPROJECT. Nooit uitvoeren in het echte project.
--
-- Wat doet dit bestand?
--   Het maakt van een e-mailadres een gewone vrijwilliger in de
--   werkgroep Klussen, met de verzonnen naam "Testvrijwilliger".
--   Zo kun je testen wat een vrijwilliger ziet (alleen Klussen) en wat
--   het bestuur ziet (alles).
--
-- Hoe gebruik je het?
--   1. Supabase > Authentication > Users > "Add user" > "Create new user".
--      Vul een tweede e-mailadres van jezelf in. Vink "Auto Confirm User"
--      aan. Een wachtwoord is niet nodig (de app gebruikt een code).
--   2. Open dit bestand in de SQL Editor en vervang hieronder
--      VUL-HIER-HET-E-MAILADRES-IN door dat e-mailadres.
--      Doe dat ALLEEN in de SQL Editor, niet in GitHub: het adres hoort
--      niet in de openbare code.
--   3. Klik op Run. Onderaan staat "Success" als het gelukt is.
--
-- "do $$ ... $$" is een klein programmaatje in de database. Daarin kun je
-- iets onthouden (hier: het adres en het nummer van de nieuwe gebruiker).
-- =====================================================================

do $$
declare
  adres text := 'VUL-HIER-HET-E-MAILADRES-IN';
  nieuw uuid;   -- het nummer van de gebruiker in het inlogsysteem
begin
  -- Zoek het nummer op bij het inlogsysteem (Authentication > Users)
  select id into nieuw from auth.users where email = lower(trim(adres));
  if nieuw is null then
    raise exception 'Dit e-mailadres staat niet bij Authentication > Users. Voeg het daar eerst toe (stap 1).';
  end if;

  -- De gebruiker zelf: verzonnen naam, rol vrijwilliger
  insert into gebruikers (id, voornaam, achternaam_letter, rol)
  values (nieuw, 'Testvrijwilliger', 'T', 'vrijwilliger');

  -- Lid van de werkgroep Klussen
  insert into lidmaatschappen (gebruiker, werkgroep)
  select nieuw, id from werkgroepen where naam = 'Klussen';
end $$;

-- Controle: dit moet één regel geven met "Testvrijwilliger" en "Klussen".
select g.voornaam, g.rol, w.naam as werkgroep
from gebruikers g
join lidmaatschappen l on l.gebruiker = g.id
join werkgroepen w on w.id = l.werkgroep
where g.voornaam = 'Testvrijwilliger';
