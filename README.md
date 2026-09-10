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
| 200 m Sprint  | s       | `27.40`                  |
| 400 m Sprint  | s       | `62.50`                  |
| 1500 m Lauf   | min     | `5:42` oder kurz `542`   |
| 5000 m Lauf   | min     | `21:30` oder kurz `2130` |
| Speerwurf     | m       | `27.50` oder `2750` (cm) |
| Kugelstoßen   | m       | `8.20` oder `820` (cm)   |

Ganze Zahlen werden als Zentimeter gelesen, sobald sie für Meter unrealistisch
sind (`145` → 1.45 m, aber `2` → 2 m beim Hochsprung). Komma und Punkt sind
beide erlaubt.

## Bedienung

**Erfassen** – Disziplin antippen, Zahl tippen, Enter (oder ✓). Fertig.
Datum und **Uhrzeit** stehen auf jetzt, die zuletzt gewählte Disziplin bleibt
gemerkt. Beides steht danach an der Zeile als „02.06.2026 – 10:34", damit sich
mehrere Versuche desselben Tages auseinanderhalten lassen; sortiert wird
entsprechend.
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

Ein Ergebnis gibt es nur, wenn alle vier Pflichtbereiche abgedeckt sind:

| # | Bereich  | hier verfügbar                 |
|---|----------|--------------------------------|
| 1 | Sprint   | 100 m, 200 m                   |
| 2 | Wurf     | Kugelstoßen, Speerwurf         |
| 3 | Sprung   | Hochsprung, Weitsprung         |
| 4 | Langlauf | Jungen 1500 m / 5000 m, Mädchen 800 m / 2000 m |

Die fünfte Disziplin ist frei und wird dort eingesetzt, wo sie am meisten
bringt. Der Reiter **Punkte** listet die vier Bereiche einzeln auf und
markiert rot, welcher noch keinen Wert hat – ohne den kommt keine Note
zustande.

**200 m** hat in keiner Vorlage Beiwerte – sie sind aus unserer eigenen
Bewertungstabelle gerechnet. Dort steht je Notenpunkt-Zeile eine 100-m- und
eine 200-m-Zeit; aus der 100-m-Zeit folgt mit den Beiwerten oben die
DLV-Punktzahl der Zeile, und `a`/`c` für 200 m sind so bestimmt, dass die
200-m-Zeit derselben Zeile dieselbe Punktzahl ergibt (Ausgleichsgerade über
alle 15 Zeilen, Abweichung unter 4 Punkten). Zum Vergleich: In der
Fünfkampf-Summe sind 70 (Jungen) bis 85 (Mädchen) Punkte ein Notenpunkt, in
der Einzelnote 14 bzw. 17 – direkt an einer Notengrenze kann 200 m also einen
Notenpunkt neben 100 m liegen, nie mehr. Geprüft wird das Zeile für Zeile
über die Oberfläche.

**400 m** kann man eintragen und im Verlauf verfolgen, gewertet wird es
nicht: In unserer Bewertungstabelle steht ausdrücklich „Nicht aufgeführt:
400m Sprint“. Ohne diese Zeile gäbe es nur geratene Punkte. Sobald die Zeiten
da sind, kommt 400 m in `DLV` und in die Gruppe `Sprint` – mehr ist nicht zu
tun. Diskuswurf steht in der Tabelle, wird bei uns aber nicht geworfen.
Mädchen laufen laut Vorlage 800 m statt 1500 m und 2000 m statt 5000 m; die
Zeile heißt weiterhin so, gerechnet wird mit den Beiwerten der tatsächlich
gelaufenen Strecke, und die App schreibt es an die Zeile. Die App probiert alle vier Möglichkeiten durch
und nimmt die beste Summe; oben stehen nur die fünf Zeilen, die zählen.
Aus der Summe kommt die Bewertung in Notenpunkten (15 NP = 1+, 0 NP = 6)
nach der SH-Tabelle unter `NOTENPUNKTE`. Ausgeklappt („Alle Disziplinen")
stehen alle gewerteten Disziplinen und dazu, was jede Leistung einzeln wäre
– dieselbe Tabelle, geteilt durch fünf. Ganz unten und blass steht, was sich
zwar erfassen lässt, aber keine Punktetabelle hat (400 m).

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
Kacheln, ein Tipp genügt. Danach kommt kurz das Abgleich-Fenster: Was auf
diesem Gerät liegt, geht raus, der Stand der anderen kommt herein. So sieht
man beim Wechseln sofort, was die anderen eingetragen haben.

Das Abgleich-Fenster zeigt einen Ring aus mehreren Lagen: außen ein
Halbton-Kranz aus 40 Punkten, darin ein feinerer aus 56, ein Strichkranz
aus 60 Strichen und zwei unterbrochene Bögen. Die Lagen drehen
unterschiedlich schnell und teils gegenläufig; in der Mitte steht ruhig,
worauf gewartet wird – beim Profilwechsel „Profil wechseln", darunter der
Name. Alle Koordinaten stammen aus einem Skript, damit die Punkte exakt auf
dem Kreis sitzen. Der Ring kommt klein und unscharf herein und wächst in 0,8 s auf
Normalmaß; ist der Abgleich fertig, wächst er auf das Fünfeinhalbfache,
wird unscharf und verschwimmt mit der Seite darunter. Er bleibt mindestens
eine Sekunde stehen, damit er nicht aufblitzt – insgesamt rund 2,1 s.
Unter dem Ring steht beim Wechseln groß **Moin _Name_**: der Gruß in der
Textfarbe, der Name in der Farbe des Profils.

Damit beides nebeneinander funktioniert, läuft der Auftritt als Animation
**ohne** `fill-mode` – sonst hielte sie den Endzustand fest und der Abgang
(ein `transition`) käme nicht mehr durch. Über der Eingabe steht danach „Hallo
<Name>“. Jedes Profil hat eigene Werte; beim Umbenennen wandern sie mit,
zusammen mit den Einstellungen (Wertung, Farbe, Muster).

Die Kacheln stehen **alphabetisch** und tragen die Farbe des jeweiligen
Profils – so erkennt man sich schon am Farbfleck. Der Grund dahinter ist
bewusst neutral und folgt nicht dem Farbschema, damit die Kacheln
herausstechen: im hellen Modus fast weiß, im dunklen fast schwarz.

**Profil löschen** – bewusst versteckt: nur in den Einstellungen des
Profils, das gelöscht werden soll, ganz unten in einem zugeklappten
Abschnitt und erst nach einer Rückfrage. In der Profilliste steht der Knopf
nicht mehr neben dem zum Wechseln. Danach lässt sich das Löschen einmal
über „Rückgängig" umkehren; ist es das letzte Profil, geht es gar nicht.

**Modus** – Hell, Dunkel oder Automatisch. Hell ist der Normalfall: weißer
Grund, fast schwarze Schrift, Flächen durch Konturen getrennt statt durch
Grautöne – draußen auf dem Sportplatz ist das am besten zu lesen. Dunkel
dreht dieselben Marken um. Automatisch folgt der Einstellung des Geräts und
zieht sofort nach, wenn sie sich dort ändert. Die Wahl gehört zum Profil,
gilt also auf jedem Gerät.

**Farbe** – zehn Akzentfarben (Mint, Limette, Aqua, Cyan, Blau, Violett,
Magenta, Koralle, Orange, Gold). Jedes Schema wird aus einem Farbton
berechnet: Grund, Flächen, Linien, Text und Akzent kommen aus derselben
Quelle, deshalb bleibt keine Farbe zurück.

Der Akzent wird **gerechnet, nicht geraten**: Ein fester Helligkeitswert
reicht nicht, weil Gelb bei 50 % auf Weiß kaum zu sehen ist und Blau bei
50 % kräftig. Die Farbe wandert deshalb so weit, bis sie 4,6:1 zur Fläche
hat (dieselbe Formel, mit der Barrierefreiheit gemessen wird), und keinen
Schritt weiter – Farbton und Buntheit bleiben. Im hellen Modus geht es
abwärts, im dunklen aufwärts: Ein tiefes Violett bei 66 % ist auf der
dunklen Karte knapp zu wenig und wird leicht aufgehellt. Reines Weiß bleibt
dabei reines Weiß. `modustest.js` misst das für alle zehn Farben in beiden
Modi nach, dazu Schrift, Nebentext und Warnfarbe.

**Eigene Farbe** – bis zu **fünf je Profil**, jederzeit wieder löschbar über
das ✕ auf der Kachel. Gespeichert wird nur der Farbton; Grund, Flächen,
Linien und Text rechnet dieselbe Funktion daraus wie bei den vorgegebenen
Farben. Deshalb bleibt die Schrift lesbar, auch wenn jemand ein sehr dunkles
Blau wählt. Das Limit hält die gespeicherte Datenmenge klein.

**Verlauf** – sieben Farbverläufe über dem Grund: Keiner, Sonnenlicht
(Licht steigt vom unteren Rand), Nordlicht (zwei versetzte Schleier), Tiefe
(heller Kern, dunkle Ränder), Bahnkurve (schräger Streifen), Zweiklang
(Akzent oben, Gegenfarbe unten) und Flutlicht (Lichtkegel von oben). Alle
sind aus `--mint` und `--bg-glow` gebaut, passen sich also jeder Farbe an –
auch einer selbst angelegten. Zweiklang holt sich die Gegenfarbe über
`hsl(from …)`; wo der Browser das nicht kann, greift eine schlichtere
Fassung.

**Hintergrund** – zehn Muster (Schlicht, Raster, Punkte, Laufbahn, Wellen,
Karo, Waben, Konfetti, Höhenlinien, Strahlen), alle aus CSS-Verläufen in der
jeweiligen Akzentfarbe – ohne Bilddateien. Muster liegen über dem Verlauf,
beides lässt sich kombinieren.

Farbe, Verlauf und Muster gehören zum **Profil**, nicht zum Gerät: beim
Wechseln wechselt auch das Aussehen mit. **Und es gilt überall** – die
Auswahl liegt in der Datenbank (Spalte `aussehen` an der Tabelle `profile`)
und kommt bei jedem Abgleich mit. Stellt Levin auf seinem Handy Rot ein, ist
er auch auf allen anderen Geräten rot; eigene Farben wandern mit.

In derselben Spalte steht die **Wertung**: Tabelle, Geburtsjahr,
Zeitmessung und Altersklasse. Das ist der wichtigere Teil – liefe ein Gerät
mit anderer Tabelle, käme für dieselben Leistungen eine andere Note heraus.
Der Inhalt der Spalte ist freies JSON, ein weiteres Feld braucht deshalb
kein neues SQL.

Beim Anlegen wird ausgelost: eine Farbe und ein Verlauf. Farben, die andere
Profile schon haben, werden dabei übersprungen, solange noch welche frei
sind – so unterscheiden sich die Kacheln in der Auswahl von allein. Ändern
lässt sich beides jederzeit.

Steht für ein Profil in der Datenbank noch nichts, dieses Gerät hat aber
eine Wahl gespeichert, schiebt die App sie beim nächsten Abgleich einmal
hoch. Ohne das bliebe nach dem Anlegen der Spalte jedes Gerät bei seinem
alten Stand, weil nur Änderungen gesendet werden. Öffnen mehrere Geräte
gleichzeitig mit unterschiedlicher Wahl, gewinnt das letzte.

Läuft in der Datenbank noch das alte Schema ohne `aussehen`, merkt die App
das am Fehler, hört auf zu fragen und behält die Wahl auf dem Gerät –
Werte gehen davon nicht verloren. **Verbindung prüfen** sagt in dem Fall
ausdrücklich, dass die Spalte fehlt.

Geschrieben wird ausschließlich über `setzeEinstellung`; die eine Stelle
schickt auch zum Server. Wer daran vorbei in den Speicher schreibt, baut
genau den Fehler wieder ein, den `wertungdbtest.js` fängt.

Gelöschtes lässt sich sofort über „Rückgängig" in der Meldung zurückholen –
das gilt für einzelne Werte und für ganze Profile.

## Lehreransicht

Die Lehreransicht hängt an **keinem Profil**. Sie läuft neben den Schülern
her: eigener Reiter „Klasse" mit allen Schülern auf einer Seite (Bestwerte,
Summe, Note, kleine Verlaufskurve, aufklappbare Entwicklung), und statt
„Profil" heißt der zweite Reiter „Einstellungen".

Hinein kommt man nur über den Schlüssel. Der steht **nicht** in der Seite –
in der Datenbank liegt bloß seine Prüfsumme (`geheim.lehrer_hash`), geprüft
wird in `lehrer_pruefen`. Nach zehn Fehlversuchen macht die Klasse für eine
Stunde zu. Bei Erfolg gibt der Server ein Kürzel aus, das 30 Tage gilt; ein
selbst gesetztes Cookie reicht nicht.

Weil die Ansicht nicht am Profil hängt, fehlen dort **Wertung, Aussehen und
Profil löschen** – das gehört zu einem Schülerprofil. Stattdessen steht oben
in den Einstellungen **„Zur Schüleransicht"**. Der Knopf löscht die Sitzung
auch in der Datenbank (`lehrer_abmelden`), nicht nur das Cookie: Wer danach
wieder in die Lehreransicht will, muss den Schlüssel neu eingeben – ein
zurückgeholtes Cookie nützt nichts mehr. `lehrertest.js` prüft genau das.

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

**Warnung beim Eintippen:** Steht derselbe Wert für dasselbe Profil am
selben Tag schon drin, fragt die App vor dem Speichern nach – schwarz-rot,
mit der Uhrzeit des vorhandenen Werts („eingetragen um 14:20 Uhr"). Zwei
Leute, die denselben Sprung eintragen, merken das dadurch sofort. Zwei
echte Versuche mit demselben Ergebnis gehen über „Trotzdem eintragen"
weiterhin durch; die Bestätigung gilt nur für diesen einen Wert.

## Datenbank einrichten (Supabase, kostenlos)

1. Auf [supabase.com](https://supabase.com) anmelden und ein Projekt anlegen.
2. Links **SQL Editor** öffnen, `supabase/schema.sql` einfügen, **Run** drücken.
3. Unter **Project Settings → API** die *Project URL* und den *anon public* Key
   kopieren.
4. Beides zusammen mit einem frei gewählten `code` in `index.html` bei
   `id="appConfig"` eintragen:

```html
<script id="appConfig" type="application/json">
{"url":"https://abcdefgh.supabase.co","key":"eyJhbGciOi…","code":"q2sp2026"}
</script>
```

Steht der `code` in der Seite, ist die Verbindung **fest**: In den
Einstellungen gibt es dann weder „Verbindung ändern" noch „Trennen", nur
„Jetzt abgleichen" und „Verbindung prüfen". Letzteres fragt die Datenbank
einmal wirklich an und sagt im Klartext, was zurückkommt – Serverfehler,
blockierte Anfrage oder pausiertes Projekt.

Kommt eine Spalte dazu – etwa `zeit` für die Uhrzeit – genügt es, das
Skript im SQL-Editor erneut laufen zu lassen; es ist so geschrieben, dass
das gefahrlos geht (`add column if not exists`). Solange das nicht passiert
ist, merkt die App am Fehler der Datenbank, dass die Spalte fehlt, und
schickt die Werte ohne Uhrzeit weiter – gespeichert wird also in jedem Fall.

### Wie der Zugriff geschützt ist

Die Tabellen sind für den öffentlichen Key komplett gesperrt (RLS ohne
Policy). Gelesen und geschrieben wird nur über Funktionen, die jedes Mal den
Klassen-Schlüssel prüfen (`supabase/schema.sql`). Andere Gruppen kommen an
eure Werte also nicht heran – wohl aber jeder, der eure Seite öffnet.

## Für andere veröffentlichen

Es gibt **genau eine** Version: die Website. Sie hängt an der
Klassen-Datenbank, alle sehen denselben Bestand, und niemand muss sich
anmelden. Andere Kopien – etwa eine eingebettete Seite ohne Datenbank – sind
absichtlich nicht im Umlauf: zwei Stände, die auseinanderlaufen, sind
schlimmer als einer.

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

## Aussehen

Weißer Grund, fast schwarze Schrift, **klare Kanten** – nichts ist gerundet
außer den Punkten, die als Zeichen gemeint sind (der Punkt hinter jeder
Überschrift, der Statuspunkt in der Kopfzeile, die Farbkreise).

Der Grund ist Weiß, die Flächen darauf sind es nicht: Karte 96,5 %,
Eingabefeld 92,5 %, dazu eine sichtbare Haarlinie. Ohne diese drei Stufen
verschwimmt alles zu einem Blatt Papier – eine Kontur allein trägt nicht,
wenn die halbe Seite aus Karten besteht. `modustest.js` misst deshalb auch,
dass Fläche und Grund auseinanderliegen, und alle Kontraste gleich
doppelt: gegen den Grund **und** gegen die Fläche, auf der der Text
tatsächlich steht.

Vorher lag auf jeder Fläche ein Glanzverlauf und darunter ein Schatten. Das
sieht auf Anhieb teuer aus und nach dem dritten Blick nach Baukasten – beides
ist raus. Tiefe gibt es nur noch, wo wirklich etwas über der Seite liegt:
Vollbild, Dialog, Meldung. Ein **Schimmer** läuft schräg über den
Speichern-Knopf, wenn man ihn berührt: kein Dauerglanz, ein Lebenszeichen.

Die Überschrift trägt die Seite: groß, eng gesetzt (`letter-spacing: -.04em`),
mit einem Punkt am Ende. Auf der Punkteseite steht die Summe in derselben
Größe, dahinter ein angeschnittener Kreis – der einzige Kreis im ganzen
Design, deshalb fällt er auf.

## Glas unter dem Zeiger

Am Rechner liegt unter dem Zeiger **ein einziger Glaskörper** – nicht auf
jeder Fläche einer. Er wandert von Kachel zu Kachel, verformt sich dabei
und zieht sich in Fahrtrichtung in die Länge, so wie ein Tropfen es täte.
Das ist der ganze Unterschied zu einem gewöhnlichen Hover-Effekt: Dort
verlischt etwas hier und geht dort neu an; hier bewegt sich ein
Gegenstand.

**Wo er liegt.** Die Linse hängt im Behälter der Fläche – im Kachelraster,
in der Liste, in der Kopfzeile –, und zwar als dessen erstes Kind. Damit
malt sie über den Grund des Behälters (sonst verschwände sie hinter einer
Karte), aber unter den Flächen selbst: Die tragen alle
`position: relative` und kommen im Dokument nach ihr, werden also über
sie gezeichnet. **Die Schrift bleibt dadurch scharf und ungetrübt** – der
Weichzeichner sieht nur, was hinter dem Glas liegt, nie den Text darauf.
Die berührte Fläche selbst wird durchsichtig und gibt nur noch Schrift
und Kontur her.

**Wie er sich bewegt.** Nicht mit CSS-Übergängen. Die fangen bei jedem
neuen Ziel von vorn an – fährt man schnell über mehrere Kacheln, sieht
man genau das, ein Stocken bei jedem Wechsel. Stattdessen rechnet das
Skript in jedem Bild eine gedämpfte Feder (ω₀ ≈ 13, ζ ≈ 0,66, dieselbe
wie in der CSS) für fünf Größen zugleich: x, y, Breite, Höhe und Radius.
Eine Feder lässt sich jederzeit unterbrechen und umlenken, ohne neu zu
beginnen – deshalb bleibt die Bewegung auch bei hastigen Zeigern
zusammenhängend. Für einen langen Weg braucht sie genauso lange wie für
einen kurzen, sie wird nur schneller.

**Die Dehnung** hängt allein an der Geschwindigkeit und steht außerhalb
der Feder: quer zur Fahrt schrumpft der Körper um knapp die Hälfte
dessen, was er in Fahrtrichtung zulegt. Sobald er steht, ist sie von
selbst wieder weg.

**Die Lücke zwischen zwei Kacheln** hätte das Ganze fast zunichtegemacht:
Wer zügig hinüberfährt, ist einen Moment lang auf keiner von beiden
Flächen. Ohne Gnadenfrist gäbe die Linse dort auf und finge am Ziel neu
an – aus dem Wandern würde ein Sprung. Sie wartet deshalb 150 ms, ob
gleich etwas Neues kommt. Innerhalb desselben Behälters wird gewandert,
beim Wechsel der Gruppe an Ort und Stelle auf- und abgeblendet.

**Die Form** entscheidet die CSS, ausrechnen kann sie nur der Browser:
Jede Fläche sagt über `--glas-rund`, was sie sein will – `999px` heißt
„so rund es geht" (Kapsel), `24px` macht eine weiche Fliese. Die Linse
liest das aus und setzt für die Kapsel die halbe kürzere Seite ein. Das
ist wichtig, weil `border-radius: 999px` vom Browser ohnehin dort gekappt
wird: Als Ziel eines Übergangs wäre die Verwandlung nach 2 % der Strecke
vorbei – die Ecke schnappte in 20 ms um, während alles andere noch liefe.

**Licht und Kante.** Der helle Fleck sitzt beim Zeiger, nicht in der
Mitte. Weil die Linse dem Zeiger nachläuft, wandert er von selbst über
die Fläche – dafür braucht es keine zweite Feder. Aus seiner Lage folgen
`--neig-x/--neig-y` und daraus die Richtung des inneren Scheins: Die dem
Licht zugewandte Kante hellt auf, die abgewandte bekommt den Schatten.

**Auch das Auf- und Abblenden** rechnet das Skript selbst statt es der
CSS zu überlassen: Als Übergang hing es daran, dass der Browser überhaupt
Bilder zeichnet – bei Tastaturbedienung läuft aber keine Schleife, und
dann blieb die Deckung mitten im Verlauf stehen. Jetzt hat alles dieselbe
Uhr: Ankommen in 0,2 s, Verlassen in 0,34 s.

**Gedrückt** sinkt die Linse auf 97,5 % und federt zurück; die Fläche
darunter bewegt sich nicht. **Mit der Tabulatortaste** wandert sie
genauso mit, dann sitzt das Licht mittig statt beim Zeiger.

**Wo es sie nicht gibt:** auf Berührungsgeräten (dort zählt der
Druckpunkt), im schmalen Fenster, bei `prefers-reduced-motion` – und über
farbigen Knöpfen (Speichern, aktiver Umschalter, aktuelles Profil). Die
sind undurchsichtig, dahinter wäre Glas nur unsichtbar; dort zieht die
Linse sich zurück und der Knopf behält seinen eigenen Auftritt.

**Ohne Skript** bleibt alles beim Alten: Dann fehlt `body.glas-linse`,
und die reine CSS-Fassung greift, in der jede Fläche für sich zu Glas
wird. Dasselbe gilt bei „weniger Bewegung".

### Wo man die Stärke einstellt

Alles in `assets/app.js`, oben in `richteGlasEin()`:

| Was | Marke |
| --- | --- |
| Schwung und Überschwingen | `OMEGA` (Eigenfrequenz), `ZETA` (Dämpfung, unter 1 schwingt über) |
| Wie weit die Linse über die Fläche hinauswächst | `HEBEN` |
| Wie tief sie beim Klicken einsinkt | `DRUCK` |
| Wie stark sie sich unterwegs dehnt | `DEHNUNG` |
| Gnadenfrist über der Lücke | die 150 ms in `uebernehmen` |

In `assets/styles.css`, im Block `.glaslinse`:

| Was | Wo |
| --- | --- |
| Weichzeichnung und Sättigung | `blur(18px) saturate(150%)` |
| Tönung des Glases | `color-mix(in srgb, var(--surface) 34%, transparent)` |
| Größe des Lichtflecks | die `240px` im `radial-gradient` |
| Helligkeit, Kante, Ring, Schein | die `--glas-*`-Marken (in `app.js` je Modus gesetzt) |
| Auf- und Abblenden | die beiden Zeiten in `takt` (0,2 s hin, 0,34 s zurück) |
| Form je Fläche | `--glas-rund` an der jeweiligen Fläche |
| Ab wann es das gibt | `(min-width: 1000px) and (orientation: landscape) and (hover: hover) and (pointer: fine)` |

Die Feder für den gleitenden Knopf im Umschalter (`--feder` in der CSS)
ist dieselbe Rechnung, nur als Kurve vorausberechnet – siehe
`werkzeug/feder.py`.

## Zwei Formen, eine Regel

Nach dem Umbau auf Glas gilt in der **Schüleransicht**: Was man *anfasst*,
ist eine Kapsel – Balken in einer Liste, Chips, Knöpfe, der Profilknopf,
der Speichern-Haken (der wird zum Kreis). Was etwas *trägt*, behält klare
Kanten – Karten, Disziplin-Kacheln, Eingabefelder, Tabellen, Reiter. So
bleibt die Seite in Ordnung und wirkt trotzdem nicht wie ein Formular. Es
ist außerdem dieselbe Form, die der Glaskörper unter dem Zeiger annimmt:
Beides zusammen wirkt wie aus einem Guss.

`modustest.js` hält beide Hälften der Regel fest – Kapseln müssen rund
sein, Karten dürfen es nicht.

## Die Lehreransicht ist mit Absicht anders

Sie ist ein Arbeitsgerät, keine Spielwiese. Deshalb ist sie **schwarz auf
Weiß oder weiß auf Schwarz und sonst nichts**:

* **Keine Farbe.** Dieselbe Palette wie sonst, nur mit Sättigung null
  gerechnet (`lehrerVars()` in `assets/app.js`). Der Akzent ist nicht
  bunt, sondern die kräftigste Stufe der Schrift – alle Kontraste bleiben
  also erhalten. Auch das Warnrot fällt weg: „fehlt" erkennt man an der
  Kontur, nicht an der Farbe.
* **Kein Muster, kein Verlauf.** Der Hintergrund ist eine ruhige Fläche.
* **Kein Glas.** Der wandernde Körper bleibt aus, es gibt keinen Schimmer
  und keine Kapseln – alles eckig.
* **Hell, dunkel oder automatisch** kann der Lehrer wählen; der Schalter
  steht unter *Darstellung* und gilt für beide Rollen. Alles andere am
  Aussehen bleibt der Schüleransicht vorbehalten.

Die Tabelle hat mehr Luft bekommen, jede zweite Zeile einen Hauch Grund
(bei zwölf Spalten hilft das dem Auge), und die Kopfzeile nennt die
Gruppe.

## Welche Gruppe? Steht oben links

Die Ecke über der Leiste war leer. Jetzt steht dort das Kürzel der Gruppe
in einer kleinen Kapsel – „Q2" –, und wenn die Leiste ausfährt, steht ihr
ganzer Name oben in der Leiste: „Q2 SPORTPROFIL 26/27". In der
Klassenansicht steht er außerdem in der Kopfzeile über der Tabelle.

Woher der Name kommt: aus der **eingebetteten Konfiguration** der Seite,
dort, wo auch der Zugangscode steht:

```html
<script id="appConfig" type="application/json">
{"url": "…", "key": "…", "code": "q2sp2026", "name": "Q2 Sportprofil 26/27"}
</script>
```

So trägt jede veröffentlichte Fassung ihren eigenen Namen, ohne dass
dafür etwas in der Datenbank stehen muss. Fehlt der Name, tritt der Code
an seine Stelle; ohne Datenbank bleibt die Ecke leer.

## Schmal, breit, quer

Entschieden wird nach **Breite und Ausrichtung**, nicht nach Gerät: Ein
geteiltes Fenster am Rechner ist schmal wie ein Handy und soll auch so
aussehen, ein iPad quer ist so breit wie ein kleiner Laptop.

Bis 1000 px und im Hochformat bleibt alles, wie es ist: Reiterleiste unten,
Inhalt in einer Spalte. Das gilt für Handy und iPad hochkant.

**Die Leiste schiebt den Inhalt nicht.** Er richtet sich nach der
*zugeklappten* Breite (72 px) und bleibt dann stehen; fährt die Leiste
aus, legt sie sich darüber – ob per Zeiger oder per Knopf. Vorher rutschte
die halbe Seite zur Seite, sobald man das Menü öffnete, und das sah aus,
als sei etwas verrutscht. Auch das Ausfahren selbst ist ruhiger geworden:
Eine Schublade wippt nicht, also zieht sie jetzt an einer ruhigen Kurve
auf statt an der überschwingenden Feder.

Ab **1000 px im Querformat** (iPad quer, Rechner) wandert die Leiste an den
linken Rand: 72 px schmal, nur Symbole. Ein Knopf oben klappt sie auf 212 px
aus, dann steht die Beschriftung daneben; der Zustand bleibt auf dem Gerät
(`la-leiste`, gehört zum Komfort). Zugeklappt ist die Beschriftung nicht
weg, sondern nur unsichtbar – Vorlesehilfen finden sie weiter. Der Balken,
der den aktiven Reiter markiert, sitzt dann links an der Kante statt oben.

Wo ein **echter Zeiger** im Spiel ist (`hover: hover` und `pointer: fine`,
also am Rechner), fährt die Leiste schon aus, wenn die Maus darüberfährt –
und legt sich dabei **über** den Inhalt, statt ihn wegzuschieben. Sonst
rutschte die halbe Seite zur Seite, nur weil die Maus vorbeikommt. Wer sie
festhalten will, klappt sie mit dem Knopf auf; dann rückt der Inhalt mit.
Auf dem iPad gilt das ausdrücklich nicht: Safari hält den Hover-Zustand
nach einer Berührung fest, die Leiste hinge nach jedem Tippen offen.

Drei Sachen machen die Bewegung aus:

- **Glas.** Die Fläche ist durchscheinend, was darunter liegt, wird
  weichgezeichnet (`backdrop-filter`). Wo der Browser das nicht kann, bleibt
  sie schlicht deckend – deshalb steht die volle Farbe zuerst und die halbe
  nur in einem `@supports`.
- **Licht unter dem Zeiger.** Ein weicher Schein folgt der Maus. Das Skript
  meldet nur die Höhe (`--maus-y`), gezeichnet wird in CSS; gedrosselt auf
  ein Bild pro Frame.
- **Ein Balken, der wandert.** Statt an jedem Reiter einen, der an- und
  ausgeht, gibt es einen einzigen, der zum aktiven Reiter gleitet – mit
  einem Hauch Überschwingen (`cubic-bezier(.34, 1.32, .38, 1)`). Beim
  Umschalten der Ansicht und beim Drehen steht er sofort richtig, statt
  durch die halbe Leiste zu fliegen.

Ob die Leiste links steht, entscheidet **allein die CSS-Abfrage**. Das
Skript kennt nur „auf" oder „zu" und setzt eine Klasse am `body` – so gibt
es keine zweite Wahrheit, die auseinanderlaufen könnte. Die Höhe der
Kopfzeile, unter der die Leiste beginnt, wird gemessen statt geraten
(`--kopf`). `leistetest.js` misst alle Fälle nach: Handy, iPad hoch,
schmales Fenster, iPad quer, Rechner – dazu Ausfahren beim Darüberfahren,
dass der Inhalt dabei stehen bleibt, dass auf Berührungsgeräten nichts von
allein ausfährt, und dass der Balken wandert statt zu springen.

## Schrift

**Montserrat**, aus `assets/fonts/` – geometrisch gebaut, weite Versalien,
kräftige Schnitte bis 900. Genau das trägt die großen Überschriften, um die
herum dieses Design gebaut ist. Zwei woff2-Dateien als variable Schrift für
alle Stärken von 400 bis 900; die zweite (latin-ext) lädt der Browser nur,
wenn ein Zeichen daraus vorkommt. Umlaute stecken schon in der ersten.

Sie steht **vor** der Systemschrift, nicht dahinter. Vorher war es
umgekehrt: Auf dem iPhone lief die App in San Francisco, auf Android in
etwas anderem – dieselbe App sah auf jedem Gerät anders aus und nach nichts
Eigenem. Eine zweite mitgelieferte Schrift als Rückfall gibt es nicht mehr:
Sie käme aus derselben Datei­ablage und wäre dasselbe Format, würde also
genau dann fehlen, wenn Montserrat fehlt.

Die Schrift liegt im Projekt statt bei Google: kein fremder Server, keine
Wartezeit, und sie ist auch ohne Netz da. `build.py` bettet sie für die
Einzeldatei als data-URI ein.

**Nach jeder Änderung: stempeln.** Browser halten `assets/app.js` und
`assets/styles.css` sonst tagelang im Zwischenspeicher fest, und die
Änderung kommt auf dem Handy schlicht nicht an. Deshalb vor dem Push:

```
python3 build.py --stamp
```

Das hängt einen Fingerabdruck des Inhalts an die Verweise
(`assets/app.js?v=9aa2ce0e`). Ändert sich die Datei, ändert sich die
Adresse – und der Browser holt sie neu.

**Auf eigenem Webspace.** Genauso: `index.html`, `assets/` und
`supabase/schema.sql` hochladen – oder die Einzeldatei aus `python3 build.py`.
Diese Einzeldatei ist als Sicherung gedacht, nicht als zweite Adresse zum
Weitergeben.

Browser-Dialoge (`confirm`, `prompt`) werden bewusst nicht benutzt – in
eingebetteten Seiten sind sie blockiert. Nachfragen laufen deshalb über
eigene Dialoge und die Rückgängig-Meldung.
