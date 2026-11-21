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
werkgroepen ──┬── plekken (standaardwerkgroep) ── onderdelen
              ├── lidmaatschappen ── gebruikers
              └── taken ── gebruikers (toegewezen aan)
                    │
               meldingen ── gebruikers (gemeld door)
```

Zeven tabellen: **werkgroepen**, **plekken**, **onderdelen**, **gebruikers**,
**lidmaatschappen**, **taken** en **meldingen**. Foto's staan apart in de foto-opslag; de tabellen bewaren
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

## 3. onderdelen
De tweede laag onder een plek. Bijvoorbeeld: plek Hummelhoeve, onderdelen
Nestschommel en Glijbaan. Een plek mag ook geen onderdelen hebben.

| Kolom | Wat | Verplicht |
|---|---|---|
| id | nummer | ja |
| plek | nummer uit plekken | ja |
| naam | bijv. "Nestschommel" | ja, uniek binnen de plek |
| volgorde | in welke volgorde de knoppen staan | ja |
| actief | ja/nee, zoals bij werkgroepen | ja (standaard ja) |

**Bij melden en bij een taak is het onderdeel niet verplicht.** Na het kiezen van de
plek verschijnen de onderdelen als knoppen; overslaan mag. Zo blijft melden snel, ook
als iemand niet weet hoe een toestel heet. Het bestuur kan het onderdeel later bij de
taak invullen. De standaardwerkgroep hoort bij de plek, niet bij het onderdeel.

## 4. gebruikers
Iedereen die inlogt. Zo min mogelijk gegevens (AVG).

| Kolom | Wat | Verplicht |
|---|---|---|
| id | hetzelfde nummer als in het inlogsysteem | ja |
| voornaam | wat de anderen in de app zien | ja |
| achternaam_letter | eerste letter van de achternaam, bijv. "P" (1 tot 3 letters) | ja |
| rol | `vrijwilliger`, `bestuur` of `coordinator` | ja (standaard vrijwilliger) |
| krijgt_gevaar_mail | ja/nee: krijgt een e-mail bij een gevaarlijke melding | ja (standaard nee) |
| is_beheerder | ja/nee: mag het beheerscherm gebruiken | ja (standaard nee) |
| actief | ja/nee. Op "nee" = gestopt, kan niet meer inloggen | ja (standaard ja) |

**Welke naam zie je in de app?** Normaal alleen de voornaam: "Piet". Zijn er twee
actieve gebruikers met dezelfde voornaam, dan laat de app bij hen vanzelf de letter
van de achternaam zien: "Piet P." en "Piet V.". De beheerder hoeft daar niets voor
te doen. Hebben ze ook dezelfde letter, dan vult de beheerder bij één van hen twee
of drie letters in: "Piet Pe.".

Het **e-mailadres** staat niet in deze tabel, maar in het inlogsysteem van Supabase.
Dat is nodig voor de inloglink en de gevaar-mail. Zo staat het op één plek.

Iedereen heeft precies één rol. Bestuur en coördinator hebben dezelfde rechten; het
vinkje `krijgt_gevaar_mail` bepaalt wie de e-mail krijgt. Dat kunnen er ook twee zijn,
of tijdelijk een vervanger.

**Beheerder is geen rol, maar een vinkje** (`is_beheerder`). De beheerder is meestal
ook bestuurslid of vrijwilliger, en iedereen heeft maar één rol. Alleen beheerders
mogen het beheerscherm gebruiken: gebruikers toevoegen of verwijderen, rollen en
werkgroepen wijzigen, en werkgroepen, plekken en onderdelen beheren. Wie rollen kan
wijzigen, kan zichzelf overal toegang toe geven; daarom zo weinig mogelijk mensen.
Advies: twee beheerders, zodat er altijd een reserve is. Dit vinkje staat los van de
technische beheeraccounts van Supabase en GitHub.

Frion valt voorlopig buiten de app (zie later-lijst in CLAUDE.md). Er is dus nog geen
rol voor Frion-begeleiders en een taak kan nog niet aan Frion worden toegewezen.

## 5. lidmaatschappen (koppeltabel)
Wie zit in welke werkgroep. Eén regel per persoon per werkgroep.

| Kolom | Wat | Verplicht |
|---|---|---|
| gebruiker | nummer uit gebruikers | ja |
| werkgroep | nummer uit werkgroepen | ja |

**Hoe zit iemand in meerdere werkgroepen?** Door meerdere regels. Sanne zit in drie
werkgroepen, dus heeft ze drie regels:

| gebruiker | werkgroep |
|---|---|
| Sanne | Educatie |
| Sanne | Geschiedenis |
| Sanne | Avontuurlijk spelen |
| Kees | Klussen |

(In de echte tabel staan nummers in plaats van namen.)

In het beheerscherm ziet de beheerder dit als een rij vinkjes bij de persoon, één per
werkgroep. Vinkje aan = er komt een regel bij; vinkje uit = de regel verdwijnt. De
beheerder ziet de tabel zelf nooit. Dezelfde combinatie kan maar één keer voorkomen.

## 6. taken

| Kolom | Wat | Verplicht |
|---|---|---|
| id | nummer | ja |
| titel | korte naam van de taak | ja |
| omschrijving | uitleg | nee |
| plek | nummer uit plekken | ja |
| onderdeel | nummer uit onderdelen | nee |
| werkgroep | nummer uit werkgroepen | ja |
| toegewezen_aan | nummer uit gebruikers | nee |
| deadline | datum | nee |
| status | `open`, `gereed` of `vervallen` | ja (standaard open) |
| foto_na_afloop | waar de foto bij het gereed melden staat | nee |
| gereed_gemeld_door | nummer uit gebruikers | alleen als status gereed is |
| gereed_gemeld_op | datum en tijd | alleen als status gereed is |
| opmerking | korte opmerking na afloop, of de reden van vervallen (hooguit 500 tekens) | nee, en alleen als status gereed of vervallen is |
| opmerking_door | nummer uit gebruikers: wie de opmerking schreef | alleen als er een opmerking is |
| vervallen_door | nummer uit gebruikers: wie de taak liet vervallen | alleen als status vervallen is |
| vervallen_op | datum en tijd | alleen als status vervallen is |
| aangemaakt_door | nummer uit gebruikers | ja |
| aangemaakt_op | datum en tijd (gaat vanzelf) | ja |

**Regels die de database bewaakt**
- Een taak is aan hooguit één persoon toegewezen.
- Het onderdeel hoort bij de gekozen plek (dat geldt ook voor meldingen).
- Alleen een toegewezen taak kan op `gereed`.
- Een taak wordt niet verwijderd maar `vervallen` (alleen bestuur en coördinator,
  alleen vanuit `open`). Een vervallen taak blijft bewaard en gaat mee naar het
  archief. Echt verwijderen kan alleen bij een open taak (gebruikt voor "Ongedaan
  maken" direct na het aanmaken).
- Terug naar `open`: de gereed-gegevens worden leeg gemaakt, ook de foto en de
  opmerking.
- De opmerking is vrije tekst. Er kunnen namen of andere persoonsgegevens in staan.
  Hij hoort bij de taak: dezelfde mensen zien hem, en hij wordt bewaard,
  gearchiveerd en verwijderd samen met de taak.

## 7. meldingen

| Kolom | Wat | Verplicht |
|---|---|---|
| id | nummer | ja |
| plek | nummer uit plekken | ja |
| onderdeel | nummer uit onderdelen | nee |
| foto | waar de foto van het gebrek staat | ja |
| toelichting | tekst van de melder | nee |
| gevaarlijk | ja/nee | ja (standaard nee) |
| gevaar_mail_verstuurd_op | wanneer de gevaar-mail is verstuurd (zodat hij maar één keer gaat) | nee |
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

- **Eén afgesloten fotomap `fotos`:** er is geen openbare link. De app vraagt per foto
  een tijdelijke link aan, die na een uur verloopt.
- **Naam van een foto:** `<nummer van de gebruiker>/<willekeurige code>.jpg`. Iedereen
  heeft een eigen map; neerzetten mag alleen in je eigen map. De code kun je niet raden.
- **Grenzen:** alleen JPEG, hooguit 2 MB per foto.
- **Een melding** mag alleen een foto uit de eigen map van de melder gebruiken.
- **Opruimen:** een foto die nergens meer bij hoort (ingetrokken melding, vervangen
  foto) blijft 7 dagen staan, zodat "Ongedaan maken" werkt. Het overzicht
  `fotos_zonder_koppeling` laat zien welke foto's daarna weg mogen. Verwijderen gaat via
  Storage in het dashboard van Supabase (later automatisch).
- **Bewaartermijn:** 12 maanden (besloten). Zie "Bewaren en verwijderen" hieronder.

---

## Wie mag wat
De database controleert dit bij elke vraag. Een knop verbergen is niet genoeg; ook wie
de app omzeilt, krijgt niets te zien wat niet mag.

"Eigen werkgroepen" = de werkgroepen waar iemand lid van is (tabel lidmaatschappen).

| Wat | Vrijwilliger | Bestuur en coördinator |
|---|---|---|
| Werkgroepen, plekken en onderdelen zien | ja | ja |
| Beheerscherm (gebruikers, werkgroepen, plekken, onderdelen) | alleen met vinkje is_beheerder | alleen met vinkje is_beheerder |
| Taken zien | eigen werkgroepen, en taken die aan hem/haar zijn toegewezen | alle |
| Taak aanmaken of wijzigen | nee | ja |
| Taak oppakken ("Ik doe dit") of teruggeven | alleen voor zichzelf, eigen werkgroepen | ja, aan iedereen |
| Gereed melden, heropenen, foto aanpassen | taken die hij/zij mag zien | ja |
| Melding doen | ja | ja |
| Meldingen zien | eigen meldingen, en meldingen waar een taak van is gemaakt die hij/zij mag zien | alle |
| Melding afhandelen (taak maken, geen actie) | nee | ja |
| Namen van andere gebruikers zien ("Piet P.") | ja, van iedereen | ja |
| Rol en vinkjes van anderen zien | nee, alleen van zichzelf | alleen beheerders |
| Eigen melding intrekken | zolang de status "Nieuw" is | ja, altijd |


**Vaste acties voor vrijwilligers.** Vrijwilligers wijzigen een taak nooit rechtstreeks,
maar alleen via vaste acties: Ik doe dit, Teruggeven, Gereed melden, Weer openen en
Foto aanpassen. Elke actie controleert eerst of het mag en verandert alleen wat bij die
actie hoort. Zo kan een vrijwilliger nooit de titel of de deadline van een taak wijzigen.
"Ongedaan maken" gebruikt de tegenovergestelde actie. Bij "Weer openen" wordt de foto na
afloop losgekoppeld; "Ongedaan maken" zet hem terug.

**Foto's:** wie een melding of taak mag zien, mag ook de foto's erbij zien. Er is geen
aparte regel voor foto's.

Voorbeeld: Piet (Dieren) meldt een kapot hek. Het bestuur maakt er een taak voor Klussen
van. Kees (Klussen) ziet nu de taak, de melding van Piet en de foto van het hek. Fatima
(Tuinen) ziet niets van dit alles.

---

## Bewaren en verwijderen (AVG)
De app bewaart persoonsgegevens niet langer dan nodig. Dit zijn de afspraken:

**Taken, meldingen en foto's**
- Taken en meldingen die meer dan 12 maanden geleden zijn afgesloten (gereed of geen
  actie nodig), worden geëxporteerd naar het archief op SharePoint van de stichting,
  inclusief foto's en voornamen. Daarna worden ze uit de app verwijderd.
- Zolang die exportfunctie er nog niet is (zie later-lijst), blijven ze in de app staan.
  Foto's worden pas verwijderd nadat ze zijn geëxporteerd, anders ontbreken ze in het
  archief.
- In het archief blijven de voornamen staan, zodat je later kunt nalezen wie wat deed.
  Voor het archief geldt de bewaartermijn die de stichting voor SharePoint afspreekt.

**Back-up**
- Eén keer per maand maakt een beheerder een back-up van alle gegevens, inclusief de
  inlogaccounts (e-mailadressen) en alle foto's.
- De back-up staat in een afgeschermde map op de SharePoint van de stichting (alleen
  bestuur en beheerders). De laatste 3 back-ups blijven bewaard; oudere worden
  verwijderd.
- Gevolg: gegevens die in de app worden verwijderd (bijv. het e-mailadres van iemand
  die stopt), staan nog maximaal 3 maanden in een oude back-up.
- De tabel `back_ups` onthoudt alleen wanneer en door wie een back-up is gemaakt.

**Iemand stopt als vrijwilliger**
1. De beheerder kiest in het beheerscherm "Laten stoppen". De persoon staat dan op
   "niet actief". Het inlogaccount en het e-mailadres worden direct verwijderd;
   inloggen kan niet meer. Open taken op naam van de persoon staan weer open voor de
   werkgroep, en de vinkjes "beheerder" en "krijgt mail bij gevaar" gaan uit. Rol en
   werkgroepen blijven bewaard, zodat de persoon later weer mee kan doen ("Weer
   laten meedoen": nieuw inlogaccount, zelfde naam en geschiedenis).
2. De voornaam blijft in de app staan bij taken en meldingen, zolang die nog in de app
   staan. Zo blijft zichtbaar wie wat deed.
3. Zodra er geen taken of meldingen meer naar de persoon verwijzen (alles is
   gearchiveerd), wordt de persoon helemaal uit de app verwijderd.

**Voor het bestuur:** neem deze afspraken op in het verwerkingsregister van de stichting
(de lijst van welke persoonsgegevens de stichting bewaart, waarom en hoe lang). Dit
voorstel is geen juridisch advies.

---

## Besluiten
1. Foto's: 12 maanden in de app, daarna via het archief op SharePoint.
2. Wie een melding of taak mag zien, mag ook de foto zien. De werkgroep van een taak
   ziet ook de melding waar de taak uit komt.
3. Bewaren en verwijderen: zie hierboven. Voornamen blijven bewaard in het archief.
4. Frion valt voorlopig buiten de app.
5. Plekken hebben twee lagen: plek en onderdeel. Het onderdeel is niet verplicht.
6. Beheerder is een vinkje, geen rol. Alleen beheerders gebruiken het beheerscherm.
7. Bij een dubbele voornaam toont de app de letter van de achternaam: "Piet P.".
8. Iedere ingelogde gebruiker ziet de namen van alle gebruikers (niet hun rol).
9. De melder mag een melding intrekken zolang de status "Nieuw" is.
