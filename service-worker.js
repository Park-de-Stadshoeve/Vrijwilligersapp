// Service worker: een klein stukje code dat de telefoon op de achtergrond bewaart.
// Het zorgt ervoor dat de app ook opent als er buiten op het park slecht bereik is.
//
// Werkwijze ("eerst internet, dan de kopie"):
// 1. De app probeert de nieuwste versie van internet te halen.
// 2. Lukt dat binnen WACHTTIJD, dan krijg je de nieuwste versie en wordt
//    de kopie op de telefoon meteen bijgewerkt.
// 3. Lukt dat niet (geen of slecht bereik), dan krijg je de laatst bewaarde kopie.
// Daardoor zie je na een wijziging in GitHub altijd de nieuwe versie zodra je bereik hebt.
// Staat de app nog open op de achtergrond? Dan merkt app.js de nieuwe versie op
// en vraagt hij dit bestand om alles vers op te halen (zie "message" hieronder).
//
// Let op: dit bewaart alleen de app zelf (schermen, kleuren, iconen),
// geen taken of meldingen uit de database.

// Naam van de opslag op de telefoon. Alleen veranderen als er iets raars gebeurt;
// dan wordt de oude kopie weggegooid en een nieuwe gemaakt.
const OPSLAG_NAAM = "stadshoeve-v1";

// Hoe lang we op internet wachten voordat we de kopie laten zien (in milliseconden).
const WACHTTIJD = 3000;

// De bestanden die samen de app vormen. Nieuw bestand toegevoegd? Zet het hier ook bij.
// Het hulpbestand van Supabase komt van een andere website (cdn.jsdelivr.net).
// Staat ook in index.html; bij een nieuwe versie op BEIDE plekken aanpassen.
const SUPABASE_HULPBESTAND = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

const APP_BESTANDEN = [
  "./",
  "index.html",
  "stijl.css",
  "instellingen.js",
  "inloggen.js",
  "beheer.js",
  "beheer-lijsten.js",
  "app.js",
  SUPABASE_HULPBESTAND,
  "manifest.json",
  "iconen/icoon-180.png",
  "iconen/icoon-192.png",
  "iconen/icoon-512.png"
];

// Bij de eerste keer: alle app-bestanden op de telefoon bewaren.
self.addEventListener("install", gebeurtenis => {
  gebeurtenis.waitUntil(
    caches.open(OPSLAG_NAAM).then(opslag => opslag.addAll(APP_BESTANDEN))
  );
  self.skipWaiting(); // nieuwe versie van dit bestand meteen gebruiken
});

// Oude opslag (met een andere naam) opruimen.
self.addEventListener("activate", gebeurtenis => {
  gebeurtenis.waitUntil(
    caches.keys().then(namen => Promise.all(
      namen.filter(naam => naam !== OPSLAG_NAAM).map(naam => caches.delete(naam))
    )).then(() => self.clients.claim())
  );
});

// Elke keer dat de app een bestand opvraagt.
self.addEventListener("fetch", gebeurtenis => {
  const verzoek = gebeurtenis.request;
  // Alleen gewone opvragingen van onze eigen website en het Supabase-hulpbestand.
  // De rest laten we met rust, vooral de database zelf: die moet altijd vers zijn.
  const vanOns = new URL(verzoek.url).origin === location.origin;
  if (verzoek.method !== "GET" || !(vanOns || verzoek.url === SUPABASE_HULPBESTAND)) return;
  gebeurtenis.respondWith(eerstInternetDanKopie(verzoek));
});

// De app vraagt dit als er een nieuwe versie is (zie "NIEUWE VERSIE" in
// app.js): haal alle app-bestanden vers op en bewaar ze, en zeg dan "klaar".
// Daarna herlaadt de app, en krijgt hij zeker de nieuwe bestanden.
self.addEventListener("message", gebeurtenis => {
  if (gebeurtenis.data !== "haal-nieuwe-versie") return;
  const antwoordPoort = gebeurtenis.ports[0];
  gebeurtenis.waitUntil(haalAlleBestandenVers().then(() => {
    if (antwoordPoort) antwoordPoort.postMessage("klaar");
  }));
});

async function haalAlleBestandenVers() {
  const opslag = await caches.open(OPSLAG_NAAM);
  await Promise.all(APP_BESTANDEN.map(async bestand => {
    try {
      const antwoord = await fetch(bestand, { cache: "no-cache" });
      if (antwoord.ok) await opslag.put(bestand, antwoord);
    } catch (fout) {
      // Geen bereik voor dit bestand: dan blijft de oude kopie staan
    }
  }));
}

async function eerstInternetDanKopie(verzoek) {
  const opslag = await caches.open(OPSLAG_NAAM);

  // Vraag het bestand op bij internet en bewaar een kopie als het lukt.
  // cache: "no-cache" = altijd even bij GitHub navragen of er een nieuwere
  // versie is. Zonder dit mag de telefoon een bestand nog 10 minuten
  // gebruiken zonder te vragen, en zie je een nieuwe versie pas later.
  const vanInternet = fetch(verzoek.url, { cache: "no-cache" }).then(antwoord => {
    if (antwoord.ok) opslag.put(verzoek, antwoord.clone());
    return antwoord;
  });

  // Wacht maximaal WACHTTIJD op internet.
  const teLaat = new Promise(klaar => setTimeout(() => klaar(null), WACHTTIJD));
  const antwoord = await Promise.race([vanInternet, teLaat]).catch(() => null);
  if (antwoord) return antwoord;

  // Geen (snel) antwoord: geef de bewaarde kopie. "ignoreSearch" zorgt dat
  // ook de link met ?rol=bestuur de bewaarde index.html vindt.
  const kopie = await opslag.match(verzoek, { ignoreSearch: true });
  // Geen kopie? Dan toch blijven wachten op internet.
  return kopie || vanInternet;
}
