// Node-Harness: Dokumentiert, welche Top-2-Paare die Leihstimmen-Warnung
// (Szenario B der tactical-voting.md) in den echten Wahldaten auslösen.
// Spiegelbild von calculateTacticalVoting() + istKoalitionsMehrheitSicher()
// aus script.js (nach der Sperrklausel-Kopplung, Issue 2026-08-09).
//
// Aufruf: node tools/tactical-harness.js
const fs = require('fs');
const path = require('path');

const ELECTIONS = ['btw2029', 'berlin-2026', 'ltw-sachsen-anhalt-2026', 'mv-2026'];

function istKoalitionAusgeschlossen(parteienNamen, ausschluss) {
    for (const name of parteienNamen) {
        const verweigert = ausschluss[name];
        if (Array.isArray(verweigert) && verweigert.some(x => parteienNamen.includes(x))) return true;
    }
    return false;
}

// Abgebildet auf istKoalitionsMehrheitSicher(a, b, polls, threshold)
function istKoalitionsMehrheitSicher(a, b, polls, threshold, ausschluss, maxSize) {
    if (!istKoalitionAusgeschlossen([a, b], ausschluss) && (polls[a] || 0) + (polls[b] || 0) > 50) return true;
    const rest = Object.keys(polls).filter(p =>
        p !== 'Andere' && p !== a && p !== b && (polls[p] || 0) >= threshold);
    const n = rest.length;
    for (let mask = 1; mask < (1 << n); mask++) {
        const add = rest.filter((_, i) => mask & (1 << i));
        if (add.length + 2 > maxSize) continue;
        const combo = [a, b, ...add];
        const sum = combo.reduce((s, p) => s + (polls[p] || 0), 0);
        if (sum > 50 && !istKoalitionAusgeschlossen(combo, ausschluss)) return true;
    }
    return false;
}

// Alte Logik (vor der Umstellung): share > 50 && (4 ≤ Paaranteil ≤ 6)
function alteLogik(a, b, pa, pb, eligibleSum, threshold) {
    const share = eligibleSum > 0 ? (((pa + pb) / eligibleSum) * 100) : 0;
    const schwankt = [a, b].some(p => { const v = (p === a ? pa : pb); return v >= 4 && v <= 6; });
    return share > 50 && schwankt;
}

let altTotal = 0, neuTotal = 0;
const ergaenzung = [];
for (const eid of ELECTIONS) {
    const dir = path.join('elections', eid);
    const werte = JSON.parse(fs.readFileSync(path.join(dir, 'werte.json'), 'utf8'));
    const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
    const threshold = (config.thresholds && config.thresholds.sperrklausel) || 5;
    const maxSize = (config.thresholds && config.thresholds.maxCoalitionSize) || 4;
    const ausschluss = config.koalitionsausschluss || {};
    const polls = {};
    werte.umfragewerte.forEach(p => { if (p.partei !== 'Andere') polls[p.partei] = p.prozent; });
    const pollOf = p => (polls[p] || 0);
    const parties = Object.keys(polls);
    const eligibleSum = parties.filter(p => pollOf(p) >= threshold).reduce((s, p) => s + pollOf(p), 0);

    const negative = [], treffer = [];
    for (let i = 0; i < parties.length; i++) {
        for (let j = 0; j < parties.length; j++) {
            if (i === j) continue;
            const a = parties[i], b = parties[j];
            const pa = pollOf(a), pb = pollOf(b);
            if (alteLogik(a, b, pa, pb, eligibleSum, threshold)) negative.push(`${a}|${b}`);
            const smaller = pa <= pb ? a : b;
            const smallerPoll = Math.min(pa, pb);
            const biggerPoll = Math.max(pa, pb);
            const naheHuerde = smallerPoll >= threshold - 1 && smallerPoll < threshold + 1;
            const partnerSicher = biggerPoll >= threshold;
            const mehrheitSicher = istKoalitionsMehrheitSicher(a, b, polls, threshold, ausschluss, maxSize);
            if (naheHuerde && partnerSicher && mehrheitSicher) treffer.push(`${a}|${b} (${pa.toFixed(1)}% + ${pb.toFixed(1)}%)`);
        }
    }
    altTotal += negative.length; neuTotal += treffer.length;
    ergaenzung.push({ eid, treffer: treffer.length, hitliste: treffer });
    console.log(`${eid} (threshold ${threshold}): nicht mehr ausgelöst: ${negative.length > 0 ? negative.join(', ') : '-'}`);
    console.log(`  → Leihstimmen-Warnung feuert jetzt bei ${treffer.length} Paar(en): ${treffer.length ? treffer.join('; ') : '-'}`);
}

console.log(`\nGesamt über 4 Wahlen: ${neuTotal} von 168 Top-2-Paaren (vorher: ${altTotal}).`);
if (ergaenzung.some(e => e.treffer > 0)) {
    console.log('\nMehrere Wahlen betroffen:');
    for (const e of ergaenzung) if (e.treffer > 0) console.log(`  - ${e.eid}: ${e.hitliste.join('; ')}`);
}