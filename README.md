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

Über das Feld oben rechts lassen sich mehrere Sportler:innen anlegen –
jede Person hat ihre eigenen Werte.

## Daten

Gespeichert wird im Browser (`localStorage`), also nur auf dem Gerät, auf dem
die Werte eingegeben wurden. In der Übersicht gibt es deshalb **Sichern
(JSON)** für ein Backup, **Laden (JSON)** zum Zurückholen oder Zusammenführen
und **CSV** für Excel oder LibreOffice.

## Dateien

```
index.html          Aufbau der Seite
assets/styles.css   Design (Mint auf Petrol, Helvetica)
assets/app.js       Eingabe-Logik, Speicherung, Diagramme
```

Kein Build-Schritt, keine Bibliotheken. Zum Teilen mit der Klasse reicht
GitHub Pages: Repository-Einstellungen → Pages → Branch wählen.
