// =====================================================================
// Edge Function "beheer" — inlogaccounts toevoegen en wijzigen
// =====================================================================
// Wat is dit?
//   Een klein programma dat bij Supabase draait, niet op de telefoon.
//   Het doet dingen waarvoor de geheime beheerderssleutel van Supabase
//   nodig is. Die sleutel mag nooit in de app of in GitHub staan. Supabase
//   geeft hem zelf aan deze functie (SUPABASE_SERVICE_ROLE_KEY); je hoeft
//   hem nergens in te plakken.
//
// Wat kan het? (de app stuurt "actie" mee)
//   - "toevoegen":           nieuw inlogaccount + gebruiker + werkgroepen
//   - "toevoegen_ongedaan":  net toegevoegde persoon weer weghalen
//                            (alleen binnen 10 minuten, en alleen zonder taken
//                            of meldingen)
//   - "email_wijzigen":      ander e-mailadres voor iemand
//
// Wie mag het?
//   Alleen een ingelogde, actieve beheerder (vinkje is_beheerder). Dat
//   controleert deze functie ZELF, bij elke aanroep, voordat er iets gebeurt.
//
// Hoe zet je dit bij Supabase? Zie BEHEER.md, "Edge Function beheer".
//   Kort: Edge Functions > Deploy a new function > Via Editor, naam "beheer",
//   alles uit dit bestand erin plakken, Deploy.
//
// Na een wijziging in dit bestand: opnieuw plakken en op Deploy klikken.
// =====================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

// Deze waarden geeft Supabase zelf aan de functie
const SUPABASE_ADRES = Deno.env.get("SUPABASE_URL");
const GEHEIME_SLEUTEL = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Hoe lang na het toevoegen "Ongedaan maken" nog mag (in minuten)
const ONGEDAAN_BINNEN_MINUTEN = 10;

// De app draait op een andere website (GitHub Pages) dan deze functie.
// Deze regels laten de browser weten dat dat mag. Veilig, want zonder
// inlog van een beheerder doet de functie niets.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Een fout die we zelf in gewone taal uitleggen. De app laat de tekst zien.
class BeheerFout extends Error {
  status: number;
  constructor(tekst: string, status = 400) {
    super(tekst);
    this.status = status;
  }
}

// Stuurt een antwoord terug naar de app
function antwoord(gegevens: unknown, status = 200) {
  return new Response(JSON.stringify(gegevens), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ----- Hier begint het: elke aanroep van de app komt hier binnen -----
Deno.serve(async (verzoek) => {
  // De browser vraagt eerst "mag dit?" (OPTIONS). Antwoord: ja.
  if (verzoek.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Met de geheime sleutel: mag alles. Daarom eerst controleren wie het vraagt.
    const beheer = createClient(SUPABASE_ADRES!, GEHEIME_SLEUTEL!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Wie vraagt dit? De app stuurt de inlog van de gebruiker mee.
    const inlog = (verzoek.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: inlogGegevens } = await beheer.auth.getUser(inlog);
    const vrager = inlogGegevens?.user;
    if (!vrager) throw new BeheerFout("Je bent niet (meer) ingelogd. Log opnieuw in.", 401);

    // 2. Is dat een actieve beheerder?
    const { data: ik } = await beheer
      .from("gebruikers").select("is_beheerder, actief").eq("id", vrager.id).maybeSingle();
    if (!ik || !ik.actief || !ik.is_beheerder) {
      throw new BeheerFout("Alleen beheerders mogen dit doen.", 403);
    }

    // 3. Wat moet er gebeuren?
    const vraag = await verzoek.json();
    if (vraag.actie === "toevoegen") return antwoord(await voegToe(beheer, vraag));
    if (vraag.actie === "toevoegen_ongedaan") return antwoord(await maakToevoegenOngedaan(beheer, vraag));
    if (vraag.actie === "email_wijzigen") return antwoord(await wijzigEmail(beheer, vraag));
    throw new BeheerFout("Onbekende actie.");
  } catch (fout) {
    if (fout instanceof BeheerFout) return antwoord({ fout: fout.message }, fout.status);
    console.error(fout);   // te zien in Supabase > Edge Functions > beheer > Logs
    return antwoord({ fout: "Er ging iets mis bij de database. Probeer het later opnieuw." }, 500);
  }
});


// ----- TOEVOEGEN -----
// vraag: { email, voornaam, letter, rol, isBeheerder, krijgtGevaarMail, werkgroepen: [nummers] }
// deno-lint-ignore no-explicit-any
async function voegToe(beheer: any, vraag: any) {
  const email = controleerEmail(vraag.email);
  const voornaam = String(vraag.voornaam || "").trim();
  const letter = String(vraag.letter || "").trim();
  if (voornaam.length < 1 || voornaam.length > 40) throw new BeheerFout("Vul een voornaam in (hooguit 40 tekens).");
  if (letter.length < 1 || letter.length > 3) throw new BeheerFout("Vul de eerste letter van de achternaam in.");
  if (!["vrijwilliger", "bestuur", "coordinator"].includes(vraag.rol)) throw new BeheerFout("Kies een rol.");
  const werkgroepen: number[] = Array.isArray(vraag.werkgroepen) ? [...new Set(vraag.werkgroepen as number[])] : [];

  // a. Het inlogaccount. "email_confirm" = het adres hoeft niet eerst bevestigd te worden.
  //    Er gaat GEEN mail naar de persoon; de beheerder laat het zelf weten.
  const { data: nieuw, error: accountFout } = await beheer.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (accountFout) throw vertaalAccountFout(accountFout);
  const id = nieuw.user.id;

  // b. De gebruiker en zijn werkgroepen. Lukt dat niet, dan ruimen we het
  //    account weer op, zodat er geen half toegevoegde persoon blijft staan.
  const { error: gebruikerFout } = await beheer.from("gebruikers").insert({
    id,
    voornaam,
    achternaam_letter: letter,
    rol: vraag.rol,
    is_beheerder: vraag.isBeheerder === true,
    krijgt_gevaar_mail: vraag.krijgtGevaarMail === true,
  });
  let ledenFout = null;
  if (!gebruikerFout && werkgroepen.length > 0) {
    const { error } = await beheer
      .from("lidmaatschappen")
      .insert(werkgroepen.map((werkgroep) => ({ gebruiker: id, werkgroep })));
    ledenFout = error;
  }

  if (gebruikerFout || ledenFout) {
    console.error(gebruikerFout || ledenFout);
    await beheer.from("gebruikers").delete().eq("id", id);   // werkgroepen gaan vanzelf mee
    await beheer.auth.admin.deleteUser(id);
    throw new BeheerFout("Toevoegen is niet gelukt. Er is niets veranderd. Probeer het opnieuw.", 500);
  }

  return { gelukt: true, id };
}


// ----- TOEVOEGEN ONGEDAAN MAKEN -----
// vraag: { gebruikerId }
// Alleen voor iemand die net is toegevoegd: zo kan deze actie nooit
// per ongeluk een bestaande vrijwilliger weghalen.
// deno-lint-ignore no-explicit-any
async function maakToevoegenOngedaan(beheer: any, vraag: any) {
  const { data: account } = await beheer.auth.admin.getUserById(vraag.gebruikerId);
  if (!account?.user) throw new BeheerFout("Deze persoon bestaat niet meer.");
  const minutenOud = (Date.now() - new Date(account.user.created_at).getTime()) / 60000;
  if (minutenOud > ONGEDAAN_BINNEN_MINUTEN) {
    throw new BeheerFout("Ongedaan maken kan alleen vlak na het toevoegen.");
  }

  // Heeft de persoon al iets gedaan (taken of meldingen)? Dan weigert de
  // database het weghalen, en blijft alles staan.
  const { error } = await beheer.from("gebruikers").delete().eq("id", vraag.gebruikerId);
  if (error) {
    console.error(error);
    throw new BeheerFout("Deze persoon kan niet meer weggehaald worden. Er is niets veranderd.");
  }
  await beheer.auth.admin.deleteUser(vraag.gebruikerId);
  return { gelukt: true };
}


// ----- E-MAILADRES WIJZIGEN -----
// vraag: { gebruikerId, email }
// deno-lint-ignore no-explicit-any
async function wijzigEmail(beheer: any, vraag: any) {
  const email = controleerEmail(vraag.email);
  const { error } = await beheer.auth.admin.updateUserById(vraag.gebruikerId, {
    email,
    email_confirm: true,   // geen bevestigingsmail nodig
  });
  if (error) throw vertaalAccountFout(error);
  return { gelukt: true };
}


// ----- HULPJES -----

// Maakt het adres netjes (kleine letters, geen spaties) en kijkt of het
// op een e-mailadres lijkt. Geeft het nette adres terug.
function controleerEmail(invoer: unknown) {
  const email = String(invoer || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BeheerFout("Dit is geen geldig e-mailadres. Controleer het adres.");
  }
  return email;
}

// Zet een fout van het inlogdeel om in gewone taal
// deno-lint-ignore no-explicit-any
function vertaalAccountFout(fout: any) {
  console.error(fout);
  const tekst = String(fout.message || "").toLowerCase();
  if (fout.code === "email_exists" || tekst.includes("already")) {
    return new BeheerFout("Dit e-mailadres is al in gebruik bij iemand anders.");
  }
  if (tekst.includes("not found")) return new BeheerFout("Deze persoon heeft geen inlogaccount meer.");
  return new BeheerFout("Het inlogaccount kon niet worden aangepast. Probeer het opnieuw.", 500);
}
