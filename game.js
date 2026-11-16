(() => {
  'use strict';

  const MODES = {
    easy: { label: 'EASY', min: 0, max: 5, repeats: true, multiplier: 1, note: 'Digits 0–5 · repeats allowed' },
    medium: { label: 'MEDIUM', min: 0, max: 9, repeats: false, multiplier: 1.5, note: 'Digits 0–9 · no repeated digits' },
    hard: { label: 'HARD', min: 1, max: 9, repeats: false, multiplier: 2, note: 'Digits 1–9 · no repeated digits' }
  };
  const MAX_ATTEMPTS = 10;
  const BEST_KEY = 'cyberhack-best-scores-v1';
  const $ = (id) => document.getElementById(id);
  const els = {
    mode: $('difficulty'), modeNote: $('mode-note'), bestMode: $('best-mode'), bestScore: $('best-score'),
    pips: $('pips'), attemptsLeft: $('attempts-left'), input: $('guess-input'), submit: $('submit-guess'),
    validation: $('validation'), inputHelp: $('input-help'), history: $('history'), logCount: $('log-count'), result: $('result-banner'),
    score: $('score'), scoreCaption: $('score-caption'), restart: $('restart'), newGame: $('new-game'), session: $('session-id')
  };

  let mode = 'medium';
  let secret = '';
  let attempts = [];
  let finished = false;
  let score = 0;

  function makeSecret(selectedMode) {
    const rules = MODES[selectedMode];
    const digits = [];
    while (digits.length < 4) {
      const digit = String(Math.floor(Math.random() * (rules.max - rules.min + 1)) + rules.min);
      if (rules.repeats || !digits.includes(digit)) digits.push(digit);
    }
    return digits.join('');
  }

  function readBestScores() {
    try {
      const stored = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch { return {}; }
  }

  function saveBest(selectedMode, value) {
    const best = readBestScores();
    if (!Number.isFinite(best[selectedMode]) || value > best[selectedMode]) {
      best[selectedMode] = value;
      try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch { /* Game remains playable if storage is unavailable. */ }
    }
  }

  function renderBest() {
    const best = readBestScores()[mode];
    els.bestMode.textContent = `${MODES[mode].label} MODE`;
    els.bestScore.textContent = Number.isFinite(best) ? String(best).padStart(4, '0') : '—';
  }

  function renderPips() {
    const remaining = MAX_ATTEMPTS - attempts.length;
    els.attemptsLeft.textContent = String(remaining);
    els.pips.setAttribute('aria-label', `${remaining} attempts remaining`);
    els.pips.replaceChildren(...Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
      const pip = document.createElement('i');
      pip.className = `pip ${i < remaining ? 'active' : 'used'}`;
      pip.setAttribute('aria-hidden', 'true');
      return pip;
    }));
  }

  function renderHistory() {
    els.history.replaceChildren();
    attempts.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = `history-row ${index === attempts.length - 1 ? 'new' : ''}`;
      row.innerHTML = `<span class="row-number">${String(index + 1).padStart(2, '0')}</span><strong class="guess-digits">${entry.guess}</strong><span class="hints"><span class="hint exact">● ${entry.exact} exact</span><span class="hint misplaced">◉ ${entry.misplaced} misplaced</span></span>`;
      els.history.append(row);
    });
    els.logCount.textContent = `${attempts.length} ${attempts.length === 1 ? 'ENTRY' : 'ENTRIES'}`;
    els.history.scrollTop = els.history.scrollHeight;
  }

  function updateMode() {
    mode = els.mode.value;
    els.modeNote.textContent = MODES[mode].note;
    renderBest();
    if (!finished && attempts.length === 0) els.inputHelp.textContent = `4 digits · ${mode === 'easy' ? 'repeats allowed' : `no repeats · digits ${MODES[mode].min}–${MODES[mode].max}`}`;
  }

  function resetRun({ newCode = false } = {}) {
    if (newCode || !secret) secret = makeSecret(mode);
    attempts = [];
    finished = false;
    score = 0;
    els.score.textContent = '0000';
    els.scoreCaption.textContent = 'Crack the code to earn points';
    els.result.hidden = true;
    els.result.className = 'result-banner';
    els.validation.textContent = '';
    els.input.disabled = false;
    els.submit.disabled = false;
    els.mode.disabled = false;
    els.input.value = '';
    els.input.placeholder = '_ _ _ _';
    els.input.focus({ preventScroll: true });
    els.session.textContent = Math.random().toString(36).slice(2, 6).toUpperCase();
    renderPips();
    renderHistory();
    renderBest();
  }

  function checkGuess() {
    if (finished) return;
    const guess = els.input.value.trim();
    const rules = MODES[mode];
    els.validation.textContent = '';
    if (!/^\d{4}$/.test(guess)) {
      els.validation.textContent = 'Enter exactly four digits to submit.';
      els.input.classList.remove('shake');
      void els.input.offsetWidth;
      els.input.classList.add('shake');
      els.input.focus();
      return;
    }
    if ([...guess].some((d) => Number(d) < rules.min || Number(d) > rules.max)) {
      els.validation.textContent = `This protocol uses digits ${rules.min} through ${rules.max}.`;
      els.input.focus();
      return;
    }
    if (!rules.repeats && new Set(guess).size !== 4) {
      els.validation.textContent = 'This protocol requires four unique digits.';
      els.input.focus();
      return;
    }

    let exact = 0;
    const remainingSecret = [];
    const remainingGuess = [];
    for (let i = 0; i < 4; i++) {
      if (guess[i] === secret[i]) exact++;
      else { remainingSecret.push(secret[i]); remainingGuess.push(guess[i]); }
    }
    let misplaced = 0;
    for (const digit of remainingGuess) {
      const found = remainingSecret.indexOf(digit);
      if (found !== -1) { misplaced++; remainingSecret.splice(found, 1); }
    }
    attempts.push({ guess, exact, misplaced });
    renderHistory();
    renderPips();
    els.input.value = '';

    if (exact === 4) {
      finished = true;
      const remaining = MAX_ATTEMPTS - attempts.length;
      score = Math.round((100 + remaining * 50) * MODES[mode].multiplier);
      els.score.textContent = String(score).padStart(4, '0');
      els.scoreCaption.textContent = `Access granted · ${MODES[mode].label} protocol`;
      saveBest(mode, score);
      renderBest();
      els.result.innerHTML = `<strong>ACCESS GRANTED</strong> — Code cracked in ${attempts.length} ${attempts.length === 1 ? 'attempt' : 'attempts'}. +${score} points.`;
      els.result.hidden = false;
      els.input.disabled = true;
      els.submit.disabled = true;
      els.mode.disabled = true;
    } else if (attempts.length >= MAX_ATTEMPTS) {
      finished = true;
      els.result.classList.add('fail');
      els.result.textContent = `ACCESS DENIED — Signal sealed. The code was ${secret}. Start a new code to try again.`;
      els.result.hidden = false;
      els.input.disabled = true;
      els.submit.disabled = true;
      els.mode.disabled = true;
    }
  }

  els.mode.addEventListener('change', () => { updateMode(); resetRun({ newCode: true }); });
  els.submit.addEventListener('click', checkGuess);
  els.input.addEventListener('keydown', (event) => { if (event.key === 'Enter') checkGuess(); });
  els.input.addEventListener('input', () => { els.input.value = els.input.value.replace(/\D/g, '').slice(0, 4); });
  els.restart.addEventListener('click', () => resetRun());
  els.newGame.addEventListener('click', () => resetRun({ newCode: true }));
  updateMode();
  resetRun({ newCode: true });
})();

