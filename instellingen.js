// Instellingen voor de koppeling met de database (Supabase).
//
// Er zijn TWEE databases (projecten in Supabase):
//   PROD = de echte app, met echte vrijwilligers en echte gegevens.
//   DEV  = het testproject "vrijwilligersapp-test", alleen verzonnen gegevens.
//          Hier probeer je nieuwe dingen eerst uit.
//
// Welke wordt gebruikt? Dat hangt af van het adres waarop de app draait:
//   https://app.parkdestadshoeve.nl          -> PROD
//   elk ander adres (de testversie, je eigen computer, een kopie) -> DEV
// Zo kan een testversie nooit per ongeluk echte gegevens wijzigen.
//
// Waar vind je adres en sleutel?
//   Supabase > het project > knop "Connect" bovenaan (of Project Settings > API).
//   - ADRES:   de "Project URL", bijv. https://abcdefgh.supabase.co
//   - SLEUTEL: de "publishable" sleutel (begint met sb_publishable_)
//              of, bij oudere projecten, de "anon public" sleutel.
//
// Is dit veilig in openbare code? Ja: deze sleutel is bedoeld voor de browser.
// De database beschermt zichzelf met de rechten uit database/03_rechten.sql.
//
// Zet hier NOOIT de "secret" of "service_role" sleutel. Die mag alles en
// hoort alleen in het dashboard van Supabase.
//
// Let op: laat de vier regels met "const PROD_" en "const DEV_" precies zo
// staan (één regel per waarde, tussen dubbele aanhalingstekens). De automatische
// taak "Supabase wakker houden" leest ze op die manier uit.

// PROD: de echte app.
const PROD_ADRES = "https://vgmlllmceamhopucxbot.supabase.co/rest/v1/";
const PROD_SLEUTEL = "sb_publishable_DBYuDGaqi-kQ7SR6OD1gvg_oPXi89V0";

// DEV: het testproject "vrijwilligersapp-test".
const DEV_ADRES = "https://easnkzwkclwqxakrwlbj.supabase.co";
const DEV_SLEUTEL = "sb_publishable_1N4--jn_whFQGFXwrUyqAw_h69B2TV9";

// Het adres van de echte app (zonder https://).
const ECHT_APP_ADRES = "app.parkdestadshoeve.nl";

// Draaien we als echte app of als testversie?
const IS_TESTVERSIE = location.hostname !== ECHT_APP_ADRES;

// Deze twee gebruikt de rest van de app (inloggen.js).
const SUPABASE_ADRES = IS_TESTVERSIE ? DEV_ADRES : PROD_ADRES;
const SUPABASE_SLEUTEL = IS_TESTVERSIE ? DEV_SLEUTEL : PROD_SLEUTEL;

// In de testversie: andere kleur bovenaan en een gele strook "TESTVERSIE"
// (zie "testversie" in stijl.css). Zo haal je de twee nooit door elkaar.
if (IS_TESTVERSIE) document.body.classList.add("testversie");
