# Beheerhandleiding Vrijwilligersapp

Deze handleiding is voor de beheerder van de app. Je hoeft geen programmeur te zijn.
Stand: inloggen en alles rond taken werkt met de database (Supabase): bekijken,
"Ik doe dit", "Teruggeven", "Gereed melden", "Weer openen", toewijzen met de
keuzelijst, nieuwe taak, wijzigen en de foto na afloop. In de keuzelijst staan eerst
de leden van de werkgroep van de taak, dan alle anderen; wie gestopt is staat er
niet in. Plekken en werkgroepen komen ook uit de database.
Meldingen werken ook met de database: melden met foto, en op "Meldingen" de status
(vrijwilligers zien alleen hun eigen meldingen, bestuur alle). "Ongedaan maken" na
het melden trekt de melding in. Bestuur handelt meldingen af op het scherm Meldingen:
- **Maak taak**: het taakformulier is alvast ingevuld (deadline morgen bij gevaarlijk,
  anders over twee weken). Taak en melding worden in één keer gekoppeld. Bij de taak
  ziet de werkgroep de foto, de toelichting en wie het meldde.
- **Geen actie nodig**: met een verplichte toelichting, die de melder te zien krijgt.
  Met **Weer openen** zet je hem terug op "Nieuw".
De e-mail bij een gevaarlijke melding komt later (daarvoor is eerst de e-maildienst
nodig).

Lukt een knop niet, dan staat onderaan wat er mis is. Bijvoorbeeld "Iemand anders
heeft deze taak al opgepakt" (de app haalt dan de nieuwste lijst op) of "Geen
verbinding. Er is niets veranderd." De app onthoudt een mislukte tik niet: probeer
het opnieuw als je bereik hebt. Bij een tik op "Mijn taken" of "Werkgroep" haalt de
app de nieuwste taken op.

## Waar staat de app?
- **Code:** GitHub, organisatie `park-de-stadshoeve`, repository `Vrijwilligersapp`.
- **Online:** https://app.parkdestadshoeve.nl (het oude adres
  park-de-stadshoeve.github.io/Vrijwilligersapp stuurt hier vanzelf naartoe).
- **Wat is nodig voor dit adres?**
  - Het domein parkdestadshoeve.nl blijft betaald bij Digiworks.
  - Bij Digiworks staat de DNS-regel `app` CNAME `park-de-stadshoeve.github.io`
    en de TXT-regel `_github-pages-challenge-park-de-stadshoeve` (bewijs voor
    GitHub dat het domein van ons is). Haal die nooit weg.
  - In de repository staat het bestand `CNAME` met `app.parkdestadshoeve.nl`.
    Niet verwijderen of wijzigen.
  - GitHub > repository > **Settings** > **Pages**: **Custom domain** =
    `app.parkdestadshoeve.nl`, **Enforce HTTPS** aan.
- **Werkt de app niet meer op dit adres?** Kijk eerst bij GitHub > repository >
  **Settings** > **Pages** of daar een fout staat. Daarna bij Digiworks of de
  regels er nog staan.
- **Database:** Supabase. Er zijn twee projecten:
  - **PROD** (de echte app, echte gegevens). TIJDELIJK: nog niet aangemaakt; tot die
    tijd gebruikt ook de echte app het testproject.
  - **DEV** = `vrijwilligersapp-test` (alleen verzonnen gegevens, om uit te proberen).
  Welke de app gebruikt, hangt af van het adres (zie `instellingen.js`):
  app.parkdestadshoeve.nl = PROD, elk ander adres = DEV.

## Testversie (DEV)
Nieuwe dingen probeer je eerst uit in de testversie, zodat de vrijwilligers er geen
last van hebben.

- **Adres:** https://park-de-stadshoeve.github.io/Vrijwilligersapp-test/
- **Herken je hem?** Paarse balk bovenaan en een gele strook "TESTVERSIE – alleen
  testgegevens". Op het beginscherm heet hij "TEST Stadshoeve".
- **Database:** altijd het testproject `vrijwilligersapp-test`. Inloggen doe je met
  een account dat in het testproject staat.
- **Waar komt hij vandaan?** Uit de repository `Vrijwilligersapp-test` (organisatie
  `park-de-stadshoeve`). Daarin staat alleen een automatische taak die de code uit
  `Vrijwilligersapp` ophaalt. Een kopie van die taak staat hier in
  `testversie/testversie-neerzetten.yml`.

**Een nieuwe versie testen:**
1. Maak de wijziging op een branch (zijspoor) in `Vrijwilligersapp`, niet op `main`.
2. Nieuwe SQL? Voer die eerst uit in het testproject.
3. Ga naar GitHub > `Vrijwilligersapp-test` > tabblad **Actions** > **Testversie
   neerzetten** > **Run workflow**, vul de naam van de branch in en klik op de groene
   knop. Na een minuut of twee staat hij online.
4. Test op de telefoon (op het testadres).
5. Goed? Voeg de branch samen met `main` (dan staat hij in de echte app) en voer
   nieuwe SQL ook uit in het PROD-project. Daarna mag je de testversie weer op
   `main` zetten (stap 3 met `main`).

**Eenmalig opzetten** (al gedaan als de testversie werkt):
1. Maak in de organisatie een nieuwe repository `Vrijwilligersapp-test`, **Public**
   (GitHub Pages is alleen gratis bij openbare repositories; er staat niets geheims in).
2. Maak daarin het bestand `.github/workflows/testversie-neerzetten.yml` met de inhoud
   van `testversie/testversie-neerzetten.yml` uit deze repository.
3. `Vrijwilligersapp-test` > **Settings** > **Pages** > bij **Source** kies
   **GitHub Actions**. Geen Custom domain invullen.
4. Start de taak (zie hierboven, met `main`).
5. Supabase > testproject > **Authentication** > **URL Configuration**: zet de
   **Site URL** op het testadres en voeg het testadres toe bij **Redirect URLs**.
6. Supabase > testproject > **Edge Functions** > **Secrets**: zet `APP_ADRES` op het
   testadres (dan wijst de knop in de gevaar-mail uit het testproject naar de
   testversie).

## Welk bestand doet wat?
| Bestand | Wat staat erin | Wanneer pas je het aan? |
|---|---|---|
| `index.html` | Het geraamte: kopbalk, middenruimte, menu onderaan | Zelden |
| `stijl.css` | Het uiterlijk: kleuren, groottes, knoppen | Kleur of tekstgrootte veranderen |
| `app.js` | De logica, taken ophalen uit de database, de voorbeeldmeldingen | Plekken, werkgroepen, termijnen |
| `instellingen.js` | Adres en publieke sleutel van beide databases (PROD en DEV) | Bij een ander Supabase-project |
| `testversie/` | Kopie van de automatische taak voor de repository `Vrijwilligersapp-test` | Zelden; daarna ook daar aanpassen |
| `beheer-lijsten.js` | Het beheerscherm, deel werkgroepen en plekken | Zelden |
| `beheer.js` | Het beheerscherm (knop "Beheer", alleen voor beheerders) | Zelden |
| `inloggen.js` | Inlogscherm met code uit de mail, uitloggen, "wie ben ik" | Zelden |
| `CLAUDE.md` | Instructies voor Claude en de stand van zaken | Als er afspraken veranderen |
| `DATABASE.md` | Ontwerp van de database: welke gegevens, wie mag wat | Als de opbouw of de rechten veranderen |
| `database/` | De SQL-bestanden die de database opbouwen (uitleg in `database/LEESMIJ.md`) | Alleen bij het opzetten van een nieuwe database |
| `manifest.json` | Naam, icoon en kleur van de app op het beginscherm | Andere naam of kleur |
| `service-worker.js` | Bewaart de app op de telefoon voor slecht bereik | Als je een bestand toevoegt |
| `iconen/` | Het logo in drie maten (180, 192 en 512 pixels) | Nieuw logo |
| `supabase/functions/gevaar-mail/` | Edge Function: e-mail bij een gevaarlijke melding (draait bij Supabase) | Zelden; daarna opnieuw plakken bij Supabase |
| `supabase/functions/beheer/` | Edge Function: iemand toevoegen en e-mailadres wijzigen (draait bij Supabase) | Zelden; daarna opnieuw plakken bij Supabase |
| `.github/workflows/` | Automatische taak die beide databases wakker houdt | Zelden |

## De app op het beginscherm zetten
Vertel vrijwilligers dit bij de start. Het hoeft maar één keer per telefoon.
- **iPhone (Safari):** open de link, tik op het deelknopje (vierkantje met pijl
  omhoog), kies **Zet op beginscherm** en tik op **Voeg toe**.
  Dit werkt alleen in Safari, niet in Chrome op de iPhone.
- **Android (Chrome):** open de link, tik op de drie puntjes rechtsboven en kies
  **App installeren** of **Toevoegen aan startscherm**.

Daarna staat er een icoon met de kip en de naam "Stadshoeve" op het beginscherm.

## Inloggen
Iedereen logt één keer per toestel in. Daarna blijft de app ingelogd, tot je op
**Uitloggen** (rechtsboven) tikt.
1. Vul je e-mailadres in en tik op **Stuur mij een code**.
2. Je krijgt een mail met een code van 6 cijfers. Typ die over in de app.

Waarom een code en geen link? Op de iPhone opent een link in de mail in Safari, niet in
de app op het beginscherm. Je zou dan in de app niet ingelogd zijn. Een code werkt overal.

Alleen e-mailadressen die de beheerder heeft toegevoegd kunnen inloggen.

## Instellingen in Supabase voor inloggen
Eenmalig, bij een nieuw project:
- **Authentication** > **Sign In / Providers**: **Allow new users to sign up** uit.
  Bij **Email**: **Email OTP Length** = 6 en **Email OTP Expiration** = `3600` (één
  uur; zo staat het in de mail).
- **Authentication** > **URL Configuration**: **Site URL** en bij **Redirect URLs**:
  `https://app.parkdestadshoeve.nl/`
- **Mail via Brevo** (de ingebouwde mail van Supabase stuurt maar 2 mails per uur):
  1. Brevo > je naam rechtsboven > **Senders, Domains & Dedicated IPs**: bij
     **Domains** staat parkdestadshoeve.nl met groene vinkjes; bij **Senders** staat
     het afzenderadres als "Verified".
  2. Brevo > je naam rechtsboven > **SMTP & API** > tabblad **SMTP**: noteer de
     **Login** (eindigt op `@smtp-brevo.com`) en klik op **Generate a new SMTP key**
     (naam `supabase-inlog`). De sleutel begint met `xsmtpsib-` en is **geheim**:
     plak hem alleen in stap 3. Een sleutel die met `xkeysib-` begint is de verkeerde
     soort.
  3. Supabase > **Authentication** > **Emails** > **SMTP Settings**: **Enable Custom
     SMTP** aan. Sender email = het afzenderadres uit stap 1, Sender name =
     `Park de Stadshoeve`, Host = `smtp-relay.brevo.com`, Port = `587`, Username = de
     Login uit stap 2, Password = de sleutel. **Save**.
  4. Melding "Error sending magic link email"? Kijk in Supabase > **Logs** > **Auth**.
     `535 Authentication failed` = Username of sleutel klopt niet: maak een nieuwe
     sleutel, plak opnieuw zonder spaties, en verwijder de oude in Brevo.
- **Mail met code:** Supabase > **Authentication** > **Emails** > **Templates** >
  **Magic Link**. Onderwerp: `Je inlogcode voor de app van Park de Stadshoeve`.
  Tekst (vervang alles):
  ```html
  <h2>Je inlogcode</h2>
  <p>Hallo,</p>
  <p>Vul deze code in de app in:</p>
  <p style="font-size:32px; font-weight:bold; letter-spacing:6px;">{{ .Token }}</p>
  <p>De code werkt één uur en maar één keer.</p>
  <p>Heb je niet geprobeerd in te loggen? Dan kun je deze mail negeren.</p>
  <p>Groet,<br>Park de Stadshoeve</p>
  ```
  `{{ .Token }}` wordt de code van 6 cijfers. Zet er geen link in: op de iPhone opent
  die in Safari en niet in de app.

## Het beheerscherm
Wie het vinkje beheerder heeft (`is_beheerder` in de tabel gebruikers), ziet rechtsboven
de knop **Beheer**. Daar staan alle gebruikers: naam, rol, werkgroepen en de vinkjes
"Beheerder" en "Krijgt mail bij gevaar". Wie gestopt is, staat onderaan.

- Terug naar de app: tik op een knop in het menu onderaan.
- Het beheerscherm werkt alleen met bereik. De lijst wordt (expres) niet op de
  telefoon bewaard.
- Zie je de knop niet, terwijl je wel beheerder bent? Log uit en weer in.
- **Iemand toevoegen:** tik op **+ Iemand toevoegen**. Vul het e-mailadres, de
  voornaam en de eerste letter van de achternaam in, kies rol en werkgroepen en tik
  op **Toevoegen**. Vergist? Tik meteen op **Ongedaan maken** (kan tot 10 minuten
  na het toevoegen, zolang de persoon nog niets heeft gedaan).
  De persoon krijgt **geen** mail. Laat het zelf weten, bijvoorbeeld zo:
  > Hoi Kees, je kunt nu de app van Park de Stadshoeve gebruiken. Open
  > https://app.parkdestadshoeve.nl op je telefoon, vul je
  > e-mailadres in en je krijgt een mail met een code om in te loggen. Zet de app daarna op je
  > beginscherm (uitleg in de app). Vragen? Bel of app mij.
- **Iemand wijzigen:** tik op **Wijzigen** bij de persoon. Je kunt het e-mailadres,
  de voornaam, de letter van de achternaam, de rol, de werkgroepen en de twee
  vinkjes aanpassen. Tik op **Opslaan**. Vergist? Tik meteen op **Ongedaan maken**.
- **Ander e-mailadres:** de persoon blijft ingelogd. Bij de volgende keer inloggen
  gebruikt hij of zij het nieuwe adres.
- **Na een wijziging van rol of werkgroep:** vraag de persoon de app helemaal af te
  sluiten en opnieuw te openen (of uit en weer in te loggen). Wat iemand mag, klopt
  meteen; de knoppen en schermen passen zich pas na opnieuw openen aan. Een nieuwe
  naam staat ook bij oude taken en meldingen.
- **Er blijft altijd minstens één beheerder.** Wil je je eigen vinkje uitzetten, maak
  dan eerst iemand anders beheerder. Advies: zorg voor twee beheerders.
- **Iemand laten stoppen:** tik op **Wijzigen** bij de persoon en helemaal onderaan
  op **Laten stoppen**. Dan gebeurt dit:
  - open taken op naam van de persoon staan weer open voor de werkgroep;
  - de vinkjes "Beheerder" en "Mail bij gevaar" gaan uit;
  - het inlogaccount en het e-mailadres worden verwijderd: inloggen kan niet meer;
  - de voornaam blijft bij oude taken en meldingen staan.
  Vergist? Tik meteen op **Ongedaan maken**: alles komt terug, ook de taken.
  Jezelf laten stoppen kan niet; vraag dat aan een andere beheerder.
- **Iemand weer laten meedoen:** onderaan de lijst staat wie gestopt is. Tik op
  **Weer laten meedoen** en vul het e-mailadres in. De persoon krijgt dezelfde naam
  en zijn of haar oude taken en meldingen terug. Rol en werkgroepen staan zoals
  vroeger; pas ze aan met **Wijzigen**. De vinkjes staan uit.
- **Foutmelding "Er ging iets mis" of "Geen verbinding" bij toevoegen, terwijl je
  wel bereik hebt?** Kijk dan of de Edge Function "beheer" bij Supabase staat (zie
  hieronder).

## E-mail bij een gevaarlijke melding
Meldt iemand iets als "gevaarlijk", dan krijgt iedereen met het vinkje **Krijgt mail
bij gevaar** (beheerscherm > Wijzigen) binnen een halve minuut een e-mail. Daarin
staan de plek, de toelichting, wie het meldde en wanneer, met een knop naar de app.
De foto staat er niet in (die zie je in de app, onder Meldingen). In het
meldformulier staat bij "Ja, gevaarlijk": "Is het acuut gevaarlijk? Stuur een
WhatsApp naar het bestuur." De mail is dus niet voor acute nood.

- **Wie krijgt de mail?** Iedereen die meedoet en het vinkje heeft. Zet het vinkje
  bij minstens één persoon aan (de coördinator), liefst bij twee.
- **Geen mail gekregen?** Kijk in Supabase > **Edge Functions** > **gevaar-mail** >
  **Logs**. Daar staat per melding hoeveel mails er verstuurd zijn, of wat er mis
  ging. De melding zelf staat altijd in de app.
- **Per melding gaat er hooguit één mail.** Wie binnen 6 seconden op Ongedaan maken
  tikt, veroorzaakt geen mail.

**Eén keer instellen** (pas als het domein bij Brevo is goedgekeurd):
1. Supabase > **Database** > **Extensions**: zoek `pg_net` en zet hem aan.
2. Voer `database/14_gevaar_mail.sql` uit.
3. Voer daarna dit uit, met het eerste stuk van je Supabase-adres (zie
   `instellingen.js`) in plaats van `<project>`:
   ```sql
   insert into app_instellingen (naam, waarde)
   values ('gevaar_mail_adres', 'https://<project>.supabase.co/functions/v1/gevaar-mail');
   ```
4. Voer `database/test_14_gevaar_mail.sql` uit: overal "goed".
5. Brevo > je naam rechtsboven > **SMTP & API** > tabblad **API Keys** > **Generate
   a new API key**, naam "gevaar-mail". Zet alleen de permissie voor
   transactionele mails (versturen) aan, de rest uit. De sleutel begint met
   `xkeysib-` (een andere soort dan voor de inlogmail). Kopieer de sleutel. Hij is **geheim**: plak
   hem alleen in stap 6, nergens anders.
6. Supabase > **Edge Functions** > **Secrets** (of Settings): voeg toe:
   - `BREVO_API_KEY` = de sleutel uit stap 5
   - `AFZENDER_EMAIL` = het afzenderadres op het domein (later app@parkdestadshoeve.nl)
   - `APP_ADRES` = `https://app.parkdestadshoeve.nl/` (de knop "Open de app" in de mail)
7. Zet de Edge Function neer, net als bij "beheer", maar met de naam `gevaar-mail`
   en de code uit `supabase/functions/gevaar-mail/index.ts`. Vul de naam in **vóór**
   je op **Deploy** tikt: Supabase verzint anders zelf een adres (bijv.
   `smooth-endpoint`) en dat verandert niet meer als je de naam later aanpast.
   Controleer bij **Details**: de **Endpoint URL** eindigt op
   `/functions/v1/gevaar-mail`. Klopt dat niet, zet de functie dan opnieuw neer en
   verwijder de verkeerde.
8. Zet bij **gevaar-mail** > **Details** het vinkje **Verify JWT** **uit**. De
   database roept deze functie aan zonder inlog. Dat is veilig: de functie leest
   alles zelf uit de database en mailt alleen over echte, nieuwe gevaarlijke
   meldingen, hooguit één keer.

## Back-up (één keer per maand)
De gratis versie van Supabase maakt zelf geen back-ups. Daarom maakt een beheerder
elke maand een back-up en zet die op de SharePoint van de stichting.

**Zo maak je een back-up:**
1. Open de app op een **computer** (niet op de telefoon) en log in als beheerder.
2. Tik op **Beheer** en scroll naar beneden naar **Back-up**.
3. Klik op **💾 Back-up downloaden**. Onderaan zie je "Foto's ophalen: 37 van 120".
   Laat het scherm open tot er "Back-up gedownload" staat. Met veel foto's kan dat
   een paar minuten duren. Daarna staat er een bestand
   `stadshoeve-backup-JJJJ-MM-DD.zip` in je map Downloads (na een jaar ongeveer
   150 à 300 MB).
4. Zet dat bestand in de **afgeschermde map op SharePoint** (alleen bestuur en
   beheerders kunnen erbij).
5. Verwijder in die map de oudste back-up, zodat er **3** overblijven.
6. Verwijder het bestand uit je map **Downloads** (en uit de prullenbak).

Het beheerscherm laat zien wanneer de laatste back-up is gemaakt, en waarschuwt
bovenaan als dat meer dan 31 dagen geleden is. Tip: zet ook een maandelijkse
herinnering in je agenda.

**Wat zit erin?** Alle gegevens van de app (werkgroepen, plekken, gebruikers, taken,
meldingen), de inlogaccounts (e-mailadressen) en alle foto's (map `fotos`). Het
bestand bevat dus persoonsgegevens: zet het nooit op GitHub, in een mail of op een
gedeelde plek. De knop om een back-up terug te zetten komt in de volgende stap.

**Melding "… foto('s) ontbreken"?** Dan lukte het ophalen van een paar foto's niet,
meestal door slecht internet. In `LEESMIJ.txt` in het zip-bestand staat welke.
Maak de back-up opnieuw met goed internet en gooi de onvolledige weg.

**Lukt het niet?** Kijk of de nieuwste versie van de Edge Function **beheer** bij
Supabase staat (zie hieronder) en of `database/12_backup.sql` is uitgevoerd.

## Back-up terugzetten (bij een ramp)
Alleen nodig als het Supabase-project weg, kapot of leeg is. Je zet de laatste
back-up dan terug in een **nieuw, leeg project**. Bij een kleine vergissing (één
verkeerde taak) zet je **geen** back-up terug: dan verlies je alles van na de
back-up. Herstel zo'n vergissing met de hand.

Terugzetten kan niet ongedaan gemaakt worden. Daarom werkt het alleen als er nog
geen taken en meldingen zijn, en jij de enige gebruiker bent.

**Stappenplan (op een computer):**
1. Maak bij Supabase een nieuw project (regio Frankfurt, Free).
2. Voer in de SQL Editor de bestanden `01` tot en met `18` uit de map `database` uit,
   in volgorde (zie `database/LEESMIJ.md`). Niet de test- en voorbeeldbestanden.
   Zet vóór `14` eerst `pg_net` aan (zie "E-mail bij een gevaarlijke melding").
3. Zet de Edge Functions **beheer** en **gevaar-mail** neer, met het adres in
   `app_instellingen` en de Secrets (zie "Edge Function beheer" en "E-mail bij een
   gevaarlijke melding"). Die staan niet in de back-up.
4. Stel inloggen in zoals bij "Instellingen in Supabase voor inloggen".
5. Zet in `instellingen.js` bij `PROD_ADRES` en `PROD_SLEUTEL` het adres en de
   publieke sleutel van het nieuwe project en zet die wijziging op `main`.
6. Zet jezelf met de hand neer (zie "Iemand toevoegen zonder beheerscherm"), met
   **jouw eigen e-mailadres**, rol `bestuur` en `is_beheerder` op `true`.
7. Open de app, log in en ga naar **Beheer** > **♻️ Back-up terugzetten**.
8. Klik op **📁 Kies het back-upbestand**, kies de nieuwste back-up van SharePoint en
   klik op **Terugzetten**. Je ziet de stappen voorbijkomen: gegevens, foto's,
   afronden. Laat het scherm open tot er "Klaar!" staat.
9. Klik op **Uitloggen** en log opnieuw in. Je bent nu weer "jezelf" uit de back-up.
10. Controleer: taken, meldingen, foto's, de lijst in het beheerscherm.
11. Laat iedereen weten dat de app weer werkt. Iedereen moet één keer opnieuw
    inloggen. Alles wat na de back-up is gedaan, is weg.

**Meldingen tijdens het terugzetten:**
- "Terugzetten kan alleen in een lege database": er staan al taken, meldingen of
  andere gebruikers in. Er is niets veranderd.
- "Deze inlogaccounts konden niet terug": laat die personen in het beheerscherm
  stoppen en daarna weer meedoen.
- "Deze foto's konden niet terug": nog een keer op Terugzetten klikken werkt dan niet
  meer (de database is niet meer leeg). Zet de foto's met de hand terug via
  Supabase > Storage > fotos, in het mapje met dezelfde naam als in het zip-bestand.

**Oefenen op het testproject** (doe dit één keer, en daarna eens per jaar):
1. Maak een verse back-up (en bewaar die goed).
2. Supabase > **Storage** > **fotos**: alle mapjes selecteren en verwijderen.
3. Open `database/herstel_leegmaken.sql`, controleer dat je in het **testproject**
   zit, haal de regel met `VEILIGHEIDSSLOT` weg en voer het uit.
4. Ga verder bij stap 6 van het stappenplan hierboven.

## Edge Function "beheer" (bij Supabase)
Toevoegen, e-mailadressen wijzigen, laten stoppen, weer laten meedoen en de back-up
gaan via een klein programma dat bij Supabase draait: de Edge Function **beheer**. De code staat in
`supabase/functions/beheer/index.ts`. Er staat geen geheime sleutel in: die geeft
Supabase zelf aan de functie.

**Eerste keer neerzetten (of na een wijziging in het bestand):**
1. Open het bestand `supabase/functions/beheer/index.ts` op GitHub en klik op het
   kopieer-icoon (**Copy raw file**).
2. Supabase > je project > **Edge Functions** > **Deploy a new function** >
   **Via Editor**. (Bij een wijziging: open de functie **beheer** > **Code**.)
3. Haal de voorbeeldcode weg en plak de gekopieerde code.
4. Naam van de functie: `beheer` (precies zo, kleine letters).
5. Klik op **Deploy function**. Na een halve minuut staat hij klaar.

Laat "Verify JWT" (controle van de inlog) aan staan. Krijg je bij toevoegen toch de
melding "Invalid JWT" of "Unauthorized"? Zet het dan bij **beheer** > **Details** uit.
Dat is veilig, want de functie controleert zelf of je ingelogd en beheerder bent.

**Werkt het niet?** Supabase > **Edge Functions** > **beheer** > **Logs** laat
zien wat er mis ging.

## Iemand toevoegen zonder beheerscherm (noodgeval)
Alleen nodig als het beheerscherm niet werkt, of om jezelf neer te zetten voor het
terugzetten van een back-up (zet dan `is_beheerder` op `true` in plaats van `false`).

1. Supabase > **Authentication** > **Users** > **Add user** > **Create new user**.
   Vul het e-mailadres in, kies een willekeurig lang wachtwoord (dat wordt nooit
   gebruikt, je hoeft het niet te bewaren) en zet **Auto Confirm User** aan.
2. **SQL Editor** > **New query**, vul de vier dingen tussen < > in en klik op **Run**:
   ```sql
   insert into gebruikers (id, voornaam, achternaam_letter, rol, is_beheerder)
   select id, '<Voornaam>', '<eerste letter achternaam>', '<vrijwilliger, bestuur of coordinator>', false
   from auth.users where email = '<e-mailadres>';

   insert into lidmaatschappen (gebruiker, werkgroep)
   select u.id, w.id from auth.users u, werkgroepen w
   where u.email = '<e-mailadres>' and w.naam in ('Klussen');
   ```
   Meerdere werkgroepen? Zet ze tussen de haakjes: `('Klussen', 'Tuinen')`.
3. Laat de persoon inloggen. Ziet hij of zij "Je account is nog niet klaar", dan is
   stap 2 niet gelukt.

Zet deze SQL met echte namen en adressen **nooit** in GitHub.

## Een taak laten vervallen (in plaats van verwijderen)
Is een taak niet meer nodig, of per ongeluk aangemaakt? Dan gooi je hem niet weg,
maar laat je hem **vervallen**. Zo blijft zichtbaar wat er gepland was en waarom het
niet doorging (ook later in het archief).

- **Wie?** Alleen bestuur en coördinator, en alleen bij een **open** taak. Een gereed
  gemelde taak zet je eerst weer open.
- **Hoe?** Tik bij de taak op **✏ Wijzigen**, helemaal onderaan op **Laten
  vervallen**, vul eventueel in waarom (niet verplicht) en tik nog een keer op
  **Laten vervallen**. Vergist? Tik meteen op **Ongedaan maken**.
- **Komt de taak uit een melding?** Dan staat de melding daarna weer op "Nieuw". Je
  kunt er opnieuw een taak van maken of hem op "Geen actie nodig" zetten.
- **Waar staan vervallen taken?** Onderaan **Werkgroep**, onder het kopje
  "Vervallen". Tik erop om ze te zien. Iedereen uit de werkgroep ziet ze, en kan een
  vervallen taak met **↺ Weer openen** terughalen. Stond de taak op naam van iemand
  die intussen gestopt is, dan is hij daarna weer vrij.
- **Echt verwijderen** kan niet meer (alleen vlak na het aanmaken, met Ongedaan
  maken).

## Opmerking bij een gereed gemelde taak
Bij een taak die gereed is gemeld, staat de knop **💬 Opmerking toevoegen**. Daar kan
de vrijwilliger kort opschrijven wat er gedaan is of nog nodig is (hooguit 500
tekens, niet verplicht). Wie de taak ziet, ziet ook de opmerking, met de naam van wie
hem schreef. Wijzigen of weghalen kan via **💬 Opmerking wijzigen** (vak leeg maken
en opslaan). Bij **Weer openen** verdwijnt de opmerking, net als de foto;
**Ongedaan maken** zet hem terug. Vraag vrijwilligers geen namen van bezoekers of
andere persoonsgegevens in de opmerking te zetten.

## Werken bij slecht bereik
De telefoon bewaart een kopie van de app. Is er bereik, dan haalt de app altijd eerst
de nieuwste versie op. Is er na 3 seconden nog niets, dan opent de bewaarde kopie.
Je hoeft na een wijziging dus niets bij te houden of op te hogen.
Na een wijziging in GitHub duurt het een minuut of twee voordat GitHub de nieuwe
versie online heeft. Daarna laadt de app de nieuwe versie vanzelf, de volgende keer
dat iemand de app weer voor zich haalt (ook als hij nog op de achtergrond openstond).
Is iemand op dat moment iets aan het invullen, dan verschijnt "Er is een nieuwe
versie van de app. Die wordt geladen als je klaar bent", en gebeurt het zodra die
persoon weer op Mijn taken, Werkgroep, Meldingen of Beheer is. Na het laden staat de
app op Mijn taken. Zie je de nieuwe versie na een paar minuten nog niet? Sluit de app
helemaal af en open hem opnieuw.
- **Nieuw bestand toegevoegd** (bijvoorbeeld een extra plaatje)? Zet de naam erbij in
  de lijst `APP_BESTANDEN` in `service-worker.js`.
- **Logo vervangen?** Vervang de drie bestanden in `iconen/` door nieuwe met precies
  dezelfde naam en maat. Op telefoons waar de app al staat, verandert het icoon pas
  na verwijderen en opnieuw op het beginscherm zetten.
- **Taken bij slecht bereik:** na elke keer ophalen bewaart de telefoon de takenlijst.
  Lukt ophalen niet binnen 8 seconden, dan zie je de bewaarde lijst, met bovenaan
  "Geen verbinding. Je ziet de lijst van 14:32." Bij uitloggen wordt die lijst gewist.
  Meldingen worden nog niet bewaard bij slecht bereik.

## Testtaken in het testproject
In `database/` staan twee voorbeeldbestanden, **alleen voor het testproject**:
- `voorbeeld_1_testvrijwilliger.sql`: maakt van een tweede e-mailadres een
  "Testvrijwilliger" in Klussen. Zo kun je zien wat een gewone vrijwilliger ziet.
- `voorbeeld_2_taken.sql`: zet elf verzonnen taken in de database.
Uitleg staat bovenin elk bestand.
- **Supabase-hulpbestand:** `inloggen.js` gebruikt een vaste versie (2.45.4) van
  internet. Die staat in `index.html` én in `service-worker.js`. Bij een nieuwe
  versie op beide plekken aanpassen.

## Plekken en werkgroepen (in het beheerscherm)
Tik op **Beheer** en kies bovenaan **Werkgroepen** of **Plekken**.

- **Toevoegen:** tik op **+ Werkgroep toevoegen** of **+ Plek toevoegen**, vul de naam
  in (bij een plek ook de standaard werkgroep) en tik op **Toevoegen**. Een nieuwe
  plek komt onderaan; zet hem met **▲ Omhoog** op de goede plek (bijvoorbeeld boven
  "Overig").
- **Naam of standaard werkgroep wijzigen:** tik op **Wijzigen**. Een nieuwe naam staat
  ook bij oude taken en meldingen.
- **Volgorde** van plekken en werkgroepen (zo staan de knoppen bij Melden, bij taken
  en op het scherm Werkgroep): tik op **▲ Omhoog** of **▼ Omlaag**. Een nieuwe
  werkgroep komt ook onderaan.
- **Niet meer gebruiken:** tik op **Wijzigen** en helemaal onderaan op **Uitzetten**.
  De werkgroep of plek verdwijnt uit de keuzes; oude taken en meldingen houden de
  naam. Bij een werkgroep zie je hoeveel mensen er nog in zitten, hoeveel open
  taken er zijn en welke plekken hem als standaard hebben. Zet die mensen en plekken
  daarna over (beheerscherm > Gebruikers of Plekken > Wijzigen) en geef de open
  taken een andere werkgroep (taak > Wijzigen) of laat ze vervallen. Tot die tijd
  zien de leden de werkgroep nog bij Werkgroep en kunnen ze lopende taken afmaken;
  nieuwe taken kunnen niet meer in die werkgroep. Een plek met een uitgezette
  werkgroep als standaard krijgt bij "Maak taak" geen werkgroep ingevuld.
- **Weer gebruiken:** onder "Uitgezet" > **Wijzigen** > **Weer aanzetten**.
- **Verwijderen** kan niet, omdat taken, meldingen en mensen eraan vastzitten.
- Vergist? Tik meteen op **Ongedaan maken**.
- Vrijwilligers zien een nieuwe plek of werkgroep de volgende keer dat hun lijst
  wordt ververst (bij een tik op Mijn taken of Werkgroep).
- **Onderdelen** (bijv. Hummelhoeve > Nestschommel) zitten nog niet in de app.

## Veelvoorkomende aanpassingen (in `app.js`)
- **Standaard deadline bij een melding:** `DAGEN_GEVAARLIJK` en `DAGEN_NORMAAL`.
- **Hoe lang "Ongedaan maken" zichtbaar is:** `MELDING_DUUR` (in milliseconden).
- **Grootte van foto's:** `FOTO_MAX_PIXELS` (langste kant, nu 1280) en
  `FOTO_KWALITEIT` (nu 0.8 = 80%). Groter = scherper, maar trager uploaden en
  meer opslagruimte nodig.

## Foto's en privacy
Elke foto wordt op de telefoon zelf verkleind, voordat hij verder gaat. Daarbij gaan
alle verborgen gegevens eruit, ook de plek waar de foto is gemaakt (gps), het merk
telefoon en de datum. Een foto van een paar MB wordt zo ongeveer 150–300 kB.
Let op: wat er óp de foto staat blijft natuurlijk wel staan. Daarom staat bij elke
fotoknop: "Fotografeer alleen het werk, geen mensen."

Foto's na afloop (bij taken):
- Ze staan in de afgesloten fotomap `fotos` in Supabase (Storage). Er is geen
  openbare link. Wie de taak mag zien, mag ook de foto zien.
- De app vraagt per foto een tijdelijke link aan die na een uur verloopt. Zonder
  bereik zie je bij de taak: "Er is een foto. Die zie je als je weer bereik hebt."
  Foto's worden niet op de telefoon bewaard.
- Lukt het versturen niet (slecht bereik), dan zegt de app dat. De taak blijft
  gereed gemeld; probeer de foto later opnieuw.
- Een vervangen of verwijderde foto blijft in de fotomap staan (voor "Ongedaan
  maken"). Ruim die maandelijks op: zie "Foto's opruimen" in `database/LEESMIJ.md`.

## Kleuren aanpassen (in `stijl.css`)
Alle kleuren staan bovenaan bij `:root`. Houd voldoende contrast, zodat alles buiten in
de zon leesbaar blijft.

## Supabase wakker houden
Een gratis Supabase-project gaat op pauze na een week zonder activiteit. Daarom roept
GitHub elke 3 dagen beide databases aan, PROD en DEV (de taak "Supabase wakker
houden").

- **Werkt het?** GitHub > tabblad **Actions** > **Supabase wakker houden**. Groen
  vinkje = gelukt. Klik erop: je ziet "ping PROD" en "ping DEV" apart.
- **Zelf starten:** op dezelfde plek op **Run workflow** klikken.
- **Mail "Run failed"?** Kijk in Supabase of het project op pauze staat ("Paused").
  Zo ja: klik op **Restore project** en wacht een paar minuten. Start daarna de
  taak met de hand.
- **Mail "scheduled workflow will be disabled"?** GitHub zet de taak uit als er
  60 dagen niets aan de code is veranderd. Ga naar **Actions** > **Supabase wakker
  houden** en klik op **Enable workflow**.
- **Wie krijgt de mails?** Degene die de taak het laatst heeft aangezet of aangepast.
  Nieuwe beheerder? Laat die de taak één keer uitzetten (**...** > **Disable
  workflow**) en weer aanzetten. Dan gaan de mails naar hem of haar.
- **Ander Supabase-project**? De taak leest de adressen uit `instellingen.js`
  (`PROD_...` en `DEV_...`), dus die gaat vanzelf mee. Voer wel `database/07_ping.sql` uit in
  het nieuwe project.

## Iets ging mis?
- **Pagina leeg na een wijziging?** Meestal een vergeten komma of haakje. Open het
  bestand in GitHub, klik op **History** en zet een eerdere versie terug.
- **Wijziging niet zichtbaar?** Wacht een à twee minuten en ververs de pagina.
- **Publiceren mislukt?** Kijk in GitHub onder **Actions**: rood kruisje = mislukt,
  groen vinkje = gelukt.

## Iemand anders beheerder maken
In GitHub: open de organisatie, kies **People** > **Invite member**, rol **Owner**.
