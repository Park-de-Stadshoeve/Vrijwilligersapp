-- =====================================================================
-- 03_rechten.sql — wie mag wat zien en doen
-- =====================================================================
-- Wat doet dit bestand?
--   Het legt de tabel "Wie mag wat" uit DATABASE.md vast in de database.
--   Dat gebeurt op drie manieren:
--
--   1. Hulpvragen (functies) zoals "is dit een bestuurslid?". Die worden
--      in de regels hieronder steeds opnieuw gebruikt.
--   2. Regels per tabel ("policies"): wie welke regels van een tabel mag
--      zien, toevoegen, wijzigen of verwijderen. Is er voor iets geen
--      regel, dan mag het niet.
--   3. Vaste acties (functies) waarmee vrijwilligers een taak veranderen:
--      oppakken, teruggeven, gereed melden, heropenen, foto zetten.
--      Vrijwilligers mogen taken NIET rechtstreeks wijzigen; zo kunnen
--      ze bijvoorbeeld nooit de titel of de deadline veranderen.
--
-- Eén keer uitvoeren, na 01_tabellen.sql en 02_startgegevens.sql.
-- Controleren met test_03_rechten.sql.
--
-- Woordenlijst:
--   auth.uid()        = het nummer van wie er nu is ingelogd
--   policy            = regel voor één tabel
--   using (...)       = welke bestaande regels je mag zien/wijzigen/verwijderen
--   with check (...)  = waar een nieuwe of gewijzigde regel aan moet voldoen
--   security definer  = de functie mag alles, en controleert ZELF wat mag
--   authenticated     = iedereen die is ingelogd
--   anon              = iemand die niet is ingelogd
-- =====================================================================


-- =====================================================================
-- 1. Hulpvragen
-- =====================================================================
-- Deze functies kijken in de tabel gebruikers wie er is ingelogd.
-- "stable" = geeft binnen één vraag steeds hetzelfde antwoord (sneller).
-- "set search_path = public" = zoek tabellen alleen in onze eigen
-- verzameling (beveiliging tegen misbruik).

-- Is de ingelogde persoon een actieve gebruiker?
create function is_actief() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gebruikers where id = auth.uid() and actief
  );
$$;

-- Is de ingelogde persoon bestuurslid of coördinator (en actief)?
create function is_bestuur() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gebruikers
    where id = auth.uid() and actief and rol in ('bestuur', 'coordinator')
  );
$$;

-- Heeft de ingelogde persoon het vinkje beheerder (en is actief)?
create function is_beheerder() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gebruikers
    where id = auth.uid() and actief and is_beheerder
  );
$$;

-- In welke werkgroepen zit de ingelogde persoon?
create function mijn_werkgroepen() returns setof bigint
language sql stable security definer set search_path = public as $$
  select werkgroep from lidmaatschappen where gebruiker = auth.uid();
$$;

-- Mag de ingelogde persoon deze taak gereed melden, heropenen of de foto
-- aanpassen? Ja als: bestuur/coördinator, OF de taak is aan jou
-- toegewezen, OF de taak hoort bij een van jouw werkgroepen.
create function mag_taak_bewerken(t taken) returns boolean
language sql stable security definer set search_path = public as $$
  select is_actief() and (
       is_bestuur()
    or t.toegewezen_aan = auth.uid()
    or t.werkgroep in (select mijn_werkgroepen())
  );
$$;


-- =====================================================================
-- 2. Regels per tabel
-- =====================================================================

-- ---------- werkgroepen, plekken, onderdelen ----------
-- Zien: iedereen die is ingelogd en actief is.
-- Toevoegen, wijzigen, verwijderen: alleen beheerders.
create policy "zien: actieve gebruikers" on werkgroepen
  for select to authenticated using (is_actief());
create policy "beheren: beheerders" on werkgroepen
  for all to authenticated using (is_beheerder()) with check (is_beheerder());

create policy "zien: actieve gebruikers" on plekken
  for select to authenticated using (is_actief());
create policy "beheren: beheerders" on plekken
  for all to authenticated using (is_beheerder()) with check (is_beheerder());

create policy "zien: actieve gebruikers" on onderdelen
  for select to authenticated using (is_actief());
create policy "beheren: beheerders" on onderdelen
  for all to authenticated using (is_beheerder()) with check (is_beheerder());


-- ---------- gebruikers ----------
-- Zien: je eigen gegevens (zodat de app weet wat jouw rol is).
-- Beheerders zien en beheren iedereen.
-- De NAMEN van alle gebruikers zie je via gebruikers_weergave (hieronder).
create policy "zien: jezelf" on gebruikers
  for select to authenticated using (id = auth.uid());
create policy "beheren: beheerders" on gebruikers
  for all to authenticated using (is_beheerder()) with check (is_beheerder());


-- ---------- lidmaatschappen ----------
-- Zien: je eigen werkgroepen. Bestuur en beheerders zien alles
-- (nodig om taken toe te wijzen). Beheren: alleen beheerders.
create policy "zien: eigen, bestuur, beheerders" on lidmaatschappen
  for select to authenticated
  using (gebruiker = auth.uid() or is_bestuur() or is_beheerder());
create policy "beheren: beheerders" on lidmaatschappen
  for all to authenticated using (is_beheerder()) with check (is_beheerder());


-- ---------- taken ----------
-- Zien: bestuur alles; vrijwilligers de taken van hun werkgroepen en de
-- taken die aan hen zijn toegewezen.
create policy "zien: eigen werkgroepen, toegewezen, bestuur" on taken
  for select to authenticated
  using (
    is_actief() and (
         is_bestuur()
      or toegewezen_aan = auth.uid()
      or werkgroep in (select mijn_werkgroepen())
    )
  );
-- Aanmaken, wijzigen, verwijderen: alleen bestuur en coördinator.
-- (Verwijderen is nodig voor "Ongedaan maken" na het aanmaken.)
-- Vrijwilligers gebruiken de vaste acties in deel 3.
create policy "aanmaken: bestuur" on taken
  for insert to authenticated with check (is_bestuur());
create policy "wijzigen: bestuur" on taken
  for update to authenticated using (is_bestuur()) with check (is_bestuur());
create policy "verwijderen: bestuur" on taken
  for delete to authenticated using (is_bestuur());


-- ---------- meldingen ----------
-- Zien: je eigen meldingen; meldingen waar een taak van is gemaakt die
-- jij mag zien; bestuur alles.
-- ("taak in (select id from taken)" gebruikt de regel van taken
-- hierboven, dus je krijgt alleen taken terug die je mag zien.)
create policy "zien: eigen, via taak, bestuur" on meldingen
  for select to authenticated
  using (
    is_actief() and (
         gemeld_door = auth.uid()
      or is_bestuur()
      or taak in (select id from taken)
    )
  );
-- Melden: iedereen die actief is, alleen op eigen naam, en een nieuwe
-- melding is altijd "Nieuw" (nog geen taak, nog geen besluit).
create policy "melden: actieve gebruikers" on meldingen
  for insert to authenticated
  with check (
    is_actief()
    and gemeld_door = auth.uid()
    and taak is null
    and geen_actie_reden is null
    and geen_actie_door is null
  );
-- Afhandelen (taak koppelen, geen actie nodig): alleen bestuur.
create policy "afhandelen: bestuur" on meldingen
  for update to authenticated using (is_bestuur()) with check (is_bestuur());
-- Intrekken: de melder zelf, zolang de melding nog "Nieuw" is.
-- Bestuur mag altijd verwijderen.
create policy "intrekken: melder zolang nieuw, of bestuur" on meldingen
  for delete to authenticated
  using (
    is_bestuur()
    or (gemeld_door = auth.uid() and taak is null and geen_actie_reden is null)
  );


-- ---------- naam die de app laat zien ----------
-- Iedereen die is ingelogd mag de namen ("Piet P.") van alle gebruikers
-- zien, maar niet hun rol of vinkjes. Daarom draait dit overzicht met de
-- rechten van de maker (security_invoker = false) en laat het alleen
-- id, naam en actief zien, en alleen aan actieve gebruikers.
-- Supabase kan hierover waarschuwen ("security definer view"); dat is
-- hier bewust zo.
create or replace view gebruikers_weergave
with (security_invoker = false) as
select
  g.id,
  g.voornaam
    || case
         when exists (
           select 1 from gebruikers ander
           where ander.actief
             and ander.id <> g.id
             and lower(trim(ander.voornaam)) = lower(trim(g.voornaam))
         )
         then ' ' || trim(g.achternaam_letter) || '.'
         else ''
       end as naam,
  g.actief
from gebruikers g
where is_actief();


-- ---------- status van een melding ----------
-- De melder moet de status zien ("Toegewezen", "Gereed"), ook als hij of
-- zij de taak zelf niet mag zien (bijv. een taak van een andere werkgroep).
-- Deze functie kijkt daarom met volledige rechten naar de taak, maar geeft
-- alleen het woord van de status terug, niets anders.
create function melding_status(m meldingen) returns text
language sql stable security definer set search_path = public as $$
  select case
    when m.geen_actie_reden is not null then 'Geen actie nodig'
    when m.taak is null                 then 'Nieuw'
    else (
      select case
        when t.status = 'gereed'          then 'Gereed'
        when t.toegewezen_aan is not null then 'Toegewezen'
        else                                   'Taak gemaakt'
      end
      from taken t where t.id = m.taak
    )
  end;
$$;

-- Het overzicht meldingen_met_status gebruikt nu deze functie.
-- Welke meldingen je ziet, blijft bepaald door de regels van meldingen.
create or replace view meldingen_met_status
with (security_invoker = true) as
select m.*, melding_status(m) as status
from meldingen m;


-- =====================================================================
-- 3. Vaste acties voor taken
-- =====================================================================
-- Elke actie controleert eerst of het mag. Zo niet, dan stopt hij met
-- een foutmelding in gewone taal; die laat de app zien.
-- "Ongedaan maken" in de app gebruikt de tegenovergestelde actie.

-- 🙋 "Ik doe dit": een vrije, open taak uit je eigen werkgroep oppakken.
create function taak_oppakken(taak_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id;
  if not found or not is_actief()
     or not (is_bestuur() or t.werkgroep in (select mijn_werkgroepen())) then
    raise exception 'Je kunt deze taak niet oppakken: hij hoort niet bij jouw werkgroep.';
  end if;
  if t.status <> 'open' then
    raise exception 'Deze taak is al gereed.';
  end if;
  if t.toegewezen_aan is not null and t.toegewezen_aan <> auth.uid() then
    raise exception 'Iemand anders heeft deze taak al opgepakt. Ververs het scherm.';
  end if;
  update taken set toegewezen_aan = auth.uid() where id = taak_id;
end;
$$;

-- ↩ "Teruggeven": je eigen open taak weer vrijgeven.
create function taak_teruggeven(taak_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id;
  if not found or not is_actief() or t.toegewezen_aan is distinct from auth.uid() then
    raise exception 'Je kunt alleen een taak teruggeven die aan jou is toegewezen.';
  end if;
  if t.status <> 'open' then
    raise exception 'Een gereed gemelde taak kun je niet teruggeven. Zet hem eerst weer open.';
  end if;
  update taken set toegewezen_aan = null where id = taak_id;
end;
$$;

-- ✓ "Gereed melden". De foto is niet verplicht. Bij "Ongedaan maken" na
-- heropenen geeft de app de oude foto mee, zodat die terugkomt.
create function taak_gereed_melden(taak_id bigint, foto text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag deze taak niet gereed melden.';
  end if;
  if t.toegewezen_aan is null then
    raise exception 'Deze taak is nog aan niemand toegewezen. Kies eerst "Ik doe dit".';
  end if;
  if t.status <> 'open' then
    raise exception 'Deze taak is al gereed gemeld.';
  end if;
  update taken
  set status = 'gereed',
      gereed_gemeld_door = auth.uid(),
      gereed_gemeld_op = now(),
      foto_na_afloop = foto
  where id = taak_id;
end;
$$;

-- ↺ "Weer openen": een gereed gemelde taak terug naar open.
-- De foto na afloop wordt losgekoppeld (net als in de demo).
create function taak_heropenen(taak_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag deze taak niet weer openen.';
  end if;
  if t.status <> 'gereed' then
    raise exception 'Deze taak staat al open.';
  end if;
  update taken
  set status = 'open',
      gereed_gemeld_door = null,
      gereed_gemeld_op = null,
      foto_na_afloop = null
  where id = taak_id;
end;
$$;

-- 📷 Foto na afloop toevoegen, vervangen of verwijderen (leeg = verwijderen).
-- Alleen bij een gereed gemelde taak.
create function taak_foto_zetten(taak_id bigint, foto text) returns void
language plpgsql security definer set search_path = public as $$
declare
  t taken;
begin
  select * into t from taken where id = taak_id;
  if not found or not mag_taak_bewerken(t) then
    raise exception 'Je mag de foto bij deze taak niet aanpassen.';
  end if;
  if t.status <> 'gereed' then
    raise exception 'Een foto na afloop kan pas als de taak gereed is gemeld.';
  end if;
  update taken set foto_na_afloop = nullif(foto, '') where id = taak_id;
end;
$$;


-- =====================================================================
-- 4. Wie mag de functies gebruiken
-- =====================================================================
-- Standaard mag iedereen (ook anon) een functie aanroepen. Dat zetten
-- we uit, en geven het alleen aan ingelogde gebruikers.
revoke execute on function
  is_actief(), is_bestuur(), is_beheerder(), mijn_werkgroepen(),
  mag_taak_bewerken(taken), melding_status(meldingen),
  taak_oppakken(bigint), taak_teruggeven(bigint),
  taak_gereed_melden(bigint, text), taak_heropenen(bigint),
  taak_foto_zetten(bigint, text)
from public, anon;

grant execute on function
  is_actief(), is_bestuur(), is_beheerder(), mijn_werkgroepen(),
  mag_taak_bewerken(taken), melding_status(meldingen),
  taak_oppakken(bigint), taak_teruggeven(bigint),
  taak_gereed_melden(bigint, text), taak_heropenen(bigint),
  taak_foto_zetten(bigint, text)
to authenticated;


-- =====================================================================
-- 5. Niet-ingelogde bezoekers mogen niets
-- =====================================================================
-- Supabase geeft standaard ook "anon" (niet ingelogd) toegang tot tabellen
-- en overzichten. De regels hierboven houden ze al tegen, maar een dubbel
-- slot is beter. Dit staat onderaan, zodat het ook geldt voor de
-- overzichten die hierboven opnieuw zijn gemaakt.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
