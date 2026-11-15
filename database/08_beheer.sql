-- =====================================================================
-- 08_beheer.sql — gebruikers wijzigen in het beheerscherm
-- =====================================================================
-- Wat doet dit bestand?
--   1. Een nieuwe vaste actie gebruiker_wijzigen. Die bewaart in één
--      keer: voornaam, letter van de achternaam, rol, de vinkjes
--      "beheerder" en "krijgt mail bij gevaar", en de werkgroepen.
--      Alles of niets: valt het bereik halverwege weg, dan is er niets
--      half opgeslagen.
--      De database controleert zelf:
--        - ben je beheerder (en actief)?
--        - bestaat de persoon nog?
--        - zijn naam, letter en rol ingevuld en geldig?
--
--   2. Een bewaker: er blijft altijd minstens één actieve beheerder.
--      Zonder beheerder kan niemand meer bij het beheerscherm, en dat
--      herstel je alleen nog met SQL. De bewaker let op elke wijziging
--      van de tabel gebruikers, ook als die niet via de app komt.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 07_ping.sql. Daarna test_08_beheer.sql.
-- =====================================================================


-- ✏️ Een gebruiker wijzigen. "nieuwe_werkgroepen" is een lijst met de
-- nummers van de werkgroepen, bijvoorbeeld {3,5}. Leeg = geen werkgroep.
create function gebruiker_wijzigen(
  gebruiker_id             uuid,
  nieuwe_voornaam          text,
  nieuwe_achternaam_letter text,
  nieuwe_rol               text,
  wordt_beheerder          boolean,
  krijgt_mail_bij_gevaar   boolean,
  nieuwe_werkgroepen       bigint[]
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_beheerder() then
    raise exception 'Alleen beheerders kunnen gebruikers wijzigen.';
  end if;
  if not exists (select 1 from gebruikers where id = gebruiker_id) then
    raise exception 'Deze persoon bestaat niet meer. Ververs het scherm.';
  end if;
  if length(trim(coalesce(nieuwe_voornaam, ''))) not between 1 and 40 then
    raise exception 'Vul een voornaam in (hooguit 40 tekens).';
  end if;
  if length(trim(coalesce(nieuwe_achternaam_letter, ''))) not between 1 and 3 then
    raise exception 'Vul de eerste letter van de achternaam in (hooguit 3 tekens).';
  end if;
  if nieuwe_rol is null or nieuwe_rol not in ('vrijwilliger', 'bestuur', 'coordinator') then
    raise exception 'Kies een rol.';
  end if;

  update gebruikers set
    voornaam           = trim(nieuwe_voornaam),
    achternaam_letter  = trim(nieuwe_achternaam_letter),
    rol                = nieuwe_rol,
    is_beheerder       = coalesce(wordt_beheerder, false),
    krijgt_gevaar_mail = coalesce(krijgt_mail_bij_gevaar, false)
  where id = gebruiker_id;

  -- Werkgroepen: de oude weghalen en de nieuwe neerzetten.
  -- "distinct" = elke werkgroep maar één keer, ook als hij dubbel in de lijst staat.
  delete from lidmaatschappen where gebruiker = gebruiker_id;
  insert into lidmaatschappen (gebruiker, werkgroep)
  select distinct gebruiker_id, unnest(coalesce(nieuwe_werkgroepen, '{}'));
end;
$$;

-- Alleen ingelogde gebruikers mogen de functie aanroepen (de functie
-- controleert daarna zelf of je beheerder bent).
revoke execute on function gebruiker_wijzigen(uuid, text, text, text, boolean, boolean, bigint[]) from public, anon;
grant  execute on function gebruiker_wijzigen(uuid, text, text, text, boolean, boolean, bigint[]) to authenticated;


-- 🛡️ Bewaker: er blijft altijd minstens één actieve beheerder.
-- Loopt NA elke wijziging of verwijdering in gebruikers. Is er daarna
-- geen actieve beheerder meer, dan wordt de wijziging teruggedraaid.
-- "security definer" is nodig: wie net zijn eigen vinkje uitzet, mag
-- zelf de andere gebruikers niet meer zien, maar de bewaker moet ze
-- wel allemaal kunnen tellen.
create function bewaak_beheerders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from gebruikers where is_beheerder and actief) then
    raise exception 'Er moet altijd minstens één beheerder zijn. Maak eerst iemand anders beheerder.';
  end if;
  return null;   -- bij een trigger "na" de wijziging maakt dit niet uit
end;
$$;

create trigger altijd_een_beheerder
  after update of is_beheerder, actief or delete on gebruikers
  for each row execute function bewaak_beheerders();
