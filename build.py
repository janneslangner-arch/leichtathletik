#!/usr/bin/env python3
"""Baut aus index.html + assets/ eine einzelne HTML-Datei.

Nötig für die Cloud-Speicherung: Nur wenn Stil und Skript direkt in der Seite
stehen (<style id="appStyle">, <script id="appScript">), kann die App sich
selbst mit den aktuellen Werten neu veröffentlichen.

    python3 build.py [ziel.html] [--fragment] [--no-config]

--fragment    lässt Doctype, <html>, <head> und <body> weg (für Umgebungen,
              die den Seitenrahmen selbst mitbringen, z. B. Claude-Artifacts).
--no-config   entfernt die hinterlegte Datenbank-Verbindung. Nötig für
              Claude-Seiten: Die dürfen keine Verbindung nach außen aufbauen,
              dort wäre die Verbindung nur eine Fehlerquelle.
"""
import hashlib, pathlib, re, sys

root = pathlib.Path(__file__).parent


def stempeln():
    """Schreibt einen Kurz-Fingerabdruck der Dateien in die Verweise in
    index.html: assets/app.js?v=ab12cd34. Ohne das liefern Browser nach
    einer Änderung tagelang die alte Datei aus dem Zwischenspeicher aus."""
    seite = root / 'index.html'
    html = seite.read_text(encoding='utf-8')
    neu_html = html
    for datei in ('assets/styles.css', 'assets/app.js'):
        kurz = hashlib.sha256((root / datei).read_bytes()).hexdigest()[:8]
        neu_html = re.sub(re.escape(datei) + r'(\?v=[0-9a-f]+)?',
                          datei + '?v=' + kurz, neu_html)
    if neu_html != html:
        seite.write_text(neu_html, encoding='utf-8')
        print('index.html gestempelt')
    else:
        print('Stempel schon aktuell')
    return neu_html


if '--stamp' in sys.argv:
    stempeln()
    if len(sys.argv) == 2:
        raise SystemExit(0)

schalter = ('--fragment', '--no-config', '--stamp')
args = [a for a in sys.argv[1:] if a not in schalter]
fragment = '--fragment' in sys.argv
ohne_config = '--no-config' in sys.argv
out = pathlib.Path(args[0]) if args else root / 'leichtathletik-tracker.html'

html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'assets/styles.css').read_text(encoding='utf-8')
js = (root / 'assets/app.js').read_text(encoding='utf-8')
sql = (root / 'supabase/schema.sql').read_text(encoding='utf-8')

html = re.sub(r'<link rel="stylesheet" href="assets/styles\.css(\?v=[0-9a-f]+)?">',
              lambda m: '<style id="appStyle">\n' + css + '\n</style>', html)
# Das SQL-Schema mitliefern, damit der Einrichtungs-Dialog es anbieten kann
html = html.replace('/* SCHEMA_SQL */', sql.replace('</', '<\\/'))
html = re.sub(r'<script id="appScript" src="assets/app\.js(\?v=[0-9a-f]+)?"></script>',
              lambda m: '<script id="appScript">\n' + js + '\n</script>', html)

if ohne_config:
    html = re.sub(r'(<script id="appConfig" type="application/json">).*?(</script>)',
                  r'\1null\2', html, flags=re.S)

if fragment:
    # Nur Titel und Stil aus dem Kopf übernehmen; Rahmen, meta und Favicon
    # stellt die Artifact-Umgebung selbst. Der Körper geht bis zum LETZTEN
    # </body> – im App-Code steht diese Zeichenfolge sonst als Text.
    titel = re.search(r'<title>.*?</title>', html, re.S).group(0)
    stil = re.search(r'<style id="appStyle">.*?</style>', html, re.S).group(0)
    koerper = html[html.index('<body>') + len('<body>'):html.rindex('</body>')]
    html = titel + '\n' + stil + '\n' + koerper.strip() + '\n'

# Sicherheitsnetz: was hier nicht stimmt, fällt sonst erst im Browser auf
pruefungen = {
    'Gerüst fehlt': '<template id="appShell">' in html,
    'App-Behälter fehlt': '<div id="app"></div>' in html,
    'Stil nicht eingebettet': '<style id="appStyle">' in html,
    'Skript nicht eingebettet': '<script id="appScript">' in html,
    'Skript nicht geschlossen': html.count('<script') == html.count('</script>'),
    'SQL-Schema fehlt': 'create or replace function daten_lesen' in html,
    'Favicon-Rest im Fragment': not fragment or 'data:image/svg+xml' not in html,
    'Kopfzeile fehlt': 'id="profileBtn"' in html,
}
fehler = [name for name, ok in pruefungen.items() if not ok]
if fehler:
    raise SystemExit('Bau abgebrochen: ' + ', '.join(fehler))

out.write_text(html, encoding='utf-8')
print(f'{out} geschrieben ({len(html)} Zeichen)')
