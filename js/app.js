(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ===== 學習紀錄（localStorage） ===== */
  const STORE_KEY = 'literacy-kh3a-v1';
  const state = load();
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (d && Array.isArray(d.learned) && d.wrong) return d;
    } catch (e) { /* 忽略 */ }
    return { learned: [], wrong: {} };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
    renderStars();
  }
  const isLearned = (c) => state.learned.includes(c);

  /* ===== 共用工具 ===== */
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const charsOf = (unitId) =>
    unitId === 'all' ? ALL_CHARS : ALL_CHARS.filter((ch) => ch.unit === unitId);
  const findChar = (c) => ALL_CHARS.find((ch) => ch.c === c);
  // 直式注音：符號由上往下排，聲調放在右側，輕聲點放在最上面
  // （不用 CSS 直排，避免聲調符號被轉向而看錯）
  function zyHTML(zy) {
    const light = zy.startsWith('˙');
    let body = zy.replace('˙', '');
    let tone = '';
    if (/[ˊˇˋ]$/.test(body)) { tone = body.slice(-1); body = body.slice(0, -1); }
    const syms = [...body].map((s, i, all) =>
      i === all.length - 1 && tone
        ? `<span class="zy-last">${s}<span class="zy-tone">${tone}</span></span>`
        : `<span>${s}</span>`).join('');
    return `<span class="zy-col">${light ? '<span class="zy-light">˙</span>' : ''}${syms}</span>`;
  }
  const writeChars = (unitId) => charsOf(unitId).filter((ch) => !ch.r);
  const unitLabel = (u) => `第${u.num}課${u.name ? ' ' + u.name : ''}`;

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }

  // 語音朗讀：使用瀏覽器內建的中文（台灣）語音
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('這個瀏覽器不支援朗讀'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    u.rate = 0.8;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-') === 'zh-TW');
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  function renderStars() {
    $('#star-count').textContent = state.learned.length;
  }

  /* ===== 分頁切換 ===== */
  function showView(name) {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    if (name === 'home') renderHome();
    if (name === 'review') renderReview();
    if (name === 'write') resizeCanvas();
    if (name !== 'game') stopGame();
    if (name === 'game') showGameSetup();
    window.scrollTo(0, 0);
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));

  // 單元下拉選單
  ['#cards-unit', '#write-unit', '#quiz-unit', '#game-unit'].forEach((sel) => {
    const el = $(sel);
    UNITS.forEach((u) => el.add(new Option(unitLabel(u), u.id)));
  });

  /* ===== 首頁 ===== */
  function renderHome() {
    const grid = $('#unit-grid');
    grid.innerHTML = '';
    UNITS.forEach((u) => {
      const done = u.chars.filter((ch) => isLearned(ch.c)).length;
      const btn = document.createElement('button');
      btn.className = 'unit-card';
      btn.innerHTML = `
        <span class="lesson-badge">第${u.num}課</span>
        ${u.name ? `<h3>${u.name}</h3>` : ''}
        <div class="preview">${u.chars.filter((ch) => !ch.r).map((ch) => ch.c).join('')}</div>
        <div class="preview read">${u.chars.filter((ch) => ch.r).map((ch) => ch.c).join('')}</div>
        <div class="bar"><div style="width:${(done / u.chars.length) * 100}%"></div></div>
        <small>已學會 ${done} / ${u.chars.length} 字</small>`;
      btn.addEventListener('click', () => {
        cards.unit = u.id;
        cards.idx = 0;
        $('#cards-unit').value = u.id;
        renderCard();
        showView('cards');
      });
      grid.appendChild(btn);
    });
  }

  /* ===== 生字卡 ===== */
  const cards = { unit: UNITS[0].id, idx: 0 };
  const curCard = () => charsOf(cards.unit)[cards.idx];

  function renderCard() {
    const list = charsOf(cards.unit);
    const ch = curCard();
    const strip = $('#char-strip');
    strip.innerHTML = '';
    list.forEach((item, i) => {
      const b = document.createElement('button');
      b.className = 'chip' + (item.r ? ' read' : '') + (i === cards.idx ? ' active' : '') + (isLearned(item.c) ? ' learned' : '');
      b.textContent = item.c;
      b.addEventListener('click', () => { cards.idx = i; renderCard(); });
      strip.appendChild(b);
    });
    $('#cc-char').textContent = ch.c;
    $('#cc-kind').textContent = ch.r ? '認讀字' : '寫字';
    $('#cc-kind').classList.toggle('read', !!ch.r);
    $('#cc-zy').innerHTML = zyHTML(ch.zy);
    $('#cc-zy').setAttribute('aria-label', ch.zy);
    $('#cc-bs').textContent = ch.bs;
    $('#cc-bh').textContent = ch.bh + ' 畫';
    const words = $('#cc-words');
    words.innerHTML = '';
    ch.words.forEach((w) => {
      const b = document.createElement('button');
      b.className = 'word';
      b.textContent = '🔊 ' + w;
      b.addEventListener('click', () => speak(w));
      words.appendChild(b);
    });
    $('#cc-s').innerHTML = ch.s.replaceAll(ch.c, `<mark>${ch.c}</mark>`);
    const lb = $('#cc-learned');
    lb.textContent = isLearned(ch.c) ? '⭐ 已學會' : '☆ 我學會了';
    lb.classList.toggle('done', isLearned(ch.c));
  }

  $('#cards-unit').addEventListener('change', (e) => { cards.unit = e.target.value; cards.idx = 0; renderCard(); });
  $('#cc-prev').addEventListener('click', () => {
    const n = charsOf(cards.unit).length;
    cards.idx = (cards.idx - 1 + n) % n;
    renderCard();
  });
  $('#cc-next').addEventListener('click', () => {
    cards.idx = (cards.idx + 1) % charsOf(cards.unit).length;
    renderCard();
  });
  $('#cc-speak').addEventListener('click', () => {
    const ch = curCard();
    speak(`${ch.c}，${ch.words[0]}的${ch.c}。${ch.s}`);
  });
  $('#cc-learned').addEventListener('click', () => {
    const c = curCard().c;
    if (isLearned(c)) {
      state.learned = state.learned.filter((x) => x !== c);
    } else {
      state.learned.push(c);
      toast(`太棒了！學會「${c}」，得到一顆星 ⭐`);
    }
    save();
    renderCard();
  });

  /* ===== 寫字練習 ===== */
  const write = { unit: UNITS[0].id, idx: 0 };
  const canvas = $('#write-canvas');
  const ctx = canvas.getContext('2d');
  let strokes = [];   // 每一筆是一串點
  let drawing = null;

  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const curWrite = () => writeChars(write.unit)[write.idx];

  function resizeCanvas() {
    const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
    if (size && canvas.width !== size) { canvas.width = size; canvas.height = size; }
    drawCanvas();
  }

  function drawCanvas() {
    const s = canvas.width;
    ctx.clearRect(0, 0, s, s);
    // 田字格虛線
    ctx.save();
    ctx.strokeStyle = cssVar('--grid');
    ctx.lineWidth = Math.max(1, s / 300);
    ctx.setLineDash([s / 40, s / 60]);
    ctx.beginPath();
    ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s);
    ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2);
    ctx.stroke();
    ctx.restore();
    // 描紅
    if ($('#write-guide').checked) {
      ctx.fillStyle = cssVar('--guide');
      ctx.font = `${s * 0.82}px "BiauKai","DFKai-SB","TW-Kai","Kaiti TC","KaiTi",serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(curWrite().c, s / 2, s / 2 + s * 0.03);
    }
    // 使用者筆跡
    ctx.strokeStyle = cssVar('--text');
    ctx.lineWidth = s / 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokes.forEach((pts) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
      if (pts.length === 1) ctx.lineTo(pts[0][0] * s + 0.1, pts[0][1] * s);
      ctx.stroke();
    });
  }

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    drawing = [point(e)];
    strokes.push(drawing);
    drawCanvas();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    drawing.push(point(e));
    drawCanvas();
  });
  ['pointerup', 'pointercancel'].forEach((ev) => canvas.addEventListener(ev, () => { drawing = null; }));

  function renderWrite() {
    const ch = curWrite();
    strokes = [];
    $('#w-char').textContent = ch.c;
    $('#w-info').textContent = `${ch.zy}・部首「${ch.bs}」・${ch.bh} 畫`;
    drawCanvas();
  }
  $('#write-unit').addEventListener('change', (e) => { write.unit = e.target.value; write.idx = 0; renderWrite(); });
  $('#write-guide').addEventListener('change', drawCanvas);
  $('#w-clear').addEventListener('click', () => { strokes = []; drawCanvas(); });
  $('#w-speak').addEventListener('click', () => { const ch = curWrite(); speak(`${ch.c}，${ch.words[0]}的${ch.c}`); });
  $('#w-prev').addEventListener('click', () => {
    const n = writeChars(write.unit).length;
    write.idx = (write.idx - 1 + n) % n;
    renderWrite();
  });
  $('#w-next').addEventListener('click', () => {
    write.idx = (write.idx + 1) % writeChars(write.unit).length;
    renderWrite();
  });
  window.addEventListener('resize', () => { if ($('#view-write').classList.contains('active')) resizeCanvas(); });

  /* ===== 小測驗 ===== */
  const QUIZ_LEN = 10;
  const quiz = { questions: [], i: 0, score: 0, answered: false, lastSetup: null };

  // 從 pool 中挑出 n 個與 answer 不同的干擾選項
  function distractors(pool, answer, n, key) {
    const seen = new Set([answer]);
    const out = [];
    for (const item of shuffle(pool)) {
      const v = key(item);
      if (!seen.has(v)) { seen.add(v); out.push(v); }
      if (out.length === n) break;
    }
    return out;
  }

  function makeQuestion(ch, type) {
    if (type === 'mix') type = ['zy', 'bs', 'fill'][Math.floor(Math.random() * 3)];
    if (type === 'zy') {
      // 避開同音字當干擾選項
      const pool = ALL_CHARS.filter((x) => x.zy !== ch.zy);
      return {
        ch, label: '看注音，選出正確的字',
        prompt: `${ch.zy}<br><small>（${ch.words[0].replaceAll(ch.c, '＿')}）</small>`,
        answer: ch.c, options: shuffle([ch.c, ...distractors(pool, ch.c, 3, (x) => x.c)]),
      };
    }
    if (type === 'bs') {
      return {
        ch, label: '這個字的部首是什麼？',
        prompt: `<span class="kai">${ch.c}</span>`,
        answer: ch.bs, options: shuffle([ch.bs, ...distractors(ALL_CHARS, ch.bs, 3, (x) => x.bs)]),
      };
    }
    // 句子填空：干擾選項優先用同單元的字
    const same = ALL_CHARS.filter((x) => x.unit === ch.unit && !ch.s.includes(x.c));
    const others = ALL_CHARS.filter((x) => x.unit !== ch.unit && !ch.s.includes(x.c));
    let opts = distractors(same, ch.c, 3, (x) => x.c);
    if (opts.length < 3) opts = opts.concat(distractors(others, ch.c, 3 - opts.length, (x) => x.c));
    return {
      ch, label: '選出句子裡缺少的字', sentence: true,
      prompt: ch.s.replaceAll(ch.c, '<span class="blank"></span>'),
      answer: ch.c, options: shuffle([ch.c, ...opts]),
    };
  }

  function startQuiz(pool, type) {
    if (!pool.length) { toast('沒有可以測驗的字喔！'); return; }
    quiz.lastSetup = { pool, type };
    const picked = [];
    while (picked.length < QUIZ_LEN) picked.push(...shuffle(pool));
    quiz.questions = picked.slice(0, Math.min(QUIZ_LEN, Math.max(pool.length, 5))).map((ch) => makeQuestion(ch, type));
    quiz.i = 0;
    quiz.score = 0;
    $('#quiz-setup').classList.add('hidden');
    $('#quiz-result').classList.add('hidden');
    $('#quiz-play').classList.remove('hidden');
    showView('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz.questions[quiz.i];
    quiz.answered = false;
    $('#q-progress').textContent = `第 ${quiz.i + 1} / ${quiz.questions.length} 題`;
    $('#q-score').textContent = `答對 ${quiz.score} 題`;
    $('#q-bar').style.width = `${(quiz.i / quiz.questions.length) * 100}%`;
    $('#q-label').textContent = q.label;
    const p = $('#q-prompt');
    p.innerHTML = q.prompt;
    p.classList.toggle('sentence-q', !!q.sentence);
    $('#q-feedback').textContent = '';
    $('#q-next').classList.add('hidden');
    const box = $('#q-options');
    box.innerHTML = '';
    q.options.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = o;
      b.addEventListener('click', () => answer(b, o));
      box.appendChild(b);
    });
  }

  function answer(btn, choice) {
    if (quiz.answered) return;
    quiz.answered = true;
    const q = quiz.questions[quiz.i];
    const c = q.ch.c;
    $$('.opt').forEach((b) => {
      b.disabled = true;
      if (b.textContent === q.answer) b.classList.add('correct');
    });
    if (choice === q.answer) {
      quiz.score++;
      $('#q-feedback').textContent = '✅ 答對了！' + (state.wrong[c] ? `「${c}」已從錯字本移除` : '');
      delete state.wrong[c];
    } else {
      btn.classList.add('wrong');
      $('#q-feedback').textContent = `❌ 正確答案是「${q.answer}」（${c}：${q.ch.zy}，${q.ch.words[0]}）`;
      state.wrong[c] = (state.wrong[c] || 0) + 1;
    }
    save();
    $('#q-score').textContent = `答對 ${quiz.score} 題`;
    const next = $('#q-next');
    next.textContent = quiz.i + 1 < quiz.questions.length ? '下一題 ▶' : '看結果 🎉';
    next.classList.remove('hidden');
    next.focus();
  }

  $('#q-next').addEventListener('click', () => {
    quiz.i++;
    if (quiz.i < quiz.questions.length) { renderQuestion(); return; }
    const total = quiz.questions.length;
    const ratio = quiz.score / total;
    $('#quiz-play').classList.add('hidden');
    $('#quiz-result').classList.remove('hidden');
    $('#r-emoji').textContent = ratio === 1 ? '🏆' : ratio >= 0.7 ? '🎉' : '💪';
    $('#r-title').textContent = ratio === 1 ? '全部答對，太厲害了！' : ratio >= 0.7 ? '做得很好！' : '再加油，多練習幾次！';
    $('#r-text').textContent = `${total} 題答對 ${quiz.score} 題。答錯的字已收進錯字本。`;
  });

  $('#r-again').addEventListener('click', () => {
    $('#quiz-result').classList.add('hidden');
    $('#quiz-setup').classList.remove('hidden');
  });

  $$('.type-btn').forEach((b) =>
    b.addEventListener('click', () => startQuiz(charsOf($('#quiz-unit').value), b.dataset.type)));

  /* ===== 貓咪接魚 ===== */
  const BEST_KEY = 'literacy-kh3a-game-best';
  const LANES = 3;
  const game = { on: false, lane: 1, score: 0, hearts: 3, pool: [], wave: null, raf: 0, timer: 0, last: null };
  const laneX = (i) => `${((i * 2 + 1) / (LANES * 2)) * 100}%`;

  function getBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function setBest(n) {
    try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* 忽略 */ }
  }

  function showGameSetup() {
    $('#game-best').textContent = getBest();
    $('#game-setup').classList.remove('hidden');
    $('#game-play').classList.add('hidden');
    $('#game-over').classList.add('hidden');
  }

  function stopGame() {
    game.on = false;
    cancelAnimationFrame(game.raf);
    clearTimeout(game.timer);
    $$('#g-field .fish').forEach((f) => f.remove());
  }

  function moveCat(i) {
    game.lane = Math.max(0, Math.min(LANES - 1, i));
    $('#g-cat').style.left = laneX(game.lane);
  }

  function setCatMood(mood) {
    const cat = $('#g-cat');
    cat.classList.remove('happy', 'sad');
    if (mood) {
      void cat.offsetWidth; // 重新觸發動畫
      cat.classList.add(mood);
    }
    $('#g-bubble').textContent = mood === 'happy' ? '💖' : mood === 'sad' ? '💦' : '';
  }

  function renderHUD() {
    $('#g-hearts').textContent = '❤️'.repeat(game.hearts) + '🤍'.repeat(3 - game.hearts);
    $('#g-score').textContent = game.score;
  }

  function startGame() {
    stopGame();
    game.pool = charsOf($('#game-unit').value);
    game.score = 0;
    game.hearts = 3;
    game.last = null;
    game.on = true;
    $('#game-setup').classList.add('hidden');
    $('#game-over').classList.add('hidden');
    $('#game-play').classList.remove('hidden');
    moveCat(1);
    setCatMood(null);
    renderHUD();
    $('#g-msg').textContent = '點跑道移動小貓';
    nextWave();
  }

  function nextWave() {
    if (!game.on) return;
    const pool = game.pool;
    let target;
    do { target = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && target === game.last);
    game.last = target;
    // 干擾選項：不同字、不同讀音，優先從同一範圍挑
    const ok = (x) => x.c !== target.c && x.zy !== target.zy;
    let others = shuffle(pool.filter(ok)).slice(0, LANES - 1);
    if (others.length < LANES - 1) others = others.concat(shuffle(ALL_CHARS.filter((x) => ok(x) && !others.includes(x))).slice(0, LANES - 1 - others.length));
    const opts = shuffle([target, ...others]);

    $('#g-zy').textContent = target.zy;
    $('#g-word').textContent = `（${target.words[0].replaceAll(target.c, '＿')}）`;
    const field = $('#g-field');
    const fishes = opts.map((ch, i) => {
      const f = document.createElement('div');
      f.className = 'fish';
      f.style.left = laneX(i);
      f.innerHTML = `<span>${ch.c}</span>`;
      field.appendChild(f);
      return { ch, el: f };
    });
    const dur = Math.max(2800, 6500 - game.score * 200);
    game.wave = { target, fishes, start: performance.now(), dur };
    game.raf = requestAnimationFrame(fall);
  }

  function fall(now) {
    if (!game.on || !game.wave) return;
    const w = game.wave;
    const field = $('#g-field');
    const catH = $('#g-cat').offsetHeight;
    const fishH = w.fishes[0].el.offsetHeight;
    const travel = field.clientHeight - catH * 0.75 - fishH;
    const p = Math.min(1, (now - w.start) / w.dur);
    w.fishes.forEach((f) => { f.el.style.transform = `translate(-50%, ${p * travel}px)`; });
    if (p < 1) { game.raf = requestAnimationFrame(fall); return; }
    landWave();
  }

  function landWave() {
    const w = game.wave;
    game.wave = null;
    const caught = w.fishes[game.lane];
    const c = w.target.c;
    w.fishes.forEach((f) => {
      if (f.ch === w.target) f.el.classList.add('good');
      else if (f === caught) f.el.classList.add('bad');
    });
    if (caught.ch === w.target) {
      game.score++;
      caught.el.classList.add('eaten');
      setCatMood('happy');
      $('#g-msg').textContent = `好吃！接到「${c}」 ${w.target.words[0]}`;
      delete state.wrong[c];
    } else {
      game.hearts--;
      setCatMood('sad');
      $('#g-msg').textContent = `哎呀！${w.target.zy} 是「${c}」（${w.target.words[0]}）`;
      state.wrong[c] = (state.wrong[c] || 0) + 1;
    }
    save();
    renderHUD();
    game.timer = setTimeout(() => {
      w.fishes.forEach((f) => f.el.remove());
      if (game.hearts <= 0) gameOver(); else nextWave();
    }, caught.ch === w.target ? 700 : 1600);
  }

  function gameOver() {
    stopGame();
    const best = getBest();
    const isRecord = game.score > best;
    if (isRecord) setBest(game.score);
    $('#game-play').classList.add('hidden');
    $('#game-over').classList.remove('hidden');
    $('#go-title').textContent = isRecord ? '🎉 新紀錄！' : '遊戲結束！';
    $('#go-text').textContent = `小貓吃到 ${game.score} 條魚` + (isRecord ? '，打破紀錄了！' : `（最高紀錄 ${best} 條）`) + '。接錯的字已收進錯字本。';
  }

  $('#game-start').addEventListener('click', startGame);
  $('#go-again').addEventListener('click', startGame);
  $('#go-review').addEventListener('click', () => showView('review'));
  $('#g-speak').addEventListener('click', () => {
    const t = game.last;
    if (t) speak(`${t.c}，${t.words[0]}的${t.c}`);
  });
  $$('#g-field .lane').forEach((l) => l.addEventListener('pointerdown', () => moveCat(Number(l.dataset.lane))));
  document.addEventListener('keydown', (e) => {
    if (!game.on) return;
    if (e.key === 'ArrowLeft') { moveCat(game.lane - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { moveCat(game.lane + 1); e.preventDefault(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.on) { stopGame(); showGameSetup(); } });

  /* ===== 錯字本 ===== */
  function renderReview() {
    const list = $('#review-list');
    const items = Object.entries(state.wrong).sort((a, b) => b[1] - a[1]);
    list.innerHTML = items.length ? '' : '<p class="empty">目前沒有錯字，好棒！🎉</p>';
    items.forEach(([c, n]) => {
      const ch = findChar(c);
      if (!ch) return;
      const b = document.createElement('button');
      b.className = 'review-item';
      b.innerHTML = `<span class="kai">${c}</span>${ch.zy}<br><small>錯 ${n} 次</small>`;
      b.addEventListener('click', () => {
        cards.unit = ch.unit;
        cards.idx = charsOf(ch.unit).findIndex((x) => x.c === c);
        $('#cards-unit').value = ch.unit;
        renderCard();
        showView('cards');
      });
      list.appendChild(b);
    });
  }
  $('#review-quiz').addEventListener('click', () => {
    const pool = Object.keys(state.wrong).map(findChar).filter(Boolean);
    startQuiz(pool, 'mix');
  });
  $('#reset-all').addEventListener('click', () => {
    if (!confirm('確定要清除所有星星和錯字紀錄嗎？')) return;
    state.learned = [];
    state.wrong = {};
    save();
    renderReview();
    toast('已重設學習紀錄');
  });

  /* ===== 啟動 ===== */
  $('#book-name').textContent = BOOK;
  renderStars();
  renderHome();
  renderCard();
  renderWrite();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
