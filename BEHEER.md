# Beheerhandleiding Vrijwilligersapp

Deze handleiding is voor de beheerder van de app. Je hoeft geen programmeur te zijn.
Stand: inloggen werkt met de database (Supabase). De taken komen uit de database.
"Ik doe dit", "Teruggeven", "Gereed melden", "Weer openen" en toewijzen met de
keuzelijst (bestuur) worden bewaard. In de keuzelijst staan eerst de leden van de
werkgroep van de taak, dan alle anderen; wie gestopt is staat er niet in.
Nog NIET bewaard (alleen bestuur ziet deze knoppen): nieuwe taak en wijzigen.
Foto's na afloop bij taken staan tijdelijk uit.
Meldingen zijn nog voorbeeldgegevens.

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
| `inloggen.js` | Inlogscherm met code uit de mail, uitloggen, "wie ben ik" | Zelden |
| `CLAUDE.md` | Instructies voor Claude en de stand van zaken | Als er afspraken veranderen |
| `DATABASE.md` | Ontwerp van de database: welke gegevens, wie mag wat | Als de opbouw of de rechten veranderen |
| `database/` | De SQL-bestanden die de database opbouwen (uitleg in `database/LEESMIJ.md`) | Alleen bij het opzetten van een nieuwe database |
| `manifest.json` | Naam, icoon en kleur van de app op het beginscherm | Andere naam of kleur |
| `service-worker.js` | Bewaart de app op de telefoon voor slecht bereik | Als je een bestand toevoegt |
| `iconen/` | Het logo in drie maten (180, 192 en 512 pixels) | Nieuw logo |

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

## Iemand toevoegen (tijdelijk, tot het beheerscherm er is)
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

## Veelvoorkomende aanpassingen (in `app.js`)
- **Plek op het park toevoegen:** in de lijst `PLEKKEN` (vóór "Overig"), en in
  `PLEK_WERKGROEP` bij welke werkgroep hij hoort.
- **Werkgroep toevoegen:** in de lijst `alleWerkgroepen`. Let op exact dezelfde spelling.
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

## Kleuren aanpassen (in `stijl.css`)
Alle kleuren staan bovenaan bij `:root`. Houd voldoende contrast, zodat alles buiten in
de zon leesbaar blijft.

## Iets ging mis?
- **Pagina leeg na een wijziging?** Meestal een vergeten komma of haakje. Open het
  bestand in GitHub, klik op **History** en zet een eerdere versie terug.
- **Wijziging niet zichtbaar?** Wacht een à twee minuten en ververs de pagina.
- **Publiceren mislukt?** Kijk in GitHub onder **Actions**: rood kruisje = mislukt,
  groen vinkje = gelukt.

## Iemand anders beheerder maken
In GitHub: open de organisatie, kies **People** > **Invite member**, rol **Owner**.
