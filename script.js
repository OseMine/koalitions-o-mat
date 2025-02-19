document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [parteienResponse, werteResponse] = await Promise.all([
            fetch('parteien.json'),
            fetch('werte.json')
        ]);
        
        const parteienData = await parteienResponse.json();
        const werteData = await werteResponse.json();
        
        // Speichere die Daten global für spätere Verwendung
        window.parteienData = parteienData;
        window.werteData = werteData;
        
        // Fülle die Partei-Auswahlmenüs für Koalitionen (nur Parteien über 5%)
        const relevantParties = werteData.umfragewerte
            .filter(p => p.prozent >= werteData.meta.sperrklausel);

        // Fülle das Haupt-Parteiauswahlmenü
        const partySelect = document.getElementById('partySelect');
        relevantParties.forEach(partei => {
            const option = document.createElement('option');
            option.value = partei.partei;
            option.textContent = `${partei.partei} (${partei.prozent}%)`;
            partySelect.appendChild(option);
        });

        // Fülle die Koalitions-Dropdowns (nur Parteien über 5%)
        ['excludePartiesAll', 'excludePartiesParty'].forEach(id => {
            const dropdown = document.getElementById(id + 'Dropdown');
            dropdown.innerHTML = relevantParties.map(partei => `
                <label>
                    <input type="checkbox" value="${partei.partei}" 
                           onchange="updateSelectedOptions('${id}')">
                    <span>${partei.partei}</span>
                </label>
            `).join('');
        });

        // Fülle das Vergleichs-Dropdown mit ALLEN Parteien
        const compareDropdown = document.getElementById('comparePartiesDropdown');
        compareDropdown.innerHTML = werteData.umfragewerte.map(partei => `
            <label>
                <input type="checkbox" value="${partei.partei}" 
                       onchange="updateSelectedOptions('compareParties')">
                <span>${partei.partei} (${partei.prozent}%)</span>
            </label>
        `).join('');

        // Wähle standardmäßig die ersten beiden Parteien für den Vergleich
        const compareCheckboxes = document.querySelectorAll('#comparePartiesDropdown input[type="checkbox"]');
        if (compareCheckboxes.length > 0) compareCheckboxes[0].checked = true;
        if (compareCheckboxes.length > 1) compareCheckboxes[1].checked = true;
        updateSelectedOptions('compareParties');
        
        // Berechne und zeige alle Koalitionen
        const koalitionen = berechneKoalitionen(parteienData, werteData);
        zeigeKoalitionen(koalitionen);

    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
    }
});

function getExcludedParties(type) {
    const checkboxes = document.querySelectorAll(`#excludeParties${type}Dropdown input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateKoalitionen() {
    const type = document.getElementById('coalitionTypeAll').value;
    const customThreshold = type === 'custom' ? 
        parseFloat(document.getElementById('customThresholdValueAll').value) : 50;
    
    const koalitionen = berechneKoalitionen(window.parteienData, window.werteData, type, customThreshold);
    zeigeKoalitionen(koalitionen);
}

function berechneKoalitionen(parteienData, werteData, type = 'alle', customThreshold = 50) {
    // Filtere Parteien über 5%
    const relevantParties = werteData.umfragewerte.filter(
        p => p.partei !== 'Andere' && p.prozent >= werteData.meta.sperrklausel
    );

    const koalitionen = [];
    const n = relevantParties.length;

    // Generiere alle möglichen Kombinationen von Parteien
    for (let i = 1; i < (1 << n); i++) {
        const koalitionsParteien = relevantParties.filter((_, j) => i & (1 << j));
        
        // Berechne Gesamtprozente
        const gesamtProzente = koalitionsParteien.reduce((sum, p) => sum + p.prozent, 0);
        
        // Prüfe Koalitionstyp
        let isValid = false;
        switch(type) {
            case 'mehrheit':
                isValid = gesamtProzente > 50;
                break;
            case 'minderheit':
                isValid = gesamtProzente < 50;
                break;
            case 'custom':
                isValid = gesamtProzente >= customThreshold;
                break;
            case 'beide':
                isValid = true;
                break;
            default:
                isValid = gesamtProzente >= 50;
        }

        if (isValid) {
            // Berechne Übereinstimmung bei Zielen
            const uebereinstimmung = berechneUebereinstimmung(koalitionsParteien, parteienData);
            
            koalitionen.push({
                parteien: koalitionsParteien.map(p => p.partei),
                prozente: gesamtProzente,
                uebereinstimmung: uebereinstimmung,
                anzahlParteien: koalitionsParteien.length
            });
        }
    }

    return koalitionen;
}

function berechneUebereinstimmung(parteien, parteienData) {
    let uebereinstimmungen = 0;
    let gesamtFragen = 0;

    parteienData.fragen.forEach(frage => {
        const antworten = parteien.map(p => frage.antworten[p.partei]);
        // Zähle nur Fragen, bei denen keine Partei mit "m" (neutral) geantwortet hat
        if (!antworten.includes('m')) {
            gesamtFragen++;
            // Prüfe ob alle Parteien die gleiche Position haben (j oder n)
            if (antworten.every(a => a === 'j') || antworten.every(a => a === 'n')) {
                uebereinstimmungen++;
            }
        }
    });

    return gesamtFragen > 0 ? (uebereinstimmungen / gesamtFragen) * 100 : 0;
}

function zeigeKoalitionen(koalitionen) {
    const resultsDiv = document.getElementById('coalitionResults');
    const minMatch = parseFloat(document.getElementById('minMatchAll').value);
    const excludedParties = getExcludedParties('All');
    
    // Filtere Koalitionen nach Mindestübereinstimmung und ausgeschlossenen Parteien
    koalitionen = koalitionen.filter(k => 
        k.uebereinstimmung >= minMatch && 
        !k.parteien.some(p => excludedParties.includes(p))
    );
    
    if (koalitionen.length === 0) {
        resultsDiv.innerHTML = '<p>Keine Koalitionen mit der gewünschten Mindestübereinstimmung gefunden.</p>';
        return;
    }

    // Gruppiere nach Anzahl der Parteien
    const gruppiertNachGroesse = {};
    koalitionen.forEach(k => {
        const size = k.anzahlParteien;
        if (!gruppiertNachGroesse[size]) {
            gruppiertNachGroesse[size] = [];
        }
        gruppiertNachGroesse[size].push(k);
    });

    // Sortiere innerhalb jeder Gruppe nach Übereinstimmung
    Object.values(gruppiertNachGroesse).forEach(gruppe => {
        gruppe.sort((a, b) => b.uebereinstimmung - a.uebereinstimmung);
    });

    // Generiere HTML
    resultsDiv.innerHTML = Object.entries(gruppiertNachGroesse)
        .sort(([a], [b]) => a - b) // Sortiere nach Koalitionsgröße
        .map(([size, koalitionen]) => `
            <h3>${size}-Parteien Koalitionen:</h3>
            ${koalitionen.map(koalition => `
                <div class="coalition-match">
                    <p>Parteien: ${koalition.parteien.join(' + ')}</p>
                    <p>Gesamtprozente: ${koalition.prozente.toFixed(1)}%</p>
                    <p>Übereinstimmung der Ziele: ${koalition.uebereinstimmung.toFixed(1)}%</p>
                </div>
            `).join('')}
        `).join('');
}

// Globale Variablen für beide Tests
let sharedAnswers = {};
let currentSharedQuestion = 0;
let currentQuestion = 0;
let currentWahlomatQuestion = 0;
let userAnswers = {};
let wahlomatAnswers = {};

function switchTab(tabName) {
    // Aktualisiere Tab-Buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    // Aktualisiere Tab-Inhalte
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Spezielle Behandlung für das Dashboard
    const contentId = tabName === 'dashboard' ? 
        'dashboard-content' : 
        `${tabName}-koalitionen`;
    
    document.getElementById(contentId).classList.add('active');

    // Synchronisiere die Tests beim Tab-Wechsel
    if (tabName === 'test') {
        currentQuestion = currentSharedQuestion;
        userAnswers = {...sharedAnswers};
        initializeTest();
    } else if (tabName === 'wahlomat') {
        currentWahlomatQuestion = currentSharedQuestion;
        wahlomatAnswers = {...sharedAnswers};
        initializeWahlomatTest();
    } else if (tabName === 'history') {
        showTestHistory();
    } else if (tabName === 'wahlsimulator') {
        initializeWahlsimulator();
    } else if (tabName === 'dashboard') {
        updateDashboard();
    }
}

function updateMinMatchLabel(type) {
    const slider = document.getElementById(`minMatch${type}`);
    const label = document.getElementById(`minMatchLabel${type}`);
    label.textContent = `${slider.value}%`;
    
    if (type === 'All') {
        const koalitionen = berechneKoalitionen(window.parteienData, window.werteData);
        zeigeKoalitionen(koalitionen);
    } else {
        zeigeKoalitionenFuerPartei();
    }
}

function zeigeKoalitionenFuerPartei() {
    const selectedParty = document.getElementById('partySelect').value;
    const roleType = document.getElementById('roleSelect').value;
    const minMatch = parseFloat(document.getElementById('minMatchParty').value);
    const excludedParties = getExcludedParties('Party');
    const coalitionType = document.getElementById('coalitionTypeParty').value;
    const customThreshold = coalitionType === 'custom' ? 
        parseFloat(document.getElementById('customThresholdValueParty').value) : 50;
    
    if (!selectedParty) return;
    
    let koalitionen = berechneKoalitionen(window.parteienData, window.werteData, coalitionType, customThreshold);
    
    // Filtere ausgeschlossene Parteien
    koalitionen = koalitionen.filter(k => 
        !k.parteien.some(p => excludedParties.includes(p))
    );
    
    let parteiKoalitionen;

    if (roleType === 'staerkste') {
        parteiKoalitionen = koalitionen.filter(k => {
            const partyIndex = k.parteien.indexOf(selectedParty);
            if (partyIndex === -1) return false;
            
            const koalitionsWerte = k.parteien.map(partei => 
                window.werteData.umfragewerte.find(p => p.partei === partei).prozent
            );
            
            const selectedPartyValue = koalitionsWerte[partyIndex];
            return koalitionsWerte.every((wert, index) => 
                index === partyIndex || wert <= selectedPartyValue
            );
        });
    } else {
        parteiKoalitionen = koalitionen.filter(k => k.parteien.includes(selectedParty));
    }

    // Filtere nach Mindestübereinstimmung
    parteiKoalitionen = parteiKoalitionen.filter(k => k.uebereinstimmung >= minMatch);
    
    const resultsDiv = document.getElementById('partyCoalitionResults');
    
    if (parteiKoalitionen.length === 0) {
        resultsDiv.innerHTML = '<p>Keine Koalitionen mit der gewünschten Mindestübereinstimmung gefunden.</p>';
        return;
    }

    // Gruppiere nach Anzahl der Parteien
    const gruppiertNachGroesse = {};
    parteiKoalitionen.forEach(k => {
        const size = k.anzahlParteien;
        if (!gruppiertNachGroesse[size]) {
            gruppiertNachGroesse[size] = [];
        }
        gruppiertNachGroesse[size].push(k);
    });

    // Sortiere innerhalb jeder Gruppe nach Übereinstimmung
    Object.values(gruppiertNachGroesse).forEach(gruppe => {
        gruppe.sort((a, b) => b.uebereinstimmung - a.uebereinstimmung);
    });

    // Generiere HTML
    resultsDiv.innerHTML = Object.entries(gruppiertNachGroesse)
        .sort(([a], [b]) => a - b)
        .map(([size, koalitionen]) => `
            <h3>${size}-Parteien Koalitionen mit ${selectedParty}${roleType === 'staerkste' ? ' als stärkster Partei' : ''}:</h3>
            ${koalitionen.map(koalition => `
                <div class="coalition-match">
                    <p>Parteien: ${koalition.parteien.join(' + ')}</p>
                    <p>Gesamtprozente: ${koalition.prozente.toFixed(1)}%</p>
                    <p>Übereinstimmung der Ziele: ${koalition.uebereinstimmung.toFixed(1)}%</p>
                </div>
            `).join('')}
        `).join('');
}

function updatePartyComparison() {
    const checkboxes = document.querySelectorAll('#comparePartiesDropdown input[type="checkbox"]:checked');
    const selectedParties = Array.from(checkboxes).map(cb => cb.value);
    const showOwnPosition = document.getElementById('showOwnPosition').checked;
    
    if (selectedParties.length === 0) {
        document.getElementById('comparisonTable').innerHTML = '<p>Bitte wählen Sie mindestens eine Partei aus.</p>';
        return;
    }

    const hasTestAnswers = Object.keys(sharedAnswers).length > 0;
    const isMobile = window.innerWidth <= 480;
    
    // Für Mobile: Begrenze die Anzahl der angezeigten Parteien
    let displayParties = selectedParties;
    if (isMobile) {
        const maxColumns = showOwnPosition && hasTestAnswers ? 1 : 2;
        displayParties = selectedParties.slice(0, maxColumns);
        
        if (selectedParties.length > maxColumns) {
            const remainingParties = selectedParties.length - maxColumns;
            const warningHtml = `
                <div style="margin-bottom: 10px; padding: 10px; background-color: #fff3e0; border-radius: 4px;">
                    <p>Hinweis: Auf Ihrem Gerät werden nur ${maxColumns} Parteien gleichzeitig angezeigt. 
                    ${remainingParties} weitere Partei(en) ausgeblendet.</p>
                </div>
            `;
            document.getElementById('comparisonTable').innerHTML = warningHtml;
        }
    }
    
    let html = '<table class="comparison-table">';
    
    // Header
    html += '<tr><th>Frage</th>';
    if (hasTestAnswers && showOwnPosition) {
        html += '<th>Ihre Position</th>';
    }
    displayParties.forEach(party => {
        html += `<th>${party}</th>`;
    });
    html += '</tr>';
    
    // Fragen und Antworten
    window.parteienData.fragen.forEach((frage, index) => {
        html += `
            <tr>
                <td class="question-cell">${frage.frage}</td>
        `;
        
        if (hasTestAnswers && showOwnPosition) {
            const userAnswer = sharedAnswers[index];
            html += `<td class="answer-${userAnswer || 'm'}">${getAnswerText(userAnswer)}</td>`;
        }
        
        displayParties.forEach(party => {
            const answer = frage.antworten[party];
            html += `<td class="answer-${answer}">${getAnswerText(answer)}</td>`;
        });
        
        html += '</tr>';
        
        // Beschreibungszeile
        const colspan = (hasTestAnswers && showOwnPosition ? 1 : 0) + displayParties.length + 1;
        html += `
            <tr>
                <td class="description-cell" colspan="${colspan}">
                    ${frage.beschreibung}
                </td>
            </tr>
        `;
    });
    
    html += '</table>';
    
    // Legende
    html += `
        <div class="legend">
            <div class="legend-item"><span class="answer-j">■</span> Ja</div>
            <div class="legend-item"><span class="answer-n">■</span> Nein</div>
            <div class="legend-item"><span class="answer-m">■</span> Neutral/Keine Angabe</div>
        </div>
    `;

    document.getElementById('comparisonTable').innerHTML = html;
}

// Hilfsfunktion für die Textdarstellung der Antworten
function getAnswerText(answer) {
    switch(answer) {
        case 'j': return 'Ja';
        case 'n': return 'Nein';
        case 'm': return 'Neutral';
        default: return 'Keine Angabe';
    }
}

function toggleDropdown(id) {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    dropdowns.forEach(d => {
        if (d.id !== id + 'Dropdown') {
            d.classList.remove('show');
        }
    });
    document.getElementById(id + 'Dropdown').classList.toggle('show');
}

function updateSelectedOptions(id) {
    const checkboxes = document.querySelectorAll(`#${id}Dropdown input[type="checkbox"]`);
    const selectedOptions = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.nextElementSibling.textContent);
    
    document.getElementById(id + 'Selected').textContent = 
        selectedOptions.length ? `Ausgewählt: ${selectedOptions.join(', ')}` : '';
    
    if (id === 'compareParties') {
        updatePartyComparison();
    } else if (id === 'excludePartiesAll') {
        updateKoalitionen();
    } else if (id === 'excludePartiesParty') {
        zeigeKoalitionenFuerPartei();
    }
}

// Schließe Dropdowns beim Klicken außerhalb
document.addEventListener('click', (e) => {
    if (!e.target.matches('.dropdown-btn') && !e.target.closest('.dropdown-content')) {
        document.querySelectorAll('.dropdown-content').forEach(d => {
            d.classList.remove('show');
        });
    }
});

// Modifiziere die Navigation für beide Tests
function showNextQuestion() {
    if (currentQuestion < window.parteienData.fragen.length - 1) {
        const questions = document.querySelectorAll('#questionContainer .question');
        questions[currentQuestion].classList.remove('active');
        currentQuestion++;
        currentSharedQuestion = currentQuestion;
        questions[currentQuestion].classList.add('active');
        updateNavigationButtons();
    }
}

function showPreviousQuestion() {
    if (currentQuestion > 0) {
        const questions = document.querySelectorAll('#questionContainer .question');
        questions[currentQuestion].classList.remove('active');
        currentQuestion--;
        currentSharedQuestion = currentQuestion;
        questions[currentQuestion].classList.add('active');
        updateNavigationButtons();
    }
}

function showNextWahlomatQuestion() {
    if (currentWahlomatQuestion < window.parteienData.fragen.length - 1) {
        const questions = document.querySelectorAll('#wahlomatQuestionContainer .question');
        questions[currentWahlomatQuestion].classList.remove('active');
        currentWahlomatQuestion++;
        currentSharedQuestion = currentWahlomatQuestion;
        questions[currentWahlomatQuestion].classList.add('active');
        updateWahlomatNavigationButtons();
    }
}

function showPreviousWahlomatQuestion() {
    if (currentWahlomatQuestion > 0) {
        const questions = document.querySelectorAll('#wahlomatQuestionContainer .question');
        questions[currentWahlomatQuestion].classList.remove('active');
        currentWahlomatQuestion--;
        currentSharedQuestion = currentWahlomatQuestion;
        questions[currentWahlomatQuestion].classList.add('active');
        updateWahlomatNavigationButtons();
    }
}

function initializeTest() {
    currentQuestion = currentSharedQuestion;
    userAnswers = {...sharedAnswers};
    const container = document.getElementById('questionContainer');
    const questions = window.parteienData.fragen;
    
    container.innerHTML = questions.map((frage, index) => `
        <div class="question ${index === currentQuestion ? 'active' : ''}" data-question="${index}">
            <div class="question-counter">Frage ${index + 1} von ${questions.length}</div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${(index / questions.length) * 100}%"></div>
            </div>
            <h3>${frage.frage}</h3>
            <p>${frage.beschreibung}</p>
            <div class="answer-buttons">
                <button class="answer-button ${userAnswers[index] === 'j' ? 'selected' : ''}" 
                        data-answer="j" onclick="selectAnswer(${index}, 'j')">Ja</button>
                <button class="answer-button ${userAnswers[index] === 'n' ? 'selected' : ''}" 
                        data-answer="n" onclick="selectAnswer(${index}, 'n')">Nein</button>
                <button class="answer-button ${userAnswers[index] === 'm' ? 'selected' : ''}" 
                        data-answer="m" onclick="selectAnswer(${index}, 'm')">Neutral</button>
            </div>
        </div>
    `).join('');
    
    updateNavigationButtons();
}

function selectAnswer(questionIndex, answer) {
    userAnswers[questionIndex] = answer;
    sharedAnswers[questionIndex] = answer;
    wahlomatAnswers[questionIndex] = answer;
    
    // Update Button-Styles
    const buttons = document.querySelectorAll(`.question[data-question="${questionIndex}"] .answer-button`);
    buttons.forEach(button => {
        button.classList.remove('selected');
        if (button.dataset.answer === answer) {
            button.classList.add('selected');
        }
    });
    
    // Wenn letzte Frage beantwortet wurde, zeige Ergebnisse
    if (questionIndex === window.parteienData.fragen.length - 1) {
        showTestResults();
        showWahlomatResults(); // Zeige auch Wahlomat-Ergebnisse
    } else {
        // Sonst zur nächsten Frage
        setTimeout(() => showNextQuestion(), 300);
    }
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('prevQuestion');
    const nextButton = document.getElementById('nextQuestion');
    const resultsButton = document.getElementById('showResults');
    
    prevButton.disabled = currentQuestion === 0;
    
    if (currentQuestion === window.parteienData.fragen.length - 1) {
        nextButton.style.display = 'none';
        // Entferne den Ergebnis-Button, da Ergebnisse automatisch angezeigt werden
        resultsButton.style.display = 'none';
    } else {
        nextButton.style.display = 'block';
        resultsButton.style.display = 'none';
    }
}

function showTestResults() {
    const resultsDiv = document.getElementById('testResults');
    const koalitionen = berechneKoalitionen(window.parteienData, window.werteData);
    
    const koalitionenMitUebereinstimmung = koalitionen.map(koalition => {
        const uebereinstimmung = berechneTestUebereinstimmung(koalition.parteien);
        return {
            ...koalition,
            testUebereinstimmung: uebereinstimmung
        };
    });
    
    koalitionenMitUebereinstimmung.sort((a, b) => b.testUebereinstimmung - a.testUebereinstimmung);
    
    // Speichere Ergebnisse
    saveTestResults('coalition', userAnswers, koalitionenMitUebereinstimmung.slice(0, 3), []);
    
    // Zeige Top 5 Ergebnisse
    resultsDiv.innerHTML = `
        <h3>Ihre besten Übereinstimmungen:</h3>
        ${koalitionenMitUebereinstimmung.slice(0, 5).map(koalition => `
            <div class="result-item">
                <p>Parteien: ${koalition.parteien.join(' + ')}</p>
                <p>Übereinstimmung mit Ihren Antworten: ${koalition.testUebereinstimmung.toFixed(1)}%</p>
                <p>Gesamtprozente: ${koalition.prozente.toFixed(1)}%</p>
                <p>Übereinstimmung der Parteien untereinander: ${koalition.uebereinstimmung.toFixed(1)}%</p>
            </div>
        `).join('')}
    `;
}

function berechneTestUebereinstimmung(parteien) {
    let uebereinstimmungen = 0;
    let gesamtFragen = 0;
    
    window.parteienData.fragen.forEach((frage, index) => {
        const userAnswer = userAnswers[index];
        if (userAnswer && userAnswer !== 'm') {
            const parteienAntworten = parteien.map(partei => frage.antworten[partei]);
            if (!parteienAntworten.includes('m')) {
                gesamtFragen++;
                // Prüfe ob die Parteien die gleiche Position wie der User haben
                if (parteienAntworten.every(a => a === userAnswer)) {
                    uebereinstimmungen++;
                }
            }
        }
    });
    
    return gesamtFragen > 0 ? (uebereinstimmungen / gesamtFragen) * 100 : 0;
}

function initializeWahlomatTest() {
    currentWahlomatQuestion = currentSharedQuestion;
    wahlomatAnswers = {...sharedAnswers};
    const container = document.getElementById('wahlomatQuestionContainer');
    const questions = window.parteienData.fragen;
    
    container.innerHTML = questions.map((frage, index) => `
        <div class="question ${index === currentWahlomatQuestion ? 'active' : ''}" data-question="${index}">
            <div class="question-counter">Frage ${index + 1} von ${questions.length}</div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${(index / questions.length) * 100}%"></div>
            </div>
            <h3>${frage.frage}</h3>
            <p>${frage.beschreibung}</p>
            <div class="answer-buttons">
                <button class="answer-button ${wahlomatAnswers[index] === 'j' ? 'selected' : ''}" 
                        data-answer="j" onclick="selectWahlomatAnswer(${index}, 'j')">Ja</button>
                <button class="answer-button ${wahlomatAnswers[index] === 'n' ? 'selected' : ''}" 
                        data-answer="n" onclick="selectWahlomatAnswer(${index}, 'n')">Nein</button>
                <button class="answer-button ${wahlomatAnswers[index] === 'm' ? 'selected' : ''}" 
                        data-answer="m" onclick="selectWahlomatAnswer(${index}, 'm')">Neutral</button>
            </div>
        </div>
    `).join('');
    
    updateWahlomatNavigationButtons();
}

function selectWahlomatAnswer(questionIndex, answer) {
    wahlomatAnswers[questionIndex] = answer;
    sharedAnswers[questionIndex] = answer;
    userAnswers[questionIndex] = answer;
    
    const buttons = document.querySelectorAll(`.question[data-question="${questionIndex}"] .answer-button`);
    buttons.forEach(button => {
        button.classList.remove('selected');
        if (button.dataset.answer === answer) {
            button.classList.add('selected');
        }
    });
    
    // Wenn letzte Frage beantwortet wurde, zeige Ergebnisse
    if (questionIndex === window.parteienData.fragen.length - 1) {
        showWahlomatResults();
        showTestResults(); // Zeige auch Koalitionstest-Ergebnisse
    } else {
        // Sonst zur nächsten Frage
        setTimeout(() => showNextWahlomatQuestion(), 300);
    }
}

function updateWahlomatNavigationButtons() {
    const prevButton = document.getElementById('wahlomatPrevQuestion');
    const nextButton = document.getElementById('wahlomatNextQuestion');
    const resultsButton = document.getElementById('showWahlomatResults');
    
    prevButton.disabled = currentWahlomatQuestion === 0;
    
    if (currentWahlomatQuestion === window.parteienData.fragen.length - 1) {
        nextButton.style.display = 'none';
        // Entferne den Ergebnis-Button, da Ergebnisse automatisch angezeigt werden
        resultsButton.style.display = 'none';
    } else {
        nextButton.style.display = 'block';
        resultsButton.style.display = 'none';
    }
}

// Neue Funktion für die detaillierte Auswertung
function berechneDetailAuswertung(userAnswers, partei) {
    const fragen = window.parteienData.fragen;
    let uebereinstimmungen = 0;
    let teilUebereinstimmungen = 0;
    let nichtUebereinstimmungen = 0;
    let detailPunkte = 0;
    let maxPunkte = 0;
    let details = [];

    fragen.forEach((frage, index) => {
        const userAntwort = userAnswers[index];
        const parteiAntwort = frage.antworten[partei];
        
        // Überspringe Fragen ohne Antwort
        if (!userAntwort || !parteiAntwort) return;
        
        let punkteFormel = 0;
        let status = '';

        // Wahl-O-Mat Formel:
        // Gleiche Antwort: 2 Punkte
        // Neutral vs. Ja/Nein: 1 Punkt
        // Gegensätzliche Antwort: 0 Punkte
        if (userAntwort === parteiAntwort) {
            punkteFormel = 2;
            uebereinstimmungen++;
            status = 'volle-uebereinstimmung';
        } else if (userAntwort === 'm' || parteiAntwort === 'm') {
            punkteFormel = 1;
            teilUebereinstimmungen++;
            status = 'teil-uebereinstimmung';
        } else {
            nichtUebereinstimmungen++;
            status = 'keine-uebereinstimmung';
        }

        detailPunkte += punkteFormel;
        maxPunkte += 2;

        details.push({
            frage: frage.frage,
            beschreibung: frage.beschreibung,
            userAntwort,
            parteiAntwort,
            punkte: punkteFormel,
            status
        });
    });

    const prozentPunkte = (detailPunkte / maxPunkte) * 100;
    const prozentUebereinstimmung = (uebereinstimmungen / (uebereinstimmungen + teilUebereinstimmungen + nichtUebereinstimmungen)) * 100;

    return {
        partei,
        prozentPunkte,
        prozentUebereinstimmung,
        uebereinstimmungen,
        teilUebereinstimmungen,
        nichtUebereinstimmungen,
        details
    };
}

// Modifiziere die showWahlomatResults Funktion
function showWahlomatResults() {
    const resultsDiv = document.getElementById('wahlomatResults');
    const parteien = window.werteData.umfragewerte;
    
    // Berechne detaillierte Auswertung für jede Partei
    const auswertungen = parteien.map(partei => 
        berechneDetailAuswertung(wahlomatAnswers, partei.partei)
    ).sort((a, b) => b.prozentPunkte - a.prozentPunkte);

    let html = '<h3>Ihre Übereinstimmung mit den Parteien</h3>';
    
    // Zeige Gesamtübersicht
    html += '<div class="results-overview">';
    auswertungen.forEach(auswertung => {
        if (auswertung.uebereinstimmungen + auswertung.teilUebereinstimmungen + auswertung.nichtUebereinstimmungen > 0) {
            const parteiInfo = parteien.find(p => p.partei === auswertung.partei);
            html += `
                <div class="party-result-item">
                    <div class="party-result-header">
                        <span class="party-name">${auswertung.partei}</span>
                        <span class="party-percentage">${parteiInfo ? `(${parteiInfo.prozent}%)` : ''}</span>
                    </div>
                    <div class="party-result-bar-container">
                        <div class="party-result-bar" style="width: ${auswertung.prozentPunkte}%"></div>
                        <span class="party-result-text">${auswertung.prozentPunkte.toFixed(1)}%</span>
                    </div>
                    <div class="party-result-details">
                        <span class="match-full">Volle Übereinstimmung: ${auswertung.uebereinstimmungen}</span>
                        <span class="match-partial">Teilweise: ${auswertung.teilUebereinstimmungen}</span>
                        <span class="match-none">Keine: ${auswertung.nichtUebereinstimmungen}</span>
                    </div>
                </div>
            `;
        }
    });
    html += '</div>';

    // Zeige detaillierte Analyse
    html += '<div class="detailed-analysis">';
    html += '<h3>Detaillierte Analyse</h3>';
    
    // Erstelle Tabs für die Top-5-Parteien
    const topParteien = auswertungen.slice(0, 5);
    html += '<div class="analysis-tabs">';
    topParteien.forEach((auswertung, index) => {
        html += `
            <button class="analysis-tab ${index === 0 ? 'active' : ''}" 
                    onclick="showAnalysisTab(${index})">
                ${auswertung.partei}
            </button>
        `;
    });
    html += '</div>';

    // Erstelle Inhalte für jede Partei
    topParteien.forEach((auswertung, index) => {
        html += `
            <div class="analysis-content ${index === 0 ? 'active' : ''}" id="analysis-${index}">
                <h4>${auswertung.partei} - Detailanalyse</h4>
                <div class="analysis-summary">
                    <div class="summary-item">
                        <span class="summary-label">Gesamtübereinstimmung:</span>
                        <span class="summary-value">${auswertung.prozentPunkte.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="analysis-questions">
                    ${auswertung.details.map(detail => `
                        <div class="question-analysis ${detail.status}">
                            <div class="question-text">
                                <strong>${detail.frage}</strong>
                                <p>${detail.beschreibung}</p>
                            </div>
                            <div class="answer-comparison">
                                <div class="your-answer">
                                    Ihre Antwort: <span class="answer-${detail.userAntwort}">
                                        ${getAnswerText(detail.userAntwort)}
                                    </span>
                                </div>
                                <div class="party-answer">
                                    ${auswertung.partei}: <span class="answer-${detail.parteiAntwort}">
                                        ${getAnswerText(detail.parteiAntwort)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    html += '</div>';

    resultsDiv.innerHTML = html;
}

// Funktion zum Umschalten der Analyse-Tabs
function showAnalysisTab(index) {
    document.querySelectorAll('.analysis-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.analysis-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelectorAll('.analysis-tab')[index].classList.add('active');
    document.getElementById(`analysis-${index}`).classList.add('active');
}

// Füge Event-Listener für die Koalitionstyp-Auswahl hinzu
document.addEventListener('DOMContentLoaded', () => {
    ['All', 'Party'].forEach(type => {
        const select = document.getElementById(`coalitionType${type}`);
        if (select) {
            select.addEventListener('change', (e) => {
                const customThreshold = document.getElementById(`customThreshold${type}`);
                if (e.target.value === 'custom') {
                    customThreshold.style.display = 'block';
                } else {
                    customThreshold.style.display = 'none';
                }
            });
        }
    });
});

// Füge diese neue Funktion hinzu
function updateCustomThresholdLabel(type) {
    const slider = document.getElementById(`customThresholdValue${type}`);
    const label = document.getElementById(`customThresholdLabel${type}`);
    label.textContent = `${slider.value}%`;
    
    if (type === 'All') {
        updateKoalitionen();
    } else {
        zeigeKoalitionenFuerPartei();
    }
}

// Funktion zum Speichern der Testergebnisse
function saveTestResults(type, answers, topCoalitions, topParties) {
    const testHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
    
    // Berechne die Ergebnisse für beide Tests
    const koalitionen = berechneKoalitionen(window.parteienData, window.werteData);
    const koalitionenMitUebereinstimmung = koalitionen.map(koalition => {
        const uebereinstimmung = berechneTestUebereinstimmung(koalition.parteien);
        return {
            ...koalition,
            testUebereinstimmung: uebereinstimmung
        };
    }).sort((a, b) => b.testUebereinstimmung - a.testUebereinstimmung);

    // Berechne Parteienübereinstimmung mit der neuen Methode
    const parteien = window.werteData.umfragewerte;
    const parteienMitUebereinstimmung = parteien.map(partei => {
        const auswertung = berechneDetailAuswertung(answers, partei.partei);
        return {
            partei: partei.partei,
            prozent: partei.prozent,
            uebereinstimmung: auswertung.prozentPunkte
        };
    }).sort((a, b) => b.uebereinstimmung - a.uebereinstimmung);

    const testResult = {
        type: type,
        date: new Date().toISOString(),
        answers: answers,
        // Speichere immer beide Ergebnisse
        topCoalitions: koalitionenMitUebereinstimmung.slice(0, 3),
        topParties: parteienMitUebereinstimmung.slice(0, 3)
    };
    
    // Entferne ältere Tests vom gleichen Tag
    const today = new Date().toDateString();
    const filteredHistory = testHistory.filter(test => 
        new Date(test.date).toDateString() !== today
    );
    
    filteredHistory.push(testResult);
    localStorage.setItem('testHistory', JSON.stringify(filteredHistory));
}

// Neue Funktionen für den Wahlsimulator
function initializeWahlsimulator() {
    const erststimme = document.getElementById('erststimme');
    const zweitstimme = document.getElementById('zweitstimme');
    const parteien = window.werteData.umfragewerte;
    
    // Fülle die Dropdown-Menüs mit allen Parteien
    parteien.forEach(partei => {
        // Prüfe ob es eine gültige Partei ist (mit Namen und Prozenten)
        if (partei.partei && partei.prozent !== undefined) {
            const prozentAnzeige = partei.prozent >= 1 ? 
                ` (${partei.prozent}%)` : 
                ` (<1%)`;
            
            erststimme.innerHTML += `
                <option value="${partei.partei}">
                    ${partei.partei}${prozentAnzeige}
                </option>
            `;
            zweitstimme.innerHTML += `
                <option value="${partei.partei}">
                    ${partei.partei}${prozentAnzeige}
                </option>
            `;
        }
    });

    // Gruppiere die Optionen nach Größe der Parteien
    ['erststimme', 'zweitstimme'].forEach(selectId => {
        const select = document.getElementById(selectId);
        const options = Array.from(select.options).slice(1); // Überspringe "Bitte wählen"
        select.innerHTML = '<option value="">Bitte wählen...</option>';

        // Große Parteien (≥5%)
        const groessereFuenfProzent = document.createElement('optgroup');
        groessereFuenfProzent.label = 'Parteien ≥5%';
        
        // Mittlere Parteien (1-5%)
        const groesserEinProzent = document.createElement('optgroup');
        groesserEinProzent.label = 'Parteien 1-5%';
        
        // Kleine Parteien (<1%)
        const kleinerEinProzent = document.createElement('optgroup');
        kleinerEinProzent.label = 'Parteien <1%';

        options.forEach(option => {
            const partei = parteien.find(p => p.partei === option.value);
            if (partei) {
                if (partei.prozent >= 5) {
                    groessereFuenfProzent.appendChild(option.cloneNode(true));
                } else if (partei.prozent >= 1) {
                    groesserEinProzent.appendChild(option.cloneNode(true));
                } else {
                    kleinerEinProzent.appendChild(option.cloneNode(true));
                }
            }
        });

        // Füge die Gruppen hinzu, wenn sie Optionen enthalten
        if (groessereFuenfProzent.children.length > 0) {
            select.appendChild(groessereFuenfProzent);
        }
        if (groesserEinProzent.children.length > 0) {
            select.appendChild(groesserEinProzent);
        }
        if (kleinerEinProzent.children.length > 0) {
            select.appendChild(kleinerEinProzent);
        }
    });

    // Zeige gespeicherte Wahl an, falls vorhanden
    const savedVote = JSON.parse(localStorage.getItem('wahlSimulation') || 'null');
    if (savedVote) {
        erststimme.value = savedVote.erststimme;
        zweitstimme.value = savedVote.zweitstimme;
        showWahlErgebnis(savedVote);
    }
}

function wahlAbgeben() {
    const erststimme = document.getElementById('erststimme').value;
    const zweitstimme = document.getElementById('zweitstimme').value;
    
    if (!erststimme || !zweitstimme) {
        alert('Bitte wählen Sie sowohl Erst- als auch Zweitstimme aus.');
        return;
    }
    
    const wahlSimulation = {
        erststimme,
        zweitstimme,
        datum: new Date().toISOString()
    };
    
    localStorage.setItem('wahlSimulation', JSON.stringify(wahlSimulation));
    showWahlErgebnis(wahlSimulation);
}

function showWahlErgebnis(simulation) {
    const ergebnisDiv = document.getElementById('wahlErgebnis');
    ergebnisDiv.innerHTML = `
        <div class="wahl-ergebnis">
            <h3>Ihre Wahlentscheidung vom ${new Date(simulation.datum).toLocaleDateString()}</h3>
            <p>Erststimme: ${simulation.erststimme}</p>
            <p>Zweitstimme: ${simulation.zweitstimme}</p>
        </div>
    `;
}

// Modifiziere die showTestHistory Funktion
function showTestHistory() {
    const historyDiv = document.getElementById('historyResults');
    const testHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
    const wahlSimulation = JSON.parse(localStorage.getItem('wahlSimulation') || 'null');
    
    let html = '';
    
    // Zeige Wahlsimulation falls vorhanden
    if (wahlSimulation) {
        html += `
            <div class="history-item wahl-simulation">
                <div class="history-header" onclick="toggleHistoryItem('wahl')">
                    <h3>Ihre Wahlentscheidung</h3>
                    <div class="history-preview">
                        Erststimme: ${wahlSimulation.erststimme}, 
                        Zweitstimme: ${wahlSimulation.zweitstimme}
                    </div>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="history-content" id="historyContentwahl" style="display: none;">
                    <p>Abgegeben am: ${new Date(wahlSimulation.datum).toLocaleString()}</p>
                    <div class="wahl-details">
                        <p><strong>Erststimme:</strong> ${wahlSimulation.erststimme}</p>
                        <p><strong>Zweitstimme:</strong> ${wahlSimulation.zweitstimme}</p>
                    </div>
                </div>
            </div>
            <hr>
        `;
    }
    
    // Zeige Testhistorie
    if (testHistory.length === 0) {
        html += '<p>Noch keine Tests durchgeführt.</p>';
    } else {
        testHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        html += testHistory.map((test, index) => {
            // Berechne Übereinstimmung mit Wahlentscheidung
            let wahlUebereinstimmung = 0;
            if (wahlSimulation) {
                const zweitstimmenPartei = test.topParties.find(p => 
                    p.partei === wahlSimulation.zweitstimme
                );
                if (zweitstimmenPartei) {
                    wahlUebereinstimmung = zweitstimmenPartei.uebereinstimmung;
                }
            }
            
            return `
                <div class="history-item" data-index="${index}">
                    <div class="history-header" onclick="toggleHistoryItem(${index})">
                        <h3>${new Date(test.date).toLocaleDateString()}</h3>
                        <div class="history-preview">
                            ${test.topCoalitions.length > 0 ? 
                                `Beste Koalition: ${test.topCoalitions[0].parteien.join(' + ')}` : ''}
                            ${test.topParties.length > 0 ? 
                                `Beste Partei: ${test.topParties[0].partei}` : ''}
                            ${wahlSimulation ? 
                                `<br>Übereinstimmung mit Wahlentscheidung: ${wahlUebereinstimmung.toFixed(1)}%` : ''}
                        </div>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="history-content" id="historyContent${index}" style="display: none;">
                        <p>Durchgeführt am: ${new Date(test.date).toLocaleString()}</p>
                        
                        ${test.topCoalitions.length > 0 ? `
                            <div class="top-results">
                                <h4>Top 3 Koalitionen:</h4>
                                ${test.topCoalitions.map((k, i) => `
                                    <p>${i + 1}. ${k.parteien.join(' + ')} 
                                       (${k.testUebereinstimmung.toFixed(1)}% Übereinstimmung)</p>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        ${test.topParties.length > 0 ? `
                            <div class="top-results">
                                <h4>Top 3 Parteien:</h4>
                                ${test.topParties.map((p, i) => `
                                    <p>${i + 1}. ${p.partei} (${p.uebereinstimmung.toFixed(1)}% Übereinstimmung)</p>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="answers-section">
                            <h4>Ihre Antworten:</h4>
                            <div class="answers-grid">
                                ${Object.entries(test.answers).map(([index, answer]) => `
                                    <div class="answer-item answer-${answer || 'm'}">
                                        <p><strong>${window.parteienData.fragen[index].frage}</strong></p>
                                        <p class="answer-text">${getAnswerText(answer)}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="delete-section">
                            <button class="delete-btn" onclick="deleteHistoryItem(${index})">
                                Dieses Testergebnis löschen
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    historyDiv.innerHTML = html;
    initializeSwipeToDelete();
}

// Neue Funktion zum Ein-/Ausklappen der Historie
function toggleHistoryItem(index) {
    const content = document.getElementById(`historyContent${index}`);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.toggle-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

// Neue Funktion zum Löschen eines Eintrags
function deleteHistoryItem(index) {
    if (confirm('Möchten Sie dieses Testergebnis wirklich löschen?')) {
        const testHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
        testHistory.splice(index, 1);
        localStorage.setItem('testHistory', JSON.stringify(testHistory));
        showTestHistory();
    }
}

// Neue Funktionen für die Wischgeste
function initializeSwipeToDelete() {
    const historyItems = document.querySelectorAll('.history-item');
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartTime = 0;
    let longPressTimer = null;
    const LONG_PRESS_DURATION = 500; // 500ms für Long-Press
    const SWIPE_THRESHOLD = 100; // Pixel für Swipe

    historyItems.forEach(item => {
        item.addEventListener('touchstart', e => {
            // Verhindere Konflikt mit dem Toggle-Click
            if (e.target.closest('.history-header')) return;
            
            touchStartX = e.changedTouches[0].screenX;
            touchStartTime = Date.now();
            
            // Starte Long-Press Timer
            longPressTimer = setTimeout(() => {
                const index = parseInt(item.dataset.index);
                deleteHistoryItem(index);
            }, LONG_PRESS_DURATION);
        }, { passive: true });

        item.addEventListener('touchmove', e => {
            // Verhindere Konflikt mit dem Toggle-Click
            if (e.target.closest('.history-header')) return;
            
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            
            // Wenn Bewegung erkannt wird, cancel Long-Press Timer
            if (Math.abs(diff) > 10) {
                clearTimeout(longPressTimer);
            }
            
            // Zeige Lösch-Indikator bei Wischbewegung
            if (diff > 50) {
                item.classList.add('swiping');
                item.style.transform = `translateX(-${Math.min(diff, SWIPE_THRESHOLD)}px)`;
            } else {
                item.classList.remove('swiping');
                item.style.transform = 'translateX(0)';
            }
        }, { passive: true });

        item.addEventListener('touchend', e => {
            // Verhindere Konflikt mit dem Toggle-Click
            if (e.target.closest('.history-header')) return;
            
            // Cancel Long-Press Timer
            clearTimeout(longPressTimer);
            
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            const touchDuration = Date.now() - touchStartTime;
            
            // Nur löschen wenn es ein echter Swipe war (schnell und weit genug)
            if (diff > SWIPE_THRESHOLD && touchDuration < 300) {
                const index = parseInt(item.dataset.index);
                deleteHistoryItem(index);
            } else {
                item.classList.remove('swiping');
                item.style.transform = 'translateX(0)';
            }
        });

        // Cancel Long-Press wenn Touch abgebrochen wird
        item.addEventListener('touchcancel', () => {
            clearTimeout(longPressTimer);
            item.classList.remove('swiping');
            item.style.transform = 'translateX(0)';
        });
    });
}

// Neue Funktion für das Dashboard
function updateDashboard() {
    const wahlSimulation = JSON.parse(localStorage.getItem('wahlSimulation') || 'null');
    const testHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
    
    // Wahlentscheidung Card
    const wahlCard = document.getElementById('wahlCard');
    if (wahlSimulation) {
        wahlCard.querySelector('.card-content').innerHTML = `
            <div class="stat-item">
                <span>Erststimme:</span>
                <strong>${wahlSimulation.erststimme}</strong>
            </div>
            <div class="stat-item">
                <span>Zweitstimme:</span>
                <strong>${wahlSimulation.zweitstimme}</strong>
            </div>
            <div class="stat-item">
                <span>Entschieden am:</span>
                <span>${new Date(wahlSimulation.datum).toLocaleDateString()}</span>
            </div>
        `;
    } else {
        wahlCard.querySelector('.card-content').innerHTML = `
            <p>Noch keine Wahlentscheidung getroffen</p>
            <button onclick="switchTab('wahlsimulator')" class="dashboard-btn">
                Zur Wahlsimulation
            </button>
        `;
    }

    // Beste Übereinstimmungen Card
    const matchCard = document.getElementById('matchCard');
    if (testHistory.length > 0) {
        const latestTest = testHistory[testHistory.length - 1];
        matchCard.querySelector('.card-content').innerHTML = `
            <h4>Parteien</h4>
            ${latestTest.topParties.map((party, index) => `
                <div class="stat-item">
                    <span>${index + 1}. ${party.partei}</span>
                    <div class="match-info">
                        <div class="match-bar">
                            <div class="match-bar-fill" style="width: ${party.uebereinstimmung}%"></div>
                        </div>
                        <span>${party.uebereinstimmung.toFixed(1)}%</span>
                    </div>
                </div>
            `).join('')}
            
            <h4>Koalitionen</h4>
            ${latestTest.topCoalitions.map((coalition, index) => `
                <div class="stat-item">
                    <span>${index + 1}. ${coalition.parteien.join(' + ')}</span>
                    <div class="match-info">
                        <div class="match-bar">
                            <div class="match-bar-fill" 
                                 style="width: ${coalition.testUebereinstimmung}%"></div>
                        </div>
                        <span>${coalition.testUebereinstimmung.toFixed(1)}%</span>
                    </div>
                </div>
            `).join('')}
        `;
    } else {
        matchCard.querySelector('.card-content').innerHTML = `
            <p>Noch keine Tests durchgeführt</p>
            <button onclick="switchTab('test')" class="dashboard-btn">
                Zum Koalitionstest
            </button>
        `;
    }

    // Positionen Card
    const positionsCard = document.getElementById('positionsCard');
    if (testHistory.length > 0) {
        const latestTest = testHistory[testHistory.length - 1];
        const positions = analyzePositions(latestTest.answers);
        positionsCard.querySelector('.card-content').innerHTML = `
            <div class="positions-grid">
                ${positions.map(pos => `
                    <div class="position-tag ${pos.type}" title="${getAnswerText(pos.answer)}">
                        ${pos.topic}
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        positionsCard.querySelector('.card-content').innerHTML = `
            <p>Noch keine Positionen erfasst</p>
        `;
    }

    // Trend Card
    const trendCard = document.getElementById('trendCard');
    if (testHistory.length > 1) {
        const trends = analyzeTrends(testHistory);
        trendCard.querySelector('.card-content').innerHTML = `
            <div class="trends-list">
                ${trends.map(trend => `
                    <div class="stat-item">
                        <span>${trend.party}</span>
                        <span class="trend-arrow ${trend.direction}">
                            ${getTrendArrow(trend.direction)}
                            ${Math.abs(trend.change).toFixed(1)}%
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        trendCard.querySelector('.card-content').innerHTML = `
            <p>Noch nicht genug Daten für Trendanalyse</p>
        `;
    }
}

// Hilfsfunktionen für das Dashboard
function analyzePositions(answers) {
    const positions = [];
    Object.entries(answers).forEach(([index, answer]) => {
        const frage = window.parteienData.fragen[index];
        positions.push({
            topic: frage.frage,
            type: answer === 'j' ? 'position-yes' : 
                  answer === 'n' ? 'position-no' : 
                  'position-neutral',
            answer: answer
        });
    });
    return positions;
}

function analyzeTrends(history) {
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    return latest.topParties.map(party => {
        const previousMatch = previous.topParties.find(p => p.partei === party.partei);
        const change = previousMatch ? 
            party.uebereinstimmung - previousMatch.uebereinstimmung : 0;
        
        return {
            party: party.partei,
            change,
            direction: change > 0 ? 'trend-up' : 
                      change < 0 ? 'trend-down' : 'trend-neutral'
        };
    });
}

function getTrendArrow(direction) {
    switch(direction) {
        case 'trend-up': return '↑';
        case 'trend-down': return '↓';
        default: return '→';
    }
}