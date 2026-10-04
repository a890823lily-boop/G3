/* 成語：成語卡、解釋配對、句子填空（資料在 js/idioms.js） */
(() => {
  'use strict';

  const { shuffle, speak, toast } = window.LIT;
  const { sound, confetti } = window.Games;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const setSel = $('#idiom-set');
  IDIOM_SETS.forEach((s) => setSel.add(new Option(`成語 ${s.name}`, s.id)));
  const items = () => IDIOM_SETS.find((s) => s.id === setSel.value).items;
  let mode = 'learn';

  // 成語每個字下面標注音
  const rubyHTML = (it) => [...it.w].map((c, i) =>
    `<span class="ic"><span class="ic-c">${c}</span><span class="ic-z">${it.zy.split(' ')[i] || ''}</span></span>`).join('');
  const highlight = (s, w, cls = 'mark') => s.replaceAll(w, `<mark class="${cls}">${w}</mark>`);

  function setMode(m) {
    mode = m;
    $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    ['learn', 'match', 'fill'].forEach((x) => $(`#idiom-${x}`).classList.toggle('hidden', x !== m));
    if (m === 'learn') renderLearn();
    if (m === 'match') startMatch();
    if (m === 'fill') startFill();
  }
  $$('.seg-btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setSel.addEventListener('change', () => setMode(mode));

  /* ===== 成語卡 ===== */
  function renderLearn() {
    const box = $('#idiom-learn');
    box.innerHTML = '';
    items().forEach((it, n) => {
      const card = document.createElement('article');
      card.className = 'card idiom-card';
      card.innerHTML = `
        <div class="idiom-head"><span class="idiom-no">${n + 1}</span><div class="idiom-word">${rubyHTML(it)}</div></div>
        <p class="idiom-mean">💡 ${it.mean}</p>
        <p class="idiom-s">✏️ ${highlight(it.s[0], it.w)}</p>
        <div class="card-actions"><button class="btn primary">🔊 唸給我聽</button></div>`;
      card.querySelector('button').addEventListener('click', () => speak(`${it.w}。${it.mean}。${it.s[0]}`));
      box.appendChild(card);
    });
  }

  /* ===== 解釋配對 ===== */
  const PAIR_COLORS = ['#ffd6a5', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff', '#fdffb6', '#a0c4ff', '#ffadad'];
  const match = { picked: null, done: 0, mistakes: 0, total: 0 };

  function startMatch() {
    const list = items();
    Object.assign(match, { picked: null, done: 0, mistakes: 0, total: list.length });
    const words = $('#match-words');
    const means = $('#match-means');
    words.innerHTML = '';
    means.innerHTML = '';
    shuffle(list).forEach((it) => {
      const b = document.createElement('button');
      b.className = 'match-item word';
      b.textContent = it.w;
      b.dataset.w = it.w;
      b.addEventListener('click', () => pick(b));
      b.addEventListener('animationend', () => b.classList.remove('shake'));
      words.appendChild(b);
    });
    shuffle(list).forEach((it) => {
      const b = document.createElement('button');
      b.className = 'match-item mean';
      b.textContent = it.mean;
      b.dataset.w = it.w;
      b.addEventListener('click', () => pick(b));
      b.addEventListener('animationend', () => b.classList.remove('shake'));
      means.appendChild(b);
    });
    $('#match-msg').textContent = '';
    $('#match-again').classList.add('hidden');
  }

  function pick(b) {
    if (b.classList.contains('paired')) return;
    const prev = match.picked;
    // 還沒選、或點了同一邊：換成這一個
    if (!prev || prev.classList.contains('word') === b.classList.contains('word')) {
      if (prev) prev.classList.remove('picked');
      match.picked = b;
      b.classList.add('picked');
      sound.play('flip');
      if (b.classList.contains('word')) speak(b.textContent);
      return;
    }
    match.picked = null;
    prev.classList.remove('picked');
    if (prev.dataset.w === b.dataset.w) {
      const color = PAIR_COLORS[match.done % PAIR_COLORS.length];
      [prev, b].forEach((x) => { x.classList.add('paired'); x.style.background = color; x.disabled = true; });
      match.done++;
      sound.play('good');
      const it = items().find((x) => x.w === b.dataset.w);
      $('#match-msg').textContent = `✅ 「${it.w}」：${it.mean}`;
      if (match.done === match.total) {
        const perfect = match.mistakes === 0;
        $('#match-msg').textContent = perfect
          ? '🏆 全部配對成功，一次都沒錯，太厲害了！'
          : `🎉 全部配對成功！配錯了 ${match.mistakes} 次，再玩一次挑戰零失誤！`;
        $('#match-again').classList.remove('hidden');
        if (perfect) { sound.play('win'); confetti(); }
      }
    } else {
      match.mistakes++;
      sound.play('bad');
      [prev, b].forEach((x) => { x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake'); });
      $('#match-msg').textContent = '❌ 不是這一對，再想一想！';
    }
  }
  $('#match-again').addEventListener('click', startMatch);

  /* ===== 句子填空 ===== */
  const fill = { qs: [], i: 0, score: 0, wrong: [], answered: false };
  const BLANK = '<span class="blank4">？？？？</span>';

  function startFill() {
    const list = items();
    fill.qs = shuffle(list).map((it) => ({
      it,
      s: it.s[Math.floor(Math.random() * it.s.length)],
      options: shuffle([it, ...shuffle(list.filter((x) => x !== it)).slice(0, 3)]),
    }));
    Object.assign(fill, { i: 0, score: 0, wrong: [] });
    $('#fill-play').classList.remove('hidden');
    $('#fill-result').classList.add('hidden');
    renderFill();
  }

  function renderFill() {
    const q = fill.qs[fill.i];
    fill.answered = false;
    $('#fill-progress').textContent = `第 ${fill.i + 1} / ${fill.qs.length} 題`;
    $('#fill-score').textContent = `答對 ${fill.score} 題`;
    $('#fill-bar').style.width = `${(fill.i / fill.qs.length) * 100}%`;
    $('#fill-sentence').innerHTML = q.s.replaceAll(q.it.w, BLANK);
    $('#fill-feedback').textContent = '';
    $('#fill-next').classList.add('hidden');
    const box = $('#fill-options');
    box.innerHTML = '';
    q.options.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'opt idiom-opt';
      b.textContent = o.w;
      b.addEventListener('click', () => answerFill(b, o));
      box.appendChild(b);
    });
  }

  function answerFill(btn, o) {
    if (fill.answered) return;
    fill.answered = true;
    const q = fill.qs[fill.i];
    $$('#fill-options .opt').forEach((b) => {
      b.disabled = true;
      if (b.textContent === q.it.w) b.classList.add('correct');
    });
    $('#fill-sentence').innerHTML = highlight(q.s, q.it.w, o === q.it ? 'mark' : 'mark fix');
    if (o === q.it) {
      fill.score++;
      sound.play('good');
      $('#fill-feedback').textContent = `✅ 答對了！「${q.it.w}」：${q.it.mean}`;
    } else {
      btn.classList.add('wrong');
      sound.play('bad');
      fill.wrong.push(q.it);
      $('#fill-feedback').textContent = `❌ 正確答案是「${q.it.w}」：${q.it.mean}`;
    }
    speak(q.s);
    const next = $('#fill-next');
    next.textContent = fill.i + 1 < fill.qs.length ? '下一題 ▶' : '看結果 🎉';
    next.classList.remove('hidden');
  }

  $('#fill-next').addEventListener('click', () => {
    fill.i++;
    if (fill.i < fill.qs.length) { renderFill(); return; }
    const total = fill.qs.length;
    const perfect = fill.score === total;
    $('#fill-play').classList.add('hidden');
    $('#fill-result').classList.remove('hidden');
    $('#fill-emoji').textContent = perfect ? '🏆' : fill.score >= total / 2 ? '🎉' : '💪';
    $('#fill-title').textContent = `${total} 題答對 ${fill.score} 題` + (perfect ? '，全對！' : '');
    $('#fill-review').innerHTML = fill.wrong.length
      ? '<p>再複習一下這些成語：</p>' + fill.wrong.map((it) => `<p class="idiom-review"><b>${it.w}</b>：${it.mean}</p>`).join('')
      : '<p>每個成語都用對了，太棒了！</p>';
    if (perfect) { sound.play('win'); confetti(); }
  });
  $('#fill-again').addEventListener('click', startFill);

  if (!IDIOM_SETS.length) toast('還沒有成語資料');
  setMode('learn');
})();
