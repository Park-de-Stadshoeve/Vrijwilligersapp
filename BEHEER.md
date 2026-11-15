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
- **Online:** https://park-de-stadshoeve.github.io/Vrijwilligersapp/
- **Database:** Supabase, project `vrijwilligersapp-test` (alleen testgegevens).

## Welk bestand doet wat?
| Bestand | Wat staat erin | Wanneer pas je het aan? |
|---|---|---|
| `index.html` | Het geraamte: kopbalk, middenruimte, menu onderaan | Zelden |
| `stijl.css` | Het uiterlijk: kleuren, groottes, knoppen | Kleur of tekstgrootte veranderen |
| `app.js` | De logica, taken ophalen uit de database, de voorbeeldmeldingen | Plekken, werkgroepen, termijnen |
| `instellingen.js` | Adres en publieke sleutel van de database | Bij een andere database (bijv. van test naar echt) |
| `beheer.js` | Het beheerscherm (knop "Beheer", alleen voor beheerders) | Zelden |
| `inloggen.js` | Inlogscherm met code uit de mail, uitloggen, "wie ben ik" | Zelden |
| `CLAUDE.md` | Instructies voor Claude en de stand van zaken | Als er afspraken veranderen |
| `DATABASE.md` | Ontwerp van de database: welke gegevens, wie mag wat | Als de opbouw of de rechten veranderen |
| `database/` | De SQL-bestanden die de database opbouwen (uitleg in `database/LEESMIJ.md`) | Alleen bij het opzetten van een nieuwe database |
| `manifest.json` | Naam, icoon en kleur van de app op het beginscherm | Andere naam of kleur |
| `service-worker.js` | Bewaart de app op de telefoon voor slecht bereik | Als je een bestand toevoegt |
| `iconen/` | Het logo in drie maten (180, 192 en 512 pixels) | Nieuw logo |
| `supabase/functions/beheer/` | Edge Function: iemand toevoegen en e-mailadres wijzigen (draait bij Supabase) | Zelden; daarna opnieuw plakken bij Supabase |
| `.github/workflows/` | Automatische taak die de database wakker houdt | Zelden |

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
  Bij **Email**: **Email OTP Length** = 6.
- **Authentication** > **URL Configuration**: **Site URL** en bij **Redirect URLs**:
  `https://park-de-stadshoeve.github.io/Vrijwilligersapp/`
- **Mail met code:** de tekst van de mail (template "Magic Link") kan pas worden
  aangepast met een eigen e-maildienst (Brevo, nog te regelen). Tot die tijd bevat de
  mail een link in plaats van een code. Die link werkt op een computer en in Chrome op
  Android, maar niet in de app op het beginscherm van een iPhone.

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
  > https://park-de-stadshoeve.github.io/Vrijwilligersapp/ op je telefoon, vul je
  > e-mailadres in en je krijgt een mail om in te loggen. Zet de app daarna op je
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

## Edge Function "beheer" (bij Supabase)
Toevoegen, e-mailadressen wijzigen, laten stoppen en weer laten meedoen gaat via een
klein programma dat bij Supabase draait: de Edge Function **beheer**. De code staat in
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
Alleen nodig als het beheerscherm niet werkt.

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

## Werken bij slecht bereik
De telefoon bewaart een kopie van de app. Is er bereik, dan haalt de app altijd eerst
de nieuwste versie op. Is er na 3 seconden nog niets, dan opent de bewaarde kopie.
Je hoeft na een wijziging dus niets bij te houden of op te hogen.
Na een wijziging in GitHub duurt het een minuut of twee voordat GitHub de nieuwe
versie online heeft. Daarna krijgt de telefoon hem bij de volgende keer openen. Zie
je hem nog niet? Sluit de app helemaal af (niet alleen wegvegen naar de achtergrond)
en open hem opnieuw.
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

## Plekken en werkgroepen (in Supabase, niet in de code)
Tot het beheerscherm er is, doe je dit in Supabase > **Table Editor**:
- **Plek toevoegen:** tabel `plekken` > **Insert row**. Vul `naam` in, bij
  `standaard_werkgroep` het nummer van de werkgroep die er meestal bij hoort (zie
  tabel `werkgroepen`, kolom `id`), en bij `volgorde` een getal: de knoppen staan op
  volgorde van klein naar groot ("Overig" heeft 999, dus blijft achteraan).
- **Plek of werkgroep niet meer gebruiken:** zet `actief` op false. Niet
  verwijderen: oude taken en meldingen verwijzen er nog naar (en laten de naam
  nog zien).
- **Werkgroep toevoegen:** tabel `werkgroepen` > **Insert row**, alleen `naam`.
De app haalt de nieuwe lijst op bij de volgende keer openen.

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
GitHub elke 3 dagen de database aan (de taak "Supabase wakker houden").

- **Werkt het?** GitHub > tabblad **Actions** > **Supabase wakker houden**. Groen
  vinkje = gelukt.
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
- **Ander Supabase-project** (bijv. van test naar echt)? De taak leest het adres uit
  `instellingen.js`, dus die gaat vanzelf mee. Voer wel `database/07_ping.sql` uit in
  het nieuwe project.

## Iets ging mis?
- **Pagina leeg na een wijziging?** Meestal een vergeten komma of haakje. Open het
  bestand in GitHub, klik op **History** en zet een eerdere versie terug.
- **Wijziging niet zichtbaar?** Wacht een à twee minuten en ververs de pagina.
- **Publiceren mislukt?** Kijk in GitHub onder **Actions**: rood kruisje = mislukt,
  groen vinkje = gelukt.

## Iemand anders beheerder maken
In GitHub: open de organisatie, kies **People** > **Invite member**, rol **Owner**.
