// Node-Starter für den Diagnose-Report der Leihstimmen-Warnung (Szenario B der
// tactical-voting.md): lädt script.js in einer VM und ruft die dort eingebettete
// Funktion `tacticalHarnessReport()` mit den echten `elections/*/werte.json`- und
// `config.json`-Daten auf. Die Report-Logik selbst (inkl. istKoalitionAusgeschlossen()
// und istKoalitionsMehrheitSicher()) ist NICHT mehr hierher gespiegelt (Issue
// 2026-08-10) – sie lebt ausschließlich in script.js.
//
// Aufruf: node tools/tactical-harness.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

const ELECTIONS = ['btw2029', 'berlin-2026', 'ltw-sachsen-anhalt-2026', 'mv-2026'];

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
        console, process, localStorage: makeStorage(),
        navigator: { userAgent: 'node', language: 'de' },
        location: { hash: '', href: '', search: '', pathname: '/' },
        document: {
            readyState: 'complete',
            addEventListener() {}, removeEventListener() {},
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
        addEventListener() {}, removeEventListener() {},
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
sandbox.__ELECTIONS__ = ELECTIONS.map(id => ({
    id,
    werte: JSON.parse(fs.readFileSync(path.join(root, 'elections', id, 'werte.json'), 'utf8')),
    config: JSON.parse(fs.readFileSync(path.join(root, 'elections', id, 'config.json'), 'utf8'))
}));
vm.createContext(sandbox);

const body = `
;(function() {
    const report = tacticalHarnessReport(__ELECTIONS__);
    for (const e of report.ergaenzung) {
        console.log(e.eid + ' (threshold ' + e.threshold + '): nicht mehr ausgelöst: ' + (e.altTreffer.length > 0 ? e.altTreffer.join(', ') : '-'));
        console.log('  → Leihstimmen-Warnung feuert jetzt bei ' + e.treffer.length + ' Paar(en): ' + (e.treffer.length ? e.treffer.join('; ') : '-'));
    }

    console.log('\\nGesamt über ' + report.ergaenzung.length + ' Wahlen: ' + report.neuTotal + ' von ' + report.paare + ' Top-2-Paaren (vorher: ' + report.altTotal + ').');
    if (report.ergaenzung.some(e => e.treffer.length > 0)) {
        console.log('\\nMehrere Wahlen betroffen:');
        for (const e of report.ergaenzung) if (e.treffer.length > 0) console.log('  - ' + e.eid + ': ' + e.treffer.join('; '));
    }
}).call(this);
`;

try {
    vm.runInContext(code + '\n' + body, sandbox, { filename: 'script.js' });
} catch (e) {
    console.error('LOAD/RUN ERROR:', e && e.stack || e);
    process.exit(1);
}