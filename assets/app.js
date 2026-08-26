/* Leichtathletik Tracker – Daten, Schnelleingabe, Diagramme
   Speicherung: in der Claude-Cloud (die Seite sichert ihren Stand selbst),
   sonst im Browser dieses Geräts. Ohne confirm()/prompt(), weil Browser-
   Dialoge in eingebetteten Seiten blockiert sind. */
(() => {
  'use strict';

  /* ---------------- Disziplinen ---------------- */
  const DISC = {
    sprint100:    { name: '100 m Sprint', short: '100 m',  ic: '100',   kind: 'sec',    better: 'low',  unit: 's',
                    hint: 'Sekunden, z. B. 12.85', ph: '12.85' },
    lauf1500:     { name: '1500 m Lauf',  short: '1500 m', ic: '1500',  kind: 'mmss',   better: 'low',  unit: 'min',
                    hint: '5:42 oder kurz 542', ph: '5:42' },
    lauf5000:     { name: '5000 m Lauf',  short: '5000 m', ic: '5000',  kind: 'mmss',   better: 'low',  unit: 'min',
                    hint: '21:30 oder kurz 2130', ph: '21:30' },
    hochsprung:   { name: 'Hochsprung',   short: 'Hoch',   ic: 'HOCH',  kind: 'length', better: 'high', unit: 'm', maxM: 3,
                    hint: '1.45 oder 145 (cm)', ph: '1.45' },
    weitsprung:   { name: 'Weitsprung',   short: 'Weit',   ic: 'WEIT',  kind: 'length', better: 'high', unit: 'm', maxM: 10,
                    hint: '4.35 oder 435 (cm)', ph: '4.35' },
    kugelstossen: { name: 'Kugelstoßen',  short: 'Kugel',  ic: 'KUGEL', kind: 'length', better: 'high', unit: 'm', maxM: 25,
                    hint: '8.20 oder 820 (cm)', ph: '8.20' },
    speerwurf:    { name: 'Speerwurf',    short: 'Speer',  ic: 'SPEER', kind: 'length', better: 'high', unit: 'm', maxM: 110,
                    hint: '27.50 oder 2750 (cm)', ph: '27.50' }
  };
  const KEYS = Object.keys(DISC);


  /* ---------------- Farbschemas und Muster ----------------
     Jedes Schema entsteht aus einem Farbton: Grund, Flächen, Linien, Text
     und Akzent werden daraus berechnet. So kann keine Farbe zurückbleiben. */
  const THEME_DEFS = [
    ['mint',    'Mint',    152], ['limette', 'Limette', 84],  ['aqua',    'Aqua',    172],
    ['cyan',    'Cyan',    193], ['blau',    'Blau',    222], ['violett', 'Violett', 268],
    ['magenta', 'Magenta', 315], ['koralle', 'Koralle', 8],   ['orange',  'Orange',  28],
    ['gold',    'Gold',    46]
  ];
  function themeVars(h) {
    const badH = (h >= 330 || h <= 45) ? 350 : 5;     // Warnfarbe bleibt unterscheidbar
    return {
      '--bg':        `hsl(${h} 26% 8%)`,
      '--bg-glow':   `hsl(${h} 34% 15%)`,
      '--surface':   `hsl(${h} 22% 12.5%)`,
      '--surface-2': `hsl(${h} 20% 17.5%)`,
      '--line':      `hsl(${h} 20% 31%)`,
      '--line-soft': `hsl(${h} 20% 22%)`,
      '--text':      `hsl(${h} 32% 96%)`,
      '--muted':     `hsl(${h} 15% 68%)`,
      '--mint':      `hsl(${h} 94% 66%)`,
      '--mint-dim':  `hsl(${h} 58% 52%)`,
      '--mint-glow': `hsla(${h} 94% 66% / .22)`,
      '--ink':       `hsl(${h} 48% 7%)`,
      '--bad':       `hsl(${badH} 88% 70%)`
    };
  }
  const THEMES = {};
  THEME_DEFS.forEach(([key, name, hue]) => { THEMES[key] = { name, hue, vars: themeVars(hue) }; });

  /* ---- Eigene Farben: bis zu fünf je Profil ---------------------------
     Gespeichert wird nur der Farbton (0–359). Daraus baut themeVars das
     ganze Schema, genau wie bei den vorgegebenen Farben – so bleibt der
     Text lesbar, egal wie dunkel jemand tippt. */
  const MAX_EIGENE = 5;

  function hexZuHue(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return Math.round(((h * 60) % 360 + 360) % 360);
  }
  const hueZuHex = h => {
    // hsl(h 94% 66%) als #rrggbb, für das Farbfeld im Formular
    const s = 0.94, l = 0.66, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  };

  // Liste der eigenen Farben eines Profils: [{ key, name, hue }]
  function eigeneFarben(profil) {
    let liste = [];
    try { liste = JSON.parse(einstellungVon(profil, 'farbenEigen', '[]')); } catch (e) { liste = []; }
    if (!Array.isArray(liste)) liste = [];
    return liste
      .filter(f => f && typeof f.key === 'string' && Number.isFinite(Number(f.hue)))
      .slice(0, MAX_EIGENE)
      .map(f => ({ key: f.key, name: f.name || 'Eigene', hue: ((Number(f.hue) % 360) + 360) % 360 }));
  }
  function setzeEigeneFarben(profil, liste) {
    setzeEinstellungVon(profil, 'farbenEigen', JSON.stringify(liste.slice(0, MAX_EIGENE)));
    sendeAussehen(profil);
  }
  // Alle Schemas, die für ein Profil gelten: die vorgegebenen plus seine eigenen
  function themenVon(profil) {
    const alle = Object.assign({}, THEMES);
    eigeneFarben(profil).forEach(f => {
      alle[f.key] = { name: f.name, hue: f.hue, vars: themeVars(f.hue), eigen: true };
    });
    return alle;
  }
  const themaHolen = (key, profil) => themenVon(profil || db.current)[key] || null;

  const PATTERNS = [
    ['keins',    'Schlicht'],   ['raster',  'Raster'],    ['punkte',  'Punkte'],
    ['bahn',     'Laufbahn'],   ['wellen',  'Wellen'],    ['karo',    'Karo'],
    ['waben',    'Waben'],      ['konfetti','Konfetti'],  ['hoehen',  'Höhenlinien'],
    ['strahlen', 'Strahlen']
  ];
  const VERLAEUFE = [
    ['keins',      'Keiner'],      ['sonne',     'Sonnenlicht'],
    ['nordlicht',  'Nordlicht'],   ['tiefe',     'Tiefe'],
    ['bahn',       'Bahnkurve'],   ['zweiklang', 'Zweiklang'],
    ['flutlicht',  'Flutlicht']
  ];
  let theme = 'mint', pattern = 'keins', verlauf = 'keins';

  // Farbe und Muster gehören zum Profil. Was zuletzt gewählt wurde, steht
  // zusätzlich auf dem Gerät: damit ist beim Laden schon vor dem ersten
  // Profil etwas Vernünftiges da und neue Profile starten damit.
  const merke = (schluessel, wert) => {
    try { localStorage.setItem(schluessel, wert); } catch (e) { /* egal */ }
  };
  const gemerkt = schluessel => {
    try { return localStorage.getItem(schluessel); } catch (e) { return null; }
  };

  // Vor dem ersten Profil gibt es nur die vorgegebenen Farben.
  const alleThemen = () => (typeof db !== 'undefined' && db && db.current) ? themenVon(db.current) : THEMES;

  function applyTheme(key, merken) {
    const themen = alleThemen();
    if (!themen[key]) key = 'mint';
    theme = key;
    const wurzel = document.documentElement;
    Object.entries(themen[key].vars).forEach(([k, v]) => wurzel.style.setProperty(k, v));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', `hsl(${themen[key].hue} 26% 8%)`);
    if (merken) { merke('la-theme', key); setzeEinstellung('farbe', key); sendeAussehen(db.current); }
  }
  function applyPattern(key, merken) {
    if (!PATTERNS.some(pp => pp[0] === key)) key = 'keins';
    pattern = key;
    document.body.dataset.pattern = key;
    if (merken) { merke('la-pattern', key); setzeEinstellung('muster', key); sendeAussehen(db.current); }
  }
  function applyVerlauf(key, merken) {
    if (!VERLAEUFE.some(v => v[0] === key)) key = 'keins';
    verlauf = key;
    document.body.dataset.verlauf = key;
    if (merken) { merke('la-verlauf', key); setzeEinstellung('verlauf', key); sendeAussehen(db.current); }
  }
  // Vor dem ersten Profil: das zuletzt auf diesem Gerät Gewählte
  function ladeTheme() {
    const t = gemerkt('la-theme'), m = gemerkt('la-pattern');
    applyTheme(THEMES[t] ? t : 'mint');
    applyPattern(m || 'keins');
    applyVerlauf(gemerkt('la-verlauf') || 'keins');
  }
  // Wer noch keine Farbe gewählt hat, bekommt eine feste aus dem Namen.
  // Wichtig: NICHT die zuletzt benutzte – sonst käme Manu mit der Farbe von
  // Levin daher, nur weil Levin vorher dran war.
  function standardFarbe(name) {
    const t = String(name || '');
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 100003;
    return THEME_DEFS[h % THEME_DEFS.length][0];
  }
  const farbeVon = name => {
    const k = einstellungVon(name, 'farbe', null);
    return themenVon(name)[k] ? k : standardFarbe(name);
  };

  // Sobald feststeht, wer eingetragen hat: dessen Farbe und Muster.
  // Beides kommt allein aus dem Profil, nichts wird vom vorigen übernommen.
  function ladeThemeVomProfil() {
    applyTheme(farbeVon(db.current));
    applyPattern(einstellung('muster', 'keins'));
    applyVerlauf(einstellung('verlauf', 'keins'));
  }
  const akzent = () => (getComputedStyle(document.documentElement)
    .getPropertyValue('--mint') || '#7BF29C').trim();

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
  const fmtDateLang = iso => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };
  // Datum und Uhrzeit in einer Zeile: „26.08.2026 – 10:34"
  const fmtWann = e => fmtDateLang(e.date) + (e.zeit ? ' – ' + e.zeit : '');
  const todayISO = () => {
    const t = new Date(), p = n => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  };

  /* ---------------- Daten ---------------- */
  const STORE = 'la-tracker-v1';
  const blank = () => ({ athletes: ['Ich'], current: 'Ich', entries: [], profileIds: {} });
  const valid = o => o && Array.isArray(o.entries) && Array.isArray(o.athletes);

  let db = blank();
  let cloud = null;              // artifact-Fähigkeit, wenn die Seite sie hat
  let sync = 'local';            // local | saving | cloud | error | readonly | conflict
  let localOnly = [];            // Werte, die nur auf diesem Gerät liegen

  // Uhrzeit als „HH:MM"; alles andere gilt als „keine Zeit erfasst".
  const pruefeZeit = z => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(z || '')) ? String(z) : '';
  const jetztHHMM = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  function normalize(o) {
    const d = Object.assign(blank(), o);
    d.profileIds = (o && o.profileIds) || {};
    d.entries = d.entries.filter(e => e && DISC[e.disc] && typeof e.value === 'number' && e.date);
    d.entries.forEach(e => { e.zeit = pruefeZeit(e.zeit); });
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


  /* ---------------- Echte Datenbank (Supabase) ----------------
     Alle Zugriffe laufen über die Funktionen aus supabase/schema.sql und
     brauchen jedes Mal den Klassen-Code. Änderungen gehen zuerst in die
     Oberfläche, dann über eine Warteschlange zum Server – so lässt sich auch
     ohne Netz weiter eintragen. */
  const WEBSITE = 'https://janneslangner-arch.github.io/leichtathletik/';
  const CFG_KEY = 'la-db-cfg', QUEUE_KEY = 'la-db-queue';
  let cfg = null;                 // {url, key, code} – bleibt auf diesem Gerät
  let queue = [];                 // noch nicht bestätigte Aufträge
  let flushing = false, lastPull = 0;

  const usingDb = () => !!cfg;
  const newId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 3 | 8)).toString(16);
      });

  function readCfg() {
    try { const c = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
          return c && c.url && c.key && c.code ? c : null; } catch (e) { return null; }
  }
  function writeCfg() {
    try { cfg ? localStorage.setItem(CFG_KEY, JSON.stringify(cfg)) : localStorage.removeItem(CFG_KEY); }
    catch (e) { /* egal */ }
  }
  function writeQueue() { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch (e) { /* egal */ } }
  function readQueue() {
    try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); return Array.isArray(q) ? q : []; }
    catch (e) { return []; }
  }
  function readEmbeddedCfg() {
    const tag = document.getElementById('appConfig');
    if (!tag) return null;
    try { const c = JSON.parse((tag.textContent || '').trim() || 'null'); return c && c.url && c.key ? c : null; }   // code optional
    catch (e) { return null; }
  }

  // Läuft in der Datenbank noch das Schema ohne Uhrzeit, fehlt dort der
  // Parameter p_zeit. Dann einmal ohne ihn senden und es sich merken.
  let ohneZeit = false;

  async function rpc(fn, args, conf) {
    const c = conf || cfg;
    if (ohneZeit && args && 'p_zeit' in args) {
      args = Object.assign({}, args); delete args.p_zeit;
    }
    const res = await fetch(c.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: c.key, Authorization: 'Bearer ' + c.key },
      body: JSON.stringify(args)
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      const meldung = (data && (data.message || data.hint)) || ('Server-Fehler ' + res.status);
      if (res.status === 404 && fn === 'profil_aussehen' && /could not find the function/i.test(meldung)) {
        ohneAussehen = true;                   // Schema noch ohne Aussehen-Spalte
        return null;
      }
      if (res.status === 404 && args && 'p_zeit' in args && /could not find the function/i.test(meldung)) {
        ohneZeit = true;                       // Schema noch ohne Uhrzeit
        const kopie = Object.assign({}, args); delete kopie.p_zeit;
        return rpc(fn, kopie, conf);
      }
      const err = new Error(meldung);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------------- Aussehen eines Profils ----------------
     Farbe, Verlauf, Muster und die eigenen Farben gehören zum Profil, nicht
     zum Gerät. Sie liegen deshalb in der Datenbank und kommen bei jedem
     Abgleich mit. Ohne Datenbank bleibt alles wie vorher im Browser. */
  const AUSSEHEN_FELDER = ['farbe', 'verlauf', 'muster', 'farbenEigen'];
  let ohneAussehen = false;              // Datenbank noch ohne die Spalte

  function aussehenVon(profil) {
    const o = {};
    AUSSEHEN_FELDER.forEach(f => {
      const v = einstellungVon(profil, f, null);
      if (v != null && v !== '') o[f] = v;
    });
    return o;
  }
  function uebernimmAussehen(profil, o) {
    if (!o || typeof o !== 'object') return;
    AUSSEHEN_FELDER.forEach(f => {
      const v = o[f];
      if (typeof v === 'string' && v) setzeEinstellungVon(profil, f, v);
    });
  }
  // Nach jeder Änderung am Aussehen: ab damit zum Server
  function sendeAussehen(profil) {
    if (!usingDb() || ohneAussehen) return;
    const id = db.profileIds && db.profileIds[profil];
    if (!id) return;
    enqueue('profil_aussehen', { p_code: cfg.code, p_id: id, p_aussehen: aussehenVon(profil) });
  }

  // Serverstand in das Format der App bringen
  function applyServer(data) {
    const profile = (data && data.profile) || [], werte = (data && data.werte) || [];
    const nameById = {}, idByName = {};
    profile.forEach(p => { nameById[p.id] = p.name; idByName[p.name] = p.id; });
    // Aussehen kommt vom Server: alle Geräte zeigen dasselbe Profil gleich.
    profile.forEach(p => uebernimmAussehen(p.name, p.aussehen));
    const names = profile.map(p => p.name);
    const current = names.includes(db.current) ? db.current : (names[0] || db.current);
    db = {
      athletes: names.length ? names : [current || 'Ich'],
      current: current || 'Ich',
      profileIds: idByName,
      entries: werte.filter(w => DISC[w.disziplin] && nameById[w.profil_id]).map(w => ({
        id: w.id, athlete: nameById[w.profil_id], disc: w.disziplin,
        value: Number(w.wert), date: String(w.datum).slice(0, 10),
        zeit: pruefeZeit(w.zeit), note: w.notiz || ''
      }))
    };
    writeLocal();
  }

  function enqueue(fn, args) { queue.push({ fn, args }); writeQueue(); flush(); }

  let retryTimer = null;
  function scheduleRetry() {
    if (retryTimer || !queue.length) return;
    retryTimer = setTimeout(() => { retryTimer = null; flush(); }, 15000);
  }

  async function flush() {
    if (!cfg || flushing || !queue.length) return;
    flushing = true;
    setSync('saving');
    while (queue.length) {
      const op = queue[0];
      let data;
      try {
        data = await rpc(op.fn, op.args);
      } catch (err) {
        flushing = false;
        if (err.status >= 400 && err.status < 500) {
          // Der Server lehnt genau diesen Auftrag ab – sonst blockiert er die Schlange
          queue.shift(); writeQueue();
          toast(err.message, { warn: true });
          setSync('db');
          flush();
        } else {
          setSync('offline');
          scheduleRetry();
        }
        return;
      }
      queue.shift(); writeQueue();
      if (!queue.length && data) {
        applyServer(data); ladeThemeVomProfil(); renderAll(); syncProfileName();
      }
    }
    flushing = false;
    lastPull = Date.now();
    setSync('db');
  }

  // Stand vom Server holen (auch, um Eingaben der anderen zu sehen)
  async function pull(force) {
    if (!cfg || queue.length || flushing) return;
    if (!force && Date.now() - lastPull < 15000) return;
    try {
      const data = await rpc('daten_lesen', { p_code: cfg.code });
      lastPull = Date.now();
      applyServer(data);
      ladeThemeVomProfil();          // das Aussehen kam eben erst herein
      renderAll(); syncProfileName(); setSync('db');
    } catch (e) { setSync('offline'); }
  }

  function ensureProfileId(name) {
    if (!db.profileIds) db.profileIds = {};
    if (!db.profileIds[name]) {
      const id = newId();
      db.profileIds[name] = id;
      enqueue('profil_anlegen', { p_code: cfg.code, p_id: id, p_name: name });
    }
    return db.profileIds[name];
  }

  function commit() {
    writeLocal();
    if (!usingDb() && cloud) scheduleSave();
  }

  /* Ein Ort für alle Änderungen: erst lokal, dann – falls verbunden – zum Server. */
  const Store = {
    addEntry(e) {
      db.entries.push(e);
      if (usingDb()) enqueue('wert_anlegen', {
        p_code: cfg.code, p_id: e.id, p_profil: ensureProfileId(e.athlete),
        p_disziplin: e.disc, p_wert: e.value, p_datum: e.date,
        p_zeit: e.zeit || '', p_notiz: e.note || ''
      });
      commit();
    },
    removeEntry(e) {
      db.entries = db.entries.filter(x => x.id !== e.id);
      if (usingDb()) enqueue('wert_loeschen', { p_code: cfg.code, p_id: e.id });
      commit();
    },
    addProfile(name) {
      db.athletes.push(name);
      if (usingDb()) ensureProfileId(name);
      commit();
    },
    renameProfile(alt, neu) {
      db.athletes = db.athletes.map(a => a === alt ? neu : a);
      db.entries.forEach(e => { if (e.athlete === alt) e.athlete = neu; });
      if (db.current === alt) db.current = neu;
      const id = db.profileIds && db.profileIds[alt];
      if (id) { delete db.profileIds[alt]; db.profileIds[neu] = id; }
      const vorher = farbeVon(alt);
      verschiebeEinstellungen(alt, neu);
      // Ohne eigene Wahl hängt die Farbe am Namen – die soll der Wechsel
      // des Namens nicht heimlich verstellen.
      if (farbeVon(neu) !== vorher) setzeEinstellungVon(neu, 'farbe', vorher);
      if (usingDb()) {
        if (id) enqueue('profil_umbenennen', { p_code: cfg.code, p_id: id, p_name: neu });
        else ensureProfileId(neu);
      }
      commit();
    },
    removeProfile(name) {
      const removed = db.entries.filter(e => e.athlete === name);
      const id = db.profileIds && db.profileIds[name];
      db.athletes = db.athletes.filter(a => a !== name);
      db.entries = db.entries.filter(e => e.athlete !== name);
      if (db.profileIds) delete db.profileIds[name];
      if (db.current === name) db.current = nachfolger();
      if (usingDb() && id) enqueue('profil_loeschen', { p_code: cfg.code, p_id: id });
      commit();
      return removed;
    },
    restoreProfile(name, removed) {
      if (!db.athletes.includes(name)) db.athletes.push(name);
      db.entries = db.entries.concat(removed);
      if (usingDb()) {
        ensureProfileId(name);
        removed.forEach(e => enqueue('wert_anlegen', {
          p_code: cfg.code, p_id: e.id, p_profil: db.profileIds[name],
          p_disziplin: e.disc, p_wert: e.value, p_datum: e.date,
          p_zeit: e.zeit || '', p_notiz: e.note || ''
        }));
      }
      commit();
    },
    switchProfile(name) { db.current = name; commit(); }
  };

  // Vorhandene Werte dieses Geräts in die Datenbank schieben.
  // Was dort schon steht, wird übersprungen – sonst gäbe es bei jeder
  // erneuten Anmeldung eine weitere Kopie derselben Leistung.
  function uploadLocal(profile, entries) {
    profile.forEach(name => { if (!db.athletes.includes(name)) db.athletes.push(name); });
    const bekannt = sigSet(db.entries);
    let neu = 0, doppelt = 0;
    entries.forEach(e => {
      if (bekannt.has(sig(e))) { doppelt++; return; }
      bekannt.add(sig(e));
      const kopie = { id: newId(), athlete: e.athlete, disc: e.disc, value: e.value,
                      date: e.date, zeit: e.zeit || '', note: e.note || '' };
      db.entries.push(kopie);
      neu++;
      enqueue('wert_anlegen', {
        p_code: cfg.code, p_id: kopie.id, p_profil: ensureProfileId(kopie.athlete),
        p_disziplin: kopie.disc, p_wert: kopie.value, p_datum: kopie.date,
        p_zeit: kopie.zeit, p_notiz: kopie.note
      });
    });
    commit(); renderAll();
    toast(neu
      ? `${neu} ${neu === 1 ? 'Wert wird' : 'Werte werden'} übertragen` + (doppelt ? `, ${doppelt} war${doppelt === 1 ? '' : 'en'} schon da` : '')
      : 'Alles war schon in der Datenbank – nichts doppelt angelegt');
  }

  // Fingerabdruck eines Wertes: gleiche Person, Disziplin, Datum und Leistung
  // gelten als derselbe Eintrag – egal welche ID er hat.
  const sig = e => [e.athlete, e.disc, e.date, Number(e.value).toFixed(3)].join('|');
  const sigSet = liste => new Set(liste.map(sig));

  const entriesOf = key => db.entries
    .filter(e => e.athlete === db.current && e.disc === key)
    .sort((a, b) => {
      const x = zeitpunkt(a), y = zeitpunkt(b);
      return x < y ? -1 : x > y ? 1 : String(a.id) < String(b.id) ? -1 : 1;
    });
  const zeitpunkt = e => e.date + ' ' + (e.zeit || '99:99');
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
    // Zusammengesetzt, damit im Quelltext dieser Datei keine schließenden
    // body-/html-Marken stehen – sonst schneiden Werkzeuge hier die Datei ab.
    const ENDE = '</bo' + 'dy>\n</ht' + 'ml>';
    // Im Datenbank-Betrieb steckt nichts in der Seite: die Werte holt sie sich
    // mit dem Klassen-Code, der nur auf dem jeweiligen Gerät liegt.
    const state = (usingDb() ? 'null' : JSON.stringify(db)).replace(/</g, '\\u003c');
    const conf = JSON.stringify(cfg ? { url: cfg.url, key: cfg.key } : readEmbeddedCfg()).replace(/</g, '\\u003c');
    const html =
      '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      '<meta name="theme-color" content="#0E1F27">\n' +
      '<title>Leichtathletik Tracker</title>\n' +
      '<style id="appStyle">\n' + css + '\n</style>\n</head>\n<body>\n' +
      '<template id="appShell">' + shell.innerHTML + '</template>\n<div id="app"></div>\n' +
      `<${T} id="appConfig" type="application/json">` + conf + `</${T}>\n` +
      `<${T} id="appState" type="application/json">` + state + `</${T}>\n` +
      `<${T} id="schemaSql" type="text/plain">` + (document.getElementById('schemaSql') || { textContent: '' }).textContent + `</${T}>\n` +
      `<${T} id="appScript">\n` + code + `\n</${T}>\n` + ENDE;
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
      setSync(usingDb() ? 'db' : 'cloud');
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
    db:       ['Datenbank',    'Werte liegen in eurer Supabase-Datenbank'],
    offline:  ['offline',      'Keine Verbindung – Änderungen werden nachgereicht'],
    needcode: ['Code fehlt',   'Datenbank hinterlegt, es fehlt der Klassen-Code'],
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
    if (chip && SYNC_TEXT[s]) {
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

  function save() { commit(); }


  /* ---------------- Abgleich-Fenster ----------------
     Deckt beim Öffnen der Seite und bei jeder Rückkehr den Bildschirm ab,
     solange gespeichert und geholt wird. */
  let syncSeit = 0, syncLaeuft = false, syncNotbremse = null;

  function showSync(text, unter) {
    const box = $('#syncScreen');
    if (!box) return;
    $('#syncScreenText').textContent = text || 'Werte werden abgeglichen …';
    $('#syncScreenSub').textContent = unter || '';
    $('#syncScreenSkip').hidden = true;
    box.hidden = false;
    box.classList.remove('is-done');
    syncSeit = Date.now();
    clearTimeout(syncNotbremse);
    syncNotbremse = setTimeout(() => hideSync('Dauert ungewöhnlich lange – die Werte liegen auch auf diesem Gerät.'), 9000);
  }

  function hideSync(meldung) {
    const box = $('#syncScreen');
    if (!box || box.hidden) return;
    clearTimeout(syncNotbremse);
    const rest = Math.max(0, 500 - (Date.now() - syncSeit));   // kein Aufblitzen
    setTimeout(() => {
      if (meldung) {
        $('#syncScreenText').textContent = meldung;
        $('#syncScreenSub').textContent = '';
        $('#syncScreenSkip').hidden = false;
        setTimeout(() => schliesseSync(), 2200);
        return;
      }
      schliesseSync();
    }, rest);
  }
  function schliesseSync() {
    const box = $('#syncScreen');
    if (!box || box.hidden) return;
    box.classList.add('is-done');
    setTimeout(() => { box.hidden = true; box.classList.remove('is-done'); }, 240);
  }

  // Bei jedem Aufruf: erst Offenes wegschicken, dann den Serverstand holen.
  async function abgleichen(text) {
    if (syncLaeuft) return;
    syncLaeuft = true;
    try {
      if (!usingDb()) {
        // Ohne Datenbank gibt es nichts zu holen: nur beim Öffnen kurz zeigen,
        // beim Zurückwechseln stillschweigend weiterlaufen.
        if (text) { showSync(text, 'von diesem Gerät'); hideSync(); }
        return;
      }
      showSync(text || 'Werte werden abgeglichen …',
               queue.length ? `${queue.length} ${queue.length === 1 ? 'Änderung wird' : 'Änderungen werden'} gesendet` : 'mit eurer Datenbank');
      await flush();
      await pull(true);
      hideSync(sync === 'offline' ? 'Keine Verbindung – die Werte von diesem Gerät bleiben erhalten.' : null);
    } finally {
      syncLaeuft = false;
    }
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
        renderDiscGrid(); syncEntryHead(); versteckeDopplung();
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
      .sort((a, b) => {
        const x = zeitpunkt(a), y = zeitpunkt(b);
        return x > y ? -1 : x < y ? 1 : String(b.id) < String(a.id) ? -1 : 1;
      })
      .slice(0, 4);
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
    li.append(main, el('span', 'meta', fmtWann(e)));
    li.append(btn('del', '✕', () => removeEntry(e), 'Wert löschen'));
    return li;
  }

  // Löschen ohne Rückfrage-Dialog: sofort weg, dafür mit Rückgängig.
  function removeEntry(e) {
    Store.removeEntry(e);
    renderAll();
    toast(`${DISC[e.disc].name} ${fmt(e.disc, e.value)} gelöscht`, {
      action: 'Rückgängig',
      onAction: () => { Store.addEntry(e); renderAll(); toast('Wieder da'); }
    });
  }

  // Warnung vor Dopplungen: derselbe Wert, dieselbe Disziplin, derselbe Tag,
  // dasselbe Profil. Zwei Leute tragen denselben Sprung ein, ohne es zu merken.
  let dopplungOk = null;                 // Kennung des bereits bestätigten Werts

  function zeigeDopplung(vorhanden, wert) {
    const d = DISC[selDisc];
    $('#dopplungText').textContent =
      `${fmt(selDisc, wert)} in ${d.name} steht für ${db.current} an diesem Tag schon drin`
      + (vorhanden.zeit ? ` – eingetragen um ${vorhanden.zeit} Uhr.` : '.')
      + ' Hat das jemand anderes schon eingetippt, oder war das ein zweiter Versuch?';
    $('#dopplung').hidden = false;
  }
  const versteckeDopplung = () => { $('#dopplung').hidden = true; };

  function addEntry(ev) {
    ev.preventDefault();
    const raw = $('#valueInput').value.trim();
    const v = parseValue(selDisc, raw);
    if (v == null) { toast('Wert nicht lesbar: ' + DISC[selDisc].hint, { warn: true }); return; }

    const datum = $('#dateInput').value || todayISO();
    const merkmal = [db.current, selDisc, datum, v.toFixed(3)].join('|');
    if (dopplungOk !== merkmal) {
      const schon = db.entries.find(e =>
        e.athlete === db.current && e.disc === selDisc && e.date === datum &&
        Math.abs(e.value - v) < 1e-9);
      if (schon) { zeigeDopplung(schon, v); return; }
    }
    dopplungOk = null;
    versteckeDopplung();

    const b = best(selDisc);
    Store.addEntry({
      id: newId(),
      athlete: db.current, disc: selDisc, value: v,
      date: $('#dateInput').value || todayISO(),
      zeit: pruefeZeit($('#timeInput').value) || jetztHHMM(),
      note: $('#noteInput').value.trim()
    });
    $('#valueInput').value = ''; $('#noteInput').value = '';
    $('#timeInput').value = jetztHHMM();       // der nächste Wert ist ein neuer Zeitpunkt
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
    const farbe = akzent();
    grad.append(svgEl('stop', { offset: '0%', 'stop-color': farbe, 'stop-opacity': '.28' }),
                svgEl('stop', { offset: '100%', 'stop-color': farbe, 'stop-opacity': '0' }));
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

    const zeile = $('#statsLine');
    zeile.textContent = '';
    const b = best(key);
    [['Best', b ? fmt(key, b.value) : '–', true],
     ['Zuletzt', list.length ? fmt(key, list[list.length - 1].value) : '–', false],
     ['Schnitt', list.length ? fmt(key, list.reduce((s, e) => s + e.value, 0) / list.length) : '–', false]
    ].forEach(([k, v, mint]) => {
      const s = el('span', 'sl-item');
      s.append(el('span', 'sl-k', k), el('span', 'sl-v' + (mint ? ' mint' : ''), v));
      zeile.append(s);
    });

    $('#alleWerteZahl').textContent = list.length
      ? '· ' + list.length + (list.length === 1 ? ' Messung' : ' Messungen')
      : '· noch leer';
    const ul = $('#discList');
    ul.textContent = '';
    if (!list.length) ul.append(el('li', 'empty', 'Für ' + d.name + ' ist noch nichts erfasst.'));
    else list.slice().reverse().forEach(e => ul.append(rowFor(e)));
  }


  /* ---------------- Wertung nach DLV und SH-Fünfkampf ----------------
     Übernommen aus „Leichtathletik_Fuenfkampf_SH.xlsx" (Blätter Grundlagen
     und Eingabe). DLV-Punkte je Disziplin:

       Lauf:  P = abrunden( (Distanz / (Zeit + Handzuschlag) − a) / c )
       Feld:  P = abrunden( (√Leistung[m] − a) / c )

     Handzeit-Zuschlag: bis 300 m +0,24 s, über 300 bis 400 m +0,14 s,
     darüber 0. Nie unter 0 Punkte. */
  const DLV = {
    m: {
      sprint100:   { typ: 'lauf', d: 100,  a: 4.3410,  c: 0.00676 },
      lauf1500:    { typ: 'lauf', d: 1500, a: 1.9122,  c: 0.00613 },
      lauf5000:    { typ: 'lauf', d: 5000, a: 1.5250,  c: 0.00560 },
      hochsprung:  { typ: 'feld', a: 0.8410,  c: 0.00080 },
      weitsprung:  { typ: 'feld', a: 1.15028, c: 0.00219 },
      kugelstossen:{ typ: 'feld', a: 1.4250,  c: 0.00370 },
      speerwurf:   { typ: 'feld', a: 0.3500,  c: 0.01052 }
    },
    // Mädchen laufen in der Vorlage die kürzeren Strecken: 800 m statt
    // 1500 m und 2000 m statt 5000 m. Die Zeile heißt weiter 1500/5000,
    // gerechnet wird mit den Beiwerten der tatsächlich gelaufenen Strecke.
    w: {
      sprint100:   { typ: 'lauf', d: 100,  a: 4.0062,  c: 0.00656 },
      lauf1500:    { typ: 'lauf', d: 800,  a: 2.0232,  c: 0.00647, strecke: '800 m' },
      lauf5000:    { typ: 'lauf', d: 2000, a: 1.8000,  c: 0.00540, strecke: '2000 m' },
      hochsprung:  { typ: 'feld', a: 0.8807,  c: 0.00068 },
      weitsprung:  { typ: 'feld', a: 1.0935,  c: 0.00208 },
      kugelstossen:{ typ: 'feld', a: 1.2790,  c: 0.00398 },
      speerwurf:   { typ: 'feld', a: 0.4220,  c: 0.01012 }
    }
  };

  // Mindestpunkte der Fünfkampf-Summe für 15 bis 0 Notenpunkte
  const NOTENPUNKTE = {
    w: [[2255,15],[2170,14],[2085,13],[2000,12],[1915,11],[1830,10],[1745,9],[1670,8],
        [1585,7],[1500,6],[1415,5],[1330,4],[1245,3],[1160,2],[1075,1],[0,0]],
    m: [[2535,15],[2465,14],[2400,13],[2330,12],[2260,11],[2190,10],[2120,9],[2060,8],
        [1980,7],[1930,6],[1840,5],[1770,4],[1710,3],[1650,2],[1590,1],[0,0]]
  };
  const NOTEN = ['6','5−','5','5+','4−','4','4+','3−','3','3+','2−','2','2+','1−','1','1+'];
  const noteZuPunkten = p => NOTEN[p] || '–';

  const GERAETE = {
    'w|U18': 'Kugel 3 kg · Speer 600 g', 'w|U20': 'Kugel 4 kg · Speer 600 g',
    'w|U23': 'Kugel 4 kg · Speer 600 g', 'm|U18': 'Kugel 5 kg · Speer 800 g',
    'm|U20': 'Kugel 6 kg · Speer 800 g', 'm|U23': 'Kugel 7,26 kg · Speer 800 g'
  };

  // Fünfkampf: je eine Disziplin aus vier Gruppen, die fünfte frei
  /* Die vier Pflichtbereiche des Fünfkampfs, in der Reihenfolge der
     Prüfungsordnung. Die fünfte Disziplin ist frei und wird dort gewertet,
     wo sie am meisten bringt. Angeboten werden hier nur die Disziplinen des
     Schulsports; 200 m, 400 m und Diskus kommen bei uns nicht vor. */
  const GRUPPEN = () => ({
    Sprint:   ['sprint100'],
    Wurf:     ['kugelstossen', 'speerwurf'],
    Sprung:   ['hochsprung', 'weitsprung'],
    Langlauf: ['lauf1500', 'lauf5000']
  });

  const HAND_ZUSCHLAG = d => d <= 300 ? 0.24 : d <= 400 ? 0.14 : 0;

  function dlvPunkte(disc, wert, geschlecht, handzeit) {
    const t = (DLV[geschlecht] || {})[disc];
    if (!t || !(wert > 0)) return null;
    if (t.typ === 'lauf') {
      const zeit = wert + (handzeit ? HAND_ZUSCHLAG(t.d) : 0);
      return Math.max(0, Math.floor((t.d / zeit - t.a) / t.c));
    }
    return Math.max(0, Math.floor((Math.sqrt(wert) - t.a) / t.c));
  }

  function notenpunkte(summe, geschlecht) {
    for (const [grenze, punkte] of (NOTENPUNKTE[geschlecht] || NOTENPUNKTE.m))
      if (summe >= grenze) return punkte;
    return 0;
  }
  const notenpunkteEinzel = (p, geschlecht) => notenpunkte(p * 5, geschlecht);

  /* Beste gültige Zusammenstellung: je eine Disziplin aus Sprint, Sprung,
     Wurf/Stoß und Langstrecke, dazu eine zweite aus genau einer Gruppe. */
  function fuenfkampf(punkteJeDisziplin, geschlecht) {
    const gruppen = GRUPPEN(geschlecht);
    const werte = {};
    let vorhanden = 0;
    Object.entries(gruppen).forEach(([name, keys]) => {
      werte[name] = keys.map(k => punkteJeDisziplin[k]).filter(p => p != null).sort((a, b) => b - a);
      vorhanden += werte[name].length;
    });
    const fehlend = Object.entries(werte).filter(([, v]) => !v.length).map(([n]) => n);
    if (fehlend.length) return {
      summe: null, fehlend,
      status: (fehlend.length === 1 ? fehlend[0] + ' fehlt' : 'Es fehlen: ' + fehlend.join(', '))
    };
    if (vorhanden < 5) return {
      summe: null, fehlend: [],
      status: `noch ${5 - vorhanden} Ergebnis${5 - vorhanden === 1 ? '' : 'se'} bis zur Wertung`
    };

    let beste = null;
    Object.keys(gruppen).forEach(zusatz => {
      if (werte[zusatz].length < 2) return;
      let summe = 0;
      const gezaehlt = {};
      Object.entries(werte).forEach(([name, v]) => {
        gezaehlt[name] = v.slice(0, name === zusatz ? 2 : 1);
        summe += gezaehlt[name].reduce((a, b) => a + b, 0);
      });
      if (!beste || summe > beste.summe) beste = { summe, zusatz, gezaehlt, status: 'gültig' };
    });
    return beste || { status: 'noch 1 Ergebnis bis zur Wertung', summe: null, fehlend: [] };
  }

  /* ---------------- Einstellungen der Wertung (je Profil) ---------------- */
  function einstellungVon(profil, name, standard) {
    try {
      const alle = JSON.parse(localStorage.getItem('la-wertung') || '{}');
      return (alle[profil] || {})[name] || standard;
    } catch (e) { return standard; }
  }
  const einstellung = (name, standard) => einstellungVon(db.current, name, standard);

  // Beim Umbenennen wandern die Einstellungen mit, beim Löschen gehen sie weg.
  function verschiebeEinstellungen(alt, neu) {
    try {
      const alle = JSON.parse(localStorage.getItem('la-wertung') || '{}');
      if (!alle[alt]) return;
      if (neu) alle[neu] = alle[alt];
      delete alle[alt];
      localStorage.setItem('la-wertung', JSON.stringify(alle));
    } catch (e) { /* egal */ }
  }
  function setzeEinstellungVon(profil, name, wert) {
    try {
      const alle = JSON.parse(localStorage.getItem('la-wertung') || '{}');
      alle[profil] = Object.assign({}, alle[profil], { [name]: wert });
      localStorage.setItem('la-wertung', JSON.stringify(alle));
    } catch (e) { /* egal */ }
  }
  function setzeEinstellung(name, wert) {
    try {
      const alle = JSON.parse(localStorage.getItem('la-wertung') || '{}');
      alle[db.current] = Object.assign({}, alle[db.current], { [name]: wert });
      localStorage.setItem('la-wertung', JSON.stringify(alle));
    } catch (e) { /* egal */ }
  }
  const geschlechtVon = () => einstellung('geschlecht', 'm');
  // Altersklassen wie in der Vorlage: 16–17 = U18, 18–19 = U20, 20–22 = U23
  function altersklasse(jahr) {
    if (!jahr) return null;
    const alter = new Date().getFullYear() - jahr;
    if (alter < 16) return 'U18';
    if (alter <= 17) return 'U18';
    if (alter <= 19) return 'U20';
    return 'U23';
  }
  const zeitmessungVon = () => einstellung('zeit', geschlechtVon() === 'w' ? 'hand' : 'elektro');
  const klasseVon = () => einstellung('klasse', altersklasse(Number(einstellung('jahr', 0))) || 'U20');

  // Name der Disziplin, bei den Läufen mit der Strecke, die tatsächlich zählt
  const strecke = (key, g) => {
    const s = ((DLV[g] || {})[key] || {}).strecke;
    return s ? s + ' Lauf' : DISC[key].name;
  };

  function renderPunkte() {
    const g = geschlechtVon(), zeit = zeitmessungVon(), klasse = klasseVon();
    const hand = zeit === 'hand';
    $('#wertungInfo').textContent =
      `${g === 'w' ? 'Mädchen' : 'Jungen'} · ${hand ? 'Handzeit' : 'elektronisch'} · ${klasse}`;

    const punkte = {}, bestwerte = {};
    KEYS.forEach(key => {
      const b = best(key);
      bestwerte[key] = b;
      punkte[key] = b ? dlvPunkte(key, b.value, g, hand) : null;
    });

    const ergebnis = fuenfkampf(punkte, g);
    const offen = {};
    if (ergebnis.summe != null)
      Object.entries(ergebnis.gezaehlt).forEach(([k, v]) => { offen[k] = v.slice(); });

    $('#punkteSumme').textContent = ergebnis.summe != null ? ergebnis.summe.toLocaleString('de-DE') : '–';
    if (ergebnis.summe != null) {
      const np = notenpunkte(ergebnis.summe, g);
      $('#punkteNote').textContent = np + ' NP';
      $('#punkteNoteFein').textContent = 'Note ' + noteZuPunkten(np);
      const naechste = (NOTENPUNKTE[g] || NOTENPUNKTE.m).find(([, p]) => p === np + 1);
      $('#punkteStatus').textContent = naechste
        ? `noch ${naechste[0] - ergebnis.summe} Punkte bis ${np + 1} NP`
        : 'Höchstwertung';
    } else {
      $('#punkteNote').textContent = '–';
      $('#punkteNoteFein').textContent = '';
      $('#punkteStatus').textContent = ergebnis.status;
    }

    // Eine Zeile je Disziplin: Wert links, DLV-Punkte rechts.
    const zeile = (key, gruppe, zaehlt) => {
      const d = DISC[key], b = bestwerte[key], p = punkte[key];
      const li = el('li', 'row punkte-row' + (zaehlt ? ' is-gezaehlt' : ''));
      li.append(el('span', 'ic', d.ic));
      const main = el('div', 'main');
      main.append(el('div', 'nm', gruppe));
      main.append(el('div', 'val', b ? fmt(key, b.value) : '– kein Wert'));
      li.append(main);
      const rechts = el('div', 'punkte-wert');
      rechts.append(el('span', 'p-zahl' + (p == null ? ' p-leer' : ''), p == null ? '–' : String(p)));
      rechts.append(el('span', 'p-einheit', 'Punkte'));
      li.append(rechts);
      return li;
    };

    // Pflichtbereiche: was ist abgedeckt, was fehlt noch?
    const vor = $('#voraussetzungen');
    vor.textContent = '';
    Object.entries(GRUPPEN(g)).forEach(([gruppe, keys], i) => {
      // bester vorhandener Wert des Bereichs
      let beste = null;
      keys.forEach(key => {
        if (punkte[key] == null) return;
        if (!beste || punkte[key] > punkte[beste]) beste = key;
      });
      const li = el('li', 'vor-zeile' + (beste ? ' ist-da' : ' fehlt'));
      li.append(el('span', 'vor-nr', String(i + 1)));

      const mitte = el('div', 'vor-text');
      mitte.append(el('span', 'vor-name', gruppe));
      mitte.append(el('span', 'vor-sub', beste
        ? `${DISC[beste].name} · ${fmt(beste, bestwerte[beste].value)}`
        : keys.map(k => strecke(k, g)).join(' oder ')));
      li.append(mitte);

      li.append(el('span', 'vor-marke', beste ? String(punkte[beste]) : 'fehlt'));
      vor.append(li);
    });
    const frei = el('li', 'vor-zeile vor-frei');
    frei.append(el('span', 'vor-nr', '5'));
    const fm = el('div', 'vor-text');
    fm.append(el('span', 'vor-name', 'Fünfte Disziplin'));
    fm.append(el('span', 'vor-sub', ergebnis.summe != null
      ? 'frei wählbar · zählt gerade in ' + ergebnis.zusatz
      : 'frei wählbar – aus einem beliebigen Bereich'));
    frei.append(fm);
    frei.append(el('span', 'vor-marke', ergebnis.summe != null ? '✓' : 'offen'));
    vor.append(frei);

    // Oben nur die fünf, die in die Note eingehen.
    const liste = $('#punkteListe');
    liste.textContent = '';
    const gezaehlteKeys = [];
    Object.entries(GRUPPEN(g)).forEach(([gruppe, keys]) => {
      keys.forEach(key => {
        const p = punkte[key];
        if (p == null || !offen[gruppe] || !offen[gruppe].includes(p)) return;
        offen[gruppe].splice(offen[gruppe].indexOf(p), 1);
        gezaehlteKeys.push(key);
        liste.append(zeile(key, DISC[key].name, true));
      });
    });
    if (!gezaehlteKeys.length)
      liste.append(el('li', 'empty', ergebnis.fehlend && ergebnis.fehlend.length
        ? 'Sobald alle vier Pflichtbereiche einen Wert haben, steht hier die Wertung.'
        : (ergebnis.status || 'Noch zu wenige Werte für den Fünfkampf.')));

    // Ausgeklappt: alle sieben mit Einzelnote.
    const alle = $('#punkteAlle');
    alle.textContent = '';
    Object.entries(GRUPPEN(g)).forEach(([gruppe, keys]) => {
      keys.forEach(key => {
        const li = zeile(key, gruppe, gezaehlteKeys.includes(key));
        const p = punkte[key];
        if (p != null) {
          const np = notenpunkteEinzel(p, g);
          li.querySelector('.punkte-wert').append(
            el('span', 'p-note', `einzeln ${np} NP · ${noteZuPunkten(np)}`));
        }
        const strecke = ((DLV[g] || {})[key] || {}).strecke;
        li.querySelector('.main .nm').textContent =
          DISC[key].name + (strecke ? ` · bei Mädchen ${strecke}` : '');
        alle.append(li);
      });
    });

    const langlauf = g === 'w' ? '800 m oder 2000 m' : '1500 m oder 5000 m';
    $('#punkteHinweis').textContent =
      'Ein Ergebnis gibt es nur, wenn unter den fünf gewerteten Disziplinen mindestens '
      + 'je eine aus Sprint, Wurf, Sprung und Langlauf steckt. Die fünfte ist frei wählbar '
      + 'und wird dort eingesetzt, wo sie am meisten bringt. '
      + `Langlauf heißt bei ${g === 'w' ? 'Mädchen' : 'Jungen'} ${langlauf}. `
      + `DLV-Punkte je Disziplin aus dem Bestwert, ${hand ? 'Handzeit (Zuschlag 0,24 s bis 300 m, 0,14 s bis 400 m)' : 'elektronische Zeitmessung'}; `
      + 'Note aus der Summe nach der SH-Tabelle (15 NP = 1+, 0 NP = 6). '
      + `${klasse}: ${GERAETE[g + '|' + klasse] || ''}. `
      + 'Nicht dabei: 200 m, 400 m und Diskus – die gibt es im Schulsport hier nicht.';
  }

  // Die Seite bringt Adresse, Schlüssel und Klassen-Code mit: dann ist die
  // Verbindung nicht verhandelbar – weder wechseln noch trennen.
  function festeVerbindung() {
    const fest = readEmbeddedCfg();
    return !!(fest && fest.code && cfg && String(fest.code).toLowerCase() === cfg.code);
  }

  // Einmal wirklich anfragen: antwortet die Datenbank, meldet sie einen
  // Fehler, oder kommt gar nichts an?
  async function pruefeVerbindung() {
    try {
      const data = await rpc('daten_lesen', { p_code: cfg.code });
      const n = ((data || {}).werte || []).length, m = ((data || {}).profile || []).length;
      return `Alles in Ordnung: Die Datenbank antwortet und kennt ${m} ${m === 1 ? 'Profil' : 'Profile'} `
        + `und ${n} ${n === 1 ? 'Wert' : 'Werte'} in der Gruppe „${cfg.code}“.`;
    } catch (err) {
      if (err.status) return 'Die Datenbank meldet: ' + err.message + (err.status === 404
        ? ' – ist das Schema aus supabase/schema.sql im SQL-Editor gelaufen?' : '');
      return 'Keine Verbindung zur Datenbank. ' + (await diagnose(cfg.url));
    }
  }

  function renderStorageInfo() {
    const box = document.getElementById('storageInfo');
    const acts = document.getElementById('storageActions');
    if (!box || !acts) return;
    box.textContent = ''; acts.textContent = '';
    const line = t => { const n = el('p', null, t); n.style.margin = '0 0 8px'; box.append(n); };

    if (usingDb()) {
      // Steht der Klassen-Code in der Seite, ist die Verbindung fest: dann
      // gibt es hier nichts zu wechseln und nichts zu trennen.
      const fest = festeVerbindung();
      line(fest
        ? `Fest verbunden mit der Klassen-Datenbank (Gruppe „${cfg.code}“). Alle, die diese Seite öffnen, tragen in denselben Bestand ein – ohne Anmeldung. Umstellen lässt sich das hier nicht.`
        : `Verbunden mit ${cfg.url.replace(/^https?:\/\//, '')}, Gruppe „${cfg.code}“.`);
      if (queue.length) line(`${queue.length} ${queue.length === 1 ? 'Änderung wartet' : 'Änderungen warten'} auf die Verbindung und ${queue.length === 1 ? 'wird' : 'werden'} nachgereicht.`);
      else line('Eine Kopie bleibt zusätzlich auf diesem Gerät, damit die App auch ohne Netz läuft.');
      acts.append(btn('btn', 'Jetzt abgleichen', () => pull(true)));
      // Wenn die feste Verbindung klemmt, soll man wenigstens erfahren, woran.
      acts.append(btn('btn', 'Verbindung prüfen', async ev => {
        const knopf = ev && ev.currentTarget;
        if (knopf) { knopf.disabled = true; knopf.textContent = 'Prüfe …'; }
        box.querySelectorAll('.db-befund').forEach(n => n.remove());
        box.append(el('p', 'db-befund', await pruefeVerbindung()));
        if (knopf) { knopf.disabled = false; knopf.textContent = 'Verbindung prüfen'; }
      }));
      if (!fest) acts.append(btn('btn', 'Verbindung ändern', openDbDialog));
      return;
    }

    line(cloud
      ? 'Gespeichert wird in der Seite selbst (Claude-Cloud): Die Werte sind auf jedem Gerät da, das diesen Link öffnet. Eine Kopie liegt zusätzlich in diesem Browser.'
      : 'Gespeichert wird nur in diesem Browser (localStorage) – also auf diesem Gerät.');
    if (cloud && readEmbeddedCfg()) {
      line('Die gemeinsame Datenbank funktioniert hier nicht: Claude-Seiten dürfen keine Verbindung nach außen aufbauen. Dafür gibt es die Website – dort tragen alle mit dem Klassen-Code in denselben Bestand ein:');
      const a = el('a', 'weblink', WEBSITE);
      a.href = WEBSITE; a.target = '_blank'; a.rel = 'noopener';
      box.append(a);
    } else {
      line('Für eine echte Datenbank (mehrere Geräte, ganze Klasse, gleichzeitiges Eintragen) genügt ein kostenloses Supabase-Projekt.');
      acts.append(btn('btn btn-mint', 'Datenbank verbinden', openDbDialog));
    }

    if (cloud && localOnly.length) {
      line(`${localOnly.length} ${localOnly.length === 1 ? 'Wert liegt' : 'Werte liegen'} nur auf diesem Gerät.`);
      acts.append(btn('btn', 'In die Cloud übernehmen', () => {
        db.entries = db.entries.concat(localOnly);
        localOnly = [];
        db = normalize(db);
        save(); renderAll();
        toast('Werte übernommen');
      }));
    }
  }

  /* ---------------- Datenbank-Dialog ---------------- */
  const dbHint = t => { $('#dbHint').textContent = t; };

  // Antwortet der Server überhaupt? Ohne CORS-Regeln, deshalb no-cors:
  // gelingt die Anfrage, steht der Server; scheitert sie, ist er gar nicht da.
  async function serverErreichbar(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      await fetch(url.replace(/\/+$/, '') + '/rest/v1/', { mode: 'no-cors', signal: ctrl.signal });
      return true;
    } catch (e) {
      return false;
    } finally { clearTimeout(t); }
  }

  // Wenn gar keine Antwort kommt: herausfinden, woran es liegt.
  async function diagnose(url) {
    if (window.claude && typeof window.claude.use === 'function')
      return 'Diese Claude-Seite darf keine Verbindung nach außen aufbauen. Die Datenbank läuft nur auf der Website: ' + WEBSITE;
    if (navigator.onLine === false)
      return 'Das Gerät ist offline. Netz prüfen und noch einmal versuchen.';
    return (await serverErreichbar(url))
      ? 'Der Server antwortet, lehnt die Anfrage aber ab. Meist liegt es an einem Browser-Add-on (Adblocker, Privatsphäre-Schutz), das supabase.co blockiert – oder die Data API ist im Projekt ausgeschaltet (Supabase → Settings → API).'
      : 'Der Server ist nicht erreichbar. Häufigster Grund: Das Supabase-Projekt ist pausiert oder wird noch eingerichtet – im Supabase-Dashboard nachsehen und auf „Restore“ drücken bzw. warten, bis es „Active“ ist. Sonst prüfen, ob die Projekt-URL stimmt.';
  }

  async function testeVerbindung() {
    const url = $('#dbUrl').value.trim();
    if (!/^https?:\/\//.test(url)) { dbHint('Erst die Projekt-URL eintragen.'); return; }
    dbHint('Teste …');
    dbHint(await diagnose(url));
  }

  function openDbDialog() {
    if (festeVerbindung()) { toast('Die Klassen-Datenbank steht fest'); return; }
    const emb = readEmbeddedCfg();
    $('#dbUrl').value = (cfg && cfg.url) || (emb && emb.url) || '';
    $('#dbKey').value = (cfg && cfg.key) || (emb && emb.key) || '';
    $('#dbCode').value = (cfg && cfg.code) || '';
    $('#dbDisconnect').hidden = !cfg;
    $('#dbShare').hidden = !cfg;
    dbHint(cfg ? 'Verbunden. Ein anderer Klassen-Code öffnet eine andere Gruppe.'
               : 'Der Klassen-Code ist das Passwort eurer Gruppe. Er wird nicht in der Seite gespeichert, sondern nur auf diesem Gerät.');
    $('#dbDialog').showModal();
    if (!$('#dbUrl').value) $('#dbUrl').focus(); else $('#dbCode').focus();
  }

  async function submitDb(ev) {
    ev.preventDefault();
    const url = $('#dbUrl').value.trim();
    const key = $('#dbKey').value.trim();
    const code = $('#dbCode').value.trim().toLowerCase();
    if (!/^https?:\/\//.test(url)) { dbHint('Die Projekt-URL beginnt mit https:// – sie steht in Supabase unter Project Settings → API.'); return; }
    if (!key) { dbHint('Der anon public key fehlt – ebenfalls unter Project Settings → API.'); return; }
    if (code.length < 6) { dbHint('Der Klassen-Code braucht mindestens 6 Zeichen.'); return; }

    dbHint('Verbinde …');
    const conf = { url: url.replace(/\/+$/, ''), key, code };
    let data;
    try {
      data = await rpc('daten_lesen', { p_code: code }, conf);
    } catch (err) {
      if (err.status) {                       // Server hat geantwortet, aber abgelehnt
        dbHint('Die Datenbank meldet: ' + err.message + (err.status === 404
          ? ' – ist das Schema aus supabase/schema.sql im SQL-Editor gelaufen?' : ''));
      } else {                                // gar keine Antwort
        dbHint('Keine Verbindung zur Datenbank. ' + (await diagnose(conf.url)));
      }
      return;
    }

    const lokaleWerte = usingDb() ? [] : db.entries.slice();
    const lokaleProfile = usingDb() ? [] : db.athletes.slice();
    cfg = conf; writeCfg();
    queue = []; writeQueue();
    applyServer(data);
    renderAll(); syncProfileName(); setSync('db');
    if (cloud) publishNow();                     // URL und Key in die Seite, damit andere Geräte sie haben

    const schonDa = sigSet(db.entries);
    const wirklichNeu = lokaleWerte.filter(e => !schonDa.has(sig(e)));
    if (wirklichNeu.length) {
      const schon = lokaleWerte.length - wirklichNeu.length;
      dbHint(`Verbunden. ${wirklichNeu.length} ${wirklichNeu.length === 1 ? 'Wert von diesem Gerät fehlt' : 'Werte von diesem Gerät fehlen'} in der Datenbank`
        + (schon ? ` (${schon} ${schon === 1 ? 'war' : 'waren'} schon da)` : '') + ' – übertragen?');
      $('#dbHint').append(document.createElement('br'), btn('btn btn-mint btn-sm', 'Übertragen', () => {
        uploadLocal(lokaleProfile, wirklichNeu);
        $('#dbDialog').close();
      }));
    } else {
      dbHint(lokaleWerte.length
        ? 'Verbunden – alle Werte von diesem Gerät waren schon da, nichts wurde doppelt angelegt.'
        : 'Verbunden.');
      toast(lokaleWerte.length ? 'Verbunden – alle Werte waren schon da' : 'Mit der Datenbank verbunden');
      $('#dbDialog').close();
    }
  }

  // Projekt-URL und Key für eine eigene Website (GitHub Pages) herausgeben.
  // Der Klassen-Code bleibt außen vor – der wird nie geteilt.
  async function shareCfg() {
    if (!cfg) return;
    const T = 'scr' + 'ipt';
    const zeile = `<${T} id="appConfig" type="application/json">`
      + JSON.stringify({ url: cfg.url, key: cfg.key }) + `</${T}>`;
    try {
      await navigator.clipboard.writeText(zeile);
      dbHint('Kopiert. Damit in index.html die Zeile mit id="appConfig" ersetzen und hochladen – '
        + 'dann brauchen die anderen nur noch den Klassen-Code.');
      return;
    } catch (e) { /* Zwischenablage gesperrt */ }
    const box = $('#dbHint');
    box.textContent = 'Diese Zeile in index.html bei id="appConfig" einsetzen:';
    const ta = el('textarea', 'sql-box');
    ta.value = zeile; ta.readOnly = true;
    box.append(ta); ta.focus(); ta.select();
  }

  function disconnectDb() {
    cfg = null; writeCfg();
    queue = []; writeQueue();
    setSync(cloud ? 'cloud' : 'local');
    $('#dbDialog').close();
    toast('Verbindung getrennt – die Werte bleiben auf diesem Gerät');
  }

  async function copySql() {
    const tag = document.getElementById('schemaSql');
    const sql = tag ? tag.textContent.trim() : '';
    if (!sql || sql.startsWith('/*')) { dbHint('Das SQL-Skript liegt im Repo unter supabase/schema.sql'); return; }
    try {
      await navigator.clipboard.writeText(sql);
      toast('SQL kopiert – im SQL-Editor einfügen und Run drücken');
      return;
    } catch (e) { /* Zwischenablage gesperrt: Textfeld zum Markieren zeigen */ }
    const box = $('#dbHint');
    box.textContent = 'Text markieren und kopieren:';
    const ta = el('textarea', 'sql-box');
    ta.value = sql; ta.readOnly = true;
    box.append(ta);
    ta.focus(); ta.select();
  }

  /* ---------------- Profile ---------------- */
  function syncProfileName() {
    const n = document.getElementById('profileName');
    if (n) n.textContent = db.current;
    const g = document.getElementById('greetName');
    if (g) g.textContent = db.current;
  }

  function switchTo(name) {
    merke('la-profil-gewaehlt', name);
    Store.switchProfile(name);
    ladeThemeVomProfil();          // jedes Profil hat seine eigene Farbe
    renderAll(); syncProfileName(); renderProfiles();
    closePicker();
    toast('Hallo ' + name + '!');
  }

  // Monogramm: erste Buchstaben von bis zu zwei Namensteilen
  const monogram = name => name.split(/[\s.\-_]+/).filter(Boolean).slice(0, 2)
    .map(t => t[0].toUpperCase()).join('') || name[0].toUpperCase();

  // Kachelfarbe: hat das Profil selbst eine Farbe gewählt, gilt genau die.
  // Sonst der Farbton des aktuellen Schemas, leicht gestreut, damit sich die
  // Kacheln trotzdem auseinanderhalten lassen.
  function tint(name) {
    const t = themenVon(name);
    return (t[farbeVon(name)] || THEMES.mint).hue;
  }
  function paintAvatar(span, name) {
    const h = tint(name);
    span.textContent = monogram(name);
    span.dataset.hue = h;
    span.style.background = `linear-gradient(155deg, hsl(${h} 44% 27%), hsl(${h} 46% 16%))`;
    span.style.color = `hsl(${h} 72% 74%)`;
  }

  // Wer wird aktiv, wenn das aktuelle Profil verschwindet? Nicht das leere
  // Vorgabe-Profil „Ich", solange es echte Profile gibt.
  function nachfolger() {
    const echte = db.athletes.filter(n => n !== 'Ich' || countOf('Ich') > 0);
    return echte.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))[0]
      || db.athletes[0];
  }

  // „Ich" ist nur die Vorbelegung eines frischen Geräts. Sobald echte Profile
  // da sind und darunter kein Wert liegt, taucht es nirgends mehr auf.
  function sichtbareProfile() {
    return db.athletes
      .filter(n => n !== 'Ich' || n === db.current || countOf('Ich') > 0 || db.athletes.length === 1)
      .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
  }

  /* ---------------- Profil wechseln (Vollbild) ---------------- */
  function openPicker(frage) {
    renderPicker();
    const titel = document.querySelector('.pscreen-title');
    if (titel) titel.textContent = frage || 'Wer trägt ein?';
    const screen = $('#profileScreen');
    screen.hidden = false;
    screen.scrollTop = 0;          // sonst steht das Vollbild noch dort, wo es zuletzt stand
    document.body.style.overflow = 'hidden';
  }
  function closePicker() {
    $('#profileScreen').hidden = true;
    document.body.style.overflow = '';
  }

  function renderPicker() {
    const grid = $('#profileGrid');
    grid.textContent = '';
    sichtbareProfile().forEach(name => {
      const li = el('li');
      const tile = btn('p-tile' + (name === db.current ? ' is-current' : ''), null,
        () => name === db.current ? closePicker() : switchTo(name),
        name === db.current ? 'Aktives Profil' : 'Zu ' + name + ' wechseln');
      const av = el('span', 'p-avatar');
      paintAvatar(av, name);
      const n = countOf(name);
      tile.append(av, el('span', 'p-label', name),
                  el('span', 'p-sub', n ? n + (n === 1 ? ' Wert' : ' Werte') : 'noch leer'));
      li.append(tile);
      grid.append(li);
    });

    const add = el('li');
    const addTile = btn('p-tile p-tile-add', null, openNeuesProfil, 'Neues Profil anlegen');
    addTile.append(el('span', 'p-avatar p-avatar-add', '+'), el('span', 'p-label', 'Neu'));
    add.append(addTile);
    grid.append(add);
  }


  // Auf einem neuen Gerät steht noch nicht fest, wer eintragt: direkt fragen.
  function starteProfilwahl() {
    let gewaehlt = null;
    try { gewaehlt = localStorage.getItem('la-profil-gewaehlt'); } catch (e) { /* egal */ }
    if (gewaehlt && db.athletes.includes(gewaehlt)) return;
    if (!db.athletes.length || (db.athletes.length === 1 && db.athletes[0] === 'Ich' && !countOf('Ich')))
      openNeuesProfil();
    else
      openPicker();
  }

  /* ---------------- Profil anlegen (Vollbild) ---------------- */
  let npGeschlecht = 'm';

  function openNeuesProfil() {
    closePicker();
    npGeschlecht = 'm';
    $('#npName').value = '';
    $('#npJahr').value = '';
    document.querySelectorAll('#npGeschlecht .seg-btn').forEach(b =>
      b.classList.toggle('is-active', b.dataset.wert === 'm'));
    npHinweis();
    const screen = $('#profilScreen');
    screen.hidden = false;
    screen.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#npName').focus(), 30);
  }
  function closeNeuesProfil() {
    $('#profilScreen').hidden = true;
    document.body.style.overflow = '';
  }
  function npHinweis(text) {
    const jahr = Number($('#npJahr').value);
    const klasse = altersklasse(jahr);
    $('#npHinweis').textContent = text || (klasse
      ? `Jahrgang ${jahr} · Altersklasse ${klasse} · ${GERAETE[npGeschlecht + '|' + klasse]}`
      : 'Beides bestimmt die Punkte: die Tabelle die Beiwerte, das Geburtsjahr die Altersklasse und damit die Gerätegewichte.');
  }

  /* Jedes neue Profil bekommt ein eigenes Aussehen zugelost: eine Farbe und
     einen Verlauf. Farben, die andere Profile schon haben, werden dabei
     übersprungen, solange noch welche frei sind – so sehen die Kacheln in
     der Auswahl unterschiedlich aus. Ändern lässt sich beides jederzeit. */
  function zufaelligesAussehen(name) {
    const wuerfel = liste => liste[Math.floor(Math.random() * liste.length)];
    const vergeben = new Set(db.athletes.filter(a => a !== name).map(a => farbeVon(a)));
    const frei = THEME_DEFS.map(([key]) => key).filter(key => !vergeben.has(key));
    const farben = frei.length ? frei : THEME_DEFS.map(([key]) => key);
    const verlaeufe = VERLAEUFE.map(([key]) => key).filter(key => key !== 'keins');
    return { farbe: wuerfel(farben), verlauf: wuerfel(verlaeufe) };
  }

  function speichereNeuesProfil(ev) {
    ev.preventDefault();
    const name = $('#npName').value.trim();
    const jahr = Number($('#npJahr').value);
    if (!name) { npHinweis('Bitte einen Namen eingeben.'); $('#npName').focus(); return; }
    if (db.athletes.includes(name)) { npHinweis(`„${name}“ gibt es schon.`); return; }
    const jetzt = new Date().getFullYear();
    if ($('#npJahr').value && (jahr < 1950 || jahr > jetzt)) {
      npHinweis(`Geburtsjahr zwischen 1950 und ${jetzt} eingeben.`); $('#npJahr').focus(); return;
    }
    Store.addProfile(name);
    // Aussehen auslosen, bevor gewechselt wird – dann steht es schon,
    // wenn das neue Profil zum ersten Mal gezeichnet wird.
    const look = zufaelligesAussehen(name);
    setzeEinstellungVon(name, 'farbe', look.farbe);
    setzeEinstellungVon(name, 'verlauf', look.verlauf);
    sendeAussehen(name);                  // auch das Zufallslos gilt für alle Geräte
    switchTo(name);                       // ab hier gelten die Einstellungen dem neuen Profil
    setzeEinstellung('geschlecht', npGeschlecht);
    if (jahr) setzeEinstellung('jahr', String(jahr));
    closeNeuesProfil();
    renderAll();
    toast('Profil angelegt: ' + name);
  }

  /* ---------------- Reiter „Profil“ ---------------- */
  function renderProfil() {
    paintAvatar($('#profilAvatar'), db.current);
    $('#profilName').textContent = db.current;
    const n = countOf(db.current);
    const jahr = Number(einstellung('jahr', 0));
    $('#profilWerte').textContent =
      (n ? `${n} ${n === 1 ? 'Wert' : 'Werte'}` : 'noch keine Werte')
      + ` · ${geschlechtVon() === 'w' ? 'Mädchen' : 'Jungen'}`
      + (jahr ? ` · Jahrgang ${jahr}` : '') + ` · ${klasseVon()}`;
    const anzahl = sichtbareProfile().length;
    $('#profileAnzahl').textContent = `${anzahl} ${anzahl === 1 ? 'Profil' : 'Profile'} · anlegen, umbenennen, löschen`;
  }

  function renderProfilListe() {
    const list = $('#profileList');
    list.textContent = '';
    sichtbareProfile().forEach(name => {
      const li = el('li', 'p-row' + (name === db.current ? ' is-current' : ''));
      drawProfileRow(li, name);
      list.append(li);
    });
    $('#profileHint').textContent = 'Umbenennen ändert nichts an den Werten – sie wandern mit.';
  }

  function renderEinstellungen() {
    const g = geschlechtVon(), zeit = zeitmessungVon(), klasse = klasseVon();
    const setzeAktiv = (id, wert) => document.querySelectorAll(id + ' .seg-btn').forEach(b =>
      b.classList.toggle('is-active', b.dataset.wert === wert));
    setzeAktiv('#genderSeg', g);
    setzeAktiv('#zeitSeg', zeit);
    setzeAktiv('#klasseSeg', klasse);
    $('#jahrInput').value = einstellung('jahr', '');
    $('#einstellungenFuer').textContent = 'Alles auf dieser Seite gilt für das Profil ' + db.current + ' – auch Farbe und Hintergrund.';
    $('#wertungKurz').textContent =
      `· ${g === 'w' ? 'Mädchen' : 'Jungen'} · ${zeit === 'hand' ? 'Handzeit' : 'elektronisch'} · ${klasse}`;
    $('#designKurz').textContent = '· ' + (alleThemen()[theme] || THEMES.mint).name
      + ' · ' + verlaufName(verlauf) + ' · ' + musterName(pattern);
    $('#speicherKurz').textContent = '· ' + speicherName();
    $('#wertungHinweis').textContent =
      `${g === 'w' ? 'Mädchen' : 'Jungen'}, ${zeit === 'hand' ? 'Handzeit (Zuschlag 0,24 s bis 300 m)' : 'elektronische Zeit'}, `
      + `${klasse}: ${GERAETE[g + '|' + klasse] || ''}.`
      + (g === 'w' ? ' Mädchen laufen 800 m statt 1500 m und 2000 m statt 5000 m.' : '');
    renderThemes();
    renderStorageInfo();
    renderLoeschen();
  }

  const musterName = key => (PATTERNS.find(([k]) => k === key) || [null, 'Schlicht'])[1];
  const verlaufName = key => (VERLAEUFE.find(([k]) => k === key) || [null, 'Keiner'])[1];
  const speicherName = () => usingDb() ? 'Datenbank' : cloud ? 'Cloud' : 'dieses Gerät';

  function renderThemes() {
    const grid = $('#themeGrid');
    const themen = alleThemen();
    if (grid) {
      grid.textContent = '';
      Object.entries(themen).forEach(([key, t]) => {
        const b = btn('theme-card' + (key === theme ? ' is-active' : ''), null, () => {
          applyTheme(key, true);
          renderAll(); renderProfil(); renderEinstellungen();
          toast('Farbe: ' + t.name);
        }, 'Farbschema ' + t.name);
        const probe = el('span', 'theme-swatch');
        probe.style.background =
          `radial-gradient(circle at 32% 28%, ${t.vars['--mint']} 0 42%, transparent 43%), ` +
          `linear-gradient(150deg, ${t.vars['--surface-2']}, ${t.vars['--bg']})`;
        probe.style.borderColor = t.vars['--line'];
        b.append(probe, el('span', 'theme-name', t.name));
        if (t.eigen) {
          b.classList.add('theme-eigen');
          // Eigene Farbe wieder loswerden – ohne die Kachel selbst auszulösen
          const weg = btn('theme-weg', '✕', ev => {
            ev.stopPropagation();
            loescheEigeneFarbe(key, t.name);
          }, 'Farbe „' + t.name + '" löschen');
          b.append(weg);
        }
        grid.append(b);
      });
    }
    renderEigenForm();

    const vgrid = $('#gradientGrid');
    if (vgrid) {
      vgrid.textContent = '';
      VERLAEUFE.forEach(([key, name]) => {
        const b = btn('theme-card' + (key === verlauf ? ' is-active' : ''), null, () => {
          applyVerlauf(key, true);
          renderProfil(); renderEinstellungen();
          toast('Verlauf: ' + name);
        }, 'Verlauf ' + name);
        const probe = el('span', 'verlauf-probe');
        probe.dataset.verlauf = key;
        b.append(probe, el('span', 'theme-name', name));
        vgrid.append(b);
      });
    }

    const pgrid = $('#patternGrid');
    if (!pgrid) return;
    pgrid.textContent = '';
    PATTERNS.forEach(([key, name]) => {
      const b = btn('theme-card pattern-card' + (key === pattern ? ' is-active' : ''), null, () => {
        applyPattern(key, true);
        renderProfil(); renderEinstellungen();
        toast('Hintergrund: ' + name);
      }, 'Hintergrund ' + name);
      const probe = el('span', 'pattern-swatch');
      probe.dataset.pattern = key;
      b.append(probe, el('span', 'theme-name', name));
      pgrid.append(b);
    });
  }

  // Formular für eigene Farben: fünf sind das Höchste
  function renderEigenForm() {
    const zahl = document.getElementById('eigenZahl');
    const form = document.getElementById('eigenForm');
    const hinweis = document.getElementById('eigenHinweis');
    if (!zahl || !form || !hinweis) return;
    const eigene = eigeneFarben(db.current);
    const voll = eigene.length >= MAX_EIGENE;
    zahl.textContent = eigene.length + ' von ' + MAX_EIGENE;
    form.hidden = voll;
    hinweis.textContent = voll
      ? `Mehr als ${MAX_EIGENE} eigene Farben gehen nicht. Lösche erst eine über das ✕ auf ihrer Kachel.`
      : `Gilt nur für ${db.current}. Aus der gewählten Farbe wird das ganze Schema berechnet, damit die Schrift lesbar bleibt.`;
  }

  function neueEigeneFarbe(ev) {
    ev.preventDefault();
    const hinweis = document.getElementById('eigenHinweis');
    const eigene = eigeneFarben(db.current);
    if (eigene.length >= MAX_EIGENE) { renderEigenForm(); return; }
    const hue = hexZuHue($('#eigenWert').value);
    if (hue == null) { hinweis.textContent = 'Diese Farbe konnte ich nicht lesen.'; return; }
    const name = ($('#eigenName').value || '').trim().slice(0, 14) || 'Eigene ' + (eigene.length + 1);
    if (Object.values(alleThemen()).some(t => t.name.toLowerCase() === name.toLowerCase())) {
      hinweis.textContent = `„${name}" gibt es schon – nimm einen anderen Namen.`;
      return;
    }
    const key = 'eigen-' + Date.now().toString(36);
    setzeEigeneFarben(db.current, eigene.concat([{ key, name, hue }]));
    $('#eigenName').value = '';
    applyTheme(key, true);                 // die neue Farbe gleich zeigen
    renderAll(); renderProfil(); renderEinstellungen();
    toast('Farbe angelegt: ' + name);
  }

  function loescheEigeneFarbe(key, name) {
    const rest = eigeneFarben(db.current).filter(f => f.key !== key);
    setzeEigeneFarben(db.current, rest);
    if (theme === key) applyTheme(standardFarbe(db.current), true);
    renderAll(); renderProfil(); renderEinstellungen();
    toast(`Farbe „${name}" gelöscht`);
  }

  // Kompatibel halten: beide Ansichten aktualisieren
  // Nach Änderungen alle Stellen auffrischen, die Profile zeigen
  function renderProfiles() {
    if (!$('#profileScreen').hidden) renderPicker();
    if ($('#view-punkte').classList.contains('is-active')) renderPunkte();
    if ($('#view-profil').classList.contains('is-active')) renderProfil();
    if ($('#view-profile').classList.contains('is-active')) renderProfilListe();
    if ($('#view-einstellungen').classList.contains('is-active')) renderEinstellungen();
  }

  function drawProfileRow(li, name) {
    li.textContent = '';
    const pick = btn('p-name', null, () => { if (name !== db.current) switchTo(name); });
    pick.append(el('span', 'p-nm', name),
                el('span', 'p-count', countOf(name) + (countOf(name) === 1 ? ' Wert' : ' Werte')));
    if (name === db.current) pick.append(el('span', 'badge', 'aktiv'));
    // Gelöscht wird nur in den Einstellungen des Profils selbst – hier
    // stünde der Knopf direkt neben dem zum Wechseln.
    li.append(pick, btn('p-act', 'Name', () => editProfile(li, name), 'Profil umbenennen'));
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
        Store.renameProfile(name, neu);
        renderAll(); syncProfileName();
      }
      renderProfiles();
      toast('Profil heißt jetzt ' + neu);
    });
    li.append(form);
    input.focus(); input.select();
  }

  // Profil löschen: nur in den eigenen Einstellungen, zugeklappt, und erst
  // nach einer Rückfrage. Danach lässt es sich einmal rückgängig machen.
  function renderLoeschen() {
    const box = document.getElementById('loeschBereich');
    if (!box) return;
    box.textContent = '';
    const name = db.current, n = countOf(name);
    const hinweis = t => { const e = el('p', 'hint-text', t); e.style.marginTop = '0'; box.append(e); };

    if (db.athletes.length < 2) {
      hinweis(`„${name}“ ist das einzige Profil und kann deshalb nicht gelöscht werden. `
        + 'Lege erst ein weiteres an.');
      return;
    }
    hinweis(`Löscht „${name}“ mit ${n} ${n === 1 ? 'Wert' : 'Werten'}`
      + (usingDb() ? ' – auch aus der Klassen-Datenbank, also für alle.' : '.')
      + ' Danach ist die Sache über „Rückgängig" noch einmal umkehrbar.');

    const takt = el('div', 'data-actions');
    takt.append(btn('btn btn-danger', 'Profil „' + name + '" löschen', () => {
      box.textContent = '';
      hinweis(`„${name}“ mit ${n} ${n === 1 ? 'Wert' : 'Werten'} wirklich löschen?`);
      const frage = el('div', 'data-actions');
      frage.append(
        btn('btn btn-danger', 'Ja, löschen', () => loescheProfil(name)),
        btn('btn', 'Abbrechen', renderLoeschen));
      box.append(frage);
    }));
    box.append(takt);
  }

  function loescheProfil(name) {
    const removed = Store.removeProfile(name);
    merke('la-profil-gewaehlt', db.current);
    ladeThemeVomProfil();               // das nächste Profil bringt seine Farbe mit
    renderAll(); syncProfileName(); renderProfiles();
    show('profil');
    toast(`Profil „${name}“ gelöscht`, {
      action: 'Rückgängig',
      onAction: () => {
        Store.restoreProfile(name, removed);
        renderAll(); syncProfileName(); renderProfiles(); toast('Profil wieder da');
      }
    });
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
    const rows = [['Profil', 'Disziplin', 'Wert', 'Einheit', 'Datum', 'Uhrzeit', 'Notiz']];
    db.entries.slice().sort((a, b) => zeitpunkt(a) < zeitpunkt(b) ? -1 : 1).forEach(e => {
      rows.push([e.athlete, DISC[e.disc].name, fmt(e.disc, e.value, false), DISC[e.disc].unit,
                 e.date, e.zeit || '', e.note || '']);
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
        const ids = new Set(db.entries.map(e => String(e.id)));
        const bekannt = sigSet(db.entries);
        const neu = p.entries.filter(e => {
          if (ids.has(String(e.id)) || bekannt.has(sig(e))) return false;
          bekannt.add(sig(e));
          return true;
        });
        if (usingDb()) {
          uploadLocal(p.athletes || [], neu);
        } else {
          db.entries = db.entries.concat(neu);
          (p.athletes || []).forEach(a => { if (!db.athletes.includes(a)) db.athletes.push(a); });
          db = normalize(db);
          save(); renderAll(); syncProfileName();
          const doppelt = p.entries.length - neu.length;
          toast(neu.length
            ? `${neu.length} ${neu.length === 1 ? 'Wert' : 'Werte'} geladen` + (doppelt ? `, ${doppelt} schon vorhanden` : '')
            : 'Nichts Neues – alle Werte waren schon da');
        }
      } catch (err) { toast('Datei konnte nicht gelesen werden', { warn: true }); }
    };
    r.readAsText(file);
  }

  /* ---------------- Navigation ---------------- */
  function show(view) {
    currentView = view;
    let reiter = view;
    document.querySelectorAll('.view').forEach(v => {
      const an = v.id === 'view-' + view;
      v.classList.toggle('is-active', an);
      if (an && v.dataset.eltern) reiter = v.dataset.eltern;   // Unterseite: Reiter bleibt markiert
    });
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === reiter));
    if (view === 'verlauf') renderVerlauf();
    if (view === 'punkte') renderPunkte();
    if (view === 'profil') renderProfil();
    if (view === 'einstellungen') renderEinstellungen();
    if (view === 'profile') renderProfilListe();
    window.scrollTo(0, 0);
  }

  function renderAll() {
    renderDiscGrid();
    renderRecent();
    if ($('#view-verlauf').classList.contains('is-active')) renderVerlauf();
    if ($('#view-punkte').classList.contains('is-active')) renderPunkte();
    if ($('#view-profil').classList.contains('is-active')) renderProfil();
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
    ladeTheme();
    document.getElementById('app').append(shell.content.cloneNode(true));

    cloud = await initCloud();
    cfg = readCfg();
    queue = readQueue();

    // Feste Klassen-Verbindung aus der Seite: kein Anmelden nötig.
    const fest = readEmbeddedCfg();
    if (!cloud && fest && fest.code && (!cfg || cfg.code !== fest.code)) {
      cfg = { url: fest.url.replace(/\/+$/, ''), key: fest.key, code: String(fest.code).toLowerCase() };
      writeCfg();
    }

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

    ladeThemeVomProfil();          // ab jetzt gilt die Farbe des Profils
    syncEntryHead();
    syncProfileName();
    // In einer Claude-Seite sind Verbindungen nach außen gesperrt – dort bleibt
    // die hinterlegte Datenbank außen vor, gespeichert wird in der Seite selbst.
    setSync(usingDb() ? 'db' : (readEmbeddedCfg() && !cloud) ? 'needcode' : cloud ? 'cloud' : 'local');
    const festerCode = !!(readEmbeddedCfg() || {}).code;
    renderAll();
    $('#dateInput').value = todayISO();
    $('#timeInput').value = jetztHHMM();
    restoreUi();

    $('#entryForm').addEventListener('submit', addEntry);
    $('#dopplungJa').addEventListener('click', () => {
      const v = parseValue(selDisc, $('#valueInput').value.trim());
      if (v == null) { versteckeDopplung(); return; }
      dopplungOk = [db.current, selDisc, $('#dateInput').value || todayISO(), v.toFixed(3)].join('|');
      versteckeDopplung();
      $('#entryForm').requestSubmit();
    });
    $('#dopplungNein').addEventListener('click', () => {
      versteckeDopplung();
      $('#valueInput').value = ''; preview(); $('#valueInput').focus();
    });
    $('#valueInput').addEventListener('input', () => { versteckeDopplung(); preview(); });
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      flushSave(); if (usingDb()) { flush(); pull(); } show(t.dataset.view);
    }));

    [['#genderSeg', 'geschlecht'], ['#zeitSeg', 'zeit'], ['#klasseSeg', 'klasse']].forEach(([id, name]) => {
      document.querySelectorAll(id + ' .seg-btn').forEach(b =>
        b.addEventListener('click', () => { setzeEinstellung(name, b.dataset.wert); renderEinstellungen(); }));
    });
    $('#jahrInput').addEventListener('change', () => {
      const jahr = $('#jahrInput').value.trim();
      setzeEinstellung('jahr', jahr);
      if (jahr) setzeEinstellung('klasse', '');            // Klasse folgt wieder dem Jahrgang
      renderEinstellungen();
      toast(jahr ? 'Jahrgang ' + jahr + ' · ' + klasseVon() : 'Jahrgang gelöscht');
    });
    document.querySelectorAll('[data-ziel]').forEach(b =>
      b.addEventListener('click', () => show(b.dataset.ziel)));
    $('#profileBtn').addEventListener('click', openPicker);
    $('#pscreenClose').addEventListener('click', closePicker);
    $('#pscreenManage').addEventListener('click', () => { closePicker(); show('profil'); });
    $('#profilNeuForm').addEventListener('submit', speichereNeuesProfil);
    $('#profilNeuBtn').addEventListener('click', openNeuesProfil);
    $('#npClose').addEventListener('click', closeNeuesProfil);
    $('#npAbbrechen').addEventListener('click', closeNeuesProfil);
    $('#npJahr').addEventListener('input', () => npHinweis());
    document.querySelectorAll('#npGeschlecht .seg-btn').forEach(b =>
      b.addEventListener('click', () => {
        npGeschlecht = b.dataset.wert;
        document.querySelectorAll('#npGeschlecht .seg-btn').forEach(x =>
          x.classList.toggle('is-active', x === b));
        npHinweis();
      }));
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'Escape') return;
      if (!$('#profilScreen').hidden) closeNeuesProfil();
      else if (!$('#profileScreen').hidden) closePicker();
    });

    $('#eigenForm').addEventListener('submit', neueEigeneFarbe);
    $('#exportBtn').addEventListener('click', exportJSON);
    $('#csvBtn').addEventListener('click', exportCSV);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', ev => {
      if (ev.target.files[0]) importJSON(ev.target.files[0]);
      ev.target.value = '';
    });
    $('#dbForm').addEventListener('submit', submitDb);
    $('#dbClose').addEventListener('click', () => $('#dbDialog').close());
    $('#dbDisconnect').addEventListener('click', disconnectDb);
    $('#sqlCopy').addEventListener('click', copySql);
    $('#dbShare').addEventListener('click', shareCfg);
    $('#dbTest').addEventListener('click', testeVerbindung);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { flushSave(); if (usingDb()) flush(); }
      else abgleichen();
    });
    window.addEventListener('pageshow', ev => { if (ev.persisted) abgleichen(); });
    window.addEventListener('pagehide', () => { flushSave(); if (usingDb()) flush(); });
    window.addEventListener('online', () => abgleichen('Verbindung wieder da – wird abgeglichen …'));
    $('#syncScreenSkip').addEventListener('click', schliesseSync);

    $('#valueInput').focus();

    await abgleichen(usingDb() ? 'Werte werden abgeglichen …' : 'Werte werden geladen …');
    if (readEmbeddedCfg() && !cloud && !usingDb() && !festerCode) openDbDialog();
    else starteProfilwahl();
  }

  main();
})();
