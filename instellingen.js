// Instellingen voor de koppeling met de database (Supabase).
//
// Waar vind je deze twee waarden?
//   Supabase > je project > knop "Connect" bovenaan (of Project Settings > API).
//   - SUPABASE_ADRES:   de "Project URL", bijv. https://abcdefgh.supabase.co
//   - SUPABASE_SLEUTEL: de "publishable" sleutel (begint met sb_publishable_)
//                       of, bij oudere projecten, de "anon public" sleutel.
//
// Is dit veilig in openbare code? Ja: deze sleutel is bedoeld voor de browser.
// De database beschermt zichzelf met de rechten uit database/03_rechten.sql.
//
// Zet hier NOOIT de "secret" of "service_role" sleutel. Die mag alles en
// hoort alleen in het dashboard van Supabase.

const SUPABASE_ADRES = "VUL-HIER-DE-PROJECT-URL-IN";
const SUPABASE_SLEUTEL = "VUL-HIER-DE-PUBLISHABLE-SLEUTEL-IN";
