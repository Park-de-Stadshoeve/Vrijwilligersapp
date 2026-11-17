// Beheerscherm: overzicht van alle gebruikers (alleen voor beheerders).
// Dit bestand wordt geladen door index.html, vóór app.js.
//
// Stap 1: bekijken. Stap 2: naam, rol, vinkjes en werkgroepen wijzigen.
// Stap 3: iemand toevoegen en het e-mailadres wijzigen.
// Stap 4: iemand laten stoppen en weer laten meedoen.
// Daarna: back-up downloaden en terugzetten (zie "BACK-UP" en
// "BACK-UP TERUGZETTEN" onderaan).
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
  const laatsteBackup = await haalLaatsteBackupOp();   // lukt dit niet: null
  if (huidigScherm !== "beheer") return;   // intussen een ander scherm gekozen
  toonGebruikersLijst(gebruikers, laatsteBackup);
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
function toonGebruikersLijst(gebruikers, laatsteBackup) {
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  // Te lang geen back-up? Dan bovenaan een waarschuwing.
  const waarschuwing = maakBackupWaarschuwing(laatsteBackup);
  if (waarschuwing) inhoud.append(waarschuwing);

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

  inhoud.append(maakBackupDeel(laatsteBackup));
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

  // Wie meedoet, kun je wijzigen. Wie gestopt is, kan weer meedoen.
  if (gebruiker.actief) {
    kaart.append(maakTweedeKnop("Wijzigen", () => openGebruikerFormulier(gebruiker)));
  } else {
    kaart.append(maakTweedeKnop("Weer laten meedoen", () => openWeerMeedoen(gebruiker)));
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
  if (formulier.modus === "terug") { toonWeerMeedoenFormulier(); return; }
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

  // Laten stoppen: apart, helemaal onderaan. Niet voor jezelf.
  if (!isNieuw && formulier.id !== ingelogdeGebruiker.id) {
    const stoppen = maakTweedeKnop("Laten stoppen", () => laatGebruikerStoppen(formulier.origineel));
    stoppen.classList.add("knop-stoppen");
    inhoud.append(stoppen);
  }

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

// ===== LATEN STOPPEN EN WEER LATEN MEEDOEN =====
// Allebei via de Edge Function "beheer" (acties "stoppen" en "terugzetten").
// Bij stoppen: open taken weer vrij, vinkjes uit, inlogaccount en e-mailadres
// weg. Naam, rol en werkgroepen blijven, zodat iemand later weer mee kan doen.

// 🚪 Iemand laten stoppen. Geen "Weet je het zeker?", wel "Ongedaan maken".
async function laatGebruikerStoppen(gebruiker) {
  const antwoord = await roepBeheerFunctieAan({ actie: "stoppen", gebruikerId: gebruiker.id });
  if (!antwoord.gelukt) return;   // formulier blijft staan; de melding zegt wat er mis is

  const uitslag = antwoord.data;
  const aantal = uitslag.taken.length;
  gebruikerFormulier = null;
  await toonBeheer();
  toonMelding(gebruiker.naam + " is gestopt." +
    (aantal === 1 ? " 1 taak staat weer open." : aantal > 1 ? " " + aantal + " taken staan weer open." : ""),
    async () => {
      // Ongedaan maken: alles terug zoals het was, ook de taken en de vinkjes
      const terug = await roepBeheerFunctieAan({
        actie: "terugzetten",
        gebruikerId: gebruiker.id,
        email: uitslag.email,
        taken: uitslag.taken,
        wordtBeheerder: uitslag.wasBeheerder,
        krijgtGevaarMail: uitslag.kreegGevaarMail
      });
      if (terug.gelukt) {
        toonMelding("Teruggezet: " + gebruiker.naam + " doet weer mee.");
        if (huidigScherm === "beheer") toonBeheer();
      }
    });
}

// Opent het korte formulier "Weer laten meedoen": alleen het e-mailadres
function openWeerMeedoen(gebruiker) {
  gebruikerFormulier = {
    modus: "terug",
    id: gebruiker.id,
    email: "",
    emailStatus: "klaar",
    origineel: gebruiker
  };
  toonGebruikerFormulier();
}

function toonWeerMeedoenFormulier() {
  huidigScherm = "gebruiker-formulier";
  const formulier = gebruikerFormulier;
  const gebruiker = formulier.origineel;
  document.getElementById("titel").textContent = "Weer laten meedoen";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  const uitleg = document.createElement("p");
  uitleg.textContent = gebruiker.naam + " doet weer mee, met dezelfde naam en de oude taken " +
    "en meldingen. Rol en werkgroepen staan zoals vroeger; pas ze daarna aan met Wijzigen.";
  inhoud.append(uitleg);

  inhoud.append(maakEmailVeld(formulier));

  const fout = document.createElement("p");
  fout.id = "gebruiker-fout";
  fout.className = "fout";
  fout.setAttribute("role", "alert");
  inhoud.append(fout);

  const knop = maakHoofdKnop("Weer laten meedoen", laatWeerMeedoen);
  knop.id = "knop-gebruiker-opslaan";
  inhoud.append(knop);
  inhoud.append(maakTweedeKnop("Annuleren", () => {
    gebruikerFormulier = null;
    toonBeheer();
  }));
  markeerMenu("beheer");
}

// ↩️ Iemand weer laten meedoen
async function laatWeerMeedoen() {
  const formulier = gebruikerFormulier;
  const gebruiker = formulier.origineel;
  const fout = document.getElementById("gebruiker-fout");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulier.email.trim())) {
    fout.textContent = "Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.";
    return;
  }
  const knop = document.getElementById("knop-gebruiker-opslaan");
  if (knop) knop.disabled = true;

  const antwoord = await roepBeheerFunctieAan({
    actie: "terugzetten", gebruikerId: gebruiker.id, email: formulier.email
  });
  if (!antwoord.gelukt) {
    if (knop) knop.disabled = false;
    return;
  }

  gebruikerFormulier = null;
  await toonBeheer();
  toonMelding(gebruiker.naam + " doet weer mee.", async () => {
    const terug = await roepBeheerFunctieAan({ actie: "stoppen", gebruikerId: gebruiker.id });
    if (terug.gelukt) {
      toonMelding("Teruggezet: " + gebruiker.naam + " is weer gestopt.");
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
// "wachttijd" (niet verplicht): langer wachten, bijv. bij terugzetten.
async function roepBeheerFunctieAan(gegevens, wachttijd = WACHTTIJD_BEHEER_FUNCTIE) {
  toonMelding("Even geduld…");
  let wekker;
  const teLang = new Promise(klaar => {
    wekker = setTimeout(() => klaar({ teLang: true }), wachttijd);
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

// ===== BACK-UP =====
// Eén keer per maand downloadt een beheerder een back-up: een zip-bestand
// met alle gegevens en inlogaccounts (gegevens.json), alle foto's (map
// fotos/, met dezelfde mapjes als in Supabase) en een uitleg (LEESMIJ.txt). De beheerder zet het bestand op de afgeschermde map op
// SharePoint. Zie BEHEER.md, "Back-up".
// De gegevens komen van de Edge Function "beheer" (actie "backup").

const BACKUP_WAARSCHUW_NA_DAGEN = 31;
const FOTOS_TEGELIJK = 4;          // zoveel foto's tegelijk ophalen
const FOTO_POGINGEN = 2;           // zo vaak proberen per foto

// Hulpbestand om zip-bestanden te maken. Wordt alleen geladen als een
// beheerder op "Back-up downloaden" tikt. De "integrity"-code zorgt dat de
// browser het bestand weigert als iemand het bij jsdelivr zou veranderen.
// Nieuwe versie? Dan verandert ook de code (zie BEHEER.md).
const JSZIP_ADRES = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
const JSZIP_CONTROLE = "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG";

// Wanneer is de laatste back-up gemaakt? Geeft een datum, of null als er
// nog nooit een is gemaakt of als het ophalen niet lukt.
async function haalLaatsteBackupOp() {
  try {
    const { data, error } = await database
      .from("back_ups").select("gemaakt_op")
      .order("gemaakt_op", { ascending: false }).limit(1);
    if (error) throw error;
    return data.length > 0 ? new Date(data[0].gemaakt_op) : null;
  } catch (fout) {
    console.warn("Laatste back-up ophalen mislukt:", fout);
    return null;
  }
}

// Hoeveel hele dagen geleden?
function dagenGeleden(datum) {
  return Math.floor((Date.now() - datum.getTime()) / (24 * 60 * 60 * 1000));
}

// Waarschuwing bovenaan als het te lang geleden is (anders niets)
function maakBackupWaarschuwing(laatsteBackup) {
  if (laatsteBackup && dagenGeleden(laatsteBackup) <= BACKUP_WAARSCHUW_NA_DAGEN) return null;
  const melding = document.createElement("p");
  melding.className = "uitleg-bovenaan";
  melding.setAttribute("role", "status");
  melding.textContent = laatsteBackup
    ? "⚠️ De laatste back-up is " + dagenGeleden(laatsteBackup) + " dagen oud. Maak een nieuwe (knop onderaan)."
    : "⚠️ Er is nog geen back-up gemaakt. Maak er een (knop onderaan).";
  return melding;
}

// Onderaan het beheerscherm: wanneer de laatste back-up was, en de knop
function maakBackupDeel(laatsteBackup) {
  const deel = document.createElement("section");
  const kop = document.createElement("h2");
  kop.className = "beheer-kop";
  kop.textContent = "Back-up";
  deel.append(kop);

  const wanneer = document.createElement("p");
  wanneer.textContent = laatsteBackup
    ? "Laatste back-up: " + leesbareTijd(laatsteBackup) + " (" + dagenGeleden(laatsteBackup) + " dagen geleden)."
    : "Er is nog geen back-up gemaakt.";
  deel.append(wanneer);

  const uitleg = document.createElement("p");
  uitleg.className = "details";
  uitleg.textContent = "Doe dit één keer per maand, op een computer. Zet het bestand daarna in de " +
    "afgeschermde map op SharePoint en verwijder het uit je map Downloads.";
  deel.append(uitleg);

  const knop = maakTweedeKnop("💾 Back-up downloaden", () => downloadBackup(knop));
  deel.append(knop);

  // Terugzetten: alleen nodig bij een ramp, in een nieuw, leeg project
  deel.append(maakTweedeKnop("♻️ Back-up terugzetten", toonHerstelScherm));
  return deel;
}

// 💾 Maakt het zip-bestand en laat de browser het downloaden
async function downloadBackup(knop) {
  knop.disabled = true;   // een tweede tik maakt niet twee back-ups
  try {
    toonMelding("Back-up maken… even geduld");
    await laadJSZip();
    const antwoord = await roepBeheerFunctieAan({ actie: "backup" });
    if (!antwoord.gelukt) return;   // de melding zegt wat er mis is

    // "gelukt" en de tijdelijke links horen niet in het bestand
    const { gelukt, foto_links, ...gegevens } = antwoord.data;
    const datum = gegevens.gemaakt_op.slice(0, 10);   // bijv. 2026-11-16
    const zip = new JSZip();

    // De foto's. Foto's zijn al ingepakt (JPEG), dus "STORE" = niet nog eens inpakken.
    const ontbreekt = await haalFotosOp(foto_links, (pad, foto) => {
      zip.file("fotos/" + pad, foto, { compression: "STORE" });
    });

    zip.file("gegevens.json", JSON.stringify(gegevens, null, 1));
    zip.file("LEESMIJ.txt", backupLeesmij(gegevens, ontbreekt));
    toonMelding("Zip-bestand maken… even geduld");
    const bestand = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    bewaarBestand(bestand, "stadshoeve-backup-" + datum + ".zip");

    if (ontbreekt.length > 0) {
      toonMelding("⚠️ Back-up gedownload, maar " + ontbreekt.length + " foto('s) ontbreken. " +
                  "Maak de back-up opnieuw als je goed internet hebt.");
    } else {
      toonMelding("Back-up gedownload (" + foto_links.length + " foto's). Zet hem op SharePoint en haal hem uit je Downloads.");
    }
    if (huidigScherm === "beheer") toonBeheer();   // "laatste back-up" bijwerken
  } catch (fout) {
    console.warn("Back-up mislukt:", fout);
    toonMelding("De back-up is niet gelukt (" + fout.message + "). Probeer het opnieuw op een computer met internet.");
  } finally {
    knop.disabled = false;
  }
}

// Haalt alle foto's op via hun tijdelijke link, een paar tegelijk.
// "bijFoto(pad, foto)" krijgt elke gelukte foto. Laat onderaan zien hoe ver
// het is. Geeft de paden van de foto's die niet gelukt zijn.
async function haalFotosOp(links, bijFoto) {
  const ontbreekt = [];
  let klaar = 0;
  let volgende = 0;
  toonMelding("Foto's ophalen: 0 van " + links.length);

  // Eén "ophaler" pakt steeds de volgende foto uit de lijst
  async function ophaler() {
    while (volgende < links.length) {
      const { pad, url } = links[volgende++];
      const foto = url ? await haalEenFotoOp(url) : null;
      if (foto) bijFoto(pad, foto);
      else ontbreekt.push(pad);
      klaar++;
      toonMelding("Foto's ophalen: " + klaar + " van " + links.length);
    }
  }
  // Een paar ophalers tegelijk laten werken (sneller dan één voor één)
  await Promise.all(Array.from({ length: FOTOS_TEGELIJK }, ophaler));
  return ontbreekt;
}

// Haalt één foto op. Geeft de foto, of null als het na FOTO_POGINGEN keer niet lukt.
async function haalEenFotoOp(url) {
  for (let poging = 1; poging <= FOTO_POGINGEN; poging++) {
    try {
      const antwoord = await fetch(url);
      if (antwoord.ok) return await antwoord.blob();
    } catch (fout) {
      console.warn("Foto ophalen mislukt (poging " + poging + "):", fout);
    }
  }
  return null;
}

// Laadt het hulpbestand JSZip (één keer)
function laadJSZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise((klaar, mislukt) => {
    const script = document.createElement("script");
    script.src = JSZIP_ADRES;
    script.integrity = JSZIP_CONTROLE;
    script.crossOrigin = "anonymous";
    script.onload = klaar;
    script.onerror = () => mislukt(new Error("hulpbestand voor zip niet geladen"));
    document.head.append(script);
  });
}

// Laat de browser een bestand downloaden
function bewaarBestand(bestand, naam) {
  const adres = URL.createObjectURL(bestand);
  const link = document.createElement("a");
  link.href = adres;
  link.download = naam;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adres), 60000);   // na een minuut opruimen
}

// De tekst van LEESMIJ.txt in de back-up
function backupLeesmij(gegevens, ontbreekt) {
  const aantallen = Object.entries(gegevens.tabellen)
    .map(([tabel, rijen]) => "  " + tabel + ": " + rijen.length)
    .join("\n");
  return [
    "Back-up Vrijwilligersapp Park de Stadshoeve",
    "Gemaakt op: " + gegevens.gemaakt_op,
    "",
    "LET OP: dit bestand bevat persoonsgegevens (voornamen en e-mailadressen).",
    "Bewaar het alleen in de afgeschermde map op SharePoint. Bewaar de laatste 3",
    "back-ups en verwijder oudere. Zie BEHEER.md in de repository, kopje 'Back-up'.",
    "",
    "Wat zit erin?",
    "  gegevens.json: alle tabellen en de inlogaccounts (nummer en e-mailadres).",
    "  fotos/:        alle foto's, in dezelfde mapjes als in Supabase.",
    "",
    "Aantal rijen per tabel:",
    aantallen,
    "  inlogaccounts: " + gegevens.accounts.length,
    "  foto's: " + (gegevens.fotos.length - ontbreekt.length) + " van " + gegevens.fotos.length,
    "",
    ...(ontbreekt.length > 0
      ? ["LET OP: deze foto's konden niet worden opgehaald en ontbreken:",
         ...ontbreekt.map(pad => "  " + pad), ""]
      : []),
    "Terugzetten: zie BEHEER.md, kopje 'Back-up'."
  ].join("\n");
}

// ===== BACK-UP TERUGZETTEN =====
// Alleen voor een ramp: het project is weg of leeg, en je zet alles terug in
// een nieuw, leeg project. Werkt alleen als er nog geen taken en meldingen
// zijn, en hooguit één gebruiker (jij, met de hand neergezet). Zie BEHEER.md,
// "Back-up terugzetten". Kan NIET ongedaan gemaakt worden; daarom kan het
// alleen in een lege database.
//
// Drie delen, allemaal via de Edge Function "beheer":
//   1. tabellen en inlogaccounts  (actie "herstel_gegevens")
//   2. foto's                     (actie "foto_upload_links", dan uploaden)
//   3. afronden: je tijdelijke account wordt je eigen account uit de back-up
//      (actie "herstel_afronden"); daarna log je opnieuw in.

const WACHTTIJD_HERSTEL = 120000;   // 2 minuten: veel accounts kost tijd

function toonHerstelScherm() {
  huidigScherm = "herstel";
  document.getElementById("titel").textContent = "Back-up terugzetten";
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();

  const uitleg = document.createElement("p");
  uitleg.className = "uitleg-bovenaan";
  uitleg.textContent = "⚠️ Alleen gebruiken bij een ramp, in een nieuw, leeg project. " +
    "Het werkt alleen als er nog geen taken en meldingen zijn, en jij de enige gebruiker bent. " +
    "Doe dit op een computer. Volg het stappenplan in BEHEER.md.";
  inhoud.append(uitleg);

  // Bestand kiezen: een verborgen invoer achter een gewone knop
  const kiezer = document.createElement("input");
  kiezer.type = "file";
  kiezer.accept = ".zip";
  kiezer.className = "verborgen";
  const gekozen = document.createElement("p");
  gekozen.className = "details";
  gekozen.textContent = "Nog geen bestand gekozen.";
  const start = maakHoofdKnop("Terugzetten", () => zetBackupTerug(kiezer.files[0], start));
  start.disabled = true;
  kiezer.addEventListener("change", () => {
    gekozen.textContent = kiezer.files[0] ? "Gekozen: " + kiezer.files[0].name : "Nog geen bestand gekozen.";
    start.disabled = !kiezer.files[0];
  });
  inhoud.append(kiezer, maakTweedeKnop("📁 Kies het back-upbestand (.zip)", () => kiezer.click()), gekozen, start);

  // Hier komt te staan hoe het gaat
  const stappen = document.createElement("ol");
  stappen.id = "herstel-stappen";
  inhoud.append(stappen);

  inhoud.append(maakTweedeKnop("Terug naar Beheer", toonBeheer));
  markeerMenu("beheer");
}

// Zet een regel in het lijstje "hoe gaat het"
function herstelStap(tekst) {
  const regel = document.createElement("li");
  regel.textContent = tekst;
  document.getElementById("herstel-stappen")?.append(regel);
  return regel;
}

// ♻️ Het echte terugzetten
async function zetBackupTerug(bestand, knop) {
  if (!bestand) return;
  knop.disabled = true;   // nooit twee keer tegelijk
  try {
    // Het zip-bestand openen en gegevens.json lezen
    await laadJSZip();
    const zip = await JSZip.loadAsync(bestand);
    const gegevensBestand = zip.file("gegevens.json");
    if (!gegevensBestand) throw new Error("Dit is geen back-up van de app: gegevens.json ontbreekt");
    const gegevens = JSON.parse(await gegevensBestand.async("string"));

    // Deel 1: tabellen en inlogaccounts
    const stap1 = herstelStap("Gegevens en inlogaccounts terugzetten…");
    const deel1 = await roepBeheerFunctieAan({ actie: "herstel_gegevens", gegevens }, WACHTTIJD_HERSTEL);
    if (!deel1.gelukt) {
      stap1.textContent = "Gestopt bij de gegevens. Er is niets veranderd. Lees de melding onderaan.";
      return;
    }
    const a = deel1.data.aantallen;
    stap1.textContent = "✓ Gegevens terug: " + a.taken + " taken, " + a.meldingen + " meldingen, " +
      a.gebruikers + " gebruikers. " + deel1.data.accountsTerug + " inlogaccounts terug.";
    if (deel1.data.nietGelukt.length > 0) {
      herstelStap("⚠️ Deze inlogaccounts konden niet terug: " + deel1.data.nietGelukt.join(", ") +
        ". Laat die personen in het beheerscherm stoppen en daarna weer meedoen.");
    }

    // Deel 2: de foto's
    const fotos = zip.file(/^fotos\/.+\.jpg$/);   // alle foto's in de map fotos/
    const stap2 = herstelStap("Foto's terugzetten: 0 van " + fotos.length + "…");
    const ontbreekt = await zetFotosTerug(fotos, (klaar) => {
      stap2.textContent = "Foto's terugzetten: " + klaar + " van " + fotos.length + "…";
    });
    stap2.textContent = "✓ Foto's terug: " + (fotos.length - ontbreekt.length) + " van " + fotos.length + ".";
    if (ontbreekt.length > 0) {
      herstelStap("⚠️ Deze foto's konden niet terug: " + ontbreekt.join(", "));
    }

    // Deel 3: afronden
    const stap3 = herstelStap("Afronden…");
    const deel3 = await roepBeheerFunctieAan({ actie: "herstel_afronden", mijnOudeId: deel1.data.mijnOudeId });
    if (!deel3.gelukt) {
      stap3.textContent = "⚠️ Afronden is niet gelukt. Lees de melding onderaan en kijk in BEHEER.md.";
      return;
    }
    if (deel3.data.uitloggen) {
      stap3.textContent = "✓ Klaar! Log nu uit en log opnieuw in met je eigen e-mailadres.";
      document.getElementById("herstel-stappen").after(maakHoofdKnop("Uitloggen", uitloggen));
      toonMelding("Back-up teruggezet. Log opnieuw in.");
    } else {
      stap3.textContent = "✓ Klaar!";
      toonMelding("Back-up teruggezet.");
    }
  } catch (fout) {
    console.warn("Terugzetten mislukt:", fout);
    herstelStap("⚠️ Gestopt: " + fout.message + ".");
    toonMelding("Terugzetten is gestopt (" + fout.message + ").");
  }
}

// Zet de foto's uit het zip-bestand terug, een paar tegelijk.
// Geeft de paden van de foto's die niet gelukt zijn.
async function zetFotosTerug(fotos, bijVoortgang) {
  const ontbreekt = [];
  let klaar = 0;
  // Per 100 een setje uploadlinks vragen
  for (let van = 0; van < fotos.length; van += 100) {
    const setje = fotos.slice(van, van + 100);
    const paden = setje.map(f => f.name.slice("fotos/".length));
    const antwoord = await roepBeheerFunctieAan({ actie: "foto_upload_links", paden });
    const links = antwoord.gelukt ? antwoord.data.links : paden.map(pad => ({ pad, token: "" }));

    let volgende = 0;
    async function uploader() {
      while (volgende < setje.length) {
        const i = volgende++;
        const { pad, token } = links[i];
        if (!await zetEenFotoTerug(setje[i], pad, token)) ontbreekt.push(pad);
        klaar++;
        bijVoortgang(klaar);
      }
    }
    await Promise.all(Array.from({ length: FOTOS_TEGELIJK }, uploader));
  }
  return ontbreekt;
}

// Zet één foto terug. Geeft true als het gelukt is (of als hij er al stond).
async function zetEenFotoTerug(zipFoto, pad, token) {
  if (token === "BESTAAT_AL") return true;
  if (!token) return false;
  const inhoud = await zipFoto.async("blob");
  const foto = new Blob([inhoud], { type: "image/jpeg" });
  for (let poging = 1; poging <= FOTO_POGINGEN; poging++) {
    const { error } = await database.storage.from("fotos")
      .uploadToSignedUrl(pad, token, foto, { contentType: "image/jpeg" });
    if (!error) return true;
    if (String(error.message || "").toLowerCase().includes("exist")) return true;   // stond er al
    console.warn("Foto terugzetten mislukt (poging " + poging + "):", error);
  }
  return false;
}

// De knop "Beheer" bovenin. Of hij te zien is, regelt startApp (app.js).
document.getElementById("knop-beheer").addEventListener("click", toonBeheer);
