// Verifikations-Harness: determineTopic() klassifiziert ausschließlich über das
// redaktionelle `thema` (Review 2026-08-10, P3). Kein Keyword-Fallback mehr.
// Gegen echte Wahldateien: alle Fragen aller 4 Wahlen liefern das `thema`.
// Nutzung: node harness/determine-topic-check.js
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

let failures = 0;
function assert(cond, msg) {
    if (cond) {
        console.log('  OK: ' + msg);
    } else {
        failures++;
        console.log('  FEHLER: ' + msg);
    }
}

const sandbox = buildSandbox();
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const baseConfig = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
vm.runInContext(
    'config = ' + JSON.stringify({ ...baseConfig, koalitionsausschluss: {} }) + ';' +
    'activeElectionId = "harness";' +
    'window.parteienData = { fragen: [] };' +
    'window.werteData = { umfragewerte: [] };',
    sandbox
);

const elections = ['btw2029', 'ltw-sachsen-anhalt-2026', 'berlin-2026', 'mv-2026'];
let totalFragen = 0;
let mismatches = 0;

const setupFragen = elections.map(eid => {
    const fragenArr = JSON.parse(fs.readFileSync(path.join(root, 'elections', eid, 'fragen.json'), 'utf8'));
    return { eid, fragen: fragenArr.fragen || fragenArr };
});

vm.runInContext('window.__CHECK_DATA__ = ' + JSON.stringify(setupFragen.map(s => ({ eid: s.eid, fragen: s.fragen }))) + ';', sandbox);
vm.runInContext(`
    const checkOut = { total: 0, mismatches: 0 };
    for (const { eid, fragen } of window.__CHECK_DATA__) {
        checkOut.total += fragen.length;
        console.log('== ' + eid + ' (' + fragen.length + ' Fragen) ==');
        fragen.forEach((f, i) => {
            const topic = determineTopic(f);
            const idx = (f.nr != null ? f.nr : i + 1);
            if (topic !== f.thema) {
                checkOut.mismatches++;
                console.log('  FEHLER #' + idx + ' thema=' + f.thema + ' -> determineTopic=' + topic);
            }
        });
    }
    window.__CHECK_OUT__ = checkOut;
`, sandbox);

const checkOut = sandbox.__CHECK_OUT__;
totalFragen = checkOut.total;
mismatches = checkOut.mismatches;

assert(mismatches === 0, 'determineTopic() == redaktionelles `thema` für alle ' + totalFragen + ' Fragen aller 4 Wahlen');

vm.runInContext(`
    window.__WARNED__ = [];
    console.error = (...a) => window.__WARNED__.push(a.join(' '));
    window.__EDGE__ = {
        ohneThema: determineTopic({ nr: 999, frage: 'Bürgergeld für alle', thema: '' }),
        ohneThemaFeld: determineTopic({ nr: 998, frage: 'Klimaneutralität bis 2030' }),
        stringInput: determineTopic('Steuerreform für alle')
    };
`, sandbox);

assert(sandbox.__EDGE__.ohneThema === 'Sonstiges', 'leeres `thema` -> "Sonstiges" (kein Keyword-Fallback)');
assert(sandbox.__EDGE__.ohneThemaFeld === 'Sonstiges', 'fehlendes `thema` -> "Sonstiges" (kein Keyword-Fallback)');
assert(sandbox.__EDGE__.stringInput === 'Sonstiges', 'String-Input (früherer fallback-Pfad) -> "Sonstiges" statt Keyword-Match');
assert(sandbox.__WARNED__.length === 2, '2 Fehlerhinweise für Fragen ohne/ungenügendes `thema` ausgegeben (nicht still, nicht doppelt)');
console.log('  Fehlerhinweise: ' + sandbox.__WARNED__.map(w => w.slice(0, 90) + '…').join(' | '));

if (failures) {
    console.log('\n' + failures + ' FEHLGESCHLAGENE CHECKS');
    process.exit(1);
}
console.log('\nAlle Checks grün.');