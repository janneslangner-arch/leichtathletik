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
gedreht, damit „nach oben“ immer „besser“ heißt. Darunter in einer Zeile
Bestwert, letzter Wert und Durchschnitt; die Einzelwerte (löschbar) stehen
zum Ausklappen darunter. Die Bestwerte aller Disziplinen stehen ohnehin auf
den Kacheln im Reiter „Erfassen“ – eine eigene Übersichtsseite gibt es
deshalb nicht.

**Punkte** – der Fünfkampf nach der Vorlage `Leichtathletik_Fuenfkampf_SH.xlsx`.

DLV-Punkte je Disziplin aus dem Bestwert:

```
Lauf:  P = abrunden( (Distanz / (Zeit + Handzuschlag) − a) / c )
Feld:  P = abrunden( (√Leistung[m] − a) / c )
```

Handzeit-Zuschlag wie in der Vorlage: bis 300 m +0,24 s, über 300 bis 400 m
+0,14 s, darüber keiner. Die Beiwerte `a` und `c` stehen in `assets/app.js`
unter `DLV`, getrennt nach Jungen und Mädchen.

Gewertet werden fünf Disziplinen: je eine aus Sprint (100 m), Sprung
(Hoch, Weit), Wurf/Stoß (Kugel, Speer) und Langstrecke (1500 m, 5000 m),
die fünfte frei – hier also eine zweite aus Sprung, Wurf oder Langstrecke.
Mädchen laufen laut Vorlage 800 m statt 1500 m und 2000 m statt 5000 m; die
Zeile heißt weiterhin so, gerechnet wird mit den Beiwerten der tatsächlich
gelaufenen Strecke, und die App schreibt es an die Zeile. Die App probiert alle vier Möglichkeiten durch
und nimmt die beste Summe; oben stehen nur die fünf Zeilen, die zählen.
Aus der Summe kommt die Bewertung in Notenpunkten (15 NP = 1+, 0 NP = 6)
nach der SH-Tabelle unter `NOTENPUNKTE`. Ausgeklappt („Alle Disziplinen")
stehen alle sieben und dazu, was jede Leistung einzeln wäre – dieselbe
Tabelle, geteilt durch fünf.

Umschalter für Jungen/Mädchen, Handzeit/elektronisch und die Altersklasse
(U18/U20/U23, bestimmt die angezeigten Gerätegewichte) stehen in den
Einstellungen; die Zeile über der Wertung zeigt sie an und führt hin. Die
Einstellungen gelten je Profil.

Geprüft gegen die Marken der Bewertungstabelle: Weitsprung 5,12 m → 507,
Kugel 10,90 m → 507, Speer 32,31 m → 507, 5000 m 19:05,68 → 507 (Jungen)
sowie Weitsprung 4,13 m → 451, Kugel 9,45 m → 451, 800 m 2:41,90 → 451 und
2000 m 7:52,21 → 451 (Mädchen).

**Profil** – der vierte Reiter hält alles, was nicht Sport ist, und zeigt
selbst nur zwei Zeilen: „Einstellungen" und „Profile verwalten". In den
Einstellungen liegt jeder Bereich (Wertung, Aussehen, Speicherort, Daten) in
einem eigenen Abschnitt zum Ausklappen, damit die Seite kurz bleibt. Die
ersten drei Reiter bleiben so nur beim Sport.

**Profil anlegen** – die gestrichelte Kachel in der Auswahl oder der Knopf im
Profil-Reiter öffnen ein Vollbild und fragen nach **Name, Geburtsjahr und
Wertungstabelle**. Daraus ergeben sich Tabelle und Altersklasse für die
Punkte (16–17 = U18, 18–19 = U20, 20–22 = U23); die passenden Gerätegewichte
stehen schon beim Eintippen darunter.

**Profil wechseln** – oben rechts auf den Namen tippen: ein Vollbild mit
Kacheln, ein Tipp genügt. Über der Eingabe steht danach „Hallo
<Name>“. Jedes Profil hat eigene Werte; beim Umbenennen wandern sie mit.

**Farbe** – zehn Akzentfarben (Mint, Limette, Aqua, Cyan, Blau, Violett,
Magenta, Koralle, Orange, Gold). Jedes Schema wird aus einem Farbton
berechnet: Grund, Flächen, Linien, Text und Akzent kommen aus derselben
Quelle, deshalb bleibt keine Farbe zurück.

**Hintergrund** – zehn Muster (Schlicht, Raster, Punkte, Laufbahn, Wellen,
Karo, Waben, Konfetti, Höhenlinien, Strahlen), alle aus CSS-Verläufen in der
jeweiligen Akzentfarbe – ohne Bilddateien.

Farbe und Muster gelten pro Gerät; jede und jeder in der Klasse kann eine
eigene Kombination haben.

Gelöschtes lässt sich sofort über „Rückgängig" in der Meldung zurückholen –
das gilt für einzelne Werte und für ganze Profile.

## Wo die Werte liegen

Die Seite ist für **eine Klasse** gedacht: Projekt-URL, öffentlicher Key und
der Klassen-Schlüssel stehen fest in `index.html` (`id="appConfig"`). Wer die
Seite öffnet, ist sofort verbunden – **ohne Anmeldung**. Beim ersten Öffnen
fragt die App nur, wer man ist: vorhandenes Profil antippen oder ein neues
anlegen. Das Gerät merkt sich die Wahl.

Das heißt auch: Wer den Link hat, sieht die Werte der Klasse und kann
eintragen. Das ist der Preis dafür, dass sich niemand anmelden muss.

Das Feld oben rechts zeigt den Zustand:

- **Datenbank** – verbunden, alle tragen in denselben Bestand ein.
- **offline** – keine Verbindung. Eingeben geht weiter, die Änderungen liegen
  in einer Warteschlange und gehen automatisch raus, sobald es wieder klappt.
- **Gerät** – ohne hinterlegte Verbindung (etwa beim lokalen Öffnen der
  Datei); dann wird nur im Browser gespeichert.

Abgeglichen wird bei **jedem Aufruf**: beim Öffnen der Seite, beim Zurück-
wechseln zum Tab, beim Aufwecken des Handys und sobald das Netz wieder da
ist. Solange das läuft, deckt ein Vollbild-Fenster den Bildschirm ab –
erst gehen offene Änderungen raus, dann kommt der Stand der anderen herein.

**Keine Dopplungen:** Ein Wert gilt als derselbe, wenn Profil, Disziplin,
Datum und Leistung übereinstimmen; beim Übertragen und beim Laden einer
Datei wird danach abgeglichen.

## Datenbank einrichten (Supabase, kostenlos)

1. Auf [supabase.com](https://supabase.com) anmelden und ein Projekt anlegen.
2. Links **SQL Editor** öffnen, `supabase/schema.sql` einfügen, **Run** drücken.
3. Unter **Project Settings → API** die *Project URL* und den *anon public* Key
   kopieren.
4. Beides zusammen mit einem frei gewählten `code` in `index.html` bei
   `id="appConfig"` eintragen:

```html
<script id="appConfig" type="application/json">
{"url":"https://abcdefgh.supabase.co","key":"eyJhbGciOi…","code":"sportprofil-gam-2027"}
</script>
```

### Wie der Zugriff geschützt ist

Die Tabellen sind für den öffentlichen Key komplett gesperrt (RLS ohne
Policy). Gelesen und geschrieben wird nur über Funktionen, die jedes Mal den
Klassen-Schlüssel prüfen (`supabase/schema.sql`). Andere Gruppen kommen an
eure Werte also nicht heran – wohl aber jeder, der eure Seite öffnet.

## Für andere veröffentlichen

**Als Claude-Artifact.** Es gibt zwei getrennte Seiten: eine private zum
Selbst-Eintragen und eine leere Klassenversion zum Weitergeben. Teilen geht im
Artifact oben rechts über **Teilen**.

Ohne Datenbank können geteilte Betrachter nichts dauerhaft speichern (Anzeige
„nur Ansicht"); mit Datenbank arbeiten alle am selben Bestand. Dafür in der
Klassenversion einmal **Datenbank verbinden** ausfüllen.

Der Klassen-Code gehört **nicht** ins Repository und nicht in die Seite – er
ist das Passwort und wird mündlich weitergegeben.

**Als Website (GitHub Pages).** Die App ist eine statische Seite und braucht
keinen Bau-Schritt – GitHub kann sie direkt ausliefern:

> **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**,
> Branch `main`, Ordner `/ (root)` → **Save**

Nach ein bis zwei Minuten läuft die Seite unter
`https://<benutzer>.github.io/<repo>/`. Jede Änderung auf `main` ist nach
kurzer Zeit automatisch online.

Damit Besucher nicht URL und Key eintippen müssen, legt der Knopf
**Für Website kopieren** im Verbinden-Dialog die passende Zeile für
`id="appConfig"` in die Zwischenablage; die in `index.html` einsetzen und
pushen. Der Klassen-Code bleibt außen vor.

**Auf eigenem Webspace.** Genauso: `index.html`, `assets/` und
`supabase/schema.sql` hochladen – oder die Einzeldatei aus `python3 build.py`.

Browser-Dialoge (`confirm`, `prompt`) werden bewusst nicht benutzt – in
eingebetteten Seiten sind sie blockiert. Nachfragen laufen deshalb über
eigene Dialoge und die Rückgängig-Meldung.
