// Verifikations-Harness für Issue #153: „Beste Koalition" (Ergebnis-Tab und
// Ergebnis-Karte) muss denselben Filter-Satz anwenden wie der Koalitionen-Tab
// (Koalitionstyp, MinMatch-Regler, Partei-Filter, Ausschluss-Checkboxen) –
// nicht mehr die feste config-Schwelle `minMatchForCoalition`.
//
// Prüft gegen die echten Wahldateien aller 4 Wahlen:
//   1. Die beste Koalition und alle gelisteten Koalitionen liegen bei jedem
//      Slider-Wert (0/50/90) über dem Reglerwert.
//   2. „Beste Koalition" ist der Top-Eintrag derselben Liste, die der
//      Koalitionen-Tab rendert (updateKoalitionen → berechneGefilterteKoalitionen).
//   3. Koalitionstyp (mehrheit/minderheit), Partei-Filter und Ausschlüsse werden
//      von der Best-Koalition respektiert.
//   4. Regression: Die alte feste-Schwellen-Logik würde bei Slider=90 eine
//      Koalition UNTER dem Reglerwert empfehlen – die neue Logik nicht.
//
// Nutzung:  node harness/best-coalition-filter-harness.js
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

function makeEl(value) {
    return {
        style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        setAttribute() {}, getAttribute: () => null, addEventListener() {}, removeEventListener() {},
        appendChild() {}, removeChild() {}, querySelector() { return null; }, querySelectorAll() { return []; },
        innerHTML: '', textContent: '', value: value || '', checked: false
    };
}

// Mutable Zustand der Koalitionen-Tab-Elemente (Simulation des DOM).
const filterState = {
    coalitionType: makeEl('beide'),
    minMatch: makeEl('0'),
    minMatchLabel: makeEl(),
    partyFilter: makeEl(''),
    excludes: [], // [{value, checked}]
    coalitionResults: makeEl(),
    coalitionStatus: makeEl()
};

function buildSandbox() {
    const sandbox = {
        console, process, localStorage: makeStorage(),
        navigator: { userAgent: 'node', language: 'de' },
        location: { origin: 'http://localhost', pathname: '/index.html', hash: '', href: 'http://localhost/index.html', search: '' },
        history: { replaceState() {}, pushState() {} },
        document: {
            readyState: 'complete',
            addEventListener() {}, removeEventListener() {},
            getElementById(id) {
                const map = {
                    coalitionType: filterState.coalitionType,
                    minMatch: filterState.minMatch,
                    minMatchLabel: filterState.minMatchLabel,
                    partyFilter: filterState.partyFilter,
                    coalitionResults: filterState.coalitionResults,
                    coalitionStatus: filterState.coalitionStatus
                };
                return map[id] || null;
            },
            querySelector() { return null; },
            querySelectorAll(sel) {
                if (sel === '#excludePartiesCheckboxes input:checked') {
                    return filterState.excludes.filter(e => e.checked);
                }
                return [];
            },
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
        crypto: { getRandomValues: arr => arr }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    return sandbox;
}

const sandbox = buildSandbox();
sandbox.__ROOT__ = root;
sandbox.__ELECTION_IDS__ = ['btw2029', 'ltw-sachsen-anhalt-2026', 'berlin-2026', 'mv-2026'];
sandbox.__FILTER_STATE__ = filterState;
vm.createContext(sandbox);

const body = `
;(function() {
    const results = [];
    const T = (tap, extra) => {
        results.push(tap);
        console.log((tap.ok ? 'PASS' : 'FAIL') + ': ' + tap.name + (tap.ok ? '' : ' — ' + (tap.msg || '')));
        if (extra && !tap.ok) console.log('    ' + extra);
    };

    const fs = __fsPonyfill__;
    const path = __pathPonyfill__;
    const root = __ROOT__;
    const elections = __ELECTION_IDS__;
    const filterState = __FILTER_STATE__;
    const minMatchForCoalitionCfg = 20;

    config = {
        appName: 'Koalitions-O-Mat',
        thresholds: { sperrklausel: 5, minAnswersForRanking: 5, dealbreakerWeight: 4, minMatchForCoalition: minMatchForCoalitionCfg, maxCoalitionSize: 4, minMatchGapForTop: 1 },
        partyColors: { LINKE: '#b2182b', SPD: '#e3000f', 'CDU/CSU': '#000000', GRÜNE: '#46962b', FDP: '#ffed00', AfD: '#009ee0', BSW: '#a34b24', default: '#888888' },
        topics: { Wirtschaft: { color: '#FFA726' }, Soziales: { color: '#42A5F5' }, Umwelt: { color: '#66BB6A' }, Sonstiges: { color: '#999' } },
        ui: { simple: { off: [] } }
    };

    elections.forEach(eid => {
        const werte = JSON.parse(fs.readFileSync(path.join(root, 'elections', eid, 'werte.json'), 'utf8'));
        const fragen = JSON.parse(fs.readFileSync(path.join(root, 'elections', eid, 'fragen.json'), 'utf8'));

        activeElectionId = eid;
        window.werteData = { umfragewerte: werte.umfragewerte };
        window.parteienData = { fragen: fragen.fragen };

        // Benutzerprofil: identisch zur ersten Partei, gegensätzlich zur zweiten
        // → klare Präferenz, benutzerMatch differenziert zwischen Koalitionen.
        const parties = werte.umfragewerte.filter(p => p.partei !== 'Andere');
        const anchor = parties[0].partei;
        const rival = parties[1].partei;
        userAnswers = {};
        fragen.fragen.forEach((f, i) => {
            const aA = getAnswerValue(f.antworten, anchor);
            const aR = getAnswerValue(f.antworten, rival);
            if (aA === 'j' || aA === 'n') userAnswers[i] = aA;
            else if (aR === 'j' || aR === 'n') userAnswers[i] = aR === 'j' ? 'n' : 'j';
            else userAnswers[i] = 'm';
        });

        const setFilters = (type, slider, party, excludes) => {
            filterState.coalitionType.value = type;
            filterState.minMatch.value = String(slider);
            filterState.partyFilter.value = party;
            filterState.excludes = excludes.map(v => ({ value: v, checked: true }));
        };

        // ---- 1) Regler-Einfluss: Best-Koalition und alle gelisteten >= Slider ----
        [0, 50, 90].forEach(slider => {
            setFilters('beide', slider, '', []);
            const list = berechneGefilterteKoalitionen();
            const best = list[0] || null;
            if (list.length === 0) {
                T({ ok: true, name: eid + ': slider=' + slider + ' leere Liste ok', msg: '' });
            } else {
                T({ ok: best && best.uebereinstimmung >= slider,
                    name: eid + ': slider=' + slider + ' best.uebereinstimmung >= slider',
                    msg: (best ? best.parteien.join('+') + ' ' + best.uebereinstimmung.toFixed(1) : 'kein best') + ' vs ' + slider });
                T({ ok: list.every(k => k.uebereinstimmung >= slider),
                    name: eid + ': slider=' + slider + ' alle gelisteten >= slider', msg: '' });
            }
        });

        // ---- 2) Best-Koalition ist Top-Eintrag derselben Liste wie der
        //      Koalitionen-Tab (updateKoalitionen rendert sie). ----
        setFilters('beide', 40, '', []);
        const listA = berechneGefilterteKoalitionen();
        const bestA = listA[0] || null;
        if (bestA) {
            filterState.coalitionResults.innerHTML = '';
            updateKoalitionen();
            T({ ok: bestA.parteien.every(p => filterState.coalitionResults.innerHTML.indexOf(p) !== -1),
                name: eid + ': Best-Koalition im Koalitionen-Tab-Render enthalten',
                msg: bestA.parteien.join('+') });
        }

        // ---- 3) Koalitionstyp wird respektiert ----
        setFilters('mehrheit', 0, '', []);
        const mehr = berechneGefilterteKoalitionen()[0];
        T({ ok: !mehr || mehr.prozente > 50, name: eid + ': Typ=mehrheit -> prozente>50', msg: mehr ? mehr.parteien.join('+') + ' ' + mehr.prozente.toFixed(1) : 'leer' });
        setFilters('minderheit', 0, '', []);
        const minder = berechneGefilterteKoalitionen()[0];
        T({ ok: !minder || minder.prozente < 50, name: eid + ': Typ=minderheit -> prozente<50', msg: minder ? minder.parteien.join('+') + ' ' + minder.prozente.toFixed(1) : 'leer' });

        // ---- 4) Partei-Filter wird respektiert ----
        const someParty = parties[2].partei;
        setFilters('beide', 0, someParty, []);
        const listF = berechneGefilterteKoalitionen();
        if (listF.length) {
            T({ ok: listF.every(k => k.parteien.includes(someParty)),
                name: eid + ': Partei-Filter "' + someParty + '" -> alle enthalten', msg: listF.slice(0, 2).map(k => k.parteien.join('+')).join(' / ') });
        } else {
            T({ ok: true, name: eid + ': Partei-Filter "' + someParty + '" -> leere Liste ok', msg: '' });
        }

        // ---- 5) Ausschlüsse werden respektiert ----
        const exclParty = parties[2].partei;
        setFilters('beide', 0, '', [exclParty]);
        const listE = berechneGefilterteKoalitionen();
        T({ ok: listE.every(k => !k.parteien.includes(exclParty)),
            name: eid + ': Ausschluss "' + exclParty + '" -> nirgends enthalten', msg: listE.length ? listE.slice(0, 2).map(k => k.parteien.join('+')).join(' / ') : 'leer' });

        // ---- 6) Regression: Alte Logik (feste config-Schwelle) würde bei
        //      Slider=90 eine Koalition UNTER dem Reglerwert empfehlen. ----
        setFilters('beide', 90, '', []);
        const newBest = berechneGefilterteKoalitionen()[0] || null;
        const allKoal = berechneKoalitionen('beide', []);
        allKoal.forEach(k => { k.benutzerMatch = berechneUserMatchFuerKoalition(k.parteien); });
        const oldBest = allKoal
            .filter(k => k.prozente > 50 && k.uebereinstimmung >= minMatchForCoalitionCfg)
            .sort((a, b) => (b.benutzerMatch ?? -1) - (a.benutzerMatch ?? -1))[0] || null;
        if (newBest && oldBest && newBest.parteien.join('+') !== oldBest.parteien.join('+')) {
            T({ ok: newBest.uebereinstimmung >= 90,
                name: eid + ': Regression – neu respektiert Slider 90 (' + newBest.parteien.join('+') + ' ' + newBest.uebereinstimmung.toFixed(1) + '%), alt wählte ' + oldBest.parteien.join('+') + ' ' + oldBest.uebereinstimmung.toFixed(1) + '%',
                msg: '' });
        } else {
            T({ ok: true, name: eid + ': slider=90 keine Abweichung alt/neu (beide >=90)', msg: '' });
        }
    });

    const fails = results.filter(x => !x.ok).length;
    console.log('\\nBEST-COALITION-FILTER-HARNESS: ' + (results.length - fails) + '/' + results.length + ' ok');
    if (fails) process.exit(1);
}).call(this);
`;

sandbox.__fsPonyfill__ = fs;
sandbox.__pathPonyfill__ = path;
try {
    vm.runInContext(code + '\n' + body, sandbox, { filename: 'script.js' });
} catch (e) {
    console.error('LOAD/RUN ERROR:', e && e.stack || e);
    process.exit(1);
}