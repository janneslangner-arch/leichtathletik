# Leichtathletik Tracker

Kleine Web-App, um Leistungen im Schulsport festzuhalten und den Fortschritt
im Diagramm zu sehen. Läuft ohne Installation, ohne Server und ohne Konto –
einfach `index.html` im Browser öffnen (Handy, Tablet oder Laptop).

## Disziplinen

| Disziplin     | Einheit | Eingabe-Beispiele        |
|---------------|---------|--------------------------|
| Hochsprung    | m       | `1.45` oder `145` (cm)   |
| Weitsprung    | m       | `4.35` oder `435` (cm)   |
| 100 m Sprint  | s       | `12.85`                  |
| 1500 m Lauf   | min     | `5:42` oder kurz `542`   |
| 5000 m Lauf   | min     | `21:30` oder kurz `2130` |
| Speerwurf     | m       | `27.50` oder `2750` (cm) |
| Kugelstoßen   | m       | `8.20` oder `820` (cm)   |

Ganze Zahlen werden als Zentimeter gelesen, sobald sie für Meter unrealistisch
sind (`145` → 1.45 m, aber `2` → 2 m beim Hochsprung). Komma und Punkt sind
beide erlaubt.

## Bedienung

**Erfassen** – Disziplin antippen, Zahl tippen, Enter (oder ✓). Fertig.
Das Datum steht auf heute, die zuletzt gewählte Disziplin bleibt gemerkt.
Unter der Eingabe steht sofort, wie der Wert gelesen wurde und ob es eine
neue Bestleistung ist. Datum und Notiz lassen sich bei Bedarf aufklappen.

**Verlauf** – Liniendiagramm je Disziplin. Bei Laufzeiten ist die Achse
gedreht, damit „nach oben“ immer „besser“ heißt. Dazu Bestwert, letzter Wert,
Durchschnitt und alle Einzelwerte (löschbar).

**Übersicht** – alle Bestwerte auf einen Blick mit Mini-Verlauf; ein Klick
springt ins passende Diagramm.

**Profile** – oben rechts auf den Namen tippen: anlegen, wechseln, umbenennen,
löschen. Jedes Profil hat eigene Werte; beim Umbenennen wandern sie mit.

Gelöschtes lässt sich sofort über „Rückgängig" in der Meldung zurückholen –
das gilt für einzelne Werte und für ganze Profile.

## Wo die Werte liegen

Das Feld oben rechts neben dem Namen zeigt es an:

- **Datenbank** – eine echte Postgres-Datenbank bei Supabase. Alle, die den
  Klassen-Code eintragen, sehen dieselben Werte und können gleichzeitig
  eintragen. Einrichtung siehe unten.
- **Cloud** – ohne Datenbank und als Claude-Artifact sichert die Seite ihren
  Stand selbst: Die Werte stecken in der Seite und sind auf jedem Gerät da, das
  den Link öffnet. Eine Kopie bleibt zusätzlich im Browser.
- **Gerät** – bei der Datei- oder GitHub-Pages-Version ohne Datenbank wird nur
  im Browser gespeichert (`localStorage`).
- **offline** – keine Verbindung. Eingeben geht weiter, die Änderungen liegen
  in einer Warteschlange und gehen automatisch raus, sobald es wieder klappt.

## Datenbank einrichten (Supabase, kostenlos)

1. Auf [supabase.com](https://supabase.com) anmelden und ein Projekt anlegen.
2. Links **SQL Editor** öffnen, `supabase/schema.sql` einfügen, **Run** drücken.
   (In der App macht das der Knopf „SQL kopieren“ im Verbinden-Dialog.)
3. Unter **Project Settings → API** die *Project URL* und den *anon public* Key
   kopieren.
4. In der App: Übersicht → **Datenbank verbinden**, beides eintragen und einen
   **Klassen-Code** wählen (mindestens 6 Zeichen, z. B. `9b-sport-2026`).

Alle weiteren Geräte brauchen nur denselben Code. Vorhandene Werte vom Gerät
bietet die App beim Verbinden zum Übertragen an.

### Wie der Zugriff geschützt ist

Die Tabellen sind für den öffentlichen Key komplett gesperrt (RLS ohne Policy).
Gelesen und geschrieben wird nur über Funktionen, die jedes Mal den
Klassen-Code prüfen (`supabase/schema.sql`). Ein falscher Code sieht nichts,
ein fremdes Profil lässt sich nicht bespielen, und der Code selbst wird nie in
der Seite gespeichert – er liegt nur auf dem jeweiligen Gerät.

Der Code ist ein gemeinsames Passwort: Wer ihn kennt, sieht alle Werte der
Gruppe und kann sie ändern. Nehmt deshalb einen, den man nicht rät, und
schreibt keine Daten hinein, die nicht die ganze Gruppe sehen soll.

In beiden Fällen: **Sichern (JSON)** legt ein Backup an, **Laden (JSON)** holt
es zurück und führt es mit vorhandenen Werten zusammen (nach ID, ohne
Dubletten), **CSV** öffnet sich in Excel oder LibreOffice.

## Dateien

```
index.html            Aufbau der Seite (Oberfläche liegt in <template id="appShell">)
assets/styles.css     Design (Mint auf Petrol, Helvetica)
assets/app.js         Eingabe-Logik, Speicherung, Diagramme
supabase/schema.sql   Tabellen, Funktionen und Rechte der Datenbank
build.py              baut daraus eine einzelne HTML-Datei
```

Keine Bibliotheken, kein Framework. `python3 build.py` erzeugt
`leichtathletik-tracker.html` – eine einzige Datei zum Verschicken oder
Hochladen; `--fragment` lässt den Seitenrahmen weg (für Claude-Artifacts).
Die Cloud-Speicherung braucht diese Einzeldatei, weil die App sich daraus
selbst neu aufbaut.

## Für andere veröffentlichen

**Als Website (GitHub Pages).** Zuerst einmalig einschalten – das darf nur der
Repository-Besitzer, keine Aktion:

> **Settings → Pages → Build and deployment → Source: „GitHub Actions“**

Danach baut `.github/workflows/pages.yml` bei jedem Push auf `main` oder den
Entwicklungszweig die Seite und stellt sie online, erreichbar unter
`https://<benutzer>.github.io/<repo>/` – ohne Konto, für alle mit dem Link.
Läuft die Aktion vor dem Umlegen des Schalters, bricht sie mit
„Get Pages site failed“ ab; danach genügt **Re-run jobs**.

Ohne Aktion geht es auch: **Settings → Pages → Source: „Deploy from a branch“**,
Branch auswählen, Ordner `/ (root)`. Dann liefert GitHub `index.html` und
`assets/` direkt aus.

Damit Mitschüler:innen nicht URL und Key eintippen müssen: in der App auf
**Datenbank verbinden → Für Website kopieren**, die kopierte Zeile in
`index.html` an der Stelle mit `id="appConfig"` einsetzen und pushen. Dann
fragt die Seite beim ersten Öffnen nur noch nach dem Klassen-Code.

Der Klassen-Code gehört **nicht** ins Repository – er ist das Passwort und
wird nur mündlich weitergegeben.

**Als Claude-Artifact.** Im Artifact oben rechts auf Teilen. Ohne Datenbank
sehen die anderen dann den Stand der Seite, können aber nichts dauerhaft
speichern; mit Datenbank arbeiten alle gemeinsam am selben Datenbestand.

Browser-Dialoge (`confirm`, `prompt`) werden bewusst nicht benutzt – in
eingebetteten Seiten sind sie blockiert. Nachfragen laufen deshalb über
eigene Dialoge und die Rückgängig-Meldung.
