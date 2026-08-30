-- Leichtathletik Tracker – Datenbank für Supabase (Postgres)
--
-- Einspielen: supabase.com → Projekt → SQL Editor → dieses Skript einfügen → Run.
--
-- Zugriff: Die App meldet sich mit dem öffentlichen anon-Key an. Die Tabellen
-- selbst sind für diesen Key gesperrt (RLS ohne Policy). Gelesen und
-- geschrieben wird ausschließlich über die Funktionen unten, und die verlangen
-- jedes Mal den Klassen-Code. Wer den Code nicht kennt, kommt an keine Daten.

create extension if not exists pgcrypto;

-- Für den Mailversand des Löschcodes. Fehlt die Erweiterung, läuft alles
-- andere trotzdem – nur das Löschen von Profilen ist dann nicht möglich.
do $ext$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net nicht verfügbar (%) – Löschcodes können nicht verschickt werden', sqlerrm;
end
$ext$;

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

-- Alles, was zum Profil gehört und auf jedem Gerät gleich sein muss:
-- Aussehen (Farbe, Verlauf, Muster, eigene Farben) und die Wertung
-- (Tabelle, Geburtsjahr, Zeitmessung, Altersklasse). Der Inhalt ist frei –
-- die App bestimmt die Felder, hier wird nur die Größe begrenzt. Deshalb
-- braucht ein neues Feld kein neues SQL.
alter table profile add column if not exists aussehen jsonb not null default '{}'::jsonb;

-- Nachträglich dazugekommen: die Uhrzeit der Messung als "HH:MM".
-- Leer heißt: bei diesem Wert wurde keine Zeit erfasst.
alter table werte add column if not exists zeit text not null default '';

-- Zugangsdaten für den Mailversand. Steht bewusst NICHT in der Webseite:
-- die kann jeder öffnen und mitlesen. Auf diese Tabelle kommt nur der
-- Server selbst, über die Funktionen weiter unten.
create table if not exists geheim (
  schluessel text primary key,
  wert       text not null
);

-- Ein Löschcode gilt für genau ein Profil, zehn Minuten lang und einmal.
-- Der Code selbst wird nur als Prüfsumme gespeichert.
create table if not exists loesch_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references gruppen(code) on delete cascade,
  profil_id   uuid not null references profile(id) on delete cascade,
  pin_hash    text not null,
  wer         text not null default '',
  erstellt_am timestamptz not null default now(),
  gueltig_bis timestamptz not null,
  versuche    int not null default 0,
  benutzt_am  timestamptz
);

create index if not exists loesch_codes_profil_idx on loesch_codes (profil_id, gueltig_bis);
create index if not exists werte_code_idx on werte (code);
create index if not exists werte_profil_idx on werte (profil_id);
create index if not exists profile_code_idx on profile (code);

-- Direktzugriff dicht machen: RLS an, keine einzige Policy.
alter table gruppen      enable row level security;
alter table profile      enable row level security;
alter table werte        enable row level security;
alter table geheim       enable row level security;
alter table loesch_codes enable row level security;

revoke all on table gruppen, profile, werte, geheim, loesch_codes from anon, authenticated;

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

-- --------------------------------------------------------- Lehrerzugang
-- Der Schlüssel steht NICHT in der Webseite – die kann jeder öffnen und
-- lesen. Er liegt als Prüfsumme in `geheim` und wird nur hier verglichen.
-- Ohne Verbindung zur Datenbank kommt niemand in die Lehreransicht.
create table if not exists lehrer_versuche (
  id     bigserial primary key,
  code   text not null,
  wann   timestamptz not null default now(),
  erfolg boolean not null default false
);
alter table lehrer_versuche enable row level security;
revoke all on table lehrer_versuche from anon, authenticated;
create index if not exists lehrer_versuche_idx on lehrer_versuche (code, wann);

create or replace function lehrer_pruefen(p_code text, p_schluessel text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
-- Wie beim Löschcode gilt: falscher Schlüssel wirft KEINE Exception, sonst
-- würde der Versuch mit zurückgedreht und man könnte endlos probieren.
declare v_code text; v_hash text; v_daneben int;
begin
  v_code := gruppe_pruefen(p_code);

  select count(*) into v_daneben from lehrer_versuche
   where code = v_code and not erfolg and wann > now() - interval '1 hour';
  if v_daneben >= 10 then
    return jsonb_build_object('ok', false,
      'meldung', 'Zu viele Fehlversuche in dieser Klasse – probiere es in einer Stunde wieder');
  end if;

  select wert into v_hash from geheim where schluessel = 'lehrer_hash';
  if v_hash is null then
    return jsonb_build_object('ok', false,
      'meldung', 'Für diese Klasse ist noch kein Lehrerschlüssel hinterlegt');
  end if;

  if v_hash = crypt(coalesce(p_schluessel, ''), v_hash) then
    insert into lehrer_versuche (code, erfolg) values (v_code, true);
    delete from lehrer_versuche where wann < now() - interval '30 days';
    return jsonb_build_object('ok', true);
  end if;

  insert into lehrer_versuche (code, erfolg) values (v_code, false);
  return jsonb_build_object('ok', false, 'meldung',
    format('Der Schlüssel stimmt nicht (%s von 10 Versuchen in dieser Stunde)', v_daneben + 1));
end;
$$;

-- ------------------------------------------------------- Löschen mit Code
-- Ein Profil zu löschen nimmt der ganzen Klasse die Werte weg. Deshalb geht
-- das nur noch mit einem Zahlencode, der hier im Server entsteht und per
-- E-Mail rausgeht. Die App bekommt ihn nie zu sehen – wer löschen will, muss
-- fragen.

-- Die alte Fassung ohne Code muss weg, sonst wäre die Sperre in einer Zeile
-- zu umgehen: Die Adresse der Funktion steht in der Webseite.
drop function if exists profil_loeschen(text, uuid);

create or replace function loeschcode_anfordern(p_code text, p_id uuid, p_wer text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text; v_name text; v_wer text;
  v_key text; v_an text; v_von text;
  v_bytes bytea; v_zahl bigint; v_ziffern text; v_pin text;
  v_offen int;
begin
  v_code := gruppe_pruefen(p_code);
  perform profil_pruefen(v_code, p_id);
  select name into v_name from profile where id = p_id;
  v_wer := left(btrim(coalesce(p_wer, '')), 40);

  select wert into v_key from geheim where schluessel = 'mail_key';
  select wert into v_an  from geheim where schluessel = 'mail_an';
  select wert into v_von from geheim where schluessel = 'mail_von';
  if v_key is null or v_an is null then
    raise exception 'Der Mailversand ist noch nicht eingerichtet – ohne ihn lässt sich kein Profil löschen';
  end if;
  v_von := coalesce(v_von, 'Leichtathletik <onboarding@resend.dev>');

  -- Bremse 1: nicht im Minutentakt Mails auslösen
  if exists (select 1 from loesch_codes
             where profil_id = p_id and benutzt_am is null
               and erstellt_am > now() - interval '60 seconds') then
    raise exception 'Gerade eben wurde schon ein Code angefordert – schau in die Mail';
  end if;
  -- Bremse 2: höchstens zehn Anforderungen je Klasse und Stunde
  select count(*) into v_offen from loesch_codes
   where code = v_code and erstellt_am > now() - interval '1 hour';
  if v_offen >= 10 then
    raise exception 'Zu viele Löschversuche in dieser Klasse – probiere es in einer Stunde wieder';
  end if;

  -- Alte, noch offene Codes für dieses Profil verfallen lassen
  update loesch_codes set gueltig_bis = now()
   where profil_id = p_id and benutzt_am is null and gueltig_bis > now();

  v_bytes  := gen_random_bytes(3);
  v_zahl   := ((get_byte(v_bytes, 0)::bigint * 65536)
             + (get_byte(v_bytes, 1)::bigint * 256)
             +  get_byte(v_bytes, 2)::bigint) % 1000000;
  v_ziffern := to_char(v_zahl, 'FM000000');
  v_pin     := substr(v_ziffern, 1, 3) || '-' || substr(v_ziffern, 4, 3);

  insert into loesch_codes (code, profil_id, pin_hash, wer, gueltig_bis)
  values (v_code, p_id, crypt(v_ziffern, gen_salt('bf', 8)), v_wer,
          now() + interval '10 minutes');

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || v_key),
    body    := jsonb_build_object(
      'from', v_von,
      'to', jsonb_build_array(v_an),
      'subject', 'Löschcode ' || v_pin || ' für Profil ' || v_name,
      'text', 'Jemand möchte das Profil "' || v_name || '" löschen'
              || case when v_wer = '' then '' else ' (Gerät nutzt gerade "' || v_wer || '")' end
              || '.' || chr(10) || chr(10)
              || 'Code: ' || v_pin || chr(10)
              || 'Gültig: 10 Minuten, einmal verwendbar.' || chr(10) || chr(10)
              || 'Mit dem Profil verschwinden auch alle seine Werte – für alle in der Klasse.'
              || ' Willst du das nicht, gib den Code einfach nicht weiter.')
  );

  return jsonb_build_object(
    'gesendet', true,
    'an', regexp_replace(v_an, '^(.).*(@.*)$', '\1***\2'),
    'minuten', 10,
    'profil', v_name);
end;
$$;

create or replace function profil_loeschen(p_code text, p_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
-- Wichtig: Ein falscher Code darf hier KEINE Exception werfen. Die würde
-- die Transaktion zurückdrehen und damit auch den Fehlversuchs-Zähler –
-- man könnte endlos raten. Deshalb kommt die Absage als normale Antwort
-- zurück: { "ok": false, "meldung": "..." }.
declare v_code text; v_ziffern text; v_zeile loesch_codes%rowtype; v_offen int;
begin
  v_code   := gruppe_pruefen(p_code);
  perform profil_pruefen(v_code, p_id);
  v_ziffern := regexp_replace(coalesce(p_pin, ''), '[^0-9]', '', 'g');
  if length(v_ziffern) <> 6 then
    return jsonb_build_object('ok', false,
      'meldung', 'Der Code besteht aus sechs Ziffern, zum Beispiel 123-456');
  end if;

  select * into v_zeile from loesch_codes
   where profil_id = p_id and benutzt_am is null and gueltig_bis > now()
   order by erstellt_am desc limit 1;
  if v_zeile.id is null then
    return jsonb_build_object('ok', false,
      'meldung', 'Für dieses Profil ist gerade kein Code offen – fordere einen neuen an');
  end if;

  if v_zeile.pin_hash <> crypt(v_ziffern, v_zeile.pin_hash) then
    v_offen := v_zeile.versuche + 1;
    update loesch_codes
       set versuche = v_offen,
           gueltig_bis = case when v_offen >= 5 then now() else gueltig_bis end
     where id = v_zeile.id;
    return jsonb_build_object('ok', false, 'meldung', case when v_offen >= 5
      then 'Fünfmal falsch – dieser Code gilt nicht mehr. Fordere einen neuen an.'
      else format('Der Code stimmt nicht (%s von 5 Versuchen verbraucht)', v_offen) end);
  end if;

  update loesch_codes set benutzt_am = now() where id = v_zeile.id;
  delete from profile where id = p_id and code = v_code;   -- Werte gehen mit
  delete from loesch_codes where gueltig_bis < now() - interval '1 day';
  return jsonb_build_object('ok', true, 'daten', daten_lesen(v_code));
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
grant execute on function lehrer_pruefen(text, text)                                      to anon, authenticated;
grant execute on function loeschcode_anfordern(text, uuid, text)                          to anon, authenticated;
grant execute on function profil_loeschen(text, uuid, text)                              to anon, authenticated;
grant execute on function wert_anlegen(text, uuid, uuid, text, double precision, date, text, text) to anon, authenticated;
grant execute on function wert_loeschen(text, uuid)                                      to anon, authenticated;

revoke execute on function gruppe_pruefen(text) from anon, authenticated;
revoke execute on function profil_pruefen(text, uuid) from anon, authenticated;

-- ------------------------------------------------- Mailversand einrichten
-- Ohne diese zwei Zeilen lässt sich kein Profil mehr löschen: Die App
-- fordert dann einen Code an, der Server hat aber keinen Weg, ihn zu
-- verschicken, und bricht mit einer Meldung ab.
--
-- 1. Bei resend.com mit derselben Adresse anmelden, an die die Codes gehen
--    sollen (kostenlos). Unter "API Keys" einen Schlüssel anlegen; der
--    beginnt mit re_.
-- 2. In Supabase unter Database -> Extensions "pg_net" einschalten
--    (dieses Skript versucht das oben schon selbst).
-- 3. Die folgenden zwei Zeilen mit deinen Werten einmal ausführen:
--
-- insert into geheim (schluessel, wert) values
--   ('mail_key', 're_DEIN_SCHLUESSEL'),
--   ('mail_an',  'deine@adresse.de')
-- on conflict (schluessel) do update set wert = excluded.wert;
--
-- Ohne eigene Domain verschickt Resend nur an die Adresse des eigenen
-- Kontos - für "Code an mich selbst" reicht das genau. Wer eine Domain hat,
-- trägt zusätzlich ('mail_von', 'Name <post@meine-domain.de>') ein.
--
-- ------------------------------------------------- Lehrerschlüssel setzen
-- Einmal ausführen, mit eurem eigenen Schlüssel. Er wird nur als Prüfsumme
-- gespeichert und lässt sich daraus nicht zurückrechnen:
--
-- insert into geheim (schluessel, wert)
-- values ('lehrer_hash', crypt('EUER-SCHLUESSEL', gen_salt('bf', 10)))
-- on conflict (schluessel) do update set wert = excluded.wert;
--
-- Kontrolle, ob etwas rausging (zeigt nie den Code, nur den Status):
--   select created, status_code from net._http_response order by created desc limit 5;
