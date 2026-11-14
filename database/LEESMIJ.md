# Map database

Hier staan de SQL-bestanden die de database opbouwen. SQL is de taal waarmee je een
database opbouwt en bevraagt. Het ontwerp in gewone taal staat in `../DATABASE.md`.

## Bestanden (in deze volgorde uitvoeren)
| Bestand | Wat het doet | Status |
|---|---|---|
| `01_tabellen.sql` | Maakt de zeven tabellen met hun regels, en de overzichten "meldingen met status" en "naam die de app laat zien" | uitgevoerd in testproject |
| `02_startgegevens.sql` | Vult de werkgroepen en plekken | uitgevoerd in testproject |
| `03_rechten.sql` | Wie wat mag zien en doen | volgende stap |
| `04_fotos.sql` | Foto-opslag en wie welke foto mag zien | later |

## Testbestanden
Deze mag je zo vaak uitvoeren als je wilt. Ze ruimen hun eigen testgegevens op.
Gebruik ze na een wijziging, om te zien of alles nog werkt.

| Bestand | Wat het controleert |
|---|---|
| `test_01_regels.sql` | De regels uit `01_tabellen.sql` (12 tests). In de kolom "goed" moet overal "goed" staan. |

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
