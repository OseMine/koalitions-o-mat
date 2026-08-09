let config = null;
let baseConfig = null;
let electionsList = [];
let activeElectionId = null;
let electionDataCache = {};
let currentQuestion = 0;
let userAnswers = {};
const chartInstances = {};
let simpleLangData = null;
let pendingShare = null;
let suppressHistorySave = false;
let pendingAdvanceTimer = null;
let lastTestResults = null;

// ===== Taktisches Wählen (Szenario-Simulator) =====
// Mock-"Sonntagsfrage": statische (fiktive) Umfragewerte als Fallback-Basis,
// sobald keine echten Werte der aktiven Wahl vorliegen.
const TACTICAL_MOCK_POLLS = {
    'CDU': 30, 'CDU/CSU': 30, 'SPD': 15, 'GRÜNE': 13, 'FDP': 4.5, 'LINKE': 3, 'AfD': 18
};
let tacticalPolls = {};
let tacticalPollsKey = null;
let tacticalEnabled = false;

// ===== Simple Language =====
function isSimpleLang() { return localStorage.getItem('simpleLang') === '1'; }
function simplePartyText(partei) {
    if (!isSimpleLang()) return '';
    if (window.werteData && window.werteData.umfragewerte) {
        const p = window.werteData.umfragewerte.find(x => x.partei === partei);
        if (p && p.beschreibung_einfach) return p.beschreibung_einfach;
    }
    if (!simpleLangData || !simpleLangData.parteien) return '';
    const byElection = simpleLangData.parteien[activeElectionId];
    return (byElection && byElection[partei]) || '';
}
function t(key, fallback) {
    if (!isSimpleLang() || !simpleLangData || !simpleLangData.ui) return fallback !== undefined ? fallback : key;
    return simpleLangData.ui[key] || (fallback !== undefined ? fallback : key);
}
function simpleQuestionText(f, field) {
    if (isSimpleLang() && simpleLangData && simpleLangData.fragen && activeElectionId) {
        const q = simpleLangData.fragen[activeElectionId] && simpleLangData.fragen[activeElectionId][String(f.nr)];
        if (q && q[field]) return q[field];
    }
    return f[field];
}

// ===== Answer Helpers (support legacy string and new object formats) =====
function getAnswerValue(answer, partei) {
    if (!answer || !answer[partei]) return 'm';
    const val = answer[partei];
    return typeof val === 'object' && val !== null ? val.wert || 'm' : val;
}
function getAnswerSources(answer, partei) {
    if (!answer || !answer[partei]) return null;
    const val = answer[partei];
    return typeof val === 'object' && val !== null ? val : null;
}

// ===== Wichtige Fragen & Test-Fortsetzen =====
let importantQuestions = new Set();

function testStateKey() { return 'testState-' + activeElectionId; }

function loadTestState() {
    try {
        const s = JSON.parse(localStorage.getItem(testStateKey()) || 'null');
        if (!s || !window.parteienData) return null;
        if (s.q !== window.parteienData.fragen.length) return null;
        return s;
    } catch (_) { return null; }
}

function saveTestState() {
    if (!activeElectionId || !window.parteienData) return;
    localStorage.setItem(testStateKey(), JSON.stringify({
        q: window.parteienData.fragen.length,
        answers: { ...userAnswers },
        important: [...importantQuestions],
        currentQuestion
    }));
}

function clearTestState() {
    localStorage.removeItem(testStateKey());
}

function frageGewicht(idx) {
    return importantQuestions.has(idx) ? 2 : 1;
}

function toggleImportant(idx) {
    if (importantQuestions.has(idx)) importantQuestions.delete(idx);
    else importantQuestions.add(idx);
    const btn = document.querySelector(`.question[data-q="${idx}"] .q-important`);
    if (btn) {
        btn.classList.toggle('active', importantQuestions.has(idx));
        btn.setAttribute('aria-pressed', importantQuestions.has(idx) ? 'true' : 'false');
    }
    saveTestState();
}

// ===== Teilen per URL =====
function shareResults() {
    // Neutrale Antworten (m) mitschicken – nur völlig unbeantwortete Fragen fehlen,
    // damit ein geteiltes Ergebnis exakt dem Original entspricht.
    const answered = Object.entries(userAnswers).filter(([, a]) => a === 'j' || a === 'n' || a === 'm');
    // Im Koalitionen-Tab zusätzlich die Filter-Sicht teilen (Typ, Mindestmatch,
    // Partei-Filter, Ausschlüsse), damit der Link die Koalitions-Sicht wiederherstellt.
    let coalitionParam = '';
    const koalTab = document.getElementById('koalitionen-content');
    if (koalTab && koalTab.classList.contains('active')) {
        const type = document.getElementById('coalitionType').value;
        const minMatch = document.getElementById('minMatch').value;
        const partyFilter = document.getElementById('partyFilter').value;
        const excludes = Array.from(document.querySelectorAll('#excludePartiesCheckboxes input:checked')).map(cb => cb.value);
        coalitionParam = '&c=' + encodeURIComponent([type, minMatch, partyFilter, excludes.join(',')].join('|'));
    }
    // Ohne beantwortete Fragen UND ohne Koalitions-Sicht gibt es nichts zu teilen.
    if (!answered.length && !coalitionParam) {
        showNotification(t('shareEmpty', 'Beantworten Sie zuerst Fragen.'), 'error');
        return;
    }
    // Kompakte Kodierung: "index+antwort" ohne Trennzeichen (z. B. 0j1n3j) – deutlich kürzer
    // als das frühere "0:j,1:n,3:j". Alte Links mit ":"/"," werden beim Parsen weiter akzeptiert.
    const answers = answered.map(([i, a]) => i + a).join('');
    const imp = [...importantQuestions].join(',');
    const url = location.origin + location.pathname + '#w=' + encodeURIComponent(activeElectionId)
        + '&a=' + answers + (imp ? '&i=' + imp : '') + coalitionParam;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
            () => showNotification(t('shareCopied', 'Link in die Zwischenablage kopiert!'), 'success'),
            () => showNotification(url, 'info')
        );
    } else {
        showNotification(url, 'info');
    }
}

function parseShareHash() {
    let h;
    try {
        h = decodeURIComponent(location.hash || '');
    } catch (_) {
        return null;
    }
    // &a= darf leer sein (Koalitions-Sicht ohne beantwortete Fragen teilen)
    const m = h.match(/^#w=([^&]+)&a=([^&]*)(?:&i=([^&]*))?(?:&c=([^&]*))?(?:&p=([^&]*))?$/);
    if (!m) return null;
    const raw = m[2];
    const answers = {};
    if (raw.indexOf(':') !== -1) {
        // Altes Format: 0:j,1:n
        raw.split(',').forEach(seg => {
            const [i, a] = seg.split(':');
            if (i != null && (a === 'j' || a === 'n' || a === 'm')) answers[Number(i)] = a;
        });
    } else {
        // Kompaktes Format: 0j1n3j
        const re = /(\d+)([jnm])/g;
        let mm;
        while ((mm = re.exec(raw))) answers[Number(mm[1])] = mm[2];
    }
    const important = new Set((m[3] || '').split(',').filter(Boolean).map(Number));
    return { electionId: m[1], answers, important, coalitionState: m[4] || null, party: m[5] || null };
}

function applyPendingShare() {
    if (!pendingShare || pendingShare.electionId !== activeElectionId || !window.parteienData) return;
    const questions = window.parteienData.fragen;
    userAnswers = { ...pendingShare.answers };
    importantQuestions = new Set(pendingShare.important);
    currentQuestion = Math.max(0, questions.length - 1);
    questions.forEach((f, i) => {
        if (userAnswers[i]) {
            document.querySelectorAll(`.question[data-q="${i}"] .q-btn`).forEach(b => {
                const selected = b.dataset.a === userAnswers[i];
                b.classList.toggle('selected', selected);
                b.setAttribute('aria-pressed', selected ? 'true' : 'false');
            });
        }
    });
    document.querySelectorAll('.q-important').forEach(btn => {
        btn.classList.toggle('active', importantQuestions.has(Number(btn.dataset.q)));
        btn.setAttribute('aria-pressed', importantQuestions.has(Number(btn.dataset.q)) ? 'true' : 'false');
    });
    saveTestState();
    // Ergebnis-Ansicht nur bei tatsächlich geteilten Antworten aufrufen – ein reiner
    // Koalitions-Share-Link (ohne Antworten) soll nicht die Test-Ergebnissicht mit
    // lauter "–" hinterlassen (P3 aus Review 2026-08-02/03-b).
    const hasAnswers = Object.keys(pendingShare.answers).length > 0;
    if (hasAnswers) {
        suppressHistorySave = true;
        showTestResults();
        suppressHistorySave = false;
    }
    // Koalitions-Sicht wiederherstellen, falls der Link im Koalitionen-Tab geteilt wurde
    if (pendingShare.coalitionState) {
        const parts = pendingShare.coalitionState.split('|');
        const [type, minMatch, partyFilter, excludes] = parts;
        const typeEl = document.getElementById('coalitionType');
        if (typeEl && parts[0]) typeEl.value = type;
        const minEl = document.getElementById('minMatch');
        if (minEl && parts[1] != null && parts[1] !== '') { minEl.value = minMatch; minEl.dataset.touched = '1'; }
        const filterEl = document.getElementById('partyFilter');
        if (filterEl) filterEl.value = partyFilter || '';
        const excludeList = (excludes || '').split(',').filter(Boolean);
        document.querySelectorAll('#excludePartiesCheckboxes input').forEach(cb => {
            cb.checked = excludeList.includes(cb.value);
        });
        switchTab('koalitionen');
    }
    pendingShare = null;
}

// ===== App State =====
function showApp() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
}

function showElectionSelector() {
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('appContent').style.display = 'none';
}

// ===== Teilen-URL anwenden (frischer Ladepfad UND Hash-Wechsel) =====
// Ohne diesen Handler blieb beim Öffnen eines Teilen-Links im bereits offenen Tab
// (Adressleiste / nur Fragment-Änderung) der Browser auf der Startseite stehen:
// Bei identischer Basis-URL löst der Browser KEINEN Reload aus, sondern nur ein
// `hashchange`-Event – und ohne Listener wurde die geteilte Ansicht nie geladen.
function handleShareHash() {
    pendingShare = parseShareHash();
    // Kein gültiger Teilen-Link (leerer Hash oder Fremd-Hash) → zur Startseite zurück.
    if (!pendingShare || !pendingShare.electionId) {
        pendingShare = null;
        showElectionSelector();
        return;
    }
    // Daten der Wahl müssen erst geladen sein – sonst übernimmt das nachgelagerte
    // loadElections() (liest pendingShare nach dem Fetch), bzw. der nächste
    // hashchange-Aufruf, sobald electionDataCache gefüllt ist.
    if (electionDataCache[pendingShare.electionId]) {
        setActiveElection(pendingShare.electionId);
    }
}

// ===== Tab Switching =====
function switchTab(tabName) {
    if (partyPageOpen) closePartyPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // ARIA-Tabs: aria-selected + Roving-Tabindex am aktiven Tab pflegen
    // (nur der aktive Tab ist per Tab-Taste erreichbar; Wechsel per Pfeiltasten).
    document.querySelectorAll('.tab-button').forEach(b => {
        const on = b.dataset.tab === tabName;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(tabName + '-content');
    if (el) el.classList.add('active');

    if (tabName === 'koalitionen') updateKoalitionen();
    else if (tabName === 'parteien') initializeParteienPage();
    else if (tabName === 'test') {
        // If results are showing, keep results view
        const resultsEl = document.getElementById('testResults');
        if (resultsEl && resultsEl.innerHTML) return;
        // Preserve test state across tab switches; only init on election change
        const container = document.getElementById('questionContainer');
        if (!container || !container.children.length) {
            initializeTest();
        } else {
            document.querySelectorAll('#questionContainer .question').forEach(q => q.classList.remove('active'));
            const q = document.querySelector(`#questionContainer .question[data-q="${currentQuestion}"]`);
            if (q) q.classList.add('active');
            updateNavButtons();
        }
    }
    else if (tabName === 'daten') initializeDaten();
}

// ===== Election Selection =====
function setActiveElection(electionId) {
    // Vor dem Wechsel den aktiven Tab merken, damit der Wahlwechsel nicht immer auf den
    // Test-Tab zurückspringt (Issue aus Review 2026-08-03-b, P2). Ohne vorherigen Tab
    // (z.B. beim ersten Laden) wird 'test' genutzt.
    const previousTab = activeTabName();

    activeElectionId = electionId;
    if (partyPageOpen) closePartyPage();
    localStorage.setItem('activeElectionId', electionId);
    koalitionenCache = null;
    koalitionenCacheKey = '';

    const data = electionDataCache[electionId];
    if (!data || !data.werte) {
        console.error(`Daten für ${electionId} nicht geladen`);
        showNotification(t('loadErrorHint', 'Daten konnten nicht geladen werden. Bitte später erneut versuchen.'), 'error');
        return;
    }

    window.werteData = data.werte;
    // Bei fehlendem fragen.json bewusst auf null zurücksetzen statt die Fragen
    // der vorherigen Wahl weiterzuverwenden (Cross-Election-Leak).
    window.parteienData = data.fragen || null;

    config = { ...baseConfig, koalitionsausschluss: {} };
    if (data.config) {
        if (data.config.thresholds) config.thresholds = { ...config.thresholds, ...data.config.thresholds };
        if (data.config.meta) config.meta = { ...config.meta, ...data.config.meta };
        if (data.config.koalitionsausschluss && typeof data.config.koalitionsausschluss === 'object' && !Array.isArray(data.config.koalitionsausschluss)) {
            config.koalitionsausschluss = data.config.koalitionsausschluss;
        }
    }
    if (window.werteData.meta && window.werteData.meta.sperrklausel != null)
        config.thresholds.sperrklausel = window.werteData.meta.sperrklausel;
    if (window.werteData.meta && window.werteData.meta.sitze != null) {
        if (!config.meta) config.meta = {};
        config.meta.gesamtSitze = window.werteData.meta.sitze;
    }
    if (window.werteData.meta && window.werteData.meta.verfahren != null) {
        if (!config.meta) config.meta = {};
        config.meta.verfahren = window.werteData.meta.verfahren;
    }

    // Default-Mindestübereinstimmung aus Konfig, wenn Slider nicht angefasst
    const slider = document.getElementById('minMatch');
    if (slider) {
        if (!slider.dataset.touched && config.thresholds.minMatchForCoalition != null) {
            slider.value = Math.min(100, config.thresholds.minMatchForCoalition);
        }
        // Label sofort synchronisieren (statt bis zum ersten updateKoalitionen() auf 0 %)
        const label = document.getElementById('minMatchLabel');
        if (label) label.textContent = slider.value + '%';
    }

    // Update election name in info bar
    const election = electionsList.find(e => e.id === electionId);
    document.getElementById('electionNameDisplay').textContent = election ? election.name : electionId;

    showApp();
    resetTest();
    populatePartyDropdowns();
    updateKoalitionen();
    switchTab(previousTab);

    if (pendingShare && pendingShare.electionId === electionId) {
        if (pendingShare.party) {
            // Partei-Seite direkt öffnen (geteilter Link), ohne Test-Ergebnis anzuwenden
            const party = pendingShare.party;
            pendingShare = null;
            openPartyPage(party);
        } else {
            applyPendingShare();
        }
    }
}

function renderWelcomeCards() {
    const container = document.getElementById('welcomeElectionCards');
    if (!container) return;
    container.innerHTML = electionsList.map(e => {
        const data = electionDataCache[e.id];
        // Ladefehler einer Nicht-Default-Wahl sichtbar machen: statt still abzubrechen
        // (Klick → `if (!data) return;`) eine deaktivierte Karte mit Hinweis zeigen.
        if (!data || !data.werte) {
            return `
                <div class="welcome-card welcome-card-error" role="note" aria-disabled="true">
                    <span class="welcome-card-type">${e.type ? t('type' + e.type.replace(/\s+/g, ''), e.type) : ''}</span>
                    <span class="welcome-card-name">${e.name}</span>
                    <span class="welcome-card-error-hint">${t('loadErrorHint', 'Daten konnten nicht geladen werden. Bitte später erneut versuchen.')}</span>
                </div>
            `;
        }
        const partyCount = data && data.werte && data.werte.umfragewerte ? data.werte.umfragewerte.length : 0;
        const questionCount = data && data.fragen && data.fragen.fragen ? data.fragen.fragen.length : 0;
        return `
            <button type="button" class="welcome-card" onclick="setActiveElection('${e.id}')">
                <span class="welcome-card-type">${e.type ? t('type' + e.type.replace(/\s+/g, ''), e.type) : ''}</span>
                <span class="welcome-card-name">${e.name}</span>
                <span class="welcome-card-stats">
                    <span>${partyCount} ${t('welcomeCardParties', 'Parteien')}</span>
                    <span class="welcome-card-sep">·</span>
                    <span>${questionCount} ${t('welcomeCardQuestions', 'Fragen')}</span>
                </span>
                <span class="welcome-card-start">${t('startTest', 'Test starten')} →</span>
            </button>
        `;
    }).join('');
}

// ===== Data Loading =====
async function loadElections() {
    try {
        const res = await fetch('elections.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        electionsList = data.elections || [];
        if (!electionsList.length) throw new Error('Keine Wahlen gefunden');

        try {
            const simpleRes = await fetch('einfache-sprache.json');
            if (simpleRes.ok) simpleLangData = await simpleRes.json();
        } catch (_) { /* ignore */ }

        await Promise.all(electionsList.map(async (election) => {
            try {
                const [werteRes, configRes, fragenRes] = await Promise.all([
                    fetch(`elections/${election.id}/werte.json`),
                    fetch(`elections/${election.id}/config.json`).catch(() => null),
                    fetch(`elections/${election.id}/fragen.json`).catch(() => null)
                ]);
                if (!werteRes.ok) throw new Error(`HTTP ${werteRes.status}`);
                const werte = await werteRes.json();
                let electionConfig = null;
                if (configRes && configRes.ok) electionConfig = await configRes.json();
                let fragen = null;
                if (fragenRes && fragenRes.ok) fragen = await fragenRes.json();
                electionDataCache[election.id] = { werte, config: electionConfig, fragen };
            } catch (err) {
                console.error(`Fehler beim Laden von ${election.id}:`, err);
            }
        }));

        renderWelcomeCards();
        // Einfache Sprache auch auf die statischen [data-i18n]-Elemente anwenden –
        // applySavedSimpleLang() lief vor dem asynchronen Fetch von einfache-sprache.json.
        applyStaticI18n();

        // Die Startseite (Willkommens-Screen) immer anzeigen – nur ein geteilter
        // Teilen-Link (pendingShare) wählt die Wahl direkt aus. Ohne aktive Auswahl
        // wird NICHT automatisch in eine Wahl (z. B. den btw2029-Test) gesprungen
        // (Issue: beim Laden ging es direkt in den Parteien-Test statt auf die Startseite).
        // handleShareHash() übernimmt beides: ohne Teilen-Link → Startseite, mit
        // Teilen-Link → geteilte Wahl/Ansicht laden.
        handleShareHash();
    } catch (err) {
        console.error('Fehler:', err);
        showNotification(t('errorLoading', 'Fehler beim Laden der Daten. Seite neu laden.'), 'error');
    }
}

function populatePartyDropdowns() {
    if (!window.werteData || !config) return;
    const parties = window.werteData.umfragewerte
        .filter(p => p.prozent >= config.thresholds.sperrklausel);

    // Include parties below the threshold if they answer questions
    const hasFragen = window.parteienData && window.parteienData.fragen && window.parteienData.fragen.length;
    const answeredParties = hasFragen
        ? window.werteData.umfragewerte.filter(p =>
            p.partei !== 'Andere' && window.parteienData.fragen.some(f => f.antworten && f.antworten[p.partei] != null))
        : parties;
    const relevant = answeredParties.length
        ? answeredParties
        : parties;

    const filter = document.getElementById('partyFilter');
    if (filter) {
        // Auch Parteien unter der Sperrklausel, die Fragen beantworten, auflisten –
        // sonst ist der Filter inkonsistent mit der Ergebnisliste (FDP/BSW in btw2029).
        const filterOptions = relevant.filter(p => p.partei !== 'Andere');
        filter.innerHTML = `<option value="" data-i18n="allParties">${t('allParties', 'Alle Parteien')}</option>`
            + filterOptions.map(p => `<option value="${p.partei}">${p.partei} (${p.prozent}%)</option>`).join('');
    }

    // Ausschluss-Checkboxen nur für Parteien ≥ Sperrklausel: `berechneKoalitionen()`
    // (script.js:468-470) berücksichtigt ausschließlich diese Parteien – Parteien unter
    // der Sperrklausel (z. B. FDP/BSW in btw2029) sind nicht koalitionsrelevant und
    // ein Häkchen wäre wirkungslos und irreführend.
    const excludeContainer = document.getElementById('excludePartiesCheckboxes');
    if (excludeContainer) {
        excludeContainer.innerHTML = parties
            .filter(p => p.partei !== 'Andere')
            .map(p => `
            <label class="party-cb">
                <input type="checkbox" value="${p.partei}">
                <span>${p.partei}</span>
            </label>
        `).join('');
    }

    const cbContainer = document.getElementById('comparePartiesCheckboxes');
    if (cbContainer) {
        const compareParties = relevant.length >= 2 ? relevant : window.werteData.umfragewerte;
        // Bereits ausgewählte Parteien beim Neuaufbau erhalten (Einfache-Sprache-Toggle,
        // Wahlwechsel) – sonst springt die Auswahl immer auf die ersten zwei Parteien zurück.
        const currentChecked = Array.from(cbContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const defaultChecked = currentChecked.length >= 2
            ? compareParties.filter(p => currentChecked.includes(p.partei))
            : compareParties.slice(0, 2);
        cbContainer.innerHTML = compareParties.map((p) => {
            const checked = defaultChecked.some(sel => sel && sel.partei === p.partei);
            return `
            <label class="party-cb ${checked ? 'checked' : ''}">
                <input type="checkbox" value="${escapeHtmlAttr(p.partei)}" ${checked ? 'checked' : ''}>
                <span>${escapeHtml(p.partei)}</span>
            </label>`;
        }).join('');
        updatePartyComparison();
    }
}

// ===== Parteien & Kandidaten Page =====
function initializeParteienPage() {
    const container = document.getElementById('partyInfoList');
    if (!container || !window.werteData) return;
    const parties = [...(window.werteData.umfragewerte || [])].sort((a, b) => b.prozent - a.prozent);
    if (!parties.length) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">🗳️</span><p>${t('noPartyInfo', 'Keine Parteidaten für diese Wahl verfügbar.')}</p></div>`;
        return;
    }
    container.innerHTML = parties.map(p => {
        const color = getPartyColor(p.partei);
        const simpleDesc = simplePartyText(p.partei);
        const desc = simpleDesc
            ? `<p class="party-info-desc">${escapeHtml(simpleDesc)}</p>`
            : p.beschreibung
                ? `<p class="party-info-desc">${escapeHtml(p.beschreibung)}</p>`
                : `<p class="party-info-desc party-info-empty">${t('partyInfoPending', 'Weitere Informationen zu dieser Partei folgen.')}</p>`;
        const candidates = p.kandidaten && p.kandidaten.length
            ? `<div class="party-candidates"><h4>${t('partyCandidates', 'Kandidatinnen und Kandidaten')}</h4><ul>${p.kandidaten.map(k => `<li><strong>${escapeHtml(k.name)}</strong>${k.rolle ? ` – ${escapeHtml(k.rolle)}` : ''}</li>`).join('')}</ul></div>`
            : '';
        const website = p.website
            ? `<a class="party-info-website" href="${escapeHtmlAttr(p.website)}" target="_blank" rel="noopener noreferrer">${t('partyWebsite', 'Zur Partei-Website')} ↗</a>`
            : '';
        return `
            <div class="party-info-card">
                <div class="party-info-head">
                    <span class="party-info-name" style="color:${color}">${p.partei}</span>
                    <span class="party-info-pct" style="color:${color}">${p.prozent.toFixed(1)}%</span>
                </div>
                ${desc}
                ${candidates}
                ${website}
                <div class="party-info-actions">
                    <button type="button" class="party-detail-link" onclick="openPartyPage('${escapeHtmlAttr(p.partei)}')">${t('partyDetailOpen', 'Details, Programm & News')} →</button>
                </div>
            </div>`;
    }).join('');
}

// ===== Party Detail Page =====
let partyPageOpen = false;
let currentPartyPageName = null;
let currentPartyData = null;
function getTop(p) {
    if (!p) return null;
    if (p.spitzenkandidat) {
        const m = Array.isArray(p.kandidaten) ? p.kandidaten.find(k => k.name === p.spitzenkandidat) : null;
        if (m) return m;
    }
    if (Array.isArray(p.kandidaten) && p.kandidaten.length) {
        const top = p.kandidaten.find(k => {
            const r = k.rolle || '';
            return /Spitzenkandidat|Spitzenbewerbung|Kanzlerkandidat|Ministerpr\u00e4sident|Regierender B\u00fcrgermeister|Landesvorsitz/i.test(r);
        });
        return top || p.kandidaten[0];
    }
    return null;
}

function escapeHtmlAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
}
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function openPartyPage(partyName) {
    if (!window.werteData) return;
    const party = (window.werteData.umfragewerte || []).find(p => p.partei === partyName);
    if (!party) { showNotification(t('party.notFound', 'Partei nicht gefunden.'), 'error'); return; }
    partyPageOpen = true;
    currentPartyPageName = party.partei;
    currentPartyData = party;
    const page = document.getElementById('partyPage');
    const content = document.getElementById('partyPageContent');
    const color = getPartyColor(party.partei);
    const top = getTop(party);
    const hasProgramm = window.parteienData && window.parteienData.fragen;

    content.innerHTML = `
        <header class="party-page-head">
            <div class="party-page-head-top">
                <button type="button" class="party-page-back" onclick="closePartyPage()">← ${t('party.back', 'Zurück zur Liste')}</button>
                <button type="button" class="share-btn party-share-btn" onclick="sharePartyPage('${escapeHtmlAttr(party.partei)}')">${t('party.share', 'Seite teilen')}</button>
            </div>
            <div class="party-page-titleblock">
                <span class="party-page-name" id="partyPageTitle" style="color:${color}">${party.partei}</span>
                <span class="party-page-pct" style="color:${color}">${party.prozent.toFixed(1)}%</span>
            </div>
            ${simplePartyText(party.partei) || party.beschreibung ? `<p class="party-page-desc">${escapeHtml(simplePartyText(party.partei) || party.beschreibung)}</p>` : ''}
        </header>

        ${top ? `
        <section class="party-sec">
            <h3>${t('party.candidate', 'Spitzenkandidat:in')}</h3>
            <div class="party-cand-card">
                <div class="party-cand-avatar" style="background:${color}">${escapeHtml(top.name.charAt(0))}</div>
                <div class="party-cand-meta">
                    <strong>${escapeHtml(top.name)}</strong>
                    ${top.rolle ? `<span class="party-cand-role">${escapeHtml(top.rolle)}</span>` : ''}
                    ${party.website ? `<a class="party-info-website" href="${escapeHtmlAttr(party.website)}" target="_blank" rel="noopener noreferrer">${t('partyWebsite', 'Zur Partei-Website')} ↗</a>` : ''}
                </div>
            </div>
        </section>`
        : (party.website ? `<section class="party-sec"><a class="party-info-website" href="${escapeHtmlAttr(party.website)}" target="_blank" rel="noopener noreferrer">${t('partyWebsite', 'Zur Partei-Website')} ↗</a></section>` : '')}

        <section class="party-sec">
            <h3>${t('party.timeline', 'Veränderung über die Zeit')}</h3>
            <div id="partyTimelineChart" style="height:220px;width:100%"></div>
            <p class="party-timeline-note" id="partyTimelineNote"></p>
        </section>

        ${hasProgramm ? `
        <section class="party-sec">
            <h3>${t('party.programm', 'Die wichtigsten Punkte des Wahlprogramms')}</h3>
            <div id="partyProgramm"></div>
            <p class="party-meta-note">${t('party.programmNote', 'Die Punkte basieren auf den Positionen dieser Partei in diesem Test. „Ja" bedeutet Zustimmung zur Aussage, „Nein" Ablehnung.')}</p>
        </section>
        <section class="party-sec">
            <h3>${t('party.feasibility', 'Was ist möglich – und was nicht?')}</h3>
            <div id="partyFeasibility" class="party-feasibility"></div>
            <p class="party-meta-note">${t('party.feasibilityNote', 'Diese Einschätzung beruht nur auf den Umfragewerten. Eine Umsetzung hängt von der Zusammensetzung des Parlaments, Koalitionen und politischen Mehrheiten ab.')}</p>
        </section>
        ` : ''}

        <section class="party-sec">
            <h3>${t('party.news', 'Aktuelle Nachrichten')}</h3>
            <div id="partyNews" class="party-news">
                <p class="party-muted">${t('party.loading', 'Nachrichten werden geladen…')}</p>
            </div>
        </section>

        <div class="party-page-footer">
            <button type="button" class="btn-ghost" onclick="closePartyPage()">${t('party.back', 'Zurück zur Liste')}</button>
        </div>
    `;

    page.style.display = 'block';
    Array.from(document.querySelectorAll('.tab-content')).forEach(c => c.style.display = 'none');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    renderPartyTimeline(party);
    if (hasProgramm) { renderPartyProgramm(party); renderPartyFeasibility(party); }
    loadPartyNews(party);
}

function closePartyPage() {
    partyPageOpen = false;
    const page = document.getElementById('partyPage');
    const tabName = activeTabName();
    page.style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(c => {
        c.style.display = '';
        c.classList.toggle('active', c.id === tabName + '-content');
    });
    const btn = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    // Charts im Overlay entsorgen, damit keine Leaken entstehen
    ['partyTimelineChart','partyProgrammChart'].forEach(id => {
        if (chartInstances[id]) { chartInstances[id].dispose(); delete chartInstances[id]; }
    });
}

function activeTabName() {
    const active = document.querySelector('.tab-button.active');
    return active ? active.dataset.tab : 'parteien';
}

function renderPartyTimeline(party) {
    const noteEl = document.getElementById('partyTimelineNote');
    const chartId = 'partyTimelineChart';
    const chartEl = document.getElementById(chartId);
    const verlauf = Array.isArray(party.verlauf) && party.verlauf.length ? party.verlauf : null;
    if (!verlauf) {
        // Leere Historien-Sektion nicht komplett ausblenden (wirkt sonst wie ein Bug),
        // sondern als deaktivierten Platzhalter darstellen.
        if (chartEl) {
            chartEl.style.display = 'flex';
            chartEl.className = 'party-timeline-empty';
            chartEl.setAttribute('aria-disabled', 'true');
            chartEl.innerHTML = `<span class="party-timeline-empty-icon" aria-hidden="true">📊</span>${t('party.timelineEmpty', 'Noch keine historische Umfragewerte für diese Partei vorhanden. Dieser Bereich zeigt die Entwicklung der Umfragewerte über die Zeit, sobald Daten vorliegen.')}`;
        }
        if (noteEl) noteEl.textContent = '';
        return;
    }
    if (chartEl) {
        chartEl.removeAttribute('aria-disabled');
        if (chartEl.className === 'party-timeline-empty') chartEl.className = '';
    }
    const chart = initChart(chartId);
    if (!chart) return;
    chart.off('click');
    chart.setOption(Object.assign(echartsTheme(), {
        grid: { left: 46, right: 20, top: 10, bottom: 28 },
        tooltip: { trigger: 'axis', formatter: p => `${p[0].name}: <strong>${p[0].value}%</strong>` },
        xAxis: { type: 'category', boundaryGap: false, data: verlauf.map(v => v.label), axisLabel: { color: cssVar('--on-surface-muted'), fontSize: 10 }, axisLine: { lineStyle: { color: cssVar('--outline') } } },
        yAxis: { type: 'value', axisLabel: { formatter: '{value}%', color: cssVar('--on-surface-muted'), fontSize: 10 }, splitLine: { lineStyle: { color: cssVar('--outline') + '40' } } },
        series: [{
            type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, lineStyle: { width: 3, color: getPartyColor(party.partei) },
            itemStyle: { color: getPartyColor(party.partei) }, areaStyle: { opacity: 0.08 },
            data: verlauf.map(v => ({ value: v.prozent, name: v.label }))
        }],
        graphic: [{ type: 'text', right: 6, top: 4, style: { text: t('party.current', 'aktuell'), fill: cssVar('--on-surface-muted'), fontSize: 10 } }]
    }), true);
}

function renderPartyProgramm(party) {
    const container = document.getElementById('partyProgramm');
    if (!container || !window.parteienData || !window.parteienData.fragen) return;
    const topics = {};
    window.parteienData.fragen.forEach(f => {
        const val = getAnswerValue(f.antworten, party.partei);
        if (val !== 'j' && val !== 'n') return;
        const topic = determineTopic(f);
        if (!topics[topic]) topics[topic] = { j: [], n: [] };
        topics[topic][val === 'j' ? 'j' : 'n'].push({
            text: escapeHtml(simpleQuestionText(f, 'frage')),
            zitat: getAnswerSources(f.antworten, party.partei)?.zitat
        });
    });
    const entries = Object.entries(topics).filter(([, t]) => (t.j.length + t.n.length) > 0);
    if (!entries.length) {
        container.innerHTML = `<p class="party-muted">${t('party.programmEmpty', 'Keine Positionen für diese Partei im Fragenkatalog.')}</p>`;
        return;
    }
    // Achtung: Variable NICHT `t` nennen – das würde die i18n-Funktion t() überschatten
    // und renderPartyProgramm() mit "TypeError: t is not a function" crashen lassen
    // (Partei-Seite blieb leer, Teilen-Link zeigte dem Empfänger die Fehler-Ansicht).
    container.innerHTML = entries.map(([topic, tdata]) => {
        const topicColor = (config.topics[topic] && config.topics[topic].color) || '#999';
        const ja = tdata.j.slice(0, 3);
        const nein = tdata.n.slice(0, 3);
        const jaMore = tdata.j.length - ja.length;
        const neinMore = tdata.n.length - nein.length;
        return `
            <div class="party-prog-topic">
                <div class="party-prog-topic-head" style="--tcolor:${topicColor}">${escapeHtml(topic)}</div>
                ${ja.length ? `<div class="party-prog-list">
                    ${ja.map(q => `<div class="party-prog-item pr-ja"><span class="party-prog-tag">${t('legendYes','Ja')}</span><div>${q.text}${q.zitat ? `<div class="party-prog-zitat">„${escapeHtml(q.zitat)}”</div>` : ''}</div></div>`).join('')}
                    ${jaMore > 0 ? `<p class="party-prog-more">${t('programmMore', '… und {n} weitere Punkte').replace('{n}', jaMore)}</p>` : ''}
                </div>` : ''}
                ${nein.length ? `<div class="party-prog-list">
                    ${nein.map(q => `<div class="party-prog-item pr-ne"><span class="party-prog-tag">${t('legendNo','Nein')}</span><div>${q.text}${q.zitat ? `<div class="party-prog-zitat">„${escapeHtml(q.zitat)}”</div>` : ''}</div></div>`).join('')}
                    ${neinMore > 0 ? `<p class="party-prog-more">${t('programmMore', '… und {n} weitere Punkte').replace('{n}', neinMore)}</p>` : ''}
                </div>` : ''}
            </div>`;
    }).join('');
}

function renderPartyFeasibility(party) {
    const container = document.getElementById('partyFeasibility');
    if (!container) return;
    const pct = party.prozent || 0;
    const majority = pct > 50;
    const above = pct >= (config.thresholds.sperrklausel || 5);
    const html = `
        <div class="party-feas-card">
            <span class="party-feas-badge ${majority ? 'ok' : ''}">${majority ? t('party.feasPossible','Alleinstarke Mehrheit möglich') : t('party.feasCoalition','Mehrheit nur mit Partnern')}</span>
            <p>${majority
                ? t('party.feasMajorityText', 'Nach den aktuellen Umfragewerten ({pct}%) könnte diese Partei rechnerisch eine Mehrheit erreichen. Eine Umsetzung hängt dennoch von der Zusammensetzung des Parlaments und möglichen Koalitionen ab.').replace('{pct}', pct.toFixed(1))
                : t('party.feasText', 'Nach den aktuellen Umfragewerten hat diese Partei {pct}%. Für eine Mehrheit im Parlament bräuchte sie Koalitionspartner. Ihre wichtigsten Vorhaben können also nur gemeinsam mit anderen umgesetzt werden.').replace('{pct}', pct.toFixed(1))}
            </p>
            ${!above ? `<p class="party-feas-note">${t('party.feasUnder', 'Diese Partei liegt derzeit unter der Sperrklausel von {klausel}% und würde bei einer Wahl ohne Sonderregeln keine Sitze erhalten.').replace('{klausel}', config.thresholds.sperrklausel)}</p>` : ''}
        </div>`;
    container.innerHTML = html;
}

function sharePartyPage(party) {
    if (!party || !activeElectionId) return;
    const url = location.origin + location.pathname + '#w=' + encodeURIComponent(activeElectionId) + '&a=&p=' + encodeURIComponent(party);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
            () => showNotification(t('shareCopied', 'Link in die Zwischenablage kopiert!'), 'success'),
            () => showNotification(url, 'info')
        );
    } else {
        showNotification(url, 'info');
    }
}

const PARTY_NEWS_TERMS = {
    'AFD': ['afd', 'alternative für deutschland'],
    'CDU/CSU': ['cdu', 'csu', 'christdemokrat'],
    'GRÜNE': ['grüne', 'grünen', 'bündnis 90'],
    'SPD': ['spd', 'sozialdemokrat'],
    'FDP': ['fdp', 'freie demokrat'],
    'LINKE': ['linke', 'linken'],
    'BSW': ['bsw', 'wagenknecht'],
    'SSW': ['ssw', 'südschleswig'],
    'FREIE WÄHLER': ['freie wähler', 'freien wähler'],
    'Tierschutz': ['tierschutzpartei', 'tierschutz'],
    'PIRATEN': ['piraten'],
    'Volt': ['volt'],
    'PARTEI': ['die partei'],
    'ÖDP': ['ödp', 'ökologisch-demokratische partei'],
    'DieBasis': ['diebasis', 'basisdemokratische partei'],
    'BÜNDNIS DEUTSCHLAND': ['bündnis deutschland'],
    'Todenhöfer': ['todenhöfer']
};

function partyNewsKeywords(party) {
    const name = (party.partei || '').trim().toUpperCase();
    const terms = (PARTY_NEWS_TERMS[name] || [name.toLowerCase()]).slice();
    (party.kandidaten || []).forEach(k => {
        if (!k.name) return;
        const full = k.name.toLowerCase();
        if (full.length >= 4) terms.push(full);
        const last = full.trim().split(/\s+/).pop();
        if (last && last.length >= 4 && last !== full) terms.push(last);
    });
    return terms;
}

// Mehrdeutige Begriffe, die im Deutschen auch als Adjektive/Substantive
// vorkommen („grüne“, „linke“) bzw. als Maßeinheit („Volt“). Sie werden nur
// gezählt, wenn sie wie ein Parteiname verwendet werden.
const PARTY_NEWS_AMBIGUOUS = new Set(['grüne', 'grünen', 'linke', 'linken', 'volt']);

// Unverwechselbare Partei-Kürzel/Wortstämme, die auch in Komposita
// („SPDler“, „sozialdemokraten“, „freie demokraten“) erkannt werden sollen.
const PARTY_NEWS_COMPOUND = new Set([
    'spd', 'cdu', 'csu', 'fdp', 'afd', 'bsw', 'ssw', 'ödp', 'diebasis',
    'sozialdemokrat', 'christdemokrat', 'freie demokrat', 'tierschutzpartei',
    'basisdemokratische partei'
]);

// Verben (, Präpositionen) etc., die einen Parteinamen als Satz-Subjekt
// nahelegen („Grüne fordern", „Volt tritt an“, „Linke will“).
const PARTY_NEWS_VERB_FOLLOW = new Set([
    'will', 'wollen', 'wollte', 'hat', 'haben', 'habe', 'hätte', 'hatte',
    'ist', 'sind', 'war', 'waren', 'sei', 'wird', 'werden', 'würde', 'würden',
    'kann', 'können', 'könnte', 'könnten', 'muss', 'müssen', 'müsste', 'darf',
    'dürfen', 'soll', 'sollen',
    'fordert', 'fordern', 'forderte', 'gefordert', 'kritisiert', 'kritisieren',
    'kritisierte', 'gewinnt', 'gewinnen', 'gewann', 'gewonnen', 'verliert',
    'verlieren', 'verlor', 'tritt', 'treten', 'trat',
    'kommt', 'kommen', 'kam', 'gekommen', 'nimmt', 'nehmen', 'nahm',
    'steht', 'stehen', 'zieht', 'ziehen', 'zog', 'fällt', 'fallen', 'fiel',
    'steigt', 'steigen', 'stieg', 'setzt', 'setzen', 'setzte',
    'scheitert', 'scheitern', 'scheiterte', 'kündigt', 'kündigen', 'ankündigt',
    'ankündigen', 'erklärt', 'erklären', 'erklärte', 'betont', 'betonen',
    'sagt', 'sagen', 'sagte', 'spricht', 'sprechen', 'sucht', 'suchen', 'suchte',
    'erreicht', 'erreichen', 'erreichte', 'erzielt', 'erzielen', 'bekommt',
    'bekommen', 'bekam', 'erhält', 'erhalten', 'erhielt', 'erwartet', 'erwarten',
    'erwartete', 'reagiert', 'reagieren', 'reagierte', 'warnt', 'warnen',
    'hofft', 'hoffen', 'meint', 'meinen', 'behauptet', 'behaupten', 'versucht',
    'versuchen', 'versuchte', 'unterstützt', 'unterstützen', 'lehnt', 'lehnen',
    'ablehnt', 'verhandelt', 'verhandeln', 'beschließt', 'beschließen',
    'beschlossen', 'entscheidet', 'entscheiden', 'entschieden', 'wählt',
    'wählen', 'wählte', 'stimmt', 'stimmen', 'zustimmt', 'antwortet', 'antworten',
    'antwortete', 'schickt', 'schicken', 'meldete', 'meldet', 'fordern', 'melden',
    'europawahl', 'bundestagswahl', 'landtagswahl', 'koalition', 'parteitag',
    'europa', 'bundestag', 'landtag'
]);

// Kontext-Wörter, die auf politischen/parteibezogenen Zusammenhang hindeuten
// und bei mehrdeutigen Begriffen als Indikator dienen.
const PARTY_NEWS_CONTEXT = [
    'partei', 'parteitag', 'politik', 'politiker', 'politikerin', 'fraktion',
    'abgeordnet', 'minister', 'ministerin', 'kanzler', 'vorsitz',
    'spitzenkandidat', 'wahl', 'wähler', 'bundestag', 'landtag', 'europa',
    'koalition', 'regierung', 'ministerpräsident', 'antrag', 'gesetz', 'entwurf',
    'beschluss', 'abstimmung', 'mehrheit', 'sitz', 'sitzung', 'programm',
    'führung', 'kandidat', 'umfrage', 'ergebnis', 'haushalt', 'finanz',
    'migration', 'klima', 'verfassung', 'parlament', 'grundgesetz',
    'christdemokrat', 'sozialdemokrat', 'freie demokrat'
];

function newsItemMatchesParty(item, terms) {
    const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
    let strong = 0;
    const weak = new Map();

    for (const term of terms) {
        const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const ambiguous = PARTY_NEWS_AMBIGUOUS.has(term);
        const compound = PARTY_NEWS_COMPOUND.has(term);
        // Eigene Wortgrenzen statt \b: funktioniert damit auch am Wortanfang
        // mit Umlauten („ÖDP“), erfasst aber auch Komposita wie „SPDler“.
        const tail = (ambiguous || compound)
            ? '(?:(?=[a-zäöüß])|(?![a-z0-9äöüß]))'
            : '(?![a-z0-9äöüß])';
        let re;
        try {
            re = new RegExp('(?:^|[^a-z0-9äöüß])(' + esc + ')' + tail, 'gi');
        } catch (_) {
            if (!ambiguous && text.includes(term)) return true;
            continue;
        }
        let m;
        while ((m = re.exec(text)) !== null) {
            if (!m[1]) { re.lastIndex = m.index + m[0].length; continue; }
            const start = m.index + m[0].length - m[1].length;
            if (!ambiguous) { strong++; re.lastIndex = m.index + m[0].length; continue; }
            if (m[1].toLowerCase() === 'volt' && isVoltUnitHit(text, start)) {
                re.lastIndex = m.index + m[0].length;
                continue;
            }
            if (weakPartyNote(text, start, m[1].length)) {
                weak.set(term, true);
            }
            re.lastIndex = m.index + m[0].length;
        }
    }

    return weak.size > 0 || strong > 0;
}

function weakPartyNote(text, start, len) {
    const after = text.slice(start + len);
    const tok = after.match(/^\s*(-)?\s*([a-z0-9äöüß]*)/);
    if (tok[1]) return 'compound';
    const nextWord = tok[2];
    if (!nextWord) return 'bare';
    if (PARTY_NEWS_VERB_FOLLOW.has(nextWord)) return 'verb';
    const lo = Math.max(0, start - 120);
    const hi = Math.min(text.length, start + len + 120);
    const chunk = text.slice(lo, hi);
    if (PARTY_NEWS_CONTEXT.some(c => chunk.includes(c))) return 'context';
    return null;
}

function isVoltUnitHit(text, idx) {
    const prevPart = text.slice(0, idx);
    const match = prevPart.match(/([^\s]+)\s*$/);
    if (!match) return false;
    const tok = match[1].toLowerCase();
    if (/\d/.test(tok)) return true;
    if (/^(?:kilo|mega|giga|milli|mikro|mili)?(?:volt|watt|amp(?:ere)?|va)$/.test(tok)) return true;
    return false;
}

function loadPartyNews(party) {
    const container = document.getElementById('partyNews');
    if (!container) return;
    const feeds = Array.isArray(party.rss) ? party.rss : [];
    if (!feeds.length) {
        container.innerHTML = `<div class="party-news-state"><p class="party-muted">${t('party.newsEmpty', 'Für diese Seite sind noch keine Nachrichten-Quellen eingerichtet.')}</p></div>`;
        return;
    }
    const renderNewsError = () => {
        container.innerHTML = `<div class="party-news-state">
            <p class="party-muted">${t('party.newsError', 'Nachrichten konnten nicht geladen werden. Bitte später erneut versuchen.')}</p>
            <button type="button" class="btn-ghost party-news-retry" onclick="requirePartyNews()">${t('party.newsRetry', 'Erneut versuchen')}</button>
        </div>`;
    };
    container.innerHTML = `<div class="party-news-state party-news-loading" role="status" aria-live="polite">
        <span class="party-news-spinner" aria-hidden="true"></span>
        <p class="party-muted">${t('party.loading', 'Nachrichten werden geladen…')}</p>
    </div>`;
    const keywords = partyNewsKeywords(party);
    Promise.all(feeds.map(url => fetchNewsFeedProxy(url)
        .then(res => parseRss(res, url))
        .catch(() => null)
    )).then(results => {
        const items = results.filter(Boolean);
        // dedup
        const seen = new Set(); const flat = [];
        items.flat().forEach(it => { if (it.link && !seen.has(it.link)) { seen.add(it.link); flat.push(it); } });
        flat.sort((a, b) => Date.parse(b.date || '') - Date.parse(a.date || ''));
        if (!flat.length) {
            renderNewsError();
            return;
        }
        // Nur Meldungen zeigen, die etwas mit dieser Partei zu tun haben
        // (die neutralen Feeds liefern allgemeine Nachrichten; gefiltert wird
        // anhand von Parteiname und Kandidat:innen auf dieser Partei-Seite).
        const relevant = flat.filter(it => newsItemMatchesParty(it, keywords));
        if (!relevant.length) {
            container.innerHTML = `<p class="party-muted">${t('party.newsNone', 'Aktuell gibt es in den Feeds keine Meldungen, die diese Partei direkt betreffen.')}</p>
                <p class="party-muted party-news-source">${t('party.newsSource', 'Nachrichtenfeed automatisch geladen (RSS). Auswahl & Zusammensetzung können nicht kontrolliert werden.')}</p>`;
            return;
        }
        container.innerHTML = `<ul class="party-news-list">${relevant.slice(0, 8).map(it => `
            <li class="party-news-item">
                <a class="party-news-link" href="${escapeHtmlAttr(it.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.title)}</a>
                <span class="party-news-meta">
                    ${it.source ? `<span class="party-news-source-badge">${escapeHtml(it.source)}</span>` : ''}
                    ${it.date ? `<span class="party-news-date">${formatNewsDate(it.date)}</span>` : ''}
                </span>
            </li>`).join('')}</ul>
            <p class="party-muted party-news-source">${t('party.newsSource', 'Nachrichtenfeed automatisch geladen (RSS). Auswahl & Zusammensetzung können nicht kontrolliert werden.')}</p>`;
    }).catch(() => {
        renderNewsError();
    });
}

function requirePartyNews() {
    if (currentPartyData) loadPartyNews(currentPartyData);
}

const NEWS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?url='
];
const NEWS_FETCH_TIMEOUT_MS = 10000;
const NEWS_RETRY_PASSES = 2;
const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;
const newsFeedCache = {};

function newsProxyList() {
    const configured = (config && config.newsProxy) || '';
    return (configured ? [configured] : []).concat(NEWS_PROXIES)
        .filter((p, i, arr) => p && arr.indexOf(p) === i);
}

function looksLikeRssXml(text) {
    const t = String(text || '').replace(/^\uFEFF/, '').trim();
    return t.charAt(0) === '<' && /<item[ >]|<entry[ >]|<rss|<feed/i.test(t);
}

function fetchNewsFeedProxy(url) {
    const cached = newsFeedCache[url];
    if (cached && Date.now() - cached.ts < NEWS_CACHE_TTL_MS) return Promise.resolve(cached.text);
    const proxies = newsProxyList();
    let lastErr = null;
    let idx = 0;
    let pass = 0;
    const tryNext = () => {
        if (idx >= proxies.length) {
            pass++;
            if (pass < NEWS_RETRY_PASSES) { idx = 0; }
            else return Promise.reject(lastErr || new Error('feed'));
        }
        const proxy = proxies[idx++];
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), NEWS_FETCH_TIMEOUT_MS);
        return fetch(proxy + encodeURIComponent(url), { signal: ctrl.signal })
            .then(r => { if (!r.ok) throw new Error('feed'); return r.text(); })
            .then(text => {
                if (looksLikeRssXml(text)) {
                    newsFeedCache[url] = { ts: Date.now(), text };
                    return text;
                }
                throw new Error('feed');
            })
            .catch(err => {
                clearTimeout(timer);
                lastErr = err;
                return tryNext();
            })
            .finally(() => clearTimeout(timer));
    };
    return tryNext();
}

const NEWS_SOURCE_NAMES = {
    'tagesschau.de': 'Tagesschau',
    'deutschlandfunk.de': 'Deutschlandfunk',
    'zdf.de': 'ZDF',
    'ndr.de': 'NDR',
    'mdr.de': 'MDR',
    'rbb24.de': 'rbb'
};

function feedSourceLabel(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return NEWS_SOURCE_NAMES[host] || host;
    } catch (_) { return ''; }
}

function parseRss(text, feedUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    if (!doc || doc.getElementsByTagName('parsererror').length) return [];
    const source = feedUrl ? feedSourceLabel(feedUrl) : '';
    const items = doc.querySelectorAll('item, entry');
    return Array.from(items).slice(0, 20).map(it => {
        const linkEl = it.querySelector('link');
        const link = (linkEl && linkEl.textContent)
            || (it.querySelector('link[href]') || {}).getAttribute('href') || '';
        return {
            title: (it.querySelector('title') || {}).textContent || '',
            link,
            date: (it.querySelector('pubDate') || it.querySelector('published') || it.querySelector('updated') || {}).textContent || '',
            source,
            description: (it.querySelector('description') || it.querySelector('summary') || {}).textContent || ''
        };
    }).filter(it => it.title && it.link);
}

function formatNewsDate(d) {
    const ts = Date.parse(d);
    if (isNaN(ts)) return '';
    try { return new Date(ts).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (_) { return ''; }
}

// Ensure party detail reopens on simple-lang toggle or resize
function refreshPartyPageIfOpen() {
    if (partyPageOpen && currentPartyPageName) {
        openPartyPage(currentPartyPageName);
    }
}
function redrawPartyTimelineIfOpen() {
    if (partyPageOpen && currentPartyData) {
        const chartEl = document.getElementById('partyTimelineChart');
        if (chartEl && chartEl.style.display !== 'none') renderPartyTimeline(currentPartyData);
    }
}

// ===== Coalition Calculation =====
let koalitionenCache = null;
let koalitionenCacheKey = '';

// Jede Partei kann pro Wahl in "koalitionsausschluss" festlegen, mit welchen
// Parteien sie nicht zusammen regieren will. Eine Koalition wird ausgeblendet,
// sobald sie ein Paar enthält, für das eine der beiden Parteien den Ausschluss
// erklärt hat (z. B. AfD verweigert SPD, GRÜNE und LINKE).
function istKoalitionAusgeschlossen(parteienNamen) {
    const ausschluss = (config && config.koalitionsausschluss) || {};
    for (const name of parteienNamen) {
        const verweigert = ausschluss[name];
        if (Array.isArray(verweigert) && verweigert.some(x => parteienNamen.includes(x))) return true;
    }
    return false;
}

// Lesbare Liste der Ausschluss-Paare (dedupliziert) für den Hinweis-Text,
// z. B. "AfD + SPD, AfD + GRÜNE, AfD + LINKE".
function ausschlussPaarNamen() {
    const ausschluss = (config && config.koalitionsausschluss) || {};
    const paare = new Set();
    for (const [a, liste] of Object.entries(ausschluss)) {
        if (!Array.isArray(liste)) continue;
        for (const b of liste) {
            paare.add([a, b].sort().join(' + '));
        }
    }
    return [...paare];
}

function berechneKoalitionen(type = 'mehrheit', excludeParties = []) {
    if (!config || !window.werteData || !window.parteienData) return [];
    const maxSize = (config.thresholds && config.thresholds.maxCoalitionSize) || 4;
    const key = type + '|' + excludeParties.join(',') + '|' + maxSize;
    if (koalitionenCache && koalitionenCacheKey === key) return koalitionenCache;
    // Hinweis Grenzwert-Entscheidung: `>=` (statt `>`) nimmt Parteien mit exakt
    // Sperrklausel-Prozent in die Berechnung auf (z. B. GRÜNE exakt 5 % in MV-2026).
    // Das ist bewusst: Parteien an der Sperrklausel erreichen regulär Sitze.
    const parties = window.werteData.umfragewerte.filter(
        p => p.partei !== 'Andere' && p.prozent >= config.thresholds.sperrklausel && !excludeParties.includes(p.partei)
    );
    const koalitionen = [];
    const n = parties.length;
    for (let i = 1; i < (1 << n); i++) {
        const kParties = parties.filter((_, j) => i & (1 << j));
        if (kParties.length < 2 || kParties.length > maxSize) continue;
        // Politisch ausgeschlossene Koalitionen (z. B. AfD+SPD) nicht anzeigen
        if (istKoalitionAusgeschlossen(kParties.map(p => p.partei))) continue;
        const sum = kParties.reduce((s, p) => s + p.prozent, 0);
        let ok = false;
        if (type === 'mehrheit') ok = sum > 50;
        else if (type === 'minderheit') ok = sum < 50;
        else ok = true;
        if (ok) {
            const ueber = berechneUebereinstimmung(kParties);
            const paare = berechnePaarAgreements(kParties);
            const minPaar = paare.length
                ? Math.min(...paare.map(p => p.wert != null ? p.wert : 50))
                : null;
            koalitionen.push({
                parteien: kParties.map(p => p.partei),
                prozente: sum,
                uebereinstimmung: ueber,
                minPaar,
                anzahl: kParties.length
            });
        }
    }
    koalitionenCache = koalitionen;
    koalitionenCacheKey = key;
    return koalitionen;
}

function berechneUebereinstimmung(parteien) {
    // Paarweise Übereinstimmung: Für jede Frage werden alle Parteienpaare verglichen,
    // die beide mit "j"/"n" geantwortet haben. Neutrale ("m") Antworten tragen weder
    // zum Zähler noch zum Nenner bei, dadurch werden reine "m"-Fragen automatisch aus
    // der Basis herausgerechnet. Ein direkter Konflikt (j vs. n) zählt als 0, kein
    // Konflikt als 1 – große Koalitionen werden so nicht mehr systematisch bestraft.
    let match = 0, comparable = 0;
    if (!window.parteienData || !window.parteienData.fragen) return 0;
    window.parteienData.fragen.forEach(f => {
        const answers = parteien.map(p => getAnswerValue(f.antworten, p.partei));
        for (let i = 0; i < answers.length; i++) {
            const a = answers[i];
            if (a !== 'j' && a !== 'n') continue;
            for (let j = i + 1; j < answers.length; j++) {
                const b = answers[j];
                if (b !== 'j' && b !== 'n') continue;
                comparable++;
                if (a === b) match++;
            }
        }
    });
    if (comparable === 0) return 50; // keine vergleichbaren Antworten → neutrale Baseline
    return (match / comparable) * 100;
}

// Paarweise Übereinstimmung je Parteienpaar. Macht Fundamentalkonflikte sichtbar,
// die der Durchschnittswert einer Koalition verdeckt (z. B. AfD–GRÜNE = 0 %).
function berechnePaarAgreements(parteien) {
    const results = [];
    if (!window.parteienData || !window.parteienData.fragen) return results;
    for (let i = 0; i < parteien.length; i++) {
        for (let j = i + 1; j < parteien.length; j++) {
            let match = 0, comparable = 0;
            window.parteienData.fragen.forEach(f => {
                const a = getAnswerValue(f.antworten, parteien[i].partei);
                const b = getAnswerValue(f.antworten, parteien[j].partei);
                if (a !== 'j' && a !== 'n') return;
                if (b !== 'j' && b !== 'n') return;
                comparable++;
                if (a === b) match++;
            });
            results.push({
                paar: [parteien[i].partei, parteien[j].partei],
                wert: comparable > 0 ? (match / comparable) * 100 : null
            });
        }
    }
    return results;
}

function berechneUserMatchFuerKoalition(parteiNames) {
    let sum = 0, count = 0;
    if (!window.parteienData || !window.parteienData.fragen) return 0;
    const prozentOf = {};
    (window.werteData.umfragewerte || []).forEach(p => { prozentOf[p.partei] = p.prozent || 0; });
    window.parteienData.fragen.forEach((f, i) => {
        const ua = userAnswers[i];
        if (!ua || ua === 'm') return;
        let agreeW = 0, denom = 0;
        parteiNames.forEach(name => {
            const pa = getAnswerValue(f.antworten, name);
            if (!pa || pa === 'm') return;
            const w = prozentOf[name] || 1;
            denom += w;
            if (pa === ua) agreeW += w;
        });
        if (denom > 0) { sum += (agreeW / denom) * frageGewicht(i); count += frageGewicht(i); }
    });
    // null statt 0: Ohne verwertbare (j/n-)Antworten gibt es keinen "Mit Ihnen"-Wert.
    // Normalisiert wie das Partei-Ranking: Bei wenigen vergleichbaren Antworten wird der
    // Wert zur neutralen Baseline gedämpft, damit keine Koalition nur durch wenige
    // "j"-Antworten irreführend 100 % erreicht.
    if (count <= 0) return null;
    const minRankingAnswers = (config.thresholds && config.thresholds.minAnswersForRanking) || 5;
    return normalisiereUebereinstimmung(sum, count, minRankingAnswers);
}

function updateKoalitionen() {
    const type = document.getElementById('coalitionType').value;
    const minMatch = parseFloat(document.getElementById('minMatch').value);
    const partyFilter = document.getElementById('partyFilter').value;
    document.getElementById('minMatchLabel').textContent = minMatch + '%';

    const excludeCbs = document.querySelectorAll('#excludePartiesCheckboxes input:checked');
    const excludeParties = Array.from(excludeCbs).map(cb => cb.value);

    let koalitionen = berechneKoalitionen(type, excludeParties)
        .filter(k => k.uebereinstimmung >= minMatch);

    if (partyFilter) {
        koalitionen = koalitionen.filter(k => k.parteien.includes(partyFilter));
    }

    koalitionen.forEach(k => {
        k.benutzerMatch = berechneUserMatchFuerKoalition(k.parteien);
    });
    const anyUserAnswer = Object.values(userAnswers).some(a => a === 'j' || a === 'n');
    if (anyUserAnswer) koalitionen.sort((a, b) => (b.benutzerMatch ?? -1) - (a.benutzerMatch ?? -1));
    else koalitionen.sort((a, b) => b.uebereinstimmung - a.uebereinstimmung);

    const container = document.getElementById('coalitionResults');
    const statusEl = document.getElementById('coalitionStatus');
    const exclNames = ausschlussPaarNamen().join(', ');
    if (!koalitionen.length) {
        // Leere Ergebnisliste erklären: Wenn ein Partei-Filter gesetzt ist, kann die
        // Partei unter der Sperrklausel liegen (dann in keiner Koalition enthalten)
        // oder mit dem gewählten Typ/Mindestmatch keine Koalition bilden.
        let emptyHtml = exclNames
            ? `<p class="exclusion-hint">${t('excludedCoalitionsHint', 'Politisch ausgeschlossene Koalitionen ({gruppen}) werden nicht angezeigt.').replace('{gruppen}', exclNames)}</p>`
            : '';
        emptyHtml += `<div class="empty-state"><span class="empty-icon">🔍</span><p>${t('noCoalitions', 'Keine passenden Koalitionen gefunden.')}</p>`;
        if (partyFilter) {
            const p = (window.werteData.umfragewerte || []).find(x => x.partei === partyFilter);
            const below = p && p.prozent < config.thresholds.sperrklausel;
            emptyHtml += `<p class="empty-state-detail">${below
                ? t('noCoalitionsBelow', 'Die Partei „{partei}" liegt mit {prozent}% unter der Sperrklausel von {klausel}% und ist deshalb in keiner Koalition enthalten.').replace('{partei}', partyFilter).replace('{prozent}', p.prozent.toFixed(1)).replace('{klausel}', config.thresholds.sperrklausel)
                : t('noCoalitionsFilter', 'Für „{partei}" gibt es mit der aktuellen Auswahl (Typ, Mindestübereinstimmung) keine Koalition.').replace('{partei}', partyFilter)}</p>`;
        }
        emptyHtml += `<button type="button" class="btn-ghost empty-reset-btn" onclick="resetCoalitionFilters()">${t('resetFilters', 'Alle Filter zurücksetzen')}</button>`;
        emptyHtml += `</div>`;
        container.innerHTML = emptyHtml;
        if (statusEl) statusEl.textContent = t('noCoalitions', 'Keine passenden Koalitionen gefunden.');
        return;
    }

    if (statusEl) statusEl.textContent = koalitionen.length + ' ' + t('coalitionsFound', 'Koalitionen gefunden');

    let html = `<p class="result-count">${koalitionen.length} ${t('coalitionsFound', 'Koalitionen gefunden')}</p>`;
    if (exclNames) {
        html += `<p class="exclusion-hint">${t('excludedCoalitionsHint', 'Politisch ausgeschlossene Koalitionen ({gruppen}) werden nicht angezeigt.').replace('{gruppen}', exclNames)}</p>`;
    }
    const grouped = {};
    koalitionen.forEach(k => {
        if (!grouped[k.anzahl]) grouped[k.anzahl] = [];
        grouped[k.anzahl].push(k);
    });

    Object.entries(grouped).sort(([a], [b]) => a - b).forEach(([size, list]) => {
        html += `<h3 class="group-title">${size}-${t('partyCoalitions', 'Parteien-Koalitionen')}</h3>`;
        list.forEach(k => {
            const colors = k.parteien.map(p => getPartyColor(p));
            html += `
                <div class="coalition-card">
                    <div class="coalition-parties">
                        ${k.parteien.map((p, i) => `<span class="party-chip" style="--pcolor:${colors[i]}">${p}</span>`).join(' <span class="plus">+</span> ')}
                    </div>
                    <div class="coalition-meta">
                        <span class="meta-item"><strong>${k.prozente.toFixed(1)}%</strong> ${t('total', 'Gesamt')}</span>
                        <span class="meta-item"><strong>${k.uebereinstimmung.toFixed(1)}%</strong> ${t('internalMatch', 'Interne Übereinstimmung')}</span>
                        ${k.minPaar != null ? `<span class="meta-item"><strong>${k.minPaar.toFixed(1)}%</strong> ${t('minPair', 'Min. Paar')}</span>` : ''}
                        <span class="meta-item"><strong>${k.benutzerMatch != null ? k.benutzerMatch.toFixed(1) + '%' : '–'}</strong> ${t('withYou', 'Mit Ihnen')}</span>
                    </div>
                    <div class="coalition-bar">
                        <div class="coalition-bar-fill" style="width:${k.uebereinstimmung}%"></div>
                    </div>
                    <div class="coalition-bar user-match-bar">
                        <div class="coalition-bar-fill user-match-fill" style="width:${k.benutzerMatch != null ? k.benutzerMatch + '%' : '0'}"></div>
                    </div>
                </div>
            `;
        });
    });
    container.innerHTML = html;
}

// Setzt alle Filter des Koalitionen-Tabs zurück (aus dem Leerzustand bedienbar) –
// macht die Ausgangslage verständlich, ohne dass man die README lesen muss.
function resetCoalitionFilters() {
    const typeEl = document.getElementById('coalitionType');
    if (typeEl) typeEl.value = 'mehrheit';
    const minEl = document.getElementById('minMatch');
    if (minEl) {
        minEl.value = 0;
        minEl.dataset.touched = '1';
        const label = document.getElementById('minMatchLabel');
        if (label) label.textContent = minEl.value + '%';
    }
    const filterEl = document.getElementById('partyFilter');
    if (filterEl) filterEl.value = '';
    document.querySelectorAll('#excludePartiesCheckboxes input').forEach(cb => {
        cb.checked = false;
        const pill = cb.closest('.party-cb');
        if (pill) pill.classList.remove('checked');
    });
    updateKoalitionen();
    showNotification(t('filtersReset', 'Filter zurückgesetzt'), 'success');
}

// ===== Test =====
function resetTest() {
    cancelPendingAdvance();
    currentQuestion = 0;
    userAnswers = {};
    const qc = document.getElementById('questionContainer');
    if (qc) { qc.style.display = 'block'; qc.innerHTML = ''; }
    const tc = document.querySelector('.test-controls');
    if (tc) tc.style.display = 'flex';
    document.getElementById('testResults').innerHTML = '';
    const rh = document.getElementById('resumeHint');
    if (rh) rh.style.display = 'none';
}

function resetAnswers() {
    cancelPendingAdvance();
    if (!window.parteienData || !window.parteienData.fragen) return;
    userAnswers = {};
    importantQuestions = new Set();
    clearTestState();
    const qc = document.getElementById('questionContainer');
    if (qc) {
        qc.querySelectorAll('.question').forEach(q => {
            q.classList.remove('active');
            q.querySelectorAll('.q-btn').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-pressed', 'false');
            });
            q.querySelectorAll('.q-important').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
        });
        const first = qc.querySelector('.question[data-q="0"]');
        if (first) first.classList.add('active');
    }
    currentQuestion = 0;
    const rh = document.getElementById('resumeHint');
    if (rh) rh.style.display = 'none';
    updateNavButtons();
    showNotification(t('answersReset', 'Antworten zurückgesetzt'), 'success');
}

function initializeTest() {
    if (!window.parteienData || !window.parteienData.fragen) {
        const container = document.getElementById('questionContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state"><span class="empty-icon">🗳️</span><p>${t('noQuestions', 'Keine Fragen für diese Wahl verfügbar.')}</p></div>`;
        }
        const tc = document.querySelector('.test-controls');
        if (tc) tc.style.display = 'none';
        return;
    }
    const questions = window.parteienData.fragen;
    const saved = loadTestState();
    userAnswers = saved ? saved.answers : {};
    importantQuestions = new Set(saved ? saved.important : []);
    // Fortsetzen: gespeicherte Position wiederherstellen (statt immer bei Frage 1 zu starten)
    currentQuestion = saved && typeof saved.currentQuestion === 'number'
        ? Math.min(Math.max(0, saved.currentQuestion), questions.length - 1)
        : 0;
    // Hinweis, wenn eine frühere Sitzung fortgesetzt wird
    const resumeHint = document.getElementById('resumeHint');
    if (resumeHint) {
        const answeredCount = Object.values(userAnswers).filter(a => a && a !== 'm').length;
        if (saved && answeredCount > 0) {
            resumeHint.textContent = t('resumeHint', 'Fortgesetzt: {done} von {total} Fragen beantwortet')
                .replace('{done}', answeredCount).replace('{total}', questions.length);
            resumeHint.style.display = 'block';
        } else {
            resumeHint.style.display = 'none';
        }
    }
    const container = document.getElementById('questionContainer');
    if (!container) return;
    container.innerHTML = questions.map((f, i) => {
        // Build sources list for this question
        const partyEntries = Object.keys(f.antworten).filter(p => {
            const s = getAnswerSources(f.antworten, p);
            return s && (s.quelle || s.begruendung || s.zitat);
        });
        const sourcesHtml = partyEntries.length > 0 ? `
            <button type="button" class="q-sources-toggle" onclick="toggleSources(${i})">${t('sourcesClosed', 'Quellen & Begründungen ▾')}</button>
            <div class="q-sources" id="qSources${i}">
                ${partyEntries.map(p => {
                    const s = getAnswerSources(f.antworten, p);
                    const label = getAnswerValue(f.antworten, p);
                    const labelText = label === 'j' ? t('legendYes', 'Ja') : label === 'n' ? t('legendNo', 'Nein') : t('legendNeutral', 'Neutral');
                    return `<div class="qs-row">
                        <div class="qs-party" style="color:${getPartyColor(p)}">${escapeHtml(p)} <span class="qs-label cmp-${label}">${labelText}</span></div>
                        ${s.zitat ? `<div class="qs-zitat">„${escapeHtml(s.zitat)}”</div>` : ''}
                        ${s.begruendung ? `<div class="qs-begruendung">${escapeHtml(s.begruendung)}</div>` : ''}
                        ${s.quelle ? `<div class="qs-quelle">${t('sourceLabel', 'Quelle:')} ${escapeHtml(s.quelle)}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>` : '';
        const topic = determineTopic(f);
        const topicColor = (config.topics[topic] && config.topics[topic].color) || '#999';
        const answerSel = userAnswers[i] ? userAnswers[i] : '';
        const importantLabel = t('importantHint', 'Wichtige Frage (zählt doppelt)');
        return `
        <div class="question ${i === currentQuestion ? 'active' : ''}" data-q="${i}">
            <div class="q-top-row">
                <span class="q-topic" style="--topic-color:${topicColor}">${topic}</span>
                <span class="q-actions">
                    <button type="button" class="q-important ${importantQuestions.has(i) ? 'active' : ''}" data-q="${i}" onclick="toggleImportant(${i})" title="${importantLabel}" aria-label="${importantLabel}" aria-pressed="${importantQuestions.has(i) ? 'true' : 'false'}">★</button>
                    <span class="q-counter">${i + 1} / ${questions.length}</span>
                </span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${((i + 1) / questions.length) * 100}%"></div></div>
            <h3 class="q-text">${simpleQuestionText(f, 'frage')}</h3>
            <p class="q-desc">${simpleQuestionText(f, 'beschreibung')}</p>
            <div class="q-answers">
                <button class="q-btn q-btn-yes ${answerSel === 'j' ? 'selected' : ''}" data-a="j" onclick="selectAnswer(${i},'j')" aria-pressed="${answerSel === 'j' ? 'true' : 'false'}"><span class="q-btn-icon">✓</span>${t('answerYes', 'Stimme zu')}</button>
                <button class="q-btn q-btn-mid ${answerSel === 'm' ? 'selected' : ''}" data-a="m" onclick="selectAnswer(${i},'m')" aria-pressed="${answerSel === 'm' ? 'true' : 'false'}"><span class="q-btn-icon">◌</span>${t('answerNeutral', 'Neutral')}</button>
                <button class="q-btn q-btn-no ${answerSel === 'n' ? 'selected' : ''}" data-a="n" onclick="selectAnswer(${i},'n')" aria-pressed="${answerSel === 'n' ? 'true' : 'false'}"><span class="q-btn-icon">✗</span>${t('answerNo', 'Stimme nicht zu')}</button>
            </div>
            ${sourcesHtml}
        </div>`;
    }).join('');
    updateNavButtons();
    document.getElementById('testResults').innerHTML = '';
    // Mobile-Fix: Beim Start/Fortsetzen die Antwort-Buttons sichtbar machen
    // (block:'nearest' scrollt nur, wenn die Buttons außerhalb des Viewports sind).
    scrollQuestionButtonsIntoView();
}

function cancelPendingAdvance() {
    if (pendingAdvanceTimer) { clearTimeout(pendingAdvanceTimer); pendingAdvanceTimer = null; }
}

function selectAnswer(idx, answer) {
    if (!window.parteienData || !window.parteienData.fragen) return;
    if (userAnswers[idx] === answer) return;
    userAnswers[idx] = answer;
    document.querySelectorAll(`.question[data-q="${idx}"] .q-btn`).forEach(b => {
        const selected = b.dataset.a === answer;
        b.classList.toggle('selected', selected);
        b.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    saveTestState();
    cancelPendingAdvance();
    pendingAdvanceTimer = setTimeout(() => {
        pendingAdvanceTimer = null;
        if (idx === window.parteienData.fragen.length - 1) {
            showTestResults();
        } else {
            showNextQuestion();
        }
    }, idx === window.parteienData.fragen.length - 1 ? 400 : 300);
}

function skipQuestion() {
    cancelPendingAdvance();
    if (currentQuestion === window.parteienData.fragen.length - 1) {
        showTestResults();
        return;
    }
    showNextQuestion();
}

function toggleSources(idx) {
    const el = document.getElementById('qSources' + idx);
    const btn = el && el.previousElementSibling;
    if (!el) return;
    el.classList.toggle('open');
    if (btn) btn.textContent = el.classList.contains('open') ? t('sourcesOpen', 'Quellen & Begründungen ▴') : t('sourcesClosed', 'Quellen & Begründungen ▾');
}

function showNextQuestion() {
    cancelPendingAdvance();
    const questions = document.querySelectorAll('#questionContainer .question');
    if (currentQuestion < questions.length - 1) {
        questions[currentQuestion].classList.remove('active');
        currentQuestion++;
        questions[currentQuestion].classList.add('active');
        updateNavButtons();
        saveTestState();
        scrollQuestionButtonsIntoView();
    }
}

function showPreviousQuestion() {
    cancelPendingAdvance();
    const questions = document.querySelectorAll('#questionContainer .question');
    if (currentQuestion > 0) {
        questions[currentQuestion].classList.remove('active');
        currentQuestion--;
        questions[currentQuestion].classList.add('active');
        updateNavButtons();
        saveTestState();
        scrollQuestionButtonsIntoView();
    }
}

// Mobile-Fix (Issue #21): Fragen haben unterschiedliche Höhen – nach dem
// Auto-Weiter können die Antwort-Buttons der nächsten Frage unterhalb des
// sichtbaren Bereichs liegen ("Buttons registrieren nicht" / wirken tot).
// Die Buttons der aktiven Frage werden deshalb in den sichtbaren Bereich gerollt.
// block:'nearest' scrollt nur minimal (bzw. gar nicht, wenn bereits sichtbar).
function scrollQuestionButtonsIntoView() {
    const answers = document.querySelector('#questionContainer .question.active .q-answers');
    if (answers && typeof answers.scrollIntoView === 'function') {
        try {
            answers.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_) { /* ältere Browser */ }
    }
}

function updateNavButtons() {
    const len = window.parteienData ? window.parteienData.fragen.length : 0;
    document.getElementById('prevQuestion').disabled = currentQuestion === 0;
    document.getElementById('nextQuestion').style.display = currentQuestion === len - 1 ? 'none' : 'block';
    document.getElementById('showResults').style.display = currentQuestion === len - 1 ? 'block' : 'none';
}

function berechneUserMatchNachThema(partei) {
    const topics = {};
    if (!window.parteienData || !window.parteienData.fragen) return topics;
    window.parteienData.fragen.forEach((f, i) => {
        const ua = userAnswers[i];
        if (!ua || ua === 'm') return;
        const pa = getAnswerValue(f.antworten, partei);
        if (!pa || pa === 'm') return;
        const topic = determineTopic(f);
        if (!topics[topic]) topics[topic] = { match: 0, total: 0 };
        const w = frageGewicht(i);
        topics[topic].total += w;
        if (ua === pa) topics[topic].match += w;
    });
    const result = {};
    Object.entries(topics).forEach(([t, d]) => {
        result[t] = d.total > 0 ? (d.match / d.total) * 100 : 0;
    });
    return result;
}

// Normalisiert die Übereinstimmung bei wenigen vergleichbaren Antworten: Solange die
// Zahl der vergleichbaren (j/n-)Antworten unter der Mindestzahl für ein belastbares
// Ranking liegt, wird der Wert zur neutralen Baseline (50 %) hin gedämpft. So erreicht
// keine Partei nur durch eine Handvoll „j"-Antworten irreführende 100 %. Ab der
// Mindestzahl entspricht das Ergebnis wieder exakt der errechneten Quote.
function normalisiereUebereinstimmung(agreed, total, minAnswers) {
    if (total <= 0) return null;
    const min = Math.max(1, minAnswers || 1);
    const deficit = Math.max(0, min - total);
    return ((agreed + 0.5 * deficit) / (total + deficit)) * 100;
}

function togglePartyDetail(partei) {
    const el = document.getElementById('trDetail-' + partei);
    if (!el) return;
    if (el.style.display !== 'none') { el.style.display = 'none'; return; }
    if (el.innerHTML) { el.style.display = 'block'; return; }
    let html = `<div class="tr-detail-table"><table class="cmp-table"><tr><th>${t('questionCol', 'Frage')}</th><th>${t('youCol', 'Sie')}</th><th>${partei}</th><th></th></tr>`;
    window.parteienData.fragen.forEach((f, i) => {
        const ua = userAnswers[i];
        const pa = getAnswerValue(f.antworten, partei);
        const uaLbl = ua === 'j' ? t('legendYes', 'Ja') : ua === 'n' ? t('legendNo', 'Nein') : '—';
        const paLbl = pa === 'j' ? t('legendYes', 'Ja') : pa === 'n' ? t('legendNo', 'Nein') : '—';
        const match = ua && ua !== 'm' && pa && pa !== 'm' ? (ua === pa ? '✓' : '✗') : '—';
        const mClass = match === '✓' ? 'cmp-match-y' : match === '✗' ? 'cmp-match-n' : '';
        html += `<tr>
            <td class="cmp-q">${simpleQuestionText(f, 'frage')}</td>
            <td class="cmp-a cmp-${ua || 'm'}">${uaLbl}</td>
            <td class="cmp-a cmp-${pa || 'm'}">${paLbl}</td>
            <td class="${mClass}" style="text-align:center;font-size:1.2rem;font-weight:700">${match}</td>
        </tr>`;
    });
    html += '</table><div class="legend"><span class="legend-j">✓ ' + t('legendAgree', 'Zustimmung') + '</span><span class="legend-n">✗ ' + t('legendDisagree', 'Ablehnung') + '</span><span class="legend-m">— ' + t('legendNotComparable', 'Nicht vergleichbar') + '</span></div></div>';
    el.innerHTML = html;
    el.style.display = 'block';
}

function initTestResultPieChart(results) {
    const el = document.getElementById('testResultPieChart');
    if (!el) return;
    if (typeof echarts === 'undefined') {
        showChartPlaceholder('testResultPieChart', t('chartLoadError', 'Diagramme konnten nicht geladen werden (ECharts nicht erreichbar).'));
        return;
    }
    if (chartInstances['testResultPieChart']) {
        chartInstances['testResultPieChart'].dispose();
        delete chartInstances['testResultPieChart'];
    }
    const chart = echarts.init(el);
    chartInstances['testResultPieChart'] = chart;
    chart.setOption(Object.assign(echartsTheme(), {
        tooltip: { trigger: 'item', formatter: p => `${p.name}: <strong>${p.value.toFixed(1)}%</strong>` },
        series: [{
            type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: cssVar('--surface', '#fff'), borderWidth: 2 },
            label: { show: true, formatter: p => `${p.name}\n${p.value.toFixed(1)}%`, fontSize: 11, color: cssVar('--on-surface') },
            labelLine: { length: 8, length2: 10 },
            data: results.map(r => ({
                value: r.match != null ? r.match : 0, name: r.partei,
                itemStyle: { color: getPartyColor(r.partei) }
            })),
            animationDuration: 800
        }]
    }), true);
}

function showTestResults() {
    cancelPendingAdvance();
    const container = document.getElementById('testResults');
    if (!window.werteData || !window.werteData.umfragewerte || !config) return;

    // Hide question area, show results
    document.getElementById('questionContainer').style.display = 'none';
    const controls = document.querySelector('.test-controls');
    if (controls) controls.style.display = 'none';

    // Include all parties that answer questions (not just those above the threshold)
    const hasFragen = window.parteienData && window.parteienData.fragen && window.parteienData.fragen.length;
    // Mindestzahl vergleichbarer (j/n-)Antworten, ab der ein Ranking belastbar ist
    const minRankingAnswers = (config.thresholds && config.thresholds.minAnswersForRanking) || 5;
    const parties = window.werteData.umfragewerte.filter(p => {
        if (p.partei === 'Andere') return false;
        if (hasFragen) {
            return window.parteienData.fragen.some(f => f.antworten && f.antworten[p.partei] != null);
        }
        return p.prozent >= config.thresholds.sperrklausel;
    });
    const results = parties.map(p => {
        let agreed = 0, total = 0, partyAnswered = 0;
        if (window.parteienData && window.parteienData.fragen) {
            window.parteienData.fragen.forEach((f, i) => {
                const ua = userAnswers[i];
                const pa = getAnswerValue(f.antworten, p.partei);
                if (pa && pa !== 'm') partyAnswered++;
                if (!ua || ua === 'm') return;
                if (!pa || pa === 'm') return;
                const w = frageGewicht(i);
                total += w;
                if (ua === pa) agreed += w;
            });
        }
        // match = null, wenn es keine vergleichbaren (j/n-)Antworten gibt –
        // dann als "–" anzeigen statt irreführender 0 %.
        return {
            partei: p.partei,
            match: total > 0 ? normalisiereUebereinstimmung(agreed, total, minRankingAnswers) : null,
            topicMatches: berechneUserMatchNachThema(p.partei),
            agreed,
            total,
            partyAnswered
        };
    }).sort((a, b) => (b.match ?? -1) - (a.match ?? -1));

    if (!results.length) {
        showNotification(t('noResults', 'Keine Partei über der Sperrklausel.'), 'error');
        backToTest();
        return;
    }
    lastTestResults = results;

    const electionName = getActiveElectionName();
    const totalAnswered = Object.values(userAnswers).filter(a => a !== undefined && a !== null).length;
    const neutralCount = Object.values(userAnswers).filter(a => a === 'm').length;
    const usableAnswered = totalAnswered - neutralCount;
    const totalQuestions = window.parteienData ? window.parteienData.fragen.length : 0;

    let html = `<div class="test-results-header"><h3>${t('yourMatchTitle', 'Ihre Übereinstimmung mit den Parteien')}</h3>`;
    if (electionName) html += `<p class="election-label">${t('election', 'Wahl:')} ${electionName}</p>`;
    html += `</div>`;

    html += `<div class="tr-summary">
        <div class="tr-stat">
            <span class="tr-stat-val" style="color:${getPartyColor(results[0].partei)}">${results[0].match != null ? results[0].match.toFixed(1) + '%' : '–'}</span>
            <span class="tr-stat-lbl">${t('bestMatch', 'Beste Übereinstimmung')}</span>
            <span class="tr-stat-sub" style="color:${getPartyColor(results[0].partei)}">${results[0].partei}</span>
        </div>
        <div class="tr-stat">
            <span class="tr-stat-val">${totalAnswered}/${totalQuestions}</span>
            <span class="tr-stat-lbl">${t('questionsAnswered', 'Fragen beantwortet')}</span>
        </div>
        <div class="tr-stat">
            <span class="tr-stat-val">${results.length}</span>
            <span class="tr-stat-lbl">${t('partiesCompared', 'Parteien verglichen')}</span>
        </div>
    </div>`;

    // Hinweis: Neutrale Antworten fließen nicht in die Übereinstimmung ein
    if (neutralCount > 0) {
        html += `<p class="neutral-hint">${t('neutralHint', 'Neutrale Antworten ({n}) fließen nicht in die Übereinstimmung ein.').replace('{n}', neutralCount)}</p>`;
    }

    // Hinweis: dünne Nutzer-Antwortbasis. Unterhalb der Mindestzahl vergleichbarer
    // (j/n-)Antworten ist das Ranking nur eine grobe Einschätzung.
    if (usableAnswered < minRankingAnswers) {
        html += `<p class="neutral-hint tr-user-few-hint">${t('fewUserHint',
            'Sie haben nur {n} von {total} Fragen mit Ja/Nein beantwortet. Die Reihenfolge unten ist nur eine grobe Einschätzung – erst ab mindestens {min} beantworteten Fragen wird das Ranking belastbar.')
            .replace('{n}', usableAnswered).replace('{total}', totalQuestions).replace('{min}', minRankingAnswers)}</p>`;
    }

    // Pie chart – nur anzeigen, wenn es überhaupt verwertbare Antworten gibt
    if (usableAnswered > 0) {
        html += `<div class="tr-pie-section">
            <h3>${t('matchOverview', 'Übereinstimmung im Überblick')}</h3>
            <div id="testResultPieChart" style="height:260px;width:100%"></div>
        </div>`;
    }

    // Best coalition: majority > 50%, max size, min internal agreement, user match.
    // Nur anzeigen, wenn der Nutzer tatsächlich Fragen beantwortet hat – sonst ist der
    // "Mit Ihnen"-Wert (0 %) irreführend. Die Ausschluss-Checkboxen des Koalitionen-Tabs
    // werden berücksichtigt, damit "Beste Koalition" und Koalitionen-Tab konsistent sind.
    const anyUserAnswer = Object.values(userAnswers).some(a => a === 'j' || a === 'n');
    if (anyUserAnswer) {
        const excludeCbs = document.querySelectorAll('#excludePartiesCheckboxes input:checked');
        const excludeParties = Array.from(excludeCbs).map(cb => cb.value);
        const allKoal = berechneKoalitionen('beide', excludeParties);
        allKoal.forEach(k => { k.benutzerMatch = berechneUserMatchFuerKoalition(k.parteien); });
        const maxSize = (config.thresholds && config.thresholds.maxCoalitionSize) || 4;
        const minCoalMatch = (config.thresholds && config.thresholds.minMatchForCoalition) || 0;
        const best = allKoal
            .filter(k => k.anzahl <= maxSize && k.prozente > 50 && k.uebereinstimmung >= minCoalMatch)
            .sort((a, b) => (b.benutzerMatch ?? -1) - (a.benutzerMatch ?? -1))[0] || null;
        if (best) {
        const colors = best.parteien.map(p => getPartyColor(p));
        html += `<div class="tr-best-section">
            <h3>${t('bestCoalitionForYou', 'Beste Koalition für Sie')}</h3>
            <div class="coalition-card">
                <div class="coalition-parties">
                    ${best.parteien.map((p, i) => `<span class="party-chip" style="--pcolor:${colors[i]}">${p}</span>`).join(' <span class="plus">+</span> ')}
                </div>
                <div class="coalition-meta">
                    <span class="meta-item"><strong>${best.prozente.toFixed(1)}%</strong> ${t('total', 'Gesamt')}</span>
                    <span class="meta-item"><strong>${best.uebereinstimmung.toFixed(1)}%</strong> ${t('internalMatch', 'Interne Übereinstimmung')}</span>
                    ${best.minPaar != null ? `<span class="meta-item"><strong>${best.minPaar.toFixed(1)}%</strong> ${t('minPair', 'Min. Paar')}</span>` : ''}
                    <span class="meta-item"><strong>${best.benutzerMatch != null ? best.benutzerMatch.toFixed(1) + '%' : '–'}</strong> ${t('withYou', 'Mit Ihnen')}</span>
                </div>
                <div class="coalition-bar"><div class="coalition-bar-fill" style="width:${best.uebereinstimmung}%"></div></div>
            </div>
        </div>`;
        }
    }

    // Party cards
    html += `<div class="tr-cards">`;
    results.forEach(r => {
        const color = getPartyColor(r.partei);
        const topTopics = Object.entries(r.topicMatches)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
        let topicsHtml = topTopics.length ? `<div class="tr-topics">` : '';
        topTopics.forEach(([topic, pct]) => {
            topicsHtml += `<div class="tr-topic-row">
                <span class="tr-topic-label">${topic}</span>
                <div class="tr-topic-bar-wrap">
                    <div class="tr-topic-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <span class="tr-topic-pct">${pct.toFixed(0)}%</span>
            </div>`;
        });
        if (topTopics.length) topicsHtml += `</div>`;

        const fewAnswers = r.total > 0 && r.total < minRankingAnswers
            ? `<div class="tr-few-answers">${t('fewUserCardHint', 'Nur {n} Ihrer Antworten sind mit dieser Partei vergleichbar – der Wert ist daher nur eine grobe Einschätzung').replace('{n}', r.total)}</div>`
            : r.partyAnswered < totalQuestions
                ? `<div class="tr-few-answers">${t('fewAnswersHint', 'Nur {n} von {total} Fragen beantwortet').replace('{n}', r.partyAnswered).replace('{total}', totalQuestions)}</div>`
                : '';
        html += `
            <div class="tr-card">
                <div class="tr-card-top">
                    <span class="tr-party-name" style="color:${color}">${r.partei}</span>
                    <span class="tr-match-big" style="color:${color}">${r.match != null ? r.match.toFixed(1) + '%' : '–'}</span>
                </div>
                <div class="match-bar-wrap">
                    <div class="match-bar-fill" style="width:${r.match != null ? r.match : 0}%;background:${color}"></div>
                </div>
                <div class="tr-card-agreed">${r.total > 0 ? `${r.agreed} ${t('agreedOf', 'von')} ${r.total} ${t('agreedQuestions', 'Fragen zugestimmt')}` : t('noComparableAnswers', 'Keine vergleichbaren Antworten (nur neutral beantwortet)')}</div>
                ${fewAnswers}
                ${topicsHtml}
                <button class="tr-detail-btn" onclick="togglePartyDetail('${escapeHtmlAttr(r.partei)}')">${t('detailToggle', 'Fragen-Vergleich ▾')}</button>
                <div class="tr-detail" id="trDetail-${r.partei}" style="display:none"></div>
            </div>`;
    });
    html += `</div>`;

    // Restart button
    html += `<div style="text-align:center;margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="tr-back-btn" onclick="backToTest()">${t('changeAnswers', 'Antworten ändern')}</button>
        <button class="tr-restart-btn" onclick="resetTestAndRestart()">${t('restartTest', 'Test wiederholen')}</button>
    </div>`;

    // Taktik-Modus (Szenario-Simulator) unterhalb der Ergebnisse.
    // Ohne eine einzige verwertbare (j/n-)Antwort wäre "Deine Top-Partei" /
    // "Deine Wunschkoalition" nur die stabile `werte.json`-Reihenfolge
    // (irreführend, btw2029: AfD) – den Abschnitt daher weglassen.
    if (usableAnswered > 0) {
        html += tacticalSectionHTML();
    }

    container.innerHTML = html;
    bindTacticalEvents();
    if (usableAnswered > 0) {
        initTestResultPieChart(results);
        // Historie nur bei mindestens einer verwertbaren (j/n-)Antwort speichern,
        // sonst landet ein übersprungener Test als "0,0 %"-Eintrag in der Historie.
        saveTestResult(results);
    }
}

// ===== Taktisches Wählen (Szenario-Simulator) =====
function tacticalThreshold() {
    return (config && config.thresholds && config.thresholds.sperrklausel) || 5;
}

function tacticalMatchGapThreshold() {
    return (config && config.thresholds && config.thresholds.minMatchGapForTop) || 1;
}

function tacticalTopGap(sorted) {
    if (sorted.length < 2) return Infinity;
    const a = sorted[0].match, b = sorted[1].match;
    if (a == null || b == null) return -Infinity;
    return a - b;
}

function calculateTacticalPolls() {
    if (tacticalPollsKey === activeElectionId && Object.keys(tacticalPolls).length) return tacticalPolls;
    const map = {};
    // Reale Parteien der aktiven Wahl: Parteien aus den Umfragewerten plus Parteien,
    // die in den Fragebogen-Antworten auftauchen.
    const realParties = new Set();
    (window.werteData && window.werteData.umfragewerte || []).forEach(p => {
        if (p.partei !== 'Andere') {
            map[p.partei] = p.prozent;
            realParties.add(p.partei);
        }
    });
    // Reale Parteien zusätzlich aus den Fragebogen-Antworten ermitteln, damit
    // Umfrage-Mock-Werte nur als Fallback für in der Wahl antretende Parteien
    // dienen – nicht-antretende Parteien (z. B. `CDU` bei Wahlen mit `CDU/CSU`)
    // dürfen nie als Geisterpartei in Slider und Analyse einsickern.
    if (window.parteienData && window.parteienData.fragen) {
        window.parteienData.fragen.forEach(f => {
            if (f.antworten) Object.keys(f.antworten).forEach(p => realParties.add(p));
        });
    }
    Object.keys(TACTICAL_MOCK_POLLS).forEach(p => {
        if (realParties.has(p) && map[p] === undefined) map[p] = TACTICAL_MOCK_POLLS[p];
    });
    tacticalPolls = map;
    tacticalPollsKey = activeElectionId;
    return tacticalPolls;
}

function tacticalSlidersHTML() {
    const polls = calculateTacticalPolls();
    const parties = Object.keys(polls)
        .filter(p => p !== 'Andere')
        .filter(p => (polls[p] || 0) < 8)
        .sort((a, b) => polls[a] - polls[b]);
    if (!parties.length) return '';
    return `
        <div class="tactical-sliders">
            <h4>Taktische Simulation: Umfragewerte anpassen</h4>
            ${parties.map(p => `
            <div class="tactical-slider-row">
                <span class="tactical-slider-name" style="color:${getPartyColor(p)}">${escapeHtml(p)}</span>
                <input type="range" min="0" max="12" step="0.1" value="${polls[p]}" data-party="${escapeHtmlAttr(p)}" aria-label="Umfragewert ${escapeHtmlAttr(p)} adjustieren">
                <span class="tactical-slider-val">${(polls[p] || 0).toFixed(1)}%</span>
            </div>`).join('')}
            <p class="tactical-slider-note">Verschiebe die Regler, um zu sehen, wie sich Taktik-Warnungen und Koalitionsmehrheiten verändern.</p>
        </div>`;
}

function tacticalSectionHTML() {
    return `
        <div class="tactical-section">
            <div class="tactical-section-head">
                <h3>Taktisches Wählen</h3>
                <p class="tactical-intro">Simuliere deine Stimme: Welche Auswirkungen hätte ein taktisches Wahlverhalten auf dein Ergebnis?</p>
                <label class="tactical-toggle">
                    <input type="checkbox" id="tacticalToggle" ${tacticalEnabled ? 'checked' : ''}>
                    <span class="tactical-switch" aria-hidden="true"></span>
                    <span class="tactical-toggle-label">Taktik-Modus aktivieren</span>
                </label>
            </div>
            <div class="tactical-content" id="tacticalContent" ${tacticalEnabled ? '' : 'hidden'}>
                <div class="tactical-warnings" id="tacticalWarnings"></div>
                ${tacticalSlidersHTML()}
            </div>
        </div>`;
}

function calculateTacticalVoting(results) {
    const threshold = tacticalThreshold();
    const minGap = tacticalMatchGapThreshold();
    const polls = calculateTacticalPolls();
    const pollOf = p => (polls[p] || 0);
    const sorted = results.slice().sort((a, b) => (b.match ?? -1) - (a.match ?? -1));
    const warnings = [];
    const info = { coalition: null, share: 0, eligibleSum: 0, majorityPossible: false, clearTop: false };

    if (sorted.length === 0) return { warnings, info };

    // Übereinstimmungs-Abstände statt reiner Rangordnung (tactical-voting.md §5):
    // „Deine Top-Partei" und „Deine Wunschkoalition" werden nur bei einem klaren
    // Präferenzabstand abgeleitet. Nahe Gleichstände (z. B. 60,1 % vs. 60,0 %)
    // erzeugen dadurch keine irreführenden Warnungen wie klare Präferenzen
    // (z. B. 95 % vs. 20 %).
    const clearTop = tacticalTopGap(sorted) >= minGap;
    info.clearTop = clearTop;

    // 1) Verschenkte Stimme (Wasted Vote Warning)
    const top1 = sorted[0].partei;
    if (clearTop && pollOf(top1) < threshold) {
        const alt = sorted.find(r => r.partei !== top1 && (pollOf(r.partei) || 0) >= threshold);
        if (alt) {
            warnings.push({
                type: 'wasted',
                text: `Deine Top-Partei «${top1}» scheitert aktuell an der ${threshold}%-Hürde (${pollOf(top1).toFixed(1)}%). Strategische Alternative: ${alt.partei} (${pollOf(alt.partei).toFixed(1)}%).`
            });
        }
    }

    // 2) Leihstimme zur Koalitionsabsicherung (Doku Szenario B)
    //    Kriterium ist die Nähe des kleineren Partners zur Wahl-Sperrklausel
    //    (statt `share > 50` als einziges Kriterium): Der kleinere Partner liegt
    //    im aus der Sperrklausel abgeleiteten „schwankt"-Band nahe der Hürde und
    //    die Wunschkoalition hätte (gegebenenfalls mit einem weiteren Partner)
    //    eine parlamentarische Mehrheit.
    if (sorted.length >= 2 && clearTop) {
        const a = sorted[0].partei;
        const b = sorted[1].partei;

        // Politisch ausgeschlossene Wunschkoalitionen (z. B. AfD+GRÜNE) werden hier
        // nicht als konkrete Koalitionsempfehlung ausgegeben – konsistent mit
        // `istKoalitionAusgeschlossen()` in `berechneKoalitionen()` –, sondern nur
        // als textlicher Tipp statt einer Leihstimmen-Empfehlung.
        if (istKoalitionAusgeschlossen([a, b])) {
            warnings.push({
                type: 'excluded',
                text: `Deine Wunschkoalition aus ${a} und ${b} ist laut politischer Einschätzung keine zulässige Koalition (diese Parteien schließen sich gegenseitig als Regierungspartner aus). Eine taktische Überlegung wäre daher nicht sinnvoll – wähle die Partei, die deinen Überzeugungen entspricht.`
            });
            return { warnings, info };
        }

        const pa = pollOf(a), pb = pollOf(b);
        const eligible = sorted.filter(r => pollOf(r.partei) >= threshold);
        const eligibleSum = eligible.reduce((s, p) => s + pollOf(p.partei), 0);
        const share = eligibleSum > 0 ? (((pa + pb) / eligibleSum) * 100) : 0;
        info.coalition = `${a} + ${b}`;
        info.share = share;
        info.eligibleSum = eligibleSum;

        const smaller = pa <= pb ? a : b;
        const smallerPoll = Math.min(pa, pb);
        const biggerPoll = Math.max(pa, pb);
        // „schwankt"-Band relativ zur Wahl-Sperrklausel: [threshold-1, threshold+1)
        // (bei Sperrklausel 5 % ↔ 4–6 %, bei z. B. 3 % ↔ 2–4 %) statt hartkodiert 4–6.
        const naheHuerde = smallerPoll >= threshold - 1 && smallerPoll < threshold + 1;
        const partnerSicher = biggerPoll >= threshold;
        // Mehrheitsfähig: Paar hält selbst > 50 % der über der Sperrklausel
        // liegenden Stimmen ODER ist Teil einer politisch zulässigen Mehrheits-
        // koalition. Für die Warnung zählt der ausschluss-bewusste Check, damit
        // nie eine ausgeschlossene Koalition (z. B. AfD+GRÜNE) empfohlen wird.
        const mehrheitSicher = istKoalitionsMehrheitSicher(a, b, polls, threshold);
        info.majorityPossible = share > 50 || mehrheitSicher;
        if (naheHuerde && partnerSicher && mehrheitSicher) {
            warnings.push({
                type: 'loan',
                text: `Achtung, deine Wunschkoalition aus ${a} und ${b} ist in Gefahr. Überlege, ${smaller} zu wählen, um sie über die ${threshold}%-Hürde zu retten.`
            });
        }
    }
    return { warnings, info };
}

// Hätte die Wunschkoalition {a, b} eine parlamentarische Mehrheit? Ja, wenn sie
// > 50 % der simulierten Umfragewerte erreicht – direkt oder zusammen mit weiteren
// Parteien über der Sperrklausel (max. maxCoalitionSize), ohne politisch
// ausgeschlossene Koalitionen zu bilden.
function istKoalitionsMehrheitSicher(a, b, polls, threshold) {
    const maxSize = (config.thresholds && config.thresholds.maxCoalitionSize) || 4;
    if (!istKoalitionAusgeschlossen([a, b]) && (polls[a] || 0) + (polls[b] || 0) > 50) return true;
    const rest = Object.keys(polls).filter(p =>
        p !== 'Andere' && p !== a && p !== b && (polls[p] || 0) >= threshold);
    const n = rest.length;
    for (let mask = 1; mask < (1 << n); mask++) {
        const add = rest.filter((_, i) => mask & (1 << i));
        if (add.length + 2 > maxSize) continue;
        const combo = [a, b, ...add];
        const sum = combo.reduce((s, p) => s + (polls[p] || 0), 0);
        if (sum > 50 && !istKoalitionAusgeschlossen(combo)) return true;
    }
    return false;
}

function updateTacticalWarnings() {
    const box = document.getElementById('tacticalWarnings');
    if (!box || !lastTestResults) return;
    const { warnings, info } = calculateTacticalVoting(lastTestResults);
    let html = '';
    if (info.coalition) {
        const okMaj = !!info.majorityPossible;
        html += `<div class="tactical-majority ${okMaj ? 'ok' : 'no'}">
            <strong>Koalitionsmehrheit:</strong> ${escapeHtml(info.coalition)} erreicht ${info.share.toFixed(0)}% der Stimmen der Parteien über ${tacticalThreshold()}% — ${okMaj ? 'Mehrheit möglich' : 'keine Mehrheit'}
        </div>`;
    }
    if (!warnings.length && info.clearTop === true) {
        html += `<div class="tactical-ok-hint"><span class="tactical-warning-tag">Alles klar</span><span>Keine strategische Warnung aktuell – Deine Top-Partei liegt über ${tacticalThreshold()}% und Deine Wunschkoalition steht im simulierten Szenario stabil.</span></div>`;
    } else if (!warnings.length && info.clearTop === false) {
        html += `<div class="tactical-ok-hint"><span class="tactical-warning-tag">Hinweis</span><span>Deine Top-Parteien liegen zu dicht beieinander (Mindestabstand ${tacticalMatchGapThreshold().toFixed(1)} Prozentpunkt(e) nicht erreicht), um eine klare Top-Partei oder Wunschkoalition abzuleiten.</span></div>`;
    }
    warnings.forEach(w => {
        html += `<div class="tactical-warning ${w.type === 'loan' ? 'loan' : ''}">
            <span class="tactical-warning-tag">${w.type === 'loan' ? 'Achtung' : 'Hinweis'}</span>
            <span>${escapeHtml(w.text)}</span>
        </div>`;
    });
    box.innerHTML = html;
}

function tacticalSliderRowClass(input) {
    const val = parseFloat(input.value);
    const party = input.dataset.party;
    tacticalPolls[party] = val;
    const row = input.closest('.tactical-slider-row');
    if (row) {
        const lbl = row.querySelector('.tactical-slider-val');
        if (lbl) lbl.textContent = val.toFixed(1) + '%';
    }
    updateTacticalWarnings();
}

function bindTacticalEvents() {
    const toggle = document.getElementById('tacticalToggle');
    const content = document.getElementById('tacticalContent');
    if (!toggle || !content) return;
    toggle.addEventListener('change', () => {
        tacticalEnabled = toggle.checked;
        content.hidden = !toggle.checked;
        if (toggle.checked) updateTacticalWarnings();
    });
    document.querySelectorAll('#testResults input[type="range"][data-party]').forEach(slider => {
        slider.addEventListener('input', () => tacticalSliderRowClass(slider));
    });
    // Nach Re-Render (z.B. Einfache-Sprache-Toggle) Zustand erneut anwenden,
    // sonst blieben Warnungen trotz aktivem Taktik-Modus leer.
    if (tacticalEnabled) updateTacticalWarnings();
}

function resetTestAndRestart() {
    cancelPendingAdvance();
    const qc = document.getElementById('questionContainer');
    if (qc) qc.style.display = 'block';
    const tc = document.querySelector('.test-controls');
    if (tc) tc.style.display = 'flex';
    document.getElementById('testResults').innerHTML = '';
    lastTestResults = null;
    clearTestState();
    resetTest();
    initializeTest();
}

function backToTest() {
    cancelPendingAdvance();
    const qc = document.getElementById('questionContainer');
    if (qc) qc.style.display = 'block';
    const tc = document.querySelector('.test-controls');
    if (tc) tc.style.display = 'flex';
    document.getElementById('testResults').innerHTML = '';
    lastTestResults = null;
    const questions = document.querySelectorAll('#questionContainer .question');
    if (questions.length) {
        questions.forEach(q => q.classList.remove('active'));
        const q = document.querySelector(`#questionContainer .question[data-q="${currentQuestion}"]`);
        if (q) q.classList.add('active');
        updateNavButtons();
        scrollQuestionButtonsIntoView();
    }
}

function saveTestResult(results) {
    if (suppressHistorySave) return;
    const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
    history.push({
        date: new Date().toISOString(),
        electionId: getActiveElectionId(),
        answers: { ...userAnswers },
        results: results.slice(0, 5)
    });
    if (history.length > 50) history.splice(0, history.length - 50);
    localStorage.setItem('testHistory', JSON.stringify(history));
    showNotification(t('resultSaved', 'Ergebnis gespeichert!'), 'success');
}

function renderTestHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
    if (!history.length) {
        container.innerHTML = `<p class="history-empty">${t('historyEmpty', 'Noch keine gespeicherten Ergebnisse.')}</p>`;
        return;
    }
    container.innerHTML = [...history].reverse().map((h, revIdx) => {
        const idx = history.length - 1 - revIdx;
        const top = (h.results && h.results[0]) || null;
        const election = electionsList.find(e => e.id === h.electionId);
        const name = election ? election.name : (h.electionId || '?');
        const date = new Date(h.date).toLocaleString();
        return `
            <div class="history-item">
                <div class="history-item-main">
                    <span class="history-item-date">${date}</span>
                    <span class="history-item-election">${name}</span>
                    ${top ? `<span class="history-item-top" style="color:${getPartyColor(top.partei)}"><strong>${top.match != null ? top.match.toFixed(1) + '%' : '–'}</strong> ${top.partei}</span>` : ''}
                </div>
                <button class="history-item-delete" onclick="deleteTestHistoryEntry(${idx})" aria-label="${t('historyDelete', 'Eintrag löschen')}">✕</button>
            </div>`;
    }).join('');
}

function deleteTestHistoryEntry(idx) {
    const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
    if (idx < 0 || idx >= history.length) return;
    history.splice(idx, 1);
    localStorage.setItem('testHistory', JSON.stringify(history));
    renderTestHistory();
    // Chart nur zeichnen, wenn der Daten-Tab sichtbar ist (echarts.init auf
    // display:none-Containern erzeugt 0×0-Instanzen).
    const datenTab = document.getElementById('daten-content');
    if (datenTab && datenTab.classList.contains('active')) createTopicChart();
}

function clearTestHistory() {
    localStorage.removeItem('testHistory');
    renderTestHistory();
    const datenTab = document.getElementById('daten-content');
    if (datenTab && datenTab.classList.contains('active')) createTopicChart();
}

// ===== Daten & Charts =====
function cssVar(name, fallback = '') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function initChart(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (typeof echarts === 'undefined') {
        showChartPlaceholder(id, t('chartLoadError', 'Diagramme konnten nicht geladen werden (ECharts nicht erreichbar).'));
        return null;
    }
    const ph = document.getElementById(id + '-placeholder');
    if (ph) ph.remove();
    el.style.display = '';
    if (chartInstances[id]) { chartInstances[id].dispose(); delete chartInstances[id]; }
    const chart = echarts.init(el);
    chartInstances[id] = chart;
    return chart;
}

// Platzhalter anzeigen, ohne das Chart-<div> zu zerstören. Verhindert, dass
// initChart() (bzw. ein späterer Tab-Besuch) das Element nicht mehr findet.
function showChartPlaceholder(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    if (chartInstances[id]) { chartInstances[id].dispose(); delete chartInstances[id]; }
    el.style.display = 'none';
    let ph = document.getElementById(id + '-placeholder');
    if (!ph) {
        ph = document.createElement('div');
        ph.id = id + '-placeholder';
        ph.className = 'chart-placeholder';
        el.parentElement.appendChild(ph);
    }
    ph.textContent = text;
}

function initializeDaten() {
    createStatsSummary();
    createPartyOverviewChart();
    createSeatChart();
    createCoalitionPotentialChart();
    createPartyPositionsChart();
    createTopicChart();
    renderTestHistory();
}

function createStatsSummary() {
    const container = document.getElementById('statsSummary');
    if (!container || !window.werteData) return;
    const parties = window.werteData.umfragewerte || [];
    if (!parties.length) {
        container.innerHTML = `<div class="empty-state"><p>${t('noData', 'Keine Daten')}</p></div>`;
        return;
    }
    const above = parties.filter(p => p.prozent >= config.thresholds.sperrklausel);
    const strongest = parties.reduce((a, b) => a.prozent > b.prozent ? a : b);
    container.innerHTML = `
        <div class="stat-card"><div class="stat-val">${parties.length}</div><div class="stat-lbl">${t('partiesStat', 'Parteien')}</div></div>
        <div class="stat-card"><div class="stat-val">${above.length}</div><div class="stat-lbl">${t('aboveThreshold', 'Über')} ${config.thresholds.sperrklausel}%-${t('aboveThreshold2', 'Hürde')}</div></div>        <div class="stat-card"><div class="stat-val">${strongest.partei}</div><div class="stat-lbl">${t('strongest', 'Stärkste')} (${strongest.prozent.toFixed(1)}%)</div></div>
    `;
}

function echartsTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        backgroundColor: 'transparent',
        textStyle: { color: cssVar('--on-surface', '#1C1B1F') },
        tooltip: { backgroundColor: dark ? 'rgba(30,29,34,0.95)' : 'rgba(0,0,0,0.8)', borderColor: cssVar('--outline', '#CAC4D0') }
    };
}

function createPartyOverviewChart() {
    const parties = (window.werteData && window.werteData.umfragewerte || [])
        .filter(p => p.prozent >= 1).sort((a, b) => b.prozent - a.prozent);
    if (!parties.length) {
        showChartPlaceholder('partyOverviewChart', t('noData', 'Keine Daten'));
        return;
    }
    const chart = initChart('partyOverviewChart');
    if (!chart) return;
    const maxVal = Math.ceil(Math.max(...parties.map(p => p.prozent)) / 5) * 5;
    chart.setOption(Object.assign(echartsTheme(), {
        grid: { left: 100, right: 50, top: 10, bottom: 10 },
        xAxis: { type: 'value', max: maxVal, axisLabel: { formatter: '{value}%', color: cssVar('--on-surface-muted') }, splitLine: { lineStyle: { color: cssVar('--outline') + '40' } }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: 'category', data: parties.map(p => p.partei), axisLabel: { fontSize: 11, fontWeight: 500, color: v => getPartyColor(v) }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
        series: [{ type: 'bar', data: parties.map(p => ({ value: p.prozent, itemStyle: { color: getPartyColor(p.partei), borderRadius: [0, 4, 4, 0] } })), barMaxWidth: 28, label: { show: true, position: 'right', formatter: p => p.value.toFixed(1) + '%', color: cssVar('--on-surface-muted'), fontSize: 11 }, animationDuration: 800 }],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}: <strong>${p[0].value.toFixed(1)}%</strong>` }
    }), true);
}

function createSeatChart() {
    const parties = (window.werteData && window.werteData.umfragewerte) || [];
    const seats = berechneSitze(parties);
    if (!seats.length) {
        showChartPlaceholder('seatChart', t('noData', 'Keine Daten'));
        return;
    }
    const chart = initChart('seatChart');
    if (!chart) return;
    const total = seats.reduce((s, p) => s + p.sitze, 0);
    chart.setOption(Object.assign(echartsTheme(), {
        series: [{
            type: 'pie', radius: ['55%', '75%'], avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: cssVar('--surface', '#fff'), borderWidth: 2 },
            label: { show: true, position: 'outside', formatter: p => p.name.split(' (')[0], fontSize: 11, color: cssVar('--on-surface') },
            labelLine: { length: 8, length2: 10 },
            data: seats.map(p => ({ value: p.sitze, name: `${p.partei} (${p.sitze} ${t('seats', 'Sitze')})`, itemStyle: { color: getPartyColor(p.partei) } })),
            animationDuration: 1000
        }],
        tooltip: { trigger: 'item', formatter: p => `${p.name}<br/><strong>${p.value} ${t('seats', 'Sitze')} (${p.percent.toFixed(1)}%)</strong>` },
        graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: total + '\n' + t('seats', 'Sitze'), textAlign: 'center', fill: cssVar('--on-surface'), font: 'bold 28px system-ui, sans-serif', lineHeight: 34 }, z: 100 }]
    }), true);
}

function createCoalitionPotentialChart() {
    let koalitionen = (berechneKoalitionen('mehrheit') || []).slice()
        .sort((a, b) => b.uebereinstimmung - a.uebereinstimmung)
        .slice(0, 6);
    if (!koalitionen.length) {
        showChartPlaceholder('coalitionPotentialChart', t('noMajorityCoalitions', 'Keine Mehrheitskoalitionen'));
        return;
    }
    const chart = initChart('coalitionPotentialChart');
    if (!chart) return;
    chart.setOption(Object.assign(echartsTheme(), {
        grid: { left: 90, right: 60, top: 10, bottom: 10 },
        xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: cssVar('--on-surface-muted'), fontSize: 10 }, splitLine: { lineStyle: { color: cssVar('--outline') + '40' } }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: 'category', data: koalitionen.map(k => k.parteien.join(' + ')), axisLabel: { fontSize: 10, color: cssVar('--on-surface-muted') }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
        series: [{ type: 'bar', data: koalitionen.map(k => ({ value: k.uebereinstimmung, itemStyle: { color: getPartyColor(k.parteien[0]) + 'CC', borderRadius: [0, 3, 3, 0] } })), barMaxWidth: 22, label: { show: true, position: 'right', formatter: p => p.value.toFixed(1) + '%', color: cssVar('--on-surface-muted'), fontSize: 10 }, animationDuration: 700 }],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br/>${t('agreement', 'Übereinstimmung:')} <strong>${p[0].value.toFixed(1)}%</strong>` }
    }), true);
}

function createPartyPositionsChart() {
    const chart = initChart('partyPositionsChart');
    if (!chart || !window.parteienData) return;
    const parties = window.werteData.umfragewerte.filter(p => p.prozent >= config.thresholds.sperrklausel);
    const positions = {};
    parties.forEach(p => { positions[p.partei] = analyzePartyTopics(p.partei); });
    chart.setOption(Object.assign(echartsTheme(), {
        legend: { bottom: 0, data: parties.map(p => p.partei), textStyle: { color: cssVar('--on-surface'), fontSize: 11 }, icon: 'circle', itemWidth: 12 },
        radar: {
            indicator: Object.entries(config.topics).map(([k]) => ({ name: k, max: 100 })),
            center: ['50%', '45%'], radius: '60%',
            axisName: { color: cssVar('--on-surface'), fontSize: 11, fontWeight: 600 },
            splitArea: { areaStyle: { color: ['transparent', 'transparent'] } },
            axisLine: { lineStyle: { color: cssVar('--outline') + '40' } },
            splitLine: { lineStyle: { color: cssVar('--outline') + '40' } }
        },
        series: parties.map(p => ({
            name: p.partei, type: 'radar',
            data: [Object.values(positions[p.partei])],
            symbol: 'circle', symbolSize: 4, lineStyle: { width: 2 },
            areaStyle: { opacity: 0.08 },
            itemStyle: { color: getPartyColor(p.partei) },
            animationDuration: 800
        })),
        tooltip: { trigger: 'item', formatter: p => `${p.seriesName}: <strong>${p.value}%</strong>` }
    }), true);
}

function createTopicChart() {
    const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
    const electionId = getActiveElectionId();
    const latest = history.filter(h => !h.electionId || h.electionId === electionId).pop();
    if (!latest) {
        showChartPlaceholder('topicDistributionChart', t('topicChartEmpty', 'Test durchführen, um Ihre Themenverteilung zu sehen'));
        return;
    }
    const chart = initChart('topicDistributionChart');
    if (!chart) return;
    const topics = {};
    Object.entries(latest.answers || {}).forEach(([i, a]) => {
        if (!window.parteienData || !window.parteienData.fragen) return;
        const q = window.parteienData.fragen[i];
        if (!q) return;
        const topic = determineTopic(q);
        if (!topics[topic]) topics[topic] = [];
        topics[topic].push(a === 'j' ? 100 : a === 'n' ? 0 : 50);
    });
    const entries = Object.entries(topics).map(([k, v]) => [k, v.length ? v.reduce((a, b) => a + b) / v.length : 0]);
    chart.setOption(Object.assign(echartsTheme(), {
        grid: { left: 90, right: 60, top: 10, bottom: 10 },
        xAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: cssVar('--on-surface-muted'), fontSize: 10 }, splitLine: { lineStyle: { color: cssVar('--outline') + '40' } }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: 'category', data: entries.map(([k]) => k), axisLabel: { fontSize: 11, color: cssVar('--on-surface-muted') }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
        series: [{ type: 'bar', data: entries.map(([k, v]) => ({ value: v, itemStyle: { color: (config.topics[k] && config.topics[k].color) || config.chartColors.neutral, borderRadius: [0, 4, 4, 0] } })), barMaxWidth: 22, label: { show: true, position: 'right', formatter: p => p.value.toFixed(0) + '%', color: cssVar('--on-surface-muted'), fontSize: 11 }, animationDuration: 800 }],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br/><strong>${p[0].value.toFixed(0)}%</strong>` }
    }), true);
}

function analyzePartyTopics(partei) {
    const topics = {};
    Object.keys(config.topics).forEach(t => topics[t] = []);
    if (!window.parteienData || !window.parteienData.fragen) return Object.fromEntries(Object.keys(config.topics).map(t => [t, 0]));
    window.parteienData.fragen.forEach(f => {
        const topic = determineTopic(f);
        if (topics[topic]) {
            const a = getAnswerValue(f.antworten, partei);
            topics[topic].push(a === 'j' ? 100 : a === 'n' ? 0 : 50);
        }
    });
    const result = {};
    Object.entries(topics).forEach(([t, v]) => {
        result[t] = v.length ? v.reduce((a, b) => a + b) / v.length : 0;
    });
    return result;
}

function determineTopic(f) {
    if (f && typeof f === 'object') {
        if (f.thema && config.topics[f.thema]) return f.thema;
        f = f.frage || '';
    }
    for (const [topic, data] of Object.entries(config.topics)) {
        if (data.keywords.some(w => f.toLowerCase().includes(w.toLowerCase())))
            return topic;
    }
    return 'Sonstiges';
}

function getPartyColor(party) {
    return config.partyColors[party] || config.partyColors.default;
}

function getActiveElectionId() { return activeElectionId; }

function getActiveElectionName() {
    const e = electionsList.find(e => e.id === activeElectionId);
    return e ? e.name : '';
}

// ===== Comparison Table =====
function updatePartyComparison() {
    const checked = document.querySelectorAll('#comparePartiesCheckboxes input:checked');
    const parties = Array.from(checked).map(cb => cb.value);
    const container = document.getElementById('comparisonTable');
    if (!parties.length) {
        container.innerHTML = `<p style="color:var(--on-surface-muted)">${t('chooseParties', 'Wählen Sie Parteien zum Vergleichen aus.')}</p>`;
        return;
    }
    if (!window.parteienData || !window.parteienData.fragen) {
        container.innerHTML = `<p style="color:var(--on-surface-muted)">${t('noQuestions', 'Keine Fragen für diese Wahl verfügbar.')}</p>`;
        return;
    }
    let html = '<div class="cmp-wrap"><table class="cmp-table"><tr><th>' + t('questionCol', 'Frage') + '</th>';
    parties.forEach(p => html += `<th style="color:${getPartyColor(p)}">${escapeHtml(p)}</th>`);
    html += `<th>${t('sourcesColumn', 'Quelle / Begründung')}</th>`;
    html += '</tr>';
    window.parteienData.fragen.forEach((f, i) => {
        html += `<tr><td class="cmp-q">${escapeHtml(simpleQuestionText(f, 'frage'))}</td>`;
        parties.forEach(p => {
            const a = getAnswerValue(f.antworten, p);
            const label = a === 'j' ? t('legendYes', 'Ja') : a === 'n' ? t('legendNo', 'Nein') : t('legendNeutral', 'Neutral');
            html += `<td class="cmp-a cmp-${a || 'm'}">${label}</td>`;
        });
        // Sichtbare Quellen/Begründungen statt title-Tooltip (mobil erreichbar, README:13)
        const srcs = parties.map(p => {
            const s = getAnswerSources(f.antworten, p);
            if (!s || (!s.quelle && !s.begruendung && !s.zitat)) return null;
            const parts = [];
            if (s.begruendung) parts.push(escapeHtml(s.begruendung));
            if (s.zitat) parts.push(`„${escapeHtml(s.zitat)}”`);
            if (s.quelle) parts.push(escapeHtml(s.quelle));
            return `<div class="cmp-src"><span class="cmp-src-party" style="color:${getPartyColor(p)}">${escapeHtml(p)}:</span> ${parts.join(' – ')}</div>`;
        }).filter(Boolean);
        html += `<td class="cmp-srcs">${srcs.length ? srcs.join('') : ''}</td>`;
        html += '</tr>';
    });
    html += '</table></div>';
    html += '<div class="legend"><span class="legend-j">■ ' + t('legendYes', 'Ja') + '</span><span class="legend-n">■ ' + t('legendNo', 'Nein') + '</span><span class="legend-m">■ ' + t('legendNeutral', 'Neutral') + '</span></div>';
    container.innerHTML = html;
}

function berechneSitze(parteien) {
    const gesamt = (config.meta && config.meta.gesamtSitze)
        || (window.werteData && window.werteData.meta && window.werteData.meta.sitze)
        || 736;
    const above = parteien.filter(p => p.prozent >= config.thresholds.sperrklausel);
    if (!above.length) return [];
    // Verfahren pro Wahl konfigurierbar (werte.json meta.verfahren). Die Strings in
    // den Datendateien sind uneinheitlich ('sainte-lague' vs. 'saintelague',
    // 'hare-niemeyer'), daher wird der Name normalisiert (Kleinschreibung, alle
    // Nicht-Buchstaben entfernt), statt auf exakte Strings zu prüfen.
    const raw = String((config.meta && config.meta.verfahren) || 'dhondt');
    const verfahren = raw.toLowerCase().replace(/[^a-z]/g, '');
    const seats = {};
    above.forEach(p => { seats[p.partei] = 0; });

    if (verfahren === 'hareniemeyer' || verfahren === 'hare') {
        // Hare-Niemeyer (größte Reste): Grundmandate über Hare-Quote,
        // Restmandate nach größtem Nachkommarest vergeben (LSA, MV).
        const totalProzent = above.reduce((s, p) => s + p.prozent, 0);
        const rests = above.map(p => {
            const exact = (p.prozent / totalProzent) * gesamt;
            const floor = Math.floor(exact);
            seats[p.partei] = floor;
            return { partei: p.partei, rest: exact - floor };
        });
        let remaining = gesamt - rests.reduce((s, r) => s + seats[r.partei], 0);
        rests.sort((a, b) => b.rest - a.rest);
        for (const r of rests) {
            if (remaining <= 0) break;
            seats[r.partei]++;
            remaining--;
        }
    } else {
        // d'Hondt (Standard) bzw. Sainte-Laguë (Bundestag): Divisorverfahren,
        // Sitz für Sitz die Partei mit dem größten Quotienten.
        //
        // Sainte-Laguë: bewusst das Standard-Verfahren (Divisorfolge 1, 3, 5, …,
        // äquivalent zu 2·Sitze + 1). Das legt das deutsche Bundeswahlgesetz fest
        // ("Sainte-Laguë/Schepers", §5 Abs. 3 BWahlG → kaufmännische Rundung an 0,5);
        // der Bundeswahlleiter gibt dafür die Divisorfolge 0,5 – 1,5 – 2,5 – … an, was
        // nach Verdopplung exakt der Folge 1, 3, 5, … entspricht. Die modifizierte
        // Variante mit erstem Divisor 1,4 (Divisorfolge 1,4 – 3 – 5 – …) wird nur in
        // Schweden/Norwegen ("ausgeglichene Methode") angewandt, nicht in Deutschland.
        // Verifiziert: Bei den btw2029-Umfragewerten liefern beide Varianten identische
        // Parteisitzzahlen (192/158/96/82/68/34, Summe 630).
        const saintelague = verfahren === 'saintelague';
        for (let i = 0; i < gesamt; i++) {
            let best = null, bestQ = -1;
            above.forEach(p => {
                const divisor = saintelague ? 2 * seats[p.partei] + 1 : seats[p.partei] + 1;
                const q = p.prozent / divisor;
                if (q > bestQ) { bestQ = q; best = p.partei; }
            });
            seats[best]++;
        }
    }
    return above.map(p => ({ partei: p.partei, prozent: p.prozent, sitze: seats[p.partei] }))
        .sort((a, b) => b.sitze - a.sitze);
}

function showNotification(msg, type = 'info') {
    const old = document.querySelector('.notification');
    if (old) old.remove();
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    // Screenreader-Ansage: Fehler sofort (alert), Erfolg/Hinweis teilweise (status)
    n.setAttribute('role', type === 'error' ? 'alert' : 'status');
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

// ===== Theme =====
const THEME_ICONS = { auto: '💻', light: '☀️', dark: '🌙' };
function getSystemTheme() { return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'; }
function applyTheme(mode) {
    const resolved = mode === 'auto' ? getSystemTheme() : mode;
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('theme', mode);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = THEME_ICONS[mode];
}
function toggleTheme() {
    const order = ['auto', 'light', 'dark'];
    const cur = localStorage.getItem('theme') || 'auto';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    applyTheme(next);
    redrawCharts();
}
function applySavedTheme() {
    const saved = localStorage.getItem('theme') || 'auto';
    applyTheme(saved);
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => {
        const t = localStorage.getItem('theme');
        if (t === 'auto' || !t) { applyTheme('auto'); redrawCharts(); }
    });
}
function redrawCharts() {
    if (document.getElementById('daten-content').classList.contains('active'))
        initializeDaten();
    // Partei-Seiten-Chart beim Theme-Wechsel ebenfalls neu zeichnen
    redrawPartyTimelineIfOpen();
    // Ergebnis-Pie-Chart beim Theme-Wechsel ebenfalls neu zeichnen
    if (document.getElementById('test-content').classList.contains('active')
        && document.getElementById('testResults').innerHTML && lastTestResults) {
        initTestResultPieChart(lastTestResults);
    }
}

// ===== Simple Language Toggle =====
const staticI18nOriginals = new Map();

function snapshotStaticI18n() {
    document.querySelectorAll('[data-i18n], [data-i18n-aria]').forEach(el => {
        if (!staticI18nOriginals.has(el)) {
            staticI18nOriginals.set(el, {
                text: el.textContent,
                aria: el.getAttribute('aria-label')
            });
        }
    });
}

function applyStaticI18n() {
    snapshotStaticI18n();
    document.querySelectorAll('[data-i18n], [data-i18n-aria]').forEach(el => {
        const orig = staticI18nOriginals.get(el);
        if (el.dataset.i18n) {
            const val = t(el.dataset.i18n, null);
            if (val !== null) {
                el.textContent = val;
            } else if (orig && orig.text !== undefined) {
                el.textContent = orig.text;
            }
        }
        if (el.dataset.i18nAria) {
            const val = t(el.dataset.i18nAria, null);
            if (val !== null) {
                el.setAttribute('aria-label', val);
            } else if (orig && orig.aria !== undefined) {
                el.setAttribute('aria-label', orig.aria);
            }
        }
    });
}

function toggleSimpleLanguage() {
    const on = !isSimpleLang();
    localStorage.setItem('simpleLang', on ? '1' : '0');
    const btn = document.getElementById('simpleLangToggle');
    if (btn) {
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    applyStaticI18n();
    // Willkommens-Karten immer neu rendern – auch wenn die App gerade sichtbar ist
    // (sonst zeigt "Wechseln" die alte Sprache).
    renderWelcomeCards();
    if (activeElectionId && electionDataCache[activeElectionId]) {
        // Party-Filter-Dropdown neu aufbauen (enthält i18n-"Alle Parteien"-Option)
        populatePartyDropdowns();
        const testVisible = document.getElementById('test-content').classList.contains('active');
        if (testVisible) {
            if (document.getElementById('testResults').innerHTML) {
                suppressHistorySave = true;
                showTestResults();
                suppressHistorySave = false;
            } else {
                const resumeAt = currentQuestion;
                initializeTest();
                currentQuestion = resumeAt;
                document.querySelectorAll('#questionContainer .question').forEach(q => q.classList.remove('active'));
                const q = document.querySelector(`#questionContainer .question[data-q="${currentQuestion}"]`);
                if (q) q.classList.add('active');
                updateNavButtons();
            }
        } else if (document.getElementById('koalitionen-content').classList.contains('active')) {
            updateKoalitionen();
        } else if (document.getElementById('parteien-content').classList.contains('active')) {
            initializeParteienPage();
        } else if (document.getElementById('daten-content').classList.contains('active')) {
            initializeDaten();
        }
        const comparisonEl = document.getElementById('comparisonTable');
        if (comparisonEl && comparisonEl.innerHTML) updatePartyComparison();
        refreshPartyPageIfOpen();
    }
}

function applySavedSimpleLang() {
    const btn = document.getElementById('simpleLangToggle');
    if (btn) {
        btn.classList.toggle('active', isSimpleLang());
        btn.setAttribute('aria-pressed', isSimpleLang() ? 'true' : 'false');
    }
    applyStaticI18n();
}

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', async () => {
    applySavedTheme();
    applySavedSimpleLang();
    pendingShare = parseShareHash();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(err => {
            console.error('Service-Worker-Registrierung fehlgeschlagen:', err);
        });
    }

    document.querySelectorAll('.tab-button').forEach(b => {
        b.addEventListener('click', () => switchTab(b.dataset.tab));
    });

    // Tastaturbedienung der Tabs (ARIA-Tabs-Pattern): Pfeiltasten/Home/End wechseln
    // den aktiven Tab. Der Handler ist auf die Tab-Leiste beschränkt, damit die
    // Pfeiltasten im Test (Fragen wechseln) unberührt bleiben.
    const tabsListEl = document.querySelector('.tabs');
    if (tabsListEl) {
        tabsListEl.addEventListener('keydown', e => {
            const active = tabsListEl.querySelector('.tab-button[aria-selected="true"]');
            if (!active) return;
            const buttons = [...tabsListEl.querySelectorAll('.tab-button')];
            const i = buttons.indexOf(active);
            if (i === -1) return;
            let next = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = buttons[(i + 1) % buttons.length];
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = buttons[(i - 1 + buttons.length) % buttons.length];
            else if (e.key === 'Home') next = buttons[0];
            else if (e.key === 'End') next = buttons[buttons.length - 1];
            if (!next) return;
            e.preventDefault();
            e.stopPropagation();
            switchTab(next.dataset.tab);
            next.focus();
        });
    }

    const minMatchSlider = document.getElementById('minMatch');
    if (minMatchSlider) {
        minMatchSlider.addEventListener('input', () => { minMatchSlider.dataset.touched = '1'; });
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const configRes = await fetch('config.json');
        if (!configRes.ok) throw new Error('Fehler beim Laden von config.json');
        config = await configRes.json();
        baseConfig = JSON.parse(JSON.stringify(config));

        await loadElections();

        if (loadingOverlay) loadingOverlay.style.display = 'none';
    } catch (err) {
        console.error('Init-Fehler:', err);
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div style="text-align:center">
                    <div style="font-size:48px;margin-bottom:16px">⚠️</div>
                    <div class="loading-text">${t('errorTitle', 'Fehler beim Laden.')}<br><small style="color:var(--on-surface-muted)">${t('errorReloadHint', 'Bitte Seite neu laden')}</small></div>
                    <button onclick="location.reload()" style="margin-top:20px;padding:12px 28px;background:var(--primary);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:1rem">${t('reload', 'Neu laden')}</button>
                </div>`;
        }
    }

    // Swipe gesture for tab nav – nur bewusste horizontale Swipes auf der Tab-Leiste.
    // Fix (Issue #17): Die Geste ist NICHT am gesamten `.container` gebunden, sondern nur
    // an der `.tabs`-Leiste. So kann ein vertikaler Scroll im Inhaltsbereich (Fragen,
    // Koalitionen, Ergebnisse) nie einen Tab wechseln. Zusätzlich bricht ein `touchmove`-
    // Tracking die Geste ab, sobald die vertikale Bewegung die horizontale überwiegt
    // (diagonale Scroll-Flicks wie diffX=80/diffY=95 passieren die 1.2×-Endprüfung sonst).
    // `swipeDisabled` wird in `touchend`/`touchcancel` zuverlässig zurückgesetzt.
    let touchStartX = 0, touchStartY = 0, swipeDisabled = false;
    const tabsEl = document.querySelector('.tabs');
    if (tabsEl) {
        tabsEl.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) { swipeDisabled = true; return; }
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            swipeDisabled = false;
        }, { passive: true });
        tabsEl.addEventListener('touchmove', e => {
            if (swipeDisabled) return;
            const t = e.changedTouches[0];
            const dx = Math.abs(t.screenX - touchStartX);
            const dy = Math.abs(t.screenY - touchStartY);
            // Dead-Zone: erst ab ~10 px entscheiden, ob es ein (vertikaler) Scroll ist –
            // ein einzelnes winziges touchmove (2 px) darf die Geste nicht dauerhaft verwerfen.
            if (dx + dy < 10) return;
            if (dy > dx) swipeDisabled = true;
        }, { passive: true });
        const finishSwipe = e => {
            const stillActive = !swipeDisabled;
            swipeDisabled = false; // Zustand für die nächste Geste immer zurücksetzen
            if (!stillActive) return;
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;
            // Horizontal muss klar überwiegen, sonst war es ein (vertikaler) Scroll
            if (Math.abs(diffX) < 70) return;
            if (Math.abs(diffY) > Math.abs(diffX) * 1.2) return;
            const tabs = [...document.querySelectorAll('.tab-button')];
            const idx = tabs.findIndex(t => t.classList.contains('active'));
            if (idx === -1) return;
            if (diffX > 0 && idx < tabs.length - 1) switchTab(tabs[idx + 1].dataset.tab);
            else if (diffX < 0 && idx > 0) switchTab(tabs[idx - 1].dataset.tab);
        };
        tabsEl.addEventListener('touchend', finishSwipe, { passive: true });
        tabsEl.addEventListener('touchcancel', () => { swipeDisabled = false; }, { passive: true });
    }

    document.addEventListener('change', e => {
        if (e.target.closest('#comparePartiesCheckboxes')) {
            e.target.closest('.party-cb').classList.toggle('checked', e.target.checked);
            updatePartyComparison();
        }
        if (e.target.closest('#excludePartiesCheckboxes')) {
            e.target.closest('.party-cb').classList.toggle('checked', e.target.checked);
            updateKoalitionen();
        }
    });

    // Teilen-Link im bereits offenen Tab anwenden. Bei gleicher Basis-URL lädt der
    // Browser beim Einfügen in die Adressleiste NICHT neu, sondern wirft nur
    // `hashchange` – ohne Handler blieb die Startseite stehen (Issue #74).
    window.addEventListener('hashchange', handleShareHash);

    // ECharts bei Viewport-Änderungen neu dimensionieren
    // (Mobile-URL-Bar ein-/ausblenden, Rotation) – sonst wirken Charts abgeschnitten/verzerrt
    let chartResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(chartResizeTimer);
        chartResizeTimer = setTimeout(() => {
            Object.values(chartInstances).forEach(c => { if (c && !c.isDisposed && !c.isDisposed() && c.resize) c.resize(); });
        }, 150);
    });

    // Keyboard shortcuts for the test (1=zu, 2=neutral, 3=nicht zu, arrows=navigate)
    document.addEventListener('keydown', e => {
        if (partyPageOpen) return;
        if (!document.getElementById('test-content').classList.contains('active')) return;
        if (document.getElementById('testResults').innerHTML) return;
        const qc = document.getElementById('questionContainer');
        if (!qc || !qc.children.length) return;
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.key === 'ArrowRight') { showNextQuestion(); }
        else if (e.key === 'ArrowLeft') { showPreviousQuestion(); }
        else if (e.key === '1') { selectAnswer(currentQuestion, 'j'); }
        else if (e.key === '2') { selectAnswer(currentQuestion, 'm'); }
        else if (e.key === '3') { selectAnswer(currentQuestion, 'n'); }
    });
});
