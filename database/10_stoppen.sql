-- =====================================================================
-- 10_stoppen.sql — iemand laten stoppen en weer laten meedoen
-- =====================================================================
-- Wat doet dit bestand?
--   Twee vaste acties voor het database-deel van "Laten stoppen" en
--   "Weer laten meedoen" in het beheerscherm. Het inlogaccount zelf
--   (met het e-mailadres) haalt de Edge Function "beheer" weg of zet hij
--   terug; dat kan niet met SQL.
--
--   zet_gebruiker_stop:
--     - open taken op naam van de persoon gaan terug naar "nog niemand"
--       (taken die al gereed zijn, houden de naam: dat is geschiedenis);
--     - de vinkjes "beheerder" en "krijgt mail bij gevaar" gaan uit;
--     - de persoon wordt "gestopt" (actief = nee).
--     Rol, voornaam en werkgroepen blijven staan, voor "Weer laten meedoen".
--     Geeft terug wat er veranderd is, zodat "Ongedaan maken" het precies
--     kan terugzetten.
--
--   zet_gebruiker_terug:
--     - de persoon doet weer mee (actief = ja), met de opgegeven vinkjes;
--     - de opgegeven taken komen weer op zijn of haar naam, maar alleen als
--       ze nog open zijn en nog niemand anders ze heeft opgepakt.
--
-- Wie mag ze gebruiken?
--   Alleen de Edge Function "beheer" (rol service_role). Die controleert
--   eerst zelf of de vrager een beheerder is. De app kan deze acties niet
--   rechtstreeks aanroepen.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 09_email.sql. Daarna test_10_stoppen.sql.
-- =====================================================================


-- 🚪 Database-deel van "Laten stoppen"
create function zet_gebruiker_stop(gebruiker_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  g               gebruikers;
  vrijgegeven     bigint[];
begin
  -- "for update" = deze persoon even vastzetten, zodat niemand anders
  -- hem tegelijk wijzigt.
  select * into g from gebruikers where id = gebruiker_id for update;
  if not found then
    raise exception 'Deze persoon bestaat niet meer. Ververs het scherm.';
  end if;
  if not g.actief then
    raise exception 'Deze persoon is al gestopt.';
  end if;

  -- Open taken weer vrijgeven en onthouden welke het waren
  with vrij as (
    update taken set toegewezen_aan = null
    where toegewezen_aan = gebruiker_id and status = 'open'
    returning id
  )
  select coalesce(array_agg(id), '{}') into vrijgegeven from vrij;

  -- Stoppen. Was dit de laatste beheerder, dan houdt de bewaker uit
  -- 08_beheer.sql dit tegen en wordt alles hierboven ook teruggedraaid.
  update gebruikers
  set actief = false, is_beheerder = false, krijgt_gevaar_mail = false
  where id = gebruiker_id;

  return jsonb_build_object(
    'taken', to_jsonb(vrijgegeven),
    'was_beheerder', g.is_beheerder,
    'kreeg_gevaar_mail', g.krijgt_gevaar_mail
  );
end;
$$;


-- ↩️ Database-deel van "Weer laten meedoen" (en van "Ongedaan maken" na stoppen)
create function zet_gebruiker_terug(
  gebruiker_id            uuid,
  terug_taken             bigint[],
  wordt_beheerder         boolean,
  krijgt_mail_bij_gevaar  boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update gebruikers
  set actief = true,
      is_beheerder = coalesce(wordt_beheerder, false),
      krijgt_gevaar_mail = coalesce(krijgt_mail_bij_gevaar, false)
  where id = gebruiker_id and not actief;
  if not found then
    raise exception 'Deze persoon bestaat niet of doet al mee. Ververs het scherm.';
  end if;

  -- Alleen taken die nog open zijn en die nog niemand anders heeft
  update taken set toegewezen_aan = gebruiker_id
  where id = any(coalesce(terug_taken, '{}'))
    and status = 'open'
    and toegewezen_aan is null;
end;
$$;


-- Alleen de Edge Function (service_role) mag deze acties gebruiken
revoke execute on function zet_gebruiker_stop(uuid) from public, anon, authenticated;
revoke execute on function zet_gebruiker_terug(uuid, bigint[], boolean, boolean) from public, anon, authenticated;
grant  execute on function zet_gebruiker_stop(uuid) to service_role;
grant  execute on function zet_gebruiker_terug(uuid, bigint[], boolean, boolean) to service_role;
