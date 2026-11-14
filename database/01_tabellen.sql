-- =====================================================================
-- 01_tabellen.sql — de tabellen van de Vrijwilligersapp
-- =====================================================================
-- Wat doet dit bestand?
--   Het maakt de zeven tabellen uit DATABASE.md, met de regels die de
--   database zelf bewaakt (verplichte velden, wat bij elkaar hoort).
--   Daarnaast twee "weergaven" (views): kant-en-klare overzichten die de
--   app kan opvragen, zoals de status van een melding.
--
-- Hoe gebruik je het?
--   Eén keer uitvoeren in een LEEG Supabase-project, via SQL Editor.
--   Zie database/LEESMIJ.md voor de volgorde van de bestanden.
--
-- Veiligheid:
--   Elke tabel krijgt meteen "Row Level Security" (rijbeveiliging) aan.
--   Zonder regels betekent dat: niemand mag iets via de app. De regels
--   wie wat mag komen in 03_rechten.sql. Zo staat er nooit per ongeluk
--   een tabel open voor de hele wereld.
--
-- Kleine woordenlijst:
--   create table   = maak een tabel
--   not null       = verplicht
--   default        = standaardwaarde als je niets invult
--   unique         = mag maar één keer voorkomen
--   references     = verwijst naar een regel in een andere tabel
--   check (...)    = een regel die altijd waar moet zijn
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. werkgroepen
-- ---------------------------------------------------------------------
create table werkgroepen (
  id      bigint generated always as identity primary key,  -- nummer, gaat vanzelf
  naam    text not null unique check (length(trim(naam)) > 0),
  actief  boolean not null default true  -- false = verdwijnt uit de keuzes
);


-- ---------------------------------------------------------------------
-- 2. plekken (eerste laag: bijv. "Hummelhoeve")
-- ---------------------------------------------------------------------
create table plekken (
  id                   bigint generated always as identity primary key,
  naam                 text not null unique check (length(trim(naam)) > 0),
  standaard_werkgroep  bigint references werkgroepen(id),  -- mag leeg ("Overig")
  volgorde             integer not null default 0,         -- volgorde van de knoppen
  actief               boolean not null default true
);


-- ---------------------------------------------------------------------
-- 3. onderdelen (tweede laag: bijv. "Nestschommel" in de Hummelhoeve)
-- ---------------------------------------------------------------------
create table onderdelen (
  id        bigint generated always as identity primary key,
  plek      bigint not null references plekken(id),
  naam      text not null check (length(trim(naam)) > 0),
  volgorde  integer not null default 0,
  actief    boolean not null default true,
  unique (plek, naam),  -- dezelfde naam mag wel bij een andere plek
  unique (plek, id)     -- technisch nodig: zo kan een taak controleren
                        -- dat het onderdeel bij de gekozen plek hoort
);


-- ---------------------------------------------------------------------
-- 4. gebruikers
-- ---------------------------------------------------------------------
-- Het e-mailadres staat NIET hier, maar in het inlogsysteem van Supabase
-- (auth.users). De id is hetzelfde nummer als daar.
-- Er is bewust geen harde koppeling met auth.users: als iemand stopt,
-- wordt het inlogaccount verwijderd, maar deze regel (met de voornaam)
-- moet blijven bestaan zolang er nog taken naar verwijzen.
create table gebruikers (
  id                  uuid primary key,
  voornaam            text not null check (length(trim(voornaam)) between 1 and 40),
  achternaam_letter   text not null check (length(trim(achternaam_letter)) between 1 and 3),
  rol                 text not null default 'vrijwilliger'
                      check (rol in ('vrijwilliger', 'bestuur', 'coordinator')),
  krijgt_gevaar_mail  boolean not null default false,
  is_beheerder        boolean not null default false,
  actief              boolean not null default true   -- false = gestopt
);


-- ---------------------------------------------------------------------
-- 5. lidmaatschappen (wie zit in welke werkgroep)
-- ---------------------------------------------------------------------
-- Eén regel per persoon per werkgroep. De combinatie is de sleutel,
-- dus dezelfde combinatie kan maar één keer voorkomen.
create table lidmaatschappen (
  gebruiker  uuid   not null references gebruikers(id) on delete cascade,
  werkgroep  bigint not null references werkgroepen(id),
  primary key (gebruiker, werkgroep)
);
-- "on delete cascade": wordt een gebruiker helemaal verwijderd, dan
-- verdwijnen zijn of haar lidmaatschappen vanzelf mee.


-- ---------------------------------------------------------------------
-- 6. taken
-- ---------------------------------------------------------------------
create table taken (
  id                  bigint generated always as identity primary key,
  titel               text not null check (length(trim(titel)) > 0),
  omschrijving        text,
  plek                bigint not null references plekken(id),
  onderdeel           bigint,                               -- niet verplicht
  werkgroep           bigint not null references werkgroepen(id),
  toegewezen_aan      uuid references gebruikers(id),       -- niet verplicht
  deadline            date,
  status              text not null default 'open' check (status in ('open', 'gereed')),
  foto_na_afloop      text,                                 -- waar de foto staat
  gereed_gemeld_door  uuid references gebruikers(id),
  gereed_gemeld_op    timestamptz,
  aangemaakt_door     uuid not null references gebruikers(id) default auth.uid(),
  aangemaakt_op       timestamptz not null default now(),

  -- Het onderdeel moet bij de gekozen plek horen.
  -- (Is het onderdeel leeg, dan wordt dit niet gecontroleerd.)
  foreign key (plek, onderdeel) references onderdelen(plek, id),

  -- Alleen een toegewezen taak kan gereed zijn.
  constraint gereed_alleen_als_toegewezen
    check (status = 'open' or toegewezen_aan is not null),

  -- Gereed = "door wie" en "wanneer" ingevuld. Open = allebei leeg.
  constraint gereed_gegevens_kloppen
    check (
      (status = 'gereed' and gereed_gemeld_door is not null and gereed_gemeld_op is not null)
      or
      (status = 'open'   and gereed_gemeld_door is null     and gereed_gemeld_op is null)
    )
);


-- ---------------------------------------------------------------------
-- 7. meldingen
-- ---------------------------------------------------------------------
create table meldingen (
  id                bigint generated always as identity primary key,
  plek              bigint not null references plekken(id),
  onderdeel         bigint,                                  -- niet verplicht
  foto              text not null,                           -- verplicht
  toelichting       text,
  gevaarlijk        boolean not null default false,
  gemeld_door       uuid not null references gebruikers(id) default auth.uid(),
  gemeld_op         timestamptz not null default now(),
  taak              bigint unique references taken(id) on delete set null,
  geen_actie_reden  text,
  geen_actie_door   uuid references gebruikers(id),

  foreign key (plek, onderdeel) references onderdelen(plek, id),

  -- Óf een taak, óf "geen actie nodig", nooit allebei.
  constraint taak_of_geen_actie
    check (taak is null or geen_actie_reden is null),

  -- "Geen actie nodig" heeft altijd een reden (niet leeg) én wie het besloot.
  constraint geen_actie_compleet
    check (
      (geen_actie_reden is null and geen_actie_door is null)
      or
      (geen_actie_reden is not null
       and length(trim(geen_actie_reden)) > 0
       and geen_actie_door is not null)
    )
);
-- "unique" bij taak: van één melding komt hooguit één taak, en een taak
-- hoort bij hooguit één melding.
-- "on delete set null": wordt de taak verwijderd, dan staat de melding
-- weer op "Nieuw".


-- ---------------------------------------------------------------------
-- Rijbeveiliging aan op alle tabellen (zie uitleg bovenaan)
-- ---------------------------------------------------------------------
alter table werkgroepen     enable row level security;
alter table plekken         enable row level security;
alter table onderdelen      enable row level security;
alter table gebruikers      enable row level security;
alter table lidmaatschappen enable row level security;
alter table taken           enable row level security;
alter table meldingen       enable row level security;


-- ---------------------------------------------------------------------
-- Weergave: meldingen met hun status
-- ---------------------------------------------------------------------
-- De status wordt niet opgeslagen maar elke keer uitgerekend, zodat hij
-- nooit verouderd kan zijn. "security_invoker" zorgt dat ook hier de
-- regels uit 03_rechten.sql gelden: je ziet alleen wat je mag zien.
create view meldingen_met_status
with (security_invoker = true) as
select
  m.*,
  case
    when m.geen_actie_reden is not null then 'Geen actie nodig'
    when m.taak is null                 then 'Nieuw'
    when t.status = 'gereed'            then 'Gereed'
    when t.toegewezen_aan is not null   then 'Toegewezen'
    else                                     'Taak gemaakt'
  end as status
from meldingen m
left join taken t on t.id = m.taak;


-- ---------------------------------------------------------------------
-- Weergave: de naam die de app laat zien
-- ---------------------------------------------------------------------
-- Normaal alleen de voornaam ("Piet"). Is er nog een actieve gebruiker
-- met dezelfde voornaam, dan komt de letter van de achternaam erachter
-- ("Piet P."). Hoofdletters maken niet uit: "piet" en "Piet" tellen als
-- dezelfde naam.
create view gebruikers_weergave
with (security_invoker = true) as
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
from gebruikers g;
