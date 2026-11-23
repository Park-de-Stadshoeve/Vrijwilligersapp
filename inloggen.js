// Inloggen met een code uit de mail, en uitzoeken wie er is ingelogd.
// Dit bestand wordt geladen door index.html, vóór app.js.
//
// Zo werkt inloggen:
// 1. Je vult je e-mailadres in. Supabase stuurt een mail met een code van 6 cijfers.
// 2. Je typt de code over in de app. Klopt hij, dan ben je ingelogd.
// 3. De telefoon onthoudt dat je bent ingelogd. Je hoeft dit maar één keer
//    per toestel te doen (tot je uitlogt).
// Alleen e-mailadressen die de beheerder heeft toegevoegd kunnen inloggen.

// De verbinding met de database. "supabase" komt uit het hulpbestand dat
// index.html van internet laadt; adres en sleutel staan in instellingen.js.
// Is er iets niet in orde (niet ingevuld, hulpbestand niet geladen), dan blijft
// "database" leeg en laat startMetInloggen een duidelijke melding zien.
const IS_INGESTELD = !SUPABASE_ADRES.startsWith("VUL-HIER");
const database = (IS_INGESTELD && typeof supabase !== "undefined")
  ? supabase.createClient(SUPABASE_ADRES, SUPABASE_SLEUTEL)
  : null;

// Namen waaronder we iets op de telefoon bewaren
const OPSLAG_PROFIEL = "stadshoeve-profiel";      // naam, rol, werkgroepen (voor slecht bereik)
const OPSLAG_WACHT_OP_CODE = "stadshoeve-code";   // naar welk adres de code is gestuurd
const OPSLAG_TAKEN = "stadshoeve-taken";          // laatst opgehaalde taken (voor slecht bereik)

// ===== START =====
// Wordt aangeroepen onderaan app.js, als alles geladen is.
async function startMetInloggen() {
  if (!IS_INGESTELD) {
    toonInlogFout("De app is nog niet gekoppeld",
      "In instellingen.js ontbreken het adres en de sleutel van de database.");
    return;
  }
  if (!database) {
    toonInlogFout("De app kon niet starten",
      "Een onderdeel kon niet worden geladen. Controleer of je internet hebt en probeer het opnieuw.");
    return;
  }

  const { data } = await database.auth.getSession();
  if (data.session) {
    await haalProfielEnStart(data.session.user.id);
    return;
  }

  // Was er net een code gestuurd? (Een iPhone laadt de app soms opnieuw
  // als je even naar je mail gaat; dan willen we meteen het codescherm.)
  const wacht = leesOpslag(OPSLAG_WACHT_OP_CODE);
  if (wacht && Date.now() - wacht.tijd < 60 * 60 * 1000) {
    toonCodeScherm(wacht.email);
  } else {
    toonEmailScherm();
  }
}

// ===== SCHERM 1: e-mailadres =====
function toonEmailScherm(fouttekst) {
  const inhoud = maakInlogScherm("Inloggen");

  const uitleg = document.createElement("p");
  uitleg.textContent = "Vul je e-mailadres in. Je krijgt een mail met een code van 6 cijfers.";

  const label = document.createElement("label");
  label.className = "veld-titel";
  label.textContent = "Je e-mailadres";
  const invoer = document.createElement("input");
  invoer.type = "email";
  invoer.autocomplete = "email";
  invoer.required = true;
  label.append(invoer);

  const fout = maakFoutRegel(fouttekst);
  const knop = maakHoofdKnop("Stuur mij een code", () => {});
  knop.type = "submit";

  const formulier = document.createElement("form");
  formulier.className = "veld";
  formulier.append(uitleg, label, fout, knop);
  formulier.addEventListener("submit", async gebeurtenis => {
    gebeurtenis.preventDefault();           // pagina niet opnieuw laden
    const email = invoer.value.trim().toLowerCase();
    if (!email.includes("@")) {
      fout.textContent = "Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.";
      return;
    }
    knop.disabled = true;
    knop.textContent = "Code versturen…";
    fout.textContent = "";

    // shouldCreateUser: false = alleen bestaande gebruikers, nooit een nieuw account.
    // emailRedirectTo: vangnet. De mail bevat alleen een code (mailtekst "Magic
    // Link" in Supabase, zie BEHEER.md). Staat er toch ooit een link in, dan komt
    // die terug op deze app.
    const { error } = await database.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: location.origin + location.pathname
      }
    });

    if (error) {
      fout.textContent = vertaalFout(error);
      knop.disabled = false;
      knop.textContent = "Stuur mij een code";
      return;
    }
    schrijfOpslag(OPSLAG_WACHT_OP_CODE, { email, tijd: Date.now() });
    toonCodeScherm(email);
  });

  inhoud.append(formulier);
  invoer.focus();
}

// ===== SCHERM 2: code uit de mail =====
function toonCodeScherm(email) {
  const inhoud = maakInlogScherm("Code invullen");

  const uitleg = document.createElement("p");
  uitleg.textContent = "We hebben een mail gestuurd naar " + email +
    ". Vul de code van 6 cijfers uit die mail in. Geen mail? Kijk ook in je map met ongewenste mail.";

  const label = document.createElement("label");
  label.className = "veld-titel";
  label.textContent = "Code uit de mail";
  const invoer = document.createElement("input");
  invoer.type = "text";
  invoer.className = "invoer-code";
  invoer.inputMode = "numeric";             // cijfertoetsenbord op de telefoon
  invoer.autocomplete = "one-time-code";    // telefoon kan de code zelf voorstellen
  invoer.maxLength = 6;
  invoer.required = true;
  label.append(invoer);

  const fout = maakFoutRegel();
  const knop = maakHoofdKnop("Inloggen", () => {});
  knop.type = "submit";

  const formulier = document.createElement("form");
  formulier.className = "veld";
  formulier.append(uitleg, label, fout, knop);
  formulier.addEventListener("submit", async gebeurtenis => {
    gebeurtenis.preventDefault();
    const code = invoer.value.replace(/\D/g, "");   // alleen de cijfers
    if (code.length !== 6) {
      fout.textContent = "De code heeft 6 cijfers. Controleer wat je hebt ingevuld.";
      return;
    }
    knop.disabled = true;
    knop.textContent = "Bezig met inloggen…";
    fout.textContent = "";

    const { data, error } = await database.auth.verifyOtp({ email, token: code, type: "email" });

    if (error) {
      fout.textContent = vertaalFout(error);
      knop.disabled = false;
      knop.textContent = "Inloggen";
      return;
    }
    verwijderOpslag(OPSLAG_WACHT_OP_CODE);
    await haalProfielEnStart(data.user.id);
  });

  const terug = maakTweedeKnop("Ander e-mailadres of nieuwe code", () => {
    verwijderOpslag(OPSLAG_WACHT_OP_CODE);
    toonEmailScherm();
  });

  inhoud.append(formulier, terug);
  invoer.focus();
}

// ===== WIE BEN IK? =====
// Haalt naam, rol en werkgroepen op uit de database en start de app.
async function haalProfielEnStart(gebruikerId) {
  maakInlogScherm("Even geduld…");
  let profiel;
  try {
    profiel = await haalProfiel(gebruikerId);
    if (profiel) schrijfOpslag(OPSLAG_PROFIEL, profiel);
  } catch (fout) {
    // Geen verbinding? Gebruik wat we de vorige keer hebben bewaard.
    const bewaard = leesOpslag(OPSLAG_PROFIEL);
    if (bewaard && bewaard.id === gebruikerId) {
      profiel = bewaard;
    } else {
      toonInlogFout("Geen verbinding",
        "De app kan niet bij de database. Controleer of je internet hebt en probeer het opnieuw.");
      return;
    }
  }

  if (!profiel) {
    toonInlogFout("Je account is nog niet klaar",
      "Je bent ingelogd, maar de beheerder heeft je nog niet (of niet meer) als vrijwilliger " +
      "toegevoegd. Neem contact op met de beheerder.");
    return;
  }

  verwijderOpslag(OPSLAG_WACHT_OP_CODE);   // ingelogd, dus er wacht geen code meer
  document.getElementById("knop-uitloggen").hidden = false;
  document.querySelector("nav").hidden = false;
  startApp(profiel);   // staat in app.js
}

// Vraagt de gegevens van de ingelogde persoon op.
// Geeft null terug als de persoon niet (meer) als actieve gebruiker bekend is.
async function haalProfiel(gebruikerId) {
  const { data: gebruiker, error } = await database
    .from("gebruikers")
    .select("id, voornaam, rol, is_beheerder, actief")
    .eq("id", gebruikerId)
    .maybeSingle();
  if (error) throw error;
  if (!gebruiker || !gebruiker.actief) return null;

  // De werkgroepen, met hun naam (via de koppeltabel lidmaatschappen)
  const { data: leden, error: fout } = await database
    .from("lidmaatschappen")
    .select("werkgroepen(naam)")
    .eq("gebruiker", gebruikerId);
  if (fout) throw fout;

  return {
    id: gebruiker.id,
    naam: gebruiker.voornaam,
    rol: gebruiker.rol,
    isBeheerder: gebruiker.is_beheerder,
    werkgroepen: leden.map(lid => lid.werkgroepen.naam)
  };
}

// ===== UITLOGGEN =====
async function uitloggen() {
  if (database) await database.auth.signOut();
  verwijderOpslag(OPSLAG_PROFIEL);
  verwijderOpslag(OPSLAG_TAKEN);   // taken horen bij deze persoon, dus ook weg
  location.reload();   // app opnieuw starten, dan verschijnt het inlogscherm
}
document.getElementById("knop-uitloggen").addEventListener("click", uitloggen);

// ===== HULPJES =====

// Maakt het scherm leeg voor het inloggen (zonder menu onderaan)
function maakInlogScherm(titel) {
  document.getElementById("titel").textContent = titel;
  document.querySelector("nav").hidden = true;
  const inhoud = document.getElementById("inhoud");
  inhoud.replaceChildren();
  return inhoud;
}

// Scherm met een foutmelding en een knop om opnieuw te beginnen
function toonInlogFout(titel, tekst) {
  const inhoud = maakInlogScherm(titel);
  const p = document.createElement("p");
  p.textContent = tekst;
  inhoud.append(p,
    maakHoofdKnop("Opnieuw proberen", () => location.reload()),
    maakTweedeKnop("Uitloggen", uitloggen));
}

function maakFoutRegel(tekst) {
  const fout = document.createElement("p");
  fout.className = "fout";
  fout.setAttribute("role", "alert");   // schermlezers lezen de fout meteen voor
  fout.textContent = tekst || "";
  return fout;
}

// Zet een foutmelding van Supabase om in gewone taal: wat is er mis, wat moet je doen.
function vertaalFout(error) {
  const code = error.code || "";
  const bericht = (error.message || "").toLowerCase();
  if (code === "otp_disabled" || bericht.includes("signups not allowed")) {
    return "Dit e-mailadres kennen we niet. Controleer of je het goed hebt getypt, " +
           "of vraag de beheerder om je toe te voegen.";
  }
  if (code === "otp_expired" || bericht.includes("expired") || bericht.includes("invalid")) {
    return "Deze code klopt niet of is verlopen. Controleer de code, of vraag een nieuwe aan.";
  }
  if (error.status === 429 || code.includes("rate_limit")) {
    return "Er zijn te veel codes aangevraagd. Wacht een paar minuten en probeer het opnieuw.";
  }
  if (bericht.includes("fetch") || bericht.includes("network")) {
    return "Geen verbinding met internet. Probeer het opnieuw als je bereik hebt.";
  }
  return "Er ging iets mis (" + error.message + "). Probeer het opnieuw.";
}

// Lezen en schrijven op de telefoon. Kan mislukken (bijv. privévenster);
// dan werkt de app gewoon verder, alleen zonder te onthouden.
function leesOpslag(naam) {
  try { return JSON.parse(localStorage.getItem(naam)); } catch { return null; }
}
function schrijfOpslag(naam, waarde) {
  try { localStorage.setItem(naam, JSON.stringify(waarde)); } catch { /* niets */ }
}
function verwijderOpslag(naam) {
  try { localStorage.removeItem(naam); } catch { /* niets */ }
}
