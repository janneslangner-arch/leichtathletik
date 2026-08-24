/* Leichtathletik Tracker – Daten, Schnelleingabe, Diagramme
   Alles läuft lokal im Browser, gespeichert wird in localStorage. */
(() => {
  'use strict';

  /* ---------------- Disziplinen ---------------- */
  const DISC = {
    hochsprung:   { name: 'Hochsprung',   short: 'Hoch',     ic: 'HOCH', kind: 'length', better: 'high', unit: 'm', maxM: 3,
                    hint: '1.45 oder 145 (cm)', ph: '1.45' },
    weitsprung:   { name: 'Weitsprung',   short: 'Weit',     ic: 'WEIT', kind: 'length', better: 'high', unit: 'm', maxM: 10,
                    hint: '4.35 oder 435 (cm)', ph: '4.35' },
    sprint100:    { name: '100 m Sprint', short: '100 m',    ic: '100', kind: 'sec',    better: 'low',  unit: 's',
                    hint: 'Sekunden, z. B. 12.85', ph: '12.85' },
    lauf1500:     { name: '1500 m Lauf',  short: '1500 m',   ic: '1500', kind: 'mmss',   better: 'low',  unit: 'min',
                    hint: '5:42 oder kurz 542', ph: '5:42' },
    lauf5000:     { name: '5000 m Lauf',  short: '5000 m',   ic: '5000', kind: 'mmss',   better: 'low',  unit: 'min',
                    hint: '21:30 oder kurz 2130', ph: '21:30' },
    speerwurf:    { name: 'Speerwurf',    short: 'Speer',    ic: 'SPEER', kind: 'length', better: 'high', unit: 'm', maxM: 110,
                    hint: '27.50 oder 2750 (cm)', ph: '27.50' },
    kugelstossen: { name: 'Kugelstoßen',  short: 'Kugel',    ic: 'KUGEL', kind: 'length', better: 'high', unit: 'm', maxM: 25,
                    hint: '8.20 oder 820 (cm)', ph: '8.20' }
  };
  const KEYS = Object.keys(DISC);

  /* ---------------- Werte lesen & schreiben ---------------- */
  // Rückgabe: Zahl (Meter bzw. Sekunden) oder null, wenn nicht lesbar.
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
    // mmss – Laufzeiten
    let m = s.match(/^(\d{1,3}):([0-5]?\d)(\.\d+)?$/);
    if (m) return (+m[1]) * 60 + (+m[2]) + (m[3] ? parseFloat(m[3]) : 0);
    m = s.match(/^(\d{1,2})(\d{2})$/);                                        // 542 -> 5:42
    if (m) { const sec = +m[2]; return sec > 59 ? null : (+m[1]) * 60 + sec; }
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);                        // reine Sekunden
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
  // Kurzform für Achsen: ohne Nachkommastellen bei Zeiten
  function fmtShort(key, v) {
    const d = DISC[key];
    if (d.kind === 'length') return v.toFixed(2);
    if (d.kind === 'sec')    return v.toFixed(2);
    const min = Math.floor(v / 60), sec = Math.round(v - min * 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function fmtDiff(key, delta) {
    const d = DISC[key];
    const a = Math.abs(delta);
    if (d.kind === 'length') return a.toFixed(2) + ' m';
    if (d.kind === 'sec')    return a.toFixed(2) + ' s';
    if (a < 60) return a.toFixed(1) + ' s';
    const min = Math.floor(a / 60), sec = Math.round(a - min * 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec + ' min';
  }
  const isBetter = (key, a, b) => DISC[key].better === 'high' ? a > b : a < b;

  const fmtDate = iso => {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y.slice(2)}`;
  };
  const todayISO = () => {
    const t = new Date(), p = n => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  };

  /* ---------------- Speicher ---------------- */
  const STORE = 'la-tracker-v1';
  const blank = () => ({ athletes: ['Ich'], current: 'Ich', entries: [] });
  let db = blank();

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.entries)) {
          db = Object.assign(blank(), p);
          if (!db.athletes.length) db.athletes = ['Ich'];
          if (!db.athletes.includes(db.current)) db.current = db.athletes[0];
        }
      }
    } catch (e) { /* defekte oder gesperrte Speicherung: mit leerem Stand starten */ }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(db)); }
    catch (e) { toast('Speichern nicht möglich (Browser-Speicher voll oder gesperrt)', true); }
  }

  const entriesOf = key => db.entries
    .filter(e => e.athlete === db.current && e.disc === key)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id);

  function best(key) {
    const list = entriesOf(key);
    if (!list.length) return null;
    return list.reduce((b, e) => isBetter(key, e.value, b.value) ? e : b, list[0]);
  }

  /* ---------------- kleine Helfer ---------------- */
  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  let toastTimer;
  function toast(msg, warn) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (warn ? ' warn' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 2200);
  }

  /* ---------------- Zustand der Oberfläche ---------------- */
  let selDisc  = localStorage.getItem('la-last-disc') || 'weitsprung';
  let chartDisc = selDisc;
  if (!DISC[selDisc]) selDisc = 'weitsprung';

  /* ---------------- Erfassen ---------------- */
  function renderDiscGrid() {
    const grid = $('#discGrid');
    grid.textContent = '';
    KEYS.forEach(key => {
      const d = DISC[key], b = best(key);
      const btn = el('button', 'disc' + (key === selDisc ? ' is-active' : ''));
      btn.type = 'button';
      btn.append(el('span', 'ic', d.ic), el('span', 'nm', d.name),
                 el('span', 'pb', b ? fmt(key, b.value) : '–'));
      btn.addEventListener('click', () => {
        selDisc = key;
        localStorage.setItem('la-last-disc', key);
        renderDiscGrid();
        syncEntryHead();
        $('#valueInput').value = '';
        preview();
        $('#valueInput').focus();
      });
      grid.append(btn);
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
    const p = $('#parsePreview');
    const raw = $('#valueInput').value.trim();
    if (!raw) { p.className = 'parse-preview'; p.innerHTML = '&nbsp;'; return; }
    const v = parseValue(selDisc, raw);
    if (v == null) {
      p.className = 'parse-preview err';
      p.textContent = 'Format unklar – ' + DISC[selDisc].hint;
      return;
    }
    const b = best(selDisc);
    let txt = '= ' + fmt(selDisc, v);
    if (b) {
      txt += isBetter(selDisc, v, b.value)
        ? `  ·  neue Bestleistung, ${fmtDiff(selDisc, v - b.value)} besser!`
        : `  ·  Bestwert ${fmt(selDisc, b.value)}`;
    }
    p.className = 'parse-preview ok';
    p.textContent = txt;
  }

  function renderRecent() {
    const list = $('#recentList');
    list.textContent = '';
    const mine = db.entries.filter(e => e.athlete === db.current)
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)
      .slice(0, 6);
    if (!mine.length) {
      list.append(el('li', 'empty', 'Noch keine Werte – Disziplin wählen, Zahl tippen, ✓.'));
      return;
    }
    mine.forEach(e => list.append(rowFor(e, { showDisc: true })));
  }

  function rowFor(e, { showDisc } = {}) {
    const d = DISC[e.disc], b = best(e.disc);
    const pb = b && b.id === e.id;
    const li = el('li', 'row' + (pb ? ' is-pb' : ''));
    li.append(el('span', 'ic', d.ic));

    const main = el('div', 'main');
    if (showDisc) main.append(el('div', 'nm', d.name));
    const val = el('div', 'val', fmt(e.disc, e.value));
    if (pb) { const bd = el('span', 'badge', 'Best'); bd.style.marginLeft = '8px'; val.append(bd); }
    main.append(val);
    if (e.note) main.append(el('div', 'nm', e.note));
    li.append(main, el('span', 'meta', fmtDate(e.date)));

    const del = el('button', 'del', '✕');
    del.type = 'button';
    del.title = 'Wert löschen';
    del.addEventListener('click', () => {
      if (!confirm(`${d.name} ${fmt(e.disc, e.value)} vom ${fmtDate(e.date)} löschen?`)) return;
      db.entries = db.entries.filter(x => x.id !== e.id);
      save(); renderAll(); toast('Gelöscht');
    });
    li.append(del);
    return li;
  }

  function addEntry(ev) {
    ev.preventDefault();
    const raw = $('#valueInput').value.trim();
    const v = parseValue(selDisc, raw);
    if (v == null) { toast('Wert nicht lesbar: ' + DISC[selDisc].hint, true); return; }
    const b = best(selDisc);
    const date = $('#dateInput').value || todayISO();
    db.entries.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      athlete: db.current, disc: selDisc, value: v, date,
      note: $('#noteInput').value.trim()
    });
    save();
    $('#valueInput').value = '';
    $('#noteInput').value = '';
    preview();
    renderAll();
    $('#valueInput').focus();
    toast(b && isBetter(selDisc, v, b.value)
      ? `Bestleistung! ${fmt(selDisc, v)}`
      : `Gespeichert: ${fmt(selDisc, v)}`);
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
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': `Verlauf ${DISC[key].name}` });

    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'mintFade', x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.append(svgEl('stop', { offset: '0%',   'stop-color': '#7BF29C', 'stop-opacity': '.28' }),
                svgEl('stop', { offset: '100%', 'stop-color': '#7BF29C', 'stop-opacity': '0' }));
    defs.append(grad);
    svg.append(defs);

    if (!list.length) {
      const t = svgEl('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'axis-text' });
      t.textContent = 'Noch keine Werte in dieser Disziplin';
      svg.append(t);
      return svg;
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
    // "besser" zeigt immer nach oben: bei Zeiten wird die Achse gedreht
    const low = DISC[key].better === 'low';
    const y = v => {
      const frac = (v - min) / (max - min);
      return PT + (H - PT - PB) * (low ? frac : 1 - frac);
    };

    // Gitter + Y-Beschriftung
    for (let i = 0; i <= 4; i++) {
      const v = min + (max - min) * (i / 4);
      const yy = y(v);
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
      const c = svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: isPB ? 6.5 : 5,
        class: isPB ? 'pt-pb' : 'pt' });
      const ttl = svgEl('title');
      ttl.textContent = `${fmtDate(e.date)}: ${fmt(key, e.value)}${e.note ? ' – ' + e.note : ''}`;
      c.append(ttl);
      svg.append(c);
    });

    // X-Beschriftung: erster, mittlerer, letzter Termin
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
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark', 'aria-hidden': 'true',
      preserveAspectRatio: 'none' });
    if (list.length < 2) return svg;
    const vals = list.map(e => e.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const low = DISC[key].better === 'low';
    const pts = list.map((e, i) => {
      const frac = (e.value - min) / (max - min);
      return [ (W - 2) * (i / (list.length - 1)) + 1, 3 + (H - 6) * (low ? frac : 1 - frac) ];
    });
    svg.append(svgEl('path', { class: 'line-path',
      d: pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '),
      'stroke-width': '2', 'vector-effect': 'non-scaling-stroke' }));
    return svg;
  }

  function renderVerlauf() {
    // Chips
    const tabs = $('#chartTabs');
    tabs.textContent = '';
    KEYS.forEach(key => {
      const c = el('button', 'chip' + (key === chartDisc ? ' is-active' : ''), DISC[key].short);
      c.type = 'button';
      c.addEventListener('click', () => { chartDisc = key; renderVerlauf(); });
      tabs.append(c);
    });

    const key = chartDisc, d = DISC[key], list = entriesOf(key);
    $('#chartTitle').textContent = d.name;
    $('#chartSub').textContent = list.length
      ? `${list.length} ${list.length === 1 ? 'Messung' : 'Messungen'} · ${fmtDate(list[0].date)} – ${fmtDate(list[list.length - 1].date)}`
      : 'noch keine Messung';

    // Trend: erster gegen letzter Wert
    const trend = $('#chartTrend');
    if (list.length > 1) {
      const first = list[0].value, last = list[list.length - 1].value;
      const better = isBetter(key, last, first);
      trend.className = 'trend ' + (last === first ? '' : better ? 'up' : 'down');
      trend.textContent = last === first ? '±0'
        : (better ? '▲ ' : '▼ ') + fmtDiff(key, last - first);
      trend.title = 'Veränderung vom ersten zum letzten Wert';
    } else { trend.className = 'trend'; trend.textContent = ''; }

    const wrap = $('#chartWrap');
    wrap.textContent = '';
    wrap.append(buildChart(key, list));

    // Kennzahlen
    const grid = $('#statsGrid');
    grid.textContent = '';
    const b = best(key);
    const stats = [
      ['Bestwert', b ? fmt(key, b.value) : '–', true],
      ['Letzter Wert', list.length ? fmt(key, list[list.length - 1].value) : '–', false],
      ['Durchschnitt', list.length ? fmt(key, list.reduce((s, e) => s + e.value, 0) / list.length) : '–', false],
      ['Messungen', String(list.length), false]
    ];
    stats.forEach(([k, v, mint]) => {
      const s = el('div', 'stat');
      s.append(el('div', 'k', k), el('div', 'v' + (mint ? ' mint' : ''), v));
      grid.append(s);
    });

    // Einzelwerte, neueste zuerst
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
      card.append(nm);
      const pb = el('div', 'pb' + (b ? '' : ' none'), b ? fmt(key, b.value) : '–');
      card.append(pb);
      card.append(el('div', 'sub', list.length
        ? `${list.length} × · zuletzt ${fmtDate(list[list.length - 1].date)}`
        : 'noch nichts erfasst'));
      card.append(sparkline(key, list));
      card.addEventListener('click', () => { chartDisc = key; show('verlauf'); });
      grid.append(card);
    });
  }

  /* ---------------- Sportler:innen ---------------- */
  function renderAthletes() {
    const sel = $('#athleteSelect');
    sel.textContent = '';
    db.athletes.forEach(a => {
      const o = el('option', null, a);
      o.value = a;
      if (a === db.current) o.selected = true;
      sel.append(o);
    });
  }

  /* ---------------- Sichern & Laden ---------------- */
  // Lokal (Datei/Server) per Blob-Link, in der Claude-Vorschau über die
  // downloads-Fähigkeit – dort funktionieren normale Download-Links nicht.
  async function download(name, text, type) {
    if (window.claude && typeof window.claude.use === 'function') {
      try {
        const dl = await window.claude.use('downloads');
        if (dl) {
          await dl.save({ filename: name, data: text });
          return true;
        }
      } catch (err) {
        if (err && err.code === 'declined') return false;
        if (err && err.code === 'extension_not_enabled') {
          toast('Dieses Dateiformat ist hier nicht erlaubt – nimm JSON', true);
          return false;
        }
        toast('Datei konnte nicht gespeichert werden', true);
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
    const rows = [['Sportler', 'Disziplin', 'Wert', 'Einheit', 'Datum', 'Notiz']];
    db.entries.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(e => {
      rows.push([e.athlete, DISC[e.disc] ? DISC[e.disc].name : e.disc,
                 fmt(e.disc, e.value, false), DISC[e.disc] ? DISC[e.disc].unit : '',
                 e.date, e.note || '']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    if (await download(`leichtathletik-${todayISO()}.csv`, '﻿' + csv, 'text/csv'))
      toast('CSV gespeichert');
  }
  function importJSON(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result);
        if (!p || !Array.isArray(p.entries)) throw new Error('Format');
        const known = new Set(db.entries.map(e => e.id));
        const neu = p.entries.filter(e => !known.has(e.id));
        db.entries = db.entries.concat(neu);
        (p.athletes || []).forEach(a => { if (!db.athletes.includes(a)) db.athletes.push(a); });
        save(); renderAthletes(); renderAll();
        toast(`${neu.length} ${neu.length === 1 ? 'Wert' : 'Werte'} geladen`);
      } catch (err) {
        toast('Datei konnte nicht gelesen werden', true);
      }
    };
    r.readAsText(file);
  }

  /* ---------------- Navigation ---------------- */
  function show(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + view));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === view));
    if (view === 'verlauf') renderVerlauf();
    if (view === 'uebersicht') renderUebersicht();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function renderAll() {
    renderDiscGrid();
    renderRecent();
    if ($('#view-verlauf').classList.contains('is-active')) renderVerlauf();
    if ($('#view-uebersicht').classList.contains('is-active')) renderUebersicht();
  }

  /* ---------------- Start ---------------- */
  load();
  renderAthletes();
  syncEntryHead();
  renderAll();
  $('#dateInput').value = todayISO();

  $('#entryForm').addEventListener('submit', addEntry);
  $('#valueInput').addEventListener('input', preview);
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => show(t.dataset.view)));
  $('#athleteSelect').addEventListener('change', e => {
    db.current = e.target.value; save(); renderAll();
  });
  $('#addAthleteBtn').addEventListener('click', () => {
    const n = (prompt('Name der Sportler:in:') || '').trim();
    if (!n) return;
    if (!db.athletes.includes(n)) db.athletes.push(n);
    db.current = n; save(); renderAthletes(); renderAll();
    toast('Angelegt: ' + n);
  });
  $('#exportBtn').addEventListener('click', exportJSON);
  $('#csvBtn').addEventListener('click', exportCSV);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });
  $('#valueInput').focus();
})();
