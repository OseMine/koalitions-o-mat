// Verifikations-Harness für Issue #154: Reiner Koalitions-Share-Link ohne Antworten
// darf nicht durch die Test-Tab-Sperre blockiert werden.
//   – Manueller Test: switchTab('koalitionen') wird weiterhin gesperrt (+ Hinweis).
//   – Share-Restore: applyPendingShare() mit reinem &c=-Zustand öffnet die
//     Koalitions-Sicht (opts.force) und hebt die Sperre danach auf.
//   – Kein Regression: mit Antworten wird weiterhin das Ergebnis gezeigt.
//
// Nutzung: node harness/share-lock-harness.js
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

function mkEl(id) {
    const classes = new Set();
    const attrs = {};
    return {
        id, classes,
        style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', checked: false, tabIndex: 0,
        classList: {
            add(...c) { c.forEach(x => classes.add(x)); },
            remove(...c) { c.forEach(x => classes.delete(x)); },
            toggle(c, force) { const on = force === undefined ? !classes.has(c) : !!force; if (on) classes.add(c); else classes.delete(c); return on; },
            contains: c => classes.has(c)
        },
        setAttribute(k, v) { attrs[k] = String(v); },
        removeAttribute(k) { delete attrs[k]; },
        getAttribute: k => (k in attrs ? attrs[k] : null),
        hasAttribute: k => k in attrs,
        addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }
    };
}

function buildSandbox() {
    const replaced = [];
    const sandbox = {
        console, process, localStorage: makeStorage(),
        navigator: { userAgent: 'node', language: 'de', clipboard: { writeText: () => Promise.resolve(true) } },
        location: { origin: 'http://localhost', pathname: '/index.html', hash: '', href: 'http://localhost/index.html', search: '' },
        history: { replaceState: (s, t, url) => { replaced.push(url); }, pushState() {} },
        fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
        addEventListener() {}, removeEventListener() {},
        matchMedia: () => ({ matches: false, addEventListener() {}, media: '' }),
        setTimeout, clearTimeout, setInterval, clearInterval,
        parseInt, parseFloat, Math, JSON, Date, RegExp, String, Number, Boolean, Array, Object,
        escape: s => s, unescape: s => s,
        crypto: { getRandomValues: arr => arr },
        URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
        Blob: function Blob() {},
        Image: function Image() { this.onload = null; this.onerror = null; },
        document: {
            readyState: 'complete',
            addEventListener() {}, removeEventListener() {},
            getElementById() { return null; },
            querySelector() { return null; },
            querySelectorAll() { return []; },
            createElement: () => mkEl(''),
            createTextNode: t => ({ nodeValue: t }),
            body: { appendChild() {}, classList: { add() {}, remove() {} } },
            documentElement: { style: {}, dataset: {} },
            head: { appendChild() {} }
        }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    sandbox.__replaced = replaced;
    return sandbox;
}

const sandbox = buildSandbox();
vm.createContext(sandbox);

const body = `
;(function() {
    const results = [];
    const T = (ok, name, msg) => {
        results.push(ok);
        console.log((ok ? 'PASS' : 'FAIL') + ': ' + name + (ok ? '' : (msg ? ' — ' + msg : '')));
    };

    // Element-Fabrik (lokale Kopie, da mkEl außerhalb des VM-Kontexts liegt)
    function mkEl(id) {
        const classes = new Set();
        const attrs = {};
        return {
            id, classes,
            style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', checked: false, tabIndex: 0,
            classList: {
                add(...c) { c.forEach(x => classes.add(x)); },
                remove(...c) { c.forEach(x => classes.delete(x)); },
                toggle(c, force) { const on = force === undefined ? !classes.has(c) : !!force; if (on) classes.add(c); else classes.delete(c); return on; },
                contains: c => classes.has(c)
            },
            setAttribute(k, v) { attrs[k] = String(v); },
            removeAttribute(k) { delete attrs[k]; },
            getAttribute: k => (k in attrs ? attrs[k] : null),
            hasAttribute: k => k in attrs,
            addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }
        };
    }

    // ---- Zustandsbehaftetes Minimal-DOM ----
    const byId = {};
    const get = id => byId[id];
    const set = el => { byId[el.id] = el; return el; };

    const tabTest = set(mkEl('tab-test')); tabTest.dataset.tab = 'test'; tabTest.classList.add('active');
    const tabParteien = set(mkEl('tab-parteien')); tabParteien.dataset.tab = 'parteien';
    const tabKoalitionen = set(mkEl('tab-koalitionen')); tabKoalitionen.dataset.tab = 'koalitionen';
    const tabDaten = set(mkEl('tab-daten')); tabDaten.dataset.tab = 'daten';
    const tabButtons = [tabTest, tabParteien, tabKoalitionen, tabDaten];

    const contentTest = set(mkEl('test-content')); contentTest.classList.add('active');
    const contentParteien = set(mkEl('parteien-content'));
    const contentKoalitionen = set(mkEl('koalitionen-content'));
    const contentDaten = set(mkEl('daten-content'));
    const contents = [contentTest, contentParteien, contentKoalitionen, contentDaten];

    const tabsEl = mkEl('tabs');
    const testResults = set(mkEl('testResults')); testResults.innerHTML = '';
    const questionContainer = set(mkEl('questionContainer'));
    questionContainer.style.display = 'block';
    questionContainer.children = [{ tagName: 'DIV' }];
    questionContainer.querySelector = sel => {
        if (sel === '.question') return questionContainer.children.length ? { classList: mkEl('q').classList } : null;
        return null;
    };
    questionContainer.querySelectorAll = () => [];

    const coalitionType = set(mkEl('coalitionType')); coalitionType.value = 'mehrheit';
    const minMatch = set(mkEl('minMatch')); minMatch.value = '50';
    const minMatchLabel = set(mkEl('minMatchLabel'));
    const partyFilter = set(mkEl('partyFilter')); partyFilter.value = '';
    const excludeWrap = set(mkEl('excludePartiesCheckboxes'));
    excludeWrap.querySelectorAll = () => [
        { value: 'SPD', checked: false }, { value: 'GRÜNE', checked: false }, { value: 'AfD', checked: false }
    ];

    const partyPage = set(mkEl('partyPage')); partyPage.style.display = 'none';
    const prevQuestion = set(mkEl('prevQuestion'));
    const nextQuestion = set(mkEl('nextQuestion'));
    const showResults = set(mkEl('showResults'));

    document.getElementById = get;
    document.querySelector = sel => {
        if (sel === '.tabs') return tabsEl;
        if (sel === '.tab-button.active') return tabButtons.find(b => b.classList.contains('active')) || null;
        if (sel === '.mode-toggle .mode-seg') return null;
        if (sel === '.tab-content') return null;
        return null;
    };
    document.querySelectorAll = sel => {
        if (sel === '.tab-button') return tabButtons;
        if (sel === '.tab-content') return contents;
        if (sel === '.mode-toggle .mode-seg') return [];
        if (sel === '#excludePartiesCheckboxes input') return excludeWrap.querySelectorAll();
        if (sel === '#excludePartiesCheckboxes input:checked') return excludeWrap.querySelectorAll().filter(cb => cb.checked);
        if (sel === '.tabs') return [tabsEl];
        return [];
    };
    window.scrollTo = () => {};

    // ---- Config (Erweitert-Modus, keine ausgeblendeten Tabs) ----
    config = {
        appName: 'Koalitions-O-Mat',
        thresholds: { sperrklausel: 5, minAnswersForRanking: 1, dealbreakerWeight: 4, minMatchForCoalition: 0 },
        partyColors: { default: '#555' },
        topics: { Sonstiges: { color: '#999' } },
        ui: { simple: { off: [] }, defaultMode: 'advanced' }
    };
    activeElectionId = 'harness';
    userAnswers = {};
    importantQuestions = new Set();
    dealbreakerQuestions = new Set();
    window.parteienData = { fragen: [{ nr: 1, thema: 'Wirtschaft', frage: 'F1', antworten: { A: 'j', B: 'n' } }] };
    window.werteData = { umfragewerte: [{ partei: 'A', prozent: 30 }, { partei: 'B', prozent: 20 }] };

    // Stubs, die in der Sandbox nichts rendern müssen
    updateKoalitionen = () => {};
    saveTestState = () => {};
    let notified = null;
    showNotification = (msg) => { notified = msg; };
    let showResultsCalled = 0;
    showTestResults = () => { showResultsCalled++; testResults.innerHTML = '<div>Ergebnis</div>'; questionContainer.style.display = 'none'; };

    // === Test 1: Manuelle Sperre bleibt bestehen ===
    // Ausgangslage: Test-Tab aktiv, Fragen sichtbar, kein Ergebnis → Test läuft.
    // (Wie im echten Lauf ruft initializeTest() updateTestTabLock() auf.)
    updateTestTabLock();
    T(activeTabName() === 'test', 'start: aktiver Tab ist test');
    T(testInProgress() === true, 'manueller Test: testInProgress() true');
    switchTab('koalitionen');
    T(activeTabName() === 'test', 'manueller Test: switchTab(koalitionen) blockiert', 'aktiver Tab: ' + activeTabName());
    T(notified !== null && notified.indexOf('Parteien-Test') !== -1, 'manueller Test: Hinweis-Notification gezeigt', String(notified));
    const locked = tabsEl.classList.contains('tabs-locked');
    const disabled = tabKoalitionen.getAttribute('aria-disabled') === 'true';
    T(locked && disabled, 'manueller Test: tabs-locked + aria-disabled gesetzt', 'locked=' + locked + ' disabled=' + disabled);

    // === Test 2: Share-Restore mit reinem &c=-Zustand ===
    notified = null;
    pendingShare = {
        electionId: 'harness',
        answers: {},
        important: new Set(),
        dealbreakers: new Set(),
        coalitionState: 'mehrheit|50|AfD|SPD,GRÜNE',
        party: null
    };
    applyPendingShare();

    T(pendingShare === null, 'restore: pendingShare konsumiert');
    T(activeTabName() === 'koalitionen', 'restore: direkter Wechsel zur Koalitions-Sicht', 'aktiver Tab: ' + activeTabName());
    T(coalitionType.value === 'mehrheit' && minMatch.value === '50' && partyFilter.value === 'AfD',
        'restore: Koalitions-Filter übernommen', coalitionType.value + '|' + minMatch.value + '|' + partyFilter.value);
    T(showResultsCalled === 0, 'restore: ohne Antworten kein Ergebnis-Aufruf');
    T(testInProgress() === false, 'restore: testInProgress() false auf Koalitions-Sicht');
    T(!tabsEl.classList.contains('tabs-locked'), 'restore: tabs-locked aufgehoben');
    T(tabKoalitionen.getAttribute('aria-disabled') !== 'true', 'restore: aria-disabled entfernt');

    // === Test 3: Navigation von der wiederhergestellten Sicht ist frei ===
    notified = null;
    switchTab('daten');
    T(activeTabName() === 'daten', 'restore: freie Navigation zu daten', 'aktiver Tab: ' + activeTabName());
    T(notified === null, 'restore: keine Sperr-Notification bei freier Navigation', String(notified));

    // === Test 4: Wer danach in den Test-Tab wechselt, startet den Test (Sperre greift) ===
    switchTab('test');
    T(activeTabName() === 'test', 'test-tab nach restore erreichbar');
    T(testInProgress() === true, 'test-tab: Sperre greift wieder (Test gestartet)');
    notified = null;
    switchTab('koalitionen');
    T(activeTabName() === 'test', 'test-tab: switchTab(koalitionen) wieder gesperrt', 'aktiver Tab: ' + activeTabName());
    T(notified !== null, 'test-tab: Hinweis erneut gezeigt', String(notified));

    // === Test 5: Share-Link MIT Antworten → Ergebnis-Sicht unverändert ===
    pendingShare = {
        electionId: 'harness',
        answers: { 0: 'j' },
        important: new Set([1]),
        dealbreakers: new Set(),
        coalitionState: 'mehrheit|50||',
        party: null
    };
    applyPendingShare();
    T(showResultsCalled === 1, 'mit Antworten: showTestResults() aufgerufen', 'calls=' + showResultsCalled);
    T(testResults.innerHTML !== '', 'mit Antworten: Ergebnis gerendert');
    T(activeTabName() === 'koalitionen', 'mit Antworten: Koalitions-Sicht nach Ergebnis', 'aktiver Tab: ' + activeTabName());
    T(testInProgress() === false, 'mit Antworten: testInProgress() false (Ergebnis sichtbar)');

    // === Test 6: applyPendingShare ohne coalitionState und ohne Antworten bleibt im Test ===
    pendingShare = {
        electionId: 'harness', answers: {}, important: new Set(), dealbreakers: new Set(), coalitionState: null, party: null
    };
    const beforeTab = activeTabName();
    applyPendingShare();
    T(activeTabName() === beforeTab, 'ohne c= kein Tab-Wechsel', 'aktiver Tab: ' + activeTabName());

    return results;
})();
`;

try {
    vm.runInContext(code + '\n' + body, sandbox, { filename: 'script.js' });
} catch (e) {
    console.error('FATAL: ' + e.stack);
    process.exit(1);
}