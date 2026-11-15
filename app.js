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

const alleWerkgroepen = ["Dieren", "Tuinen", "Avontuurlijk spelen", "Klussen", "Educatie", "Evenementen", "Geschiedenis"];

// Alle vrijwilligers en hun werkgroepen. Nodig voor de keuzelijst bij toewijzen.
const vrijwilligers = [
  { naam: "Kirsten", werkgroepen: ["Dieren", "Klussen"] },
  { naam: "Piet",    werkgroepen: ["Dieren"] },
  { naam: "Fatima",  werkgroepen: ["Tuinen"] },
  { naam: "Kees",    werkgroepen: ["Evenementen", "Klussen"] },
  { naam: "Sanne",   werkgroepen: ["Educatie", "Geschiedenis", "Avontuurlijk spelen"] }
];

// De naam waarmee een taak aan Frion als groep wordt toegewezen
const FRION = "Frion";

// De taken. Deze lijst is eerst leeg. Na het inloggen vult haalTakenOp hem
// met de taken uit de database (zie "TAKEN UIT DE DATABASE", verderop).
// "meldingFoto" is de foto uit een melding.
const taken = [];

// Vaste plekken op het park, voor "Waar is het?" (bij meldingen én taken)
const PLEKKEN = ["Stal", "Weides", "Wortelhoeve", "Hummelhoeve", "Speelkasteel", "Waterspelen", "Trekvlot",
                 "Wilgenburcht", "Moestuin", "Belevenistuin", "Gebouw", "Overig"];

// Opzoektabel: bij welke werkgroep hoort een plek meestal?
const PLEK_WERKGROEP = {
  "Stal": "Dieren",
  "Weides": "Dieren",
  "Wortelhoeve": "Dieren",
  "Hummelhoeve": "Avontuurlijk spelen",
  "Speelkasteel": "Avontuurlijk spelen",
  "Waterspelen": "Avontuurlijk spelen",
  "Trekvlot": "Avontuurlijk spelen",
  "Wilgenburcht": "Avontuurlijk spelen",
  "Moestuin": "Tuinen",
  "Belevenistuin": "Tuinen",
  "Gebouw": "Klussen"
};

// Voorbeeldmeldingen.
// taakId = het nummer van de taak die van deze melding is gemaakt (null = nog geen taak).
// geenActie = true als het bestuur heeft besloten dat er niets hoeft te gebeuren.
const meldingen = [
  { plek: "Speelkasteel", tekst: "Splinter in de leuning van de trap.", gevaarlijk: true, gemeldDoor: "Kirsten", datum: "2026-10-09", foto: "", taakId: null, geenActie: false },
  { plek: "Weides", tekst: "Hek weide 3 gaat niet meer dicht.", gevaarlijk: false, gemeldDoor: "Piet", datum: "2026-10-05", foto: "", taakId: null, geenActie: false },
  { plek: "Gebouw", tekst: "Lamp bij de ingang flikkert.", gevaarlijk: false, gemeldDoor: "Kirsten", datum: "2026-10-02", foto: "", taakId: null, geenActie: true, geenActieReden: "Lamp is al vervangen door de bistro.", geenActieDoor: "Jan" }    ];

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

// Het volgende vrije taaknummer (later regelt de database dit)
function volgendeTaakId() {
  return Math.max(0, ...taken.map(taak => taak.id)) + 1;
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

// Is deze taak van mij? (of van Frion, als ik Frion-begeleider ben)
function isMijnTaak(taak) {
  return taak.toegewezenAan === mijnToewijsNaam;
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
      // Tijdelijk: de foto staat alleen in het geheugen van de telefoon.
      bijFoto(URL.createObjectURL(kleineFoto));
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

// Maakt een invoerveld. soort = "tekst" (één regel), "lang" (meer regels) of "datum".
function maakInvoerVeld(labelTekst, soort, waarde, bijWijzigen) {
  const veld = document.createElement("div");
  veld.className = "veld";
  const label = document.createElement("label");
  label.className = "veld-titel";
  label.textContent = labelTekst;

  const invoer = document.createElement(soort === "lang" ? "textarea" : "input");
  if (soort === "tekst") invoer.type = "text";
  if (soort === "datum") invoer.type = "date";
  invoer.value = waarde;
  invoer.addEventListener("input", () => bijWijzigen(invoer.value));

  label.append(invoer);
  veld.append(label);
  return veld;
}

// Maakt een keuzelijst (select) met namen. "" wordt getoond als "Nog niemand".
function maakKeuzelijst(labelTekst, opties, gekozen, bijKiezen) {
  const label = document.createElement("label");
  label.className = "toewijzen";
  label.textContent = labelTekst;

  const keuze = document.createElement("select");
  opties.forEach(naam => {
    const optie = document.createElement("option");
    optie.value = naam;
    optie.textContent = naam || "Nog niemand";
    optie.selected = naam === gekozen;
    keuze.append(optie);
  });
  keuze.addEventListener("change", () => bijKiezen(keuze.value));
  label.append(keuze);
  return label;
}

// Wie kun je kiezen bij een werkgroep?
function toewijsOpties(werkgroep, huidige) {
  const leden = vrijwilligers
    .filter(v => v.werkgroepen.includes(werkgroep))
    .map(v => v.naam);
  const opties = ["", ...leden, FRION];   // "" betekent: nog niemand

  // Staat de taak op naam van iemand buiten de werkgroep? Toon die ook.
  if (huidige && !opties.includes(huidige)) {
    opties.push(huidige);
  }
  // Bestuur en coördinator kunnen een taak altijd aan zichzelf toewijzen
  if (!opties.includes(mijnToewijsNaam)) {
    opties.push(mijnToewijsNaam);
  }
  return opties;
}

// ===== TAKEN =====

// Maakt het "kaartje" voor één taak
function maakTaakKaart(taak) {
  const kaart = document.createElement("article");
  kaart.className = "taak";

  const titel = document.createElement("h2");
  titel.textContent = taak.titel;
  kaart.append(titel);

  // NIEUW: de plek
  const plek = document.createElement("p");
  plek.className = "details";
  plek.textContent = "📍 " + taak.plek;
  kaart.append(plek);

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

  // De "voor"-foto uit de melding
  if (taak.meldingFoto) {
    kaart.append(maakFotoMetLabel(taak.meldingFoto, "Foto bij melding", "Foto bij de melding: " + taak.titel));
  }

  const status = document.createElement("span");
  status.className = "status status-" + taak.status;
  status.textContent = taak.status === "gereed"
    ? "✓ Gereed gemeld door " + taak.gereedGemeldDoor
    : "○ Open";
  kaart.append(status);

  // Toewijzen (en wijzigen) bij open taken
  if (taak.status === "open") {
    if (ingelogdeGebruiker.magAllesZien) {
      kaart.append(maakKeuzelijst("Toegewezen aan",
        toewijsOpties(taak.werkgroep, taak.toegewezenAan),
        taak.toegewezenAan,
        naam => wijsToe(taak, naam)));
      kaart.append(maakTweedeKnop("✏ Wijzigen", () => openTaakWijzigen(taak)));   // NIEUW
    } else if (magZelfOppakken(taak)) {
      kaart.append(maakTweedeKnop("🙋 Ik doe dit", () => wijsToe(taak, mijnToewijsNaam)));
    } else if (isMijnTaak(taak)) {
      // Je eigen taak: je kunt hem teruggeven ("" = aan niemand)
      kaart.append(maakTweedeKnop("↩ Teruggeven", () => wijsToe(taak, "")));
    }
  }

  // Knop "Gereed melden" bij open taken die aan iemand zijn toegewezen
  if (taak.status === "open" && taak.toegewezenAan && magGereedMelden(taak)) {
    kaart.append(maakHoofdKnop("✓ Gereed melden", () => meldGereed(taak)));
  }

  // Foto en knoppen bij gereed gemelde taken
  if (taak.status === "gereed") {
    if (taak.foto) {
      kaart.append(maakFotoMetLabel(taak.foto, "Foto na afloop", "Foto na afloop: " + taak.titel));
    }
    if (magGereedMelden(taak)) {
      const fotoTekst = taak.foto ? "📷 Foto vervangen" : "📷 Foto toevoegen";
      kaart.append(maakFotoKnop(fotoTekst, url => zetTaakFoto(taak, url)));
      if (taak.foto) {
        kaart.append(maakTweedeKnop("Foto verwijderen", () => zetTaakFoto(taak, "")));
      }
      kaart.append(maakTweedeKnop("↺ Weer openen", () => heropenTaak(taak)));
    }
  }

  return kaart;
}

// Wijst een taak toe aan een naam ("" = aan niemand)
function wijsToe(taak, naam) {
  const vorige = taak.toegewezenAan;   // onthouden voor "Ongedaan maken"
  taak.toegewezenAan = naam;
  verversScherm();
  const tekst = naam ? "Toegewezen aan " + naam : "Taak is weer vrij";
  toonMelding(tekst, () => {
    taak.toegewezenAan = vorige;
    verversScherm();
  });
}

// Zet een taak op gereed
function meldGereed(taak) {
  taak.status = "gereed";
  taak.gereedGemeldDoor = ingelogdeGebruiker.naam;
  verversScherm();
  toonMelding("Taak gereed gemeld", () => {
    taak.status = "open";
    taak.gereedGemeldDoor = "";
    taak.foto = "";
    verversScherm();
  });
}

// Foto na afloop toevoegen, vervangen of verwijderen ("" = verwijderen)
function zetTaakFoto(taak, url) {
  const vorigeFoto = taak.foto;
  taak.foto = url;
  verversScherm();
  let tekst = "Foto verwijderd";
  if (url) tekst = vorigeFoto ? "Foto vervangen" : "Foto toegevoegd";
  toonMelding(tekst, () => {
    taak.foto = vorigeFoto;
    verversScherm();
  });
}

// Zet een gereed gemelde taak weer op open
function heropenTaak(taak) {
  const vorigeDoor = taak.gereedGemeldDoor;
  const vorigeFoto = taak.foto;
  taak.status = "open";
  taak.gereedGemeldDoor = "";
  taak.foto = "";
  verversScherm();
  toonMelding("Taak staat weer open", () => {
    taak.status = "gereed";
    taak.gereedGemeldDoor = vorigeDoor;
    taak.foto = vorigeFoto;
    verversScherm();
  });
}

// ===== GEBREKEN MELDEN =====

// Wat er tot nu toe is ingevuld in het meldformulier
function leegFormulier() {
  return { foto: "", plek: "", tekst: "", gevaarlijk: false };
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
  fotoVeld.append(maakFotoKnop(fotoTekst, url => {
    nieuweMelding.foto = url;
    verversScherm();
  }));
  inhoud.append(fotoVeld);

  // 2. Waar is het? (keuzeknoppen: één tik)
  inhoud.append(maakKeuzeVeld("Waar is het?", PLEKKEN, nieuweMelding.plek, plek => {
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

  // Foutmelding (leeg tot er iets mis is)
  const fout = document.createElement("p");
  fout.id = "melden-fout";
  fout.className = "fout";
  fout.setAttribute("role", "alert");
  inhoud.append(fout);

  inhoud.append(maakHoofdKnop("Melding versturen", verstuurMelding));
  markeerMenu("melden");
}

// Controleert het formulier en verstuurt de melding
function verstuurMelding() {
  const fout = document.getElementById("melden-fout");
  if (!nieuweMelding.foto) { fout.textContent = "Maak eerst een foto van het gebrek."; return; }
  if (!nieuweMelding.plek) { fout.textContent = "Kies waar het is."; return; }

  // "...nieuweMelding" kopieert alles wat is ingevuld; daarna vullen we de rest aan
  const melding = {
    ...nieuweMelding,
    gemeldDoor: ingelogdeGebruiker.naam,
    datum: vandaag,
    taakId: null,
    geenActie: false
  };
  meldingen.push(melding);
  nieuweMelding = leegFormulier();   // formulier leegmaken voor de volgende keer
  toonMeldingen();
  toonMelding("Melding verstuurd", () => {
    meldingen.splice(meldingen.indexOf(melding), 1);   // melding weer weghalen
    verversScherm();
  });
}

// ===== STATUS VAN EEN MELDING =====
// De status wordt niet apart bewaard, maar afgeleid van de gekoppelde taak.
function meldingStatus(melding) {
  if (melding.geenActie) return "Geen actie nodig";
  const taak = vindTaak(melding.taakId);
  if (!taak) return "Nieuw";
  if (taak.status === "gereed") return "Gereed";
  if (taak.toegewezenAan) return "Toegewezen";
  return "Taak gemaakt";
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

  // Vrijwilligers zien alleen hun eigen meldingen
  const lijst = alles
    ? [...meldingen]
    : meldingen.filter(m => m.gemeldDoor === ingelogdeGebruiker.naam);

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

  if (melding.foto) {
    const foto = document.createElement("img");
    foto.className = "foto";
    foto.src = melding.foto;
    foto.alt = "Foto van het gebrek bij " + melding.plek;
    kaart.append(foto);
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

  // NIEUW: de toelichting bij "Geen actie nodig" (ziet de melder ook)
  if (melding.geenActie && melding.geenActieReden) {
    const reden = document.createElement("p");
    reden.textContent = "Toelichting van " + melding.geenActieDoor + ": " + melding.geenActieReden;
    kaart.append(reden);
  }

  // Knoppen voor bestuur en coördinator
  if (ingelogdeGebruiker.magAllesZien) {
    if (status === "Nieuw" && meldingMetRedenOpen === melding) {
      // NIEUW: vak om uit te leggen waarom er geen actie nodig is
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
      // NIEUW: opent eerst het vak voor de toelichting
      kaart.append(maakTweedeKnop("Geen actie nodig", () => {
        meldingMetRedenOpen = melding;
        redenTekst = "";
        verversScherm();
      }));
    } else if (status === "Geen actie nodig") {
      kaart.append(maakTweedeKnop("↺ Weer openen", () => zetGeenActie(melding, false, "")));
    }
    // Is er een taak? Dan regel je de rest bij de taak zelf (onder "Werkgroep").
  }
  return kaart;
}

// NIEUW: controleert of er een toelichting is, en slaat "Geen actie nodig" op
function slaGeenActieOp(melding) {
  if (!redenTekst.trim()) {
    document.getElementById("reden-fout").textContent = "Schrijf kort op waarom er geen actie nodig is.";
    return;
  }
  zetGeenActie(melding, true, redenTekst.trim());
}

// Zet een melding op "Geen actie nodig" (true, met toelichting) of weer open (false)
function zetGeenActie(melding, waarde, reden) {
  // Onthouden hoe het was, voor "Ongedaan maken"
  const vorig = {
    geenActie: melding.geenActie,
    reden: melding.geenActieReden,
    door: melding.geenActieDoor
  };
  melding.geenActie = waarde;
  melding.geenActieReden = waarde ? reden : "";
  melding.geenActieDoor = waarde ? ingelogdeGebruiker.naam : "";
  meldingMetRedenOpen = null;
  redenTekst = "";
  verversScherm();
  toonMelding(waarde ? "Geen actie nodig" : "Melding staat weer open", () => {
    melding.geenActie = vorig.geenActie;
    melding.geenActieReden = vorig.reden;
    melding.geenActieDoor = vorig.door;
    verversScherm();
  });
}
// ===== NIEUW: TAAKFORMULIER (aanmaken, uit melding, wijzigen) =====
// Eén formulier voor drie situaties. "modus" zegt welke:
//   "nieuw"    = nieuwe taak, bijvoorbeeld uit de jaarplanning
//   "melding"  = nieuwe taak vanuit een melding
//   "wijzigen" = een bestaande taak aanpassen

let taakFormulier = null;   // wat er is ingevuld in het formulier

// Nieuwe taak zonder melding (knop "+ Nieuwe taak" onder Werkgroep)
function openNieuweTaak() {
  taakFormulier = {
    modus: "nieuw",
    melding: null,
    taak: null,
    terugScherm: "werkgroep",
    titel: "",
    omschrijving: "",
    plek: "",
    werkgroep: gekozenWerkgroep === "Alles" ? "" : gekozenWerkgroep,
    toegewezenAan: "",
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
    plek: melding.plek,
    werkgroep: PLEK_WERKGROEP[melding.plek] || "",   // "" als de plek niet in de tabel staat
    toegewezenAan: "",
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
    toegewezenAan: taak.toegewezenAan,
    deadline: taak.deadline
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
  const voorFoto = formulier.melding ? formulier.melding.foto
                 : formulier.taak ? formulier.taak.meldingFoto : "";
  if (voorFoto) {
    inhoud.append(maakFotoMetLabel(voorFoto, "Foto bij melding", "Foto bij de melding"));
  }

  inhoud.append(maakInvoerVeld("Titel", "tekst", formulier.titel,
    waarde => { formulier.titel = waarde; }));

  inhoud.append(maakInvoerVeld("Omschrijving", "lang", formulier.omschrijving,
    waarde => { formulier.omschrijving = waarde; }));

  // Waar is het? Is de werkgroep nog leeg, vul dan alvast de werkgroep bij die plek in.
  inhoud.append(maakKeuzeVeld("Waar is het?", PLEKKEN, formulier.plek, plek => {
    formulier.plek = plek;
    if (!formulier.werkgroep && PLEK_WERKGROEP[plek]) {
      formulier.werkgroep = PLEK_WERKGROEP[plek];
    }
    verversScherm();
  }));

  inhoud.append(maakKeuzeVeld("Welke werkgroep?", alleWerkgroepen, formulier.werkgroep, werkgroep => {
    formulier.werkgroep = werkgroep;
    // Hoort de gekozen persoon niet bij de nieuwe werkgroep? Dan weer "Nog niemand".
    if (!toewijsOpties(werkgroep, "").includes(formulier.toegewezenAan)) {
      formulier.toegewezenAan = "";
    }
    verversScherm();
  }));

  // Persoon kiezen kan pas als de werkgroep bekend is
  if (formulier.werkgroep) {
    const veld = document.createElement("div");
    veld.className = "veld";
    veld.append(maakKeuzelijst("Wie gaat het doen? (niet verplicht)",
      toewijsOpties(formulier.werkgroep, formulier.toegewezenAan),
      formulier.toegewezenAan,
      naam => { formulier.toegewezenAan = naam; }));
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
  inhoud.append(maakHoofdKnop(knopTekst, slaTaakOp));
  inhoud.append(maakTweedeKnop("Annuleren", () => {
    const terug = formulier.terugScherm;
    taakFormulier = null;
    toonScherm(terug);
  }));

  markeerMenu(formulier.terugScherm);   // in het menu blijft het vorige scherm oplichten
}

// Controleert het formulier en maakt of wijzigt de taak
function slaTaakOp() {
  const formulier = taakFormulier;
  const fout = document.getElementById("taak-fout");
  if (!formulier.titel.trim()) { fout.textContent = "Geef de taak een titel."; return; }
  if (!formulier.plek)         { fout.textContent = "Kies waar het is."; return; }
  if (!formulier.werkgroep)    { fout.textContent = "Kies een werkgroep."; return; }
  if (!formulier.deadline)     { fout.textContent = "Kies een datum."; return; }

  // De ingevulde waarden, netjes bij elkaar
  const waarden = {
    titel: formulier.titel.trim(),
    omschrijving: formulier.omschrijving,
    plek: formulier.plek,
    werkgroep: formulier.werkgroep,
    toegewezenAan: formulier.toegewezenAan,
    deadline: formulier.deadline
  };
  const terug = formulier.terugScherm;
  taakFormulier = null;

  // Kom je terug op "Werkgroep"? Toon dan de werkgroep van deze taak, zodat je hem ziet.
  if (terug === "werkgroep" && gekozenWerkgroep !== "Alles") {
    gekozenWerkgroep = waarden.werkgroep;
  }

  // Wijzigen: oude waarden onthouden, nieuwe erover zetten
  if (formulier.modus === "wijzigen") {
    const taak = formulier.taak;
    const oud = { ...taak };            // kopie van hoe de taak was
    Object.assign(taak, waarden);       // nieuwe waarden overnemen
    toonScherm(terug);
    toonMelding("Taak gewijzigd", () => {
      Object.assign(taak, oud);         // alles terugzetten
      verversScherm();
    });
    return;
  }

  // Nieuw (met of zonder melding)
  const taak = {
    id: volgendeTaakId(),
    ...waarden,
    status: "open",
    meldingFoto: formulier.melding ? formulier.melding.foto : ""
  };
  taken.push(taak);
  if (formulier.melding) formulier.melding.taakId = taak.id;   // koppeling met de melding
  toonScherm(terug);
  toonMelding("Taak aangemaakt", () => {
    taken.splice(taken.indexOf(taak), 1);                     // taak weer weghalen
    if (formulier.melding) formulier.melding.taakId = null;   // koppeling weer weghalen
    verversScherm();
  });
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
    const { taken: nieuweTaken, mijnNaam } = await vraagTakenOpBijDatabase();
    taken.splice(0, taken.length, ...nieuweTaken);   // lijst leegmaken en vullen
    mijnToewijsNaam = mijnNaam;
    takenUitleg = "";
    schrijfOpslag(OPSLAG_TAKEN, {
      gebruikerId: ingelogdeGebruiker.id,   // zodat iemand anders ze nooit ziet
      tijd: Date.now(),
      mijnNaam,
      taken: nieuweTaken
    });
  } catch (fout) {
    console.warn("Taken ophalen mislukt:", fout);
    const bewaard = leesOpslag(OPSLAG_TAKEN);
    if (bewaard && bewaard.gebruikerId === ingelogdeGebruiker.id) {
      taken.splice(0, taken.length, ...bewaard.taken);
      mijnToewijsNaam = bewaard.mijnNaam;
      takenUitleg = "Geen verbinding. Je ziet de lijst van " + leesbareTijd(bewaard.tijd) + ".";
    } else {
      taken.splice(0, taken.length);
      takenUitleg = "Geen verbinding. De taken konden niet worden geladen. " +
                    "Open de app opnieuw als je bereik hebt.";
    }
  }
}

// Het echte werk: twee vragen aan de database.
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
      .select("id, titel, omschrijving, deadline, status, toegewezen_aan, gereed_gemeld_door, " +
              "plek_naam:plekken(naam), werkgroep_naam:werkgroepen(naam)")
      .abortSignal(stopper.signal);

    // 2. De namen van alle gebruikers ("Piet", of "Piet P." bij een dubbele voornaam)
    const namenVraag = database
      .from("gebruikers_weergave")
      .select("id, naam")
      .abortSignal(stopper.signal);

    // Beide vragen tegelijk versturen, en wachten tot allebei klaar zijn
    const [takenAntwoord, namenAntwoord] = await Promise.all([takenVraag, namenVraag]);
    if (takenAntwoord.error) throw takenAntwoord.error;
    if (namenAntwoord.error) throw namenAntwoord.error;

    // Opzoeklijst: nummer van een gebruiker → naam
    const naamVan = {};
    namenAntwoord.data.forEach(persoon => { naamVan[persoon.id] = persoon.naam; });

    // Elke rij uit de database omzetten naar een taak zoals de app die kent
    const nieuweTaken = takenAntwoord.data.map(rij => ({
      id: rij.id,
      titel: rij.titel,
      omschrijving: rij.omschrijving || "",
      plek: rij.plek_naam.naam,
      werkgroep: rij.werkgroep_naam.naam,
      toegewezenAan: naamVan[rij.toegewezen_aan] || "",
      deadline: rij.deadline || "",
      status: rij.status,
      gereedGemeldDoor: naamVan[rij.gereed_gemeld_door] || "",
      foto: "",          // foto's komen in een latere stap
      meldingFoto: ""
    }));

    // Mijn eigen naam zoals de app hem laat zien (bijv. "Piet P.")
    const mijnNaam = naamVan[ingelogdeGebruiker.id] || ingelogdeGebruiker.naam;
    return { taken: nieuweTaken, mijnNaam };
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

function toonMelding(tekst, actieBijOngedaan) {
  document.getElementById("melding-tekst").textContent = tekst;
  ongedaanActie = actieBijOngedaan;
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

// Opent het scherm dat bij een naam hoort
function toonScherm(scherm) {
  if (scherm === "mijn") toonMijnTaken();
  else if (scherm === "werkgroep") toonWerkgroep();
  else if (scherm === "melden") toonMelden();
  else if (scherm === "meldingen") toonMeldingen();
  else if (scherm === "taak-formulier") toonTaakFormulier();   // NIEUW (nieuwe naam)
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

  // TIJDELIJK: de knoppen bij een taak veranderen nog alleen iets op je eigen
  // telefoon, niet in de database. Weghalen zodra de knoppen echt werken.
  const tijdelijk = document.createElement("p");
  tijdelijk.className = "uitleg-bovenaan";
  tijdelijk.textContent = "Proefversie: wat je bij een taak verandert, wordt nog niet bewaard.";
  inhoud.append(tijdelijk);

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

function toonMijnTaken() {
  huidigScherm = "mijn";
  document.getElementById("titel").textContent = "Mijn taken";
  document.getElementById("inhoud").replaceChildren(); // scherm leegmaken
  toonLijst(taken.filter(isMijnTaak));
  markeerMenu("mijn");
}

let gekozenWerkgroep = "";   // leeg = de eerste keuze (zie hieronder)

function toonWerkgroep() {
  huidigScherm = "werkgroep";
  document.getElementById("titel").textContent = "Taken werkgroep";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  // Welke keuzes krijgt deze persoon?
  const keuzes = ingelogdeGebruiker.magAllesZien
    ? ["Alles", ...alleWerkgroepen]
    : ingelogdeGebruiker.werkgroepen;
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

  // NIEUW: bestuur en coördinator kunnen hier een nieuwe taak maken
  if (ingelogdeGebruiker.magAllesZien) {
    inhoud.append(maakHoofdKnop("+ Nieuwe taak", openNieuweTaak));
  }

  const lijst = gekozenWerkgroep === "Alles"
    ? [...taken]
    : taken.filter(taak => taak.werkgroep === gekozenWerkgroep);
  toonLijst(lijst);
  markeerMenu("werkgroep");
}

// ===== START =====
// Elke menuknop opent het scherm dat in zijn "data-scherm" staat
document.querySelectorAll("nav button").forEach(knop => {
  knop.addEventListener("click", () => toonScherm(knop.dataset.scherm));
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
