/* Blackjack 2: the table, the chips, the flow of a round. Rules live in engine.js. */
(function () {
  'use strict';
  var E = window.BJEngine, R = window.BJRoast;
  var $ = function (id) { return document.getElementById(id); };
  var MIN_BET = 5, MAX_BET = 1000, START = 1000;
  var SYM = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
  var CHIP_COL = { 500: '#6a2fb5', 100: '#16161a', 25: '#1f8a46', 5: '#c0392b' };

  var S = { bankroll: START, bet: 0, lastBet: 25, shoe: [], pos: 0, cutAt: 0, rc: 0, phase: 'bet', hands: [], active: 0, dealer: [], hole: null, holeEl: null,
            insurance: 0, played: 0, busy: false, streak: 0 };
  var settings = { decks: 6, h17: false, count: false, coach: false, sound: true, roasts: true };
  var stats = { hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, net: 0, biggest: 0, best: 0, coachN: 0, coachOK: 0 };
  var KEY = 'blackjack2.v1';

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d) return;
      if (typeof d.bankroll === 'number') S.bankroll = d.bankroll;
      if (d.lastBet) S.lastBet = d.lastBet;
      Object.keys(settings).forEach(function (k) { if (d.settings && k in d.settings) settings[k] = d.settings[k]; });
      Object.keys(stats).forEach(function (k) { if (d.stats && typeof d.stats[k] === 'number') stats[k] = d.stats[k]; });
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ bankroll: S.bankroll, lastBet: S.lastBet, settings: settings, stats: stats })); } catch (e) {}
  }
  function money(n) { var neg = n < 0; n = Math.abs(n); return (neg ? '-' : '') + '$' + (n % 1 ? n.toFixed(2) : n.toLocaleString('en-US')); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- sound (all synthesized, no files) ---------- */
  var ac = null;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
  function tone(freq, t0, dur, type, vol, slide) {
    var c = ctx(); if (!c || !settings.sound) return;
    var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime + t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol || .1, c.currentTime + t0 + .01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + .02);
  }
  function noise(dur, vol, hp) {
    var c = ctx(); if (!c || !settings.sound) return;
    var b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = 'highpass'; f.frequency.value = hp || 2500; g.gain.value = vol || .15; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  var sfx = {
    card: function () { noise(.07, .16, 3000); }, chip: function () { tone(1900, 0, .05, 'triangle', .09); tone(1300, .035, .06, 'triangle', .07); },
    flip: function () { noise(.1, .12, 1800); },
    win: function () { [523, 659, 784].forEach(function (f, i) { tone(f, i * .09, .22, 'triangle', .1); }); },
    bj: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, i * .08, .3, 'triangle', .11); }); },
    lose: function () { tone(220, 0, .35, 'sawtooth', .06, 110); }, push: function () { tone(440, 0, .15, 'sine', .08); tone(440, .17, .15, 'sine', .08); }
  };

  /* ---------- toasts and modals ---------- */
  function toast(html, ms) {
    var t = el('div', 'toast', html); $('toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, ms || 6500);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  }
  var modalQueue = [], modalOpen = false, lastFocus = null;
  function modal(o) {
    modalQueue.push(o); if (!modalOpen) nextModal();
  }
  function nextModal() {
    var o = modalQueue.shift(); if (!o) { modalOpen = false; $('modal-root').classList.remove('open'); if (lastFocus) try { lastFocus.focus(); } catch (e) {} return; }
    modalOpen = true; lastFocus = lastFocus || document.activeElement;
    var root = $('modal-root'); root.innerHTML = '';
    var m = el('div', 'modal ' + (o.kind || 'plain')); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', o.title);
    m.appendChild(el('h2', null, o.title)); m.appendChild(el('div', 'body', o.html));
    if (o.sig) m.appendChild(el('div', 'sig', o.sig));
    var row = el('div', 'row');
    (o.buttons || [{ label: 'Close' }]).forEach(function (b, i, a) {
      var bt = el('button', 'btn' + (b.primary || i === a.length - 1 ? ' primary' : ''), b.label); bt.type = 'button';
      bt.addEventListener('click', function () { nextModalAfter(b.cb); }); row.appendChild(bt);
    });
    m.appendChild(row); root.appendChild(m); root.classList.add('open');
    var first = row.lastChild; if (first) first.focus();
    root._esc = function () { nextModalAfter(); };
  }
  function nextModalAfter(cb) { if (cb) cb(); nextModal(); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalOpen) { e.preventDefault(); nextModalAfter(); } });
  $('modal-root').addEventListener('click', function (e) { if (e.target === $('modal-root')) nextModalAfter(); });

  /* ---------- confetti ---------- */
  function confetti(n) {
    var c = $('confetti'), g = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
    var cols = ['#e8c25a', '#c0392b', '#2a3fd6', '#1f8a46', '#fff', '#a64fd9'];
    var p = []; for (var i = 0; i < (n || 140); i++) p.push({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .6, vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6 + 3, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - .5) * .4 });
    var t0 = performance.now();
    (function f(now) {
      g.clearRect(0, 0, c.width, c.height);
      p.forEach(function (q) { q.vy += .45; q.x += q.vx; q.y += q.vy; q.a += q.va; g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.fillStyle = q.c; g.fillRect(-q.r, -q.r / 2, q.r * 2, q.r); g.restore(); });
      if (now - t0 < 2800) requestAnimationFrame(f); else g.clearRect(0, 0, c.width, c.height);
    }(t0));
  }

  /* ---------- cards ---------- */
  var PIPS = { '2': [[50, 18], [50, 82]], '3': [[50, 18], [50, 50], [50, 82]], '4': [[28, 18], [72, 18], [28, 82], [72, 82]],
    '5': [[28, 18], [72, 18], [50, 50], [28, 82], [72, 82]], '6': [[28, 18], [72, 18], [28, 50], [72, 50], [28, 82], [72, 82]],
    '7': [[28, 18], [72, 18], [50, 34], [28, 50], [72, 50], [28, 82], [72, 82]], '8': [[28, 18], [72, 18], [50, 34], [28, 50], [72, 50], [50, 66], [28, 82], [72, 82]],
    '9': [[28, 18], [72, 18], [28, 39], [72, 39], [50, 50], [28, 61], [72, 61], [28, 82], [72, 82]],
    '10': [[28, 18], [72, 18], [50, 28], [28, 39], [72, 39], [28, 61], [72, 61], [50, 72], [28, 82], [72, 82]] };
  function cardEl(card, down) {
    var red = card.suit === 'hearts' || card.suit === 'diamonds', sym = SYM[card.suit];
    var c = el('div', 'card' + (down ? ' down' : '')), inner = el('div', 'inner');
    var f = el('div', 'face front' + (red ? ' red' : ''));
    var corner = '<i>' + sym + '</i>';
    f.appendChild(el('div', 'corner', card.rank + corner)); f.appendChild(el('div', 'corner br', card.rank + corner));
    if (PIPS[card.rank]) PIPS[card.rank].forEach(function (p) { var d = el('span', 'pip' + (p[1] > 50 ? ' flip' : ''), sym); d.style.left = p[0] + '%'; d.style.top = p[1] + '%'; f.appendChild(d); });
    else if (card.rank === 'A') { var a = el('span', 'pip big', sym); a.style.left = '50%'; a.style.top = '50%'; f.appendChild(a); }
    else f.appendChild(el('div', 'court', '<b>' + card.rank + '</b><i>' + sym + '</i>'));
    inner.appendChild(f); inner.appendChild(el('div', 'face back')); c.appendChild(inner);
    c.setAttribute('aria-label', down ? 'face-down card' : card.rank + ' of ' + card.suit);
    return c;
  }
  function place(container, c) {
    container.appendChild(c); c.classList.add('is-new');
    var s = $('shoe').getBoundingClientRect(), r = c.getBoundingClientRect();
    if (s.width) { c.style.setProperty('--fx', (s.left + s.width / 2 - (r.left + r.width / 2)) + 'px'); c.style.setProperty('--fy', (s.top + s.height / 2 - (r.top + r.height / 2)) + 'px'); }
    else { c.style.setProperty('--fx', '40vw'); c.style.setProperty('--fy', '-40vh'); }
    sfx.card(); setTimeout(function () { c.classList.remove('is-new'); }, 520);
  }

  /* ---------- the shoe and the count ---------- */
  function shuffle() { S.shoe = E.makeShoe(settings.decks); S.pos = 0; S.cutAt = Math.floor(S.shoe.length * .75); S.rc = 0; updateCount(); updateShoe(); }
  function draw() { if (S.pos >= S.shoe.length) shuffle(); var c = S.shoe[S.pos++]; updateShoe(); return c; }
  function see(card) { S.rc += E.hiLo(card.rank); updateCount(); }
  function updateShoe() { $('shoe-count').textContent = (S.shoe.length - S.pos) + ' cards'; }
  function updateCount() {
    $('count').hidden = !settings.count;
    var left = Math.max(.5, (S.shoe.length - S.pos) / 52);
    $('count-rc').textContent = (S.rc > 0 ? '+' : '') + S.rc; $('count-tc').textContent = 'TC ' + (S.rc / left).toFixed(1);
  }

  /* ---------- hand boxes ---------- */
  function newHand(bet) {
    var h = { cards: [], bet: bet, done: false, fromSplit: false, splitAces: false, surrendered: false, doubled: false };
    h.box = el('div', 'hand-box'); h.cardsEl = el('div', 'cards'); h.value = el('div', 'value-chip'); h.betLine = el('div', 'bet-line');
    h.box.appendChild(h.cardsEl); h.box.appendChild(h.value); h.box.appendChild(h.betLine); h.value.hidden = true; renderBet(h); return h;
  }
  function renderBet(h) {
    h.betLine.innerHTML = ''; var left = h.bet, minis = 0;
    [500, 100, 25, 5].forEach(function (d) { while (left >= d && minis < 5) { var m = el('div', 'mini'); m.style.background = 'radial-gradient(circle,' + CHIP_COL[d] + ' 0 55%,#fff 56% 62%,' + CHIP_COL[d] + ' 63%)'; h.betLine.appendChild(m); left -= d; minis++; } });
    h.betLine.appendChild(el('span', 'bet-amt', money(h.bet)));
  }
  function setValue(h, upOnly) {
    var cards = upOnly ? [h.cards[0]] : h.cards, v = E.handValue(cards);
    h.value.hidden = false; h.value.textContent = (v.soft && v.total < 21 ? 'soft ' : '') + v.total;
    h.value.classList.toggle('bust', v.total > 21); h.value.classList.toggle('twentyone', v.total === 21);
    h.value.classList.remove('pop'); void h.value.offsetWidth; h.value.classList.add('pop');
  }
  function setHandsLayout() { var hs = $('hands'); hs.className = 'hands n' + Math.min(4, S.hands.length); }
  function setActive() { S.hands.forEach(function (h, i) { h.box.classList.toggle('active', S.phase === 'player' && i === S.active); }); }
  function badge(h, kind, text) { var b = el('div', 'badge ' + kind, text); h.box.appendChild(b); }

  /* ---------- bankroll / bet display ---------- */
  function setBank(prev) {
    var b = $('bankroll'); b.textContent = money(S.bankroll);
    if (prev != null && prev !== S.bankroll) { var p = b.parentNode; p.classList.remove('flash-up', 'flash-down'); void p.offsetWidth; p.classList.add(S.bankroll > prev ? 'flash-up' : 'flash-down'); }
    save();
  }
  function renderBetSpot() {
    var spot = $('bet-spot'); spot.innerHTML = ''; var st = el('div', 'stack'); var left = S.bet, i = 0, list = [];
    [500, 100, 25, 5].forEach(function (d) { while (left >= d && list.length < 7) { list.push(d); left -= d; } });
    list.forEach(function (d, k) { var m = el('div', 'mini'); m.style.background = 'radial-gradient(circle,' + CHIP_COL[d] + ' 0 52%,#fff 53% 60%,' + CHIP_COL[d] + ' 61%)'; m.style.top = (-k * 5) + 'px'; st.appendChild(m); });
    spot.appendChild(st); $('bet-total').textContent = money(S.bet);
    $('btn-deal').disabled = S.bet < MIN_BET || S.busy || S.phase !== 'bet'; $('btn-clear').disabled = S.bet === 0 || S.phase !== 'bet';
  }
  function addBet(v) {
    if (S.phase !== 'bet' || S.busy) return;
    var nb = Math.min(S.bet + v, MAX_BET, S.bankroll); if (nb === S.bet) { toast('That is your whole bankroll or the table limit (' + money(MAX_BET) + ').', 2500); return; }
    S.bet = nb; sfx.chip(); renderBetSpot(); status('Bet <em>' + money(S.bet) + '</em>. Press Deal (or Space).');
  }
  function status(html) { $('status').innerHTML = html; }

  /* ---------- controls ---------- */
  function current() { return S.hands[S.active]; }
  function allowed() {
    var h = current(); if (S.phase !== 'player' || !h || S.busy) return {};
    return { hit: !h.splitAces, stand: true, double: E.canDouble(h, S.bankroll), split: E.canSplit(h, S.hands.length, S.bankroll, 4), surrender: E.canSurrender(h, S.hands.length) };
  }
  function updateControls() {
    var play = S.phase === 'player', a = allowed();
    $('actions').hidden = !play; $('bettray').hidden = play || S.phase === 'insurance' || S.phase === 'dealer' || S.phase === 'deal';
    document.querySelectorAll('[data-act]').forEach(function (b) { var k = b.getAttribute('data-act'); b.disabled = !play || S.busy || (k === 'hint' ? false : !a[k]); b.classList.remove('suggest'); });
    document.querySelectorAll('[data-bet]').forEach(function (b) { b.disabled = S.phase !== 'bet' || S.busy || S.bankroll < MIN_BET; });
    renderBetSpot(); setActive();
  }

  /* ---------- a round ---------- */
  async function startRound() {
    if (S.busy || S.phase !== 'bet' || S.bet < MIN_BET) return;
    S.busy = true; S.phase = 'deal'; ctx(); updateControls();
    if (S.pos >= S.cutAt) { var fresh = S.pos > 0; shuffle(); if (fresh) { toast('<b>Cut card!</b> Shuffling a fresh ' + settings.decks + '-deck shoe.'); R.trigger('reshuffle'); await sleep(500); } }
    var prev = S.bankroll; S.bankroll -= S.bet; S.lastBet = S.bet; setBank(prev);
    S.played++; $('pina-n').textContent = S.played; $('pina-glass').style.transform = 'rotate(' + (S.played % 2 ? -14 : 14) + 'deg)';
    if (S.played === 8) R.trigger('hand8', { left: S.shoe.length - S.pos });
    $('dealer-cards').innerHTML = ''; $('hands').innerHTML = ''; $('dealer-value').hidden = true; S.dealer = []; S.insurance = 0; S.hole = null;
    var h = newHand(S.bet); S.hands = [h]; S.active = 0; $('hands').appendChild(h.box); setHandsLayout();
    status('Dealing…');
    var c;
    c = draw(); h.cards.push(c); see(c); place(h.cardsEl, cardEl(c)); await sleep(280);
    c = draw(); S.dealer.push(c); see(c); place($('dealer-cards'), cardEl(c)); await sleep(280);
    c = draw(); h.cards.push(c); see(c); place(h.cardsEl, cardEl(c)); setValue(h); await sleep(280);
    S.hole = draw(); S.dealer.push(S.hole); S.holeEl = cardEl(S.hole, true); place($('dealer-cards'), S.holeEl); await sleep(380);
    var dv = $('dealer-value'); dv.hidden = false; dv.textContent = E.cardValue(S.dealer[0].rank) === 11 ? 'A' : E.cardValue(S.dealer[0].rank);
    var up = E.cardValue(S.dealer[0].rank);
    if (up === 11 && S.bankroll >= h.bet / 2) { await offerInsurance(h); }
    if (up >= 10) {
      status('Dealer peeks…'); await sleep(700);
      if (E.isBlackjack(S.dealer)) { await settleRound(true); return; }
      if (up === 11) status('No dealer blackjack. Carry on.');
    }
    if (E.isBlackjack(h.cards)) { await settleRound(false); return; }
    S.phase = 'player'; S.busy = false; promptMove();
  }
  function offerInsurance(h) {
    return new Promise(function (resolve) {
      S.phase = 'insurance'; S.busy = false; updateControls();
      var cost = h.bet / 2;
      $('status').innerHTML = 'Dealer shows an ace. <em>Insurance</em> (' + money(cost) + ')? ';
      var yes = el('button', 'pill', 'Insure ' + money(cost)), no = el('button', 'pill', 'No thanks'); no.style.marginLeft = '8px'; yes.style.marginLeft = '8px';
      $('status').appendChild(yes); $('status').appendChild(no);
      function done(take) { if (take) { var p = S.bankroll; S.bankroll -= cost; S.insurance = cost; setBank(p); sfx.chip(); R.trigger('insurance'); } document.removeEventListener('keydown', kd); S.busy = true; S.phase = 'deal'; updateControls(); resolve(); }
      function kd(e) { if (e.key === 'y' || e.key === 'Y') done(true); else if (e.key === 'n' || e.key === 'N') done(false); }
      yes.onclick = function () { done(true); }; no.onclick = function () { done(false); }; document.addEventListener('keydown', kd);
    });
  }
  function promptMove() {
    var h = current(); S.busy = false; updateControls();
    var label = S.hands.length > 1 ? 'Hand ' + (S.active + 1) + ' of ' + S.hands.length + ': ' : '';
    status(label + 'your move.'); armIdle();
  }
  function recommend() {
    var h = current(), a = allowed(); if (!h) return null;
    return E.basicStrategy(h, E.cardValue(S.dealer[0].rank), { double: a.double, split: a.split, surrender: a.surrender }, settings.h17);
  }
  var NAMES = { hit: 'Hit', stand: 'Stand', double: 'Double down', split: 'Split', surrender: 'Surrender' };
  function hint() {
    var r = recommend(); if (!r) return; updateControls();
    var b = document.querySelector('[data-act="' + r + '"]'); if (b) b.classList.add('suggest');
    status('Basic strategy says: <em>' + NAMES[r] + '</em>.');
  }
  function coachCheck(act) {
    var r = recommend(); if (!r) return; stats.coachN++;
    if (r === act) stats.coachOK++;
    else if (settings.coach) { toast('Basic strategy would <b>' + NAMES[r].toLowerCase() + '</b> here, not ' + NAMES[act].toLowerCase() + '.', 4500); R.trigger('coach', { want: NAMES[r].toLowerCase() }); }
  }
  async function act(a) {
    if (S.busy || S.phase !== 'player') return; var al = allowed(); if (!al[a]) return;
    var h = current(); S.busy = true; clearIdle(); coachCheck(a); updateControls();
    if (a === 'hit') {
      R.trigger('firstHit'); var c = draw(); h.cards.push(c); see(c); place(h.cardsEl, cardEl(c)); setValue(h); await sleep(480);
      var v = E.handValue(h.cards);
      if (v.total > 21) { sfx.lose(); R.trigger('bust'); h.done = true; }
      else if (v.total === 21) h.done = true;
      if (h.cards.filter(function (x) { return x.rank === 'A'; }).length >= 3) R.trigger('threeAces');
    } else if (a === 'stand') h.done = true;
    else if (a === 'double') {
      var p = S.bankroll; S.bankroll -= h.bet; h.bet *= 2; h.doubled = true; setBank(p); renderBet(h); sfx.chip(); R.trigger('double'); await sleep(250);
      var d = draw(); h.cards.push(d); see(d); place(h.cardsEl, cardEl(d)); setValue(h); await sleep(550); h.done = true;
      if (E.handValue(h.cards).total > 21) sfx.lose();
    } else if (a === 'surrender') { h.surrendered = true; h.done = true; R.trigger('surrender'); }
    else if (a === 'split') { await doSplit(h); }
    await advance();
  }
  async function doSplit(h) {
    var p = S.bankroll; S.bankroll -= h.bet; setBank(p); sfx.chip(); R.trigger('split');
    var moved = h.cardsEl.lastChild, c2 = h.cards.pop(), h2 = newHand(h.bet);
    h.fromSplit = h2.fromSplit = true; if (c2.rank === 'A') h.splitAces = h2.splitAces = true;
    h2.cards.push(c2); h2.cardsEl.appendChild(moved); S.hands.splice(S.active + 1, 0, h2); h.box.after(h2.box); setHandsLayout();
    setValue(h); setValue(h2); await sleep(350);
    var a = draw(); h.cards.push(a); see(a); place(h.cardsEl, cardEl(a)); setValue(h); await sleep(380);
    var b = draw(); h2.cards.push(b); see(b); place(h2.cardsEl, cardEl(b)); setValue(h2); await sleep(380);
    [h, h2].forEach(function (x) { if (x.splitAces || E.handValue(x.cards).total === 21) x.done = true; });
  }
  async function advance() {
    var next = -1; for (var i = 0; i < S.hands.length; i++) if (!S.hands[i].done) { next = i; break; }
    if (next === -1) { await dealerPlay(); return; }
    S.active = next; promptMove();
  }
  async function dealerPlay() {
    S.phase = 'dealer'; S.busy = true; updateControls(); status('Dealer’s turn…'); await sleep(350);
    await reveal();
    var live = S.hands.some(function (h) { var v = E.handValue(h.cards).total; return !h.surrendered && v <= 21 && !(E.isBlackjack(h.cards) && !h.fromSplit); });
    function must() { var v = E.handValue(S.dealer); return v.total < 17 || (settings.h17 && v.total === 17 && v.soft); }
    while (live && must()) { await sleep(650); var c = draw(); S.dealer.push(c); see(c); place($('dealer-cards'), cardEl(c)); setDealerValue(); }
    await sleep(500); await settleRound(false);
  }
  async function reveal() {
    if (S.holeEl && S.holeEl.classList.contains('down')) { S.holeEl.classList.remove('down'); sfx.flip(); see(S.hole); await sleep(600); }
    setDealerValue();
  }
  function setDealerValue() { var v = E.handValue(S.dealer), d = $('dealer-value'); d.hidden = false; d.textContent = (v.soft && v.total < 21 ? 'soft ' : '') + v.total; d.classList.toggle('bust', v.total > 21); d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }

  async function settleRound(dealerNatural) {
    await reveal();
    var prevBank = S.bankroll, startBank = prevBank, totalBet = 0, back = 0, anyWin = false, anyBJ = false, lines = [];
    var insWin = (S.insurance && E.isBlackjack(S.dealer)) ? S.insurance * 3 : 0;
    S.hands.forEach(function (h) {
      var out = E.outcome(h, S.dealer), pay = E.payout(h, S.dealer); back += pay; totalBet += h.bet;
      var net = pay - h.bet; stats.hands++;
      if (out === 'win' || out === 'blackjack') { stats.wins++; anyWin = true; if (out === 'blackjack') { stats.blackjacks++; anyBJ = true; } }
      else if (out === 'push') stats.pushes++; else stats.losses++;
      if (net > stats.biggest) stats.biggest = net;
      var txt = { win: 'WIN +' + money(net), blackjack: 'BLACKJACK +' + money(net), push: 'PUSH', lose: 'LOSE', bust: 'BUST', surrender: 'GAVE UP' }[out];
      badge(h, out === 'surrender' ? 'surrender' : out, txt);
    });
    S.bankroll += back + insWin; var net = S.bankroll - startBank + (totalBet) - 0; // net for the round, stake included in back
    var roundNet = (back + insWin) - totalBet - S.insurance; stats.net += roundNet; setBank(prevBank);
    if (anyBJ) { sfx.bj(); confetti(160); R.trigger('blackjack'); } else if (roundNet > 0) { sfx.win(); if (roundNet >= 100) confetti(70); } else if (roundNet < 0) sfx.lose(); else sfx.push();
    if (roundNet > 0) { S.streak++; if (S.streak > stats.best) stats.best = S.streak; if (S.streak === 3) R.trigger('streak3'); } else if (roundNet < 0) S.streak = 0;
    var msg = roundNet > 0 ? 'You win <em>' + money(roundNet) + '</em>.' : roundNet < 0 ? 'You lose ' + money(-roundNet) + '.' : 'Push. Money back.';
    if (insWin) msg += ' Insurance paid ' + money(S.insurance * 2) + '.';
    S.phase = 'bet'; S.busy = false; S.hands.forEach(function (h) { h.box.classList.remove('active'); });
    S.bet = Math.min(S.lastBet, S.bankroll, MAX_BET); if (S.bet < MIN_BET) S.bet = 0;
    status(msg + (S.bankroll >= MIN_BET ? ' Deal again?' : '')); updateControls(); save(); armIdle();
    if (S.bankroll < MIN_BET) { await sleep(900); R.bankrupt(function () { var p = S.bankroll; S.bankroll = START; S.bet = Math.min(25, START); S.lastBet = 25; setBank(p); updateControls(); status('Fresh <em>' + money(START) + '</em>. Go again.'); }); }
  }

  /* ---------- idle nudge ---------- */
  var idleT = null; function clearIdle() { clearTimeout(idleT); }
  function armIdle() { clearIdle(); idleT = setTimeout(function () { R.trigger('idle'); }, 45000); }

  /* ---------- wiring ---------- */
  document.querySelectorAll('[data-bet]').forEach(function (b) { b.addEventListener('click', function () { addBet(parseInt(b.getAttribute('data-bet'), 10)); }); });
  document.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-act'); if (k === 'hint') hint(); else act(k); }); });
  $('btn-clear').addEventListener('click', function () { if (S.phase === 'bet') { S.bet = 0; renderBetSpot(); status('Place your bet.'); } });
  $('btn-deal').addEventListener('click', startRound);
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || modalOpen) return; var k = e.key.toLowerCase();
    if (e.target && /^(input|select|textarea)$/i.test(e.target.tagName)) return;
    if (S.phase === 'bet') {
      if (k === ' ' || k === 'enter') { if (document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement.id !== 'btn-deal') return; e.preventDefault(); startRound(); }
      else if (k === '1') addBet(5); else if (k === '2') addBet(25); else if (k === '3') addBet(100); else if (k === '4') addBet(500);
      else if (k === 'backspace' || k === 'c') { S.bet = 0; renderBetSpot(); }
    } else if (S.phase === 'player') {
      var map = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };
      if (map[k]) { e.preventDefault(); act(map[k]); } else if (k === '/' || k === '?') { e.preventDefault(); hint(); }
    }
  });

  /* ---------- settings, stats, report ---------- */
  function openSettings() {
    var body = '<label class="set"><span>Decks in the shoe<small>Takes effect at the next shuffle.</small></span><select id="s-decks">' + [1, 2, 4, 6, 8].map(function (n) { return '<option' + (n === settings.decks ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      chk('s-h17', 'Dealer hits soft 17', 'Slightly worse for you. Casinos love it.', settings.h17) + chk('s-count', 'Card counting trainer', 'Shows the Hi-Lo running count and true count.', settings.count) +
      chk('s-coach', 'Coach mode', 'Flags every play that differs from basic strategy.', settings.coach) + chk('s-sound', 'Sound', 'All synthesized in your browser. No files.', settings.sound) +
      chk('s-roasts', 'Roasts', 'Popups and toasts about Ian. The sticky notes stay.', settings.roasts);
    modal({ title: 'Settings', html: body, buttons: [{ label: 'Reset bankroll & stats', cb: function () { if (confirm('Reset everything?')) { var p = S.bankroll; S.bankroll = START; Object.keys(stats).forEach(function (k) { stats[k] = 0; }); S.bet = 25; setBank(p); updateControls(); } } }, { label: 'Done', primary: true, cb: applySettings }] });
  }
  function chk(id, t, s, on) { return '<label class="set"><span>' + t + '<small>' + s + '</small></span><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '></label>'; }
  function applySettings() {
    var g = function (i) { return $(i); }; if (!g('s-decks')) return;
    var d = parseInt(g('s-decks').value, 10); if (d !== settings.decks) { settings.decks = d; if (S.phase === 'bet') { shuffle(); toast('New ' + d + '-deck shoe.', 2500); } }
    var wasCount = settings.count; settings.h17 = g('s-h17').checked; settings.count = g('s-count').checked; settings.coach = g('s-coach').checked; settings.sound = g('s-sound').checked; settings.roasts = g('s-roasts').checked;
    if (settings.count && !wasCount) R.trigger('counting'); updateCount(); soundIcon(); save();
  }
  function soundIcon() { $('btn-sound').textContent = settings.sound ? '🔊' : '🔇'; }
  function openStats() {
    var wr = stats.hands ? Math.round(stats.wins / stats.hands * 100) : 0, acc = stats.coachN ? Math.round(stats.coachOK / stats.coachN * 100) + '%' : '—';
    var cells = [['Hands', stats.hands], ['Win rate', wr + '%'], ['Net', money(stats.net)], ['Blackjacks', stats.blackjacks], ['Biggest win', money(stats.biggest)], ['Best streak', stats.best], ['Pushes', stats.pushes], ['Losses', stats.losses], ['Strategy accuracy', acc]];
    modal({ title: 'Your stats', html: '<div class="statgrid">' + cells.map(function (c) { return '<div class="stat"><b>' + c[1] + '</b><span>' + c[0] + '</span></div>'; }).join('') + '</div><p style="font-size:13px;opacity:.7">Saved in your browser only. Ian’s version saves nothing, including your hand.</p>', buttons: [{ label: 'Close' }] });
  }
  $('btn-settings').addEventListener('click', openSettings); $('btn-stats').addEventListener('click', openStats);
  $('btn-sound').addEventListener('click', function () { settings.sound = !settings.sound; soundIcon(); save(); if (settings.sound) sfx.chip(); });
  $('btn-report').addEventListener('click', function () { R.report(); });
  $('btn-notes').addEventListener('click', function () { document.body.classList.toggle('notes-open'); });

  /* ---------- go ---------- */
  load(); R.init({ modal: modal, toast: toast, isOn: function () { return settings.roasts; }, openStats: openStats });
  shuffle(); if (S.bankroll < MIN_BET) S.bankroll = START; S.bet = Math.min(S.lastBet, S.bankroll); setBank(); soundIcon(); updateControls(); updateCount();
  status('Place your bet: tap the chips, then <em>Deal</em>.');
  setTimeout(function () { R.trigger('welcome'); }, 1100);
  window.BJ = { S: S, settings: settings, stack: function (ranks) { var top = ranks.map(function (r) { return { rank: r, suit: 'spades' }; }); S.shoe = S.shoe.slice(0, S.pos).concat(top, S.shoe.slice(S.pos)); } };
}());
