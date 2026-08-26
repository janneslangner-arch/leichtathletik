-- Leichtathletik Tracker – Datenbank für Supabase (Postgres)
--
-- Einspielen: supabase.com → Projekt → SQL Editor → dieses Skript einfügen → Run.
--
-- Zugriff: Die App meldet sich mit dem öffentlichen anon-Key an. Die Tabellen
-- selbst sind für diesen Key gesperrt (RLS ohne Policy). Gelesen und
-- geschrieben wird ausschließlich über die Funktionen unten, und die verlangen
-- jedes Mal den Klassen-Code. Wer den Code nicht kennt, kommt an keine Daten.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- Tabellen
create table if not exists gruppen (
  code        text primary key,
  erstellt_am timestamptz not null default now()
);

create table if not exists profile (
  id          uuid primary key,
  code        text not null references gruppen(code) on delete cascade,
  name        text not null,
  erstellt_am timestamptz not null default now(),
  unique (code, name)
);

create table if not exists werte (
  id         uuid primary key,
  code       text not null references gruppen(code) on delete cascade,
  profil_id  uuid not null references profile(id) on delete cascade,
  disziplin  text not null,
  wert       double precision not null check (wert > 0),
  datum      date not null,
  notiz      text not null default '',
  erfasst_am timestamptz not null default now()
);

-- Aussehen eines Profils (Farbe, Verlauf, Muster, eigene Farben). Steht hier
-- und nicht nur im Browser, damit Levin auf jedem Gerät gleich aussieht.
alter table profile add column if not exists aussehen jsonb not null default '{}'::jsonb;

-- Nachträglich dazugekommen: die Uhrzeit der Messung als "HH:MM".
-- Leer heißt: bei diesem Wert wurde keine Zeit erfasst.
alter table werte add column if not exists zeit text not null default '';

create index if not exists werte_code_idx on werte (code);
create index if not exists werte_profil_idx on werte (profil_id);
create index if not exists profile_code_idx on profile (code);

-- Direktzugriff dicht machen: RLS an, keine einzige Policy.
alter table gruppen enable row level security;
alter table profile enable row level security;
alter table werte   enable row level security;

revoke all on table gruppen, profile, werte from anon, authenticated;

-- ---------------------------------------------------------------- Bausteine
-- Prüft den Klassen-Code und legt die Gruppe beim ersten Mal an.
create or replace function gruppe_pruefen(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := lower(btrim(coalesce(p_code, '')));
  if length(v_code) < 6 then
    raise exception 'Klassen-Code muss mindestens 6 Zeichen haben';
  end if;
  if length(v_code) > 64 then
    raise exception 'Klassen-Code ist zu lang';
  end if;
  insert into gruppen (code) values (v_code) on conflict (code) do nothing;
  return v_code;
end;
$$;

-- Ein Profil muss zur Gruppe gehören, sonst passiert nichts.
create or replace function profil_pruefen(p_code text, p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from profile where id = p_id and code = p_code;
  if v_id is null then
    raise exception 'Profil gehört nicht zu diesem Klassen-Code';
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- Lesen
create or replace function daten_lesen(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := gruppe_pruefen(p_code);
  return jsonb_build_object(
    'profile', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'aussehen', p.aussehen)
                       order by p.erstellt_am)
      from profile p where p.code = v_code), '[]'::jsonb),
    'werte', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', w.id, 'profil_id', w.profil_id, 'disziplin', w.disziplin,
               'wert', w.wert, 'datum', w.datum, 'zeit', w.zeit, 'notiz', w.notiz)
               order by w.datum, w.zeit, w.erfasst_am)
      from werte w where w.code = v_code), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------- Profile
create or replace function profil_anlegen(p_code text, p_id uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text; v_name text;
begin
  v_code := gruppe_pruefen(p_code);
  v_name := btrim(coalesce(p_name, ''));
  if v_name = '' then raise exception 'Profil braucht einen Namen'; end if;
  if length(v_name) > 40 then raise exception 'Name ist zu lang'; end if;

  insert into profile (id, code, name) values (p_id, v_code, v_name)
  on conflict (id) do nothing;                       -- erneutes Senden ändert nichts
  return daten_lesen(v_code);
exception when unique_violation then
  raise exception 'Ein Profil mit diesem Namen gibt es schon';
end;
$$;

create or replace function profil_umbenennen(p_code text, p_id uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text; v_name text;
begin
  v_code := gruppe_pruefen(p_code);
  perform profil_pruefen(v_code, p_id);
  v_name := btrim(coalesce(p_name, ''));
  if v_name = '' then raise exception 'Profil braucht einen Namen'; end if;
  update profile set name = v_name where id = p_id;
  return daten_lesen(v_code);
exception when unique_violation then
  raise exception 'Ein Profil mit diesem Namen gibt es schon';
end;
$$;

-- Aussehen setzen. Der Inhalt ist absichtlich frei: die App legt fest, was
-- drinsteht. Begrenzt wird nur die Größe, damit niemand die Tabelle vollmüllt.
create or replace function profil_aussehen(p_code text, p_id uuid, p_aussehen jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := gruppe_pruefen(p_code);
  perform profil_pruefen(v_code, p_id);
  if length(coalesce(p_aussehen, '{}'::jsonb)::text) > 2000 then
    raise exception 'Aussehen zu groß';
  end if;
  update profile set aussehen = coalesce(p_aussehen, '{}'::jsonb)
  where id = p_id and code = v_code;
  return daten_lesen(v_code);
end;
$$;

create or replace function profil_loeschen(p_code text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := gruppe_pruefen(p_code);
  delete from profile where id = p_id and code = v_code;   -- Werte gehen mit
  return daten_lesen(v_code);
end;
$$;

-- ---------------------------------------------------------------- Werte
-- Die alte Fassung ohne Uhrzeit weicht, sonst gäbe es zwei Funktionen
-- gleichen Namens und PostgREST müsste raten.
drop function if exists wert_anlegen(text, uuid, uuid, text, double precision, date, text);

create or replace function wert_anlegen(
  p_code text, p_id uuid, p_profil uuid, p_disziplin text,
  p_wert double precision, p_datum date, p_notiz text default '',
  p_zeit text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := gruppe_pruefen(p_code);
  perform profil_pruefen(v_code, p_profil);
  if p_disziplin not in ('hochsprung','weitsprung','sprint100','lauf1500','lauf5000','speerwurf','kugelstossen') then
    raise exception 'Unbekannte Disziplin: %', p_disziplin;
  end if;
  if p_wert is null or p_wert <= 0 then raise exception 'Wert muss größer als 0 sein'; end if;

  insert into werte (id, code, profil_id, disziplin, wert, datum, notiz, zeit)
  values (p_id, v_code, p_profil, p_disziplin, p_wert, p_datum, left(coalesce(p_notiz, ''), 200),
          case when coalesce(p_zeit, '') ~ '^[0-2][0-9]:[0-5][0-9]$' then p_zeit else '' end)
  on conflict (id) do nothing;                       -- doppeltes Senden ist harmlos
  return daten_lesen(v_code);
end;
$$;

create or replace function wert_loeschen(p_code text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := gruppe_pruefen(p_code);
  delete from werte where id = p_id and code = v_code;
  return daten_lesen(v_code);
end;
$$;

-- ---------------------------------------------------------------- Rechte
-- Nur die Funktionen sind für die App erreichbar, die Tabellen nicht.
grant execute on function daten_lesen(text)                                              to anon, authenticated;
grant execute on function profil_anlegen(text, uuid, text)                               to anon, authenticated;
grant execute on function profil_umbenennen(text, uuid, text)                            to anon, authenticated;
grant execute on function profil_aussehen(text, uuid, jsonb)                            to anon, authenticated;
grant execute on function profil_loeschen(text, uuid)                                    to anon, authenticated;
grant execute on function wert_anlegen(text, uuid, uuid, text, double precision, date, text, text) to anon, authenticated;
grant execute on function wert_loeschen(text, uuid)                                      to anon, authenticated;

revoke execute on function gruppe_pruefen(text) from anon, authenticated;
revoke execute on function profil_pruefen(text, uuid) from anon, authenticated;
