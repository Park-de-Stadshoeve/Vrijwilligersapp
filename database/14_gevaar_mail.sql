-- =====================================================================
-- 14_gevaar_mail.sql — e-mail aan de coördinator bij een gevaarlijke melding
-- =====================================================================
-- Wat doet dit bestand?
--   1. Een kleine tabel app_instellingen met het adres van de Edge
--      Function "gevaar-mail". Dat adres verschilt per Supabase-project,
--      daarom staat het niet in de code. Je vult het één keer in (zie
--      onderaan, en BEHEER.md "E-mail bij een gevaarlijke melding").
--
--   2. Een kolom gevaar_mail_verstuurd_op bij meldingen. De Edge Function
--      vult die in als hij de mail verstuurt. Zo gaat er per melding
--      hooguit één keer een mail.
--
--   3. Een "seintje" (trigger): na elke nieuwe melding met gevaarlijk = ja
--      roept de database de Edge Function aan, met alleen het nummer van
--      de melding. Dat gebeurt op de achtergrond (pg_net): lukt het niet,
--      dan wordt de melding gewoon bewaard.
--
--   4. Een vaste actie er_is_iemand_voor_gevaar_mail: heeft minstens één
--      actieve gebruiker het vinkje "krijgt mail bij gevaar"? De app laat
--      alleen dan "De coördinator krijgt een e-mail" zien. (Wie het vinkje
--      heeft, ziet de app niet: alleen ja of nee.)
--
-- Vooraf nodig:
--   Supabase > Database > Extensions > zoek "pg_net" en zet hem aan.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 13_herstel.sql. Daarna het adres invullen
--   (stukje onderaan) en test_14_gevaar_mail.sql uitvoeren.
-- =====================================================================


-- 1. Instellingen die per project verschillen
create table app_instellingen (
  naam    text primary key,
  waarde  text not null
);
-- Rijbeveiliging aan en geen regels: via de app kan niemand erbij.
alter table app_instellingen enable row level security;
revoke all on app_instellingen from anon, authenticated;


-- 2. Onthouden dat de mail verstuurd is
alter table meldingen add column gevaar_mail_verstuurd_op timestamptz;


-- 3. Het seintje na een nieuwe gevaarlijke melding
create function stuur_gevaar_seintje() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  adres text := (select waarde from app_instellingen where naam = 'gevaar_mail_adres');
begin
  if adres is null then
    raise warning 'Geen gevaar-mail: adres ontbreekt in app_instellingen.';
    return null;
  end if;
  perform net.http_post(
    url     := adres,
    body    := jsonb_build_object('melding_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return null;
exception when others then
  -- Nooit de melding zelf laten mislukken door een probleem met de mail
  raise warning 'Geen gevaar-mail: %', sqlerrm;
  return null;
end;
$$;

create trigger gevaarlijke_melding_mail
  after insert on meldingen
  for each row when (new.gevaarlijk)
  execute function stuur_gevaar_seintje();


-- 4. Is er iemand die de mail krijgt? (alleen ja of nee)
create function er_is_iemand_voor_gevaar_mail() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gebruikers where krijgt_gevaar_mail and actief);
$$;
revoke execute on function er_is_iemand_voor_gevaar_mail() from public, anon;
grant  execute on function er_is_iemand_voor_gevaar_mail() to authenticated;


-- =====================================================================
-- DAARNA (apart uitvoeren): het adres van de Edge Function invullen.
-- Vervang <project> door het eerste stuk van je Supabase-adres
-- (zie instellingen.js: https://<project>.supabase.co).
--
--   insert into app_instellingen (naam, waarde)
--   values ('gevaar_mail_adres', 'https://<project>.supabase.co/functions/v1/gevaar-mail');
-- =====================================================================
