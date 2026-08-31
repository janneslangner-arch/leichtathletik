-- Nur der Lehrerzugang, ohne alles andere.
-- Im SQL-Editor von Supabase einfügen und Run drücken.

create extension if not exists pgcrypto;

-- Zählt die Fehlversuche, damit niemand den Schlüssel durchprobiert.
create table if not exists lehrer_versuche (
  id     bigserial primary key,
  code   text not null,
  wann   timestamptz not null default now(),
  erfolg boolean not null default false
);
alter table lehrer_versuche enable row level security;
revoke all on table lehrer_versuche from anon, authenticated;
create index if not exists lehrer_versuche_idx on lehrer_versuche (code, wann);

-- Falls die Tabelle für die Zugangsdaten noch fehlt
create table if not exists geheim (
  schluessel text primary key,
  wert       text not null
);
alter table geheim enable row level security;
revoke all on table geheim from anon, authenticated;

create or replace function lehrer_pruefen(p_code text, p_schluessel text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
-- Ein falscher Schlüssel wirft absichtlich keine Exception: die würde den
-- Fehlversuch mit zurückdrehen und man könnte endlos weiterraten.
declare v_code text; v_hash text; v_daneben int;
begin
  v_code := lower(btrim(coalesce(p_code, '')));
  if length(v_code) < 6 then
    return jsonb_build_object('ok', false, 'meldung', 'Klassen-Code fehlt');
  end if;

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

grant execute on function lehrer_pruefen(text, text) to anon, authenticated;

-- Die Schnittstelle vor der Datenbank neu einlesen lassen
notify pgrst, 'reload schema';
