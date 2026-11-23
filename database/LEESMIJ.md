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
| `08_beheer.sql` | Vaste actie "gebruiker wijzigen" voor het beheerscherm, en een bewaker: er blijft altijd minstens één beheerder | uitgevoerd in testproject |
| `09_email.sql` | Beheerders kunnen het e-mailadres van een gebruiker zien (in het formulier "Wijzigen") | uitgevoerd in testproject |
| `10_stoppen.sql` | Database-deel van "Laten stoppen" en "Weer laten meedoen" (alleen voor de Edge Function) | uitgevoerd in testproject |
| `11_opmerking.sql` | Opmerking bij een gereed gemelde taak: twee kolommen, vaste actie "opmerking zetten", en Weer openen maakt hem leeg | uitgevoerd in testproject |
| `12_backup.sql` | Tabel back_ups: wanneer en door wie een back-up is gemaakt (alleen beheerders zien hem) | uitgevoerd in testproject |
| `13_herstel.sql` | Back-up terugzetten in een lege database (alleen voor de Edge Function) | uitgevoerd in testproject |
| `14_gevaar_mail.sql` | Seintje naar de Edge Function gevaar-mail bij een gevaarlijke melding; tabel app_instellingen (zet eerst pg_net aan, vul daarna het adres in) | uitgevoerd in testproject |
| `15_vervallen.sql` | Status "vervallen" voor taken: laten vervallen (bestuur) en weer openen; verwijderen alleen nog bij open taken | uitgevoerd in testproject |
| `16_lijsten_beheer.sql` | Voor het beheerscherm: tellen wat er aan een werkgroep hangt, en de volgorde van plekken veranderen | uitgevoerd in testproject |
| `17_werkgroep_volgorde.sql` | Volgorde van de werkgroepen (kolom volgorde en vaste actie werkgroep_verplaatsen) | uitgevoerd in testproject |

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
| `test_08_beheer.sql` | Wie gebruikers mag wijzigen, en of er altijd een beheerder overblijft (9 tests). Zet de echte beheerders heel even uit en daarna terug. Getest: alles goed. |
| `test_09_email.sql` | Wie e-mailadressen mag zien (4 tests). Gebruikt een verzonnen adres op `voorbeeld.invalid`; daar gaat nooit mail heen. Getest: alles goed. |
| `test_10_stoppen.sql` | Laten stoppen en weer laten meedoen: taken, vinkjes, wie het mag (7 tests). Zet de echte beheerders heel even uit en daarna terug. Getest: alles goed. |
| `test_11_opmerking.sql` | Wie een opmerking mag zetten, lengte, weghalen en Weer openen (8 tests). Getest: alles goed. |
| `test_12_backup.sql` | Wie de back-up-regels mag zien en wijzigen (4 tests). Getest: alles goed. |
| `test_13_herstel.sql` | Dat terugzetten NIET kan als er al gegevens zijn, en niet vanuit de app (5 tests). Verandert niets. Getest: alles goed. |
| `test_14_gevaar_mail.sql` | Adres ingevuld, seintje alleen bij gevaar, app kan de instellingen niet lezen (5 tests). Draait alles terug: er gaat geen echte mail. |
| `test_15_vervallen.sql` | Laten vervallen en weer openen: wie mag het, melding weer Nieuw, gereed taak blijft, gestopte persoon (10 tests). Getest: alles goed. |
| `test_16_lijsten_beheer.sql` | Tellen en verplaatsen, en wie het mag (6 tests). Draait alles terug. Getest: alles goed. |
| `test_17_werkgroep_volgorde.sql` | Werkgroepen verplaatsen, uitgezette overslaan, wie het mag (5 tests). Draait alles terug. Getest: alles goed. |

Let op: na `08_beheer.sql` heeft het project minstens één echte beheerder nodig om de
tests uit te voeren. Anders houdt de bewaker het opruimen van de testgebruikers tegen.

## Voorbeeldgegevens (alleen testproject)
Nooit uitvoeren in het echte project. Alleen verzonnen namen.

| Bestand | Wat het doet |
|---|---|
| `voorbeeld_1_testvrijwilliger.sql` | Maakt van een e-mailadres (eerst toevoegen bij Authentication > Users) een "Testvrijwilliger" in Klussen. Het adres vul je alleen in de SQL Editor in, niet in GitHub. |
| `voorbeeld_2_taken.sql` | Zet elf verzonnen taken in de database, met deadlines vanaf vandaag. Werkt alleen als er nog geen taken zijn. |

## Alleen voor de hersteltest (testproject)
| Bestand | Wat het doet |
|---|---|
| `herstel_leegmaken.sql` | Maakt het TESTPROJECT leeg (taken, meldingen, gebruikers, inlogaccounts), om terugzetten te oefenen. Heeft een veiligheidsslot. Nooit in het echte project. Zie `BEHEER.md`, "Back-up terugzetten". |

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
