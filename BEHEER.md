# Beheerhandleiding Vrijwilligersapp

Deze handleiding is voor de beheerder van de app. Je hoeft geen programmeur te zijn.
De app is nog een ontwerp: alle gegevens zijn verzonnen en er wordt niets bewaard.

## Waar staat de app?
- **Code:** GitHub, organisatie `park-de-stadshoeve`, repository `Vrijwilligersapp`.
- **Online:** https://park-de-stadshoeve.github.io/Vrijwilligersapp/
- **Bestuursversie (demo):** dezelfde link met `?rol=bestuur` erachter.

## Welk bestand doet wat?
| Bestand | Wat staat erin | Wanneer pas je het aan? |
|---|---|---|
| `index.html` | Het geraamte: kopbalk, middenruimte, menu onderaan | Zelden |
| `stijl.css` | Het uiterlijk: kleuren, groottes, knoppen | Kleur of tekstgrootte veranderen |
| `app.js` | De logica en de voorbeeldgegevens | Plekken, werkgroepen, termijnen |
| `CLAUDE.md` | Instructies voor Claude en de stand van zaken | Als er afspraken veranderen |
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

## Werken bij slecht bereik
De telefoon bewaart een kopie van de app. Is er bereik, dan haalt de app altijd eerst
de nieuwste versie op. Is er na 3 seconden nog niets, dan opent de bewaarde kopie.
Je hoeft na een wijziging dus niets bij te houden of op te hogen.
- **Nieuw bestand toegevoegd** (bijvoorbeeld een extra plaatje)? Zet de naam erbij in
  de lijst `APP_BESTANDEN` in `service-worker.js`.
- **Logo vervangen?** Vervang de drie bestanden in `iconen/` door nieuwe met precies
  dezelfde naam en maat. Op telefoons waar de app al staat, verandert het icoon pas
  na verwijderen en opnieuw op het beginscherm zetten.
- Taken en meldingen worden nog niet bewaard bij slecht bereik. Dat komt later.

## Veelvoorkomende aanpassingen (in `app.js`)
- **Plek op het park toevoegen:** in de lijst `PLEKKEN` (vóór "Overig"), en in
  `PLEK_WERKGROEP` bij welke werkgroep hij hoort.
- **Werkgroep toevoegen:** in de lijst `alleWerkgroepen`. Let op exact dezelfde spelling.
- **Standaard deadline bij een melding:** `DAGEN_GEVAARLIJK` en `DAGEN_NORMAAL`.
- **Hoe lang "Ongedaan maken" zichtbaar is:** `MELDING_DUUR` (in milliseconden).

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
