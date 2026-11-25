// =====================================================================
// Edge Function "gevaar-mail" — e-mail bij een gevaarlijke melding
// =====================================================================
// Wat is dit?
//   Een klein programma dat bij Supabase draait. Na een nieuwe melding
//   met "gevaarlijk = ja" geeft de database een seintje (zie
//   database/14_gevaar_mail.sql). Deze functie stuurt dan via Brevo een
//   e-mail aan iedereen met het vinkje "krijgt mail bij gevaar".
//
// Waarom is dit veilig, ook al kan iedereen deze functie aanroepen?
//   - De functie gelooft niets van wat er in het seintje staat, behalve het
//     nummer van de melding. Alles leest hij zelf uit de database.
//   - Hij mailt alleen over een melding die echt gevaarlijk is, minder dan
//     een uur oud, en waarover nog geen mail is gestuurd. Per melding gaat
//     er dus hooguit één mail, en alleen over echte gevaarlijke meldingen.
//
// Waarom eerst 10 seconden wachten?
//   Wie zich vergist, tikt binnen 6 seconden op "Ongedaan maken". Dan is de
//   melding weg en gaat er geen mail.
//
// Wat staat er in de mail? Plek, toelichting, voornaam van de melder,
// tijd en een knop naar de app. GEEN foto: een foto in een mailbox blijft
// daar voor altijd staan (buiten de afspraak "12 maanden in de app").
//
// Instellingen (Supabase > Edge Functions > Secrets), NIET in de code:
//   BREVO_API_KEY    de API-sleutel van Brevo (geheim!)
//   AFZENDER_EMAIL   het adres waarvan de mail komt, bijv. app@parkdestadshoeve.nl
//   APP_ADRES        het adres van de app (niet verplicht)
//
// Hoe zet je dit bij Supabase? Zie BEHEER.md, "E-mail bij een gevaarlijke
// melding". Na een wijziging in dit bestand: opnieuw plakken en Deploy.
// =====================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_ADRES = Deno.env.get("SUPABASE_URL");
const GEHEIME_SLEUTEL = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BREVO_SLEUTEL = Deno.env.get("BREVO_API_KEY");
const AFZENDER = Deno.env.get("AFZENDER_EMAIL");
const APP_ADRES = Deno.env.get("APP_ADRES") || "https://app.parkdestadshoeve.nl/";

const WACHT_SECONDEN = 10;          // langer dan "Ongedaan maken" (6 seconden)
const HOOGUIT_MINUTEN_OUD = 60;     // oudere meldingen: geen mail (bijv. na terugzetten back-up)

Deno.serve(async (verzoek) => {
  try {
    const { melding_id } = await verzoek.json();
    if (!Number.isInteger(melding_id)) return klaar("geen meldingnummer");

    // Wachten, zodat "Ongedaan maken" nog kan
    await new Promise((r) => setTimeout(r, WACHT_SECONDEN * 1000));

    const db = createClient(SUPABASE_ADRES!, GEHEIME_SLEUTEL!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // De melding zelf opzoeken, met de naam van de plek en het onderdeel
    const { data: melding } = await db.from("meldingen")
      .select("id, gevaarlijk, toelichting, gemeld_op, gemeld_door, gevaar_mail_verstuurd_op, " +
              "onderdeel, plek:plekken(naam)")
      .eq("id", melding_id).maybeSingle();
    if (!melding) return klaar("melding bestaat niet (meer)");
    if (!melding.gevaarlijk) return klaar("niet gevaarlijk");
    if (melding.gevaar_mail_verstuurd_op) return klaar("al gemaild");
    const minutenOud = (Date.now() - new Date(melding.gemeld_op).getTime()) / 60000;
    if (minutenOud > HOOGUIT_MINUTEN_OUD) return klaar("te oud");

    // "Ik stuur hem": in één keer vastleggen, zodat een tweede seintje niets doet
    const { data: vast } = await db.from("meldingen")
      .update({ gevaar_mail_verstuurd_op: new Date().toISOString() })
      .eq("id", melding_id).is("gevaar_mail_verstuurd_op", null).select("id");
    if (!vast || vast.length === 0) return klaar("al gemaild");

    // Wie krijgt de mail? Iedereen met het vinkje, die nog meedoet.
    const { data: ontvangers } = await db.from("gebruikers")
      .select("id").eq("krijgt_gevaar_mail", true).eq("actief", true);
    if (!ontvangers || ontvangers.length === 0) return klaar("niemand heeft het vinkje");

    // Naam van het onderdeel (als er een is gekozen); apart opgehaald
    let onderdeelNaam = "";
    if (melding.onderdeel) {
      const { data: onderdeel } = await db.from("onderdelen")
        .select("naam").eq("id", melding.onderdeel).maybeSingle();
      onderdeelNaam = onderdeel?.naam || "";
    }

    // Naam van de melder (zoals de app hem laat zien)
    const { data: melder } = await db.from("gebruikers_weergave")
      .select("naam").eq("id", melding.gemeld_door).maybeSingle();

    const onderwerp = "⚠️ Gevaarlijke melding: " + (melding.plek?.naam || "onbekende plek");
    const inhoud = maakMail(melding, onderdeelNaam, melder?.naam || "iemand");

    let gelukt = 0;
    for (const ontvanger of ontvangers) {
      const { data: account } = await db.auth.admin.getUserById(ontvanger.id);
      const email = account?.user?.email;
      if (!email) continue;
      if (await stuurViaBrevo(email, onderwerp, inhoud)) gelukt++;
    }
    console.log("Gevaar-mail voor melding " + melding_id + ": " + gelukt + " van " + ontvangers.length + " verstuurd.");
    return klaar(gelukt + " verstuurd");
  } catch (fout) {
    console.error("Gevaar-mail mislukt:", fout);   // te zien bij Logs
    return klaar("fout");
  }
});

// Antwoord aan de database (die doet er verder niets mee)
function klaar(tekst: string) {
  return new Response(JSON.stringify({ uitkomst: tekst }), {
    headers: { "Content-Type": "application/json" },
  });
}

// De mail: een gewone tekstversie en een opgemaakte (HTML) versie
// deno-lint-ignore no-explicit-any
function maakMail(melding: any, onderdeelNaam: string, melderNaam: string) {
  const plek = melding.plek?.naam || "onbekende plek";
  const waar = onderdeelNaam ? plek + " > " + onderdeelNaam : plek;
  const wanneer = new Date(melding.gemeld_op).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam", weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
  const toelichting = melding.toelichting || "(geen toelichting)";

  const tekst = [
    "Er is een gevaarlijke melding gedaan in de Vrijwilligersapp.",
    "",
    "Waar: " + waar,
    "Wat: " + toelichting,
    "Gemeld door: " + melderNaam,
    "Wanneer: " + wanneer,
    "",
    "Bekijk de melding en de foto in de app (Meldingen): " + APP_ADRES,
  ].join("\n");

  // Alles wat een vrijwilliger heeft getypt, eerst "onschadelijk" maken
  const html = `
    <p>Er is een <strong>gevaarlijke melding</strong> gedaan in de Vrijwilligersapp.</p>
    <p><strong>Waar:</strong> ${veilig(waar)}<br>
       <strong>Wat:</strong> ${veilig(toelichting)}<br>
       <strong>Gemeld door:</strong> ${veilig(melderNaam)}<br>
       <strong>Wanneer:</strong> ${veilig(wanneer)}</p>
    <p><a href="${veilig(APP_ADRES)}" style="display:inline-block;padding:12px 20px;background:#2e5d34;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">Open de app</a></p>
    <p style="color:#555555">De foto zie je in de app, onder Meldingen.</p>`;

  return { tekst, html };
}

// Maakt tekst veilig voor HTML (zodat getypte tekens als < > & niets doen)
function veilig(tekst: string) {
  return String(tekst)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Stuurt één mail via Brevo. Geeft true als het gelukt is.
async function stuurViaBrevo(naar: string, onderwerp: string, inhoud: { tekst: string; html: string }) {
  if (!BREVO_SLEUTEL || !AFZENDER) {
    console.error("BREVO_API_KEY of AFZENDER_EMAIL ontbreekt bij Secrets.");
    return false;
  }
  const antwoord = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_SLEUTEL, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      sender: { email: AFZENDER, name: "Vrijwilligersapp Stadshoeve" },
      to: [{ email: naar }],
      subject: onderwerp,
      textContent: inhoud.tekst,
      htmlContent: inhoud.html,
    }),
  });
  if (!antwoord.ok) {
    console.error("Brevo weigert (" + antwoord.status + "):", await antwoord.text());
    return false;
  }
  return true;
}
