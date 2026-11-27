// ===== HULP =====
// De knop "Hulp" rechtsboven opent een venster met uitleg bij het scherm waar
// je op dat moment bent. De tekst komt uit HANDLEIDING.md: zo is er maar één
// tekst om bij te houden. Pas je de handleiding aan, dan verandert de hulp in
// de app vanzelf mee.
//
// Waarom een venster en geen apart scherm? Een venster ligt BOVENOP het scherm.
// Sluit je het, dan staat alles er nog, ook een half ingevuld formulier met foto.
//
// Hoe vindt de app het juiste stuk? Hieronder staat per scherm welk kopje uit
// HANDLEIDING.md erbij hoort. De app neemt dat kopje met alles eronder, tot
// het volgende kopje van dezelfde soort. Verander je in HANDLEIDING.md de tekst
// van een kopje, verander hem dan hier ook.

const HULP_BESTAND = "HANDLEIDING.md";

// Per scherm: de kopjes die iedereen ziet.
// (De namen links zijn de schermnamen uit app.js, zie toonScherm.)
const HULP_PER_SCHERM = {
  "inloggen":       ["Inloggen"],
  "mijn":           ["Taken"],
  "werkgroep":      ["Taken"],
  "melden":         ["Een gebrek melden"],
  "meldingen":      ["Wat gebeurt er met je melding?"]
};

// Per scherm: kopjes die alleen bestuur en coördinator zien (komen bovenaan).
const HULP_VOOR_BESTUUR = {
  "mijn":           ["Taken maken en wijzigen"],
  "werkgroep":      ["Taken maken en wijzigen"],
  "taak-formulier": ["Taken maken en wijzigen"],
  "meldingen":      ["Meldingen afhandelen"]
};

// Dit kopje komt onder elke hulp (behalve bij het inloggen)
const HULP_ALTIJD = "Handig om te weten";

// Dit deel van de handleiding zien vrijwilligers nooit, ook niet bij "Hele handleiding"
const HULP_ALLEEN_BESTUUR = "Voor het bestuur";

// Schermen van het beheerscherm: daar is een aparte uitleg voor beheerders
const BEHEER_SCHERMEN = ["beheer", "gebruiker-formulier", "herstel", "lijst-formulier"];

let handleidingRegels = null;   // de handleiding, regel voor regel (na de eerste keer laden)

// ----- Venster openen en sluiten -----

const hulpVenster = document.getElementById("hulp-venster");
const hulpTekst = document.getElementById("hulp-tekst");
const knopHeleHandleiding = document.getElementById("knop-hele-handleiding");

document.getElementById("knop-hulp").addEventListener("click", () => openHulp(false));
document.getElementById("knop-hulp-sluiten").addEventListener("click", () => hulpVenster.close());
knopHeleHandleiding.addEventListener("click", () => openHulp(true));

// Opent het venster. heleHandleiding = true: alles laten zien, niet alleen dit scherm.
async function openHulp(heleHandleiding) {
  if (!hulpVenster.open) hulpVenster.showModal();   // showModal = venster bovenop alles
  knopHeleHandleiding.hidden = heleHandleiding;

  // Eerste keer: de handleiding ophalen. Zonder bereik komt hij uit de kopie
  // op het toestel (de service worker bewaart HANDLEIDING.md mee).
  if (!handleidingRegels) {
    zetHulpBericht("Hulp laden…");
    try {
      const antwoord = await fetch(HULP_BESTAND);
      if (!antwoord.ok) throw new Error("status " + antwoord.status);
      const tekst = await antwoord.text();
      // Uitleg voor de beheerder (tussen <!-- en -->) hoort niet in de app
      handleidingRegels = tekst.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
    } catch (fout) {
      zetHulpBericht("De hulp kon niet worden geladen. Controleer of je internet hebt en probeer het opnieuw.");
      return;
    }
  }

  hulpTekst.replaceChildren(maakHulpTekst(kiesHulpRegels(heleHandleiding)));
  if (BEHEER_SCHERMEN.includes(huidigScherm) && isIngelogd() && !heleHandleiding) {
    const p = document.createElement("p");
    p.textContent = "Uitleg over het beheerscherm staat in BEHEER.md, de handleiding voor beheerders.";
    hulpTekst.prepend(p);
  }
  hulpTekst.scrollTop = 0;   // altijd bovenaan beginnen
}

// Zet één zin in het venster (laden of fout)
function zetHulpBericht(tekst) {
  const p = document.createElement("p");
  p.className = "leeg";
  p.textContent = tekst;
  hulpTekst.replaceChildren(p);
}

// ----- Welke tekst hoort erbij? -----

function isIngelogd() {
  return ingelogdeGebruiker.id !== null;   // ingelogdeGebruiker staat in app.js
}

function isBestuur() {
  return isIngelogd() && ingelogdeGebruiker.magAllesZien;
}

// Geeft de regels uit de handleiding die bij dit scherm horen
function kiesHulpRegels(heleHandleiding) {
  // Alles, behalve (voor vrijwilligers) het deel voor het bestuur
  if (heleHandleiding) {
    const bestuursDeel = zoekBereik(HULP_ALLEEN_BESTUUR);
    if (isBestuur() || !bestuursDeel) return handleidingRegels;
    // Knip het deel voor het bestuur eruit: alles ervoor plus alles erna
    return handleidingRegels.slice(0, bestuursDeel.begin)
      .concat(handleidingRegels.slice(bestuursDeel.eind));
  }

  // Nog niet ingelogd? Dan alleen de uitleg over inloggen.
  if (!isIngelogd()) return zoekStukken(HULP_PER_SCHERM["inloggen"]);

  const kopjes = [];
  if (isBestuur()) kopjes.push(...(HULP_VOOR_BESTUUR[huidigScherm] || []));
  kopjes.push(...(HULP_PER_SCHERM[huidigScherm] || []));
  kopjes.push(HULP_ALTIJD);
  return zoekStukken(kopjes);
}

// Zoekt meerdere kopjes op en zet ze achter elkaar
function zoekStukken(kopjes) {
  const regels = [];
  kopjes.forEach(kopje => regels.push(...zoekStuk(kopje), ""));
  return regels;
}

// Zoekt één kopje op. Geeft het kopje met alles eronder, tot het volgende
// kopje van dezelfde of een hogere soort (## stopt bij ##, ### stopt bij ## of ###).
// Niet gevonden? Dan een lege lijst (de rest van de hulp werkt gewoon).
function zoekStuk(kopje) {
  const bereik = zoekBereik(kopje);
  return bereik ? handleidingRegels.slice(bereik.begin, bereik.eind) : [];
}

// Waar staat een kopje? Geeft { begin, eind } (regelnummers; eind telt niet
// meer mee), of null als het kopje niet bestaat.
function zoekBereik(kopje) {
  const begin = handleidingRegels.findIndex(regel => {
    const kop = leesKop(regel);
    return kop && kop.tekst === kopje;
  });
  if (begin === -1) return null;
  const niveau = leesKop(handleidingRegels[begin]).niveau;
  let eind = begin + 1;
  while (eind < handleidingRegels.length) {
    const kop = leesKop(handleidingRegels[eind]);
    if (kop && kop.niveau <= niveau) break;
    eind++;
  }
  return { begin, eind };
}

// Is deze regel een kopje? Dan { niveau: aantal #, tekst }; anders null.
function leesKop(regel) {
  const delen = regel.match(/^(#{1,3})\s+(.*)$/);
  return delen ? { niveau: delen[1].length, tekst: delen[2].trim() } : null;
}

// ----- Van tekst naar scherm -----
// HANDLEIDING.md is geschreven in "Markdown": gewone tekst met een paar
// tekens voor opmaak. Hieronder zetten we die om naar het scherm. We kennen
// alleen wat de handleiding gebruikt:
//   # / ## / ###      kopje
//   **woord**         vet
//   1. tekst          genummerde lijst
//   - tekst           lijst met streepjes
//   | a | b |         tabel
//   lege regel        nieuwe alinea
// Alle tekst gaat via textContent op het scherm, dus nooit als code. Zo kan
// er niets misgaan, ook niet met een vreemd teken in de handleiding.

function maakHulpTekst(regels) {
  const geheel = document.createDocumentFragment();
  let alinea = null;   // de alinea waar we nu tekst aan toevoegen
  let lijst = null;    // de lijst (ol of ul) waar we nu in zitten
  let tabel = null;    // de tabel waar we nu in zitten

  // Een blok is klaar: daarna begint iets nieuws
  function sluitAf() { alinea = null; lijst = null; tabel = null; }

  regels.forEach(regel => {
    const kop = leesKop(regel);
    const nummer = regel.match(/^\d+\.\s+(.*)$/);
    const streepje = regel.match(/^[-*]\s+(.*)$/);

    if (regel.trim() === "") {
      sluitAf();
    } else if (kop) {
      sluitAf();
      const h = document.createElement(kop.niveau === 3 ? "h3" : "h2");
      zetTekst(h, kop.tekst);
      geheel.append(h);
    } else if (regel.trim().startsWith("|")) {
      // Tabel. De regel met alleen streepjes (|---|---|) is alleen opmaak.
      if (/^\|[\s|:-]+\|$/.test(regel.trim())) return;
      const cellen = regel.trim().replace(/^\||\|$/g, "").split("|");
      const eersteRij = !tabel;
      if (eersteRij) {
        alinea = null; lijst = null;
        tabel = document.createElement("table");
        tabel.className = "hulp-tabel";
        geheel.append(tabel);
      }
      const rij = document.createElement("tr");
      cellen.forEach(cel => {
        const vak = document.createElement(eersteRij ? "th" : "td");
        zetTekst(vak, cel.trim());
        rij.append(vak);
      });
      tabel.append(rij);
    } else if (nummer || streepje) {
      const soort = nummer ? "OL" : "UL";
      if (!lijst || lijst.tagName !== soort) {
        alinea = null; tabel = null;
        lijst = document.createElement(soort.toLowerCase());
        geheel.append(lijst);
      }
      const punt = document.createElement("li");
      zetTekst(punt, (nummer || streepje)[1]);
      lijst.append(punt);
    } else if (lijst && /^\s/.test(regel)) {
      // Ingesprongen regel: hoort nog bij het laatste lijstpunt
      zetTekst(lijst.lastElementChild, " " + regel.trim());
    } else {
      // Gewone tekst: bij de alinea die er al is, of een nieuwe beginnen
      lijst = null; tabel = null;
      if (!alinea) {
        alinea = document.createElement("p");
        geheel.append(alinea);
      } else {
        alinea.append(" ");
      }
      zetTekst(alinea, regel.trim());
    }
  });
  return geheel;
}

// Voegt tekst toe aan een element; wat tussen ** staat wordt vet.
// "Tik op **Ik doe dit**." -> "Tik op ", vet "Ik doe dit", "."
function zetTekst(element, tekst) {
  tekst.split("**").forEach((stuk, plaats) => {
    if (stuk === "") return;
    if (plaats % 2 === 1) {   // oneven stukken stonden tussen **
      const vet = document.createElement("strong");
      vet.textContent = stuk;
      element.append(vet);
    } else {
      element.append(stuk);
    }
  });
}
