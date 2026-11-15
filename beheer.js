// Beheerscherm: overzicht van alle gebruikers (alleen voor beheerders).
// Dit bestand wordt geladen door index.html, vóór app.js.
//
// Stap 1: bekijken. Stap 2: naam, rol, vinkjes en werkgroepen wijzigen.
// Toevoegen en laten stoppen komen later.
//
// Veilig? De knop "Beheer" zie je alleen met het vinkje is_beheerder. Maar ook
// als iemand anders dit scherm zou openen, geeft de database alleen zijn eigen
// gegevens terug (regels in database/03_rechten.sql). Het verbergen van de knop
// is dus gemak, de database is de echte bewaker.
//
// Privacy: deze lijst wordt NIET op het toestel bewaard. Zonder bereik werkt
// het beheerscherm dus niet. Dat is expres.

// Hoe de rollen op het scherm heten (in de database staan ze zonder hoofdletter)
const ROL_TEKST = {
  vrijwilliger: "Vrijwilliger",
  bestuur: "Bestuur",
  coordinator: "Coördinator onderhoud"
};

// Opent het beheerscherm: eerst "laden", dan de lijst uit de database
async function toonBeheer() {
  huidigScherm = "beheer";
  document.getElementById("titel").textContent = "Beheer";
  markeerMenu("beheer");   // geen knop in het menu onderaan is dan gekleurd

  const inhoud = document.getElementById("inhoud");
  const laden = document.createElement("p");
  laden.className = "leeg";
  laden.textContent = "Gebruikers laden…";
  inhoud.replaceChildren(laden);

  let gebruikers;
  try {
    gebruikers = await haalGebruikersOp();
  } catch (fout) {
    console.warn("Gebruikers ophalen mislukt:", fout);
    if (huidigScherm !== "beheer") return;   // intussen een ander scherm gekozen
    const melding = document.createElement("p");
    melding.className = "uitleg-bovenaan";
    melding.setAttribute("role", "status");
    melding.textContent = isVerbindingsFout(fout)
      ? "📶 Geen verbinding. Het beheerscherm werkt alleen als je bereik hebt. Probeer het opnieuw."
      : "Er ging iets mis (" + fout.message + "). Probeer het opnieuw.";
    inhoud.replaceChildren(melding, maakTweedeKnop("Opnieuw proberen", toonBeheer));
    return;
  }
  if (huidigScherm !== "beheer") return;   // intussen een ander scherm gekozen
  toonGebruikersLijst(gebruikers);
}

// Vraagt alle gebruikers en hun werkgroepen op bij de database.
// Geeft een lijst: { id, voornaam, letter, naam, rol, werkgroepen: ["Klussen"],
// werkgroepIds: [4], isBeheerder, krijgtGevaarMail, actief }, gesorteerd op voornaam.
async function haalGebruikersOp() {
  // Stopt het wachten na WACHTTIJD_DATABASE (staat in app.js)
  const stopper = new AbortController();
  const wekker = setTimeout(() => stopper.abort(), WACHTTIJD_DATABASE);
  try {
    // 1. Alle gebruikers. Een beheerder mag ze allemaal zien (03_rechten.sql).
    const gebruikersVraag = database
      .from("gebruikers")
      .select("id, voornaam, achternaam_letter, rol, is_beheerder, krijgt_gevaar_mail, actief")
      .order("voornaam")
      .abortSignal(stopper.signal);

    // 2. Wie in welke werkgroep zit. "werkgroepen(naam)" haalt meteen de naam op.
    const ledenVraag = database
      .from("lidmaatschappen")
      .select("gebruiker, werkgroep, werkgroepen(naam)")
      .abortSignal(stopper.signal);

    // Beide vragen tegelijk versturen en op allebei wachten (dat is sneller)
    const [gebruikersAntwoord, ledenAntwoord] = await Promise.all([gebruikersVraag, ledenVraag]);
    if (gebruikersAntwoord.error) throw gebruikersAntwoord.error;
    if (ledenAntwoord.error) throw ledenAntwoord.error;

    // Werkgroepnamen bij hun nummer onthouden (ook van werkgroepen die niet
    // meer meedoen), zodat het formulier ze kan laten zien.
    ledenAntwoord.data.forEach(lid => { werkgroepNaamVan[lid.werkgroep] = lid.werkgroepen.naam; });

    return gebruikersAntwoord.data.map(rij => {
      const leden = ledenAntwoord.data.filter(lid => lid.gebruiker === rij.id);
      return {
        id: rij.id,
        voornaam: rij.voornaam,
        letter: rij.achternaam_letter,
        naam: rij.voornaam + " " + rij.achternaam_letter + ".",   // bijv. "Piet P."
        rol: rij.rol,
        werkgroepen: leden.map(lid => lid.werkgroepen.naam).sort(),
        werkgroepIds: leden.map(lid => lid.werkgroep),
        isBeheerder: rij.is_beheerder,
        krijgtGevaarMail: rij.krijgt_gevaar_mail,
        actief: rij.actief
      };
    });
  } finally {
    clearTimeout(wekker);
  }
}

// Zet de lijst op het scherm: eerst wie meedoet, onderaan wie gestopt is
function toonGebruikersLijst(gebruikers) {
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  const actief = gebruikers.filter(g => g.actief);
  const gestopt = gebruikers.filter(g => !g.actief);

  const kop = document.createElement("h2");
  kop.className = "beheer-kop";
  kop.textContent = "Gebruikers (" + actief.length + ")";
  inhoud.append(kop);
  actief.forEach(gebruiker => inhoud.append(maakGebruikerKaart(gebruiker)));

  if (gestopt.length > 0) {
    const kopGestopt = document.createElement("h2");
    kopGestopt.className = "beheer-kop";
    kopGestopt.textContent = "Gestopt (" + gestopt.length + ")";
    inhoud.append(kopGestopt);
    gestopt.forEach(gebruiker => inhoud.append(maakGebruikerKaart(gebruiker)));
  }
}

// Eén kaartje per persoon: naam, rol, werkgroepen en de vinkjes
function maakGebruikerKaart(gebruiker) {
  const kaart = document.createElement("article");
  kaart.className = "taak";

  const naam = document.createElement("h2");
  naam.textContent = gebruiker.naam;
  kaart.append(naam);

  const rol = document.createElement("p");
  rol.textContent = ROL_TEKST[gebruiker.rol] || gebruiker.rol;
  kaart.append(rol);

  const werkgroepen = document.createElement("p");
  werkgroepen.className = "details";
  werkgroepen.textContent = gebruiker.werkgroepen.length > 0
    ? "Werkgroepen: " + gebruiker.werkgroepen.join(", ")
    : "Nog geen werkgroep";
  kaart.append(werkgroepen);

  // De vinkjes, alleen als ze aan staan. Met een icoon én tekst (niet alleen kleur).
  if (gebruiker.isBeheerder) kaart.append(maakLabel("🔑 Beheerder"));
  if (gebruiker.krijgtGevaarMail) kaart.append(maakLabel("⚠️ Krijgt mail bij gevaar"));
  if (!gebruiker.actief) kaart.append(maakLabel("Gestopt"));

  // Wie gestopt is, kun je (nog) niet wijzigen. Dat komt bij "laten stoppen".
  if (gebruiker.actief) {
    kaart.append(maakTweedeKnop("Wijzigen", () => openGebruikerFormulier(gebruiker)));
  }

  return kaart;
}

// Klein grijs labeltje op een kaart
function maakLabel(tekst) {
  const label = document.createElement("p");
  label.className = "status status-open";
  label.textContent = tekst;
  return label;
}

// ===== WIJZIGEN =====

// Opzoektabel: nummer van een werkgroep → naam (gevuld door haalGebruikersOp)
const werkgroepNaamVan = {};

// Wat er in het formulier staat. null = er is geen formulier open.
let gebruikerFormulier = null;

// Opent het formulier met de huidige gegevens van deze persoon
function openGebruikerFormulier(gebruiker) {
  gebruikerFormulier = {
    id: gebruiker.id,
    voornaam: gebruiker.voornaam,
    letter: gebruiker.letter,
    rol: gebruiker.rol,
    werkgroepIds: [...gebruiker.werkgroepIds],   // een kopie, zodat het origineel blijft
    isBeheerder: gebruiker.isBeheerder,
    krijgtGevaarMail: gebruiker.krijgtGevaarMail,
    origineel: gebruiker                          // voor "Ongedaan maken"
  };
  toonGebruikerFormulier();
}

// Tekent het formulier. Wordt na elke tik op een keuzeknop opnieuw getekend.
function toonGebruikerFormulier() {
  if (!gebruikerFormulier) { toonBeheer(); return; }   // geen formulier open: terug
  huidigScherm = "gebruiker-formulier";
  const formulier = gebruikerFormulier;
  document.getElementById("titel").textContent = "Gebruiker wijzigen";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  inhoud.append(maakInvoerVeld("Voornaam", "tekst", formulier.voornaam,
    waarde => { formulier.voornaam = waarde; }));
  inhoud.append(maakInvoerVeld("Eerste letter van de achternaam", "tekst", formulier.letter,
    waarde => { formulier.letter = waarde; }));

  // Rol: één keuze. Op het scherm "Coördinator", in de database "coordinator".
  const rollen = Object.keys(ROL_TEKST);   // ["vrijwilliger", "bestuur", "coordinator"]
  inhoud.append(maakKeuzeVeld("Rol", rollen.map(rol => ROL_TEKST[rol]), ROL_TEKST[formulier.rol],
    tekst => {
      formulier.rol = rollen.find(rol => ROL_TEKST[rol] === tekst);
      toonGebruikerFormulier();
    }));

  inhoud.append(maakWerkgroepenVeld(formulier));

  inhoud.append(maakKeuzeVeld("Beheerder? (mag dit beheerscherm gebruiken)", ["Nee", "Ja"],
    formulier.isBeheerder ? "Ja" : "Nee",
    keuze => { formulier.isBeheerder = keuze === "Ja"; toonGebruikerFormulier(); }));

  inhoud.append(maakKeuzeVeld("Krijgt een e-mail bij een gevaarlijke melding?", ["Nee", "Ja"],
    formulier.krijgtGevaarMail ? "Ja" : "Nee",
    keuze => { formulier.krijgtGevaarMail = keuze === "Ja"; toonGebruikerFormulier(); }));

  const fout = document.createElement("p");
  fout.id = "gebruiker-fout";
  fout.className = "fout";
  fout.setAttribute("role", "alert");
  inhoud.append(fout);

  const opslaan = maakHoofdKnop("Opslaan", slaGebruikerOp);
  opslaan.id = "knop-gebruiker-opslaan";
  inhoud.append(opslaan);
  inhoud.append(maakTweedeKnop("Annuleren", () => {
    gebruikerFormulier = null;
    toonBeheer();
  }));

  markeerMenu("beheer");
}

// Werkgroepen: meer keuzes tegelijk. Elke knop zet een werkgroep aan of uit.
// Te kiezen: de werkgroepen die meedoen, plus een oude werkgroep waar deze
// persoon nog in zit (anders zou die ongemerkt verdwijnen).
function maakWerkgroepenVeld(formulier) {
  const keuzes = lijsten.werkgroepen.map(w => ({ id: w.id, naam: w.naam }));
  formulier.werkgroepIds.forEach(id => {
    if (!keuzes.some(k => k.id === id)) keuzes.push({ id, naam: werkgroepNaamVan[id] || "Werkgroep " + id });
  });

  const veld = document.createElement("div");
  veld.className = "veld";
  const titel = document.createElement("p");
  titel.className = "veld-titel";
  titel.textContent = "Werkgroepen (tik om aan of uit te zetten)";
  veld.append(titel);

  const kiezer = document.createElement("div");
  kiezer.className = "kiezer";
  keuzes.forEach(werkgroep => {
    const gekozen = formulier.werkgroepIds.includes(werkgroep.id);
    const knop = document.createElement("button");
    // Een vinkje ervoor, zodat je niet alleen aan de kleur ziet wat aan staat
    knop.textContent = (gekozen ? "✓ " : "") + werkgroep.naam;
    knop.setAttribute("aria-pressed", gekozen);
    knop.addEventListener("click", () => {
      formulier.werkgroepIds = gekozen
        ? formulier.werkgroepIds.filter(id => id !== werkgroep.id)   // uitzetten
        : [...formulier.werkgroepIds, werkgroep.id];                 // aanzetten
      toonGebruikerFormulier();
    });
    kiezer.append(knop);
  });
  veld.append(kiezer);
  return veld;
}

// Controleert het formulier en bewaart de wijziging
async function slaGebruikerOp() {
  const formulier = gebruikerFormulier;
  const fout = document.getElementById("gebruiker-fout");
  if (!formulier.voornaam.trim()) { fout.textContent = "Vul een voornaam in."; return; }
  if (!formulier.letter.trim())   { fout.textContent = "Vul de eerste letter van de achternaam in."; return; }

  const knop = document.getElementById("knop-gebruiker-opslaan");
  if (knop) knop.disabled = true;   // een tweede tik doet niets

  // Mislukt het, dan blijft het formulier staan (de melding onderaan zegt waarom)
  if (!await bewaarGebruiker(formulier)) {
    if (knop) knop.disabled = false;
    return;
  }

  const oud = formulier.origineel;
  const naam = formulier.voornaam.trim() + " " + formulier.letter.trim() + ".";
  gebruikerFormulier = null;
  await toonBeheer();
  // Jezelf gewijzigd? Dan zie je dat pas als je de app opnieuw opent (zie BEHEER.md).
  const tekst = formulier.id === ingelogdeGebruiker.id
    ? "Opgeslagen. Open de app opnieuw om je eigen wijziging te zien."
    : "Opgeslagen: " + naam;
  toonMelding(tekst, async () => {
    if (await bewaarGebruiker(oud)) {
      toonMelding("Teruggezet: " + oud.naam);
      if (huidigScherm === "beheer") toonBeheer();
    }
  });
}

// Stuurt de gegevens naar de database (vaste actie gebruiker_wijzigen in
// database/08_beheer.sql). Geeft true als het gelukt is.
async function bewaarGebruiker(g) {
  return await vraagDatabase("gebruiker_wijzigen", {
    gebruiker_id: g.id,
    nieuwe_voornaam: g.voornaam,
    nieuwe_achternaam_letter: g.letter,
    nieuwe_rol: g.rol,
    wordt_beheerder: g.isBeheerder,
    krijgt_mail_bij_gevaar: g.krijgtGevaarMail,
    nieuwe_werkgroepen: g.werkgroepIds
  });
}

// De knop "Beheer" bovenin. Of hij te zien is, regelt startApp (app.js).
document.getElementById("knop-beheer").addEventListener("click", toonBeheer);
