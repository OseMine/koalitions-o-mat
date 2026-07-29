let config = null;
let baseConfig = null;
let electionsList = [];
let activeElectionId = null;
let electionDataCache = {};
let currentQuestion = 0;
let userAnswers = {};
const chartInstances = {};

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

// ===== App State =====
function showApp() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
}

function showElectionSelector() {
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('appContent').style.display = 'none';
}

// ===== Tab Switching =====
function switchTab(tabName) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(tabName + '-content');
    if (el) el.classList.add('active');

    if (tabName === 'koalitionen') updateKoalitionen();
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
    activeElectionId = electionId;
    localStorage.setItem('activeElectionId', electionId);

    document.querySelectorAll('.election-toggle').forEach(b => {
        b.classList.toggle('active', b.dataset.eid === electionId);
    });

    const data = electionDataCache[electionId];
    if (!data) return;

    window.werteData = data.werte;
    window.parteienData = data.fragen || window.parteienData;

    config = { ...baseConfig };
    if (data.config) {
        if (data.config.thresholds) config.thresholds = { ...config.thresholds, ...data.config.thresholds };
        if (data.config.meta) config.meta = { ...config.meta, ...data.config.meta };
    }
    if (window.werteData.meta && window.werteData.meta.sperrklausel != null)
        config.thresholds.sperrklausel = window.werteData.meta.sperrklausel;

    // Update election name in info bar
    const election = electionsList.find(e => e.id === electionId);
    document.getElementById('electionNameDisplay').textContent = election ? election.name : electionId;

    showApp();
    resetTest();
    populatePartyDropdowns();
    updateKoalitionen();
    switchTab('test');
}

function populateElectionSelector(selectedId) {
    const container = document.getElementById('globalElectionToggles');
    container.innerHTML = electionsList.map(e => `
        <button class="election-toggle ${e.id === selectedId ? 'active' : ''}"
                data-eid="${e.id}" onclick="setActiveElection('${e.id}')"
                role="radio" aria-checked="${e.id === selectedId}">
            <span class="toggle-dot"></span>${e.name}
        </button>
    `).join('');
}

// ===== Data Loading =====
async function loadElections() {
    try {
        // Load global fallback questions
        try {
            const globalFragenRes = await fetch('parteien.json');
            if (globalFragenRes.ok) window.parteienData = await globalFragenRes.json();
        } catch (_) { /* ignore */ }

        const res = await fetch('elections.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        electionsList = data.elections || [];
        if (!electionsList.length) throw new Error('Keine Wahlen gefunden');

        const saved = localStorage.getItem('activeElectionId');
        let defaultId = saved && electionsList.find(e => e.id === saved) ? saved : null;

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

        populateElectionSelector(defaultId);

        // If no default, show welcome screen
        if (!defaultId || !electionDataCache[defaultId]) {
            return;
        }

        // Auto-select default election
        setActiveElection(defaultId);
    } catch (err) {
        console.error('Fehler:', err);
        showNotification('Fehler beim Laden der Daten. Seite neu laden.', 'error');
    }
}

function populatePartyDropdowns() {
    if (!window.werteData || !config) return;
    const parties = window.werteData.umfragewerte
        .filter(p => p.prozent >= config.thresholds.sperrklausel);

    const filter = document.getElementById('partyFilter');
    if (filter) {
        filter.innerHTML = '<option value="">Alle Parteien</option>'
            + parties.map(p => `<option value="${p.partei}">${p.partei} (${p.prozent}%)</option>`).join('');
    }

    const excludeContainer = document.getElementById('excludePartiesCheckboxes');
    if (excludeContainer) {
        excludeContainer.innerHTML = parties.map(p => `
            <label class="party-cb">
                <input type="checkbox" value="${p.partei}">
                <span>${p.partei}</span>
            </label>
        `).join('');
    }

    const cbContainer = document.getElementById('comparePartiesCheckboxes');
    if (cbContainer) {
        cbContainer.innerHTML = window.werteData.umfragewerte.map((p, i) => `
            <label class="party-cb ${i < 2 ? 'checked' : ''}">
                <input type="checkbox" value="${p.partei}" ${i < 2 ? 'checked' : ''}>
                <span>${p.partei}</span>
            </label>
        `).join('');
        updatePartyComparison();
    }
}

// ===== Coalition Calculation =====
function berechneKoalitionen(type = 'mehrheit', excludeParties = []) {
    if (!config || !window.werteData || !window.parteienData) return [];
    const parties = window.werteData.umfragewerte.filter(
        p => p.partei !== 'Andere' && p.prozent >= config.thresholds.sperrklausel && !excludeParties.includes(p.partei)
    );
    const koalitionen = [];
    const n = parties.length;
    for (let i = 1; i < (1 << n); i++) {
        const kParties = parties.filter((_, j) => i & (1 << j));
        if (kParties.length < 2) continue;
        const sum = kParties.reduce((s, p) => s + p.prozent, 0);
        let ok = false;
        if (type === 'mehrheit') ok = sum > 50;
        else if (type === 'minderheit') ok = sum < 50;
        else ok = true;
        if (ok) {
            const ueber = berechneUebereinstimmung(kParties);
            koalitionen.push({ parteien: kParties.map(p => p.partei), prozente: sum, uebereinstimmung: ueber, anzahl: kParties.length });
        }
    }
    return koalitionen;
}

function berechneUebereinstimmung(parteien) {
    let match = 0, total = 0;
    if (!window.parteienData || !window.parteienData.fragen) return 0;
    window.parteienData.fragen.forEach(f => {
        const answers = parteien.map(p => getAnswerValue(f.antworten, p.partei));
        if (!answers.includes('m')) {
            total++;
            if (answers.every(a => a === 'j') || answers.every(a => a === 'n')) match++;
        }
    });
    return total > 0 ? (match / total) * 100 : 0;
}

function berechneUserMatchFuerKoalition(parteiNames) {
    let sum = 0, count = 0;
    if (!window.parteienData || !window.parteienData.fragen) return 0;
    window.parteienData.fragen.forEach((f, i) => {
        const ua = userAnswers[i];
        if (!ua || ua === 'm') return;
        let agree = 0, disagree = 0;
        parteiNames.forEach(name => {
            const pa = getAnswerValue(f.antworten, name);
            if (!pa || pa === 'm') return;
            if (pa === ua) agree++;
            else disagree++;
        });
        const denom = agree + disagree;
        if (denom > 0) { sum += agree / denom; count++; }
    });
    return count > 0 ? (sum / count) * 100 : 0;
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
    koalitionen.sort((a, b) => b.uebereinstimmung - a.uebereinstimmung);

    const container = document.getElementById('coalitionResults');
    if (!koalitionen.length) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>Keine passenden Koalitionen gefunden.</p></div>';
        return;
    }

    let html = `<p class="result-count">${koalitionen.length} Koalitionen gefunden</p>`;
    const grouped = {};
    koalitionen.forEach(k => {
        if (!grouped[k.anzahl]) grouped[k.anzahl] = [];
        grouped[k.anzahl].push(k);
    });

    Object.entries(grouped).sort(([a], [b]) => a - b).forEach(([size, list]) => {
        html += `<h3 class="group-title">${size}-Parteien-Koalitionen</h3>`;
        list.forEach(k => {
            const colors = k.parteien.map(p => getPartyColor(p));
            html += `
                <div class="coalition-card">
                    <div class="coalition-parties">
                        ${k.parteien.map((p, i) => `<span class="party-chip" style="--pcolor:${colors[i]}">${p}</span>`).join(' <span class="plus">+</span> ')}
                    </div>
                    <div class="coalition-meta">
                        <span class="meta-item"><strong>${k.prozente.toFixed(1)}%</strong> Gesamt</span>
                        <span class="meta-item"><strong>${k.uebereinstimmung.toFixed(1)}%</strong> Interne Übereinstimmung</span>
                        <span class="meta-item"><strong>${k.benutzerMatch.toFixed(1)}%</strong> Mit Ihnen</span>
                    </div>
                    <div class="coalition-bar">
                        <div class="coalition-bar-fill" style="width:${k.uebereinstimmung}%"></div>
                    </div>
                    <div class="coalition-bar user-match-bar">
                        <div class="coalition-bar-fill user-match-fill" style="width:${k.benutzerMatch}%"></div>
                    </div>
                </div>
            `;
        });
    });
    container.innerHTML = html;
}

// ===== Test =====
function resetTest() {
    currentQuestion = 0;
    userAnswers = {};
    const qc = document.getElementById('questionContainer');
    if (qc) { qc.style.display = 'block'; qc.innerHTML = ''; }
    const tc = document.querySelector('.test-controls');
    if (tc) tc.style.display = 'flex';
    document.getElementById('testResults').innerHTML = '';
}

function initializeTest() {
    if (!window.parteienData || !window.parteienData.fragen) return;
    currentQuestion = 0;
    userAnswers = {};
    const container = document.getElementById('questionContainer');
    if (!container) return;
    const questions = window.parteienData.fragen;
    container.innerHTML = questions.map((f, i) => {
        // Build sources list for this question
        const partyEntries = Object.keys(f.antworten).filter(p => {
            const s = getAnswerSources(f.antworten, p);
            return s && (s.quelle || s.begruendung || s.zitat);
        });
        const sourcesHtml = partyEntries.length > 0 ? `
            <button type="button" class="q-sources-toggle" onclick="toggleSources(${i})">Quellen &amp; Begründungen ▾</button>
            <div class="q-sources" id="qSources${i}">
                ${partyEntries.map(p => {
                    const s = getAnswerSources(f.antworten, p);
                    const label = getAnswerValue(f.antworten, p);
                    const labelText = label === 'j' ? 'Ja' : label === 'n' ? 'Nein' : 'Neutral';
                    return `<div class="qs-row">
                        <div class="qs-party" style="color:${getPartyColor(p)}">${p} <span class="qs-label cmp-${label}">${labelText}</span></div>
                        ${s.zitat ? `<div class="qs-zitat">„${s.zitat}”</div>` : ''}
                        ${s.begruendung ? `<div class="qs-begruendung">${s.begruendung}</div>` : ''}
                        ${s.quelle ? `<div class="qs-quelle">Quelle: ${s.quelle}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>` : '';
        return `
        <div class="question ${i === 0 ? 'active' : ''}" data-q="${i}">
            <div class="q-counter">Frage ${i + 1} von ${questions.length}</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${(i / questions.length) * 100}%"></div></div>
            <h3 class="q-text">${f.frage}</h3>
            <p class="q-desc">${f.beschreibung}</p>
            <div class="q-answers">
                <button class="q-btn" data-a="j" onclick="selectAnswer(${i},'j')">Ja</button>
                <button class="q-btn" data-a="n" onclick="selectAnswer(${i},'n')">Nein</button>
                <button class="q-btn" data-a="m" onclick="selectAnswer(${i},'m')">Neutral</button>
            </div>
            ${sourcesHtml}
        </div>`;
    }).join('');
    updateNavButtons();
    document.getElementById('testResults').innerHTML = '';
}

function selectAnswer(idx, answer) {
    if (userAnswers[idx] === answer) return;
    userAnswers[idx] = answer;
    document.querySelectorAll(`.question[data-q="${idx}"] .q-btn`).forEach(b => {
        b.classList.toggle('selected', b.dataset.a === answer);
    });
    if (idx === window.parteienData.fragen.length - 1) {
        setTimeout(() => showTestResults(), 400);
    } else {
        setTimeout(() => showNextQuestion(), 300);
    }
}

function toggleSources(idx) {
    const el = document.getElementById('qSources' + idx);
    const btn = el && el.previousElementSibling;
    if (!el) return;
    el.classList.toggle('open');
    if (btn) btn.textContent = el.classList.contains('open') ? 'Quellen & Begründungen ▴' : 'Quellen & Begründungen ▾';
}

function showNextQuestion() {
    const questions = document.querySelectorAll('#questionContainer .question');
    if (currentQuestion < questions.length - 1) {
        questions[currentQuestion].classList.remove('active');
        currentQuestion++;
        questions[currentQuestion].classList.add('active');
        updateNavButtons();
    }
}

function showPreviousQuestion() {
    const questions = document.querySelectorAll('#questionContainer .question');
    if (currentQuestion > 0) {
        questions[currentQuestion].classList.remove('active');
        currentQuestion--;
        questions[currentQuestion].classList.add('active');
        updateNavButtons();
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
        const topic = determineTopic(f.frage);
        if (!topics[topic]) topics[topic] = { match: 0, total: 0 };
        topics[topic].total++;
        if (ua === pa) topics[topic].match++;
    });
    const result = {};
    Object.entries(topics).forEach(([t, d]) => {
        result[t] = d.total > 0 ? (d.match / d.total) * 100 : 0;
    });
    return result;
}

function togglePartyDetail(partei) {
    const el = document.getElementById('trDetail-' + partei);
    if (!el) return;
    if (el.style.display !== 'none') { el.style.display = 'none'; return; }
    if (el.innerHTML) { el.style.display = 'block'; return; }
    let html = `<div class="tr-detail-table"><table class="cmp-table"><tr><th>Frage</th><th>Sie</th><th>${partei}</th><th></th></tr>`;
    window.parteienData.fragen.forEach((f, i) => {
        const ua = userAnswers[i];
        const pa = getAnswerValue(f.antworten, partei);
        const uaLbl = ua === 'j' ? 'Ja' : ua === 'n' ? 'Nein' : '—';
        const paLbl = pa === 'j' ? 'Ja' : pa === 'n' ? 'Nein' : '—';
        const match = ua && ua !== 'm' && pa && pa !== 'm' ? (ua === pa ? '✓' : '✗') : '—';
        const mClass = match === '✓' ? 'cmp-match-y' : match === '✗' ? 'cmp-match-n' : '';
        html += `<tr>
            <td class="cmp-q">${f.frage}</td>
            <td class="cmp-a cmp-${ua || 'm'}">${uaLbl}</td>
            <td class="cmp-a cmp-${pa || 'm'}">${paLbl}</td>
            <td class="${mClass}" style="text-align:center;font-size:1.2rem;font-weight:700">${match}</td>
        </tr>`;
    });
    html += '</table><div class="legend"><span class="legend-j">✓ Zustimmung</span><span class="legend-n">✗ Ablehnung</span><span class="legend-m">— Nicht vergleichbar</span></div></div>';
    el.innerHTML = html;
    el.style.display = 'block';
}

function initTestResultPieChart(results) {
    const el = document.getElementById('testResultPieChart');
    if (!el) return;
    const chart = echarts.init(el);
    chart.setOption(Object.assign(echartsTheme(), {
        tooltip: { trigger: 'item', formatter: p => `${p.name}: <strong>${p.value.toFixed(1)}%</strong>` },
        series: [{
            type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: cssVar('--surface', '#fff'), borderWidth: 2 },
            label: { show: true, formatter: p => `${p.name}\n${p.value.toFixed(1)}%`, fontSize: 11, color: cssVar('--on-surface') },
            labelLine: { length: 8, length2: 10 },
            data: results.map(r => ({
                value: r.match, name: r.partei,
                itemStyle: { color: getPartyColor(r.partei) }
            })),
            animationDuration: 800
        }]
    }), true);
}

function showTestResults() {
    const container = document.getElementById('testResults');
    if (!window.werteData || !window.werteData.umfragewerte || !config) return;

    // Hide question area, show results
    document.getElementById('questionContainer').style.display = 'none';
    const controls = document.querySelector('.test-controls');
    if (controls) controls.style.display = 'none';

    const parties = window.werteData.umfragewerte.filter(p => p.prozent >= config.thresholds.sperrklausel);
    const results = parties.map(p => {
        let agreed = 0, total = 0;
        if (window.parteienData && window.parteienData.fragen) {
            window.parteienData.fragen.forEach((f, i) => {
                const ua = userAnswers[i];
                if (!ua || ua === 'm') return;
                const pa = getAnswerValue(f.antworten, p.partei);
                if (!pa || pa === 'm') return;
                total++;
                if (ua === pa) agreed++;
            });
        }
        return {
            partei: p.partei,
            match: total > 0 ? (agreed / total) * 100 : 0,
            topicMatches: berechneUserMatchNachThema(p.partei),
            agreed,
            total
        };
    }).sort((a, b) => b.match - a.match);

    const electionName = getActiveElectionName();
    const totalAnswered = Object.values(userAnswers).filter(a => a !== undefined && a !== null).length;
    const totalQuestions = window.parteienData ? window.parteienData.fragen.length : 0;

    let html = `<div class="test-results-header"><h3>Ihre Übereinstimmung mit den Parteien</h3>`;
    if (electionName) html += `<p class="election-label">Wahl: ${electionName}</p>`;
    html += `</div>`;

    html += `<div class="tr-summary">
        <div class="tr-stat">
            <span class="tr-stat-val" style="color:${getPartyColor(results[0].partei)}">${results[0].match.toFixed(1)}%</span>
            <span class="tr-stat-lbl">Beste Übereinstimmung</span>
            <span class="tr-stat-sub" style="color:${getPartyColor(results[0].partei)}">${results[0].partei}</span>
        </div>
        <div class="tr-stat">
            <span class="tr-stat-val">${totalAnswered}/${totalQuestions}</span>
            <span class="tr-stat-lbl">Fragen beantwortet</span>
        </div>
        <div class="tr-stat">
            <span class="tr-stat-val">${results.length}</span>
            <span class="tr-stat-lbl">Parteien verglichen</span>
        </div>
    </div>`;

    // Pie chart
    html += `<div class="tr-pie-section">
        <h3>Übereinstimmung im Überblick</h3>
        <div id="testResultPieChart" style="height:260px;width:100%"></div>
    </div>`;

    // Best coalition
    const allKoal = berechneKoalitionen('beide');
    allKoal.forEach(k => { k.benutzerMatch = berechneUserMatchFuerKoalition(k.parteien); });
    allKoal.sort((a, b) => b.benutzerMatch - a.benutzerMatch);
    const best = allKoal.length && allKoal[0].benutzerMatch > 0 ? allKoal[0] : null;
    if (best) {
        const colors = best.parteien.map(p => getPartyColor(p));
        html += `<div class="tr-best-section">
            <h3>Beste Koalition für Sie</h3>
            <div class="coalition-card">
                <div class="coalition-parties">
                    ${best.parteien.map((p, i) => `<span class="party-chip" style="--pcolor:${colors[i]}">${p}</span>`).join(' <span class="plus">+</span> ')}
                </div>
                <div class="coalition-meta">
                    <span class="meta-item"><strong>${best.prozente.toFixed(1)}%</strong> Gesamt</span>
                    <span class="meta-item"><strong>${best.uebereinstimmung.toFixed(1)}%</strong> Interne Übereinstimmung</span>
                    <span class="meta-item"><strong>${best.benutzerMatch.toFixed(1)}%</strong> Mit Ihnen</span>
                </div>
                <div class="coalition-bar"><div class="coalition-bar-fill" style="width:${best.uebereinstimmung}%"></div></div>
            </div>
        </div>`;
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

        html += `
            <div class="tr-card">
                <div class="tr-card-top">
                    <span class="tr-party-name" style="color:${color}">${r.partei}</span>
                    <span class="tr-match-big" style="color:${color}">${r.match.toFixed(1)}%</span>
                </div>
                <div class="match-bar-wrap">
                    <div class="match-bar-fill" style="width:${r.match}%;background:${color}"></div>
                </div>
                <div class="tr-card-agreed">${r.agreed} von ${r.total} Fragen zugestimmt</div>
                ${topicsHtml}
                <button class="tr-detail-btn" onclick="togglePartyDetail('${r.partei}')">Fragen-Vergleich ▾</button>
                <div class="tr-detail" id="trDetail-${r.partei}" style="display:none"></div>
            </div>`;
    });
    html += `</div>`;

    // Restart button
    html += `<div style="text-align:center;margin-top:16px">
        <button class="tr-restart-btn" onclick="resetTestAndRestart()">Test wiederholen</button>
    </div>`;

    container.innerHTML = html;
    initTestResultPieChart(results);
    saveTestResult(results);
}

function resetTestAndRestart() {
    const qc = document.getElementById('questionContainer');
    if (qc) qc.style.display = 'block';
    const tc = document.querySelector('.test-controls');
    if (tc) tc.style.display = 'flex';
    document.getElementById('testResults').innerHTML = '';
    resetTest();
    initializeTest();
}

function berechneUserMatch(partei) {
    let match = 0, total = 0;
    if (!window.parteienData || !window.parteienData.fragen) return 0;
    window.parteienData.fragen.forEach((f, i) => {
        const ua = userAnswers[i];
        if (!ua || ua === 'm') return;
        const pa = getAnswerValue(f.antworten, partei);
        if (!pa || pa === 'm') return;
        total++;
        if (ua === pa) match++;
    });
    return total > 0 ? (match / total) * 100 : 0;
}

function saveTestResult(results) {
    const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
    history.push({
        date: new Date().toISOString(),
        electionId: getActiveElectionId(),
        answers: { ...userAnswers },
        results: results.slice(0, 5)
    });
    localStorage.setItem('testHistory', JSON.stringify(history));
    showNotification('Ergebnis gespeichert!', 'success');
}

// ===== Daten & Charts =====
function cssVar(name, fallback = '') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function initChart(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (chartInstances[id]) { chartInstances[id].dispose(); delete chartInstances[id]; }
    const chart = echarts.init(el);
    chartInstances[id] = chart;
    return chart;
}

function initializeDaten() {
    createStatsSummary();
    createPartyOverviewChart();
    createSeatChart();
    createCoalitionPotentialChart();
    createPartyPositionsChart();
    createTopicChart();
}

function createStatsSummary() {
    const container = document.getElementById('statsSummary');
    if (!container || !window.werteData) return;
    const parties = window.werteData.umfragewerte;
    const above = parties.filter(p => p.prozent >= config.thresholds.sperrklausel);
    const strongest = parties.reduce((a, b) => a.prozent > b.prozent ? a : b);
    container.innerHTML = `
        <div class="stat-card"><div class="stat-val">${parties.length}</div><div class="stat-lbl">Parteien</div></div>
        <div class="stat-card"><div class="stat-val">${above.length}</div><div class="stat-lbl">Über ${config.thresholds.sperrklausel}%-Hürde</div></div>
        <div class="stat-card"><div class="stat-val">${strongest.partei}</div><div class="stat-lbl">Stärkste (${strongest.prozent.toFixed(1)}%)</div></div>
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
    const chart = initChart('partyOverviewChart');
    if (!chart) return;
    const parties = window.werteData.umfragewerte.filter(p => p.prozent >= 1).sort((a, b) => b.prozent - a.prozent);
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
    const chart = initChart('seatChart');
    if (!chart) return;
    const parties = window.werteData.umfragewerte;
    const seats = berechneSitze(parties);
    const total = seats.reduce((s, p) => s + p.sitze, 0);
    chart.setOption(Object.assign(echartsTheme(), {
        series: [{
            type: 'pie', radius: ['55%', '75%'], avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: cssVar('--surface', '#fff'), borderWidth: 2 },
            label: { show: true, position: 'outside', formatter: p => p.name.split(' (')[0], fontSize: 11, color: cssVar('--on-surface') },
            labelLine: { length: 8, length2: 10 },
            data: seats.map(p => ({ value: p.sitze, name: `${p.partei} (${p.sitze} Sitze)`, itemStyle: { color: getPartyColor(p.partei) } })),
            animationDuration: 1000
        }],
        tooltip: { trigger: 'item', formatter: p => `${p.name}<br/><strong>${p.value} Sitze (${p.percent.toFixed(1)}%)</strong>` },
        graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: total + '\nSitze', textAlign: 'center', fill: cssVar('--on-surface'), font: 'bold 28px system-ui, sans-serif', lineHeight: 34 }, z: 100 }]
    }), true);
}

function createCoalitionPotentialChart() {
    const chart = initChart('coalitionPotentialChart');
    if (!chart) return;
    let koalitionen = (berechneKoalitionen('mehrheit') || [])
        .sort((a, b) => b.uebereinstimmung - a.uebereinstimmung)
        .slice(0, 6);
    if (!koalitionen.length) {
        chart.dispose();
        document.getElementById('coalitionPotentialChart').parentElement.innerHTML =
            '<p style="color:var(--on-surface-muted);text-align:center;padding:40px 0">Keine Mehrheitskoalitionen</p>';
        return;
    }
    chart.setOption(Object.assign(echartsTheme(), {
        grid: { left: 90, right: 60, top: 10, bottom: 10 },
        xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: cssVar('--on-surface-muted'), fontSize: 10 }, splitLine: { lineStyle: { color: cssVar('--outline') + '40' } }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: 'category', data: koalitionen.map(k => k.parteien.join(' + ')), axisLabel: { fontSize: 10, color: cssVar('--on-surface-muted') }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
        series: [{ type: 'bar', data: koalitionen.map(k => ({ value: k.uebereinstimmung, itemStyle: { color: getPartyColor(k.parteien[0]) + 'CC', borderRadius: [0, 3, 3, 0] } })), barMaxWidth: 22, label: { show: true, position: 'right', formatter: p => p.value.toFixed(1) + '%', color: cssVar('--on-surface-muted'), fontSize: 10 }, animationDuration: 700 }],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br/>Übereinstimmung: <strong>${p[0].value.toFixed(1)}%</strong>` }
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
    const chart = initChart('topicDistributionChart');
    if (!chart) return;
    const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
    if (!history.length) {
        chart.dispose();
        document.getElementById('topicDistributionChart').parentElement.innerHTML =
            '<p style="color:var(--on-surface-muted);text-align:center;padding:40px 0">Test durchführen, um Ihre Themenverteilung zu sehen</p>';
        return;
    }
    const latest = history[history.length - 1];
    const topics = {};
    Object.entries(latest.answers || {}).forEach(([i, a]) => {
        if (!window.parteienData || !window.parteienData.fragen) return;
        const q = window.parteienData.fragen[i];
        if (!q) return;
        const topic = determineTopic(q.frage);
        if (!topics[topic]) topics[topic] = [];
        topics[topic].push(a === 'j' ? 100 : a === 'n' ? 0 : 50);
    });
    const entries = Object.entries(topics).map(([k, v]) => [k, v.length ? v.reduce((a, b) => a + b) / v.length : 0]);
    chart.setOption(Object.assign(echartsTheme(), {
        series: [{
            type: 'pie', radius: ['30%', '70%'], roseType: 'radius', avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: cssVar('--surface', '#fff'), borderWidth: 2 },
            label: { show: true, formatter: p => (p.value > 15 ? `${p.name}\n${p.value.toFixed(0)}%` : ''), fontSize: 12, fontWeight: 'bold', color: '#fff' },
            labelLine: { length: 6, length2: 8 },
            data: entries.map(([k, v]) => ({
                value: v, name: k,
                itemStyle: { color: (config.topics[k] && config.topics[k].color) || config.chartColors.neutral }
            })),
            animationDuration: 900
        }],
        tooltip: { trigger: 'item', formatter: p => `${p.name}<br/><strong>${p.value.toFixed(0)}%</strong>` }
    }), true);
}

function analyzePartyTopics(partei) {
    const topics = {};
    Object.keys(config.topics).forEach(t => topics[t] = []);
    if (!window.parteienData || !window.parteienData.fragen) return Object.fromEntries(Object.keys(config.topics).map(t => [t, 0]));
    window.parteienData.fragen.forEach(f => {
        const topic = determineTopic(f.frage);
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

function determineTopic(question) {
    for (const [topic, data] of Object.entries(config.topics)) {
        if (data.keywords.some(w => question.toLowerCase().includes(w.toLowerCase())))
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
        container.innerHTML = '<p style="color:var(--on-surface-muted)">Wählen Sie Parteien zum Vergleichen aus.</p>';
        return;
    }
    if (!window.parteienData || !window.parteienData.fragen) {
        container.innerHTML = '<p style="color:var(--on-surface-muted)">Keine Fragen für diese Wahl verfügbar.</p>';
        return;
    }
    let html = '<div class="cmp-wrap"><table class="cmp-table"><tr><th>Frage</th>';
    parties.forEach(p => html += `<th style="color:${getPartyColor(p)}">${p}</th>`);
    html += '</tr>';
    window.parteienData.fragen.forEach((f, i) => {
        html += `<tr><td class="cmp-q">${f.frage}</td>`;
        parties.forEach(p => {
            const a = getAnswerValue(f.antworten, p);
            const src = getAnswerSources(f.antworten, p);
            const label = a === 'j' ? 'Ja' : a === 'n' ? 'Nein' : '—';
            if (src && (src.quelle || src.begruendung)) {
                html += `<td class="cmp-a cmp-${a || 'm'}"><span class="cmp-hint" title="${(src.quelle||'')} ${(src.begruendung||'')}">${label}</span></td>`;
            } else {
                html += `<td class="cmp-a cmp-${a || 'm'}">${label}</td>`;
            }
        });
        html += '</tr>';
    });
    html += '</table></div>';
    html += '<div class="legend"><span class="legend-j">■ Ja</span><span class="legend-n">■ Nein</span><span class="legend-m">■ Neutral</span></div>';
    container.innerHTML = html;
}

function berechneSitze(parteien) {
    const gesamt = (config.meta && config.meta.gesamtSitze) || 736;
    const gueltig = parteien.filter(p => p.prozent >= config.thresholds.sperrklausel).reduce((s, p) => s + p.prozent, 0);
    return parteien.filter(p => p.prozent >= config.thresholds.sperrklausel)
        .map(p => ({ partei: p.partei, prozent: p.prozent, sitze: Math.round((p.prozent / gueltig) * gesamt) }))
        .sort((a, b) => b.sitze - a.sitze);
}

function showNotification(msg, type = 'info') {
    const old = document.querySelector('.notification');
    if (old) old.remove();
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
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
}

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', async () => {
    applySavedTheme();

    document.querySelectorAll('.tab-button').forEach(b => {
        b.addEventListener('click', () => switchTab(b.dataset.tab));
    });

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
                    <div class="loading-text">Fehler beim Laden.<br><small style="color:var(--on-surface-muted)">Bitte Seite neu laden</small></div>
                    <button onclick="location.reload()" style="margin-top:20px;padding:12px 28px;background:var(--primary);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:1rem">Neu laden</button>
                </div>`;
        }
    }

    // Swipe gesture for tab nav
    let touchStartX = 0, touchEndX = 0;
    const containerEl = document.querySelector('.container');
    if (containerEl) {
        containerEl.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        containerEl.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) < 60) return;
            const tabs = [...document.querySelectorAll('.tab-button')];
            const idx = tabs.findIndex(t => t.classList.contains('active'));
            if (idx === -1) return;
            if (diff > 0 && idx < tabs.length - 1) switchTab(tabs[idx + 1].dataset.tab);
            else if (diff < 0 && idx > 0) switchTab(tabs[idx - 1].dataset.tab);
        }, { passive: true });
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
});
