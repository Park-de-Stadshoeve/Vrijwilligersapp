// Logica van de Vrijwilligersapp: gegevens, schermen en wat er gebeurt na een tik.
// Dit bestand wordt geladen door index.html, helemaal onderaan.

// ===== VOORBEELDGEGEVENS =====
// Tijdelijk: later komen deze uit de database.
// Gebruik hier NOOIT echte namen: deze code is openbaar.

// Wie is er ingelogd? Wordt ingevuld door startApp (onderaan), na het
// inloggen. Naam, rol en werkgroepen komen uit de database (zie inloggen.js).
const ingelogdeGebruiker = {
  id: null,
  naam: "",
  werkgroepen: [],
  magAllesZien: false,  // true = bestuur of coördinator
  isBeheerder: false,
  isFrion: false        // Frion valt voorlopig buiten de app
};

// Alle werkgroepen. Komen uit de database (zie haalTakenOp).
let alleWerkgroepen = [];

// Alle actieve gebruikers met hun werkgroepen, voor de keuzelijst bij toewijzen.
// Komt uit de database (zie haalTakenOp). Alleen bestuur en coördinator
// krijgen deze lijst; voor anderen blijft hij leeg.
// Vorm: { id: "…", naam: "Piet", werkgroepen: ["Dieren"] }
let personen = [];

// De taken. Deze lijst is eerst leeg. Na het inloggen vult haalTakenOp hem
// met de taken uit de database (zie "TAKEN UIT DE DATABASE", verderop).
// Komt een taak uit een melding, dan staan foto ("meldingFotoPad"),
// toelichting en melder van die melding erbij.
const taken = [];

// Plekken op het park, voor "Waar is het?" (bij meldingen én taken), in de
// volgorde van de knoppen. Komen uit de database (zie haalTakenOp); de
// beheerder past ze daar aan, niet hier.
let plekNamen = [];          // bijv. ["Stal", "Weides", …, "Overig"]
let werkgroepBijPlek = {};   // bij welke werkgroep hoort een plek meestal? bijv. { "Stal": "Dieren" }

// De database werkt met nummers. Deze opzoektabellen zetten een naam om in
// het nummer, bijv. plekNummer["Stal"] = 1. Nodig bij het bewaren van een taak.
let plekNummer = {};
let werkgroepNummer = {};

// De meldingen. Eerst leeg; haalTakenOp vult de lijst uit de database.
// Vrijwilligers krijgen alleen hun eigen meldingen, bestuur en coördinator alle.
// taakId = het nummer van de taak die van deze melding is gemaakt (null = nog geen taak).
// status = "Nieuw", "Taak gemaakt", "Toegewezen", "Gereed" of "Geen actie nodig"
//          (rekent de database uit, zie melding_status in 03_rechten.sql).
const meldingen = [];


// Hoe lang we wachten op het versturen van een foto (30000 = 30 seconden).
// Langer dan bij andere acties: een foto is groter.
const WACHTTIJD_FOTO = 30000;

// Hoe lang we een tijdelijke fotolink gebruiken (in milliseconden: 55 minuten).
// De link zelf verloopt na een uur; we vragen ruim op tijd een nieuwe aan.
const FOTO_LINK_GELDIG = 55 * 60 * 1000;

// Hoe lang de melding "Ongedaan maken" zichtbaar blijft (in milliseconden: 6000 = 6 seconden)
const MELDING_DUUR = 6000;

// Standaard deadline voor een nieuwe taak (in dagen vanaf vandaag)
const DAGEN_GEVAARLIJK = 1;    // morgen
const DAGEN_NORMAAL = 14;      // over twee weken

// Foto's worden op de telefoon verkleind voordat ze verder gaan (zie verkleinFoto).
const FOTO_MAX_PIXELS = 1280;  // langste kant van de foto, in pixels
const FOTO_KWALITEIT = 0.8;    // 0.8 = 80%: kleiner bestand, verschil nauwelijks te zien

// ===== HULPFUNCTIES =====

// De datum van vandaag, in dezelfde vorm als de deadlines ("2026-10-11")
const vandaag = new Date().toISOString().slice(0, 10);

// De datum over een aantal dagen, in dezelfde vorm
function datumOver(dagen) {
  const datum = new Date();
  datum.setDate(datum.getDate() + dagen);
  return datum.toISOString().slice(0, 10);
}

// Zet "2026-10-14" om in "di 14 okt"
function leesbareDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

// Maakt een lange tekst kort ("Splinter in de leuning van de tr…")
function kortTekst(tekst, maximum) {
  return tekst.length > maximum ? tekst.slice(0, maximum).trim() + "…" : tekst;
}

// Zoekt een taak op aan de hand van zijn nummer
function vindTaak(id) {
  return taken.find(taak => taak.id === id);
}


// Volgorde taken: open eerst, daarna op deadline (vroegste bovenaan)
function sorteerTaken(a, b) {
  if (a.status !== b.status) return a.status === "open" ? -1 : 1;
  // Een taak zonder datum komt onderaan ("9999" komt na elke echte datum)
  return (a.deadline || "9999").localeCompare(b.deadline || "9999");
}

// Onder welke naam wijs je een taak aan jezelf toe?
// (Wordt ingevuld door startApp, na het inloggen.)
let mijnToewijsNaam = "";

// Is deze taak van mij? (We vergelijken het nummer, niet de naam: er
// kunnen twee mensen met dezelfde voornaam zijn.)
function isMijnTaak(taak) {
  return Boolean(taak.toegewezenAanId) && taak.toegewezenAanId === ingelogdeGebruiker.id;
}

// De naam van iemand uit de lijst personen ("" als we hem niet kennen)
function naamVanPersoon(id) {
  const persoon = personen.find(p => p.id === id);
  return persoon ? persoon.naam : "";
}

// Mag de ingelogde gebruiker deze taak gereed melden?
function magGereedMelden(taak) {
  return ingelogdeGebruiker.magAllesZien
    || ingelogdeGebruiker.werkgroepen.includes(taak.werkgroep)
    || isMijnTaak(taak);
}

// Mag ik deze taak zelf oppakken met "Ik doe dit"?
function magZelfOppakken(taak) {
  return taak.status === "open"
    && !taak.toegewezenAan
    && ingelogdeGebruiker.werkgroepen.includes(taak.werkgroep);
}

// Maakt een eenvoudige tweede knop (met rand)
function maakTweedeKnop(tekst, actie) {
  const knop = document.createElement("button");
  knop.className = "knop-tweede";
  knop.textContent = tekst;
  knop.addEventListener("click", actie);
  return knop;
}

// Maakt een grote hoofdknop
function maakHoofdKnop(tekst, actie) {
  const knop = document.createElement("button");
  knop.className = "knop-gereed";
  knop.textContent = tekst;
  knop.addEventListener("click", actie);
  return knop;
}

// Foto met een kort bijschrift erboven ("Foto bij melding", "Foto na afloop")
function maakFotoMetLabel(url, bijschrift, alt) {
  const blok = document.createElement("div");
  const label = document.createElement("p");
  label.className = "details foto-label";
  label.textContent = bijschrift;
  const foto = document.createElement("img");
  foto.className = "foto";
  foto.src = url;
  foto.alt = alt;
  blok.append(label, foto);
  return blok;
}

// Maakt een foto-knop die je overal kunt gebruiken.
// "bijFoto" is een functie die bepaalt wat er met de gekozen foto gebeurt.
function maakFotoKnop(knopTekst, bijFoto) {
  const blok = document.createElement("div");

  const label = document.createElement("label");
  label.className = "knop-foto";
  const knopTekstVak = document.createElement("span"); // apart, zodat we de tekst kunnen wisselen
  knopTekstVak.textContent = knopTekst;

  // Privacy-tip, in gewone taal. Hier komt ook een foutmelding als het misgaat.
  const tip = document.createElement("p");
  tip.className = "foto-tip";
  const TIP_TEKST = "Fotografeer alleen het werk, geen mensen.";
  tip.textContent = TIP_TEKST;

  const invoer = document.createElement("input");
  invoer.type = "file";
  invoer.accept = "image/*";         // alleen foto's
  invoer.className = "verborgen";
  invoer.addEventListener("change", async () => {
    const bestand = invoer.files[0];
    if (!bestand) return;            // niets gekozen: niets doen

    // Direct laten zien dat er iets gebeurt
    knopTekstVak.textContent = "Foto verwerken…";
    tip.textContent = TIP_TEKST;
    tip.classList.remove("fout");

    try {
      const kleineFoto = await verkleinFoto(bestand);
      // Geef de verkleinde foto door. "await": wacht tot die klaar is
      // (bijvoorbeeld met versturen), daarna de knoptekst terugzetten.
      await bijFoto(kleineFoto);
      knopTekstVak.textContent = knopTekst;
    } catch (fout) {
      knopTekstVak.textContent = knopTekst;
      tip.textContent = "Deze foto kon niet worden gebruikt. Maak een nieuwe foto of kies een andere.";
      tip.classList.add("fout");
    }
    invoer.value = "";               // zodat je dezelfde foto nog eens kunt kiezen
  });
  label.append(knopTekstVak, invoer);
  blok.append(label, tip);

  return blok;
}

// Maakt een foto kleiner en haalt alle verborgen gegevens eruit.
// Hoe: de foto wordt opnieuw getekend op een "canvas" (een onzichtbaar tekenvel)
// en daarna als nieuwe JPEG bewaard. Alleen de pixels gaan mee; verborgen gegevens
// zoals de gps-locatie, het merk telefoon en de datum blijven achter.
// De maat en kwaliteit staan bovenin dit bestand: FOTO_MAX_PIXELS en FOTO_KWALITEIT.
async function verkleinFoto(bestand) {
  // 1. Foto inlezen. De browser zet hem daarbij vanzelf rechtop.
  const adres = URL.createObjectURL(bestand);
  const plaatje = new Image();
  plaatje.src = adres;
  try {
    await plaatje.decode();          // wacht tot de foto helemaal ingelezen is
  } finally {
    URL.revokeObjectURL(adres);      // origineel uit het geheugen halen
  }

  // 2. Nieuwe maat uitrekenen. Kleine foto's worden niet groter gemaakt.
  const schaal = Math.min(1, FOTO_MAX_PIXELS / Math.max(plaatje.naturalWidth, plaatje.naturalHeight));
  const tekenvel = document.createElement("canvas");
  tekenvel.width = Math.round(plaatje.naturalWidth * schaal);
  tekenvel.height = Math.round(plaatje.naturalHeight * schaal);

  // 3. Foto op het tekenvel tekenen, op de nieuwe maat.
  tekenvel.getContext("2d").drawImage(plaatje, 0, 0, tekenvel.width, tekenvel.height);

  // 4. Tekenvel bewaren als JPEG-bestand.
  return new Promise((gelukt, mislukt) => {
    tekenvel.toBlob(
      nieuweFoto => nieuweFoto ? gelukt(nieuweFoto) : mislukt(new Error("Foto opslaan mislukt")),
      "image/jpeg",
      FOTO_KWALITEIT
    );
  });
}

// Maakt een vraag met keuzeknoppen (zoals "Waar is het?")
function maakKeuzeVeld(vraag, keuzes, gekozen, bijKiezen) {
  const veld = document.createElement("div");
  veld.className = "veld";
  const titel = document.createElement("p");
  titel.className = "veld-titel";
  titel.textContent = vraag;
  veld.append(titel);

  const kiezer = document.createElement("div");
  kiezer.className = "kiezer";
  keuzes.forEach(keuze => {
    const knop = document.createElement("button");
    knop.textContent = keuze;
    knop.setAttribute("aria-pressed", keuze === gekozen);
    knop.addEventListener("click", () => bijKiezen(keuze));
    kiezer.append(knop);
  });
  veld.append(kiezer);
  return veld;
}

// Maakt een invoerveld. soort = "tekst" (één regel), "lang" (meer regels), "datum" of "email".
function maakInvoerVeld(labelTekst, soort, waarde, bijWijzigen) {
  const veld = document.createElement("div");
  veld.className = "veld";
  const label = document.createElement("label");
  label.className = "veld-titel";
  label.textContent = labelTekst;

  const invoer = document.createElement(soort === "lang" ? "textarea" : "input");
  if (soort === "tekst") invoer.type = "text";
  if (soort === "datum") invoer.type = "date";
  if (soort === "email") {
    invoer.type = "email";
    invoer.autocapitalize = "none";   // geen hoofdletter aan het begin
    invoer.autocomplete = "off";      // niet je eigen adres voorstellen
  }
  invoer.value = waarde;
  invoer.addEventListener("input", () => bijWijzigen(invoer.value));

  label.append(invoer);
  veld.append(label);
  return veld;
}

// Maakt een keuzelijst (select) met namen. "" wordt getoond als "Nog niemand".
// Keuzelijst "wie doet het?" voor bestuur en coördinator.
// Bovenaan "Nog niemand", dan de leden van de werkgroep, dan alle anderen.
// gekozenId/gekozenNaam = wie het nu doet. bijKiezen krijgt het nummer
// van de gekozen persoon ("" = nog niemand).
function maakPersoonKeuzelijst(labelTekst, werkgroep, gekozenId, gekozenNaam, bijKiezen) {
  const label = document.createElement("label");
  label.className = "toewijzen";
  label.textContent = labelTekst;

  const keuze = document.createElement("select");
  keuze.append(maakOptie("", "Nog niemand", gekozenId));

  // Twee groepjes. <optgroup> = een kopje in de keuzelijst.
  const leden = personen.filter(p => p.werkgroepen.includes(werkgroep));
  const anderen = personen.filter(p => !p.werkgroepen.includes(werkgroep));
  [["Werkgroep " + werkgroep, leden], ["Anderen", anderen]].forEach(([kopje, groep]) => {
    if (groep.length === 0) return;
    const groepje = document.createElement("optgroup");
    groepje.label = kopje;
    groep.forEach(p => groepje.append(maakOptie(p.id, p.naam, gekozenId)));
    keuze.append(groepje);
  });

  // Staat de taak op naam van iemand die niet in de lijst staat (bijv. gestopt)?
  // Laat die naam dan toch zien, anders lijkt het alsof niemand hem doet.
  if (gekozenId && !personen.some(p => p.id === gekozenId)) {
    keuze.append(maakOptie(gekozenId, gekozenNaam || "Onbekend", gekozenId));
  }

  keuze.addEventListener("change", () => bijKiezen(keuze.value));
  label.append(keuze);
  return label;
}

// Eén regel in een keuzelijst
function maakOptie(waarde, tekst, gekozen) {
  const optie = document.createElement("option");
  optie.value = waarde;
  optie.textContent = tekst;
  optie.selected = waarde === (gekozen || "");
  return optie;
}

// ===== TAKEN =====

// Maakt het "kaartje" voor één taak
function maakTaakKaart(taak) {
  const kaart = document.createElement("article");
  kaart.className = "taak";

  const titel = document.createElement("h2");
  titel.textContent = taak.titel;
  kaart.append(titel);

  // De plek
  const plek = document.createElement("p");
  plek.className = "details";
  plek.textContent = "📍 " + taak.plek;
  kaart.append(plek);

  // Het project (als de taak bij een project hoort)
  if (taak.projectId) {
    const project = document.createElement("p");
    project.className = "details";
    project.textContent = "📁 " + projectNaam(taak.projectId);
    kaart.append(project);
  }

  const omschrijving = document.createElement("p");
  omschrijving.textContent = taak.omschrijving;
  kaart.append(omschrijving);

  const details = document.createElement("p");
  details.className = "details";
  const wie = taak.toegewezenAan || "Nog niemand";
  const wanneer = taak.deadline ? "Uiterlijk " + leesbareDatum(taak.deadline) : "Geen datum";
  details.textContent = wanneer + " · " + taak.werkgroep + " · " + wie;
  kaart.append(details);

  // Waarschuwing in tekst én kleur (nooit alleen kleur)
  if (taak.status === "open" && taak.deadline && taak.deadline < vandaag) {
    const teLaat = document.createElement("p");
    teLaat.className = "te-laat";
    teLaat.textContent = "⚠ Te laat";
    kaart.append(teLaat);
  }

  // Komt de taak uit een melding? Dan de "voor"-foto, de toelichting en wie
  // het meldde (voor als er meer informatie nodig is).
  if (taak.meldingFotoPad) {
    const link = geldigeFotoLink(taak.meldingFotoPad);
    if (link) {
      kaart.append(maakFotoMetLabel(link, "Foto bij melding", "Foto bij de melding: " + taak.titel));
    } else {
      const zonder = document.createElement("p");
      zonder.className = "details foto-label";
      zonder.textContent = "📷 Er is een foto bij de melding. Die zie je als je weer bereik hebt.";
      kaart.append(zonder);
    }
    const herkomst = document.createElement("p");
    herkomst.className = "details";
    herkomst.textContent = "Melding" + (taak.meldingDoor ? " van " + taak.meldingDoor : "") +
                           (taak.meldingTekst ? ": " + taak.meldingTekst : "");
    kaart.append(herkomst);
  }

  const status = document.createElement("span");
  status.className = "status status-" + taak.status;
  status.textContent = taak.status === "gereed" ? "✓ Gereed gemeld door " + taak.gereedGemeldDoor
    : taak.status === "vervallen" ? "✕ Vervallen" +
        (taak.vervallenDoor ? " (" + taak.vervallenDoor + ", " + leesbareDatum(taak.vervallenOp.slice(0, 10)) + ")" : "")
    : "○ Open";
  kaart.append(status);

  // Toewijzen (en wijzigen) bij open taken
  if (taak.status === "open") {
    if (ingelogdeGebruiker.magAllesZien) {
      kaart.append(maakPersoonKeuzelijst("Toegewezen aan", taak.werkgroep,
        taak.toegewezenAanId, taak.toegewezenAan,
        persoonId => wijsToe(taak, persoonId)));
      kaart.append(maakTweedeKnop("✏ Wijzigen", () => openTaakWijzigen(taak)));   // NIEUW
    } else if (magZelfOppakken(taak)) {
      kaart.append(maakTweedeKnop("🙋 Ik doe dit", () => pakTaakOp(taak)));
    } else if (isMijnTaak(taak)) {
      // Je eigen taak: je kunt hem teruggeven
      kaart.append(maakTweedeKnop("↩ Teruggeven", () => geefTaakTerug(taak)));
    }
  }

  // Knop "Gereed melden" bij open taken die aan iemand zijn toegewezen
  if (taak.status === "open" && taak.toegewezenAan && magGereedMelden(taak)) {
    kaart.append(maakHoofdKnop("✓ Gereed melden", () => meldGereed(taak)));
  }

  // Foto en knoppen bij gereed gemelde taken
  if (taak.status === "gereed") {
    if (taak.fotoPad) {
      const link = geldigeFotoLink(taak.fotoPad);
      if (link) {
        kaart.append(maakFotoMetLabel(link, "Foto na afloop", "Foto na afloop: " + taak.titel));
      } else {
        // Geen (geldige) tijdelijke link, meestal omdat er geen bereik is
        const zonder = document.createElement("p");
        zonder.className = "details foto-label";
        zonder.textContent = "📷 Er is een foto. Die zie je als je weer bereik hebt.";
        kaart.append(zonder);
      }
    }
    // De opmerking na afloop (als die er is), met wie hem schreef
    if (taak.opmerking) {
      const opmerking = document.createElement("p");
      opmerking.className = "opmerking";
      opmerking.textContent = "💬 " + (taak.opmerkingDoor ? taak.opmerkingDoor + ": " : "") + taak.opmerking;
      kaart.append(opmerking);
    }
    if (magGereedMelden(taak)) {
      kaart.append(maakOpmerkingDeel(taak));
      const fotoTekst = taak.fotoPad ? "📷 Foto vervangen" : "📷 Foto toevoegen";
      kaart.append(maakFotoKnop(fotoTekst, kleineFoto => voegTaakFotoToe(taak, kleineFoto)));
      if (taak.fotoPad) {
        kaart.append(maakTweedeKnop("Foto verwijderen", () => zetTaakFoto(taak, "")));
      }
      kaart.append(maakTweedeKnop("↺ Weer openen", () => heropenTaak(taak)));
    }
  }

  // Vervallen taak: de reden (als die er is) en "Weer openen"
  if (taak.status === "vervallen") {
    if (taak.opmerking) {
      const reden = document.createElement("p");
      reden.className = "opmerking";
      reden.textContent = "💬 " + (taak.opmerkingDoor ? taak.opmerkingDoor + ": " : "") + taak.opmerking;
      kaart.append(reden);
    }
    if (magGereedMelden(taak)) {
      kaart.append(maakOpmerkingDeel(taak));
      kaart.append(maakTweedeKnop("↺ Weer openen", () => zetVervallenTaakTerug(taak)));
    }
  }

  return kaart;
}

// ===== KNOPPEN BIJ EEN TAAK (bewaard in de database) =====
// Elke knop vraagt de database om een "vaste actie" uit te voeren (zie
// database/03_rechten.sql). De database controleert zelf of het mag.
// Pas als de database "gelukt" zegt, passen we de taak op het scherm aan.
// "Ongedaan maken" voert de tegenovergestelde actie uit.

// 🙋 "Ik doe dit"
async function pakTaakOp(taak) {
  if (!await vraagDatabase("taak_oppakken", { taak_id: taak.id })) return;
  taak.toegewezenAanId = ingelogdeGebruiker.id;
  taak.toegewezenAan = mijnToewijsNaam;
  takenGewijzigd();
  toonMelding("Je doet deze taak", () => geefTaakTerug(taak));
}

// ↩ "Teruggeven"
async function geefTaakTerug(taak) {
  if (!await vraagDatabase("taak_teruggeven", { taak_id: taak.id })) return;
  taak.toegewezenAanId = "";
  taak.toegewezenAan = "";
  takenGewijzigd();
  toonMelding("Taak is weer vrij", () => pakTaakOp(taak));
}

// ✓ "Gereed melden". "fotoPad" en "opmerking" zijn alleen nodig bij het
// ongedaan maken van "Weer openen": dan komen de oude foto en opmerking terug.
// Anders leeg (null).
async function meldGereed(taak, fotoPad = null, opmerking = null) {
  if (!await vraagDatabase("taak_gereed_melden", { taak_id: taak.id, foto: fotoPad })) return;
  taak.status = "gereed";
  taak.gereedGemeldDoor = mijnToewijsNaam;
  taak.fotoPad = fotoPad || "";
  taak.opmerking = "";
  taak.opmerkingDoor = "";
  if (opmerking && await vraagDatabase("taak_opmerking_zetten", { taak_id: taak.id, opmerking })) {
    taak.opmerking = opmerking;
    taak.opmerkingDoor = mijnToewijsNaam;
  }
  takenGewijzigd();
  toonMelding("Taak gereed gemeld", () => heropenTaak(taak));
}

// ↺ "Weer openen"
async function heropenTaak(taak) {
  const vorigeFotoPad = taak.fotoPad || null;        // onthouden voor "Ongedaan maken"
  const vorigeOpmerking = taak.opmerking || null;    // idem
  if (!await vraagDatabase("taak_heropenen", { taak_id: taak.id })) return;
  taak.status = "open";
  taak.gereedGemeldDoor = "";
  taak.fotoPad = "";
  taak.opmerking = "";       // de database maakt hem ook leeg (11_opmerking.sql)
  taak.opmerkingDoor = "";
  takenGewijzigd();
  toonMelding("Taak staat weer open", () => meldGereed(taak, vorigeFotoPad, vorigeOpmerking));
}

// ===== OPMERKING NA AFLOOP =====
// Bij een gereed gemelde taak kun je een korte opmerking zetten, bijvoorbeeld
// "Nieuwe scharnieren, de oude lagen in de container." Niet verplicht.
// De database bewaart hem bij de taak (database/11_opmerking.sql).

const OPMERKING_MAX = 500;      // tekens; de database bewaakt dit ook

let opmerkingOpenBij = null;    // nummer van de taak waar het tekstvak open staat
let opmerkingTekst = "";        // wat er in het tekstvak staat

// De knop "Opmerking toevoegen/wijzigen", of het open tekstvak met Opslaan
function maakOpmerkingDeel(taak) {
  const deel = document.createElement("div");
  if (opmerkingOpenBij !== taak.id) {
    const knopTekst = taak.opmerking ? "💬 Opmerking wijzigen" : "💬 Opmerking toevoegen";
    deel.append(maakTweedeKnop(knopTekst, () => {
      opmerkingOpenBij = taak.id;
      opmerkingTekst = taak.opmerking;
      verversScherm();
    }));
    return deel;
  }

  const veld = maakInvoerVeld("Opmerking (niet verplicht, hooguit " + OPMERKING_MAX + " tekens)",
    "lang", opmerkingTekst, waarde => { opmerkingTekst = waarde; });
  veld.classList.add("opmerking-veld");
  veld.querySelector("textarea").maxLength = OPMERKING_MAX;
  deel.append(veld);
  if (taak.opmerking) {
    const tip = document.createElement("p");
    tip.className = "foto-tip";
    tip.textContent = "Maak het vak leeg en tik op Opslaan om de opmerking weg te halen.";
    deel.append(tip);
  }
  deel.append(maakHoofdKnop("Opmerking opslaan", () => slaOpmerkingOp(taak, opmerkingTekst.trim())));
  deel.append(maakTweedeKnop("Annuleren", () => {
    opmerkingOpenBij = null;
    verversScherm();
  }));
  return deel;
}

// 💬 Opmerking opslaan (leeg = weghalen), met "Ongedaan maken"
async function slaOpmerkingOp(taak, tekst) {
  const vorige = taak.opmerking;   // onthouden voor "Ongedaan maken"
  if (!await vraagDatabase("taak_opmerking_zetten", { taak_id: taak.id, opmerking: tekst })) return;
  opmerkingOpenBij = null;
  taak.opmerking = tekst;
  taak.opmerkingDoor = tekst ? mijnToewijsNaam : "";
  takenGewijzigd();
  toonMelding(tekst ? "Opmerking opgeslagen" : "Opmerking weggehaald", () => slaOpmerkingOp(taak, vorige));
}

// Na een gelukte actie: lijst op de telefoon bijwerken en scherm opnieuw tekenen
function takenGewijzigd() {
  bewaarTakenOpToestel();
  verversScherm();
}

// Vraagt de database om een vaste actie. Geeft true als het gelukt is.
// Lukt het niet, dan staat onderaan wat er mis is en wat je kunt doen.
async function vraagDatabase(actie, gegevens) {
  const antwoord = await stuurNaarDatabase(signaal => database.rpc(actie, gegevens).abortSignal(signaal));
  return antwoord.gelukt;
}

// Stuurt een vraag naar de database, met wachttijd en foutmeldingen.
// "maakVraag" bouwt de vraag; hij krijgt het signaal om te stoppen mee.
// Geeft { gelukt: true/false, data: wat de database terugstuurt }.
// "geenVerbindingTekst" (niet verplicht) = eigen melding bij geen bereik.
async function stuurNaarDatabase(maakVraag, geenVerbindingTekst) {
  toonMelding("Even geduld…");   // direct laten zien dat de tik is aangekomen
  const stopper = new AbortController();
  const wekker = setTimeout(() => stopper.abort(), WACHTTIJD_DATABASE);
  let fout = null;
  let data = null;
  try {
    const antwoord = await maakVraag(stopper.signal);
    fout = antwoord.error;
    data = antwoord.data;
  } catch (probleem) {
    fout = probleem;
  } finally {
    clearTimeout(wekker);
  }
  if (!fout) return { gelukt: true, data };

  console.warn("Database-vraag mislukt:", fout);
  if (fout.code === "42501") {
    // 42501 = de rijbeveiliging weigert (regels in 03_rechten.sql)
    toonMelding("Dit mag je niet doen. Er is niets veranderd.");
  } else if (fout.code === "P0001") {
    // De database zegt zelf wat er mis is, in gewone taal (zie 03_rechten.sql),
    // bijvoorbeeld "Iemand anders heeft deze taak al opgepakt."
    // De lijst opnieuw ophalen, zodat je ziet hoe het nu echt zit.
    await haalTakenOp();
    verversScherm();
    toonMelding(fout.message);
  } else if (isVerbindingsFout(fout)) {
    toonMelding(geenVerbindingTekst ||
      "Geen verbinding. Er is niets veranderd. Probeer het opnieuw als je bereik hebt.");
  } else {
    toonMelding("Er ging iets mis (" + fout.message + "). Er is niets veranderd. Probeer het opnieuw.");
  }
  return { gelukt: false, data: null };
}

// Komt een fout door slecht of geen bereik? (of duurde het te lang)
function isVerbindingsFout(fout) {
  const tekst = ((fout.name || "") + " " + (fout.message || "")).toLowerCase();
  // "load failed" is hoe Safari (iPhone) zegt dat er geen verbinding is
  return tekst.includes("fetch") || tekst.includes("network") || tekst.includes("abort")
      || tekst.includes("load failed");
}

// 👤 Toewijzen met de keuzelijst (bestuur en coördinator).
// persoonId = nummer van de gekozen persoon ("" = aan niemand).
async function wijsToe(taak, persoonId) {
  const vorigeId = taak.toegewezenAanId || "";   // onthouden voor "Ongedaan maken"
  const vorigeNaam = taak.toegewezenAan;
  if (!await vraagDatabase("taak_toewijzen", { taak_id: taak.id, persoon: persoonId || null })) {
    verversScherm();   // keuzelijst terugzetten op wat er echt bewaard is
    return;
  }
  taak.toegewezenAanId = persoonId;
  taak.toegewezenAan = naamVanPersoon(persoonId);
  takenGewijzigd();
  let tekst = persoonId ? "Toegewezen aan " + taak.toegewezenAan : "Taak is weer vrij";
  if (persoonId && vorigeNaam) tekst += " (was: " + vorigeNaam + ")";
  toonMelding(tekst, () => wijsToe(taak, vorigeId));
}

// ===== FOTO NA AFLOOP =====
// Een foto gaat in twee stappen:
// 1. de verkleinde foto naar de afgesloten fotomap in de database
//    (in je eigen map: <jouw nummer>/<willekeurige code>.jpg);
// 2. de vaste actie taak_foto_zetten koppelt die foto aan de taak.
// Bekijken gaat met een tijdelijke link die na een uur verloopt (zie
// haalFotoLinksOp). Zonder bereik zie je de foto niet; dat is bewust,
// zodat er geen foto's van het park op telefoons blijven staan.

// Tijdelijke links die we al hebben: pad → { adres, geldigTot }
const fotoLinks = {};

// Geeft de tijdelijke link bij een foto, of "" als we die (nog) niet hebben
function geldigeFotoLink(pad) {
  const link = fotoLinks[pad];
  return link && link.geldigTot > Date.now() ? link.adres : "";
}

// 📷 Een nieuwe foto: eerst versturen, dan aan de taak koppelen
async function voegTaakFotoToe(taak, kleineFoto) {
  const pad = await stuurFotoNaarDatabase(kleineFoto, "De foto is niet verstuurd. De taak is wel gereed gemeld.");
  if (!pad) return;   // mislukt: de melding staat er al
  // De foto staat al op deze telefoon; die laten we meteen zien
  fotoLinks[pad] = { adres: URL.createObjectURL(kleineFoto), geldigTot: Date.now() + FOTO_LINK_GELDIG };
  await zetTaakFoto(taak, pad);
}

// Koppelt een foto aan de taak ("" = foto verwijderen).
// "Ongedaan maken" koppelt de vorige foto weer; die staat nog in de fotomap.
async function zetTaakFoto(taak, pad) {
  const vorigPad = taak.fotoPad || "";
  if (!await vraagDatabase("taak_foto_zetten", { taak_id: taak.id, foto: pad })) return;
  taak.fotoPad = pad;
  takenGewijzigd();
  let tekst = "Foto verwijderd";
  if (pad) tekst = vorigPad ? "Foto vervangen" : "Foto toegevoegd";
  toonMelding(tekst, () => zetTaakFoto(taak, vorigPad));
}

// Stuurt een foto naar de fotomap. Geeft het pad terug, of "" als het mislukt.
// "watMislukt" = de eerste zin van de melding als het mislukt, bijvoorbeeld
// "De melding is niet verstuurd." "bijGeenBereik" (niet verplicht) = wat er
// bij geen bereik achter komt.
async function stuurFotoNaarDatabase(kleineFoto, watMislukt,
                                     bijGeenBereik = "Probeer het opnieuw als je bereik hebt.") {
  toonMelding("Foto versturen…");
  // crypto.randomUUID() maakt een willekeurige code die niemand kan raden
  const pad = ingelogdeGebruiker.id + "/" + crypto.randomUUID() + ".jpg";
  const versturen = database.storage
    .from("fotos")
    .upload(pad, kleineFoto, { contentType: "image/jpeg", upsert: false });
  // Na WACHTTIJD_FOTO geven we het op (de wekker "wint" dan de race)
  const teLaat = new Promise(klaar =>
    setTimeout(() => klaar({ error: { message: "abort: duurde te lang" } }), WACHTTIJD_FOTO));

  let fout;
  try {
    ({ error: fout } = await Promise.race([versturen, teLaat]));
  } catch (probleem) {
    fout = probleem;
  }
  if (!fout) return pad;

  console.warn("Foto versturen mislukt:", fout);
  if (isVerbindingsFout(fout)) {
    toonMelding(watMislukt + " " + bijGeenBereik);
  } else {
    toonMelding(watMislukt + " (" + fout.message + ") Probeer het opnieuw.");
  }
  return "";
}

// Vraagt tijdelijke links aan voor alle foto's (na afloop en bij meldingen) waar we er nog
// geen (geldige) van hebben. De database geeft alleen links voor foto's die
// jij mag zien (regels in 04_fotos.sql). Lukt het niet, dan geen links:
// de kaartjes zeggen dan "Die zie je als je weer bereik hebt".
async function haalFotoLinksOp() {
  // Alle foto's: na afloop, bij meldingen, en de meldingsfoto bij een taak
  const alleFotos = [
    ...taken.map(taak => taak.fotoPad),
    ...taken.map(taak => taak.meldingFotoPad),
    ...meldingen.map(melding => melding.fotoPad)
  ];
  // Alleen die er zijn en waar we nog geen geldige link van hebben, elk één keer
  const paden = [...new Set(alleFotos.filter(pad => pad && !geldigeFotoLink(pad)))];
  if (paden.length === 0) return;
  try {
    const { data, error } = await database.storage
      .from("fotos")
      .createSignedUrls(paden, 60 * 60);   // 60 × 60 seconden = een uur
    if (error) throw error;
    data.forEach(link => {
      if (link.signedUrl) {
        fotoLinks[link.path] = { adres: link.signedUrl, geldigTot: Date.now() + FOTO_LINK_GELDIG };
      }
    });
  } catch (fout) {
    console.warn("Fotolinks ophalen mislukt:", fout);
  }
}

// ===== GEBREKEN MELDEN =====

// Wat er tot nu toe is ingevuld in het meldformulier.
// foto = adres om de foto te laten zien; fotoBestand = de verkleinde foto zelf;
// fotoPad = waar hij in de fotomap staat, zodra hij is verstuurd.
// Lukt versturen niet, dan blijft alles hier staan zolang de app open is.
function leegFormulier() {
  return { foto: "", fotoBestand: null, fotoPad: "", plek: "", tekst: "", gevaarlijk: false };
}
let nieuweMelding = leegFormulier();

// Het scherm "Melden"
function toonMelden() {
  huidigScherm = "melden";
  document.getElementById("titel").textContent = "Gebrek melden";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  // 1. Foto
  const fotoVeld = document.createElement("div");
  fotoVeld.className = "veld";
  if (nieuweMelding.foto) {
    const foto = document.createElement("img");
    foto.className = "foto";
    foto.src = nieuweMelding.foto;
    foto.alt = "Foto van het gebrek";
    fotoVeld.append(foto);
  }
  const fotoTekst = nieuweMelding.foto ? "📷 Andere foto" : "📷 Foto maken";
  fotoVeld.append(maakFotoKnop(fotoTekst, kleineFoto => {
    // De foto gaat pas naar de database bij "Melding versturen"
    nieuweMelding.foto = URL.createObjectURL(kleineFoto);
    nieuweMelding.fotoBestand = kleineFoto;
    nieuweMelding.fotoPad = "";   // nieuwe foto: nog niet verstuurd
    verversScherm();
  }));
  inhoud.append(fotoVeld);

  // 2. Waar is het? (keuzeknoppen: één tik)
  inhoud.append(maakKeuzeVeld("Waar is het?", plekNamen, nieuweMelding.plek, plek => {
    nieuweMelding.plek = plek;
    verversScherm();
  }));

  // 3. Toelichting (niet verplicht)
  const tekstVeld = maakInvoerVeld("Wat is er mis, en waar precies? (niet verplicht)", "lang",
    nieuweMelding.tekst, waarde => { nieuweMelding.tekst = waarde; });
  tekstVeld.querySelector("textarea").placeholder = "Bijv. plank los, achter de schuur";
  inhoud.append(tekstVeld);

  // 4. Gevaarlijk? (standaard: nee)
  const gevaarKeuze = nieuweMelding.gevaarlijk ? "Ja, gevaarlijk" : "Nee";
  inhoud.append(maakKeuzeVeld("Is het gevaarlijk?", ["Nee", "Ja, gevaarlijk"], gevaarKeuze, keuze => {
    nieuweMelding.gevaarlijk = keuze === "Ja, gevaarlijk";
    verversScherm();
  }));
  // Bij gevaar: een tip voor als het niet kan wachten (de mail is niet voor acute nood)
  if (nieuweMelding.gevaarlijk) {
    const tip = document.createElement("p");
    tip.className = "uitleg-bovenaan";
    tip.textContent = GEVAAR_TIP;
    inhoud.append(tip);
  }

  // Foutmelding (leeg tot er iets mis is)
  const fout = document.createElement("p");
  fout.id = "melden-fout";
  fout.className = "fout";
  fout.setAttribute("role", "alert");
  inhoud.append(fout);

  const versturen = maakHoofdKnop("Melding versturen", verstuurMelding);
  versturen.id = "knop-melding-versturen";
  inhoud.append(versturen);
  markeerMenu("melden");
}

// Tip bij een gevaarlijke melding (in het formulier, als "Ja, gevaarlijk" gekozen is)
const GEVAAR_TIP = "⚠️ Is het acuut gevaarlijk? Stuur een WhatsApp naar het bestuur.";

// Wat er staat als een melding niet verstuurd kon worden
const MELDING_NIET_VERSTUURD = "De melding is niet verstuurd. Je hoeft niets opnieuw in te vullen.";
// Wat er bij geen bereik achter komt. Na de vliegtuigstand duurde het in een
// test ongeveer 2 minuten voordat versturen weer lukte.
const MELDING_BEREIK_TIP = "Is je bereik net terug? Wacht dan een minuut of twee en probeer het opnieuw.";

// Controleert het formulier en verstuurt de melding, in twee stappen:
// 1. de foto naar de fotomap (als dat nog niet gelukt was);
// 2. de melding zelf naar de tabel meldingen.
async function verstuurMelding() {
  const fout = document.getElementById("melden-fout");
  if (!nieuweMelding.foto) { fout.textContent = "Maak eerst een foto van het gebrek."; return; }
  if (!nieuweMelding.plek) { fout.textContent = "Kies waar het is."; return; }
  fout.textContent = "";

  // De knop uitzetten, zodat een tweede tik niet twee meldingen maakt
  const knop = document.getElementById("knop-melding-versturen");
  knop.disabled = true;
  const formulier = nieuweMelding;

  // 1. De foto. Is hij bij een eerdere poging al verstuurd, dan niet nog eens.
  if (!formulier.fotoPad) {
    formulier.fotoPad = await stuurFotoNaarDatabase(formulier.fotoBestand, MELDING_NIET_VERSTUURD,
                                                    MELDING_BEREIK_TIP);
    if (!formulier.fotoPad) { knop.disabled = false; return; }
  }

  // 2. De melding. Wie meldt en wanneer vult de database zelf in.
  const rij = {
    plek: plekNummer[formulier.plek],
    foto: formulier.fotoPad,
    toelichting: formulier.tekst.trim() || null,
    gevaarlijk: formulier.gevaarlijk
  };
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("meldingen").insert(rij).select("id, gemeld_op").single().abortSignal(signaal),
    MELDING_NIET_VERSTUURD + " " + MELDING_BEREIK_TIP);
  if (!antwoord.gelukt) { knop.disabled = false; return; }

  // Gelukt: de melding komt in de lijst, het formulier wordt leeg
  const melding = {
    id: antwoord.data.id,
    plek: formulier.plek,
    fotoPad: formulier.fotoPad,
    tekst: rij.toelichting || "",
    gevaarlijk: formulier.gevaarlijk,
    gemeldDoorId: ingelogdeGebruiker.id,
    gemeldDoor: mijnToewijsNaam,
    datum: antwoord.data.gemeld_op,
    taakId: null,
    status: "Nieuw",
    geenActieReden: "",
    geenActieDoor: ""
  };
  // De foto staat al op deze telefoon; die laten we meteen zien
  fotoLinks[melding.fotoPad] = { adres: formulier.foto, geldigTot: Date.now() + FOTO_LINK_GELDIG };
  meldingen.push(melding);
  nieuweMelding = leegFormulier();   // formulier leegmaken voor de volgende keer
  bewaarTakenOpToestel();
  toonMeldingen();
  // Bij gevaar: zeggen dat er een mail gaat, maar alleen als dat echt zo is
  // (er moet iemand het vinkje "krijgt mail bij gevaar" hebben)
  const krijgtMail = melding.gevaarlijk && await gaatErEenGevaarMail();
  toonMelding(krijgtMail ? "Melding verstuurd. De coördinator krijgt een e-mail." : "Melding verstuurd",
              () => trekMeldingIn(melding));
}

// Heeft iemand het vinkje "krijgt mail bij gevaar"? (database/14_gevaar_mail.sql)
// De mail zelf verstuurt de database; dit is alleen voor de zin op het scherm.
// Lukt het vragen niet binnen 3 seconden, dan zeggen we niets over de mail.
async function gaatErEenGevaarMail() {
  try {
    const stopper = new AbortController();
    const wekker = setTimeout(() => stopper.abort(), 3000);
    const { data, error } = await database.rpc("er_is_iemand_voor_gevaar_mail").abortSignal(stopper.signal);
    clearTimeout(wekker);
    return !error && data === true;
  } catch (fout) {
    return false;
  }
}

// Trekt een melding in (alleen voor "Ongedaan maken"). Mag zolang de
// melding nog "Nieuw" is (regel in 03_rechten.sql).
async function trekMeldingIn(melding) {
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("meldingen").delete().eq("id", melding.id).select("id").abortSignal(signaal));
  if (!antwoord.gelukt) return;
  if (antwoord.data.length === 0) {
    toonMelding("Deze melding kon niet worden ingetrokken. Misschien is er al iets mee gedaan.");
    return;
  }
  meldingen.splice(meldingen.indexOf(melding), 1);
  bewaarTakenOpToestel();
  verversScherm();
  toonMelding("Melding ingetrokken");
}

// ===== STATUS VAN EEN MELDING =====
// De status rekent de database uit (melding_status in 03_rechten.sql), op
// basis van de gekoppelde taak. Zo ziet de melder ook de status van een taak
// die hij of zij zelf niet mag zien.
function meldingStatus(melding) {
  return melding.status || "Nieuw";
}

// Hoe elke status op het scherm staat (met teken, zodat het niet alleen kleur is)
const STATUS_TEKST = {
  "Nieuw": "● Nieuw",
  "Taak gemaakt": "📋 Taak gemaakt",
  "Toegewezen": "👤 Toegewezen",
  "Gereed": "✓ Gereed",
  "Geen actie nodig": "– Geen actie nodig"
};

// Is er met deze melding niets meer te doen?
function isMeldingKlaar(melding) {
  const status = meldingStatus(melding);
  return status === "Gereed" || status === "Geen actie nodig";
}

// Het scherm "Meldingen"
function toonMeldingen() {
  huidigScherm = "meldingen";
  const alles = ingelogdeGebruiker.magAllesZien;
  document.getElementById("titel").textContent = alles ? "Alle meldingen" : "Mijn meldingen";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  // Geen verbinding? Zeg dat boven de lijst.
  if (takenUitleg) {
    const uitleg = document.createElement("p");
    uitleg.className = "uitleg-bovenaan";
    uitleg.setAttribute("role", "status");
    uitleg.textContent = "📶 " + takenUitleg;
    inhoud.append(uitleg);
  }

  // Vrijwilligers zien alleen hun eigen meldingen (de database stuurt ook
  // alleen die; dit is een extra controle)
  const lijst = alles
    ? [...meldingen]
    : meldingen.filter(m => m.gemeldDoorId === ingelogdeGebruiker.id);

  if (lijst.length === 0) {
    const leeg = document.createElement("p");
    leeg.className = "leeg";
    leeg.textContent = "Er zijn nog geen meldingen.";
    inhoud.append(leeg);
  } else {
    lijst.sort(sorteerMeldingen);
    lijst.forEach(m => inhoud.append(maakMeldingKaart(m)));
  }
  markeerMenu("meldingen");
}

// Volgorde meldingen: openstaande eerst, daarin gevaarlijk eerst, dan nieuwste bovenaan
function sorteerMeldingen(a, b) {
  const aKlaar = isMeldingKlaar(a);
  const bKlaar = isMeldingKlaar(b);
  if (aKlaar !== bKlaar) return aKlaar ? 1 : -1;
  if (a.gevaarlijk !== b.gevaarlijk) return a.gevaarlijk ? -1 : 1;
  return b.datum.localeCompare(a.datum);
}

// NIEUW: welke melding toont nu het vak "Waarom geen actie?" (null = geen)
let meldingMetRedenOpen = null;
let redenTekst = "";

// Maakt het "kaartje" voor één melding
function maakMeldingKaart(melding) {
  const kaart = document.createElement("article");
  kaart.className = "taak";

  // De foto, via een tijdelijke link. Geen link (meestal geen bereik)? Dan een zin.
  const link = geldigeFotoLink(melding.fotoPad);
  if (link) {
    const foto = document.createElement("img");
    foto.className = "foto";
    foto.src = link;
    foto.alt = "Foto van het gebrek bij " + melding.plek;
    kaart.append(foto);
  } else if (melding.fotoPad) {
    const zonder = document.createElement("p");
    zonder.className = "details";
    zonder.textContent = "📷 Er is een foto. Die zie je als je weer bereik hebt.";
    kaart.append(zonder);
  }

  const titel = document.createElement("h2");
  titel.textContent = melding.plek;
  kaart.append(titel);

  if (melding.gevaarlijk) {
    const gevaar = document.createElement("p");
    gevaar.className = "te-laat";
    gevaar.textContent = "⚠ Gevaarlijk";
    kaart.append(gevaar);
  }

  if (melding.tekst) {
    const tekst = document.createElement("p");
    tekst.textContent = melding.tekst;
    kaart.append(tekst);
  }

  const details = document.createElement("p");
  details.className = "details";
  details.textContent = "Gemeld door " + melding.gemeldDoor + " · " + leesbareDatum(melding.datum);
  kaart.append(details);

  // Is er een taak van gemaakt? Laat zien welke en bij wie.
  const taak = vindTaak(melding.taakId);
  if (taak) {
    const taakInfo = document.createElement("p");
    taakInfo.className = "details";
    taakInfo.textContent = "Taak: " + taak.titel + " · " + taak.werkgroep + " · " + (taak.toegewezenAan || "Nog niemand");
    kaart.append(taakInfo);
  }

  const status = meldingStatus(melding);
  const statusLabel = document.createElement("span");
  statusLabel.className = isMeldingKlaar(melding) ? "status status-gereed" : "status status-open";
  statusLabel.textContent = STATUS_TEKST[status];
  kaart.append(statusLabel);

  // De toelichting bij "Geen actie nodig" (ziet de melder ook)
  if (status === "Geen actie nodig" && melding.geenActieReden) {
    const reden = document.createElement("p");
    reden.textContent = "Toelichting van " + melding.geenActieDoor + ": " + melding.geenActieReden;
    kaart.append(reden);
  }

  // Knoppen voor bestuur en coördinator
  if (ingelogdeGebruiker.magAllesZien) {
    if (status === "Nieuw" && meldingMetRedenOpen === melding) {
      // Vak om uit te leggen waarom er geen actie nodig is
      kaart.append(maakInvoerVeld("Waarom is er geen actie nodig? De melder ziet dit.", "lang",
        redenTekst, waarde => { redenTekst = waarde; }));
      const fout = document.createElement("p");
      fout.id = "reden-fout";
      fout.className = "fout";
      fout.setAttribute("role", "alert");
      kaart.append(fout);
      kaart.append(maakHoofdKnop("Opslaan", () => slaGeenActieOp(melding)));
      kaart.append(maakTweedeKnop("Annuleren", () => {
        meldingMetRedenOpen = null;
        redenTekst = "";
        verversScherm();
      }));
    } else if (status === "Nieuw") {
      kaart.append(maakHoofdKnop("📋 Maak taak", () => openTaakUitMelding(melding)));
      // Opent eerst het vak voor de toelichting
      kaart.append(maakTweedeKnop("Geen actie nodig", () => {
        meldingMetRedenOpen = melding;
        redenTekst = "";
        verversScherm();
      }));
    } else if (status === "Geen actie nodig") {
      kaart.append(maakTweedeKnop("↺ Weer openen", () => zetGeenActie(melding, false, "")));
    }
    // Is er een taak? Dan regel je de rest bij de taak zelf (onder "Alle taken").
  }
  return kaart;
}

// Controleert of er een toelichting is, en slaat "Geen actie nodig" op
function slaGeenActieOp(melding) {
  if (!redenTekst.trim()) {
    document.getElementById("reden-fout").textContent = "Schrijf kort op waarom er geen actie nodig is.";
    return;
  }
  zetGeenActie(melding, redenTekst.trim());
}

// Zet een melding op "Geen actie nodig" (met toelichting), of weer open
// (reden = ""). Direct in de tabel meldingen: alleen bestuur mag dat (regels
// in 03_rechten.sql), en de tabel controleert dat de toelichting niet leeg is.
async function zetGeenActie(melding, reden) {
  const vorigeReden = melding.geenActieReden;   // onthouden voor "Ongedaan maken"
  const rij = reden
    ? { geen_actie_reden: reden, geen_actie_door: ingelogdeGebruiker.id }
    : { geen_actie_reden: null, geen_actie_door: null };
  // .is("taak", null) = alleen als er intussen geen taak van is gemaakt
  // (bijvoorbeeld door een ander bestuurslid)
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("meldingen").update(rij).eq("id", melding.id).is("taak", null)
      .select("id").abortSignal(signaal));
  if (!antwoord.gelukt) return;
  if (antwoord.data.length === 0) {
    await haalTakenOp();
    verversScherm();
    toonMelding("Deze melding is intussen al afgehandeld of ingetrokken. Je ziet nu hoe het is.");
    return;
  }
  melding.geenActieReden = reden;
  melding.geenActieDoor = reden ? mijnToewijsNaam : "";
  melding.status = reden ? "Geen actie nodig" : "Nieuw";
  meldingMetRedenOpen = null;
  redenTekst = "";
  bewaarTakenOpToestel();
  verversScherm();
  toonMelding(reden ? "Geen actie nodig" : "Melding staat weer open",
              () => zetGeenActie(melding, vorigeReden));
}
// ===== NIEUW: TAAKFORMULIER (aanmaken, uit melding, wijzigen) =====
// Eén formulier voor drie situaties. "modus" zegt welke:
//   "nieuw"    = nieuwe taak, bijvoorbeeld uit de jaarplanning
//   "melding"  = nieuwe taak vanuit een melding
//   "wijzigen" = een bestaande taak aanpassen

let taakFormulier = null;   // wat er is ingevuld in het formulier

// Nieuwe taak zonder melding (knop "+ Nieuwe taak" onder Mijn taken en Alle taken).
// "terugScherm" = waar je na opslaan of annuleren weer uitkomt ("mijn" of "werkgroep").
function openNieuweTaak(terugScherm) {
  taakFormulier = {
    modus: "nieuw",
    melding: null,
    taak: null,
    terugScherm,
    titel: "",
    omschrijving: "",
    plek: "",
    // Vanuit Alle taken: de werkgroep die je daar bekijkt alvast invullen
    werkgroep: terugScherm === "werkgroep" && gekozenWerkgroep !== "Alles" ? gekozenWerkgroep : "",
    projectId: null,   // null = geen project
    toegewezenAanId: "",
    deadline: datumOver(DAGEN_NORMAAL)
  };
  toonTaakFormulier();
}

// Nieuwe taak vanuit een melding (knop "Maak taak"): alvast ingevuld
function openTaakUitMelding(melding) {
  taakFormulier = {
    modus: "melding",
    melding: melding,
    taak: null,
    terugScherm: "meldingen",
    titel: melding.tekst ? kortTekst(melding.tekst, 40) : "Gebrek bij " + melding.plek,
    omschrijving: melding.tekst,
    // Doet de plek niet meer mee? Dan moet je zelf een plek kiezen.
    plek: plekNummer[melding.plek] ? melding.plek : "",
    werkgroep: werkgroepBijPlek[melding.plek] || "",   // "" als er geen vaste werkgroep is
    projectId: null,
    toegewezenAanId: "",
    deadline: datumOver(melding.gevaarlijk ? DAGEN_GEVAARLIJK : DAGEN_NORMAAL)
  };
  toonTaakFormulier();
}

// Bestaande taak wijzigen (knop "Wijzigen"): ingevuld met wat er nu staat
function openTaakWijzigen(taak) {
  taakFormulier = {
    modus: "wijzigen",
    melding: null,
    taak: taak,
    terugScherm: huidigScherm,
    titel: taak.titel,
    omschrijving: taak.omschrijving,
    plek: taak.plek || "",
    werkgroep: taak.werkgroep,
    projectId: taak.projectId || null,
    toegewezenAanId: taak.toegewezenAanId || "",
    toegewezenAan: taak.toegewezenAan,   // naam, voor als iemand niet meer in de lijst staat
    deadline: taak.deadline,
    vervalStap: false,   // true = het tekstvak "waarom vervalt de taak?" staat open
    vervalReden: ""
  };
  toonTaakFormulier();
}

// Het scherm met het taakformulier
function toonTaakFormulier() {
  if (!taakFormulier) { toonMijnTaken(); return; }   // geen formulier open: terug
  huidigScherm = "taak-formulier";
  const formulier = taakFormulier;
  document.getElementById("titel").textContent =
    formulier.modus === "wijzigen" ? "Taak wijzigen" : "Taak maken";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  // De "voor"-foto, ter herinnering
  const voorFotoPad = formulier.melding ? formulier.melding.fotoPad
                    : formulier.taak ? formulier.taak.meldingFotoPad : "";
  const voorFoto = geldigeFotoLink(voorFotoPad);
  if (voorFoto) {
    inhoud.append(maakFotoMetLabel(voorFoto, "Foto bij melding", "Foto bij de melding"));
  }

  inhoud.append(maakInvoerVeld("Titel", "tekst", formulier.titel,
    waarde => { formulier.titel = waarde; }));

  inhoud.append(maakInvoerVeld("Omschrijving", "lang", formulier.omschrijving,
    waarde => { formulier.omschrijving = waarde; }));

  // Waar is het? Is de werkgroep nog leeg, vul dan alvast de werkgroep bij die plek in.
  inhoud.append(maakKeuzeVeld("Waar is het?", plekNamen, formulier.plek, plek => {
    formulier.plek = plek;
    if (!formulier.werkgroep && werkgroepBijPlek[plek]) {
      formulier.werkgroep = werkgroepBijPlek[plek];
    }
    verversScherm();
  }));

  inhoud.append(maakKeuzeVeld("Welke werkgroep?", alleWerkgroepen, formulier.werkgroep, werkgroep => {
    formulier.werkgroep = werkgroep;
    verversScherm();   // de keuzelijst hieronder zet de leden van deze werkgroep bovenaan
  }));

  // Bij welk project hoort de taak? (niet verplicht)
  inhoud.append(maakProjectVeld(formulier));

  // Persoon kiezen kan pas als de werkgroep bekend is
  if (formulier.werkgroep) {
    const veld = document.createElement("div");
    veld.className = "veld";
    veld.append(maakPersoonKeuzelijst("Wie gaat het doen? (niet verplicht)", formulier.werkgroep,
      formulier.toegewezenAanId, formulier.toegewezenAan,
      persoonId => { formulier.toegewezenAanId = persoonId; }));
    inhoud.append(veld);
  }

  inhoud.append(maakInvoerVeld("Uiterlijk klaar op", "datum", formulier.deadline,
    waarde => { formulier.deadline = waarde; }));

  const fout = document.createElement("p");
  fout.id = "taak-fout";
  fout.className = "fout";
  fout.setAttribute("role", "alert");
  inhoud.append(fout);

  const knopTekst = formulier.modus === "wijzigen" ? "Wijzigingen opslaan" : "Taak aanmaken";
  const opslaan = maakHoofdKnop(knopTekst, slaTaakOp);
  opslaan.id = "knop-taak-opslaan";
  inhoud.append(opslaan);
  inhoud.append(maakTweedeKnop("Annuleren", () => {
    const terug = formulier.terugScherm;
    taakFormulier = null;
    toonScherm(terug);
  }));

  // Laten vervallen: apart, helemaal onderaan. Alleen bij een open taak.
  if (formulier.modus === "wijzigen" && formulier.taak.status === "open") {
    inhoud.append(maakVervalDeel(formulier));
  }

  markeerMenu(formulier.terugScherm);   // in het menu blijft het vorige scherm oplichten
}

// ===== PROJECT KIEZEN (in het taakformulier) =====
// Een taak hoort bij hooguit één project, bijvoorbeeld "Nieuw varkenshok"
// (database/19_projecten.sql). Keuzeknoppen: "Geen", de lopende projecten
// en "+ Nieuw project". Na een tik op "+ Nieuw project" verschijnt een
// tekstvak met de knop "Project toevoegen". Alleen bestuur en coördinator
// zien dit formulier; de database controleert dat ook.

const PROJECT_NAAM_MAX = 60;   // tekens; de database bewaakt dit ook

function maakProjectVeld(formulier) {
  // De lopende projecten. Hoort deze taak bij een afgerond project? Dan
  // staat dat er ook tussen, anders lijkt het alsof er geen project is.
  const keuzes = (lijsten.projecten || []).filter(p => p.actief);
  if (formulier.projectId && !keuzes.some(p => p.id === formulier.projectId)) {
    keuzes.push({ id: formulier.projectId, naam: projectNaam(formulier.projectId) + " (afgerond)" });
  }
  const gekozen = keuzes.find(p => p.id === formulier.projectId);

  const veld = maakKeuzeVeld("Bij welk project? (niet verplicht)",
    ["Geen", ...keuzes.map(p => p.naam)],
    gekozen ? gekozen.naam : "Geen",
    naam => {
      const project = keuzes.find(p => p.naam === naam);
      formulier.projectId = project ? project.id : null;
      formulier.nieuwProjectOpen = false;
      verversScherm();
    });

  // Knop "+ Nieuw project" achter de andere keuzes
  const nieuw = document.createElement("button");
  nieuw.textContent = "+ Nieuw project";
  nieuw.setAttribute("aria-pressed", !!formulier.nieuwProjectOpen);
  nieuw.addEventListener("click", () => {
    formulier.nieuwProjectOpen = !formulier.nieuwProjectOpen;
    verversScherm();
  });
  veld.querySelector(".kiezer").append(nieuw);

  // Het tekstvak voor de naam, alleen als "+ Nieuw project" open staat
  if (formulier.nieuwProjectOpen) {
    veld.append(maakInvoerVeld("Naam van het nieuwe project", "tekst", formulier.nieuwProjectNaam || "",
      waarde => { formulier.nieuwProjectNaam = waarde; }));
    veld.append(maakTweedeKnop("Project toevoegen", () => voegProjectToe(formulier)));
  }
  return veld;
}

// ➕ Nieuw project in de database, en meteen kiezen voor deze taak.
// "Ongedaan maken" haalt het project weer weg.
async function voegProjectToe(formulier) {
  const naam = (formulier.nieuwProjectNaam || "").trim();
  if (!naam) { toonMelding("Vul eerst de naam van het project in."); return; }
  if (naam.length > PROJECT_NAAM_MAX) {
    toonMelding("De naam is te lang (hooguit " + PROJECT_NAAM_MAX + " tekens). Maak hem korter.");
    return;
  }
  // Bestaat er al een project met deze naam (ook met andere hoofdletters)?
  const bestaand = (lijsten.projecten || []).find(p => p.naam.trim().toLowerCase() === naam.toLowerCase());
  if (bestaand && bestaand.actief) {
    formulier.projectId = bestaand.id;
    formulier.nieuwProjectOpen = false;
    formulier.nieuwProjectNaam = "";
    verversScherm();
    toonMelding("Dit project bestaat al. Het is nu gekozen.");
    return;
  }
  if (bestaand) {
    toonMelding("Er is al een afgerond project met deze naam. Kies een andere naam.");
    return;
  }

  // insert = nieuwe rij; select(...).single() = stuur het nieuwe project terug
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("projecten").insert({ naam }).select("id, naam, actief").single().abortSignal(signaal));
  if (!antwoord.gelukt) return;   // de melding onderaan zegt wat er mis is

  const project = antwoord.data;
  if (!lijsten.projecten) lijsten.projecten = [];
  lijsten.projecten.push(project);
  lijsten.projecten.sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  formulier.projectId = project.id;
  formulier.nieuwProjectOpen = false;
  formulier.nieuwProjectNaam = "";
  bewaarTakenOpToestel();
  if (huidigScherm === "taak-formulier") verversScherm();
  toonMelding("Project " + project.naam + " toegevoegd", () => verwijderProject(project, formulier));
}

// Haalt een project weg dat net is toegevoegd (alleen voor "Ongedaan maken").
// Dat kan alleen zolang er nog geen taak aan hangt.
async function verwijderProject(project, formulier) {
  if (taken.some(taak => taak.projectId === project.id)) {
    toonMelding("Er hangt al een taak aan dit project. Het blijft staan.");
    return;
  }
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("projecten").delete().eq("id", project.id).select("id").abortSignal(signaal));
  if (!antwoord.gelukt) return;
  if (antwoord.data.length === 0) {
    toonMelding("Dit project kon niet worden weggehaald. Ververs het scherm.");
    return;
  }
  lijsten.projecten = lijsten.projecten.filter(p => p.id !== project.id);
  if (formulier.projectId === project.id) formulier.projectId = null;
  bewaarTakenOpToestel();
  if (huidigScherm === "taak-formulier") verversScherm();
  toonMelding("Project weggehaald");
}

// ===== LATEN VERVALLEN =====
// Een taak die niet meer nodig is, wordt niet weggegooid maar krijgt de
// status "vervallen" (database/15_vervallen.sql). Alleen bestuur en
// coördinator kunnen een taak laten vervallen; iedereen die de taak mag
// bewerken kan hem weer openen. Vervallen taken staan onderaan "Alle taken".

let vervallenOpen = false;   // staat het kopje "Vervallen" open?

// Onderaan het taakformulier: knop, en na een tik het tekstvak voor de reden
function maakVervalDeel(formulier) {
  const deel = document.createElement("div");
  if (!formulier.vervalStap) {
    const knop = maakTweedeKnop("Laten vervallen", () => {
      formulier.vervalStap = true;
      toonTaakFormulier();
    });
    knop.classList.add("knop-stoppen");   // zelfde rode stijl als "Laten stoppen"
    deel.append(knop);
    return deel;
  }
  const veld = maakInvoerVeld("Waarom vervalt de taak? (niet verplicht)", "lang", formulier.vervalReden,
    waarde => { formulier.vervalReden = waarde; });
  veld.classList.add("opmerking-veld");
  veld.querySelector("textarea").maxLength = OPMERKING_MAX;
  veld.querySelector("textarea").placeholder = "Bijv. het hek wordt in het voorjaar vervangen";
  deel.append(veld);
  const doe = maakHoofdKnop("Laten vervallen", () => laatTaakVervallen(formulier.taak, formulier.vervalReden.trim()));
  doe.classList.add("knop-vervallen");
  deel.append(doe);
  deel.append(maakTweedeKnop("Toch niet", () => {
    formulier.vervalStap = false;
    toonTaakFormulier();
  }));
  return deel;
}

// ✕ Laten vervallen, met "Ongedaan maken"
async function laatTaakVervallen(taak, reden) {
  const antwoord = await stuurNaarDatabase(signaal =>
    database.rpc("taak_laten_vervallen", { taak_id: taak.id, reden: reden || null }).abortSignal(signaal));
  if (!antwoord.gelukt) return;   // formulier blijft staan; de melding zegt wat er mis is
  const meldingId = antwoord.data;   // losgekoppelde melding (of niets)

  if (taakFormulier && taakFormulier.taak === taak) {
    huidigScherm = taakFormulier.terugScherm;
    taakFormulier = null;
  }
  await haalTakenOp();   // alles opnieuw, ook de melding die weer op "Nieuw" staat
  verversScherm();
  toonMelding(meldingId ? "Taak vervallen. De melding staat weer op Nieuw." : "Taak vervallen",
              () => zetVervallenTaakTerug(taak, meldingId));
}

// ↺ Weer openen (ook "Ongedaan maken" na laten vervallen).
// meldingId (niet verplicht): die melding weer aan de taak koppelen.
async function zetVervallenTaakTerug(taak, meldingId = null) {
  const reden = taak.opmerking;   // onthouden voor "Ongedaan maken"
  if (!await vraagDatabase("taak_vervallen_terug", { taak_id: taak.id, melding_id: meldingId })) return;
  await haalTakenOp();
  verversScherm();
  // Alleen bestuur en coördinator kunnen hem daarna weer laten vervallen
  toonMelding("Taak staat weer open",
    ingelogdeGebruiker.magAllesZien ? () => laatTaakVervallen(taak, reden) : null);
}

// Onderaan "Alle taken": de vervallen taken, dichtgeklapt
function maakVervallenDeel(vervallen) {
  const deel = document.createElement("section");
  if (vervallen.length === 0) return deel;
  const knop = maakTweedeKnop((vervallenOpen ? "▾ " : "▸ ") + "Vervallen (" + vervallen.length + ")", () => {
    vervallenOpen = !vervallenOpen;
    verversScherm();
  });
  knop.setAttribute("aria-expanded", vervallenOpen);
  deel.append(knop);
  if (vervallenOpen) {
    vervallen.sort((a, b) => (b.vervallenOp || "").localeCompare(a.vervallenOp || ""));   // nieuwste eerst
    vervallen.forEach(taak => deel.append(maakTaakKaart(taak)));
  }
  return deel;
}

// Controleert het formulier en maakt of wijzigt de taak
async function slaTaakOp() {
  const formulier = taakFormulier;
  const fout = document.getElementById("taak-fout");
  if (!formulier.titel.trim()) { fout.textContent = "Geef de taak een titel."; return; }
  if (!formulier.plek)         { fout.textContent = "Kies waar het is."; return; }
  if (!formulier.werkgroep)    { fout.textContent = "Kies een werkgroep."; return; }
  if (!formulier.deadline)     { fout.textContent = "Kies een datum."; return; }

  // De ingevulde waarden, netjes bij elkaar (zoals de app ze kent: met namen)
  const waarden = {
    titel: formulier.titel.trim(),
    omschrijving: formulier.omschrijving,
    plek: formulier.plek,
    werkgroep: formulier.werkgroep,
    projectId: formulier.projectId,
    toegewezenAanId: formulier.toegewezenAanId,
    toegewezenAan: naamVanPersoon(formulier.toegewezenAanId) || formulier.toegewezenAan || "",
    deadline: formulier.deadline
  };

  // De knop uitzetten, zodat een tweede tik niet twee taken maakt
  const knop = document.getElementById("knop-taak-opslaan");
  if (knop) knop.disabled = true;

  // Wijzigen of nieuw. Mislukt het, dan blijft het formulier staan met alles
  // wat je had ingevuld (de melding onderaan zegt wat er mis is).
  let gelukt;
  if (formulier.modus === "wijzigen")      gelukt = await wijzigTaak(formulier.taak, waarden);
  else if (formulier.modus === "melding")  gelukt = await maakTaakUitMelding(waarden, formulier.melding);
  else                                     gelukt = await maakTaak(waarden);
  if (!gelukt) {
    if (knop) knop.disabled = false;
    return;
  }

  // Gelukt: terug naar het vorige scherm. Kom je terug op "Alle taken"?
  // Toon dan de werkgroep van deze taak, zodat je hem ziet.
  taakFormulier = null;
  if (formulier.terugScherm === "werkgroep" && gekozenWerkgroep !== "Alles") {
    gekozenWerkgroep = waarden.werkgroep;
  }
  huidigScherm = formulier.terugScherm;
  takenGewijzigd();
}

// Zet de waarden van een taak om naar een rij zoals de database die wil:
// met nummers in plaats van namen, en leeg = null.
function taakNaarRij(waarden) {
  return {
    titel: waarden.titel,
    omschrijving: waarden.omschrijving.trim() || null,
    plek: plekNummer[waarden.plek],
    werkgroep: werkgroepNummer[waarden.werkgroep],
    project: waarden.projectId || null,
    toegewezen_aan: waarden.toegewezenAanId || null,
    deadline: waarden.deadline || null
  };
}

// ➕ Nieuwe taak in de database. "Ongedaan maken" verwijdert hem weer.
// Geeft true als het gelukt is.
async function maakTaak(waarden) {
  // insert = nieuwe rij toevoegen; select("id") = stuur het nieuwe nummer terug
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("taken").insert(taakNaarRij(waarden)).select("id").single().abortSignal(signaal));
  if (!antwoord.gelukt) return false;

  const taak = {
    id: antwoord.data.id,   // het nummer dat de database heeft gegeven
    ...waarden,
    status: "open",
    gereedGemeldDoor: "",
    fotoPad: "",
    meldingFotoPad: ""   // niet uit een melding
  };
  taken.push(taak);
  toonMelding("Taak aangemaakt", () => verwijderTaak(taak));
  return true;
}

// Haalt een taak weg die net is aangemaakt (alleen voor "Ongedaan maken")
// Geeft true als het gelukt is.
async function verwijderTaak(taak) {
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("taken").delete().eq("id", taak.id).select("id").abortSignal(signaal));
  if (!antwoord.gelukt) return false;
  if (antwoord.data.length === 0) {
    // Niets verwijderd: de taak bestond al niet meer, of je mocht het niet
    toonMelding("Deze taak kon niet worden weggehaald. Ververs het scherm.");
    return false;
  }
  taken.splice(taken.indexOf(taak), 1);
  takenGewijzigd();
  toonMelding("Taak weggehaald");
  return true;
}

// 📋 "Maak taak" bij een melding: taak maken én koppelen, in één keer, via
// de vaste actie taak_uit_melding (database/06_meldingen.sql).
// "Ongedaan maken" verwijdert de taak; de melding staat dan weer op "Nieuw".
// Geeft true als het gelukt is.
async function maakTaakUitMelding(waarden, melding) {
  const rij = taakNaarRij(waarden);
  const antwoord = await stuurNaarDatabase(signaal =>
    database.rpc("taak_uit_melding", {
      melding_id: melding.id,
      titel: rij.titel,
      omschrijving: rij.omschrijving,
      plek: rij.plek,
      werkgroep: rij.werkgroep,
      persoon: rij.toegewezen_aan,
      deadline: rij.deadline
    }).abortSignal(signaal));
  if (!antwoord.gelukt) return false;

  // Het project gaat niet mee in de vaste actie; dat zetten we er meteen
  // achteraan. Lukt dat niet, dan bestaat de taak wel, maar zonder project.
  let projectId = waarden.projectId;
  if (projectId) {
    const metProject = await stuurNaarDatabase(signaal =>
      database.from("taken").update({ project: projectId }).eq("id", antwoord.data)
        .select("id").abortSignal(signaal));
    if (!metProject.gelukt || metProject.data.length === 0) projectId = null;
  }

  const taak = {
    id: antwoord.data,   // het nummer van de nieuwe taak
    ...waarden,
    projectId,
    status: "open",
    gereedGemeldDoor: "",
    fotoPad: "",
    meldingFotoPad: melding.fotoPad,
    meldingTekst: melding.tekst,
    meldingDoor: melding.gemeldDoor
  };
  taken.push(taak);
  melding.taakId = taak.id;
  melding.status = waarden.toegewezenAanId ? "Toegewezen" : "Taak gemaakt";
  const tekst = waarden.projectId && !projectId
    ? "Taak gemaakt, maar zonder project. Kies het project via Wijzigen."
    : "Taak gemaakt van de melding";
  toonMelding(tekst, async () => {
    if (await verwijderTaak(taak)) {
      melding.taakId = null;
      melding.status = "Nieuw";
      takenGewijzigd();
    }
  });
  return true;
}

// ✏ Bestaande taak wijzigen. "Ongedaan maken" zet de oude waarden terug.
// Geeft true als het gelukt is.
async function wijzigTaak(taak, waarden) {
  const oud = {   // hoe de taak was, voor "Ongedaan maken"
    titel: taak.titel,
    omschrijving: taak.omschrijving,
    plek: taak.plek,
    werkgroep: taak.werkgroep,
    projectId: taak.projectId || null,
    toegewezenAanId: taak.toegewezenAanId || "",
    toegewezenAan: taak.toegewezenAan,
    deadline: taak.deadline
  };
  // update = rij aanpassen; eq("id", …) = alleen de rij met dit nummer
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from("taken").update(taakNaarRij(waarden)).eq("id", taak.id).select("id").abortSignal(signaal));
  if (!antwoord.gelukt) return false;
  if (antwoord.data.length === 0) {
    // Niets gewijzigd: de taak bestaat niet meer, of je mag hem niet wijzigen
    toonMelding("Deze taak kon niet worden gewijzigd. Misschien is hij weggehaald. Ververs het scherm.");
    return false;
  }
  Object.assign(taak, waarden);
  toonMelding("Taak gewijzigd", async () => {
    if (await wijzigTaak(taak, oud)) takenGewijzigd();
  });
  return true;
}

// ===== TAKEN UIT DE DATABASE =====
// De database bewaart plek, werkgroep en persoon als nummers die naar een
// andere tabel wijzen. De app werkt met namen ("Weides", "Klussen", "Piet").
// haalTakenOp vraagt de taken op en zet de nummers om in namen.
//
// Slecht bereik: na elke keer ophalen bewaren we de lijst op de telefoon.
// Lukt ophalen niet, dan laten we de bewaarde lijst zien, met de tijd erbij.

// Hoe lang we op de database wachten (in milliseconden: 8000 = 8 seconden)
const WACHTTIJD_DATABASE = 8000;

// Wat er boven de takenlijst staat als we de bewaarde lijst laten zien
// ("" = niets, alles is net opgehaald)
let takenUitleg = "";

async function haalTakenOp() {
  try {
    const antwoord = await vraagTakenOpBijDatabase();
    taken.splice(0, taken.length, ...antwoord.taken);   // lijst leegmaken en vullen
    mijnToewijsNaam = antwoord.mijnNaam;
    personen = antwoord.personen;
    lijsten = antwoord.lijsten;
    zetLijsten(lijsten);
    meldingen.splice(0, meldingen.length, ...antwoord.meldingen);
    takenUitleg = "";
    bewaarTakenOpToestel();
    await haalFotoLinksOp();   // tijdelijke links voor de foto's na afloop
  } catch (fout) {
    console.warn("Taken ophalen mislukt:", fout);
    const bewaard = leesOpslag(OPSLAG_TAKEN);
    if (bewaard && bewaard.gebruikerId === ingelogdeGebruiker.id) {
      taken.splice(0, taken.length, ...bewaard.taken);
      mijnToewijsNaam = bewaard.mijnNaam;
      personen = bewaard.personen || [];
      lijsten = bewaard.lijsten || lijsten;
      zetLijsten(lijsten);
      meldingen.splice(0, meldingen.length, ...(bewaard.meldingen || []));
      takenUitleg = "Geen verbinding. Je ziet de lijst van " + leesbareTijd(bewaard.tijd) + ".";
    } else {
      taken.splice(0, taken.length);
      takenUitleg = "Geen verbinding. De taken konden niet worden geladen. " +
                    "Open de app opnieuw als je bereik hebt.";
    }
  }
}

// Bewaart de takenlijst op de telefoon, voor als er straks geen bereik is
function bewaarTakenOpToestel() {
  schrijfOpslag(OPSLAG_TAKEN, {
    gebruikerId: ingelogdeGebruiker.id,   // zodat iemand anders ze nooit ziet
    tijd: Date.now(),
    mijnNaam: mijnToewijsNaam,
    taken: taken,
    personen: personen,   // alleen gevuld voor bestuur en coördinator
    lijsten: lijsten,     // werkgroepen en plekken
    meldingen: meldingen  // zonder foto's: alleen waar de foto staat
  });
}

// Werkgroepen, plekken en projecten zoals laatst opgehaald (met hun nummers)
let lijsten = { werkgroepen: [], plekken: [], projecten: [] };

// Naam van een project bij zijn nummer (ook van een afgerond project)
function projectNaam(id) {
  const project = (lijsten.projecten || []).find(p => p.id === id);
  return project ? project.naam : "Onbekend project";
}

// Haalt de taken opnieuw op en tekent het scherm opnieuw, als je nog op
// hetzelfde scherm bent. Gebruikt bij een tik op "Mijn taken" of "Alle taken".
async function ververs(scherm) {
  await haalTakenOp();
  if (huidigScherm === scherm) verversScherm();
}

// Zet werkgroepen en plekken uit de database in de lijsten die de schermen gebruiken
function zetLijsten(lijsten) {
  alleWerkgroepen = lijsten.werkgroepen.map(w => w.naam);
  werkgroepNummer = {};
  lijsten.werkgroepen.forEach(w => { werkgroepNummer[w.naam] = w.id; });

  // Alleen plekken die meedoen worden knoppen. De namen van alle plekken
  // (ook oude) zijn nodig om oude meldingen te kunnen laten zien.
  const actievePlekken = lijsten.plekken.filter(p => p.actief !== false);
  plekNamen = actievePlekken.map(p => p.naam);
  plekNummer = {};
  plekNaamVan = {};
  werkgroepBijPlek = {};
  lijsten.plekken.forEach(p => { plekNaamVan[p.id] = p.naam; });
  actievePlekken.forEach(p => {
    plekNummer[p.naam] = p.id;
    // Alleen een werkgroep die meedoet alvast invullen (een uitgezette kun je niet kiezen)
    if (p.werkgroep && werkgroepNummer[p.werkgroep]) werkgroepBijPlek[p.naam] = p.werkgroep;
  });
}

// Opzoektabel: nummer van een plek → naam (ook van plekken die niet meer meedoen)
let plekNaamVan = {};

// Het echte werk: zes vragen aan de database (zeven voor bestuur), voor taken,
// meldingen, namen, werkgroepen, plekken en projecten.
// De database geeft alleen de taken die jij mag zien (regels in 03_rechten.sql).
async function vraagTakenOpBijDatabase() {
  // Stopt het wachten na WACHTTIJD_DATABASE, zodat de app niet blijft hangen
  const stopper = new AbortController();
  const wekker = setTimeout(() => stopper.abort(), WACHTTIJD_DATABASE);
  try {
    // 1. De taken. "plekken(naam)" en "werkgroepen(naam)" halen meteen de
    //    naam op uit de tabel waar het nummer naar wijst.
    const takenVraag = database
      .from("taken")
      .select("id, titel, omschrijving, deadline, status, toegewezen_aan, gereed_gemeld_door, foto_na_afloop, " +
              "opmerking, opmerking_door, vervallen_door, vervallen_op, project, " +
              "plek_naam:plekken(naam), werkgroep_naam:werkgroepen(naam), " +
              // de melding waar de taak uit komt (als die er is)
              "melding:meldingen(id, foto, toelichting, gemeld_door)")
      .abortSignal(stopper.signal);

    // 2. De namen van alle gebruikers ("Piet", of "Piet P." bij een dubbele voornaam).
    //    Ook van wie gestopt is: die naam blijft bij oude taken staan.
    const namenVraag = database
      .from("gebruikers_weergave")
      .select("id, naam, actief")
      .abortSignal(stopper.signal);

    // 3. Alleen voor bestuur en coördinator: wie zit in welke werkgroep
    //    (voor de keuzelijst bij toewijzen). Anderen: een lege lijst.
    const ledenVraag = ingelogdeGebruiker.magAllesZien
      ? database.from("lidmaatschappen").select("gebruiker, werkgroepen(naam)").abortSignal(stopper.signal)
      : Promise.resolve({ data: [], error: null });

    // 4. De werkgroepen die meedoen (actief), in de volgorde uit het beheerscherm
    //    (zonder volgorde: achteraan, op nummer)
    const werkgroepenVraag = database
      .from("werkgroepen")
      .select("id, naam")
      .eq("actief", true)
      .order("volgorde", { nullsFirst: false })
      .order("id")
      .abortSignal(stopper.signal);

    // 5. Alle plekken, in de volgorde van de knoppen, met de werkgroep die
    //    er meestal bij hoort. Ook plekken die niet meer meedoen (actief =
    //    false): die worden geen knop, maar oude meldingen hebben hun naam nodig.
    const plekkenVraag = database
      .from("plekken")
      .select("id, naam, volgorde, actief, werkgroep:werkgroepen(naam)")
      .order("volgorde")
      .abortSignal(stopper.signal);

    // 6. Meldingen, met hun status. Vrijwilligers: alleen hun eigen.
    let meldingenVraag = database
      .from("meldingen_met_status")
      .select("id, plek, foto, toelichting, gevaarlijk, gemeld_door, gemeld_op, taak, " +
              "geen_actie_reden, geen_actie_door, status");
    if (!ingelogdeGebruiker.magAllesZien) {
      meldingenVraag = meldingenVraag.eq("gemeld_door", ingelogdeGebruiker.id);
    }
    meldingenVraag = meldingenVraag.abortSignal(stopper.signal);

    // 7. Alle projecten (ook afgeronde: oude taken hebben hun naam nodig),
    //    op alfabet. Zie database/19_projecten.sql.
    const projectenVraag = database
      .from("projecten")
      .select("id, naam, actief")
      .order("naam")
      .abortSignal(stopper.signal);

    // Alle vragen tegelijk versturen, en wachten tot ze allemaal klaar zijn
    const antwoorden = await Promise.all(
      [takenVraag, namenVraag, ledenVraag, werkgroepenVraag, plekkenVraag, meldingenVraag, projectenVraag]);
    for (const antwoord of antwoorden) {
      if (antwoord.error) throw antwoord.error;
    }
    const [takenAntwoord, namenAntwoord, ledenAntwoord, werkgroepenAntwoord, plekkenAntwoord,
           meldingenAntwoord, projectenAntwoord] = antwoorden;

    // Werkgroepen, plekken en projecten, in een eenvoudige vorm
    const lijsten = {
      projecten: projectenAntwoord.data.map(p => ({ id: p.id, naam: p.naam, actief: p.actief })),
      werkgroepen: werkgroepenAntwoord.data.map(w => ({ id: w.id, naam: w.naam })),
      plekken: plekkenAntwoord.data.map(p => ({
        id: p.id,
        naam: p.naam,
        actief: p.actief,
        werkgroep: p.werkgroep ? p.werkgroep.naam : ""   // "" bij bijv. "Overig"
      }))
    };
    const plekNaam = {};
    lijsten.plekken.forEach(p => { plekNaam[p.id] = p.naam; });

    // Opzoeklijst: nummer van een gebruiker → naam
    const naamVan = {};
    namenAntwoord.data.forEach(persoon => { naamVan[persoon.id] = persoon.naam; });

    // De lijst personen voor de keuzelijst: alleen wie actief is, op alfabet
    const nieuwePersonen = ingelogdeGebruiker.magAllesZien
      ? namenAntwoord.data
          .filter(persoon => persoon.actief)
          .map(persoon => ({
            id: persoon.id,
            naam: persoon.naam,
            werkgroepen: ledenAntwoord.data
              .filter(lid => lid.gebruiker === persoon.id)
              .map(lid => lid.werkgroepen.naam)
          }))
          .sort((a, b) => a.naam.localeCompare(b.naam, "nl"))
      : [];

    // Elke rij uit de database omzetten naar een taak zoals de app die kent
    const nieuweTaken = takenAntwoord.data.map(rij => {
      // De melding waar de taak uit komt. De database stuurt die als één
      // melding of als lijstje met één melding; we vangen beide op.
      const melding = Array.isArray(rij.melding) ? rij.melding[0] : rij.melding;
      return {
        id: rij.id,
        titel: rij.titel,
        omschrijving: rij.omschrijving || "",
        plek: rij.plek_naam.naam,
        werkgroep: rij.werkgroep_naam.naam,
        projectId: rij.project || null,                     // nummer van het project (null = geen)
        toegewezenAanId: rij.toegewezen_aan || "",          // nummer, om te vergelijken
        toegewezenAan: naamVan[rij.toegewezen_aan] || "",   // naam, om te laten zien
        deadline: rij.deadline || "",
        status: rij.status,
        gereedGemeldDoor: naamVan[rij.gereed_gemeld_door] || "",
        vervallenDoor: naamVan[rij.vervallen_door] || "",          // bij status "vervallen"
        vervallenOp: rij.vervallen_op || "",
        opmerking: rij.opmerking || "",                          // opmerking na afloop
        opmerkingDoor: naamVan[rij.opmerking_door] || "",
        fotoPad: rij.foto_na_afloop || "",   // waar de foto na afloop in de fotomap staat
        // Van de melding (leeg als de taak niet uit een melding komt):
        meldingFotoPad: melding ? melding.foto : "",
        meldingTekst: melding ? melding.toelichting || "" : "",
        meldingDoor: melding ? naamVan[melding.gemeld_door] || "" : ""
      };
    });

    // Mijn eigen naam zoals de app hem laat zien (bijv. "Piet P.")
    const mijnNaam = naamVan[ingelogdeGebruiker.id] || ingelogdeGebruiker.naam;
    // Elke melding omzetten naar de vorm die de app kent
    const nieuweMeldingen = meldingenAntwoord.data.map(rij => ({
      id: rij.id,
      plek: plekNaam[rij.plek] || "Onbekende plek",
      fotoPad: rij.foto,                 // waar de foto in de fotomap staat
      tekst: rij.toelichting || "",
      gevaarlijk: rij.gevaarlijk,
      gemeldDoorId: rij.gemeld_door,
      gemeldDoor: naamVan[rij.gemeld_door] || "",
      datum: rij.gemeld_op,              // datum en tijd, bijv. "2026-11-15T10:32:00+00:00"
      taakId: rij.taak,
      status: rij.status,
      geenActieReden: rij.geen_actie_reden || "",
      geenActieDoor: naamVan[rij.geen_actie_door] || ""
    }));

    return { taken: nieuweTaken, mijnNaam, personen: nieuwePersonen, lijsten, meldingen: nieuweMeldingen };
  } finally {
    clearTimeout(wekker);   // wekker uitzetten, ook als er iets misging
  }
}

// Zet een tijdstip om in "14:32" (vandaag) of "di 14 okt 14:32" (eerder)
function leesbareTijd(tijd) {
  const datum = new Date(tijd);
  const uur = datum.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (datum.toDateString() === new Date().toDateString()) return uur;
  return datum.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) + " " + uur;
}

// ===== MELDING ONDERAAN =====
let meldingTimer = null;      // de "wekker" die de melding weer verbergt
let ongedaanActie = null;     // wat er gebeurt bij "Ongedaan maken"

// Zonder actieBijOngedaan (bijv. "Even geduld…" of een fout) is er geen knop.
function toonMelding(tekst, actieBijOngedaan) {
  document.getElementById("melding-tekst").textContent = tekst;
  ongedaanActie = actieBijOngedaan || null;
  document.getElementById("knop-ongedaan").hidden = !actieBijOngedaan;
  document.getElementById("melding").hidden = false;
  clearTimeout(meldingTimer);                              // oude wekker uitzetten
  meldingTimer = setTimeout(verbergMelding, MELDING_DUUR); // nieuwe wekker zetten
}

function verbergMelding() {
  document.getElementById("melding").hidden = true;
  ongedaanActie = null;
}

document.getElementById("knop-ongedaan").addEventListener("click", () => {
  if (ongedaanActie) ongedaanActie();
  verbergMelding();
});

// ===== SCHERMEN =====

let huidigScherm = "mijn";   // onthoudt welk scherm open is

// Sommige knoppen blijven bij het scrollen net ONDER de groene kopbalk staan
// (+ Nieuwe taak, de keuzeknoppen bij Beheer). De kopbalk is niet altijd even
// hoog (een lange titel past soms niet op één regel), dus meten we hem en zetten
// we de hoogte in --kopbalk-hoogte (gebruikt in stijl.css). Een ResizeObserver
// meldt zich elke keer als de kopbalk van grootte verandert.
new ResizeObserver(() => {
  const hoogte = document.querySelector("header").offsetHeight;
  document.documentElement.style.setProperty("--kopbalk-hoogte", hoogte + "px");
}).observe(document.querySelector("header"));

// Opent het scherm dat bij een naam hoort
function toonScherm(scherm) {
  if (scherm === "mijn") toonMijnTaken();
  else if (scherm === "werkgroep") toonWerkgroep();
  else if (scherm === "melden") toonMelden();
  else if (scherm === "meldingen") toonMeldingen();
  else if (scherm === "taak-formulier") toonTaakFormulier();   // NIEUW (nieuwe naam)
  else if (scherm === "beheer") toonBeheer();                  // staat in beheer.js
  else if (scherm === "gebruiker-formulier") toonGebruikerFormulier();   // ook in beheer.js
  else if (scherm === "herstel") toonHerstelScherm();                     // ook in beheer.js
  else if (scherm === "lijst-formulier") toonLijstFormulier();            // in beheer-lijsten.js
  // Staat er een nieuwe versie klaar? Dan nu laden, als het een rustig moment is.
  if (nieuweVersieKlaar) laadNieuweVersieAlsHetKan();
}

// Tekent het huidige scherm opnieuw (na een wijziging)
function verversScherm() {
  toonScherm(huidigScherm);
}

// Laat in het menu zien welk scherm open is
function markeerMenu(scherm) {
  document.querySelectorAll("nav button").forEach(knop => {
    if (knop.dataset.scherm === scherm) knop.setAttribute("aria-current", "page");
    else knop.removeAttribute("aria-current");
  });
}

// Zet een lijst taken op het scherm
function toonLijst(lijst) {
  const inhoud = document.getElementById("inhoud");

  // Geen verbinding? Zeg dat boven de lijst.
  if (takenUitleg) {
    const uitleg = document.createElement("p");
    uitleg.className = "uitleg-bovenaan";
    uitleg.setAttribute("role", "status");
    uitleg.textContent = "📶 " + takenUitleg;
    inhoud.append(uitleg);
  }

  if (lijst.length === 0) {
    const leeg = document.createElement("p");
    leeg.className = "leeg";
    leeg.textContent = "Er zijn hier geen taken.";
    inhoud.append(leeg);
    return;
  }
  lijst.sort(sorteerTaken);
  lijst.forEach(taak => inhoud.append(maakTaakKaart(taak)));
}

// Knop "+ Nieuwe taak" voor bestuur en coördinator, bovenaan Mijn taken en
// Alle taken. Hij staat in een eigen vakje dat bovenaan blijft staan als je naar
// beneden scrollt (stijl.css, .vaste-knop).
function maakNieuweTaakKnop(terugScherm) {
  const vak = document.createElement("div");
  vak.className = "vaste-knop";
  vak.append(maakHoofdKnop("+ Nieuwe taak", () => openNieuweTaak(terugScherm)));
  return vak;
}

function toonMijnTaken() {
  huidigScherm = "mijn";
  document.getElementById("titel").textContent = "Mijn taken";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren(); // scherm leegmaken
  if (ingelogdeGebruiker.magAllesZien) inhoud.append(maakNieuweTaakKnop("mijn"));
  toonLijst(taken.filter(taak => isMijnTaak(taak) && taak.status !== "vervallen"));
  markeerMenu("mijn");
}

let gekozenWerkgroep = "";   // leeg = de eerste keuze (zie hieronder)

function toonWerkgroep() {
  huidigScherm = "werkgroep";
  // Op het scherm heet dit "Alle taken" (intern nog "werkgroep", zie index.html)
  document.getElementById("titel").textContent = "Alle taken";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  // Welke keuzes krijgt deze persoon?
  // Je eigen werkgroepen in dezelfde volgorde als overal (uitgezette achteraan)
  const mijnWerkgroepen = [
    ...alleWerkgroepen.filter(naam => ingelogdeGebruiker.werkgroepen.includes(naam)),
    ...ingelogdeGebruiker.werkgroepen.filter(naam => !alleWerkgroepen.includes(naam))
  ];
  const keuzes = ingelogdeGebruiker.magAllesZien
    ? ["Alles", ...alleWerkgroepen]
    : mijnWerkgroepen;
  if (!keuzes.includes(gekozenWerkgroep)) gekozenWerkgroep = keuzes[0];

  // Keuzeknoppen alleen tonen als er iets te kiezen valt
  if (keuzes.length > 1) {
    const kiezer = document.createElement("div");
    kiezer.className = "kiezer";
    keuzes.forEach(naam => {
      const knop = document.createElement("button");
      knop.textContent = naam;
      knop.setAttribute("aria-pressed", naam === gekozenWerkgroep);
      knop.addEventListener("click", () => {
        gekozenWerkgroep = naam;
        toonWerkgroep();
      });
      kiezer.append(knop);
    });
    inhoud.append(kiezer);
  }

  // Bestuur en coördinator kunnen hier een nieuwe taak maken
  if (ingelogdeGebruiker.magAllesZien) inhoud.append(maakNieuweTaakKnop("werkgroep"));

  const lijst = gekozenWerkgroep === "Alles"
    ? [...taken]
    : taken.filter(taak => taak.werkgroep === gekozenWerkgroep);
  toonLijst(lijst.filter(taak => taak.status !== "vervallen"));
  inhoud.append(maakVervallenDeel(lijst.filter(taak => taak.status === "vervallen")));
  markeerMenu("werkgroep");
}

// ===== START =====
// Elke menuknop opent het scherm dat in zijn "data-scherm" staat
// Bij de takenschermen halen we daarna ook de nieuwste taken op: je ziet meteen
// de lijst die je al had, en zodra de database antwoordt de nieuwste.
document.querySelectorAll("nav button").forEach(knop => {
  knop.addEventListener("click", () => {
    const scherm = knop.dataset.scherm;
    toonScherm(scherm);
    if (scherm === "mijn" || scherm === "werkgroep" || scherm === "meldingen") ververs(scherm);
  });
});

// Start de app voor de ingelogde persoon. Wordt aangeroepen door inloggen.js
// zodra bekend is wie er is ingelogd. "profiel" komt uit de database.
// "async" betekent: deze functie mag wachten (hier: op de database).
async function startApp(profiel) {
  ingelogdeGebruiker.id = profiel.id;
  ingelogdeGebruiker.naam = profiel.naam;
  ingelogdeGebruiker.werkgroepen = profiel.werkgroepen;
  ingelogdeGebruiker.magAllesZien = profiel.rol === "bestuur" || profiel.rol === "coordinator";
  ingelogdeGebruiker.isBeheerder = profiel.isBeheerder;
  // Knop "Beheer" bovenin alleen voor beheerders (het scherm staat in beheer.js)
  document.getElementById("knop-beheer").hidden = !profiel.isBeheerder;
  mijnToewijsNaam = ingelogdeGebruiker.naam;

  // Direct laten zien dat er iets gebeurt, dan de taken ophalen
  document.getElementById("titel").textContent = "Mijn taken";
  const laden = document.createElement("p");
  laden.className = "leeg";
  laden.textContent = "Taken laden…";
  document.getElementById("inhoud").replaceChildren(laden);
  await haalTakenOp();
  toonMijnTaken();
}

// Eerst inloggen (of nagaan of je al bent ingelogd). Staat in inloggen.js.
startMetInloggen();

// Zet de service worker aan: die bewaart de app op de telefoon, zodat hij
// ook bij slecht bereik opent. Uitleg staat in service-worker.js.
// Oude browsers kennen dit niet; dan werkt de app gewoon zonder.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

// ===== NIEUWE VERSIE VAN DE APP =====
// Een app op het beginscherm wordt vaak niet echt opnieuw geopend: de telefoon
// haalt hem terug van de achtergrond, met de oude versie nog in het geheugen.
// Daarom kijkt de app elke keer dat hij weer in beeld komt (hooguit één keer
// per minuut) of de bestanden bij GitHub veranderd zijn. Zo ja, dan laadt hij
// de nieuwe versie, maar alleen op een rustig moment (niet midden in een
// formulier).
//
// Hoe weet de app of er iets veranderd is? Hij vraagt per bestand alleen de
// "kopregels" op (HEAD), niet het bestand zelf. Daarin staat een kenmerk dat
// verandert zodra het bestand verandert (ETag, of anders datum en grootte).

const VERSIE_BESTANDEN = ["index.html", "stijl.css", "instellingen.js", "inloggen.js",
                          "beheer.js", "beheer-lijsten.js", "hulp.js", "HANDLEIDING.md",
                          "app.js", "service-worker.js"];
const VERSIE_CONTROLE_ELKE = 60 * 1000;   // hooguit één keer per minuut kijken

let geladenVersie = "";          // kenmerk van de versie die nu draait
let laatsteVersieControle = 0;   // wanneer we het laatst keken
let nieuweVersieKlaar = false;   // true = er staat een nieuwe versie klaar

// Het kenmerk van de bestanden zoals ze nu bij GitHub staan.
// Geeft "" als het niet lukt (bijv. geen bereik).
async function haalVersieKenmerkOp() {
  try {
    const delen = await Promise.all(VERSIE_BESTANDEN.map(async bestand => {
      const antwoord = await fetch(bestand, { method: "HEAD", cache: "no-cache" });
      if (!antwoord.ok) throw new Error(bestand + ": " + antwoord.status);
      const kop = antwoord.headers;
      return kop.get("etag") || (kop.get("last-modified") + "/" + kop.get("content-length"));
    }));
    return delen.join("|");
  } catch (fout) {
    console.warn("Versie controleren lukt niet:", fout);
    return "";
  }
}

// Kijkt of er een nieuwe versie is (en onthoudt bij de eerste keer de huidige)
async function controleerVersie() {
  if (nieuweVersieKlaar || Date.now() - laatsteVersieControle < VERSIE_CONTROLE_ELKE) return;
  laatsteVersieControle = Date.now();
  const kenmerk = await haalVersieKenmerkOp();
  if (!kenmerk) return;                                 // geen bereik: volgende keer
  if (!geladenVersie) { geladenVersie = kenmerk; return; }
  if (kenmerk !== geladenVersie) {
    nieuweVersieKlaar = true;
    laadNieuweVersieAlsHetKan();
  }
}

// Is dit een rustig moment? (Niet midden in een formulier of tekstvak.)
function isRustigMoment() {
  const rustigeSchermen = ["mijn", "werkgroep", "meldingen", "beheer"];
  return ingelogdeGebruiker.id !== null          // niet op het inlogscherm
      && rustigeSchermen.includes(huidigScherm)
      && opmerkingOpenBij === null && meldingMetRedenOpen === null
      && !document.getElementById("hulp-venster").open;   // niet terwijl de hulp open is
}

let versieMeldingGetoond = false;

// Laadt de nieuwe versie, of zegt dat dat straks gebeurt
async function laadNieuweVersieAlsHetKan() {
  if (!isRustigMoment()) {
    if (!versieMeldingGetoond) {
      toonMelding("Er is een nieuwe versie van de app. Die wordt geladen als je klaar bent.");
      versieMeldingGetoond = true;
    }
    return;
  }
  toonMelding("Nieuwe versie van de app laden…");
  await vraagServiceWorkerNieuweKopie();
  location.reload();
}

// Vraagt de service worker om eerst alle nieuwe bestanden op te halen, zodat
// het herladen zeker de nieuwe versie geeft (ook bij een trage verbinding).
// Wacht hooguit 15 seconden.
function vraagServiceWorkerNieuweKopie() {
  const werker = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!werker) return Promise.resolve();
  return new Promise(klaar => {
    const kanaal = new MessageChannel();
    kanaal.port1.onmessage = () => klaar();
    werker.postMessage("haal-nieuwe-versie", [kanaal.port2]);
    setTimeout(klaar, 15000);
  });
}

// Bij het starten: de huidige versie onthouden
controleerVersie();
// Elke keer dat de app weer in beeld komt: kijken of er iets nieuws is.
// Ook de service worker zelf laten kijken of hij een nieuwe versie heeft.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  controleerVersie();
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  }
});
