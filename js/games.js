/* 貓咪遊戲樂園：貓咪接魚、貓咪打老鼠、貓咪翻翻樂
 * 共用工具來自 js/app.js 的 window.LIT */
(() => {
  'use strict';

  const { state, save, shuffle, charsOf, speak, showView } = window.LIT;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ===== 小貓圖案 ===== */
  const CAT_SVG = `<svg class="cat-svg" viewBox="110 60 292 250" aria-hidden="true">
    <path d="M150 168 L172 70 L232 126 Z" fill="#F5A04E"/><path d="M168 150 L178 100 L210 128 Z" fill="#FFC9A6"/>
    <path d="M362 168 L340 70 L280 126 Z" fill="#F5A04E"/><path d="M344 150 L334 100 L302 128 Z" fill="#FFC9A6"/>
    <ellipse cx="256" cy="200" rx="132" ry="104" fill="#F7AE5E"/>
    <path d="M226 110 q30 -10 60 0 M236 130 q20 -6 40 0" stroke="#E08A3A" stroke-width="8" fill="none" stroke-linecap="round"/>
    <g class="eyes-happy"><path d="M184 196 q20 -22 40 0 M288 196 q20 -22 40 0" stroke="#3B2A22" stroke-width="9" fill="none" stroke-linecap="round"/></g>
    <g class="eyes-sad"><circle cx="204" cy="190" r="13" fill="#3B2A22"/><circle cx="308" cy="190" r="13" fill="#3B2A22"/><path d="M196 206 q-6 18 4 22 q8 -6 -4 -22z" fill="#7EC8F2"/></g>
    <path d="M248 222 h16 l-8 9 z" fill="#E86F7E"/>
    <path d="M256 231 q-10 16 -24 8 M256 231 q10 16 24 8" stroke="#3B2A22" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="176" cy="234" rx="20" ry="12" fill="#FF8FA3" opacity=".7"/><ellipse cx="336" cy="234" rx="20" ry="12" fill="#FF8FA3" opacity=".7"/>
    <path d="M120 214h56M124 236h52M392 214h-56M388 236h-52" stroke="#8A5A3A" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="188" cy="284" rx="34" ry="22" fill="#F7AE5E"/><ellipse cx="324" cy="284" rx="34" ry="22" fill="#F7AE5E"/>
  </svg>`;
  $$('.cat-slot').forEach((el) => { el.innerHTML = CAT_SVG; });

  const MOUSE_SVG = `<svg class="mouse-svg" viewBox="0 0 120 90" aria-hidden="true">
    <circle cx="26" cy="30" r="22" fill="#9aa5b1"/><circle cx="26" cy="30" r="13" fill="#f6b8c8"/>
    <circle cx="94" cy="30" r="22" fill="#9aa5b1"/><circle cx="94" cy="30" r="13" fill="#f6b8c8"/>
    <ellipse cx="60" cy="56" rx="40" ry="34" fill="#b8c2cc"/>
    <g class="m-eyes"><circle cx="46" cy="50" r="5" fill="#1f2933"/><circle cx="74" cy="50" r="5" fill="#1f2933"/></g>
    <g class="m-dizzy"><path d="M41 45l10 10M51 45l-10 10M69 45l10 10M79 45l-10 10" stroke="#1f2933" stroke-width="3" stroke-linecap="round"/></g>
    <ellipse cx="60" cy="64" rx="6" ry="4.5" fill="#e86f7e"/>
    <path d="M30 62h18M30 70h18M90 62H72M90 70H72" stroke="#6b7785" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

  /* ===== 音效（瀏覽器內建合成音，可關閉） ===== */
  const SOUND_KEY = 'literacy-kh3a-sound';
  const Sound = {
    on: (() => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { return true; } })(),
    ctx: null,
    notes: {
      good: [[660, 0.09], [880, 0.14]],
      bad: [[300, 0.12], [200, 0.2]],
      pop: [[520, 0.06]],
      flip: [[420, 0.04]],
      win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]],
    },
    play(kind) {
      if (!this.on) return;
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        let t = this.ctx.currentTime;
        for (const [freq, dur] of this.notes[kind]) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = kind === 'bad' ? 'triangle' : 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
          osc.connect(gain).connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + dur);
          t += dur * 0.9;
        }
      } catch (e) { /* 不支援就安靜 */ }
    },
  };
  function renderSoundBtn() {
    const b = $('#sound-toggle');
    b.textContent = Sound.on ? '🔊 音效開' : '🔇 音效關';
    b.setAttribute('aria-pressed', String(Sound.on));
  }
  $('#sound-toggle').addEventListener('click', () => {
    Sound.on = !Sound.on;
    try { localStorage.setItem(SOUND_KEY, Sound.on ? 'on' : 'off'); } catch (e) { /* 忽略 */ }
    renderSoundBtn();
    Sound.play('pop');
  });

  /* ===== 撒花 ===== */
  function confetti() {
    const box = document.createElement('div');
    box.className = 'confetti';
    const icons = ['🐟', '⭐', '🐾', '💖', '🎉', '😺'];
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('span');
      s.textContent = icons[i % icons.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      s.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4000);
  }

  /* ===== 最高紀錄 ===== */
  const BEST_KEY = 'literacy-kh3a-games';
  function loadBest() {
    let b = {};
    try { b = JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { /* 忽略 */ }
    // 舊版只存接魚分數
    try {
      const old = Number(localStorage.getItem('literacy-kh3a-game-best'));
      if (old && !b.fish) b.fish = old;
    } catch (e) { /* 忽略 */ }
    return b;
  }
  const best = loadBest();
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) { /* 忽略 */ }
  }

  /* ===== 共用 ===== */
  let current = null;           // 目前的遊戲：'fish'、'mole'、'memory'
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  let rafId = 0;

  const pool = () => charsOf($('#game-unit').value);
  const hint = (ch) => `（${ch.words[0].replaceAll(ch.c, '＿')}）`;
  // 挑出 n 個和目標「不同字、不同讀音」的字
  function distractors(target, n, from) {
    const ok = (x) => x.c !== target.c && x.zy !== target.zy;
    let out = shuffle(from.filter(ok)).slice(0, n);
    if (out.length < n) {
      out = out.concat(shuffle(ALL_CHARS.filter((x) => ok(x) && !out.includes(x))).slice(0, n - out.length));
    }
    return out;
  }
  function pickTarget(list, last) {
    let t;
    do { t = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && t === last);
    return t;
  }
  function markWrong(c) { state.wrong[c] = (state.wrong[c] || 0) + 1; save(); }
  function markRight(c) { if (state.wrong[c]) { delete state.wrong[c]; save(); } }

  function showScreen(id) {
    ['#game-menu', '#fish-play', '#mole-play', '#memory-play', '#game-over'].forEach((s) =>
      $(s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
  }

  function stopAll() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    cancelAnimationFrame(rafId);
    fish.on = false;
    mole.on = false;
    memory.on = false;
    $$('#g-field .fish').forEach((f) => f.remove());
    mole.holes.forEach(popDown);
  }

  function showMenu() {
    stopAll();
    current = null;
    $('#best-fish').textContent = best.fish ? `最高 ${best.fish} 條魚` : '';
    $('#best-mole').textContent = best.mole ? `最高 ${best.mole} 分` : '';
    $('#best-memory').textContent = best.memory ? `最少 ${best.memory} 次` : '';
    renderSoundBtn();
    showScreen('#game-menu');
  }

  function start(name) {
    stopAll();
    current = name;
    if (name === 'fish') fishStart();
    if (name === 'mole') moleStart();
    if (name === 'memory') memoryStart();
  }

  // lowerIsBetter：翻翻樂比的是「次數越少越好」
  function finish({ emoji, title, text, score, lowerIsBetter }) {
    stopAll();
    const prev = best[current];
    const isRecord = score > 0 && (prev === undefined || (lowerIsBetter ? score < prev : score > prev));
    if (isRecord) { best[current] = score; saveBest(); }
    $('#go-emoji').textContent = isRecord ? '🏆' : emoji;
    $('#go-title').textContent = isRecord ? `🎉 新紀錄！${title}` : title;
    $('#go-text').textContent = text;
    showScreen('#game-over');
    if (isRecord) { Sound.play('win'); confetti(); }
  }

  $$('.game-pick').forEach((b) => b.addEventListener('click', () => { Sound.play('pop'); start(b.dataset.game); }));
  $$('.game-back').forEach((b) => b.addEventListener('click', showMenu));
  $('#go-again').addEventListener('click', () => start(current));
  $('#go-menu').addEventListener('click', showMenu);
  $('#go-review').addEventListener('click', () => showView('review'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && current) showMenu(); });

  /* =================================================================
   * 遊戲一：貓咪接魚
   * ================================================================= */
  const LANES = 3;
  const fish = { on: false, lane: 1, score: 0, hearts: 3, list: [], wave: null, last: null };
  const laneX = (i) => `${((i * 2 + 1) / (LANES * 2)) * 100}%`;

  function moveCat(i) {
    fish.lane = Math.max(0, Math.min(LANES - 1, i));
    $('#g-cat').style.left = laneX(fish.lane);
  }
  function catMood(mood) {
    const cat = $('#g-cat');
    cat.classList.remove('happy', 'sad');
    if (mood) { void cat.offsetWidth; cat.classList.add(mood); }
    $('#g-bubble').textContent = mood === 'happy' ? '💖' : mood === 'sad' ? '💦' : '';
  }
  function fishHUD() {
    $('#g-hearts').textContent = '❤️'.repeat(fish.hearts) + '🤍'.repeat(3 - fish.hearts);
    $('#g-score').textContent = fish.score;
  }

  function fishStart() {
    Object.assign(fish, { on: true, score: 0, hearts: 3, list: pool(), wave: null, last: null });
    showScreen('#fish-play');
    moveCat(1);
    catMood(null);
    fishHUD();
    $('#g-msg').textContent = '點跑道移動小貓';
    fishWave();
  }

  function fishWave() {
    if (!fish.on) return;
    const target = pickTarget(fish.list, fish.last);
    fish.last = target;
    const opts = shuffle([target, ...distractors(target, LANES - 1, fish.list)]);
    $('#g-zy').textContent = target.zy;
    $('#g-word').textContent = hint(target);
    const field = $('#g-field');
    const fishes = opts.map((ch, i) => {
      const f = document.createElement('div');
      f.className = 'fish';
      f.style.left = laneX(i);
      f.innerHTML = `<span>${ch.c}</span>`;
      field.appendChild(f);
      return { ch, el: f };
    });
    fish.wave = { target, fishes, start: performance.now(), dur: Math.max(2800, 6500 - fish.score * 200) };
    rafId = requestAnimationFrame(fishFall);
  }

  function fishFall(now) {
    if (!fish.on || !fish.wave) return;
    const w = fish.wave;
    const travel = $('#g-field').clientHeight - $('#g-cat').offsetHeight * 0.75 - w.fishes[0].el.offsetHeight;
    const p = Math.min(1, (now - w.start) / w.dur);
    w.fishes.forEach((f) => { f.el.style.transform = `translate(-50%, ${p * travel}px)`; });
    if (p < 1) { rafId = requestAnimationFrame(fishFall); return; }
    fishLand();
  }

  function fishLand() {
    const w = fish.wave;
    fish.wave = null;
    const caught = w.fishes[fish.lane];
    const t = w.target;
    w.fishes.forEach((f) => {
      if (f.ch === t) f.el.classList.add('good');
      else if (f === caught) f.el.classList.add('bad');
    });
    const right = caught.ch === t;
    if (right) {
      fish.score++;
      caught.el.classList.add('eaten');
      catMood('happy');
      Sound.play('good');
      $('#g-msg').textContent = `好吃！接到「${t.c}」 ${t.words[0]}`;
      markRight(t.c);
    } else {
      fish.hearts--;
      catMood('sad');
      Sound.play('bad');
      $('#g-msg').textContent = `哎呀！${t.zy} 是「${t.c}」（${t.words[0]}）`;
      markWrong(t.c);
    }
    fishHUD();
    later(() => {
      w.fishes.forEach((f) => f.el.remove());
      if (fish.hearts > 0) { fishWave(); return; }
      finish({
        emoji: '😺', title: '遊戲結束！', score: fish.score,
        text: `小貓吃到 ${fish.score} 條魚！` + (best.fish ? `（最高紀錄 ${Math.max(best.fish, fish.score)} 條）` : '') + '接錯的字已收進錯字本。',
      });
    }, right ? 700 : 1600);
  }

  $('#g-speak').addEventListener('click', () => { const t = fish.last; if (t) speak(`${t.c}，${t.words[0]}的${t.c}`); });
  $$('#g-field .lane').forEach((l) => l.addEventListener('pointerdown', () => moveCat(Number(l.dataset.lane))));
  document.addEventListener('keydown', (e) => {
    if (!fish.on) return;
    if (e.key === 'ArrowLeft') { moveCat(fish.lane - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { moveCat(fish.lane + 1); e.preventDefault(); }
  });

  /* =================================================================
   * 遊戲二：貓咪打老鼠（60 秒）
   * ================================================================= */
  const HOLES = 9;
  const MOLE_TIME = 60;
  const mole = { on: false, score: 0, combo: 0, list: [], target: null, endAt: 0, holes: [], missed: new Set() };

  function buildHoles() {
    const grid = $('#m-grid');
    grid.innerHTML = '';
    mole.holes = [];
    for (let i = 0; i < HOLES; i++) {
      const hole = document.createElement('div');
      hole.className = 'hole';
      hole.innerHTML = `<div class="mouse">${MOUSE_SVG}<span class="sign"></span></div><span class="pow"></span>`;
      const m = { el: hole, mouse: hole.querySelector('.mouse'), sign: hole.querySelector('.sign'), ch: null, up: false, hideAt: 0 };
      hole.addEventListener('pointerdown', () => moleHit(m));
      grid.appendChild(hole);
      mole.holes.push(m);
    }
  }

  function moleTarget() {
    mole.target = pickTarget(mole.list, mole.target);
    $('#m-zy').textContent = mole.target.zy;
    $('#m-word').textContent = hint(mole.target);
    const p = $('#mole-play .game-prompt');
    p.classList.remove('flash');
    void p.offsetWidth;
    p.classList.add('flash');
  }

  function moleHUD() {
    const left = Math.max(0, (mole.endAt - performance.now()) / 1000);
    $('#m-time').textContent = Math.ceil(left);
    $('#m-bar').style.width = `${(left / MOLE_TIME) * 100}%`;
    $('#m-score').textContent = mole.score;
    return left;
  }

  function moleStart() {
    Object.assign(mole, { on: true, score: 0, combo: 0, list: pool(), target: null, endAt: performance.now() + MOLE_TIME * 1000, missed: new Set() });
    showScreen('#mole-play');
    buildHoles();
    moleTarget();
    $('#m-msg').textContent = '找到拿著正確國字的老鼠，點牠！';
    rafId = requestAnimationFrame(moleTick);
    moleSpawnLoop();
  }

  function popUp(m, ch, stay) {
    m.ch = ch;
    m.sign.textContent = ch.c;
    m.el.classList.remove('hit', 'oops');
    m.up = true;
    m.hideAt = performance.now() + stay;
    m.mouse.classList.add('up');
  }
  function popDown(m) {
    m.up = false;
    m.mouse.classList.remove('up');
  }

  function moleSpawnLoop() {
    if (!mole.on) return;
    const upCount = mole.holes.filter((m) => m.up).length;
    const empty = mole.holes.filter((m) => !m.up);
    if (upCount < 3 && empty.length) {
      const hole = empty[Math.floor(Math.random() * empty.length)];
      const targetUp = mole.holes.some((m) => m.up && m.ch === mole.target);
      const showTarget = Math.random() < (targetUp ? 0.2 : 0.55);
      const ch = showTarget ? mole.target : distractors(mole.target, 1, mole.list)[0];
      popUp(hole, ch, Math.max(1200, 2200 - mole.score * 40));
      Sound.play('pop');
    }
    later(moleSpawnLoop, Math.max(450, 750 - mole.score * 10) + Math.random() * 250);
  }

  function moleTick(now) {
    if (!mole.on) return;
    mole.holes.forEach((m) => { if (m.up && now >= m.hideAt) popDown(m); });
    if (moleHUD() <= 0) { moleEnd(); return; }
    rafId = requestAnimationFrame(moleTick);
  }

  function moleHit(m) {
    if (!mole.on || !m.up) return;
    popDown(m);
    const t = mole.target;
    if (m.ch === t) {
      mole.combo++;
      const bonus = mole.combo >= 3 ? 1 : 0;
      mole.score += 1 + bonus;
      m.el.classList.add('hit');
      m.el.querySelector('.pow').textContent = bonus ? `+2 連擊${mole.combo}！` : '+1';
      Sound.play('good');
      $('#m-msg').textContent = `打到了！「${t.c}」 ${t.words[0]}` + (mole.combo >= 3 ? ` 🔥 連擊 ${mole.combo}` : '');
      markRight(t.c);
      moleTarget();
    } else {
      mole.combo = 0;
      mole.endAt -= 3000;
      m.el.classList.add('oops');
      m.el.querySelector('.pow').textContent = '-3 秒';
      Sound.play('bad');
      $('#m-msg').textContent = `那是「${m.ch.c}」！要找 ${t.zy}「${t.c}」`;
      if (!mole.missed.has(t.c)) { mole.missed.add(t.c); markWrong(t.c); }
    }
    moleHUD();
  }

  function moleEnd() {
    mole.holes.forEach(popDown);
    finish({
      emoji: '🐭', title: '時間到！', score: mole.score,
      text: `小貓得到 ${mole.score} 分！` + (best.mole ? `（最高紀錄 ${Math.max(best.mole, mole.score)} 分）` : '') +
        (mole.missed.size ? `打錯的字已收進錯字本。` : '一隻都沒打錯，太厲害了！'),
    });
  }

  $('#m-speak').addEventListener('click', () => { const t = mole.target; if (t) speak(`${t.c}，${t.words[0]}的${t.c}`); });

  /* =================================================================
   * 遊戲三：貓咪翻翻樂（國字配注音）
   * ================================================================= */
  const PAIRS = 6;
  const memory = { on: false, moves: 0, matched: 0, open: [], lock: false, startAt: 0 };

  function memoryPickChars() {
    const out = [];
    const seenZy = new Set();
    for (const ch of shuffle(pool()).concat(shuffle(ALL_CHARS))) {
      if (out.includes(ch) || seenZy.has(ch.zy)) continue;
      out.push(ch);
      seenZy.add(ch.zy);
      if (out.length === PAIRS) break;
    }
    return out;
  }

  function memoryStart() {
    Object.assign(memory, { on: true, moves: 0, matched: 0, open: [], lock: false, startAt: performance.now() });
    showScreen('#memory-play');
    const cards = shuffle(memoryPickChars().flatMap((ch) => [{ ch, kind: 'char' }, { ch, kind: 'zy' }]));
    const grid = $('#mm-grid');
    grid.innerHTML = '';
    cards.forEach((card) => {
      const b = document.createElement('button');
      b.className = 'mcard';
      b.setAttribute('aria-label', '翻牌');
      const front = card.kind === 'char'
        ? `<span class="m-char">${card.ch.c}</span>`
        : `<span class="m-zy">${card.ch.zy}</span><small>${hint(card.ch)}</small>`;
      b.innerHTML = `<span class="mface mback">🐾</span><span class="mface mfront ${card.kind}">${front}</span>`;
      b.addEventListener('click', () => memoryFlip(b, card));
      grid.appendChild(b);
    });
    $('#mm-moves').textContent = 0;
    $('#mm-time').textContent = 0;
    memoryClock();
  }

  function memoryClock() {
    if (!memory.on) return;
    $('#mm-time').textContent = Math.floor((performance.now() - memory.startAt) / 1000);
    later(memoryClock, 250);
  }

  function memoryFlip(el, card) {
    if (!memory.on || memory.lock || el.classList.contains('flipped')) return;
    el.classList.add('flipped');
    Sound.play('flip');
    memory.open.push({ el, card });
    if (memory.open.length < 2) return;

    memory.moves++;
    $('#mm-moves').textContent = memory.moves;
    const [a, b] = memory.open;
    memory.open = [];
    if (a.card.ch === b.card.ch) {
      memory.matched++;
      [a, b].forEach((x) => x.el.classList.add('matched'));
      Sound.play('good');
      speak(`${a.card.ch.c}，${a.card.ch.words[0]}的${a.card.ch.c}`);
      if (memory.matched === PAIRS) {
        const secs = Math.floor((performance.now() - memory.startAt) / 1000);
        const stars = memory.moves <= 9 ? '⭐⭐⭐' : memory.moves <= 13 ? '⭐⭐' : '⭐';
        later(() => finish({
          emoji: '🃏', title: `全部配對成功！${stars}`, score: memory.moves, lowerIsBetter: true,
          text: `翻了 ${memory.moves} 次、花了 ${secs} 秒。` + (best.memory ? `（最少紀錄 ${Math.min(best.memory, memory.moves)} 次）` : '') + '次數越少越厲害喔！',
        }), 900);
      }
    } else {
      memory.lock = true;
      [a, b].forEach((x) => x.el.classList.add('nope'));
      later(() => {
        [a, b].forEach((x) => x.el.classList.remove('flipped', 'nope'));
        memory.lock = false;
      }, 1000);
    }
  }

  /* ===== 給 app.js 呼叫 ===== */
  window.Games = {
    enter: showMenu,
    leave: () => { stopAll(); current = null; },
    sound: Sound,
    confetti,
  };
})();
