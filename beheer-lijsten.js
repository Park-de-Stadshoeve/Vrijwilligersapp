// Beheerscherm, deel 2: werkgroepen en plekken (alleen voor beheerders).
// Dit bestand wordt geladen door index.html, na beheer.js en vóór app.js.
//
// Bovenaan het beheerscherm staan drie keuzeknoppen: Gebruikers |
// Werkgroepen | Plekken. Gebruikers staat in beheer.js, de andere twee hier.
//
// Wat kan er?
//   - Werkgroepen: toevoegen, naam wijzigen, volgorde (▲ Omhoog / ▼ Omlaag),
//     uitzetten en weer aanzetten.
//   - Plekken: toevoegen, naam en standaardwerkgroep wijzigen, volgorde van
//     de knoppen (▲ Omhoog / ▼ Omlaag), uitzetten en weer aanzetten.
//   Verwijderen kan niet: er hangen taken, meldingen en mensen aan. Een
//   uitgezette werkgroep of plek verdwijnt uit de keuzes; oude taken en
//   meldingen houden de naam.
//
// Veilig? De database bepaalt wie dit mag (alleen beheerders, regels in
// database/03_rechten.sql, 16_lijsten_beheer.sql en 17_werkgroep_volgorde.sql).

// Welk deel van het beheerscherm open staat
let beheerTab = "gebruikers";
const BEHEER_TABS = { gebruikers: "Gebruikers", werkgroepen: "Werkgroepen", plekken: "Plekken" };

// De werkgroepen en plekken zoals laatst opgehaald (ook de uitgezette)
let beheerLijsten = { werkgroepen: [], plekken: [] };

// De drie keuzeknoppen bovenaan het beheerscherm
function maakBeheerTabs() {
  const kiezer = document.createElement("div");
  kiezer.className = "kiezer";
  Object.entries(BEHEER_TABS).forEach(([tab, tekst]) => {
    const knop = document.createElement("button");
    knop.textContent = tekst;
    knop.setAttribute("aria-pressed", tab === beheerTab);
    knop.addEventListener("click", () => {
      beheerTab = tab;
      toonBeheer();
    });
    kiezer.append(knop);
  });
  return kiezer;
}

// Opent het tabblad Werkgroepen of Plekken (toonBeheer in beheer.js roept dit aan)
async function toonLijstenBeheer() {
  const inhoud = document.getElementById("inhoud");
  const laden = document.createElement("p");
  laden.className = "leeg";
  laden.textContent = "Laden…";
  inhoud.replaceChildren(maakBeheerTabs(), laden);

  try {
    beheerLijsten = await haalBeheerLijstenOp();
  } catch (fout) {
    console.warn("Werkgroepen en plekken ophalen mislukt:", fout);
    if (huidigScherm !== "beheer") return;
    const melding = document.createElement("p");
    melding.className = "uitleg-bovenaan";
    melding.setAttribute("role", "status");
    melding.textContent = isVerbindingsFout(fout)
      ? "📶 Geen verbinding. Het beheerscherm werkt alleen als je bereik hebt. Probeer het opnieuw."
      : "Er ging iets mis (" + fout.message + "). Probeer het opnieuw.";
    inhoud.replaceChildren(maakBeheerTabs(), melding, maakTweedeKnop("Opnieuw proberen", toonBeheer));
    return;
  }
  if (huidigScherm !== "beheer") return;   // intussen een ander scherm gekozen
  if (beheerTab === "werkgroepen") toonWerkgroepenLijst();
  else toonPlekkenLijst();
}

// Alle werkgroepen en plekken, ook de uitgezette
async function haalBeheerLijstenOp() {
  const stopper = new AbortController();
  const wekker = setTimeout(() => stopper.abort(), WACHTTIJD_DATABASE);
  try {
    const [werkgroepen, plekken] = await Promise.all([
      database.from("werkgroepen").select("id, naam, actief, volgorde")
        .order("volgorde", { nullsFirst: false }).order("id").abortSignal(stopper.signal),
      database.from("plekken").select("id, naam, standaard_werkgroep, volgorde, actief")
        .order("volgorde").order("id").abortSignal(stopper.signal)
    ]);
    if (werkgroepen.error) throw werkgroepen.error;
    if (plekken.error) throw plekken.error;
    return { werkgroepen: werkgroepen.data, plekken: plekken.data };
  } finally {
    clearTimeout(wekker);
  }
}

// Naam van een werkgroep bij zijn nummer
function werkgroepNaam(id) {
  const werkgroep = beheerLijsten.werkgroepen.find(w => w.id === id);
  return werkgroep ? werkgroep.naam : "";
}

// Kopje, bijv. "Werkgroepen (7)"
function maakBeheerKop(tekst) {
  const kop = document.createElement("h2");
  kop.className = "beheer-kop";
  kop.textContent = tekst;
  return kop;
}


// ===== WERKGROEPEN =====

function toonWerkgroepenLijst() {
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren(maakBeheerTabs());
  inhoud.append(maakHoofdKnop("+ Werkgroep toevoegen", () => openLijstFormulier("werkgroep", null)));

  const aan = beheerLijsten.werkgroepen.filter(w => w.actief);
  const uit = beheerLijsten.werkgroepen.filter(w => !w.actief);
  inhoud.append(maakBeheerKop("Werkgroepen (" + aan.length + "), in de volgorde van de knoppen"));
  aan.forEach((w, i) => inhoud.append(maakWerkgroepKaart(w, i === 0, i === aan.length - 1)));
  if (uit.length > 0) {
    inhoud.append(maakBeheerKop("Uitgezet (" + uit.length + ")"));
    uit.forEach(w => inhoud.append(maakWerkgroepKaart(w, true, true)));
  }
}

function maakWerkgroepKaart(werkgroep, eerste, laatste) {
  const kaart = document.createElement("article");
  kaart.className = "taak";
  const naam = document.createElement("h2");
  naam.textContent = werkgroep.naam;
  kaart.append(naam);
  if (!werkgroep.actief) kaart.append(maakLabel("Uitgezet"));
  if (werkgroep.actief) {
    const pijlen = maakPijlen(eerste, laatste, omhoog => verplaatsWerkgroep(werkgroep, omhoog));
    if (pijlen) kaart.append(pijlen);
  }
  kaart.append(maakTweedeKnop("Wijzigen", () => openLijstFormulier("werkgroep", werkgroep)));
  return kaart;
}

// ▲▼ Een werkgroep één plaats verschuiven (vaste actie werkgroep_verplaatsen), met Ongedaan maken
async function verplaatsWerkgroep(werkgroep, omhoog) {
  if (!await vraagDatabase("werkgroep_verplaatsen", { werkgroep_id: werkgroep.id, omhoog })) return;
  await naLijstWijziging();
  toonMelding(werkgroep.naam + (omhoog ? " staat een plaats hoger" : " staat een plaats lager"),
              () => verplaatsWerkgroep(werkgroep, !omhoog));
}

// De knoppen ▲ Omhoog en ▼ Omlaag naast elkaar. "bijTik(omhoog)" doet het werk.
// Geeft niets als er niets te verplaatsen valt (maar één in de lijst).
function maakPijlen(eerste, laatste, bijTik) {
  if (eerste && laatste) return null;
  const pijlen = document.createElement("div");
  pijlen.className = "pijlen";
  const omhoog = maakTweedeKnop("▲ Omhoog", () => bijTik(true));
  const omlaag = maakTweedeKnop("▼ Omlaag", () => bijTik(false));
  omhoog.disabled = eerste;    // bovenaan: niet hoger
  omlaag.disabled = laatste;   // onderaan: niet lager
  pijlen.append(omhoog, omlaag);
  return pijlen;
}


// ===== PLEKKEN =====

function toonPlekkenLijst() {
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren(maakBeheerTabs());
  inhoud.append(maakHoofdKnop("+ Plek toevoegen", () => openLijstFormulier("plek", null)));

  const aan = beheerLijsten.plekken.filter(p => p.actief);
  const uit = beheerLijsten.plekken.filter(p => !p.actief);
  inhoud.append(maakBeheerKop("Plekken (" + aan.length + "), in de volgorde van de knoppen"));
  aan.forEach((plek, i) => inhoud.append(maakPlekKaart(plek, i === 0, i === aan.length - 1)));
  if (uit.length > 0) {
    inhoud.append(maakBeheerKop("Uitgezet (" + uit.length + ")"));
    uit.forEach(plek => inhoud.append(maakPlekKaart(plek, true, true)));
  }
}

function maakPlekKaart(plek, eerste, laatste) {
  const kaart = document.createElement("article");
  kaart.className = "taak";
  const naam = document.createElement("h2");
  naam.textContent = plek.naam;
  kaart.append(naam);

  const werkgroep = document.createElement("p");
  werkgroep.className = "details";
  werkgroep.textContent = plek.standaard_werkgroep
    ? "Standaard werkgroep: " + werkgroepNaam(plek.standaard_werkgroep)
    : "Geen standaard werkgroep";
  kaart.append(werkgroep);
  if (!plek.actief) kaart.append(maakLabel("Uitgezet"));

  // Volgorde: alleen voor plekken die aan staan
  if (plek.actief) {
    const pijlen = maakPijlen(eerste, laatste, omhoog => verplaatsPlek(plek, omhoog));
    if (pijlen) kaart.append(pijlen);
  }
  kaart.append(maakTweedeKnop("Wijzigen", () => openLijstFormulier("plek", plek)));
  return kaart;
}

// ▲▼ Een plek één plaats verschuiven (vaste actie plek_verplaatsen), met Ongedaan maken
async function verplaatsPlek(plek, omhoog) {
  if (!await vraagDatabase("plek_verplaatsen", { plek_id: plek.id, omhoog })) return;
  await naLijstWijziging();
  toonMelding(plek.naam + (omhoog ? " staat een plaats hoger" : " staat een plaats lager"),
              () => verplaatsPlek(plek, !omhoog));
}


// ===== FORMULIER (toevoegen en wijzigen) =====
// Eén formulier voor werkgroepen en plekken. soort = "werkgroep" of "plek".

let lijstFormulier = null;   // null = er staat geen formulier open

function openLijstFormulier(soort, item) {
  lijstFormulier = {
    soort,
    item,                                  // null = nieuw
    naam: item ? item.naam : "",
    standaardWerkgroep: item && soort === "plek" ? item.standaard_werkgroep : null
  };
  toonLijstFormulier();
}

function toonLijstFormulier() {
  if (!lijstFormulier) { toonBeheer(); return; }
  huidigScherm = "lijst-formulier";
  const formulier = lijstFormulier;
  const isPlek = formulier.soort === "plek";
  const woord = isPlek ? "plek" : "werkgroep";
  document.getElementById("titel").textContent =
    (formulier.item ? "Wijzigen: " : "Nieuwe ") + woord;
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  inhoud.append(maakInvoerVeld("Naam van de " + woord, "tekst", formulier.naam,
    waarde => { formulier.naam = waarde; }));

  // Plek: welke werkgroep hoort er meestal bij? (wordt alvast ingevuld bij "Maak taak")
  if (isPlek) {
    const actieveWerkgroepen = beheerLijsten.werkgroepen.filter(w => w.actief);
    const keuzes = ["Geen", ...actieveWerkgroepen.map(w => w.naam)];
    const gekozen = werkgroepNaam(formulier.standaardWerkgroep) || "Geen";
    inhoud.append(maakKeuzeVeld("Standaard werkgroep (wordt alvast ingevuld bij een taak)", keuzes, gekozen,
      keuze => {
        const werkgroep = actieveWerkgroepen.find(w => w.naam === keuze);
        formulier.standaardWerkgroep = werkgroep ? werkgroep.id : null;
        toonLijstFormulier();
      }));
  }

  const fout = document.createElement("p");
  fout.id = "lijst-fout";
  fout.className = "fout";
  fout.setAttribute("role", "alert");
  inhoud.append(fout);

  const opslaan = maakHoofdKnop(formulier.item ? "Opslaan" : "Toevoegen", slaLijstItemOp);
  opslaan.id = "knop-lijst-opslaan";
  inhoud.append(opslaan);
  inhoud.append(maakTweedeKnop("Annuleren", () => { lijstFormulier = null; toonBeheer(); }));

  // Uitzetten of weer aanzetten: apart, helemaal onderaan
  if (formulier.item) {
    if (formulier.item.actief) {
      const uit = maakTweedeKnop("Uitzetten", () => zetLijstItemAan(formulier.soort, formulier.item, false));
      uit.classList.add("knop-stoppen");
      inhoud.append(uit);
    } else {
      inhoud.append(maakTweedeKnop("Weer aanzetten", () => zetLijstItemAan(formulier.soort, formulier.item, true)));
    }
  }
  markeerMenu("beheer");
}

// Opslaan: toevoegen of wijzigen, met Ongedaan maken
async function slaLijstItemOp() {
  const formulier = lijstFormulier;
  const isPlek = formulier.soort === "plek";
  const tabel = isPlek ? "plekken" : "werkgroepen";
  const lijst = isPlek ? beheerLijsten.plekken : beheerLijsten.werkgroepen;
  const fout = document.getElementById("lijst-fout");
  const naam = formulier.naam.trim();

  if (!naam) { fout.textContent = "Vul een naam in."; return; }
  // Twee keer dezelfde naam mag niet (ook niet met andere hoofdletters)
  const dubbel = lijst.find(x => x.naam.toLowerCase() === naam.toLowerCase()
                              && (!formulier.item || x.id !== formulier.item.id));
  if (dubbel) {
    fout.textContent = "Er is al een " + (isPlek ? "plek" : "werkgroep") + " met deze naam" +
                       (dubbel.actief ? "." : " (uitgezet). Zet die weer aan in plaats van een nieuwe te maken.");
    return;
  }

  const knop = document.getElementById("knop-lijst-opslaan");
  if (knop) knop.disabled = true;

  const rij = { naam };
  if (isPlek) rij.standaard_werkgroep = formulier.standaardWerkgroep;

  if (!formulier.item) {
    // Nieuw. Een nieuwe plek of werkgroep komt onderaan de volgorde.
    rij.volgorde = Math.max(0, ...lijst.map(x => x.volgorde || 0)) + 10;
    const antwoord = await stuurNaarDatabase(signaal =>
      database.from(tabel).insert(rij).select("id").single().abortSignal(signaal));
    if (!antwoord.gelukt) { if (knop) knop.disabled = false; return; }
    const nieuweId = antwoord.data.id;
    lijstFormulier = null;
    await naLijstWijziging();
    toonMelding("Toegevoegd: " + naam, async () => {
      // Ongedaan maken: weer weghalen (kan, want er hangt nog niets aan)
      const terug = await stuurNaarDatabase(signaal =>
        database.from(tabel).delete().eq("id", nieuweId).select("id").abortSignal(signaal));
      if (terug.gelukt) { await naLijstWijziging(); toonMelding("Weggehaald: " + naam); }
    });
    return;
  }

  // Wijzigen
  const oud = { naam: formulier.item.naam };
  if (isPlek) oud.standaard_werkgroep = formulier.item.standaard_werkgroep;
  if (!await wijzigLijstItem(tabel, formulier.item.id, rij)) { if (knop) knop.disabled = false; return; }
  lijstFormulier = null;
  await naLijstWijziging();
  toonMelding("Opgeslagen: " + naam, async () => {
    if (await wijzigLijstItem(tabel, formulier.item.id, oud)) {
      await naLijstWijziging();
      toonMelding("Teruggezet: " + oud.naam);
    }
  });
}

// Uitzetten (aan = false) of weer aanzetten (aan = true), met Ongedaan maken
async function zetLijstItemAan(soort, item, aan) {
  const tabel = soort === "plek" ? "plekken" : "werkgroepen";

  // Bij een werkgroep uitzetten: eerst tellen wat eraan hangt, voor de waarschuwing
  let waarschuwing = "";
  if (soort === "werkgroep" && !aan) {
    const gebruik = await stuurNaarDatabase(signaal =>
      database.rpc("werkgroep_gebruik", { werkgroep_id: item.id }).abortSignal(signaal));
    if (!gebruik.gelukt) return;
    const g = gebruik.data;
    const delen = [];
    if (g.mensen > 0) delen.push(g.mensen + (g.mensen === 1 ? " persoon" : " mensen") + " in deze werkgroep");
    if (g.open_taken > 0) delen.push(g.open_taken + (g.open_taken === 1 ? " open taak" : " open taken"));
    if (g.plekken > 0) delen.push(g.plekken + (g.plekken === 1 ? " plek" : " plekken") + " met deze werkgroep als standaard");
    // Bijv. " Let op: nog 4 mensen in deze werkgroep, 2 open taken."
    if (delen.length > 0) waarschuwing = " Let op: nog " + delen.join(", ") + ".";
  }

  if (!await wijzigLijstItem(tabel, item.id, { actief: aan })) return;
  lijstFormulier = null;
  await naLijstWijziging();
  toonMelding((aan ? "Weer aangezet: " : "Uitgezet: ") + item.naam + "." + waarschuwing, async () => {
    if (await wijzigLijstItem(tabel, item.id, { actief: !aan })) {
      await naLijstWijziging();
      toonMelding("Teruggezet: " + item.naam);
    }
  });
}

// Wijzigt één werkgroep of plek. Geeft true als het gelukt is.
async function wijzigLijstItem(tabel, id, wijziging) {
  const antwoord = await stuurNaarDatabase(signaal =>
    database.from(tabel).update(wijziging).eq("id", id).select("id").abortSignal(signaal));
  if (!antwoord.gelukt) return false;
  if (antwoord.data.length === 0) {
    toonMelding("Dit kon niet worden opgeslagen. Ververs het scherm en probeer het opnieuw.");
    return false;
  }
  return true;
}

// Na elke wijziging: het beheerscherm opnieuw tekenen, en de lijsten die de
// rest van de app gebruikt (knoppen bij Melden en bij taken) vernieuwen.
async function naLijstWijziging() {
  huidigScherm = "beheer";
  await toonBeheer();
  haalTakenOp();   // op de achtergrond; hoeft niet af te wachten
}
