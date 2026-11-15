-- =====================================================================
-- 07_ping.sql — "ben je er nog?" voor de database
-- =====================================================================
-- Wat doet dit bestand?
--   Een gratis Supabase-project gaat op pauze als er een week lang
--   niets gebeurt. Dan werkt de app niet meer tot iemand het project
--   in het dashboard weer aanzet.
--
--   Daarom roept GitHub elke 3 dagen deze mini-functie aan (zie
--   .github/workflows/supabase-wakker-houden.yml). Dat telt als
--   activiteit, zodat het project wakker blijft.
--
-- Is dit veilig?
--   Ja. De functie geeft alleen het woord 'ok' terug. Hij leest geen
--   tabel, verandert niets en laat niemands gegevens zien. Daarom mag
--   hij ook zonder inloggen worden aangeroepen (rol "anon").
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 06_meldingen.sql. Controleren kan met:
--     select ping();
--   Goed is: ok
-- =====================================================================


-- 🏓 Geeft altijd 'ok' terug.
create function ping()
returns text
language sql
stable
set search_path = public
as $$
  select 'ok'::text;
$$;

-- Iedereen mag hem aanroepen, ook zonder inloggen.
grant execute on function ping() to anon, authenticated;
