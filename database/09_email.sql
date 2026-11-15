-- =====================================================================
-- 09_email.sql — beheerders zien het e-mailadres van een gebruiker
-- =====================================================================
-- Wat doet dit bestand?
--   De e-mailadressen staan niet in onze eigen tabellen, maar in het
--   inlogdeel van Supabase (auth.users). Daar kan de app niet zomaar bij.
--   Deze vaste actie gebruiker_email geeft het adres van één persoon,
--   maar alleen aan een beheerder. Het formulier "Wijzigen" in het
--   beheerscherm gebruikt hem.
--
--   Het adres WIJZIGEN of iemand TOEVOEGEN gaat niet via SQL, maar via de
--   Edge Function "beheer" (supabase/functions/beheer/index.ts).
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren, na 08_beheer.sql. Daarna test_09_email.sql.
-- =====================================================================


-- 📧 Het e-mailadres van één gebruiker (alleen voor beheerders).
-- Geeft niets (null) terug als de persoon geen inlogaccount meer heeft.
create function gebruiker_email(gebruiker_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_beheerder() then
    raise exception 'Alleen beheerders kunnen e-mailadressen zien.';
  end if;
  return (select email from auth.users where id = gebruiker_id);
end;
$$;

-- Alleen ingelogde gebruikers mogen de functie aanroepen (de functie
-- controleert daarna zelf of je beheerder bent).
revoke execute on function gebruiker_email(uuid) from public, anon;
grant  execute on function gebruiker_email(uuid) to authenticated;
