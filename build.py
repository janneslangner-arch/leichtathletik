#!/usr/bin/env python3
"""Baut aus index.html + assets/ eine einzelne HTML-Datei.

Nötig für die Cloud-Speicherung: Nur wenn Stil und Skript direkt in der Seite
stehen (<style id="appStyle">, <script id="appScript">), kann die App sich
selbst mit den aktuellen Werten neu veröffentlichen.

    python3 build.py [ziel.html] [--fragment]

--fragment lässt Doctype, <html>, <head> und <body> weg (für Umgebungen,
die den Seitenrahmen selbst mitbringen, z. B. Claude-Artifacts).
"""
import pathlib, re, sys

root = pathlib.Path(__file__).parent
args = [a for a in sys.argv[1:] if a != '--fragment']
fragment = '--fragment' in sys.argv
out = pathlib.Path(args[0]) if args else root / 'leichtathletik-tracker.html'

html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'assets/styles.css').read_text(encoding='utf-8')
js = (root / 'assets/app.js').read_text(encoding='utf-8')
sql = (root / 'supabase/schema.sql').read_text(encoding='utf-8')

html = html.replace(
    '<link rel="stylesheet" href="assets/styles.css">',
    '<style id="appStyle">\n' + css + '\n</style>')
# Das SQL-Schema mitliefern, damit der Einrichtungs-Dialog es anbieten kann
html = html.replace('/* SCHEMA_SQL */', sql.replace('</', '<\\/'))
html = html.replace(
    '<script id="appScript" src="assets/app.js"></script>',
    '<script id="appScript">\n' + js + '\n</script>')

if fragment:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
    head = re.sub(r'\s*<(meta|link)\b[^>]*>', '', head)
    html = head.strip() + '\n' + body.strip() + '\n'

out.write_text(html, encoding='utf-8')
print(f'{out} geschrieben ({len(html)} Zeichen)')
