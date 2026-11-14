# Ontwerp van de database

Dit is het ontwerp van de database in gewone taal: welke gegevens de app bewaart,
hoe ze bij elkaar horen en wie wat mag. Er staan geen echte gegevens in, alleen de
opbouw. De database wordt gemaakt in Supabase (zie CLAUDE.md), maar dit ontwerp
werkt in vrijwel elke database.

**Begrippen**
- **Tabel:** een lijst met gegevens van één soort, zoals een spreadsheet. Elke regel
  is één ding (één taak, één persoon), elke kolom is een eigenschap (titel, deadline).
- **Nummer (id):** elke regel krijgt een vast, uniek nummer. Andere tabellen verwijzen
  naar dat nummer in plaats van de naam over te typen. Wordt een naam gewijzigd, dan
  klopt alles nog.
- **Koppeltabel:** een tabel die alleen twee dingen aan elkaar koppelt, bijvoorbeeld
  "persoon 4 zit in werkgroep 2". Nodig omdat iemand in meerdere werkgroepen kan zitten.

---

## Overzicht

```
werkgroepen ──┬── plekken (standaardwerkgroep)
              ├── lidmaatschappen ── gebruikers
              └── taken ── gebruikers (toegewezen aan)
                    │
               meldingen ── gebruikers (gemeld door)
```

Zes tabellen: **werkgroepen**, **plekken**, **gebruikers**, **lidmaatschappen**,
**taken** en **meldingen**. Foto's staan apart in de foto-opslag; de tabellen bewaren
alleen waar de foto staat.

---

## 1. werkgroepen
De zeven werkgroepen. Beheerd via het beheerscherm.

| Kolom | Wat | Verplicht |
|---|---|---|
| id | nummer | ja |
| naam | bijv. "Klussen" | ja, uniek |
| actief | ja/nee. Op "nee" = verdwijnt uit de keuzes, oude taken blijven kloppen | ja (standaard ja) |

## 2. plekken
De vaste plekken op het park, voor "Waar is het?" bij melden en bij taken.

| Kolom | Wat | Verplicht |
|---|---|---|
| id | nummer | ja |
| naam | bijv. "Stal" | ja, uniek |
| standaard_werkgroep | welke werkgroep hoort er meestal bij (voor "Maak taak") | nee ("Overig" heeft er geen) |
| volgorde | in welke volgorde de knoppen staan | ja |
| actief | ja/nee, zoals bij werkgroepen | ja (standaard ja) |

## 3. gebruikers
Iedereen die inlogt. Zo min mogelijk gegevens (AVG).

| Kolom | Wat | Verplicht |
|---|---|---|
| id | hetzelfde nummer als in het inlogsysteem | ja |
| voornaam | wat de anderen in de app zien | ja |
| rol | `vrijwilliger`, `bestuur`, `coordinator` of `frion` | ja (standaard vrijwilliger) |
| krijgt_gevaar_mail | ja/nee: krijgt een e-mail bij een gevaarlijke melding | ja (standaard nee) |
| actief | ja/nee. Op "nee" = kan niet meer inloggen | ja (standaard ja) |

Het **e-mailadres** staat niet in deze tabel, maar in het inlogsysteem van Supabase.
Dat is nodig voor de inloglink en de gevaar-mail. Zo staat het op één plek.

Iedereen heeft precies één rol. Bestuur en coördinator hebben dezelfde rechten; het
vinkje `krijgt_gevaar_mail` bepaalt wie de e-mail krijgt. Dat kunnen er ook twee zijn,
of tijdelijk een vervanger.

## 4. lidmaatschappen (koppeltabel)
Wie zit in welke werkgroep. Eén regel per persoon per werkgroep.

| Kolom | Wat | Verplicht |
|---|---|---|
| gebruiker | nummer uit gebruikers | ja |
| werkgroep | nummer uit werkgroepen | ja |

Frion-begeleiders worden lid van Dieren, Klussen en Tuinen. Zo bepaalt de beheerder
welke werkgroepen zij zien, zonder dat dit vastzit in de code.

## 5. taken

| Kolom | Wat | Verplicht |
|---|---|---|
| id | nummer | ja |
| titel | korte naam van de taak | ja |
| omschrijving | uitleg | nee |
| plek | nummer uit plekken | ja |
| werkgroep | nummer uit werkgroepen | ja |
| toegewezen_aan | nummer uit gebruikers | nee |
| voor_frion | ja/nee: toegewezen aan Frion als groep | ja (standaard nee) |
| deadline | datum | nee |
| status | `open` of `gereed` | ja (standaard open) |
| foto_na_afloop | waar de foto bij het gereed melden staat | nee |
| gereed_gemeld_door | nummer uit gebruikers | alleen als status gereed is |
| gereed_gemeld_op | datum en tijd | alleen als status gereed is |
| aangemaakt_door | nummer uit gebruikers | ja |
| aangemaakt_op | datum en tijd (gaat vanzelf) | ja |

**Regels die de database bewaakt**
- Een taak is óf aan één persoon óf aan Frion toegewezen, nooit allebei.
- Alleen een toegewezen taak (persoon of Frion) kan op `gereed`.
- Terug naar `open`: de gereed-gegevens worden leeg gemaakt.

## 6. meldingen

| Kolom | Wat | Verplicht |
|---|---|---|
| id | nummer | ja |
| plek | nummer uit plekken | ja |
| foto | waar de foto van het gebrek staat | ja |
| toelichting | tekst van de melder | nee |
| gevaarlijk | ja/nee | ja (standaard nee) |
| gemeld_door | nummer uit gebruikers | ja |
| gemeld_op | datum en tijd (gaat vanzelf) | ja |
| taak | nummer uit taken, als er een taak van gemaakt is | nee |
| geen_actie_reden | waarom er niets hoeft te gebeuren (de melder ziet dit) | nee |
| geen_actie_door | nummer uit gebruikers | alleen bij geen actie |

**Regel:** een melding heeft óf een taak óf een "geen actie"-reden, nooit allebei.

**De status van een melding wordt niet opgeslagen, maar afgeleid** (net als nu in de app):

| Situatie | Status die de melder ziet |
|---|---|
| geen taak, geen reden | Nieuw |
| reden ingevuld | Geen actie nodig |
| taak, maar niemand toegewezen | Taak gemaakt |
| taak, toegewezen, nog open | Toegewezen |
| taak gereed | Gereed |

Zo kan de status nooit "vergeten" worden bij te werken.

De foto bij een taak die uit een melding komt, wordt niet gekopieerd: de taak toont
de foto van de melding.

---

## Foto's
Foto's staan in de foto-opslag van Supabase, niet in de tabellen. Ze zijn al verkleind
en zonder locatiegegevens (zie BEHEER.md).

- **Map `meldingen/`:** foto's van gebreken.
- **Map `taken/`:** foto's na afloop.
- **Bewaartermijn (voorstel):** 12 maanden, daarna automatisch verwijderd. De taak of
  melding zelf blijft bestaan, zonder foto.

---

## Wie mag wat
De database controleert dit bij elke vraag. Een knop verbergen is niet genoeg; ook wie
de app omzeilt, krijgt niets te zien wat niet mag.

"Eigen werkgroepen" = de werkgroepen waar iemand lid van is (tabel lidmaatschappen).

| Wat | Vrijwilliger | Frion-begeleider | Bestuur en coördinator |
|---|---|---|---|
| Werkgroepen en plekken zien | ja | ja | ja |
| Werkgroepen, plekken, gebruikers beheren | nee | nee | ja |
| Taken zien | eigen werkgroepen | eigen werkgroepen | alle |
| Taak aanmaken of wijzigen | nee | nee | ja |
| Taak oppakken ("Ik doe dit") of teruggeven | zichzelf, eigen werkgroepen | nee (Frion-taken staan al op Frion) | ja, aan iedereen of Frion |
| Gereed melden, heropenen, foto aanpassen | eigen werkgroepen of aan hem/haar toegewezen | eigen werkgroepen of Frion-taak | ja |
| Melding doen | ja | ja | ja |
| Meldingen zien | alleen eigen | alleen eigen | alle |
| Melding afhandelen (taak maken, geen actie) | nee | nee | ja |
| Foto bij melding zien | eigen melding, of als de taak in eigen werkgroep zit | idem | ja |
| Foto na afloop zien | taken die hij/zij mag zien | idem | ja |

---

## Open punten
Deze punten liggen (deels) bij het bestuur:
1. **Bewaartermijn foto's:** 12 maanden, of korter?
2. **Wie mag de foto bij een melding zien:** voorstel hierboven.
3. **Iemand stopt als vrijwilliger:** voorstel: op "niet actief" zetten. Hij of zij kan
   dan niet meer inloggen; de voornaam blijft zichtbaar bij oude taken. Na 12 maanden
   wordt de persoon verwijderd en staat er bij oude taken "oud-vrijwilliger".
4. **Mag een Frion-begeleider een taak oppakken voor zichzelf** (niet voor de groep)?
   Voorstel: nee, houd het simpel.
