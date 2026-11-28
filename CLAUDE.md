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
- Geen oefenopdrachten meer geven (besluit eigenaar, november 2026).
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
  Hosting via GitHub Pages op https://app.parkdestadshoeve.nl (CNAME bij Digiworks,
  bestand CNAME in de repository, actief sinds november 2026). Het oude adres
  https://park-de-stadshoeve.github.io/Vrijwilligersapp/ stuurt door.
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

Klaar (inloggen, taken en meldingen werken met de database):
- Alle vijf de functies, verdeeld over: index.html (geraamte), stijl.css (uiterlijk),
  app.js (logica en praten met de database), instellingen.js (adres en publishable
  sleutel van Supabase) en inloggen.js (inloggen met code, uitloggen, profiel).
- Inloggen: signInWithOtp met shouldCreateUser: false, daarna verifyOtp met de code.
  Profiel (voornaam, rol, werkgroepen) uit de database, bewaard op het toestel voor
  slecht bereik. startApp(profiel) in app.js start de schermen. "?rol=bestuur" is weg.
  supabase-js 2.45.4 via jsdelivr, ook bewaard door de service worker.
  instellingen.js gekoppeld aan het testproject. Getest: niet-ingelogd wordt overal
  geweigerd (tabellen, acties, foto's); onbekend e-mailadres geeft de juiste melding.
  Mail via Brevo (eigen SMTP in het testproject, smtp-relay.brevo.com:587, SMTP-
  sleutel alleen in Supabase; instellingen in BEHEER.md). Mailtekst "Magic Link"
  aangepast: alleen de code ({{ .Token }}), geen link. Getest: inloggen met de
  code werkt (november 2026). Tijdelijke zin over de link uit inloggen.js weg;
  emailRedirectTo blijft als vangnet.
- Domein: DNS bij Digiworks (vaste contactpersoon bekend, naam staat niet in de
  repository), mail via Microsoft 365, SPF
  staat alleen Microsoft toe (Brevo heeft daar niets nodig). Stand 24 november
  2026, alles klaar bij Digiworks: CNAME app -> park-de-stadshoeve.github.io;
  Brevo-code, DKIM (brevo1/brevo2._domainkey) en _dmarc (p=none, rapporten naar
  info@): alles groen in Brevo. GitHub: parkdestadshoeve.nl geverifieerd in de
  organisatie (TXT _github-pages-challenge-park-de-stadshoeve; beschermt ook
  app.). Een tweede ingang app.parkdestadshoeve.nl is verwijderd (elk domein in
  GitHub heeft een eigen code; dat gaf verwarring). Eigen adres ingesteld (25
  november 2026): Custom domain in de repository (GitHub maakte bestand CNAME),
  Enforce HTTPS aan; oud adres en http sturen door (301). De app gebruikt
  relatieve paden, dus geen codewijziging nodig. gevaar-mail: standaard
  APP_ADRES nu het nieuwe adres (en Secret APP_ADRES). Supabase: Site URL en
  Redirect URLs naar het nieuwe adres. Getest op de telefoon (oude app weg,
  installeren, inloggen met code, taken, foto, melden): alles goed. Wie de app
  al had: eerst uitloggen, oude app verwijderen, opnieuw installeren. Afzender voor de test:
  een eigen adres op het domein; voor echt gebruik een algemeen adres (bijv. gedeelde mailbox app@).
- Menu onderaan: Mijn taken, Werkgroep, Melden, Meldingen.
- Elke actie heeft "Ongedaan maken" (6 seconden).
- De status van een melding wordt afgeleid van de gekoppelde taak (taakId), niet
  apart opgeslagen.
- Plekken en werkgroepen komen uit de database (tabellen plekken en werkgroepen,
  alleen actief; plekken op volgorde) en staan in plekNamen, werkgroepBijPlek,
  alleWerkgroepen, plekNummer en werkgroepNummer (zetLijsten in app.js), ook
  bewaard op het toestel. Onderdelen nog niet in de app.
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
- Taken komen uit de database (haalTakenOp in app.js): twee vragen (taken met
  plekken(naam) en werkgroepen(naam), plus gebruikers_weergave voor namen), omgezet
  naar dezelfde vorm als vroeger. Na ophalen bewaard op het toestel
  (stadshoeve-taken, per gebruiker, gewist bij uitloggen); lukt ophalen niet binnen
  8 seconden, dan de bewaarde lijst met "Geen verbinding. Je ziet de lijst van …".
  De knoppen bij taken wijzigen nog alleen de kopie op het toestel; boven de lijst
  staat een TIJDELIJKE zin "Proefversie: … wordt nog niet bewaard" (app.js,
  toonLijst). Foto's bij taken nog niet uit de database. Voorbeeldtaken uit app.js
  verwijderd; testgegevens in database/voorbeeld_1_testvrijwilliger.sql en
  voorbeeld_2_taken.sql (alleen testproject). Beide uitgevoerd in het
  testproject en getest op de telefoon: bestuur ziet alles, Testvrijwilliger
  alleen Klussen, zonder verbinding de bewaarde lijst. Alles goed. (Let op bij
  voorbeeld_1: het adres precies kopiëren uit "select email from auth.users".)
- Knoppen bij taken bewaren in de database: pakTaakOp, geefTaakTerug, meldGereed,
  heropenTaak (app.js) roepen via vraagDatabase de vaste acties aan; pas na
  "gelukt" verandert het scherm. Ongedaan maken = tegenovergestelde actie
  (heropenen ongedaan geeft de oude foto_na_afloop mee). Fout P0001: tekst uit de
  database tonen en lijst opnieuw ophalen; geen bereik: "Er is niets veranderd";
  geen wachtrij. "Even geduld…" bij elke tik. Lijst opnieuw ophalen bij tik op
  Mijn taken of Werkgroep (ververs). Nog lokaal (TIJDELIJK, zin alleen voor
  bestuur): nieuwe taak, wijzigen. Getest op telefoon en computer, ook een conflict
  (twee keer gereed melden): alles goed. De telefoon hield na een push de oude
  versie (GitHub Pages laat bestanden 10 minuten bewaren); opgelost in
  service-worker.js met fetch(..., { cache: "no-cache" }); daarna aangevuld met
  automatisch laden van een nieuwe versie (zie verderop), getest op de telefoon.
- Toewijzen met de keuzelijst (bestuur) bewaart via nieuwe vaste actie
  taak_toewijzen (database/05_toewijzen.sql: alleen bestuur, taak open, persoon
  actief; omzetten van een opgepakte taak mag). In 05 ook een nieuwe tekst bij
  gereed melden zonder toegewezen persoon. Lijst personen (actief, met
  werkgroepen) komt uit gebruikers_weergave + lidmaatschappen, alleen voor
  bestuur; keuzelijst: Nog niemand, "Werkgroep X", "Anderen". Taken hebben nu
  toegewezenAanId; isMijnTaak vergelijkt het nummer. Melding: "Toegewezen aan
  Anna (was: Piet)". Voorbeeldlijst vrijwilligers en FRION weg uit app.js.
  05_toewijzen.sql uitgevoerd in het testproject; test_05_toewijzen.sql: alles
  goed. Getest op de telefoon: toewijzen werkt en de taak staat bij de
  Testvrijwilliger onder Mijn taken.
- Foto na afloop bij taken: verkleinde foto naar bucket "fotos" als
  <gebruiker-id>/<randomUUID>.jpg (stuurFotoNaarDatabase, 30 s wachttijd), dan
  koppelen met taak_foto_zetten. Bekijken via createSignedUrls (1 uur; app
  gebruikt een link 55 minuten), opgehaald na elke haalTakenOp. Geen link
  (geen bereik): "📷 Er is een foto. Die zie je als je weer bereik hebt."
  Foto's worden niet op het toestel bewaard (AVG). Upload mislukt: "De foto is
  niet verstuurd. De taak is wel gereed gemeld." Ongedaan maken koppelt de
  vorige foto weer. maakFotoKnop geeft nu de verkleinde foto (blob) door, niet
  een adres. Getest op telefoon en computer (versturen, zien door bestuur,
  foto in Storage, zonder bereik): alles goed.
- Taken aanmaken en wijzigen (bestuur) direct in de tabel taken (insert/update,
  regels uit 03_rechten.sql; geen vaste actie nodig): maakTaak, wijzigTaak,
  verwijderTaak (alleen voor Ongedaan maken na aanmaken), taakNaarRij zet namen om
  in nummers. Mislukt opslaan: formulier blijft staan. Update/delete die 0 rijen
  raakt geeft een eigen melding. Algemene hulp stuurNaarDatabase (wachttijd,
  foutmeldingen; 42501 = "Dit mag je niet doen"); vraagDatabase gebruikt hem.
  "Proefversie"-zin weg. "Maak taak" bij een melding TIJDELIJK uit (regel met //
  in maakMeldingKaart). Getest op telefoon en computer (aanmaken, toewijzen,
  wijzigen, plek uitzetten in Supabase): alles goed.
- Meldingen uit de database (stap 1 van 2): ophalen uit meldingen_met_status
  (status uit de database; vrijwilliger alleen eigen via eq gemeld_door, bestuur
  alles), mee in haalTakenOp en bewaard op het toestel (zonder foto's). Plekken
  worden nu allemaal opgehaald (ook niet-actief) voor plekNaamVan; alleen actieve
  worden knoppen. Melden: eerst foto (stuurFotoNaarDatabase, nu met eigen
  fouttekst), dan insert in meldingen; mislukt: formulier blijft staan, een al
  verstuurde foto wordt niet opnieuw verstuurd. Ongedaan maken = intrekken
  (trekMeldingIn, delete; mag zolang Nieuw). Foto bij melding via tijdelijke
  link. Getest op telefoon en computer (melden,
  intrekken, bestuur ziet alle meldingen, geen bereik): alles goed. Wel: na de
  vliegtuigstand duurde het ~2 minuten voordat opnieuw versturen lukte (oorzaak
  onzeker: telefoon of supabase-js die blijft hangen op het verversen van de
  inlog). Voorlopig alleen de tekst aangepast (MELDING_BEREIK_TIP: "wacht een
  minuut of twee"). In de eerste week van de proef navragen of vrijwilligers hier
  last van hebben; zo ja, verder uitzoeken. isVerbindingsFout herkent nu ook
  "Load failed" (Safari).
- Meldingen afhandelen (stap 2): "Maak taak" via vaste actie taak_uit_melding
  (database/06_meldingen.sql: alleen bestuur, melding nog Nieuw (for update),
  persoon actief; taak maken + koppelen in één keer; geeft taak-id terug).
  Ongedaan maken = taak verwijderen (melding vanzelf weer Nieuw door on delete
  set null). "Geen actie nodig" en "Weer openen" direct in meldingen (update met
  .is("taak", null); 0 rijen = al afgehandeld, lijst verversen). Taken halen de
  gekoppelde melding mee (embed melding:meldingen(id, foto, toelichting,
  gemeld_door)); de werkgroep ziet bij de taak foto, toelichting en naam van de
  melder (besluit: naam wél tonen, voor navragen). Plek van een melding die niet
  meer meedoet: formulier laat de plek leeg. AFHANDELEN_AAN weg.
  06_meldingen.sql uitgevoerd in het testproject; test_06_meldingen.sql: alles
  goed. Getest op de telefoon (Maak taak, taak met meldingsfoto, status bij de
  melder, Geen actie nodig): alles goed.
- Wakker houden: database/07_ping.sql (functie ping, geeft 'ok', ook voor anon)
  en .github/workflows/supabase-wakker-houden.yml (elke 3 dagen, plus met de hand;
  leest adres en sleutel uit instellingen.js). Mail bij mislukken naar de beheerder die de taak aanzette.
  GitHub zet de taak uit na 60 dagen zonder wijziging (uitleg in BEHEER.md).
  07 uitgevoerd in het testproject (select ping() = ok); taak met de hand
  gestart vanaf main: gelukt.
- Beheerscherm, in 4 stappen: (1) bekijken, (2) rol, werkgroepen en vinkjes
  wijzigen, (3) toevoegen via een Edge Function (geheime sleutel alleen bij
  Supabase, functie controleert is_beheerder), (4) laten stoppen (account en
  e-mailadres weg, voornaam blijft). Werkgroepen en plekken: zie verderop;
  onderdelen na de proef. Knop "Beheer" rechtsboven, alleen voor
  beheerders (geen vijfde menuknop).
  Stap 1 gebouwd: beheer.js (toonBeheer, haalGebruikersOp, toonGebruikersLijst),
  knop knop-beheer in index.html, zichtbaar via startApp. Lijst niet op het
  toestel bewaard (AVG); zonder bereik een melding met "Opnieuw proberen".
  Database ongewijzigd (regels uit 03 waren er al). Getest op de telefoon
  (beheerder ziet lijst, Testvrijwilliger geen knop, zonder bereik melding):
  alles goed.
  Stap 2 gebouwd: knop Wijzigen per actieve persoon, formulier (voornaam, letter,
  rol, werkgroepen aan/uit met ✓, Beheerder ja/nee, Mail bij gevaar ja/nee),
  Opslaan via vaste actie gebruiker_wijzigen (database/08_beheer.sql: alleen
  beheerder, alles in één keer, werkgroepen vervangen) en Ongedaan maken (oude
  waarden opnieuw opslaan). Trigger altijd_een_beheerder (security definer): na
  elke update van is_beheerder/actief of delete moet er een actieve beheerder
  zijn. Oude werkgroep (niet actief) blijft zichtbaar als iemand er nog in zit.
  Eigen wijziging: "Open de app opnieuw". test_08_beheer.sql (9 tests) lokaal
  gedraaid in een nagebootste Supabase (Postgres 16): alles goed; ook 01-06
  laden en hun tests geven geen FOUT. 08 uitgevoerd in het testproject;
  test_08: alles goed. Getest op de telefoon (wijzigen, Ongedaan maken,
  bewaker bij eigen vinkje, Testvrijwilliger ziet nieuwe werkgroep na
  opnieuw openen): alles goed.
  Stap 3 gebouwd: één Edge Function "beheer" (supabase/functions/beheer/index.ts,
  via het dashboard geplakt, geen CLI) met acties toevoegen (createUser met
  email_confirm, dan gebruikers + lidmaatschappen; mislukt = account weer weg),
  toevoegen_ongedaan (alleen < 10 min oud en zonder taken/meldingen) en
  email_wijzigen (updateUserById). Controleert zelf inlog (getUser) en
  is_beheerder; geheime sleutel uit Deno.env. Geen welkomstmail (beheerder
  stuurt zelf een bericht, voorbeeld in BEHEER.md). E-mailadres zien:
  database/09_email.sql (gebruiker_email, alleen beheerder). Formulier in
  beheer.js voor "nieuw" en "wijzigen"; bij wijzigen eerst e-mailadres, dan
  de rest; Ongedaan maken zet allebei terug. Getest: functie met nep-Supabase
  (12 gevallen), test_09 lokaal (4 tests), formulier in de browser: alles
  goed. 09 uitgevoerd, test_09 goed; functie "beheer" neergezet via het
  dashboard (Verify JWT aan). Getest op de telefoon (toevoegen, Ongedaan maken,
  inloggen met nieuw account, adres al in gebruik, e-mailadres wijzigen en
  inloggen met nieuw adres): alles goed.
  Stap 4 gebouwd: Edge Function "beheer" kreeg acties stoppen (niet jezelf;
  e-mailadres onthouden, rpc zet_gebruiker_stop, dan deleteUser; mislukt =
  terugzetten) en terugzetten (createUser met HETZELFDE id, dan rpc
  zet_gebruiker_terug; mislukt = account weer weg). database/10_stoppen.sql:
  zet_gebruiker_stop (open taken vrij, vinkjes uit, actief nee; rol en
  werkgroepen blijven; geeft taken en oude vinkjes terug) en zet_gebruiker_terug
  (actief ja, vinkjes, taken terug als nog open en vrij); alleen service_role.
  beheer.js: knop "Laten stoppen" (rood, onderaan Wijzigen, niet bij jezelf),
  melding "X is gestopt. N taken staan weer open." met Ongedaan maken; bij
  gestopten "Weer laten meedoen" (alleen e-mailadres; Ongedaan = weer stoppen).
  Getest: test_10 lokaal (7 tests), functie met nep-Supabase (6 gevallen),
  knoppen in de browser: alles goed. 10 uitgevoerd, test_10 goed; functie
  opnieuw geplakt. Getest op de telefoon (stoppen met vrijgegeven taak, account
  weg in Authentication, Ongedaan maken, Weer laten meedoen met inloggen,
  inloggen na stoppen geweigerd): alles goed. createUser met hetzelfde id
  werkt in Supabase. Beheerscherm voor gebruikers is klaar.
- Opmerking na afloop (later-lijst 14): database/11_opmerking.sql (kolommen
  opmerking (max 500) en opmerking_door in taken, regel: alleen bij gereed;
  vaste actie taak_opmerking_zetten, zelfde rechten als foto, leeg = weghalen;
  taak_heropenen maakt ook opmerking leeg). app.js: haalTakenOp haalt opmerking
  op; gereed kaartje toont "💬 Naam: tekst" en knop Opmerking toevoegen/wijzigen
  met tekstvak (maakOpmerkingDeel, slaOpmerkingOp, Ongedaan maken); Weer openen
  ongedaan zet foto én opmerking terug (meldGereed met derde parameter).
  Getest: test_11 lokaal (8 tests), 03/06/10 nog goed, kaartje in de browser.
  11 uitgevoerd, test_11 goed. Getest op de telefoon (toevoegen, verversen,
  wijzigen/weghalen met Ongedaan maken, Weer openen met Ongedaan maken,
  bestuur ziet en wijzigt): alles goed.
- Back-up, in 3 stappen: (a) gegevens en inlogaccounts, (b) foto's erbij,
  (c) knop "Back-up terugzetten" (alleen in een lege database; één keer testen
  door het testproject leeg te maken en terug te zetten).
  Stap (a) gebouwd: database/12_backup.sql (tabel back_ups: gemaakt_op,
  gemaakt_door; zien alleen beheerders; toevoegen alleen service_role). Edge
  Function "beheer" actie backup: alle tabellen uit BACKUP_TABELLEN (per 1000,
  gesorteerd) + accounts (listUsers: id, email), schrijft regel in back_ups,
  versie 1. beheer.js: onderaan beheerscherm "Back-up" met laatste datum en
  knop; waarschuwing bovenaan na 31 dagen; JSZip 3.10.1 van jsdelivr met
  integrity (alleen geladen bij de knop); zip met gegevens.json en LEESMIJ.txt.
  Getest: test_12 lokaal (4 tests), functie met nep-Supabase (2500 rijen,
  1200 accounts), download in de browser: alles goed. 12 uitgevoerd, test_12
  goed; functie opnieuw geplakt. Getest op een computer (waarschuwing, download,
  inhoud zip, Testvrijwilliger ziet niets): alles goed.
  Stap (b) gebouwd: actie backup geeft nu ook fotos (alle paden in bucket
  "fotos", via storage list per map, per 1000) en foto_links (createSignedUrls
  per 100, 1 uur geldig); BACKUP_VERSIE 2. beheer.js: haalFotosOp (4 tegelijk,
  2 pogingen per foto, voortgang onderaan), foto's in zip als fotos/<pad>
  (STORE), foto_links niet in gegevens.json; ontbrekende foto's in LEESMIJ.txt
  en waarschuwing. Getest: functie met nep-opslag (1502 foto's, map > 1000,
  losse foto), browser met 30 nepfoto's waarvan 1 kapot: alles goed. Functie
  opnieuw geplakt; getest op een computer met echte foto's (voortgang, mapjes,
  foto's openen, aantal klopt met Storage): alles goed.
  Stap (c) gebouwd: database/13_herstel.sql: herstel_backup(gegevens, hersteller)
  (alleen service_role; versie 1/2, eist werkgroepen en actieve beheerder;
  alleen als geen taken/meldingen en geen andere gebruikers; vervangt
  werkgroepen/plekken; insert met overriding system value via
  jsonb_populate_recordset; setval van alle tellers; geeft aantallen) en
  herstel_tijdelijke_gebruiker_weg. herstel_leegmaken.sql (testproject,
  VEILIGHEIDSSLOT-regel). Edge Function acties herstel_gegevens (rpc, dan
  createUser per account met oud id; eigen e-mailadres overgeslagen ->
  mijnOudeId), foto_upload_links (createSignedUploadUrl, alleen nette paden,
  "BESTAAT_AL") en herstel_afronden (tijdelijke gebruiker weg, eigen account
  opnieuw met oud id; daarna uitloggen). beheer.js: knop "Back-up terugzetten"
  onder Back-up, scherm met bestand kiezen, stappenlijst, foto's via
  uploadToSignedUrl (4 tegelijk, 2 pogingen). Getest lokaal: volledige
  rondgang (alles exact gelijk, nieuwe taak krijgt vrij nummer, tweede keer
  geweigerd), test_13 (5 tests), oude tests goed; functie met nep-Supabase;
  scherm in de browser met 29 foto's. 13 uitgevoerd, test_13 goed, functie
  geplakt, samengevoegd. Hersteltest: eerste poging gaf "Er ging iets mis bij de
  database" (waarschijnlijk pg_safeupdate: Supabase weigert DELETE zonder WHERE
  via PostgREST, ook binnen functies; lokaal niet nagebootst). Opgelost met
  "where true" en create or replace in 13_herstel.sql. LET OP voor later:
  delete/update in functies die via rpc lopen altijd met een where.
  13 opnieuw uitgevoerd. Hersteltest op het testproject geslaagd (verse
  back-up, foto's en database leeggemaakt, jezelf met de hand neergezet,
  terugzetten, uitloggen en inloggen, aantallen, foto's, Testvrijwilliger
  inloggen, nieuwe taak): alles goed. Back-up en terugzetten zijn klaar.
- Nieuwe versie automatisch laden: de PWA kwam terug van de achtergrond met de
  oude versie (alleen handmatig verversen hielp). app.js "NIEUWE VERSIE": bij
  start en bij elke visibilitychange (hooguit 1x per minuut) HEAD-verzoeken
  (no-cache) op VERSIE_BESTANDEN, kenmerk = ETag of last-modified/grootte;
  anders dan bij start -> op een rustig moment (Mijn taken, Werkgroep,
  Meldingen, Beheer, geen tekstvak open) service worker "haal-nieuwe-versie"
  (alle APP_BESTANDEN vers in de kopie), dan location.reload(); anders melding
  en opnieuw proberen in toonScherm. Ook registration.update() bij in beeld
  komen. Niet op het inlogscherm (ingelogdeGebruiker.id moet gevuld zijn).
  Getest in de browser met echte service worker (inlogscherm blijft staan,
  formulier geeft melding, terug op Mijn taken herlaadt met nieuwe bestanden in
  de kopie): alles goed. Getest op de telefoon (app op de achtergrond, wijziging
  in index.html, na ontgrendelen nieuwe versie geladen; met Melden open eerst
  de melding, herladen pas op Mijn taken): alles goed.
- E-mail bij een gevaarlijke melding (klaar en getest in het testproject): database/
  14_gevaar_mail.sql (tabel app_instellingen met gevaar_mail_adres, geen
  toegang via de app; kolom meldingen.gevaar_mail_verstuurd_op; trigger
  gevaarlijke_melding_mail na insert bij gevaarlijk -> net.http_post (pg_net)
  met alleen melding_id, fouten nooit naar de melding; functie
  er_is_iemand_voor_gevaar_mail). Edge Function gevaar-mail (Verify JWT uit):
  wacht 10 s (Ongedaan maken), leest de melding zelf, alleen gevaarlijk, < 60
  min oud en nog niet gemaild; legt verstuurd_op vast (update ... is null),
  mailt iedereen met krijgt_gevaar_mail via Brevo API (BREVO_API_KEY en
  AFZENDER_EMAIL als Secrets), tekst + HTML met veilig(), geen foto. app.js:
  GEVAAR_TIP in het formulier bij "Ja, gevaarlijk" ("Is het acuut gevaarlijk?
  Stuur een WhatsApp naar het bestuur."); na versturen "De coördinator krijgt
  een e-mail." alleen als er iemand met het vinkje is. Getest: test_14 lokaal
  met nagebootste pg_net (5 tests), oude tests goed, functie met nep-Supabase
  (6 gevallen), formulier in de browser. Samengevoegd; gele tip getest op de
  telefoon: goed. Ingesteld in het testproject (23 november 2026): pg_net aan,
  14 + adres, API-sleutel van Brevo (alleen permissie transactionele mail) en
  Secrets, functie neergezet. Valkuil: Supabase gaf de functie eerst het adres
  "smooth-endpoint" (naam pas na aanmaken aangepast) -> 404; opnieuw neergezet
  met de naam vooraf (staat nu in BEHEER.md). Lege test (200, "geen
  meldingnummer") en echte test met gevaarlijke melding: mail binnen. De
  pg_net-wachttijd van 5 s tegenover de 10 s wachten in de functie gaf geen
  probleem.
- Taken laten vervallen (later-lijst 7, besluit: niet verwijderen maar status
  "vervallen", knop "Laten vervallen"): database/15_vervallen.sql (status
  vervallen + vervallen_door/vervallen_op; regels gereed_alleen_als_toegewezen,
  gereed_gegevens_kloppen en opmerking-regel aangepast; taak_laten_vervallen
  alleen bestuur en alleen open, koppelt melding los -> Nieuw, geeft melding-id;
  taak_vervallen_terug voor wie de taak mag bewerken (ook vrijwilligers uit de
  werkgroep, besluit), maakt opmerking leeg, gestopte toegewezen persoon ->
  vrij, koppelt melding weer bij Ongedaan maken; taak_opmerking_zetten ook bij
  vervallen; verwijderen alleen nog bij open taken). app.js: rode knop onderaan
  Wijzigen met tekstvak voor reden (niet verplicht), Mijn taken zonder vervallen,
  onderaan Werkgroep dichtgeklapt "Vervallen (N)" met Weer openen en
  opmerking. Getest: test_15 lokaal (10 tests), 01-14 nog goed, browser.
  15 uitgevoerd, test_15 goed. Getest op de telefoon (laten vervallen met
  reden, Ongedaan maken, taak uit melding -> melding Nieuw, Testvrijwilliger
  opent weer en ziet geen knop Laten vervallen): alles goed.
- Werkgroepen en plekken in het beheerscherm: keuzeknoppen Gebruikers |
  Werkgroepen | Plekken bovenaan (beheerTab). Nieuw bestand beheer-lijsten.js
  (ook in index.html, APP_BESTANDEN en VERSIE_BESTANDEN): lijsten met
  Wijzigen, + Toevoegen, Uitzetten/Weer aanzetten (niet verwijderen), plekken
  met standaardwerkgroep en ▲/▼; dubbele naam geweigerd (ook hoofdletters);
  Ongedaan maken overal; na elke wijziging haalTakenOp op de achtergrond.
  database/16_lijsten_beheer.sql: werkgroep_gebruik (mensen, open taken,
  plekken; alleen beheerder; voor waarschuwing bij uitzetten) en
  plek_verplaatsen (nette nummers 10, 20, …, wissel met de eerstvolgende
  actieve buur). Getest: test_16 lokaal (6 tests), browser (omhoog, dubbel,
  toevoegen, uitzetten met waarschuwing, Ongedaan maken). 16 uitgevoerd,
  test_16 goed; getest op de telefoon (volgorde, plek toevoegen en uitzetten,
  werkgroep hernoemen, uitzetten met waarschuwing, Testvrijwilliger geen
  Beheer): alles goed. Onderdelen na de proef. Besluit: in de app blijft het
  woord "plekken" (niet "locaties").
  Daarna: volgorde van werkgroepen (database/17_werkgroep_volgorde.sql: kolom
  volgorde, mag leeg voor oude back-ups, begin = volgorde van het nummer;
  werkgroep_verplaatsen zoals bij plekken). app.js haalt werkgroepen op
  volgorde op; scherm Werkgroep zet ook de eigen werkgroepen van een
  vrijwilliger in die volgorde. beheer-lijsten.js: ▲/▼ bij werkgroepen
  (maakPijlen gedeeld met plekken), nieuwe werkgroep onderaan. Fout opgelost:
  plek met uitgezette standaardwerkgroep vulde die in bij "Maak taak" (opslaan
  mislukte); nu alleen een actieve werkgroep in werkgroepBijPlek. Getest:
  test_17 lokaal (5 tests), 13/16 goed, browser. 17 uitgevoerd, test_17
  goed; getest op de telefoon (volgorde overal, Maak taak met uitgezette
  standaardwerkgroep): alles goed.
  Daarna: na ▲/▼ blijft het verplaatste kaartje op dezelfde hoogte in beeld
  (houdInBeeld in beheer-lijsten.js, kaartjes hebben data-kaart, bijv.
  "plek-12"; zonder dit sprong de pagina naar boven tijdens "Laden…").
  Getest op de telefoon via de testversie: goed. Samengevoegd.
  Indeling beheerscherm (eigen wens, november 2026):
  (1) ▲ en ▼ als vierkante knoppen (56×48, aria-label Omhoog/Omlaag) naast
  Wijzigen op één regel (maakKnoppenRij, .knoppen-rij); (2) Back-up is een
  vierde keuzeknop (toonBackupScherm in beheer.js), waarschuwing bij een te
  oude back-up nu bovenaan Gebruikers, Werkgroepen en Plekken
  (maakBeheerBovenkant, laatsteBackupDatum); (3) keuzeknoppen blijven bovenaan
  staan (.beheer-tabs sticky, 2×2 op de telefoon, 4 naast elkaar vanaf 560 px;
  --kopbalk-hoogte gemeten met ResizeObserver in beheer-lijsten.js). Getest in
  de browser met nep-database (telefoon- en laptopbreedte) en op de telefoon
  via de testversie: goed. Samengevoegd.
- Knop "+ Nieuwe taak" beter vindbaar (later-lijst 18, november 2026): ook
  bovenaan Mijn taken (alleen magAllesZien), en op Mijn taken en Werkgroep
  blijft hij bij het scrollen bovenaan staan (maakNieuweTaakKnop in app.js,
  .vaste-knop in stijl.css). openNieuweTaak(terugScherm): na opslaan of
  annuleren terug naar het scherm waar je begon; vanuit Werkgroep is de
  bekeken werkgroep alvast ingevuld, vanuit Mijn taken niet. Meten van
  --kopbalk-hoogte verhuisd van beheer-lijsten.js naar app.js. HANDLEIDING.md
  bijgewerkt (alleen het bestuursdeel, staat niet in het deelbare document).
  Getest in de browser (proefpagina, telefoonbreedte): knop blijft onder de
  kopbalk, terug naar Mijn taken, vrijwilliger ziet geen knop. Getest op de
  telefoon via de testversie: goed. Samengevoegd. In de proef nog navragen of
  het bestuur de knop nu vindt.

- Gebruikershandleiding voor de proef met Klussen: HANDLEIDING.md (installeren,
  inloggen met code, taken, melden, handig om te weten). Zelfde tekst staat in
  een deelbaar Claude-document (om te mailen of te printen); bij wijzigen allebei
  bijwerken. Gaat uit van het adres app.parkdestadshoeve.nl en de code uit de
  mail (Brevo) en zegt dat de coördinator een e-mail krijgt bij gevaar: dat
  klopt nu allemaal (november 2026).
- Laptopscherm (feedback bestuur, november 2026): foto's hooguit 60% van de
  schermhoogte (.foto in stijl.css); app hooguit 720 px breed in het midden
  (--app-breedte). Kopbalk en menu in kleur over de hele breedte (bewust),
  inhoud in lijn met de kolom. Telefoon ongewijzigd. Getest op de laptop: goed.
- Knop "Hulp" (later-lijst 16): rechtsboven op elk scherm,
  ook bij het inloggen. hulp.js opent een dialog (venster bovenop, formulier
  blijft staan) met het stuk uit HANDLEIDING.md bij het scherm
  (HULP_PER_SCHERM, HULP_VOOR_BESTUUR alleen voor magAllesZien, altijd
  "Handig om te weten"); knoppen Hele handleiding en Sluiten. Eigen kleine
  omzetting van Markdown (kopjes, vet, lijsten, tabellen; alles via
  textContent). Handleiding: kopjes ### bij Taken en meldingen, nieuw deel
  "Voor het bestuur" (Taken maken en wijzigen, Meldingen afhandelen; ook de
  knop + Nieuwe taak, zie punt 18), alleen in de app, niet in het deelbare
  document. hulp.js en HANDLEIDING.md in APP_BESTANDEN en VERSIE_BESTANDEN;
  geen nieuwe versie laden terwijl de hulp open is. Knoppen bovenin smaller
  (padding 8px) zodat Hulp/Beheer/Uitloggen op 375 px passen. Getest in de
  browser (alle schermen, vrijwilliger ziet geen bestuursdeel, kopie in de
  service worker). Getest op de telefoon via de testversie (alle schermen,
  bestuur en vrijwilliger, formulier blijft staan, vliegtuigstand,
  kopbalk): alles goed. Samengevoegd.
- Testversie-workflow (november 2026): faalde met "No artifacts named
  github-pages" (timingprobleem bij GitHub, ook met v5). Opgelost met twee
  jobs (inpakken, dan publiceren met needs), upload-pages-artifact@v5 en
  deploy-pages@v5. Kopie in testversie/ en in Vrijwilligersapp-test gelijk.
  Let op: de branch typ je in het tekstvak; de keuzelijst "Use workflow
  from" blijft main (die toont alleen branches van Vrijwilligersapp-test).

Besluiten (november 2026):
- Frion valt voorlopig buiten de app (zie later-lijst).
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
  Bij een tussenvoegsel 1 tot 3 tekens, bijv. "Piet vdP." (punt blijft; besluit
  november 2026). Veld in het beheerscherm: "Letter(s) van de achternaam", met
  voorbeeld eronder. Getest op de telefoon: goed.
- Hosting: de app-bestanden blijven op GitHub Pages (gratis, automatisch publiceren,
  makkelijk terugdraaien), met het eigen adres app.parkdestadshoeve.nl. Digiworks
  zet alleen de DNS-regels; het hostingpakket daar wordt niet voor de app gebruikt.
  Geen automatische FTP-upload naar Digiworks (dan staat het FTP-wachtwoord van de
  hele website in GitHub). Het adres staat vast vóór de proef met Klussen, omdat
  de geïnstalleerde app en de inlog aan het adres vastzitten.
  Na het omzetten: eigen domein instellen in GitHub (repo) en domein verifiëren
  (organisatie), Site URL en Redirect URLs in Supabase aanpassen, BEHEER.md bijwerken.

- Taken worden niet verwijderd maar "vervallen". Laten vervallen alleen door
  bestuur en coördinator. Vrijwilligers kunnen niet laten vervallen: is een taak
  al gedaan of niet meer nodig, dan melden ze hem gereed met een opmerking.
  Weer openen van een vervallen taak mag wel door de werkgroep.
- Back-up: maandelijks door een beheerder via het beheerscherm, op een computer,
  naar een afgeschermde map op de SharePoint van de stichting (alleen bestuur en
  beheerders; toegang is geregeld). Laatste 3 bewaren. Foto's gaan mee (hele
  database moet herstelbaar zijn), elke maand alle foto's. Geen automatische
  back-up via GitHub (dan databasewachtwoord en persoonsgegevens bij GitHub).

Gebruikstest: geen aparte test vooraf (de test met het bestuur is voor nu genoeg).
In de eerste week van de proef meekijken bij 2–3 vrijwilligers van Klussen.

Besluit van het bestuur (november 2026): de proef is goedgekeurd. Proef van 8
weken met werkgroep Klussen en het bestuur (samen ongeveer 8 mensen). Start op
zaterdag 13 december 2026, de eerstvolgende klusochtend. De verwerkersovereenkomsten
(Supabase, Brevo) regelt de eigenaar van dit project zelf.

Besluit DEV en PROD (november 2026): er komt een nieuw, schoon Supabase-project
voor echt gebruik (PROD). Het testproject "vrijwilligersapp-test" blijft bestaan
als DEV: nieuwe functies en nieuwe SQL eerst daar uitproberen, daarna pas in PROD.
In PROD alleen de SQL-bestanden 01 t/m 18, nooit test_-, voorbeeld_- of
herstel_leegmaken-bestanden. De DEV-versie van de app draait op
https://park-de-stadshoeve.github.io/Vrijwilligersapp-test/ (aparte openbare
repository Vrijwilligersapp-test met alleen een workflow die een branch naar keuze
uit Vrijwilligersapp ophaalt en via GitHub Actions op Pages zet; kopie in
testversie/testversie-neerzetten.yml; geen geheime sleutels). instellingen.js
kiest per adres: app.parkdestadshoeve.nl = PROD, elk ander adres = DEV
(IS_TESTVERSIE). Testversie: paarse balk, gele strook "TESTVERSIE", naam "TEST
Stadshoeve". Wakker houden pingt PROD en DEV (matrix). Werkwijze: branch ->
testversie -> main.

Volgende stappen (vóór 13 december):
1. PROD-project "vrijwilligersapp" (november 2026, organisatie Park de
   Stadshoeve, Frankfurt, Free): KLAAR. pg_net, SQL 01 t/m 17 en gevaar_mail_adres
   gedaan, controle gelijk aan testproject; Edge Functions beheer en
   gevaar-mail met Secrets (eigen Brevo-sleutels voor PROD), inloginstellingen,
   Brevo SMTP en mailtekst gedaan; eigenaar als beheerder (bestuur, Klussen en
   Tuinen) met de hand toegevoegd; instellingen.js PROD_ ingevuld (valkuil:
   adres uit "Data API" heeft /rest/v1/ erachter, dat mag niet). Testproject:
   Site URL en Redirect URLs alleen nog het testadres. Eerste inlog in PROD gaf
   "De app kan niet bij de database": nieuwe Supabase-projecten geven geen
   tabelrechten (GRANT) meer aan authenticated; opgelost met
   database/18_tabelrechten.sql (ook TRUNCATE weg voor authenticated),
   uitgevoerd in test en PROD (37/84), testversie werkt nog. Getest in PROD
   (26 november 2026): inloggen met code, Beheer (gebruikers, werkgroepen,
   plekken nagelopen), gevaarlijke melding met mail en knop naar de app, wakker
   houden (ping PROD en ping DEV groen). Testmelding, foto en
   .emptyFolderPlaceholder (maakt Supabase bij verwijderen in Storage) weg;
   eerste back-up van PROD gemaakt. PROD is klaar.
2. DEV-versie: klaar (25 november 2026). Repository Vrijwilligersapp-test
   aangemaakt, Pages via GitHub Actions, workflow gedraaid met main. Gecontroleerd:
   testadres toont paarse balk en strook, naam TEST Stadshoeve, geen CNAME;
   app.parkdestadshoeve.nl zonder strook; na het omzetten praat de echte app
   met PROD en de testversie met DEV (gecontroleerd in de browser). Testproject:
   Site URL en Redirect URLs alleen het testadres; Secret APP_ADRES naar het
   testadres (gecontroleerd via de Digest, SHA-256 van de waarde).
3. Afzenderadres app@ (gedeelde mailbox) voor inlogcodes en gevaar-mail.
4. Verwerkersovereenkomsten Supabase en Brevo: KLAAR (27 november 2026). Bij
   beide is de DPA onderdeel van de gebruiksvoorwaarden (Supabase: DPA "forms
   part of" de Terms, acceptatie = ondertekening SCC's; Brevo: Appendix 3 van
   de Terms of Use). Beide accounts staan op naam van de stichting. Opgeslagen
   als PDF op SharePoint (afgeschermde map): Supabase DPA (versie 1 augustus
   2026), subprocessorlijst en Terms; Brevo Terms of Use met DPA (versie 1
   oktober 2025). Microsoft 365 valt onder het bestaande contract; GitHub Pages
   en jsDelivr zien alleen IP-adressen (noemen in de privacytekst). Nog
   aanbevolen, niet nodig voor de start: verwerkingsregister van één pagina en
   een zin in de bestuursnotulen.
5. In PROD: twee beheerders (eigenaar en secretaris), plekken nagelopen,
   bestuur en werkgroep Klussen toegevoegd via het beheerscherm (27 november
   2026); coördinator onderhoud toegewezen en vinkje "Mail bij gevaar" gezet bij
   de ontvangers; verse back-up gemaakt met de echte accounts. Privacytekst
   in HANDLEIDING.md (kopje Privacy; contact info@, dat wordt gelezen), door
   eigenaar goedgekeurd; ook in het deelbare Claude-document gezet.
6. Uitnodiging met handleiding een paar dagen vóór 13 december; op de
   klusochtend helpen met installeren. Eerste week meekijken bij 2–3 mensen.

Eerder gedaan (voor de proef met Klussen):
0. Alle vijf de functies werken met de database (november 2026).
2. Database en inloggen koppelen. Daarbij:
   - één tabel gebruikers met per persoon een rol en werkgroepen;
   - rechten afdwingen in de database;
   - rechten en bewaartermijnen volgens DATABASE.md;
   - e-mail aan de coördinator bij een gevaarlijke melding (klaar en getest in
     het testproject, november 2026; voor de proef AFZENDER_EMAIL naar app@);
   - beheerscherm voor gebruikers, werkgroepen, plekken en onderdelen (alleen voor
     beheerders); gebruikers klaar en getest (november 2026), werkgroepen en
     plekken klaar en getest (november 2026), onderdelen na de proef;
   - eigen e-maildienst voor de inlogcodes (de ingebouwde mail van Supabase stuurt
     maar 2 berichten per uur en alleen naar beheerders); Brevo klaar en getest
     in het testproject (november 2026); DMARC staat (p=none); voor de proef
     nog een algemeen afzenderadres (app@) in plaats van een eigen adres;
   - voorkomen dat het gratis Supabase-project na een week stilte op pauze gaat
     (klaar en getest, november 2026);
   - maandelijkse back-up (de gratis versie maakt er geen); klaar en getest,
     inclusief terugzetten (november 2026).

## Later-lijst
1. Terugkerende taken (wens van het bestuur). Voorrang: veel onderhoud uit de
   jaarplanning komt elk jaar of elke maand terug. Beslissen na de proef.
2. Rapportage voor het bestuur (wens van het bestuur). Na de proef bepalen welk
   overzicht echt nodig is.
3. Geschiedenis per taak: wie wat wanneer deed.
4. Bericht aan de werkgroep als een taak is teruggegeven.
5. WhatsApp-bericht bij een gevaarlijke melding (afgeraden: kosten, onderhoud, AVG).
6. Filters op de schermen. Pas bepalen na een paar weken gebruik.
7. GEBOUWD als "Laten vervallen" (zie stand van zaken). Taken verwijderen
   (bijvoorbeeld een taak die per ongeluk is aangemaakt).
8. Pushbericht op de telefoon bij een gevaarlijke melding, als extra naast de e-mail
   (niet in plaats van: op de iPhone alleen als de app op het beginscherm staat,
   en minder betrouwbaar dan e-mail).
9. Exporteren en archiveren van taken en meldingen die meer dan 12 maanden geleden
   zijn afgesloten, met foto's en voornamen, naar SharePoint van de stichting (ter
   naslag), inclusief de opmerking na afloop en de vervallen taken. Daarna uit de app verwijderen. Nodig vóór de eerste foto's 12 maanden
   oud zijn: foto's worden pas verwijderd nadat ze zijn geëxporteerd.
10. Frion toevoegen: rol Frion-begeleider (ziet Dieren, Klussen en Tuinen) en taken
    toewijzen aan "Frion" als groep.
11. Projecten: taken bundelen in een project of groep (bijv. "Opknappen
    Speelkasteel") en op project kunnen filteren. Hangt samen met punt 6 (filters).
12. Bericht aan een vrijwilliger als bestuur een taak die hij of zij had opgepakt
    aan iemand anders geeft. Hangt samen met punt 4.
13. Welkomstmail aan een nieuwe vrijwilliger bij toevoegen in het beheerscherm
    (met uitleg hoe je inlogt). Kan pas als Brevo werkt. Tot die tijd stuurt de
    beheerder zelf een bericht (voorbeeld in BEHEER.md).
14. GEBOUWD (zie stand van zaken). Opmerking bij gereed melden (eigen wens, november 2026): de vrijwilliger
    kan bij "Gereed melden" een korte opmerking invullen (niet verplicht), bijv.
    "Nieuwe scharnieren, de oude lagen in de container." Zichtbaar voor wie de taak
    mag zien. Klein: één tekstveld, nieuwe kolom bij taken, aanpassing in
    taak_gereed_melden. Mag geen verplichte extra tik worden (max 3 tikken plus
    foto). Let op: vrije tekst kan namen of andere persoonsgegevens bevatten; valt
    onder dezelfde bewaartermijn als de taak. Kan vóór de proef als er tijd is.
15. Onderdelen van plekken in de app (bijv. Hummelhoeve > Nestschommel): kiezen bij
    melden en bij taken, tonen op kaartjes, beheren per plek in het beheerscherm.
    De database is er al op voorbereid (tabel onderdelen, kolommen bij taken en
    meldingen), dus later toevoegen kost geen ombouw. Bewust uitgesteld (november
    2026): voor de proef met Klussen weinig nut (vooral handig bij speeltoestellen,
    dus Avontuurlijk spelen), het maakt melden langer, en het bestuur moet de lijst
    met onderdelen bedenken en bijhouden. In de proef letten op meldingen waarbij
    navragen nodig was ("welke schommel?"). Eerder doen als meldingen vaak
    onduidelijk blijken, of als Avontuurlijk spelen direct na Klussen meedoet.
16. GEBOUWD als knop "Hulp" (zie stand van zaken). Gebruikershandleiding toegankelijk maken via de app (eigen wens, november 2026),
    zodat vrijwilligers hem altijd bij de hand hebben. Nu staat hij in
    HANDLEIDING.md en in een deelbaar Claude-document. Aangevuld (eigen wens,
    november 2026): help-functie en/of korte tutorial. Advies: een knop "Hulp"
    met de tekst uit HANDLEIDING.md (één tekst om bij te houden); geen
    rondleiding door de schermen (moet bij elke schermwijziging mee, veel
    onderhoud). In de proef letten op waar vrijwilligers vastlopen.
17. Vrijwilligerslijst (eigen wens, november 2026): nieuwe functie waarin
    vrijwilligers elkaars naam, contactgegevens enz. kunnen vinden. Let op: botst
    met "voornaam is genoeg" (AVG). Alleen met toestemming: ieder kiest zelf wat
    zichtbaar is (bijv. telefoonnummer ja/nee). Vooraf privacyafweging en besluit
    van het bestuur.
18. GEBOUWD (zie stand van zaken). Knop "+ Nieuwe taak" beter vindbaar maken (eigen ervaring, november 2026). De
    knop bestaat al (bovenaan Werkgroep, alleen bestuur en coördinator), maar werd
    over het hoofd gezien: het leek alsof taken alleen uit een melding konden.
    In de proef navragen bij het bestuur of ze hem vinden. Mogelijke oplossing:
    knop ook onder Mijn taken, of duidelijker tekst. Geen apart scherm nodig.
19. Veel taken tegelijk invoeren (eigen wens, november 2026), bijv. de
    jaarplanning. Opties: (a) SQL-sjabloon voor de SQL Editor met namen van plek
    en werkgroep in plaats van nummers, dat eerst controleert en bij één fout
    niets invoert (weinig bouwwerk, voor een beheerder die durft te plakken);
    (b) CSV-import van Supabase zelf (niets bouwen, maar nummers en uuid's
    invullen: foutgevoelig); (c) CSV uploaden in het beheerscherm met controle,
    voorbeeld en Ongedaan maken (gebruiksvriendelijkst, flinke stap). Advies:
    niet voor de proef; beslissen na de proef samen met punt 1 (terugkerende
    taken), want dan is een grote import misschien niet meer nodig. Eerder
    nodig: optie (a). De takenlijst zelf niet in GitHub (intern stuk).
    VOORKEUR (eigenaar, november 2026): optie (a), SQL in de SQL Editor.
