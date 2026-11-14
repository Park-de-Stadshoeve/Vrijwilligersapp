# Vrijwilligersapp Park de Stadshoeve

## Context
Ik bouw een mobiele app voor de vrijwilligers van Park de Stadshoeve in Zwolle-Stadshagen,
een wijkpark met kinderboerderij. Het park wordt gerund door Stichting de Stadshoeve,
met ongeveer 40 vrijwilligers. De stichting heeft geen personeel. Dagbesteding Frion doet
doordeweeks de dierverzorging, het groenonderhoud en klein onderhoud. Er is een
coördinator onderhoud (meestal het bestuurslid met die portefeuille). Onderhoud wordt
gepland via een meerjarenonderhoudsplan (MJOP), een jaarplanning en een maandplanning.

Werkgroepen: Dieren, Tuinen, Avontuurlijk spelen, Klussen, Educatie, Evenementen,
Geschiedenis.

Dit is mijn eerste app. Ik ben geen programmeur. Mijn opvolger is dat ook niet.

## Wat de app moet doen
1. Takenlijst per werkgroep bekijken. Startscherm is "Mijn taken"; de taken van de
   hele werkgroep staan één tik verder.
2. Taken toewijzen aan één persoon per taak. Vrijwilligers pakken een taak zelf op
   ("Ik doe dit") of geven hem terug. Bestuur en coördinator wijzen toe aan iedereen,
   aan zichzelf of aan Frion als groep.
3. Taken gereed melden, eventueel met een foto. Alleen een toegewezen taak kan gereed
   gemeld worden. Een gereed gemelde taak kan weer open gezet worden en de foto kan
   vervangen of verwijderd worden.
4. Gebreken melden: foto (verplicht), plek (keuzeknoppen, verplicht), toelichting (niet
   verplicht), gevaarlijk ja/nee (standaard nee). De melder ziet de status van zijn
   melding (Nieuw, Taak gemaakt, Toegewezen, Gereed, Geen actie nodig). Bij "gevaarlijk"
   krijgt de coördinator een e-mail.
5. Taken aanmaken en wijzigen door bestuur en coördinator, op basis van de jaarplanning
   onderhoud, ook direct vanuit een melding ("Maak taak"). Elke taak heeft een
   verplichte plek (zelfde keuzes als bij melden) en een verplichte werkgroep; de
   persoon is niet verplicht. Bij een taak uit een melding zijn titel, omschrijving,
   foto, plek, werkgroep (op basis van de plek) en deadline (gevaarlijk: morgen, anders
   over twee weken) alvast ingevuld. Een melding zonder taak kan op "Geen actie nodig"
   gezet worden, met een verplichte toelichting die de melder te zien krijgt.

Bouw niets buiten deze vijf functies zonder dat ik dat expliciet vraag. Nieuwe ideeën
zet je op de later-lijst onderaan dit bestand.

## Gebruikers en rechten
- Rollen: vrijwilliger, bestuur, coördinator onderhoud, Frion-begeleider.
  Iedereen logt in. Frion-cliënten loggen niet in.
- Rol en werkgroep zijn twee aparte dingen. Iemand kan in meerdere werkgroepen zitten.
  Een bestuurslid kan ook gewoon lid zijn van werkgroepen.
- Vrijwilligers zien de taken van hun eigen werkgroepen en hun eigen meldingen.
- Bestuur en coördinator zien alles, maken en wijzigen taken, wijzen toe en handelen
  meldingen af.
- Frion-begeleiders zien Dieren, Klussen en Tuinen. Taken voor Frion worden aan
  "Frion" als groep toegewezen; elke Frion-begeleider ziet ze onder "Mijn taken".
- Gereed melden, heropenen en foto's aanpassen mag iedereen uit de werkgroep, de
  persoon aan wie de taak is toegewezen, het bestuur en de coördinator.
- Rechten worden afgedwongen in de database, niet alleen door knoppen te verbergen.

## Leerdoel
Ik bouw deze app zelf om te leren hoe je een app maakt. Claude schrijft code, maar:
- Leg bij elke stap uit wat de code doet en waarom, in gewone taal.
- Laat me zelf kleine aanpassingen doen en geef me opdrachten om te oefenen,
  met tips en een oplossing om achteraf te controleren.
- Doe niet meer dan nodig voor de stap waar we zijn. Eén stap tegelijk.
- Vertel vóór je bestanden wijzigt wat je gaat doen en welke bestanden het raakt.
  Vat na afloop samen wat er veranderd is.

## Hoe je met mij werkt
- Stel eerst vragen voordat je iets bouwt of adviseert, tot het doel helder is.
  Stel maximaal 3 vragen tegelijk, de belangrijkste eerst, met je advies erbij.
- Geef directe, to-the-point feedback. Zeg het gewoon als een idee niet goed is,
  te groot is of onnodig ingewikkeld. Geef dan een beter alternatief.
- Leg technische begrippen in één zin uit wanneer ze voor het eerst voorkomen.
- Werk in kleine stappen. Elke stap levert iets op dat ik op mijn telefoon kan testen.
- Benoem bij elke keuze: kosten per maand, onderhoudslast voor een niet-programmeur,
  en privacygevolgen.
- Maak per stap een commit met een duidelijke Nederlandse beschrijving.
- Antwoord in het Nederlands.

## Platform
- Frontend: Progressive Web App (PWA) in HTML, CSS en JavaScript. Mobile-first.
  Geen zwaar framework en geen build-stap tenzij er een duidelijke reden is.
- Backend: beheerde dienst (bijv. Supabase) voor database, login en foto-opslag,
  met dataopslag in de EU. Bouw nooit zelf login of wachtwoordbeheer.
- Inloggen met een code van 6 cijfers uit de mail, zonder wachtwoord. (Geen link:
  op de iPhone opent een link in Safari en niet in de app op het beginscherm.)
- Code staat in GitHub: organisatie park-de-stadshoeve, repository Vrijwilligersapp.
  Hosting via GitHub Pages: https://park-de-stadshoeve.github.io/Vrijwilligersapp/
  Budget: hooguit een paar euro per maand.
- De repository is openbaar. Zet er nooit echte namen, persoonsgegevens, wachtwoorden,
  geheime sleutels of interne stukken van de stichting in. Een publieke sleutel die
  bedoeld is voor de browser mag wel; een geheime of beheerderssleutel nooit.
- Gebruikers, werkgroepen en plekken op het park worden beheerd via een beheerscherm,
  niet in de code.
- Meldingen naar de coördinator gaan per e-mail. Geen WhatsApp (kosten, onderhoud, AVG).
- Waarschuw me direct als een keuze een beveiligingsrisico of extra kosten oplevert.

## Uitgangspunten
- Onderhoudbaarheid door een niet-programmeur weegt zwaarder dan slimme oplossingen.
  Houd de code simpel, geef alles duidelijke Nederlandse namen en zet uitleg in de code.
- De app werkt op zowel iPhone als Android, zonder app store.
- De app moet bruikbaar blijven bij slecht bereik buiten op het park.
- AVG: sla zo min mogelijk persoonsgegevens op (voornaam is genoeg). Leg vast wie
  foto's mag zien en hoe lang ze bewaard blijven. Verklein foto's en verwijder
  locatiegegevens voor upload. Let op foto's waarop cliënten, kinderen of bezoekers
  staan.
- Beheer van gebruikers (toevoegen, verwijderen, werkgroep of rol wijzigen) moet door
  een niet-technische beheerder te doen zijn.
- Lever bij elke opgeleverde stap een korte beheerhandleiding in gewone taal, en houd
  BEHEER.md in de repository bij.

## UI- en designregels
- Mobile-first: ontwerp voor één hand en duimbereik. Belangrijke knoppen staan onderaan.
- Tikdoelen zijn minimaal 44×44 pt (Apple) en 48×48 dp (Android), met ruimte ertussen.
- Eén hoofdactie per scherm of kaartje. Maximaal 4–5 items in de navigatie.
- Tekst is minimaal 16 px en in eenvoudige taal (B1). Gebruik geen jargon.
- Hoog contrast (WCAG AA) zodat alles leesbaar is in de zon. Gebruik nooit alleen
  kleur om iets duidelijk te maken.
- Een taak gereed melden of een gebrek melden kost maximaal 3 tikken plus de foto.
  Formulieren zijn kort en hebben slimme standaardwaarden. Kies liever keuzeknoppen
  dan typen.
- Elke actie geeft een melding met "Ongedaan maken", in plaats van "Weet je het zeker?".
- Inloggen gebeurt eenmalig per toestel. Daarna blijft de gebruiker ingelogd.
- Schermen laden snel. Geef direct zichtbare feedback na elke tik (laden, gelukt, fout).
- Foutmeldingen zeggen wat er mis is en wat je moet doen.
- De gebruikers zijn vrijwilligers van 16 tot 80+ met wisselende digitale vaardigheid.
  Test elk ontwerp tegen de vraag: snapt een vrijwilliger dit zonder uitleg?

## Stand van zaken
Werk deze sectie bij aan het eind van elke stap.

Klaar (de schermen werken nog met voorbeeldgegevens; inloggen werkt met de database):
- Alle vijf de functies, verdeeld over: index.html (geraamte), stijl.css (uiterlijk),
  app.js (logica en voorbeeldgegevens), instellingen.js (adres en publishable
  sleutel van Supabase) en inloggen.js (inloggen met code, uitloggen, profiel).
- Inloggen: signInWithOtp met shouldCreateUser: false, daarna verifyOtp met de code.
  Profiel (voornaam, rol, werkgroepen) uit de database, bewaard op het toestel voor
  slecht bereik. startApp(profiel) in app.js start de schermen. "?rol=bestuur" is weg.
  supabase-js 2.45.4 via jsdelivr, ook bewaard door de service worker.
  instellingen.js gekoppeld aan het testproject. Getest: niet-ingelogd wordt overal
  geweigerd (tabellen, acties, foto's); onbekend e-mailadres geeft de juiste melding.
  Supabase laat de mailtekst niet aanpassen zonder eigen SMTP: de mail bevat nu een
  link (emailRedirectTo = de app), nog geen code. Inloggen via de link getest en
  werkt. Het codescherm heeft een TIJDELIJKE zin over de link (inloggen.js,
  "TIJDELIJK"); weghalen zodra Brevo de code stuurt.
- Domein: DNS bij Digiworks (beheerder nog onbekend), mail via Microsoft 365, SPF
  staat alleen Microsoft toe. Brevo heeft DNS-regels nodig. Afzender voor de test:
  jerome@; voor echt gebruik een algemeen adres (bijv. gedeelde mailbox app@).
- Menu onderaan: Mijn taken, Werkgroep, Melden, Meldingen.
- Elke actie heeft "Ongedaan maken" (6 seconden).
- De status van een melding wordt afgeleid van de gekoppelde taak (taakId), niet
  apart opgeslagen.
- Plekken op het park staan in PLEKKEN; de standaardwerkgroep per plek in
  PLEK_WERKGROEP.
- De voorbeeldgegevens gebruiken verzonnen namen (Kirsten, Piet, Fatima, Kees,
  Sanne, Jan).
- Installeerbaar als app (PWA): manifest.json, iconen/ (logo in 180, 192, 512) en
  service-worker.js ("eerst internet, na 3 seconden de bewaarde kopie"). Alleen de
  app zelf wordt bewaard, nog geen taken of meldingen.
- Foto's worden op de telefoon verkleind (verkleinFoto in app.js: langste kant 1280,
  JPEG 80%) en verliezen daarbij alle verborgen gegevens, ook gps.
- Ontwerp van de database in gewone taal: DATABASE.md (zeven tabellen, wie mag wat,
  bewaren en verwijderen, besluiten). Eén rol per persoon; vinkje krijgt_gevaar_mail
  bepaalt wie de e-mail bij een gevaarlijke melding krijgt.
- SQL in de map database/: 01_tabellen.sql (tabellen, regels, rijbeveiliging aan,
  views meldingen_met_status en gebruikers_weergave) en 02_startgegevens.sql
  (werkgroepen en plekken). Beide uitgevoerd in het Supabase-testproject
  "vrijwilligersapp-test" (organisatie Park de Stadshoeve, Frankfurt, Free, zonder
  GitHub-koppeling; alleen verzonnen gegevens). test_01_regels.sql: alles goed.
- 03_rechten.sql geschreven (regels per tabel, vaste acties taak_oppakken,
  taak_teruggeven, taak_gereed_melden, taak_heropenen, taak_foto_zetten,
  melding_status). Uitgevoerd in het testproject; test_03_rechten.sql (24 tests)
  en test_01_regels.sql: alles goed.
- 04_fotos.sql geschreven: afgesloten bucket "fotos" (JPEG, max 2 MB), pad
  <gebruiker-id>/<uuid>.jpg, zien via melding/taak, melding alleen met eigen foto,
  view fotos_zonder_koppeling (niet via de app). Uitgevoerd in het testproject;
  bucket gecontroleerd (niet openbaar); test_04_fotos.sql: alles goed. Uploaden
  en tijdelijke links pas te testen als de app gekoppeld is.

Besluiten (november 2026):
- Frion valt voorlopig buiten de app (zie later-lijst). De voorbeeldgegevens in
  app.js bevatten nog Frion; dat verdwijnt als de taken uit de database komen.
- Inloggen met een code uit de mail in plaats van een link (iPhone-probleem).
- Alleen vooraf toegevoegde e-mailadressen kunnen inloggen.
- Voorlopig de ingebouwde mail van Supabase; eigen e-maildienst (Brevo) vóór de
  proef met Klussen.
- Foto's: 12 maanden in de app. Wie een melding of taak mag zien, mag ook de foto
  zien. De werkgroep van een taak ziet ook de melding waar die taak uit komt.
- Iemand stopt: account en e-mailadres direct weg; voornaam blijft bij taken en
  meldingen, ook in het archief op SharePoint.
- Plekken hebben twee lagen: plek en onderdeel (bijv. Hummelhoeve > Nestschommel).
  Het onderdeel is niet verplicht bij melden en bij taken.
- Beheerder is geen rol maar een vinkje (is_beheerder); alleen beheerders gebruiken
  het beheerscherm. Advies: twee beheerders.
- Bij een dubbele voornaam toont de app "Piet P." (kolom achternaam_letter).

Gebruikstest: geen aparte test vooraf (de test met het bestuur is voor nu genoeg).
In de eerste week van de proef meekijken bij 2–3 vrijwilligers van Klussen.

Volgende stappen:
0. Inloggen testen op de telefoon met het testproject. Daarna: taken en meldingen
   uit de database in plaats van voorbeeldgegevens (in kleine stappen).
1. Besluit van het bestuur afwachten. Feedback (vergadering 22 oktober 2026): eerst
   autorisaties en hosting onderzoeken, invoering stap voor stap. Daarvoor is een
   notitie gemaakt (staat buiten de repository, want het is een intern stuk) met
   besluitpunten: Supabase gratis in de EU, rechtenoverzicht, foto's (wie ziet ze,
   12 maanden bewaren), proef van 8 weken met werkgroep Klussen, wie beheerder
   wordt en wie de verwerkersovereenkomsten afsluit.
2. Database en inloggen koppelen, eerst voor de proef met Klussen. Daarbij:
   - één tabel gebruikers met per persoon een rol en werkgroepen;
   - rechten afdwingen in de database;
   - rechten en bewaartermijnen volgens DATABASE.md;
   - e-mail aan de coördinator bij een gevaarlijke melding;
   - beheerscherm voor gebruikers, werkgroepen, plekken en onderdelen (alleen voor
     beheerders);
   - eigen e-maildienst voor de inlogcodes (de ingebouwde mail van Supabase stuurt
     maar 2 berichten per uur en alleen naar beheerders);
   - voorkomen dat het gratis Supabase-project na een week stilte op pauze gaat;
   - maandelijkse back-up (de gratis versie maakt er geen).

## Later-lijst
1. Terugkerende taken (wens van het bestuur). Voorrang: veel onderhoud uit de
   jaarplanning komt elk jaar of elke maand terug. Beslissen na de proef.
2. Rapportage voor het bestuur (wens van het bestuur). Na de proef bepalen welk
   overzicht echt nodig is.
3. Geschiedenis per taak: wie wat wanneer deed.
4. Bericht aan de werkgroep als een taak is teruggegeven.
5. WhatsApp-bericht bij een gevaarlijke melding (afgeraden: kosten, onderhoud, AVG).
6. Filters op de schermen. Pas bepalen na een paar weken gebruik.
7. Taken verwijderen (bijvoorbeeld een taak die per ongeluk is aangemaakt).
8. Pushbericht op de telefoon bij een gevaarlijke melding, als extra naast de e-mail
   (niet in plaats van: op de iPhone alleen als de app op het beginscherm staat,
   en minder betrouwbaar dan e-mail).
9. Exporteren en archiveren van taken en meldingen die meer dan 12 maanden geleden
   zijn afgesloten, met foto's en voornamen, naar SharePoint van de stichting (ter
   naslag). Daarna uit de app verwijderen. Nodig vóór de eerste foto's 12 maanden
   oud zijn: foto's worden pas verwijderd nadat ze zijn geëxporteerd.
10. Frion toevoegen: rol Frion-begeleider (ziet Dieren, Klussen en Tuinen) en taken
    toewijzen aan "Frion" als groep.
11. Projecten: taken bundelen in een project of groep (bijv. "Opknappen
    Speelkasteel") en op project kunnen filteren. Hangt samen met punt 6 (filters).
