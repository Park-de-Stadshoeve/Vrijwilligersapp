// =====================================================================
// Edge Function "beheer" — inlogaccounts toevoegen, wijzigen en weghalen
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
//   - "stoppen":             iemand laten stoppen: open taken vrijgeven,
//                            vinkjes uit, inlogaccount en e-mailadres weg
//   - "terugzetten":         weer laten meedoen (ook "Ongedaan maken" na
//                            stoppen): nieuw inlogaccount met hetzelfde nummer,
//                            zodat naam en geschiedenis blijven kloppen
//   - "backup":              alle gegevens, inlogaccounts en tijdelijke
//                            links naar alle foto's ophalen voor de back-up
//                            (de app maakt er een zip-bestand van)
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
    if (vraag.actie === "stoppen") return antwoord(await laatStoppen(beheer, vraag, vrager.id));
    if (vraag.actie === "terugzetten") return antwoord(await zetTerug(beheer, vraag));
    if (vraag.actie === "backup") return antwoord(await maakBackup(beheer, vrager.id));
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


// ----- LATEN STOPPEN -----
// vraag: { gebruikerId }
// Eerst het database-deel (vaste actie zet_gebruiker_stop in
// database/10_stoppen.sql), dan het inlogaccount weg. Lukt dat laatste
// niet, dan zetten we het database-deel terug.
// deno-lint-ignore no-explicit-any
async function laatStoppen(beheer: any, vraag: any, vragerId: string) {
  const id = vraag.gebruikerId;
  if (id === vragerId) {
    throw new BeheerFout("Je kunt jezelf niet laten stoppen. Vraag dat aan een andere beheerder.");
  }

  // Het e-mailadres onthouden, voor "Ongedaan maken"
  const { data: account } = await beheer.auth.admin.getUserById(id);
  const email = account?.user?.email || "";

  const { data: uitslag, error } = await beheer.rpc("zet_gebruiker_stop", { gebruiker_id: id });
  if (error) throw vertaalDatabaseFout(error);

  if (account?.user) {
    const { error: weg } = await beheer.auth.admin.deleteUser(id);
    if (weg) {
      console.error(weg);
      await beheer.rpc("zet_gebruiker_terug", {
        gebruiker_id: id,
        terug_taken: uitslag.taken,
        wordt_beheerder: uitslag.was_beheerder,
        krijgt_mail_bij_gevaar: uitslag.kreeg_gevaar_mail,
      });
      throw new BeheerFout("Stoppen is niet gelukt. Er is niets veranderd. Probeer het opnieuw.", 500);
    }
  }

  return {
    gelukt: true,
    email,                                     // alleen voor "Ongedaan maken"
    taken: uitslag.taken,                      // de taken die weer open staan
    wasBeheerder: uitslag.was_beheerder,
    kreegGevaarMail: uitslag.kreeg_gevaar_mail,
  };
}


// ----- WEER LATEN MEEDOEN -----
// vraag: { gebruikerId, email, taken?, wordtBeheerder?, krijgtGevaarMail? }
// Maakt een nieuw inlogaccount met HETZELFDE nummer als vroeger. Daardoor
// horen de oude taken en meldingen meteen weer bij deze persoon.
// deno-lint-ignore no-explicit-any
async function zetTerug(beheer: any, vraag: any) {
  const id = vraag.gebruikerId;
  const email = controleerEmail(vraag.email);

  const { error: accountFout } = await beheer.auth.admin.createUser({
    id,
    email,
    email_confirm: true,
  });
  if (accountFout) throw vertaalAccountFout(accountFout);

  const { error } = await beheer.rpc("zet_gebruiker_terug", {
    gebruiker_id: id,
    terug_taken: Array.isArray(vraag.taken) ? vraag.taken : [],
    wordt_beheerder: vraag.wordtBeheerder === true,
    krijgt_mail_bij_gevaar: vraag.krijgtGevaarMail === true,
  });
  if (error) {
    await beheer.auth.admin.deleteUser(id);   // account weer weg: niets half doen
    throw vertaalDatabaseFout(error);
  }
  return { gelukt: true };
}


// ----- BACK-UP -----
// Haalt ALLE gegevens op (de geheime sleutel ziet alles, ook wat een
// beheerder in de app niet ziet) plus de inlogaccounts (nummer en
// e-mailadres) en een tijdelijke link naar elke foto. De app haalt de
// foto's op en maakt er met de gegevens een zip-bestand van; dat zet de
// beheerder op SharePoint. Zie BEHEER.md, "Back-up".
//
// Welke tabellen, en waarop ze gesorteerd worden. Komt er later een tabel
// bij, zet hem dan hier ook bij (en in de knop "Back-up terugzetten").
const BACKUP_TABELLEN: Record<string, string[]> = {
  werkgroepen: ["id"],
  plekken: ["id"],
  onderdelen: ["id"],
  gebruikers: ["id"],
  lidmaatschappen: ["gebruiker", "werkgroep"],
  taken: ["id"],
  meldingen: ["id"],
  back_ups: ["id"],
};
const BACKUP_VERSIE = 2;   // verhogen als de opbouw van de back-up verandert
                           // (1 = zonder foto's, 2 = met foto's)
const FOTO_MAP = "fotos";
const FOTO_LINK_SECONDEN = 60 * 60;   // de links zijn een uur geldig

// deno-lint-ignore no-explicit-any
async function maakBackup(beheer: any, vragerId: string) {
  const tabellen: Record<string, unknown[]> = {};
  for (const [tabel, sortering] of Object.entries(BACKUP_TABELLEN)) {
    tabellen[tabel] = await haalHeleTabel(beheer, tabel, sortering);
  }

  // De inlogaccounts, per 1000 tegelijk
  const accounts: { id: string; email: string }[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await beheer.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw vertaalAccountFout(error);
    // deno-lint-ignore no-explicit-any
    data.users.forEach((u: any) => accounts.push({ id: u.id, email: u.email }));
    if (data.users.length < 1000) break;
  }

  // Alle foto's, met een tijdelijke link per foto
  const fotoPaden = await lijstAlleFotos(beheer);
  const fotoLinks = await maakFotoLinks(beheer, fotoPaden);

  // Onthouden dat er een back-up is gemaakt (tabel back_ups, 12_backup.sql)
  const { error } = await beheer.from("back_ups").insert({ gemaakt_door: vragerId });
  if (error) throw vertaalDatabaseFout(error);

  return {
    gelukt: true,
    versie: BACKUP_VERSIE,
    gemaakt_op: new Date().toISOString(),
    tabellen,
    accounts,
    fotos: fotoPaden,         // welke foto's er zijn (komt in gegevens.json)
    foto_links: fotoLinks,    // alleen om op te halen (niet in gegevens.json)
  };
}

// Alle foto's in de fotomap. Ze staan in mapjes per gebruiker:
// <gebruiker-nummer>/<foto-nummer>.jpg. Geeft een lijst met paden.
// deno-lint-ignore no-explicit-any
async function lijstAlleFotos(beheer: any) {
  const paden: string[] = [];
  for (const ding of await lijstMap(beheer, "")) {
    if (ding.id === null) {
      // Een mapje (mapjes hebben geen id): kijk wat erin zit
      for (const bestand of await lijstMap(beheer, ding.name)) {
        if (bestand.id !== null) paden.push(ding.name + "/" + bestand.name);
      }
    } else {
      paden.push(ding.name);   // een losse foto, niet in een mapje
    }
  }
  return paden;
}

// Wat staat er in één map? Per 1000 tegelijk, tot alles binnen is.
// deno-lint-ignore no-explicit-any
async function lijstMap(beheer: any, map: string) {
  // deno-lint-ignore no-explicit-any
  const alles: any[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await beheer.storage.from(FOTO_MAP)
      .list(map, { limit: 1000, offset: van, sortBy: { column: "name", order: "asc" } });
    if (error) throw new BeheerFout("De fotomap kon niet worden gelezen. Probeer het opnieuw.", 500);
    alles.push(...data);
    if (data.length < 1000) break;
  }
  return alles;
}

// Maakt een tijdelijke link per foto, per 100 tegelijk.
// Geeft een lijst { pad, url }. Lukt een link niet, dan is url leeg.
// deno-lint-ignore no-explicit-any
async function maakFotoLinks(beheer: any, paden: string[]) {
  const links: { pad: string; url: string }[] = [];
  for (let van = 0; van < paden.length; van += 100) {
    const stukje = paden.slice(van, van + 100);
    const { data, error } = await beheer.storage.from(FOTO_MAP).createSignedUrls(stukje, FOTO_LINK_SECONDEN);
    if (error) throw new BeheerFout("De links naar de foto's konden niet worden gemaakt. Probeer het opnieuw.", 500);
    // deno-lint-ignore no-explicit-any
    data.forEach((link: any, i: number) => links.push({ pad: stukje[i], url: link.signedUrl || "" }));
  }
  return links;
}

// Haalt een hele tabel op. De database geeft hooguit 1000 rijen per keer,
// dus we vragen in stukjes van 1000 tot alles binnen is.
// deno-lint-ignore no-explicit-any
async function haalHeleTabel(beheer: any, tabel: string, sortering: string[]) {
  const alles: unknown[] = [];
  for (let van = 0; ; van += 1000) {
    let vraag = beheer.from(tabel).select("*");
    for (const kolom of sortering) vraag = vraag.order(kolom);
    const { data, error } = await vraag.range(van, van + 999);
    if (error) throw vertaalDatabaseFout(error);
    alles.push(...data);
    if (data.length < 1000) break;
  }
  return alles;
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

// Zet een fout van de database om in gewone taal. Fouten met code P0001
// hebben we zelf in gewone taal geschreven (zie de SQL-bestanden).
// deno-lint-ignore no-explicit-any
function vertaalDatabaseFout(fout: any) {
  console.error(fout);
  if (fout.code === "P0001") return new BeheerFout(fout.message);
  return new BeheerFout("Er ging iets mis bij de database. Er is niets veranderd. Probeer het opnieuw.", 500);
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
