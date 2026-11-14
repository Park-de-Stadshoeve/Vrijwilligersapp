-- =====================================================================
-- 04_fotos.sql — foto-opslag en wie welke foto mag zien
-- =====================================================================
-- Wat doet dit bestand?
--   1. Maakt een afgesloten fotomap "fotos" in de opslag van Supabase.
--   2. Regels: wie mag een foto neerzetten, wie mag hem zien.
--   3. Een melding mag alleen een foto uit je eigen map gebruiken.
--   4. Een overzicht van foto's die nergens meer bij horen (om op te ruimen).
--
-- Hoe heten de foto's?
--   <nummer van de gebruiker>/<willekeurige code>.jpg
--   Bijvoorbeeld: 3f2a…/9c1e….jpg
--   Iedereen heeft dus een eigen map. De willekeurige code (36 tekens)
--   kun je niet raden; zo kom je niet bij andermans foto's.
--
-- Hoe bekijk je een foto?
--   De map is afgesloten: er is geen openbare link. De app vraagt per foto
--   een tijdelijke link aan, die na een uur verloopt. Die link krijg je
--   alleen als je de foto mag zien.
--
-- Eén keer uitvoeren, na 03_rechten.sql. Controleren met test_04_fotos.sql.
-- =====================================================================


-- =====================================================================
-- 1. De fotomap
-- =====================================================================
-- public = false          → afgesloten, geen openbare links
-- file_size_limit         → hooguit 2 MB per foto (onze foto's zijn ±0,3 MB)
-- allowed_mime_types      → alleen JPEG-foto's
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg']);


-- =====================================================================
-- 2. Regels voor de fotomap
-- =====================================================================
-- De opslag van Supabase heeft zijn eigen tabel: storage.objects. Elke foto
-- is daar één regel, met in "name" de naam (map/code.jpg).

-- Hulpvraag: staat deze foto in de map van de ingelogde persoon?
-- split_part(pad, '/', 1) = het stuk vóór de eerste "/", dus de mapnaam.
create function is_eigen_foto(pad text) returns boolean
language sql stable set search_path = public as $$
  select split_part(pad, '/', 1) = auth.uid()::text;
$$;

-- Neerzetten: alleen in je eigen map, en alleen als je actief bent.
create policy "fotos: neerzetten in eigen map" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.is_actief()
    and public.is_eigen_foto(name)
  );

-- Zien: je eigen foto's, en de foto's bij meldingen en taken die je mag
-- zien. De twee "exists"-vragen gebruiken de regels uit 03_rechten.sql:
-- je vindt alleen meldingen en taken terug die je mag zien.
create policy "fotos: zien" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotos'
    and public.is_actief()
    and (
         public.is_eigen_foto(objects.name)
      or exists (select 1 from public.meldingen m where m.foto = objects.name)
      or exists (select 1 from public.taken t where t.foto_na_afloop = objects.name)
    )
  );

-- Wijzigen en verwijderen: geen regel, dus niemand via de app.
-- Een foto vervangen = een nieuwe foto neerzetten en de taak laten wijzen
-- naar de nieuwe. De oude blijft even bestaan, zodat "Ongedaan maken" werkt.


-- =====================================================================
-- 3. Een melding gebruikt alleen een foto uit je eigen map
-- =====================================================================
-- Dit vervangt de regel "melden: actieve gebruikers" uit 03_rechten.sql,
-- met één extra voorwaarde onderaan.
drop policy "melden: actieve gebruikers" on meldingen;
create policy "melden: actieve gebruikers" on meldingen
  for insert to authenticated
  with check (
    is_actief()
    and gemeld_door = auth.uid()
    and taak is null
    and geen_actie_reden is null
    and geen_actie_door is null
    and is_eigen_foto(foto)
  );


-- =====================================================================
-- 4. Foto's die nergens meer bij horen
-- =====================================================================
-- Bijvoorbeeld van een ingetrokken melding of een vervangen foto, ouder dan
-- 7 dagen (zo blijft "Ongedaan maken" werken). Alleen te bekijken in de
-- SQL Editor of het dashboard van Supabase, niet via de app.
--
-- Let op: verwijderen kan niet met SQL, alleen via Storage in het dashboard
-- (of later automatisch). Dit overzicht vertelt je welke foto's weg mogen.
create view fotos_zonder_koppeling as
select o.name as foto, o.created_at as geplaatst_op
from storage.objects o
where o.bucket_id = 'fotos'
  and o.created_at < now() - interval '7 days'
  and not exists (select 1 from meldingen m where m.foto = o.name)
  and not exists (select 1 from taken t where t.foto_na_afloop = o.name);

revoke all on fotos_zonder_koppeling from anon, authenticated;


-- =====================================================================
-- 5. Wie mag de hulpvraag gebruiken
-- =====================================================================
revoke execute on function is_eigen_foto(text) from public, anon;
grant  execute on function is_eigen_foto(text) to authenticated;
