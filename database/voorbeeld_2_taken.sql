-- =====================================================================
-- voorbeeld_2_taken.sql — verzonnen taken om de app mee te testen
-- =====================================================================
-- ALLEEN VOOR HET TESTPROJECT. Nooit uitvoeren in het echte project.
--
-- Wat doet dit bestand?
--   Het zet elf verzonnen taken in de database: dezelfde als de
--   voorbeeldtaken die eerst in app.js stonden. De deadlines rekent de
--   database uit vanaf vandaag, zodat er altijd een paar "te laat" zijn.
--
-- Aan wie worden ze toegewezen?
--   - "bestuur":      de eerste actieve gebruiker met rol bestuur of
--                     coördinator (meestal jijzelf);
--   - "vrijwilliger": de eerste actieve vrijwilliger (bijv. de
--                     Testvrijwilliger uit voorbeeld_1). Is er geen
--                     vrijwilliger, dan blijven die taken vrij;
--   - leeg:           nog niemand.
--
-- Hoe gebruik je het?
--   Eerst (als je wilt) voorbeeld_1_testvrijwilliger.sql uitvoeren.
--   Dan dit bestand kopiëren naar de SQL Editor en op Run klikken.
--   Het werkt maar één keer: staan er al taken, dan stopt het met een
--   melding. Zo krijg je geen dubbele taken.
--
-- Opnieuw beginnen? (alleen in het testproject!)
--   delete from taken;
--   Daarna kun je dit bestand weer uitvoeren.
-- =====================================================================

do $$
declare
  bestuurder   uuid;   -- wordt "aangemaakt door" en krijgt de bestuurstaken
  vrijwilliger uuid;   -- mag leeg blijven
begin
  if exists (select 1 from taken) then
    raise exception 'Er staan al taken in de database. Wil je opnieuw beginnen? Voer eerst "delete from taken;" uit (alleen in het testproject).';
  end if;

  select id into bestuurder from gebruikers
  where actief and rol in ('bestuur', 'coordinator')
  order by voornaam limit 1;
  if bestuurder is null then
    raise exception 'Er is nog geen gebruiker met rol bestuur of coordinator. Voeg die eerst toe.';
  end if;

  select id into vrijwilliger from gebruikers
  where actief and rol = 'vrijwilliger'
  order by voornaam limit 1;

  -- De taken. "dagen" = deadline over zoveel dagen (min = al voorbij).
  -- Plek en werkgroep worden opgezocht op naam, zodat je geen nummers hoeft te kennen.
  insert into taken (titel, omschrijving, plek, werkgroep, toegewezen_aan, deadline,
                     status, gereed_gemeld_door, gereed_gemeld_op, aangemaakt_door)
  select
    t.titel,
    t.omschrijving,
    plekken.id,
    werkgroepen.id,
    case t.wie when 'bestuur' then bestuurder when 'vrijwilliger' then vrijwilliger end,
    current_date + t.dagen,
    t.status,
    case when t.status = 'gereed' then bestuurder end,
    case when t.status = 'gereed' then now() end,
    bestuurder
  from (values
    ('Hek weide 2 repareren',        'Onderste plank zit los bij de ingang.',   'Weides',        'Klussen',             'vrijwilliger',  5, 'open'),
    ('Hooi bestellen',               'Voorraad op de hooizolder is bijna op.',  'Stal',          'Dieren',              'bestuur',      10, 'open'),
    ('Waterpomp winterklaar maken',  'Pomp bij het waterspelen aftappen.',      'Waterspelen',   'Klussen',             'bestuur',      -3, 'gereed'),
    ('Konijnenhok extra uitmesten',  'Na de herfstvakantie.',                   'Overig',        'Dieren',              null,           12, 'open'),
    ('Lampen schuur vervangen',      'Twee tl-buizen zijn kapot.',              'Gebouw',        'Klussen',             null,            7, 'open'),
    ('Drinkbak ezels schoonmaken',   'Algen verwijderen en vers water.',        'Weides',        'Dieren',              null,            3, 'open'),
    ('Stal uitmesten',               'Alle zes boxen, vers stro erin.',         'Stal',          'Dieren',              null,            2, 'open'),
    ('Valondergrond aanvullen',      'Houtsnippers bij de glijbaan.',           'Hummelhoeve',   'Avontuurlijk spelen', null,            9, 'open'),
    ('Bollen planten',               'Bollen liggen in de kas.',                'Belevenistuin', 'Tuinen',              null,           11, 'open'),
    ('Lampionnen voorbereiden',      'Materiaal klaarzetten voor de workshop.', 'Gebouw',        'Evenementen',         null,           20, 'open'),
    ('Hek weide 3 gaat niet dicht',  'Hek weide 3 gaat niet meer dicht.',       'Weides',        'Klussen',             'vrijwilliger', -2, 'open')
  ) as t(titel, omschrijving, plek, werkgroep, wie, dagen, status)
  join plekken     on plekken.naam     = t.plek
  join werkgroepen on werkgroepen.naam = t.werkgroep;
end $$;

-- Controle: dit moet 11 taken laten zien.
select t.id, t.titel, p.naam as plek, w.naam as werkgroep, g.voornaam as toegewezen_aan, t.deadline, t.status
from taken t
join plekken p     on p.id = t.plek
join werkgroepen w on w.id = t.werkgroep
left join gebruikers g on g.id = t.toegewezen_aan
order by t.id;
