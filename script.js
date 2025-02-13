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
    document.getElementById(`${tabName}-koalitionen`).classList.add('active');

    // Synchronisiere die Tests beim Tab-Wechsel
    if (tabName === 'test') {
        currentQuestion = currentSharedQuestion;
        userAnswers = {...sharedAnswers};
        initializeTest();
    } else if (tabName === 'wahlomat') {
        currentWahlomatQuestion = currentSharedQuestion;
        wahlomatAnswers = {...sharedAnswers};
        initializeWahlomatTest();
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
    
    if (selectedParties.length === 0) {
        document.getElementById('comparisonTable').innerHTML = 
            '<p>Bitte wählen Sie mindestens eine Partei zum Vergleich aus.</p>';
        return;
    }

    const tableHTML = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Frage</th>
                    ${selectedParties.map(party => `<th>${party}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${window.parteienData.fragen.map(frage => `
                    <tr>
                        <td class="question-cell">${frage.frage}</td>
                        ${selectedParties.map(party => `
                            <td class="answer-${frage.antworten[party]}">${getAnswerText(frage.antworten[party])}</td>
                        `).join('')}
                    </tr>
                    <tr>
                        <td class="description-cell" colspan="${selectedParties.length + 1}">
                            ${frage.beschreibung}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="legend">
            <div class="legend-item">
                <span class="answer-j">Ja</span>
            </div>
            <div class="legend-item">
                <span class="answer-n">Nein</span>
            </div>
            <div class="legend-item">
                <span class="answer-m">Neutral/Keine Angabe</span>
            </div>
        </div>
    `;

    document.getElementById('comparisonTable').innerHTML = tableHTML;
}

function getAnswerText(answer) {
    const answers = {
        'j': 'Ja',
        'n': 'Nein',
        'm': 'Neutral'
    };
    return answers[answer] || answer;
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
    
    // Berechne Übereinstimmung mit jeder Koalition
    const koalitionenMitUebereinstimmung = koalitionen.map(koalition => {
        const uebereinstimmung = berechneTestUebereinstimmung(koalition.parteien);
        return {
            ...koalition,
            testUebereinstimmung: uebereinstimmung
        };
    });
    
    // Sortiere nach Übereinstimmung
    koalitionenMitUebereinstimmung.sort((a, b) => b.testUebereinstimmung - a.testUebereinstimmung);
    
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

function showWahlomatResults() {
    const resultsDiv = document.getElementById('wahlomatResults');
    const parteien = window.werteData.umfragewerte;
    
    // Berechne Übereinstimmung mit jeder Partei
    const parteienMitUebereinstimmung = parteien.map(partei => {
        const uebereinstimmung = berechneParteienUebereinstimmung(partei.partei);
        return {
            ...partei,
            uebereinstimmung
        };
    });
    
    // Sortiere nach Übereinstimmung
    parteienMitUebereinstimmung.sort((a, b) => b.uebereinstimmung - a.uebereinstimmung);
    
    // Generiere HTML für die Ergebnisse
    resultsDiv.innerHTML = `
        <h3>Ihre Übereinstimmung mit den Parteien:</h3>
        ${parteienMitUebereinstimmung.map(partei => `
            <div class="party-result-item">
                <div class="party-result-bar" style="width: ${partei.uebereinstimmung}%"></div>
                <div class="party-result-text">
                    <span>${partei.partei}</span>
                    <span class="party-result-percentage">${partei.uebereinstimmung.toFixed(1)}%</span>
                </div>
                <div class="party-details">
                    Aktuelle Umfragewerte: ${partei.prozent}%
                    <button class="show-answers-btn" onclick="togglePartyAnswers('${partei.partei}')">
                        Details anzeigen
                    </button>
                </div>
                <div id="answers-${partei.partei}" class="party-answers">
                    ${generateAnswerComparison(partei.partei)}
                </div>
            </div>
        `).join('')}
    `;
}

function berechneParteienUebereinstimmung(partei) {
    let uebereinstimmungen = 0;
    let gesamtFragen = 0;
    
    window.parteienData.fragen.forEach((frage, index) => {
        const userAnswer = wahlomatAnswers[index];
        const partyAnswer = frage.antworten[partei];
        
        if (userAnswer && userAnswer !== 'm' && partyAnswer !== 'm') {
            gesamtFragen++;
            if (userAnswer === partyAnswer) {
                uebereinstimmungen++;
            }
        }
    });
    
    return gesamtFragen > 0 ? (uebereinstimmungen / gesamtFragen) * 100 : 0;
}

function generateAnswerComparison(partei) {
    return window.parteienData.fragen.map((frage, index) => {
        const userAnswer = wahlomatAnswers[index];
        const partyAnswer = frage.antworten[partei];
        const match = userAnswer === partyAnswer;
        
        return `
            <div class="answer-comparison ${match ? 'match' : 'mismatch'}">
                <strong>${frage.frage}</strong><br>
                Ihre Antwort: ${getAnswerText(userAnswer)}<br>
                ${partei}: ${getAnswerText(partyAnswer)}
            </div>
        `;
    }).join('<hr>');
}

function togglePartyAnswers(partei) {
    const answersDiv = document.getElementById(`answers-${partei}`);
    answersDiv.classList.toggle('show');
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