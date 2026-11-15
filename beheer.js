// Beheerscherm: overzicht van alle gebruikers (alleen voor beheerders).
// Dit bestand wordt geladen door index.html, vóór app.js.
//
// Stap 1: alleen bekijken. Wijzigen, toevoegen en laten stoppen komen later.
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
// Geeft een lijst: { id, naam, rol, werkgroepen: ["Klussen"], isBeheerder,
// krijgtGevaarMail, actief }, gesorteerd op voornaam.
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
      .select("gebruiker, werkgroepen(naam)")
      .abortSignal(stopper.signal);

    // Beide vragen tegelijk versturen en op allebei wachten (dat is sneller)
    const [gebruikersAntwoord, ledenAntwoord] = await Promise.all([gebruikersVraag, ledenVraag]);
    if (gebruikersAntwoord.error) throw gebruikersAntwoord.error;
    if (ledenAntwoord.error) throw ledenAntwoord.error;

    return gebruikersAntwoord.data.map(rij => ({
      id: rij.id,
      naam: rij.voornaam + " " + rij.achternaam_letter + ".",   // bijv. "Piet P."
      rol: rij.rol,
      werkgroepen: ledenAntwoord.data
        .filter(lid => lid.gebruiker === rij.id)
        .map(lid => lid.werkgroepen.naam)
        .sort(),
      isBeheerder: rij.is_beheerder,
      krijgtGevaarMail: rij.krijgt_gevaar_mail,
      actief: rij.actief
    }));
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

  return kaart;
}

// Klein grijs labeltje op een kaart
function maakLabel(tekst) {
  const label = document.createElement("p");
  label.className = "status status-open";
  label.textContent = tekst;
  return label;
}

// De knop "Beheer" bovenin. Of hij te zien is, regelt startApp (app.js).
document.getElementById("knop-beheer").addEventListener("click", toonBeheer);
