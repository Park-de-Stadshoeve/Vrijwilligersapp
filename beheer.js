// Beheerscherm: overzicht van alle gebruikers (alleen voor beheerders).
// Dit bestand wordt geladen door index.html, vóór app.js.
//
// Stap 1: bekijken. Stap 2: naam, rol, vinkjes en werkgroepen wijzigen.
// Stap 3: iemand toevoegen en het e-mailadres wijzigen. Laten stoppen komt later.
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
  inhoud.append(maakHoofdKnop("+ Iemand toevoegen", openNieuweGebruiker));

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

// ===== TOEVOEGEN EN WIJZIGEN =====
// Eén formulier voor allebei. formulier.modus is "nieuw" of "wijzigen".
//
// Naam, rol, vinkjes en werkgroepen gaan via de database (vaste actie
// gebruiker_wijzigen, database/08_beheer.sql). Een nieuw inlogaccount en een
// ander e-mailadres gaan via de Edge Function "beheer"
// (supabase/functions/beheer/index.ts), want daarvoor is de geheime sleutel
// van Supabase nodig.

// Opzoektabel: nummer van een werkgroep → naam (gevuld door haalGebruikersOp)
const werkgroepNaamVan = {};

// Wat er in het formulier staat. null = er is geen formulier open.
let gebruikerFormulier = null;

// Opent een leeg formulier om iemand toe te voegen. Slimme standaard: vrijwilliger.
function openNieuweGebruiker() {
  gebruikerFormulier = {
    modus: "nieuw",
    email: "",
    emailStatus: "klaar",
    voornaam: "",
    letter: "",
    rol: "vrijwilliger",
    werkgroepIds: [],
    isBeheerder: false,
    krijgtGevaarMail: false
  };
  toonGebruikerFormulier();
}

// Opent het formulier met de huidige gegevens van deze persoon
function openGebruikerFormulier(gebruiker) {
  const formulier = {
    modus: "wijzigen",
    id: gebruiker.id,
    email: "",
    emailOrigineel: "",
    emailStatus: "laden",   // "laden", "klaar" of "fout"
    voornaam: gebruiker.voornaam,
    letter: gebruiker.letter,
    rol: gebruiker.rol,
    werkgroepIds: [...gebruiker.werkgroepIds],   // een kopie, zodat het origineel blijft
    isBeheerder: gebruiker.isBeheerder,
    krijgtGevaarMail: gebruiker.krijgtGevaarMail,
    origineel: gebruiker                          // voor "Ongedaan maken"
  };
  gebruikerFormulier = formulier;
  toonGebruikerFormulier();
  haalEmailOp(formulier);   // het e-mailadres komt even later
}

// Haalt het e-mailadres op (alleen beheerders mogen dat, database/09_email.sql)
// en tekent het formulier opnieuw als het er nog staat.
async function haalEmailOp(formulier) {
  const stopper = new AbortController();
  const wekker = setTimeout(() => stopper.abort(), WACHTTIJD_DATABASE);
  try {
    const { data, error } = await database
      .rpc("gebruiker_email", { gebruiker_id: formulier.id })
      .abortSignal(stopper.signal);
    if (error) throw error;
    formulier.email = data || "";
    formulier.emailOrigineel = data || "";
    formulier.emailStatus = "klaar";
  } catch (fout) {
    console.warn("E-mailadres ophalen mislukt:", fout);
    formulier.emailStatus = "fout";
  } finally {
    clearTimeout(wekker);
  }
  if (gebruikerFormulier === formulier) toonGebruikerFormulier();
}

// Tekent het formulier. Wordt na elke tik op een keuzeknop opnieuw getekend.
function toonGebruikerFormulier() {
  if (!gebruikerFormulier) { toonBeheer(); return; }   // geen formulier open: terug
  huidigScherm = "gebruiker-formulier";
  const formulier = gebruikerFormulier;
  const isNieuw = formulier.modus === "nieuw";
  document.getElementById("titel").textContent = isNieuw ? "Iemand toevoegen" : "Gebruiker wijzigen";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  inhoud.append(maakEmailVeld(formulier));

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

  const opslaan = maakHoofdKnop(isNieuw ? "Toevoegen" : "Opslaan",
                                isNieuw ? voegGebruikerToe : slaGebruikerOp);
  opslaan.id = "knop-gebruiker-opslaan";
  inhoud.append(opslaan);
  inhoud.append(maakTweedeKnop("Annuleren", () => {
    gebruikerFormulier = null;
    toonBeheer();
  }));

  markeerMenu("beheer");
}

// Het veld voor het e-mailadres. Bij "wijzigen" moet het adres eerst geladen worden.
function maakEmailVeld(formulier) {
  const label = "E-mailadres (hiermee logt de persoon in)";
  if (formulier.emailStatus === "fout") {
    const uitleg = document.createElement("p");
    uitleg.className = "uitleg-bovenaan";
    uitleg.textContent = "📶 Het e-mailadres kon niet worden geladen. De rest kun je wel wijzigen.";
    return uitleg;
  }
  const veld = maakInvoerVeld(label, "email", formulier.email,
    waarde => { formulier.email = waarde; });
  if (formulier.emailStatus === "laden") {
    const invoer = veld.querySelector("input");
    invoer.disabled = true;
    invoer.placeholder = "Laden…";
  }
  return veld;
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

// Controleert de velden die altijd ingevuld moeten zijn.
// Geeft de foutzin terug, of "" als alles goed is.
function controleerFormulier(formulier) {
  const emailNodig = formulier.modus === "nieuw" || formulier.emailStatus === "klaar";
  if (emailNodig && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulier.email.trim())) {
    return "Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.";
  }
  if (!formulier.voornaam.trim()) return "Vul een voornaam in.";
  if (!formulier.letter.trim())   return "Vul de eerste letter van de achternaam in.";
  return "";
}

// ➕ Iemand toevoegen (via de Edge Function)
async function voegGebruikerToe() {
  const formulier = gebruikerFormulier;
  const fout = document.getElementById("gebruiker-fout");
  fout.textContent = controleerFormulier(formulier);
  if (fout.textContent) return;

  const knop = document.getElementById("knop-gebruiker-opslaan");
  if (knop) knop.disabled = true;   // een tweede tik maakt niet twee accounts

  const antwoord = await roepBeheerFunctieAan({
    actie: "toevoegen",
    email: formulier.email,
    voornaam: formulier.voornaam,
    letter: formulier.letter,
    rol: formulier.rol,
    isBeheerder: formulier.isBeheerder,
    krijgtGevaarMail: formulier.krijgtGevaarMail,
    werkgroepen: formulier.werkgroepIds
  });
  if (!antwoord.gelukt) {   // formulier blijft staan; de melding zegt wat er mis is
    if (knop) knop.disabled = false;
    return;
  }

  const naam = formulier.voornaam.trim() + " " + formulier.letter.trim() + ".";
  const nieuweId = antwoord.data.id;
  gebruikerFormulier = null;
  await toonBeheer();
  toonMelding("Toegevoegd: " + naam, async () => {
    const terug = await roepBeheerFunctieAan({ actie: "toevoegen_ongedaan", gebruikerId: nieuweId });
    if (terug.gelukt) {
      toonMelding("Weggehaald: " + naam);
      if (huidigScherm === "beheer") toonBeheer();
    }
  });
}

// ✏️ Wijzigingen opslaan. Eerst het e-mailadres (als dat anders is), dan de rest.
async function slaGebruikerOp() {
  const formulier = gebruikerFormulier;
  const fout = document.getElementById("gebruiker-fout");
  fout.textContent = controleerFormulier(formulier);
  if (fout.textContent) return;

  const knop = document.getElementById("knop-gebruiker-opslaan");
  if (knop) knop.disabled = true;   // een tweede tik doet niets

  const oud = formulier.origineel;
  const oudEmail = formulier.emailOrigineel;
  const nieuwEmail = formulier.email.trim().toLowerCase();
  const emailAnders = formulier.emailStatus === "klaar" && nieuwEmail !== oudEmail;

  // 1. Het e-mailadres (via de Edge Function). Mislukt het, dan is er niets veranderd.
  if (emailAnders) {
    const antwoord = await roepBeheerFunctieAan({ actie: "email_wijzigen", gebruikerId: formulier.id, email: nieuwEmail });
    if (!antwoord.gelukt) {
      if (knop) knop.disabled = false;
      return;
    }
    formulier.emailOrigineel = nieuwEmail;   // bij nog een keer proberen niet opnieuw doen
  }

  // 2. Naam, rol, vinkjes en werkgroepen (via de database)
  if (!await bewaarGebruiker(formulier)) {
    if (emailAnders) {
      toonMelding("Het nieuwe e-mailadres is opgeslagen, de rest nog niet. Tik nog een keer op Opslaan.");
    }
    if (knop) knop.disabled = false;
    return;
  }

  const naam = formulier.voornaam.trim() + " " + formulier.letter.trim() + ".";
  gebruikerFormulier = null;
  await toonBeheer();
  // Jezelf gewijzigd? Dan zie je dat pas als je de app opnieuw opent (zie BEHEER.md).
  const tekst = formulier.id === ingelogdeGebruiker.id
    ? "Opgeslagen. Open de app opnieuw om je eigen wijziging te zien."
    : "Opgeslagen: " + naam;
  toonMelding(tekst, async () => {
    if (emailAnders) {
      const terug = await roepBeheerFunctieAan({ actie: "email_wijzigen", gebruikerId: oud.id, email: oudEmail });
      if (!terug.gelukt) return;
    }
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

// Hoe lang we op de Edge Function wachten. Langer dan bij de database: de
// functie moet soms eerst "opstarten" en praat zelf ook met de database.
const WACHTTIJD_BEHEER_FUNCTIE = 20000;

// Roept de Edge Function "beheer" aan en laat onderaan zien hoe het ging.
// Geeft { gelukt: true/false, data: het antwoord van de functie }.
async function roepBeheerFunctieAan(gegevens) {
  toonMelding("Even geduld…");
  let wekker;
  const teLang = new Promise(klaar => {
    wekker = setTimeout(() => klaar({ teLang: true }), WACHTTIJD_BEHEER_FUNCTIE);
  });
  try {
    const antwoord = await Promise.race([database.functions.invoke("beheer", { body: gegevens }), teLang]);
    if (antwoord.teLang) {
      toonMelding("Het duurde te lang. Ververs de lijst en kijk of het gelukt is.");
      return { gelukt: false, data: null };
    }
    if (!antwoord.error) return { gelukt: true, data: antwoord.data };

    // De functie legt zelf uit wat er mis is (bijv. "Dit e-mailadres is al in gebruik")
    const fout = antwoord.error;
    console.warn("Edge Function beheer:", fout);
    let uitleg = "";
    if (fout.context && typeof fout.context.json === "function") {
      try { uitleg = (await fout.context.json()).fout || ""; } catch (e) { /* geen uitleg */ }
    }
    if (uitleg) toonMelding(uitleg);
    else if (fout.name === "FunctionsFetchError" || isVerbindingsFout(fout)) {
      toonMelding("Geen verbinding. Er is niets veranderd. Probeer het opnieuw als je bereik hebt.");
    } else {
      toonMelding("Er ging iets mis (" + fout.message + "). Er is niets veranderd. Probeer het opnieuw.");
    }
    return { gelukt: false, data: null };
  } catch (fout) {
    console.warn("Edge Function beheer:", fout);
    toonMelding("Geen verbinding. Er is niets veranderd. Probeer het opnieuw als je bereik hebt.");
    return { gelukt: false, data: null };
  } finally {
    clearTimeout(wekker);
  }
}

// De knop "Beheer" bovenin. Of hij te zien is, regelt startApp (app.js).
document.getElementById("knop-beheer").addEventListener("click", toonBeheer);
