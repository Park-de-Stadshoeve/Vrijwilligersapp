-- =====================================================================
-- herstel_leegmaken.sql — het TESTPROJECT leegmaken (voor de hersteltest)
-- =====================================================================
--
--   !!!  ALLEEN VOOR HET TESTPROJECT "vrijwilligersapp-test"  !!!
--   !!!  NOOIT UITVOEREN IN HET ECHTE PROJECT                 !!!
--
-- Wat doet dit bestand?
--   Het haalt alle taken, projecten, meldingen, gebruikers, inlogaccounts
--   en back-up-regels weg. Werkgroepen en plekken blijven staan. Daarna kun
--   je testen of "Back-up terugzetten" alles weer terugzet.
--   Dit kun je NIET ongedaan maken. Maak eerst een verse back-up!
--
--   De foto's haal je met de hand weg: Supabase > Storage > fotos >
--   alles selecteren > Delete. (Met SQL mag dat niet.)
--
-- Hoe gebruik je het?
--   1. Controleer linksboven in Supabase dat je in het TESTPROJECT zit.
--   2. Haal de regel met "VEILIGHEIDSSLOT" hieronder weg. Zonder dat stopt
--      het bestand meteen met een foutmelding en gebeurt er niets.
--   3. Klik op Run.
-- =====================================================================

select 'Haal deze regel weg om het testproject leeg te maken' :: integer;   -- VEILIGHEIDSSLOT

do $$
begin
  update meldingen set taak = null;
  delete from meldingen;
  delete from taken;
  delete from projecten;   -- sinds 19_projecten.sql
  delete from back_ups;
  delete from lidmaatschappen;
  -- De bewaker "altijd een beheerder" heel even uit, anders mag de laatste
  -- beheerder niet weg
  alter table gebruikers disable trigger altijd_een_beheerder;
  delete from gebruikers;
  alter table gebruikers enable trigger altijd_een_beheerder;
  delete from auth.users;   -- alle inlogaccounts
end $$;

select 'Het testproject is leeg (behalve werkgroepen, plekken en foto''s).' as klaar;
