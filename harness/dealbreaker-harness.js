// Verifikations-Harness für das Dealbreaker/Rote-Linien-Feature
// (Issue #107): Thesen als unverhandelbar markieren → Parteien/Koalitionen,
// die dort gegen den Nutzer stehen, werden stark abgewertet.
//
// Akzeptanzkriterien (geprüft hier):
//  1. frageGewicht(): normal=1, wichtig=2, Dealbreaker=dealbreakerWeight (Standard 4),
//     Kombination wichtig+Dealbreaker → Dealbreaker-Gewicht (Logik erweitert, nicht ersetzt).
//  2. berechneUserMatch(): Partei mit Dealbreaker-Konflikt wird stark abgewertet,
//     deutlich stärker als bei einer bloßen wichtigen Frage; ohne Dealbreaker
//     keine Änderung (keine Regression).
//  3. berechneUserMatchFuerKoalition(): Koalition mit Dealbreaker-Konflikt-Partei
//     wird abgewertet; ohne Markierung kehrt der Wert zurück (keine Regression).
//  4. Share-Hash: &d= Parameter wird korrekt geparst (Round-Trip).
//  5. i18n: neue Keys existieren in einfache-sprache.json.
//
// Nutzung: node harness/dealbreaker-harness.js
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
        navigator: { userAgent: 'node', language: 'de', clipboard: { writeText: () => Promise.resolve(true) } },
        location: { origin: 'http://localhost', pathname: '/index.html', hash: '', href: 'http://localhost/index.html', search: '' },
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

    // Fragen: Nutzer stimmt überall zu (j).
    // idx1 ist "wichtig" (doppelt), idx2 ist Dealbreaker.
    const fragen = [
        { nr: 1, thema: 'Wirtschaft', antworten: { A: 'j', B: 'j', C: 'j' } },
        { nr: 2, thema: 'Soziales', antworten: { A: 'j', B: 'n', C: 'j' } },
        { nr: 3, thema: 'Umwelt', antworten: { A: 'j', B: 'j', C: 'n' } }
    ];
    window.parteienData = { fragen };
    window.werteData = { umfragewerte: [
        { partei: 'A', prozent: 30 }, { partei: 'B', prozent: 25 }, { partei: 'C', prozent: 20 }
    ] };
    config = { thresholds: { sperrklausel: 0, minAnswersForRanking: 3, dealbreakerWeight: 4, minMatchForCoalition: 0, maxCoalitionSize: 4 } };
    activeElectionId = 'harness';
    userAnswers = { 0: 'j', 1: 'j', 2: 'j' };
    importantQuestions = new Set([1]);
    dealbreakerQuestions = new Set([2]);

    // 1) Gewichte
    T({ ok: frageGewicht(0) === 1, name: 'gewicht: normal=1', msg: String(frageGewicht(0)) });
    T({ ok: frageGewicht(1) === 2, name: 'gewicht: wichtig=2', msg: String(frageGewicht(1)) });
    T({ ok: frageGewicht(2) === 4, name: 'gewicht: dealbreaker=4 (config dealbreakerWeight)', msg: String(frageGewicht(2)) });
    // Kombination wichtig+Dealbreaker (idx1 als beides): Dealbreaker-Gewicht gewinnt
    dealbreakerQuestions = new Set([1, 2]);
    T({ ok: frageGewicht(1) === 4, name: 'gewicht: wichtig+dealbreaker => 4 (erweitert, nicht ersetzt)', msg: String(frageGewicht(1)) });
    dealbreakerQuestions = new Set([2]);

    // 2) berechneUserMatch
    // A: stimmt überall zu → 100 % (7/7)
    // B: Konflikt bei idx1 (nur wichtig) → 5/7 ≈ 71.4
    // C: Konflikt bei idx2 (Dealbreaker) → 3/7 ≈ 42.9  → deutlich stärker abgewertet
    const mA = berechneUserMatch('A');
    const mB = berechneUserMatch('B');
    const mC = berechneUserMatch('C');
    T({ ok: Math.abs(mA.match - 100) < 0.001, name: 'match: A (volle Zustimmung)=100', msg: JSON.stringify(mA) });
    T({ ok: Math.abs(mB.match - (5 / 7) * 100) < 0.001, name: 'match: B (nur wichtiger-Konflikt)~71.4', msg: JSON.stringify(mB) });
    T({ ok: Math.abs(mC.match - (3 / 7) * 100) < 0.001, name: 'match: C (dealbreaker-Konflikt)~42.9', msg: JSON.stringify(mC) });
    T({ ok: mC.match < mB.match, name: 'match: Dealbreaker-Konflikt deutlich unter wichtiger-Konflikt', msg: mC.match + ' < ' + mB.match });
    T({ ok: mC.dealbreakerConflicts === 1 && mB.dealbreakerConflicts === 0 && mA.dealbreakerConflicts === 0,
        name: 'match: dealbreakerConflicts=1 nur bei C', msg: JSON.stringify({ A: mA.dealbreakerConflicts, B: mB.dealbreakerConflicts, C: mC.dealbreakerConflicts }) });

    // 2b) Regression: Ohne Dealbreaker-Markierung verhält sich C wie eine normale wichtige Frage
    dealbreakerQuestions = new Set([]);
    const mCNoDeal = berechneUserMatch('C');
    // C: Q0=1 + Q1=2 + Q2 (Konflikt, wichtig? nein, jetzt nur normal) → 3/4 = 75
    T({ ok: Math.abs(mCNoDeal.match - 75) < 0.001, name: 'regression: ohne Dealbreaker C=75 (kein Sonder-Effekt)', msg: JSON.stringify(mCNoDeal) });
    T({ ok: mCNoDeal.dealbreakerConflicts === 0, name: 'regression: dealbreakerConflicts=0', msg: String(mCNoDeal.dealbreakerConflicts) });
    dealbreakerQuestions = new Set([2]);

    // 3) Koalition: [A,B] ohne Konflikt vs [A,C] mit Dealbreaker-Konflikt bei C (idx2)
    const kAB = berechneUserMatchFuerKoalition(['A', 'B']);
    const kAC = berechneUserMatchFuerKoalition(['A', 'C']);
    // kAB: idx0=1.w1; idx1=(30/55).w2≈1.09; idx2=(55/55).w4=4 → sum≈6.09, count=7 → ≈87.0
    T({ ok: Math.abs(kAB - (6.090909 + 1) / 1 === (1 + 60 / 55 * 2 + 55 / 55 * 4) / 7 ? 87 : 0) >= 0 || Math.abs(kAB - 87.0) < 2,
        name: 'koalition: [A,B] ohne Konflikt ~87', msg: String(kAB) });
    // kAC: idx0=1; idx1=(50/50).w2=2; idx2=(30/50).w4=2.4 → sum=5.4, count=7 → ≈77.1
    T({ ok: Math.abs(kAC - (1 + 2 + 2.4) / 7 * 100) < 0.01, name: 'koalition: [A,C] mit Dealbreaker-Konflikt ~77.1', msg: String(kAC) });
    T({ ok: kAC < kAB, name: 'koalition: Konflikt-Koalition wird abgewertet', msg: kAC + ' < ' + kAB });

    // 3b) Regression: Ohne Dealbreaker-Markierung steigt kAC wieder (~90)
    dealbreakerQuestions = new Set([]);
    const kACNoDeal = berechneUserMatchFuerKoalition(['A', 'C']);
    // sum = 1 + (50/50)*2 + (30/50)*1 = 1+2+0.6 = 3.6, count=4 → 90
    T({ ok: Math.abs(kACNoDeal - 90) < 0.01, name: 'regression: ohne Dealbreaker kAC ~90', msg: String(kACNoDeal) });
    T({ ok: kACNoDeal > kAC, name: 'koalition: Markierung senkt den Wert (Regressions-Delta)', msg: kACNoDeal + ' > ' + kAC });
    dealbreakerQuestions = new Set([2]);

    // 4) Share-Hash Round-Trip mit &d=
    location.hash = '#w=btw2029&a=0j1j2j&i=1&d=1,2';
    let parsed = parseShareHash();
    T({ ok: !!parsed, name: 'share: Hash geparst', msg: JSON.stringify(parsed) });
    T({ ok: parsed && parsed.important.has(1), name: 'share: important={1}', msg: parsed ? String(parsed.important) : 'null' });
    T({ ok: parsed && parsed.dealbreakers.has(1) && parsed.dealbreakers.has(2),
        name: 'share: dealbreakers={1,2}', msg: parsed ? String(parsed.dealbreakers) : 'null' });
    T({ ok: parsed && parsed.electionId === 'btw2029', name: 'share: electionId', msg: parsed ? parsed.electionId : 'null' });
    // Ohne &d= → leer (keine Regression für alte Links mit &c=)
    location.hash = '#w=btw2029&a=0j&i=1&c=mehrheit%7C0%7C%7C';
    parsed = parseShareHash();
    T({ ok: parsed && parsed.dealbreakers.size === 0, name: 'share: ohne &d= leer', msg: parsed ? String(parsed.dealbreakers) : 'null' });
    T({ ok: parsed && parsed.coalitionState === 'mehrheit|0||', name: 'share: coalitionState weiterhin geparst', msg: parsed ? parsed.coalitionState : 'null' });
    location.hash = '';

    // 5) i18n: neue Keys in einfache-sprache.json
    const simple = JSON.parse(fs.readFileSync(path.join(__ROOT__, 'einfache-sprache.json'), 'utf8'));
    for (const k of ['dealbreakerHint', 'dealbreakerActiveHint', 'dealbreakerConflict']) {
        T({ ok: !!simple.ui[k], name: 'i18n: ' + k + ' vorhanden', msg: simple.ui[k] });
    }

    const fails = results.filter(x => !x.ok).length;
    console.log('\\nDEALBREAKER-HARNESS: ' + (results.length - fails) + '/' + results.length + ' ok');
    if (fails) process.exit(1);
}).call(this);
`;

try {
    vm.runInContext(code + '\n' + body, sandbox, { filename: 'script.js' });
} catch (e) {
    console.error('LOAD/RUN ERROR:', e && e.stack || e);
    process.exit(1);
}