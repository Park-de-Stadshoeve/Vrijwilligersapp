# Map database

Hier staan de SQL-bestanden die de database opbouwen. SQL is de taal waarmee je een
database opbouwt en bevraagt. Het ontwerp in gewone taal staat in `../DATABASE.md`.

## Bestanden (in deze volgorde uitvoeren)
| Bestand | Wat het doet | Status |
|---|---|---|
| `01_tabellen.sql` | Maakt de zeven tabellen met hun regels, en de overzichten "meldingen met status" en "naam die de app laat zien" | uitgevoerd in testproject |
| `02_startgegevens.sql` | Vult de werkgroepen en plekken | uitgevoerd in testproject |
| `03_rechten.sql` | Wie wat mag zien en doen: regels per tabel en vaste acties voor taken | uitgevoerd in testproject |
| `04_fotos.sql` | Afgesloten fotomap, wie welke foto mag zien en neerzetten, overzicht van foto's om op te ruimen | uitgevoerd in testproject |
| `05_toewijzen.sql` | Vaste actie "toewijzen" voor bestuur, en een betere foutmelding bij gereed melden | uitgevoerd in testproject |
| `06_meldingen.sql` | Vaste actie "Maak taak": taak maken en aan de melding koppelen in één keer | uitgevoerd in testproject |
| `07_ping.sql` | Mini-functie "ping" waarmee GitHub de database wakker houdt (zie `BEHEER.md`) | uitgevoerd in testproject |

## Testbestanden
Deze mag je zo vaak uitvoeren als je wilt. Ze ruimen hun eigen testgegevens op.
Gebruik ze na een wijziging, om te zien of alles nog werkt.

| Bestand | Wat het controleert |
|---|---|
| `test_01_regels.sql` | De regels uit `01_tabellen.sql` (12 tests). In de kolom "goed" moet overal "goed" staan. Getest: alles goed. |
| `test_03_rechten.sql` | Wie wat mag uit `03_rechten.sql` (24 tests), met vijf verzonnen gebruikers. Getest: alles goed. |
| `test_04_fotos.sql` | Wie welke foto mag zien en neerzetten (10 tests). Draait aan het eind alles terug. Getest: alles goed. |
| `test_05_toewijzen.sql` | Wie een taak mag toewijzen, en aan wie (6 tests). Getest: alles goed. |
| `test_06_meldingen.sql` | "Maak taak" en "Geen actie nodig": wie mag het, en klopt de status (8 tests). Getest: alles goed. |

## Voorbeeldgegevens (alleen testproject)
Nooit uitvoeren in het echte project. Alleen verzonnen namen.

| Bestand | Wat het doet |
|---|---|
| `voorbeeld_1_testvrijwilliger.sql` | Maakt van een e-mailadres (eerst toevoegen bij Authentication > Users) een "Testvrijwilliger" in Klussen. Het adres vul je alleen in de SQL Editor in, niet in GitHub. |
| `voorbeeld_2_taken.sql` | Zet elf verzonnen taken in de database, met deadlines vanaf vandaag. Werkt alleen als er nog geen taken zijn. |

## Controleren of de fotomap afgesloten is
Voer uit in de SQL Editor:
`select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fotos';`
Goed is: `public` = false, `file_size_limit` = 2097152 (2 MB), `allowed_mime_types` = {image/jpeg}.
In het dashboard: **Storage** > **fotos** > **Edit bucket**: "Public bucket" staat uit.

## Foto's opruimen (maandelijks)
1. Open de **SQL Editor** en voer uit: `select * from fotos_zonder_koppeling;`
2. Ga naar **Storage** > **fotos** en verwijder de foto's uit dat lijstje.
   (Met SQL verwijderen kan niet; Supabase staat dat niet toe.)

## Zo voer je een bestand uit (Supabase)
1. Log in op supabase.com en open het project.
2. Kies links **SQL Editor** en daarna **New query**.
3. Open het SQL-bestand op GitHub, kopieer de hele inhoud en plak die in het venster.
4. Klik op **Run**. Onderaan staat "Success" als het gelukt is.
5. Controleer bij **Table Editor** of de tabellen er staan.

Elk bestand voer je **één keer** uit, op een leeg project. Nog een keer uitvoeren geeft
een foutmelding ("already exists"). Dat is niet erg, maar er verandert dan niets.

## Veilig
- Na `01_tabellen.sql` staat de rijbeveiliging op elke tabel aan. Zonder de regels uit
  `03_rechten.sql` kan nog niemand via de app iets lezen of schrijven. Dat is de bedoeling.
- In deze bestanden staan nooit namen, e-mailadressen of sleutels. De repository is
  openbaar.
