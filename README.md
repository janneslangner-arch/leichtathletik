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

- **Cloud** – läuft die App als Claude-Artifact, sichert die Seite ihren Stand
  selbst: Die Werte stecken in der Seite und sind auf jedem Gerät da, auf dem
  der Link geöffnet wird. Gespeichert wird kurz nach jeder Eingabe; danach lädt
  die Seite einmal neu, Ansicht und Disziplin bleiben erhalten. Eine Kopie
  bleibt zusätzlich im Browser.
- **Gerät** – bei der Datei- oder GitHub-Pages-Version gibt es keinen Server;
  dann wird nur im Browser gespeichert (`localStorage`).

In beiden Fällen: **Sichern (JSON)** legt ein Backup an, **Laden (JSON)** holt
es zurück und führt es mit vorhandenen Werten zusammen (nach ID, ohne
Dubletten), **CSV** öffnet sich in Excel oder LibreOffice.

## Dateien

```
index.html          Aufbau der Seite (Oberfläche liegt in <template id="appShell">)
assets/styles.css   Design (Mint auf Petrol, Helvetica)
assets/app.js       Eingabe-Logik, Speicherung, Diagramme
build.py            baut daraus eine einzelne HTML-Datei
```

Keine Bibliotheken, kein Framework. `python3 build.py` erzeugt
`leichtathletik-tracker.html` – eine einzige Datei zum Verschicken oder
Hochladen; `--fragment` lässt den Seitenrahmen weg (für Claude-Artifacts).
Die Cloud-Speicherung braucht diese Einzeldatei, weil die App sich daraus
selbst neu aufbaut.

Zum Teilen mit der Klasse reicht sonst GitHub Pages:
Repository-Einstellungen → Pages → Branch wählen.

Browser-Dialoge (`confirm`, `prompt`) werden bewusst nicht benutzt – in
eingebetteten Seiten sind sie blockiert. Nachfragen laufen deshalb über
eigene Dialoge und die Rückgängig-Meldung.
