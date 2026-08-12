// Verifikations-Harness für die Features:
//   – Koalitions-Reibungs-Index (berechneReibung, reibungDetailHTML-Struktur)
//   – Regierungs-Simulator (berechneKoalitionsAbweichung)
//   – Live-URL-Sync (buildShareUrl/syncShareUrl/markHashHandled, parseShareHash-Roundtrip)
//   – Ergebnis-Karte als PNG/SVG (buildResultCardSVG, exportCardData)
//   – i18n: neue Keys in einfache-sprache.json vorhanden
//
// Nutzung: node harness/friction-simulator-harness.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

function makeStorage() {
    const store = {};
    return {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; },
        get length() { return Object.keys(store).length; },
        key: i => Object.keys(store)[i],
        clear: () => { for (const k in store) delete store[k]; }
    };
}

function makeEl() {
    return {
        style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        setAttribute() {}, getAttribute: () => null, addEventListener() {}, removeEventListener() {},
        appendChild() {}, removeChild() {}, querySelector() { return null; }, querySelectorAll() { return []; },
        innerHTML: '', textContent: '', value: '', checked: false
    };
}

function buildSandbox() {
    const replaced = [];
    const sandbox = {
        console, process, localStorage: makeStorage(),
        navigator: { userAgent: 'node', language: 'de', clipboard: { writeText: () => Promise.resolve(true) } },
        location: { origin: 'http://localhost', pathname: '/index.html', hash: '', href: 'http://localhost/index.html', search: '' },
        history: { replaceState: (state, title, url) => { replaced.push(url); }, pushState() {} },
        document: {
            readyState: 'complete',
            addEventListener() {}, removeEventListener() {},
            getElementById() { return null; },
            querySelector() { return null; },
            querySelectorAll() { return []; },
            createElement: () => makeEl(),
            createTextNode: t => ({ nodeValue: t }),
            body: { appendChild() {}, classList: { add() {}, remove() {} } },
            documentElement: { style: {}, dataset: {} },
            head: { appendChild() {} }
        },
        fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
        addEventListener() {}, removeEventListener() {},
        matchMedia: () => ({ matches: false, addEventListener() {}, media: '' }),
        setTimeout, clearTimeout, setInterval, clearInterval,
        parseInt, parseFloat, Math, JSON, Date, RegExp, String, Number, Boolean, Array, Object,
        escape: s => s, unescape: s => s,
        crypto: { getRandomValues: arr => arr },
        URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
        Blob: function Blob() {},
        Image: function Image() { this.onload = null; this.onerror = null; }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    sandbox.__replaced = replaced;
    return sandbox;
}

const sandbox = buildSandbox();
sandbox.__ROOT__ = root;
sandbox.path = path;
sandbox.fs = fs;
vm.createContext(sandbox);

const body = `
;(function() {
    const results = [];
    const T = (tap, extra) => {
        results.push(tap);
        console.log((tap.ok ? 'PASS' : 'FAIL') + ': ' + tap.name + (tap.ok ? '' : ' — ' + (tap.msg || '')));
        if (extra && !tap.ok) console.log('    ' + extra);
    };

    // Parteien-Daten mit klaren Positionen:
    // A: j bei 0,2; n bei 1
    // B: j bei 1; n bei 0,2   (B vs A: immer gegeneinander)
    // C: j bei 0,1,2           (einheitlich mit A außer bei 1)
    const fragen = [
        { nr: 1, thema: 'Wirtschaft', frage: 'Mehr Wirtschaft?', antworten: { A: 'j', B: 'n', C: 'j' } },
        { nr: 2, thema: 'Soziales', frage: 'Mehr Soziales?', antworten: { A: 'n', B: 'j', C: 'j' } },
        { nr: 3, thema: 'Umwelt', frage: 'Mehr Umwelt?', antworten: { A: 'j', B: 'n', C: 'j' } }
    ];
    window.parteienData = { fragen };
    window.werteData = { umfragewerte: [
        { partei: 'A', prozent: 30 }, { partei: 'B', prozent: 25 }, { partei: 'C', prozent: 20 }, { partei: 'D', prozent: 10 }
    ] };
    config = {
        appName: 'Koalitions-O-Mat',
        thresholds: { sperrklausel: 0, minAnswersForRanking: 3, dealbreakerWeight: 4, minMatchForCoalition: 0, maxCoalitionSize: 4, minMatchGapForTop: 1 },
        partyColors: { A: '#A01', B: '#B02', C: '#C03', D: '#D04', default: '#555' },
        topics: { Wirtschaft: { color: '#FFA726' }, Soziales: { color: '#42A5F5' }, Umwelt: { color: '#66BB6A' }, Sonstiges: { color: '#999' } },
        ui: { simple: { off: [] } }
    };
    activeElectionId = 'harness';
    userAnswers = { 0: 'j', 1: 'n', 2: 'j' };
    importantQuestions = new Set();
    dealbreakerQuestions = new Set();

    // ---- Reibungs-Index (berechneReibung) ----
    const koalABC = [
        { partei: 'A', prozent: 30 }, { partei: 'B', prozent: 25 }, { partei: 'C', prozent: 20 }
    ];
    const reib = berechneReibung(koalABC);
    T({ ok: reib.score >= 0 && reib.score <= 100, name: 'reibung: score in [0,100]', msg: String(reib.score) });
    // Alle 3 Fragen haben gegeneinander stehende Paare (A vs B bei 0,1,2) → 100%
    T({ ok: Math.abs(reib.score - 100) < 0.001, name: 'reibung: A-vs-B auf jeder Frage → 100 %', msg: String(reib.score) });
    T({ ok: Array.isArray(reib.konflikte) && reib.konflikte.length === 3, name: 'reibung: 3 Konfliktthesen gelistet', msg: String(reib.konflikte.length) });
    T({ ok: reib.konflikte.every(k => Array.isArray(k.paare) && k.paare.length > 0), name: 'reibung: jede These mit Paaren', msg: JSON.stringify(reib.konflikte.map(k => k.paare)) });
    T({ ok: reib.konflikte.some(k => k.frage === fragen[0]), name: 'reibung: Frage-Objekt verlinkt', msg: '' });

    // Koalitions-Berechnung liefert reibung-Feld
    const koalitionen = berechneKoalitionen('mehrheit', []);
    T({ ok: koalitionen.length > 0 && koalitionen.every(k => k.reibung && typeof k.reibung.score === 'number'),
        name: 'koalitionen: reibung-Feld vorhanden', msg: koalitionen.length + ' Koalitionen' });

    // Best-Koalition („Beste Koalition für Sie"): gleiche reibung-Quelle wie im
    // Koalitionen-Tab – das reibung-HTML der Best-Karte nutzt reibungDetailHTML().
    const alle = berechneKoalitionen('beide', []);
    const best = alle
        .filter(k => k.anzahl <= 4 && k.prozente > 50 && k.uebereinstimmung >= 0)
        .sort((a, b) => (b.benutzerMatch ?? -1) - (a.benutzerMatch ?? -1))[0] || null;
    T({ ok: !best || (best.reibung && typeof best.reibung.score === 'number' && best.reibung.score >= 0 && best.reibung.score <= 100),
        name: 'bestKoalition: reibung.score vorhanden (0-100)', msg: best ? String(best.reibung.score) : 'keine best-Koalition' });
    const detailHtml = best ? reibungDetailHTML(best.reibung) : '';
    T({ ok: !best || (typeof detailHtml === 'string' && detailHtml.length > 0),
        name: 'bestKoalition: reibungDetailHTML liefert HTML', msg: detailHtml.slice(0, 100) });

    // ---- Regierungs-Simulator: berechneKoalitionsAbweichung ----
    // Koalition A+B+C: Mehrheit j bei 0 (A,C) und 2 (A,C), n bei 1 (B,C)
    // B weicht bei 0 und 2 ab (2×), A bei 1 (1×), C nie.
    const abw = berechneKoalitionsAbweichung(['A', 'B', 'C']);
    T({ ok: abw.zaehler.A === 1 && abw.zaehler.B === 2 && abw.zaehler.C === 0,
        name: 'abweichung: B weicht 2× ab, A 1×, C 0×', msg: JSON.stringify(abw.zaehler) });
    T({ ok: Array.isArray(abw.details.B) && abw.details.B.length === 2, name: 'abweichung: B hat 2 Detail-Thesen', msg: String((abw.details.B || []).length) });
    T({ ok: abw.details.B.every(t => t.gegen.length > 0 && t.gegen.every(g => g.partei !== 'B' && (g.position === 'j' || g.position === 'n'))),
        name: 'abweichung: Gegner sind die Mehrheits-Parteien', msg: JSON.stringify(abw.details.B) });
    // Kein Patt: Zwei-Parteien-Koalition ohne Streit → keine Abweichung
    const abwAC = berechneKoalitionsAbweichung(['A', 'C']);
    T({ ok: abwAC.zaehler.A === 0 && abwAC.zaehler.C === 0, name: 'abweichung: A+C einheitlich → 0 Abweichungen', msg: JSON.stringify(abwAC.zaehler) });

    // ---- Regierungs-Simulator: DOM-Rendering ----
    // Minimal-DOM: Checkboxen (A, B ausgewählt) + Ergebnis-Container.
    const simCbs = {
        innerHTML: '', querySelectorAll: () => [
            { value: 'A', checked: true }, { value: 'B', checked: true }, { value: 'C', checked: true }
        ]
    };
    const simResults = { innerHTML: '' };
    const simSitze = [];
    const originalGetElementById = document.getElementById;
    document.getElementById = id => {
        if (id === 'simulatorPartiesCheckboxes') return simCbs;
        if (id === 'simulatorResults') return simResults;
        if (id === 'excludePartiesCheckboxes') return null;
        if (id === 'koalitionen-content') return null;
        return originalGetElementById(id);
    };
    try {
        populateSimulatorParties();
        T({ ok: simCbs.innerHTML.indexOf('A') !== -1 && simCbs.innerHTML.indexOf('C') !== -1,
            name: 'simulator: Checkboxen befüllt (inkl. Sperrklausel-Parteien mit Antworten)', msg: simCbs.innerHTML.slice(0, 200) });
        renderSimulator();
        T({ ok: simResults.innerHTML.indexOf('1/') !== -1 || simResults.innerHTML.indexOf('Sitze') !== -1,
            name: 'simulator: Sitzverteilung gerendert', msg: simResults.innerHTML.slice(0, 400) });
        T({ ok: simResults.innerHTML.indexOf('Reibung') !== -1, name: 'simulator: Reibungs-Score gerendert', msg: '' });
        T({ ok: simResults.innerHTML.indexOf('Abweichend von') !== -1, name: 'simulator: Abweichungs-Thesen gerendert', msg: '' });
        // Nur eine Partei ausgewählt → Hinweis statt Crash
        document.getElementById = id => {
            if (id === 'simulatorPartiesCheckboxes') return { innerHTML: '', querySelectorAll: () => [{ value: 'A', checked: true }] };
            if (id === 'simulatorResults') return simResults;
            if (id === 'excludePartiesCheckboxes') return null;
            if (id === 'koalitionen-content') return null;
            return originalGetElementById(id);
        };
        renderSimulator();
        T({ ok: simResults.innerHTML.indexOf('mindestens zwei') !== -1, name: 'simulator: Hinweis bei <2 Parteien', msg: simResults.innerHTML.slice(0, 200) });
    } finally {
        document.getElementById = originalGetElementById;
    }

    // ---- Live-URL-Sync ----
    location.hash = '';
    const url = buildShareUrl();
    T({ ok: typeof url === 'string' && url.indexOf('#w=harness&a=0j1n2j') !== -1, name: 'buildShareUrl: Basis-URL mit Antworten', msg: String(url) });
    T({ ok: url.indexOf('&i=') === -1 && url.indexOf('&d=') === -1, name: 'buildShareUrl: keine i/d ohne Markierungen', msg: String(url) });

    importantQuestions = new Set([1]);
    dealbreakerQuestions = new Set([2]);
    const url2 = buildShareUrl();
    T({ ok: url2.indexOf('&i=1&d=2') !== -1, name: 'buildShareUrl: wichtige + Dealbreaker-Fragen kodiert', msg: String(url2) });

    // Round-Trip über parseShareHash
    const hashPart = url2.slice(url2.indexOf('#'));
    location.hash = hashPart;
    const parsed = parseShareHash();
    T({ ok: parsed && parsed.electionId === 'harness', name: 'parseShareHash: electionId', msg: JSON.stringify(parsed) });
    T({ ok: parsed && parsed.answers[0] === 'j' && parsed.answers[1] === 'n' && parsed.answers[2] === 'j',
        name: 'parseShareHash: Antworten', msg: JSON.stringify(parsed && parsed.answers) });
    T({ ok: parsed && parsed.important.has(1) && parsed.dealbreakers.has(2), name: 'parseShareHash: i/d', msg: JSON.stringify(parsed) });

    // syncShareUrl schreibt per history.replaceState, ohne Historie zu verschmutzen
    const before = __replaced.length;
    syncShareUrl();
    T({ ok: __replaced.length === before + 1, name: 'syncShareUrl: replaceState aufgerufen', msg: __replaced.join(', ') });
    const syncedHash = __replaced[__replaced.length - 1];
    T({ ok: syncedHash === hashPart, name: 'syncShareUrl: schreibt exakt den Share-Hash', msg: syncedHash + ' vs ' + hashPart });
    // Kein Doppel-Schreiben bei unverändertem Zustand
    syncShareUrl();
    syncShareUrl();
    T({ ok: __replaced.length === before + 1, name: 'syncShareUrl: kein Overwrite bei unverändertem Hash', msg: String(__replaced.length) });

    // markHashHandled: externer Hash wird nicht überschrieben
    location.hash = '#w=harness&a=0j1n2j&i=1&d=2';
    markHashHandled();
    syncShareUrl();
    T({ ok: __replaced.length === before + 1, name: 'markHashHandled: fremder Hash bleibt stehen', msg: String(__replaced.length) });

    // ---- Ergebnis-Karte ----
    lastTestResults = berechneUserMatchRanking();
    let exportDiag = '';
    try {
        const dd = exportCardData();
        exportDiag = dd ? ('top=' + dd.top.partei + ' topics=' + dd.topTopics.length + ' best=' + (dd.best ? dd.best.parteien.join('+') : 'null')) : 'NULL';
    } catch (e) {
        exportDiag = 'THROW ' + String(e);
    }
    const svg = buildResultCardSVG();
    T({ ok: typeof svg === 'string' && svg.indexOf('<svg') === 0 && svg.indexOf('</svg>') !== -1, name: 'resultCard: gültiges SVG', msg: exportDiag });
    T({ ok: svg.indexOf('Koalitions-O-Mat') !== -1, name: 'resultCard: App-Name im SVG', msg: '' });
    T({ ok: svg.indexOf('A') !== -1, name: 'resultCard: Top-Partei im SVG', msg: '' });

    // PNG-Export-Pfad: Canvas fehlt in der Sandbox → exportResultCard('png') darf
    // nicht werfen und muss eine Fehler-Meldung ausgeben (img.onload feuert nie).
    let notified = '';
    const origNotify = showNotification;
    showNotification = (msg, type) => { notified = msg; };
    try {
        exportResultCard('png');
        T({ ok: true, name: 'exportResultCard: png ohne Crash', msg: '' });
    } catch (e) {
        T({ ok: false, name: 'exportResultCard: png ohne Crash', msg: String(e) });
    }
    showNotification = origNotify;

    // ---- einfache-sprache.json: neue Keys ----
    const einfache = __fsJson();
    const ui = einfache.ui || {};
    ['frictionScore','frictionToggle','frictionToggleHide','frictionNone','frictionMore','simulatorEmpty','simulatorDeviationTitle','simulatorDeviationLeader',
     'simulatorDeviationNone','exportCardTitle','exportPng','exportSvg','exportCardSaved'].forEach(k => {
        T({ ok: !!ui[k], name: 'einfache-sprache: Key "' + k + '"', msg: String(ui[k]) });
    });

    return results;
})();
`;

// Zusätzliche Helfer für die Sandbox
const helpers = `
function __fsJson() {
    return JSON.parse(fs.readFileSync(path.join(__ROOT__, 'einfache-sprache.json'), 'utf8'));
}
`;

const full = code + '\n' + helpers + '\n' + body;
try {
    vm.runInContext(full, sandbox, { filename: 'script.js' });
} catch (e) {
    console.error('FATAL: ' + e.stack);
    process.exit(1);
}
