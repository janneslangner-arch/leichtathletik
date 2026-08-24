/* Leichtathletik Tracker – Daten, Schnelleingabe, Diagramme
   Speicherung: in der Claude-Cloud (die Seite sichert ihren Stand selbst),
   sonst im Browser dieses Geräts. Ohne confirm()/prompt(), weil Browser-
   Dialoge in eingebetteten Seiten blockiert sind. */
(() => {
  'use strict';

  /* ---------------- Disziplinen ---------------- */
  const DISC = {
    hochsprung:   { name: 'Hochsprung',   short: 'Hoch',   ic: 'HOCH',  kind: 'length', better: 'high', unit: 'm', maxM: 3,
                    hint: '1.45 oder 145 (cm)', ph: '1.45' },
    weitsprung:   { name: 'Weitsprung',   short: 'Weit',   ic: 'WEIT',  kind: 'length', better: 'high', unit: 'm', maxM: 10,
                    hint: '4.35 oder 435 (cm)', ph: '4.35' },
    sprint100:    { name: '100 m Sprint', short: '100 m',  ic: '100',   kind: 'sec',    better: 'low',  unit: 's',
                    hint: 'Sekunden, z. B. 12.85', ph: '12.85' },
    lauf1500:     { name: '1500 m Lauf',  short: '1500 m', ic: '1500',  kind: 'mmss',   better: 'low',  unit: 'min',
                    hint: '5:42 oder kurz 542', ph: '5:42' },
    lauf5000:     { name: '5000 m Lauf',  short: '5000 m', ic: '5000',  kind: 'mmss',   better: 'low',  unit: 'min',
                    hint: '21:30 oder kurz 2130', ph: '21:30' },
    speerwurf:    { name: 'Speerwurf',    short: 'Speer',  ic: 'SPEER', kind: 'length', better: 'high', unit: 'm', maxM: 110,
                    hint: '27.50 oder 2750 (cm)', ph: '27.50' },
    kugelstossen: { name: 'Kugelstoßen',  short: 'Kugel',  ic: 'KUGEL', kind: 'length', better: 'high', unit: 'm', maxM: 25,
                    hint: '8.20 oder 820 (cm)', ph: '8.20' }
  };
  const KEYS = Object.keys(DISC);

  /* ---------------- Werte lesen & schreiben ---------------- */
  function parseValue(key, raw) {
    const d = DISC[key];
    const s = String(raw).trim().replace(',', '.');
    if (!s) return null;

    if (d.kind === 'length') {
      // Ganze Zahl über dem plausiblen Meter-Bereich = Zentimeter: 435 -> 4.35 m
      if (/^\d+$/.test(s)) { const n = +s; return !n ? null : n <= d.maxM ? n : n / 100; }
      if (!/^\d+(\.\d+)?$/.test(s)) return null;
      const v = parseFloat(s);
      return v > 0 && v <= d.maxM ? v : null;
    }
    if (d.kind === 'sec') {
      if (!/^\d+(\.\d+)?$/.test(s)) return null;
      const v = parseFloat(s);
      return v > 0 && v < 600 ? v : null;
    }
    let m = s.match(/^(\d{1,3}):([0-5]?\d)(\.\d+)?$/);
    if (m) return (+m[1]) * 60 + (+m[2]) + (m[3] ? parseFloat(m[3]) : 0);
    m = s.match(/^(\d{1,2})(\d{2})$/);                                        // 542 -> 5:42
    if (m) { const sec = +m[2]; return sec > 59 ? null : (+m[1]) * 60 + sec; }
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    return null;
  }

  function fmt(key, v, withUnit = true) {
    const d = DISC[key];
    if (d.kind === 'length') return v.toFixed(2) + (withUnit ? ' m' : '');
    if (d.kind === 'sec')    return v.toFixed(2) + (withUnit ? ' s' : '');
    const min = Math.floor(v / 60), sec = v - min * 60;
    const whole = Math.abs(sec - Math.round(sec)) < 0.005;
    const secTxt = whole ? String(Math.round(sec)) : sec.toFixed(2);
    const t = min + ':' + (sec < 10 ? '0' : '') + secTxt;
    return withUnit ? t + ' min' : t;
  }
  function fmtShort(key, v) {
    const d = DISC[key];
    if (d.kind !== 'mmss') return v.toFixed(2);
    const min = Math.floor(v / 60), sec = Math.round(v - min * 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function fmtDiff(key, delta) {
    const d = DISC[key], a = Math.abs(delta);
    if (d.kind === 'length') return a.toFixed(2) + ' m';
    if (d.kind === 'sec')    return a.toFixed(2) + ' s';
    if (a < 60) return a.toFixed(1) + ' s';
    const min = Math.floor(a / 60), sec = Math.round(a - min * 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec + ' min';
  }
  const isBetter = (key, a, b) => DISC[key].better === 'high' ? a > b : a < b;

  const fmtDate = iso => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y.slice(2)}`; };
  const todayISO = () => {
    const t = new Date(), p = n => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  };

  /* ---------------- Daten ---------------- */
  const STORE = 'la-tracker-v1';
  const blank = () => ({ athletes: ['Ich'], current: 'Ich', entries: [] });
  const valid = o => o && Array.isArray(o.entries) && Array.isArray(o.athletes);

  let db = blank();
  let cloud = null;              // artifact-Fähigkeit, wenn die Seite sie hat
  let sync = 'local';            // local | saving | cloud | error | readonly | conflict
  let localOnly = [];            // Werte, die nur auf diesem Gerät liegen

  function normalize(o) {
    const d = Object.assign(blank(), o);
    d.entries = d.entries.filter(e => e && DISC[e.disc] && typeof e.value === 'number' && e.date);
    d.athletes = d.athletes.filter(a => typeof a === 'string' && a.trim()).slice(0, 60);
    d.entries.forEach(e => { if (!d.athletes.includes(e.athlete)) d.athletes.push(e.athlete); });
    if (!d.athletes.length) d.athletes = ['Ich'];
    if (!d.athletes.includes(d.current)) d.current = d.athletes[0];
    return d;
  }
  function readEmbedded() {
    const tag = document.getElementById('appState');
    if (!tag) return null;
    try { const p = JSON.parse((tag.textContent || '').trim() || 'null'); return valid(p) ? normalize(p) : null; }
    catch (e) { return null; }
  }
  function readLocal() {
    try { const p = JSON.parse(localStorage.getItem(STORE) || 'null'); return valid(p) ? normalize(p) : null; }
    catch (e) { return null; }
  }
  function writeLocal() {
    try { localStorage.setItem(STORE, JSON.stringify(db)); } catch (e) { /* Speicher voll oder gesperrt */ }
  }

  const entriesOf = key => db.entries
    .filter(e => e.athlete === db.current && e.disc === key)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id);
  const countOf = name => db.entries.filter(e => e.athlete === name).length;
  function best(key) {
    const list = entriesOf(key);
    if (!list.length) return null;
    return list.reduce((b, e) => isBetter(key, e.value, b.value) ? e : b, list[0]);
  }

  /* ---------------- Cloud-Speicherung ---------------- */
  // Die Seite baut sich selbst neu: Gerüst (template) + Stil + Skript + Daten.
  function buildDocument() {
    const style = document.getElementById('appStyle');
    const script = document.getElementById('appScript');
    const shell = document.getElementById('appShell');
    if (!style || !script || !shell) return null;
    const code = script.textContent || '';
    const css = style.textContent || '';
    if (!code.trim() || !css.trim()) return null;              // lokale Version mit externen Dateien
    const T = 'scr' + 'ipt';
    const state = JSON.stringify(db).replace(/</g, '\\u003c');
    const html =
      '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      '<meta name="theme-color" content="#0E1F27">\n' +
      '<title>Leichtathletik Tracker</title>\n' +
      '<style id="appStyle">\n' + css + '\n</style>\n</head>\n<body>\n' +
      '<template id="appShell">' + shell.innerHTML + '</template>\n<div id="app"></div>\n' +
      `<${T} id="appState" type="application/json">` + state + `</${T}>\n` +
      `<${T} id="appScript">\n` + code + `\n</${T}>\n</body>\n</html>`;
    // Sicherung: nur veröffentlichen, wenn das Ergebnis vollständig aussieht
    return html.includes('id="appShell"') && html.includes('id="discGrid"') && html.length > 20000 ? html : null;
  }

  let publishTimer = null;
  function scheduleSave() {
    if (!cloud) return;
    setSync('saving');
    clearTimeout(publishTimer);
    publishTimer = setTimeout(publishNow, 2000);
  }
  function flushSave() {
    if (!cloud || !publishTimer) return;
    clearTimeout(publishTimer); publishTimer = null;
    publishNow();
  }
  async function publishNow() {
    publishTimer = null;
    const html = buildDocument();
    if (!html) { setSync('local'); return; }
    rememberUi();                       // nach dem Veröffentlichen lädt die Seite neu
    try {
      await cloud.publish(html);
      setSync('cloud');
    } catch (err) {
      const code = err && err.code;
      if (code === 'conflict') {
        setSync('conflict');
        toast('Ein anderes Gerät hat gerade gespeichert – die Seite lädt neu', { warn: true });
      } else if (code === 'not_writer' || code === 'not_granted') {
        setSync('readonly');
      } else {
        setSync('error');
        toast('Cloud-Speichern fehlgeschlagen – Werte liegen auf diesem Gerät', { warn: true });
      }
    }
  }

  const SYNC_TEXT = {
    local:    ['Gerät',        'Werte liegen nur in diesem Browser'],
    saving:   ['speichert …',  'Werte werden in der Cloud gesichert'],
    cloud:    ['Cloud',        'Werte sind in der Cloud gesichert'],
    error:    ['ungesichert',  'Cloud-Speichern hat nicht geklappt'],
    readonly: ['nur Ansicht',  'Diese Seite gehört jemand anderem – Änderungen bleiben auf dem Gerät'],
    conflict: ['neu geladen',  'Ein anderes Gerät hat zuletzt gespeichert']
  };
  function setSync(s) {
    sync = s;
    const chip = document.getElementById('syncChip');
    if (chip) {
      chip.textContent = SYNC_TEXT[s][0];
      chip.title = SYNC_TEXT[s][1];
      chip.className = 'sync-chip s-' + s;
    }
    renderStorageInfo();
  }

  // Ansicht über den Neuladen-Vorgang hinweg merken
  function rememberUi() {
    try {
      sessionStorage.setItem('la-ui', JSON.stringify({
        view: currentView, chart: chartDisc, disc: selDisc, y: window.scrollY
      }));
    } catch (e) { /* egal */ }
  }
  function restoreUi() {
    let ui = null;
    try { ui = JSON.parse(sessionStorage.getItem('la-ui') || 'null'); } catch (e) { ui = null; }
    if (!ui) return;
    if (DISC[ui.disc]) selDisc = ui.disc;
    if (DISC[ui.chart]) chartDisc = ui.chart;
    if (ui.view && ui.view !== 'erfassen') show(ui.view);
    if (ui.y) setTimeout(() => window.scrollTo(0, ui.y), 30);
  }

  function save() {
    writeLocal();
    scheduleSave();
  }

  /* ---------------- kleine Helfer ---------------- */
  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const btn = (cls, text, onClick, title) => {
    const b = el('button', cls, text);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
  };

  let toastTimer;
  function toast(msg, opts) {
    const o = opts || {};
    const box = $('#toast'), txt = $('#toastText'), act = $('#toastAction');
    txt.textContent = msg;
    if (o.action) {
      act.hidden = false;
      act.textContent = o.action;
      act.onclick = () => { hideToast(); o.onAction(); };
    } else { act.hidden = true; act.onclick = null; }
    box.className = 'toast show' + (o.warn ? ' warn' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, o.ms || (o.action ? 7000 : 2400));
  }
  function hideToast() { clearTimeout(toastTimer); $('#toast').className = 'toast'; }

  /* ---------------- Zustand der Oberfläche ---------------- */
  let selDisc = 'weitsprung';
  let chartDisc = 'weitsprung';
  let currentView = 'erfassen';

  /* ---------------- Erfassen ---------------- */
  function renderDiscGrid() {
    const grid = $('#discGrid');
    grid.textContent = '';
    KEYS.forEach(key => {
      const d = DISC[key], b = best(key);
      const card = el('button', 'disc' + (key === selDisc ? ' is-active' : ''));
      card.type = 'button';
      card.append(el('span', 'ic', d.ic), el('span', 'nm', d.name),
                  el('span', 'pb', b ? fmt(key, b.value) : '–'));
      card.addEventListener('click', () => {
        selDisc = key;
        try { localStorage.setItem('la-last-disc', key); } catch (e) { /* egal */ }
        renderDiscGrid(); syncEntryHead();
        $('#valueInput').value = ''; preview(); $('#valueInput').focus();
      });
      grid.append(card);
    });
  }

  function syncEntryHead() {
    const d = DISC[selDisc];
    $('#entryDiscName').textContent = d.name;
    $('#entryHint').textContent = d.hint;
    $('#valueUnit').textContent = d.unit;
    $('#valueInput').placeholder = d.ph;
    $('#valueInput').inputMode = d.kind === 'mmss' ? 'text' : 'decimal';
  }

  function preview() {
    const p = $('#parsePreview'), raw = $('#valueInput').value.trim();
    if (!raw) { p.className = 'parse-preview'; p.innerHTML = '&nbsp;'; return; }
    const v = parseValue(selDisc, raw);
    if (v == null) { p.className = 'parse-preview err'; p.textContent = 'Format unklar – ' + DISC[selDisc].hint; return; }
    const b = best(selDisc);
    let txt = '= ' + fmt(selDisc, v);
    if (b) txt += isBetter(selDisc, v, b.value)
      ? `  ·  neue Bestleistung, ${fmtDiff(selDisc, v - b.value)} besser!`
      : `  ·  Bestwert ${fmt(selDisc, b.value)}`;
    p.className = 'parse-preview ok';
    p.textContent = txt;
  }

  function renderRecent() {
    const list = $('#recentList');
    list.textContent = '';
    const mine = db.entries.filter(e => e.athlete === db.current)
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)
      .slice(0, 6);
    if (!mine.length) { list.append(el('li', 'empty', 'Noch keine Werte – Disziplin wählen, Zahl tippen, ✓.')); return; }
    mine.forEach(e => list.append(rowFor(e, { showDisc: true })));
  }

  function rowFor(e, opts) {
    const showDisc = opts && opts.showDisc;
    const d = DISC[e.disc], b = best(e.disc), pb = b && b.id === e.id;
    const li = el('li', 'row' + (pb ? ' is-pb' : ''));
    li.append(el('span', 'ic', d.ic));

    const main = el('div', 'main');
    if (showDisc) main.append(el('div', 'nm', d.name));
    const val = el('div', 'val', fmt(e.disc, e.value));
    if (pb) { const bd = el('span', 'badge', 'Best'); bd.style.marginLeft = '8px'; val.append(bd); }
    main.append(val);
    if (e.note) main.append(el('div', 'nm', e.note));
    li.append(main, el('span', 'meta', fmtDate(e.date)));
    li.append(btn('del', '✕', () => removeEntry(e), 'Wert löschen'));
    return li;
  }

  // Löschen ohne Rückfrage-Dialog: sofort weg, dafür mit Rückgängig.
  function removeEntry(e) {
    db.entries = db.entries.filter(x => x.id !== e.id);
    save(); renderAll();
    toast(`${DISC[e.disc].name} ${fmt(e.disc, e.value)} gelöscht`, {
      action: 'Rückgängig',
      onAction: () => { db.entries.push(e); save(); renderAll(); toast('Wieder da'); }
    });
  }

  function addEntry(ev) {
    ev.preventDefault();
    const raw = $('#valueInput').value.trim();
    const v = parseValue(selDisc, raw);
    if (v == null) { toast('Wert nicht lesbar: ' + DISC[selDisc].hint, { warn: true }); return; }
    const b = best(selDisc);
    db.entries.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      athlete: db.current, disc: selDisc, value: v,
      date: $('#dateInput').value || todayISO(),
      note: $('#noteInput').value.trim()
    });
    save();
    $('#valueInput').value = ''; $('#noteInput').value = '';
    preview(); renderAll(); $('#valueInput').focus();
    toast(b && isBetter(selDisc, v, b.value) ? `Bestleistung! ${fmt(selDisc, v)}` : `Gespeichert: ${fmt(selDisc, v)}`);
  }

  /* ---------------- Diagramm ---------------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  function buildChart(key, list) {
    const W = 640, H = 280, PL = 52, PR = 14, PT = 16, PB = 30;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Verlauf ${DISC[key].name}` });

    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'mintFade', x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.append(svgEl('stop', { offset: '0%', 'stop-color': '#7BF29C', 'stop-opacity': '.28' }),
                svgEl('stop', { offset: '100%', 'stop-color': '#7BF29C', 'stop-opacity': '0' }));
    defs.append(grad); svg.append(defs);

    if (!list.length) {
      const t = svgEl('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'axis-text' });
      t.textContent = 'Noch keine Werte in dieser Disziplin';
      svg.append(t); return svg;
    }

    const vals = list.map(e => e.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { const pad = Math.abs(min) * 0.05 || 1; min -= pad; max += pad; }
    else { const pad = (max - min) * 0.15; min -= pad; max += pad; }

    const times = list.map(e => new Date(e.date + 'T00:00:00').getTime());
    const t0 = Math.min(...times), t1 = Math.max(...times);
    const x = i => list.length === 1 ? (PL + (W - PL - PR) / 2)
      : t1 === t0 ? PL + (W - PL - PR) * (i / (list.length - 1))
      : PL + (W - PL - PR) * ((times[i] - t0) / (t1 - t0));
    const low = DISC[key].better === 'low';                 // Zeiten: Achse drehen
    const y = v => PT + (H - PT - PB) * (low ? (v - min) / (max - min) : 1 - (v - min) / (max - min));

    for (let i = 0; i <= 4; i++) {
      const v = min + (max - min) * (i / 4), yy = y(v);
      svg.append(svgEl('line', { x1: PL, y1: yy, x2: W - PR, y2: yy, class: 'grid-line' }));
      const t = svgEl('text', { x: PL - 8, y: yy + 4, 'text-anchor': 'end', class: 'axis-text num' });
      t.textContent = fmtShort(key, v);
      svg.append(t);
    }

    const pts = list.map((e, i) => [x(i), y(e.value)]);
    const dLine = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    if (pts.length > 1) {
      const base = H - PB;
      svg.append(svgEl('path', { class: 'area-path',
        d: `${dLine} L ${pts[pts.length - 1][0].toFixed(1)} ${base} L ${pts[0][0].toFixed(1)} ${base} Z` }));
      svg.append(svgEl('path', { class: 'line-path', d: dLine }));
    }

    const b = best(key);
    list.forEach((e, i) => {
      const isPB = b && b.id === e.id;
      const c = svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: isPB ? 6.5 : 5, class: isPB ? 'pt-pb' : 'pt' });
      const ttl = svgEl('title');
      ttl.textContent = `${fmtDate(e.date)}: ${fmt(key, e.value)}${e.note ? ' – ' + e.note : ''}`;
      c.append(ttl); svg.append(c);
    });

    const idx = list.length > 2 ? [0, Math.floor((list.length - 1) / 2), list.length - 1] : list.map((_, i) => i);
    const uniq = [...new Set(idx)];
    uniq.forEach((i, n) => {
      const anchor = uniq.length > 1 && n === 0 ? 'start'
                   : uniq.length > 1 && n === uniq.length - 1 ? 'end' : 'middle';
      const t = svgEl('text', { x: pts[i][0], y: H - 8, 'text-anchor': anchor, class: 'axis-text num' });
      t.textContent = fmtDate(list[i].date);
      svg.append(t);
    });
    return svg;
  }

  function sparkline(key, list) {
    const W = 130, H = 30;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
    if (list.length < 2) return svg;
    const vals = list.map(e => e.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const low = DISC[key].better === 'low';
    const pts = list.map((e, i) => {
      const frac = (e.value - min) / (max - min);
      return [(W - 2) * (i / (list.length - 1)) + 1, 3 + (H - 6) * (low ? frac : 1 - frac)];
    });
    svg.append(svgEl('path', { class: 'line-path',
      d: pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '),
      'stroke-width': '2', 'vector-effect': 'non-scaling-stroke' }));
    return svg;
  }

  function renderVerlauf() {
    const tabs = $('#chartTabs');
    tabs.textContent = '';
    KEYS.forEach(key => tabs.append(
      btn('chip' + (key === chartDisc ? ' is-active' : ''), DISC[key].short, () => { chartDisc = key; renderVerlauf(); })));

    const key = chartDisc, d = DISC[key], list = entriesOf(key);
    $('#chartTitle').textContent = d.name;
    $('#chartSub').textContent = list.length
      ? `${list.length} ${list.length === 1 ? 'Messung' : 'Messungen'} · ${fmtDate(list[0].date)} – ${fmtDate(list[list.length - 1].date)}`
      : 'noch keine Messung';

    const trend = $('#chartTrend');
    if (list.length > 1) {
      const first = list[0].value, last = list[list.length - 1].value, better = isBetter(key, last, first);
      trend.className = 'trend ' + (last === first ? '' : better ? 'up' : 'down');
      trend.textContent = last === first ? '±0' : (better ? '▲ ' : '▼ ') + fmtDiff(key, last - first);
      trend.title = 'Veränderung vom ersten zum letzten Wert';
    } else { trend.className = 'trend'; trend.textContent = ''; }

    const wrap = $('#chartWrap');
    wrap.textContent = '';
    wrap.append(buildChart(key, list));

    const grid = $('#statsGrid');
    grid.textContent = '';
    const b = best(key);
    [['Bestwert', b ? fmt(key, b.value) : '–', true],
     ['Letzter Wert', list.length ? fmt(key, list[list.length - 1].value) : '–', false],
     ['Durchschnitt', list.length ? fmt(key, list.reduce((s, e) => s + e.value, 0) / list.length) : '–', false],
     ['Messungen', String(list.length), false]
    ].forEach(([k, v, mint]) => {
      const s = el('div', 'stat');
      s.append(el('div', 'k', k), el('div', 'v' + (mint ? ' mint' : ''), v));
      grid.append(s);
    });

    const ul = $('#discList');
    ul.textContent = '';
    if (!list.length) ul.append(el('li', 'empty', 'Für ' + d.name + ' ist noch nichts erfasst.'));
    else list.slice().reverse().forEach(e => ul.append(rowFor(e)));
  }

  /* ---------------- Übersicht ---------------- */
  function renderUebersicht() {
    $('#overviewName').textContent = db.current;
    const grid = $('#overviewGrid');
    grid.textContent = '';
    KEYS.forEach(key => {
      const d = DISC[key], list = entriesOf(key), b = best(key);
      const card = el('button', 'ov-card');
      card.type = 'button';
      const nm = el('div', 'nm');
      nm.append(el('span', null, d.ic), el('span', null, d.name));
      card.append(nm, el('div', 'pb' + (b ? '' : ' none'), b ? fmt(key, b.value) : '–'),
        el('div', 'sub', list.length ? `${list.length} × · zuletzt ${fmtDate(list[list.length - 1].date)}` : 'noch nichts erfasst'),
        sparkline(key, list));
      card.addEventListener('click', () => { chartDisc = key; show('verlauf'); });
      grid.append(card);
    });
    renderStorageInfo();
  }

  function renderStorageInfo() {
    const box = document.getElementById('storageInfo');
    if (!box) return;
    box.textContent = '';
    const p = el('p', null, cloud
      ? 'Gespeichert wird in der Cloud: Die Seite sichert ihren Stand bei Claude. Öffnest du denselben Link auf einem anderen Gerät, sind die Werte da. Zusätzlich liegt eine Kopie in diesem Browser.'
      : 'Gespeichert wird nur in diesem Browser (localStorage) – also auf diesem Gerät. Sichere die Werte ab und zu als JSON-Datei.');
    p.style.margin = '0 0 8px';
    box.append(p);

    if (cloud && localOnly.length) {
      const warn = el('p', null, `${localOnly.length} ${localOnly.length === 1 ? 'Wert liegt' : 'Werte liegen'} nur auf diesem Gerät.`);
      warn.style.margin = '0 0 8px';
      box.append(warn, btn('btn btn-mint', 'In die Cloud übernehmen', () => {
        db.entries = db.entries.concat(localOnly);
        localOnly = [];
        db = normalize(db);
        save(); renderAll();
        toast('Werte übernommen');
      }));
    }
  }

  /* ---------------- Profile ---------------- */
  function syncProfileName() {
    const n = document.getElementById('profileName');
    if (n) n.textContent = db.current;
  }

  function switchTo(name) {
    db.current = name;
    save(); renderAll(); syncProfileName();
    $('#profileDialog').close();
    toast('Profil: ' + name);
  }

  function renderProfiles() {
    const list = $('#profileList');
    list.textContent = '';
    db.athletes.forEach(name => {
      const li = el('li', 'p-row' + (name === db.current ? ' is-current' : ''));
      drawProfileRow(li, name);
      list.append(li);
    });
    $('#profileHint').textContent = 'Jedes Profil hat eigene Werte. Tippe auf einen Namen, um zu wechseln.';
  }

  function drawProfileRow(li, name) {
    li.textContent = '';
    const pick = btn('p-name', null, () => { if (name !== db.current) switchTo(name); });
    pick.append(el('span', 'p-nm', name),
                el('span', 'p-count', countOf(name) + (countOf(name) === 1 ? ' Wert' : ' Werte')));
    if (name === db.current) pick.append(el('span', 'badge', 'aktiv'));
    li.append(pick,
      btn('p-act', 'Name', () => editProfile(li, name), 'Profil umbenennen'),
      btn('p-act p-danger', 'Löschen', () => askDeleteProfile(li, name), 'Profil löschen'));
  }

  function editProfile(li, name) {
    li.textContent = '';
    const form = el('form', 'p-edit');
    const input = el('input', 'p-input');
    input.value = name; input.maxLength = 24; input.setAttribute('aria-label', 'Neuer Name');
    form.append(input, btn('btn btn-mint btn-sm', 'Sichern', () => form.requestSubmit()),
                btn('btn btn-sm', 'Zurück', () => drawProfileRow(li, name)));
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const neu = input.value.trim();
      if (!neu) { $('#profileHint').textContent = 'Bitte einen Namen eingeben.'; return; }
      if (neu !== name && db.athletes.includes(neu)) { $('#profileHint').textContent = `„${neu}“ gibt es schon.`; return; }
      if (neu !== name) {
        db.athletes = db.athletes.map(a => a === name ? neu : a);
        db.entries.forEach(e => { if (e.athlete === name) e.athlete = neu; });
        if (db.current === name) db.current = neu;
        save(); renderAll(); syncProfileName();
      }
      renderProfiles();
      toast('Profil heißt jetzt ' + neu);
    });
    li.append(form);
    input.focus(); input.select();
  }

  function askDeleteProfile(li, name) {
    if (db.athletes.length < 2) {
      $('#profileHint').textContent = 'Mindestens ein Profil muss bleiben. Lege erst ein neues an.';
      return;
    }
    const n = countOf(name);
    li.textContent = '';
    const q = el('div', 'p-confirm');
    q.append(el('span', 'p-q', `„${name}“ mit ${n} ${n === 1 ? 'Wert' : 'Werten'} löschen?`),
      btn('btn btn-sm btn-danger', 'Löschen', () => {
        const removed = db.entries.filter(e => e.athlete === name);
        db.athletes = db.athletes.filter(a => a !== name);
        db.entries = db.entries.filter(e => e.athlete !== name);
        if (db.current === name) db.current = db.athletes[0];
        save(); renderAll(); syncProfileName(); renderProfiles();
        toast(`Profil „${name}“ gelöscht`, {
          action: 'Rückgängig',
          onAction: () => {
            if (!db.athletes.includes(name)) db.athletes.push(name);
            db.entries = db.entries.concat(removed);
            save(); renderAll(); renderProfiles(); toast('Profil wieder da');
          }
        });
      }),
      btn('btn btn-sm', 'Abbrechen', () => drawProfileRow(li, name)));
    li.append(q);
  }

  function addProfile(ev) {
    ev.preventDefault();
    const input = $('#profileNewName'), name = input.value.trim();
    if (!name) { $('#profileHint').textContent = 'Bitte einen Namen eingeben.'; input.focus(); return; }
    if (db.athletes.includes(name)) { $('#profileHint').textContent = `„${name}“ gibt es schon.`; return; }
    db.athletes.push(name);
    input.value = '';
    switchTo(name);
    toast('Profil angelegt: ' + name);
  }

  /* ---------------- Sichern & Laden ---------------- */
  async function download(name, text, type) {
    if (window.claude && typeof window.claude.use === 'function') {
      try {
        const dl = await window.claude.use('downloads');
        if (dl) { await dl.save({ filename: name, data: text }); return true; }
      } catch (err) {
        const code = err && err.code;
        if (code === 'declined') return false;
        if (code === 'extension_not_enabled') { toast('Dieses Dateiformat ist hier nicht erlaubt – nimm JSON', { warn: true }); return false; }
        toast('Datei konnte nicht gespeichert werden', { warn: true });
        return false;
      }
    }
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  async function exportJSON() {
    if (await download(`leichtathletik-${todayISO()}.json`, JSON.stringify(db, null, 2), 'application/json'))
      toast('Datei gespeichert');
  }
  async function exportCSV() {
    const rows = [['Profil', 'Disziplin', 'Wert', 'Einheit', 'Datum', 'Notiz']];
    db.entries.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(e => {
      rows.push([e.athlete, DISC[e.disc].name, fmt(e.disc, e.value, false), DISC[e.disc].unit, e.date, e.note || '']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    if (await download(`leichtathletik-${todayISO()}.csv`, '﻿' + csv, 'text/csv')) toast('CSV gespeichert');
  }
  function importJSON(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result);
        if (!valid(p)) throw new Error('Format');
        const known = new Set(db.entries.map(e => e.id));
        const neu = p.entries.filter(e => !known.has(e.id));
        db.entries = db.entries.concat(neu);
        (p.athletes || []).forEach(a => { if (!db.athletes.includes(a)) db.athletes.push(a); });
        db = normalize(db);
        save(); renderAll(); syncProfileName();
        toast(`${neu.length} ${neu.length === 1 ? 'Wert' : 'Werte'} geladen`);
      } catch (err) { toast('Datei konnte nicht gelesen werden', { warn: true }); }
    };
    r.readAsText(file);
  }

  /* ---------------- Navigation ---------------- */
  function show(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + view));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === view));
    if (view === 'verlauf') renderVerlauf();
    if (view === 'uebersicht') renderUebersicht();
    window.scrollTo(0, 0);
  }

  function renderAll() {
    renderDiscGrid();
    renderRecent();
    if ($('#view-verlauf').classList.contains('is-active')) renderVerlauf();
    if ($('#view-uebersicht').classList.contains('is-active')) renderUebersicht();
  }

  /* ---------------- Start ---------------- */
  async function initCloud() {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    try {
      return await Promise.race([
        window.claude.use('artifact'),
        new Promise(res => setTimeout(() => res(null), 5000))
      ]);
    } catch (e) { return null; }
  }

  async function main() {
    const shell = document.getElementById('appShell');
    document.getElementById('app').append(shell.content.cloneNode(true));

    cloud = await initCloud();

    const fromCloud = readEmbedded(), fromLocal = readLocal();
    if (cloud && fromCloud) {
      db = fromCloud;
      const ids = new Set(db.entries.map(e => e.id));
      localOnly = fromLocal ? fromLocal.entries.filter(e => !ids.has(e.id)) : [];
    } else {
      db = fromLocal || fromCloud || blank();
      localOnly = [];
    }

    const last = (() => { try { return localStorage.getItem('la-last-disc'); } catch (e) { return null; } })();
    if (DISC[last]) { selDisc = last; chartDisc = last; }

    syncEntryHead();
    syncProfileName();
    setSync(cloud ? 'cloud' : 'local');
    renderAll();
    $('#dateInput').value = todayISO();
    restoreUi();

    $('#entryForm').addEventListener('submit', addEntry);
    $('#valueInput').addEventListener('input', preview);
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { flushSave(); show(t.dataset.view); }));

    $('#profileBtn').addEventListener('click', () => { renderProfiles(); $('#profileDialog').showModal(); });
    $('#profileClose').addEventListener('click', () => $('#profileDialog').close());
    $('#profileAddForm').addEventListener('submit', addProfile);

    $('#exportBtn').addEventListener('click', exportJSON);
    $('#csvBtn').addEventListener('click', exportCSV);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', ev => {
      if (ev.target.files[0]) importJSON(ev.target.files[0]);
      ev.target.value = '';
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
    window.addEventListener('pagehide', flushSave);

    $('#valueInput').focus();
  }

  main();
})();
