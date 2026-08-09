// Verifikations-Harness für die gemergte Szenario-C/D-Logik (Grundmandatsklausel)
// gegen den echten, gemergten script.js und die echten Wahldateien.
// Nutzung: node harness/tactical-scenarios-check.js
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

function loadConfig(id) {
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'elections', id, 'config.json'), 'utf8'));
    const werte = JSON.parse(fs.readFileSync(path.join(root, 'elections', id, 'werte.json'), 'utf8'));
    return { cfg, werte };
}

const sandbox = buildSandbox();
vm.createContext(sandbox);

const all = [
    ['btw2029', path.join(root, 'elections/btw2029/config.json')],
    ['berlin-2026', path.join(root, 'elections/berlin-2026/config.json')],
    ['ltw-sachsen-anhalt-2026', path.join(root, 'elections/ltw-sachsen-anhalt-2026/config.json')],
    ['mv-2026', path.join(root, 'elections/mv-2026/config.json')]
];
sandbox.__ELECTIONS__ = all;
sandbox.__ROOT__ = root;
sandbox.path = path;

const body = `
;(function() {
    const fs = __fsPonyfill__;
    const results = [];
    const T = (tap, extra) => {
        results.push(tap);
        console.log((tap.ok ? 'PASS' : 'FAIL') + ': ' + tap.name + (tap.ok ? '' : ' — ' + (tap.msg || '')));
        if (extra && !tap.ok) console.log('    ' + extra);
    };

    config = { thresholds: { sperrklausel: 5 } };
    activeElectionId = 'harness';
    window.werteData = { umfragewerte: [] };
    window.parteienData = { fragen: [] };

    for (const [id, cfgPath] of __ELECTIONS__) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        const wertePath = cfgPath.replace('config.json', 'werte.json');
        const werte = JSON.parse(fs.readFileSync(wertePath, 'utf8'));

        // simulate setActiveElection-like config loading
        const thresholds = (cfg.thresholds && cfg.thresholds.sperrklausel) || 5;
        config = {
            thresholds: { sperrklausel: thresholds },
            partyColors: { LINKE: '#b2182b', SPD: '#e3000f', 'CDU/CSU': '#000000', GRÜNE: '#46962b', FDP: '#ffed00', AfD: '#009ee0', BSW: '#a34b24', default: '#888888' }
        };
        activeElectionId = id;
        window.werteData = { umfragewerte: werte.umfragewerte };
        if (cfg.direktmandate && typeof cfg.direktmandate === 'object' && !Array.isArray(cfg.direktmandate)) {
            config.direktmandate = cfg.direktmandate;
        } else {
            config.direktmandate = null;
        }
        tacticalPolls = {};
        tacticalPollsKey = null;
        tacticalDirectMandates = {};
        const polls = {};
        werte.umfragewerte.forEach(p => { if (p.partei !== 'Andere') polls[p.partei] = p.prozent; });
        tacticalPolls = polls;
        tacticalPollsKey = id;

        const hasDm = !!direktmandateParteien();

        if (id === 'btw2029') {
            // A: no-data flag is true for btw2029
            T({ ok: hasDm === true, name: id + ': hasDirektmandatDaten=true', msg: String(hasDm) });

            // Szenario: LINKE/BSW unter der 5%-Hürde simulieren (echte Daten: LINKE 10 %, BSW 4 %)
            polls.LINKE = 4;
            polls.BSW = 3;
            tacticalPolls = polls;
            tacticalPollsKey = id;

            // B: LINKE with 4.0% (under 5) + 3 sure mandates enters via Grundmandat
            const results_lin = [
                { partei: 'LINKE', match: 95 }, { partei: 'SPD', match: 90 },
                { partei: 'CDU/CSU', match: 80 },
                { partei: 'GRÜNE', match: 70 }, { partei: 'FDP', match: 60 },
                { partei: 'AfD', match: 10 }
            ];
            tacticalDirectMandates = { LINKE: 3 };
            let r = calculateTacticalVoting(results_lin.map(x => ({ ...x })));
            let gm = r.info.erststimmen.find(e => e.partei === 'LINKE');
            T({ ok: gm && gm.einzug === true, name: id + ': LINKE (4%, 3 DM) einzug=true', msg: JSON.stringify(gm) });
            T({ ok: r.warnings.some(w => w.type === 'grundmandat'), name: id + ': LINKE topt1 -> grundmandat-Warnung', msg: JSON.stringify(r.warnings) });
            // eligible via Grundmandat: LINKE counted in coalition basis
            T({ ok: r.info.eligibleSum > 0, name: id + ': eligibleSum berechnet', msg: String(r.info.eligibleSum) });

            // C: bundling 3 -> 4 mandates keeps entry; drop to 2 flips off
            tacticalDirectMandates = { LINKE: 4 };
            r = calculateTacticalVoting(results_lin.map(x => ({ ...x })));
            gm = r.info.erststimmen.find(e => e.partei === 'LINKE');
            T({ ok: gm && gm.einzug === true, name: id + ': LINKE 4 DM -> einzug=true', msg: JSON.stringify(gm) });

            tacticalDirectMandates = { LINKE: 2 };
            r = calculateTacticalVoting(results_lin.map(x => ({ ...x })));
            gm = r.info.erststimmen.find(e => e.partei === 'LINKE');
            T({ ok: gm && gm.einzug === false && gm.nah === true, name: id + ': LINKE 2 DM -> nah=true, einzug=false', msg: JSON.stringify(gm) });
            T({ ok: !r.warnings.some(w => w.type === 'grundmandat'), name: id + ': no grundmandat warn for 2 DM', msg: '' });

            // D: LINKE pushed above threshold no longer in erststimmen list
            const pollsAbove = { ...polls, LINKE: 6 };
            tacticalPolls = pollsAbove;
            tacticalPollsKey = id;
            r = calculateTacticalVoting(results_lin.map(x => ({ ...x })));
            T({ ok: !r.info.erststimmen.some(e => e.partei === 'LINKE'), name: id + ': LINKE 6% -> not in C-list', msg: JSON.stringify(r.info.erststimmen) });
            delete pollsAbove.LINKE;
        } else {
            // no-data elections: hasDirektmandatDaten=false, empty erststimmen
            T({ ok: hasDm === false, name: id + ': hasDirektmandatDaten=false', msg: String(hasDm) });
            const parties = Object.keys(polls).map((p, i) => ({ partei: p, match: 100 - i }));
            const r = calculateTacticalVoting(parties);
            T({ ok: r.info.erststimmen.length === 0, name: id + ': leerer erststimmen-List', msg: JSON.stringify(r.info.erststimmen) });
        }
    }

// E: Render path with no-data -> nodata hint (scNoData branch)
    config = { thresholds: { sperrklausel: 5 }, direktmandate: null, partyColors: { LINKE: '#b2182b', SPD: '#e3000f', AfD: '#009ee0', 'CDU/CSU': '#000000', GRÜNE: '#46962b', FDP: '#ffed00', BSW: '#a34b24', default: '#888888' } };
    activeElectionId = 'no-data';
    const fakeBox = { innerHTML: '' };
    const origGet = document.getElementById;
    document.getElementById = id => id === 'tacticalWarnings' ? fakeBox : origGet(id);
    tacticalPolls = { AfD: 4, SPD: 25, GRÜNE: 14, 'CDU/CSU': 23 };
    tacticalPollsKey = 'no-data';
    lastTestResults = [{ partei: 'AfD', match: 95 }, { partei: 'SPD', match: 20 }];
    updateTacticalWarnings();
    document.getElementById = origGet;
    T({ ok: fakeBox.innerHTML.includes('NICHT abgebildet'), name: 'render: nodata-Hinweis', msg: fakeBox.innerHTML.slice(0, 300) });

    // F: Render path with btw2029 data: lists C-section, no nodata hint
    const btwCfg = JSON.parse(fs.readFileSync(path.join(__ROOT__, 'elections', 'btw2029', 'config.json'), 'utf8'));
    config = { thresholds: { sperrklausel: 5 }, direktmandate: btwCfg.direktmandate, partyColors: { LINKE: '#b2182b', SPD: '#e3000f', AfD: '#009ee0', 'CDU/CSU': '#000000', GRÜNE: '#46962b', FDP: '#ffed00', BSW: '#a34b24', default: '#888888' } };
    activeElectionId = 'btw2029-render';
    tacticalPolls = { AfD: 4, SPD: 25, GRÜNE: 14, 'CDU/CSU': 23, FDP: 5, LINKE: 4, BSW: 4 };
    tacticalPollsKey = 'btw2029-render';
    tacticalDirectMandates = {};
    document.getElementById = id => id === 'tacticalWarnings' ? fakeBox : origGet(id);
    lastTestResults = [{ partei: 'LINKE', match: 95 }, { partei: 'SPD', match: 20 }];
    fakeBox.innerHTML = '';
    updateTacticalWarnings();
    document.getElementById = origGet;
    T({ ok: fakeBox.innerHTML.includes('Grundmandatsklausel'), name: 'render-btw: Szenario-C-Sektion', msg: fakeBox.innerHTML.slice(0, 300) });
    T({ ok: !fakeBox.innerHTML.includes('NICHT abgebildet'), name: 'render-btw: kein nodata-Hinweis', msg: '' });

    const fails = results.filter(x => !x.ok).length;
    console.log('\\nSCENARIO-C/D-HARNESS: ' + (results.length - fails) + '/' + results.length + ' ok');
    if (fails) process.exit(1);
}).call(this);
`;

const ctx = { __fsPonyfill__: fs };
sandbox.__fsPonyfill__ = fs;
try {
    vm.runInContext(code + '\n' + body, sandbox, { filename: 'script.js' });
} catch (e) {
    console.error('LOAD/RUN ERROR:', e && e.stack || e);
    process.exit(1);
}