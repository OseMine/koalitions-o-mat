// Verifikations-Harness für die Übereinstimmungs-Abstands-Logik im Taktik-Simulator
// (tactical-voting.md §5). Akzeptanzkriterium: Nahe Gleichstände (z. B. 60,1 % vs.
// 60,0 %) erzeugen KEINE irreführenden "Top-/Wunschkoalitions"-Warnungen wie klare
// Präferenzen (z. B. 95 % vs. 20 %).
//
// Nutzung:  node harness/tactical-match-gap.js
// L\u00e4dt script.js in einer VM (Shims für window/document/localStorage), ruft
// calculateTacticalVoting() mit synthetischen Übereinstimmungsprofilen auf und prüft
// das Gap-Verhalten (Mindestabstand config.json → thresholds → minMatchGapForTop).
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

function buildSandbox() {
    const sandbox = {
        console,
        process,
        localStorage: makeStorage(),
        navigator: { userAgent: 'node', language: 'de' },
        location: { hash: '', href: '', search: '', pathname: '/' },
        document: {
            readyState: 'complete',
            addEventListener() {},
            removeEventListener() {},
            getElementById() { return null; },
            querySelector() { return null; },
            querySelectorAll() { return []; },
            createElement() { return { style: {}, classList: { add() {}, remove() {}, contains: () => false }, setAttribute() {}, addEventListener() {}, appendChild() {}, removeChild() {}, dataset: {} }; },
            createTextNode: t => ({ nodeValue: t }),
            body: { appendChild() {}, classList: { add() {}, remove() {} } },
            documentElement: { style: {}, dataset: {} },
            head: { appendChild() {} }
        },
        fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
        addEventListener() {},
        removeEventListener() {},
        matchMedia: () => ({ matches: false, addEventListener() {}, media: '' }),
        setTimeout, clearTimeout, setInterval, clearInterval,
        parseInt, parseFloat, Math, JSON, Date, RegExp, String, Number, Boolean, Array, Object,
        escape: s => s, unescape: s => s,
        crypto: { getRandomValues: arr => arr }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    return sandbox;
}

const sandbox = buildSandbox();
sandbox.__CONFIG_JSON__ = fs.readFileSync(path.join(root, 'config.json'), 'utf8');
vm.createContext(sandbox);

const harnessBody = `
;(function() {
    const results = [];
    const T = tap => {
        results.push(tap);
        console.log((tap.ok ? 'PASS' : 'FAIL') + ': ' + tap.name + (tap.ok ? '' : ' — ' + (tap.msg || '')));
    };
    const setPolls = polls => { tacticalPolls = polls; tacticalPollsKey = activeElectionId; };

    config = { thresholds: { sperrklausel: 5, minMatchGapForTop: 1 } };
    activeElectionId = 'harness';

    // 1) Klare Präferenz (95 vs. 20): Wasted-Vote-Warnung feuert wie bisher
    setPolls({ AfD: 4, SPD: 25 });
    let r = calculateTacticalVoting([{ partei: 'AfD', match: 95 }, { partei: 'SPD', match: 20 }]);
    T({ ok: r.info.clearTop === true, name: 'klar: clearTop', msg: JSON.stringify(r.info) });
    T({ ok: r.warnings.some(w => w.type === 'wasted'), name: 'klar: wasted-Warnung', msg: JSON.stringify(r.warnings) });
    T({ ok: r.info.coalition === 'AfD + SPD', name: 'klar: Koalition gesetzt', msg: '' });

    // 2) Naher Gleichstand (60,1 vs. 60,0): KEINE irreführende Warnung
    r = calculateTacticalVoting([{ partei: 'AfD', match: 60.1 }, { partei: 'SPD', match: 60.0 }]);
    T({ ok: r.info.clearTop === false, name: 'gleich: clearTop=false', msg: JSON.stringify(r.info) });
    T({ ok: r.warnings.length === 0, name: 'gleich: keine Warnung', msg: JSON.stringify(r.warnings) });
    T({ ok: r.info.coalition === null, name: 'gleich: keine Koalition', msg: '' });

    // 3) Klare Präferenz, beide über Hürde und außerhalb des Schwankungsbands:
    setPolls({ SPD: 25, AfD: 28 });
    r = calculateTacticalVoting([{ partei: 'SPD', match: 95 }, { partei: 'AfD', match: 20 }]);
    T({ ok: r.info.clearTop === true && r.warnings.length === 0, name: 'klar: keine Warnung noetig', msg: JSON.stringify(r.warnings) });
    T({ ok: r.info.coalition === 'SPD + AfD', name: 'klar: Koalition SPD+AfD', msg: '' });

    // 4) Naher Gleichstand bei Loan-Szenario: keine Loan-Warnung
    setPolls({ SPD: 25, GRÜNE: 4.5, CDU: 23, AfD: 28 });
    r = calculateTacticalVoting([{ partei: 'SPD', match: 60.2 }, { partei: 'GRÜNE', match: 60.1 }]);
    T({ ok: r.info.clearTop === false && r.warnings.length === 0 && r.info.coalition === null,
        name: 'gleich: keine Loan-Warnung', msg: JSON.stringify(r.warnings) });

    // 5) Konfigurierbare Schwelle: minMatchGapForTop = 0.05 lässt 0,1 pp passieren
    config.thresholds.minMatchGapForTop = 0.05;
    setPolls({ AfD: 4, SPD: 25 });
    r = calculateTacticalVoting([{ partei: 'AfD', match: 60.1 }, { partei: 'SPD', match: 60.0 }]);
    T({ ok: r.info.clearTop === true && r.warnings.some(w => w.type === 'wasted'), name: 'schwelle: 0.05 -> Warnung', msg: JSON.stringify(r.warnings) });

    // 6) Null-Matches (keine verwertbaren Antworten): kein Top-Signal
    config.thresholds.minMatchGapForTop = 1;
    setPolls({ AfD: 4, SPD: 25 });
    r = calculateTacticalVoting([{ partei: 'AfD', match: null }, { partei: 'SPD', match: null }]);
    T({ ok: r.info.clearTop === false && r.warnings.length === 0, name: 'null: keine Warnung', msg: JSON.stringify(r.warnings) });

    // 7) Einzelpartei: Gap=Infinity -> clearTop, ohne Alternative keine Warnung
    r = calculateTacticalVoting([{ partei: 'AfD', match: 95 }]);
    T({ ok: r.info.clearTop === true && r.warnings.length === 0,
        name: 'einzeln: clearTop, keine Alternative -> keine Warnung', msg: JSON.stringify(r.warnings) });

    // 8) DOM-Anzeige: naher Gleichstand zeigt neutralen Hinweis statt "Alles klar"
    const fakeBox = { innerHTML: '' };
    const origGet = document.getElementById;
    document.getElementById = id => id === 'tacticalWarnings' ? fakeBox : origGet(id);
    setPolls({ AfD: 4, SPD: 25 });
    lastTestResults = [{ partei: 'AfD', match: 60.1 }, { partei: 'SPD', match: 60.0 }];
    updateTacticalWarnings();
    T({ ok: fakeBox.innerHTML.includes('Mindestabstand') && !fakeBox.innerHTML.includes('Alles klar'),
        name: 'dom: Gleichstand -> Hinweis statt Alles klar', msg: fakeBox.innerHTML });
    setPolls({ AfD: 28, SPD: 25 });
    lastTestResults = [{ partei: 'AfD', match: 95 }, { partei: 'SPD', match: 20 }];
    updateTacticalWarnings();
    T({ ok: fakeBox.innerHTML.includes('Alles klar'),
        name: 'dom: klare Praeferenz -> Alles klar', msg: fakeBox.innerHTML });
    document.getElementById = origGet;

    // 9) Globale config.json enthält die Schwelle
    const cfg = JSON.parse(__CONFIG_JSON__);
    T({ ok: cfg.thresholds && cfg.thresholds.minMatchGapForTop === 1,
        name: 'config.json: minMatchGapForTop=1', msg: JSON.stringify(cfg.thresholds) });

    const fails = results.filter(x => !x.ok).length;
    console.log('\\nTAKTIK-MATCH-GAP-HARNESS: ' + (results.length - fails) + '/' + results.length + ' ok');
    if (fails) process.exit(1);
}).call(this);
`;

try {
    vm.runInContext(code + '\n' + harnessBody, sandbox, { filename: 'script.js' });
} catch (e) {
    console.error('LOAD/RUN ERROR:', e);
    process.exit(1);
}