/* The roasts. Every number here comes from Ian's real repo (niddy1/Blackjack, 20 commits, Aug 5 to Nov 30 2015)
   or from actually playing his version in a browser. He asked for this. */
(function () {
  'use strict';
  var ui = null, seen = {};
  var SIG = '— Claude 🍹';

  var NOTES = [
    { side: 'left', c: '', r: -2, html: '<b>13 days.</b> That is how long the original took, from <i>init commit</i> (Aug 5, 2015, 1:59pm) to <i>ACE LOGIC</i> (Aug 18). This one: a single sitting. Cold piña colada still sweating on the desk.' },
    { side: 'left', c: 'pink', r: 1.5, html: 'His commit message, verbatim: <b>"ACE LOGICgit add .git add .git add ."</b><br>He pasted his terminal into the commit box. Three times. Respect honestly.' },
    { side: 'left', c: 'blue', r: -1, html: '<b>"bug cant get proper value due to new shuffle being created each time"</b><br>Committed <i>twice</i>, five minutes apart (8:06pm, 8:11pm), in case the first one didn’t take.' },
    { side: 'left', c: 'green', r: 2, html: 'His README promises 4 user stories: multiple decks, bankroll, double down, split.<br><b>Delivered: 0 of 4.</b> Mine: 4 of 4, plus insurance, surrender, a counting trainer and a coach.' },
    { side: 'left', c: 'orange', r: -1.5, html: '<b>"push before big changes"</b> (Aug 8, 2015)<br>The big changes: CSS. Aug 9 has 3 commits that all say "responsive". It’s not.' },
    { side: 'right', c: 'blue', r: 1.5, html: 'His dealer has <b>one</b> card. The "hidden card" is a <i>picture of a card back</i> sitting next to it. Mine has a real hole card that actually flips. Go on, stand and watch.' },
    { side: 'right', c: '', r: -2, html: 'His deck never reshuffles. When I played it, it crashed around <b>hand 8</b>:<br><code>Cannot read properties of undefined (reading \'image\')</code><br>Mine is a 6-deck shoe with a cut card.' },
    { side: 'right', c: 'pink', r: 1, html: 'His ace logic subtracts 10 <b>once</b>. Three aces? His code says <b>23</b> and calls it a bust. It’s 13. Mine: every ace, correctly, every time. Math.' },
    { side: 'right', c: 'green', r: -1.5, html: 'Open his on a phone: the dealer’s cards fall off the left edge of the screen and the nameplates sit under the cards. Mine works down to 320px. I checked.' },
    { side: 'left', c: 'orange', r: 2, html: 'Last commit: <b>Nov 30, 2015</b>, "changed font size for main page." Nobody has touched it in nearly 11 years. It’s a museum now. I mean that kindly.' },
    { side: 'right', c: '', r: -1, html: 'Weight of his page: <b>~1.4 MB</b> before the first deal (a 1.1 MB felt photo + jQuery for <code>.show()</code> and <code>.hide()</code>), then <b>950 KB</b> for one card back. Mine: <b>104 KB total</b>. The cards are CSS.' },
    { side: 'right', c: 'blue', r: 1.2, html: 'Things I kept: the felt, the chip buttons, the gold value chips, the <b>koala</b> and the <b>margay</b>. Some things were already perfect. 🐨🐈' }
  ];

  function md(s) { return s; }
  var TRIGGERS = {
    welcome: { type: 'modal', title: 'Welcome to Blackjack 2: Electric Boogaloo', sig: SIG + ' (poolside)', buttons: [{ label: 'Show me the damage', cb: function () { setTimeout(report, 50); } }, { label: 'Let me play', primary: true }],
      html: 'Ian made a blackjack game in August 2015. It took him <b>13 days</b> to get from <i>init commit</i> to <i>ACE LOGIC</i>.<br>I rebuilt it from his template: his felt, his chips, his koala. It took one sitting, and my piña colada was still cold.' +
        '<div class="timeline"><div class="bar ian">Ian: 13 days</div><div class="bar me">Me: one sitting 🍹</div></div>' +
        'Everything on the sticky notes is real, pulled from his actual git history. <b>He asked for this.</b> Please enjoy responsibly.' },
    firstHit: { type: 'toast', html: '<b>Hit</b> worked on the first try. His took about <b>16 hours</b>: "hit/stand buttons active" (Aug 6, 8:41pm) became "hit &amp; stand function properly" (Aug 7, 12:48pm).' },
    double: { type: 'modal', title: 'Double Down', kind: 'roast', buttons: [{ label: 'Fair', primary: true }], sig: SIG,
      html: 'His README, 2015: <i>"As a user I want to be able to doubledown and split so that the game is more realistic to casino conditions."</i><br>Status in 2026: <b>still a wish.</b> Status here: you just did it, and the card even slid in from the shoe.' },
    split: { type: 'modal', title: 'Split', kind: 'roast', buttons: [{ label: 'Okay, ouch', primary: true }], sig: SIG,
      html: 'Second half of that same README line. <b>Also unimplemented since 2015.</b> You can split here up to four hands, re-split, double after split, and split aces get one card each, exactly like a casino. Ian’s version doesn’t know what a pair is.' },
    insurance: { type: 'toast', html: '<b>Insurance:</b> also absent from the original. It never even peeks for blackjack, because there’s no real hole card to peek at.' },
    surrender: { type: 'toast', html: 'Late surrender is a real casino rule. His game has Hit, Stand and a Deal chip: <b>three</b> chips. This one has six.' },
    blackjack: { type: 'modal', title: 'NATURAL BLACKJACK!', kind: 'roast', buttons: [{ label: 'Pay me', primary: true }], sig: SIG,
      html: 'Pays 3 to 2. His code has <b>no concept of a natural</b>. It would let you keep hitting on 21, then say "PLAYER 21" only after you stood.' },
    bust: { type: 'toast', html: '<b>Bust.</b> In the original, the Hit chip stays armed after you bust, so you can just keep hitting. Freedom!' },
    threeAces: { type: 'toast', html: '<b>Three aces.</b> His code computes that as <b>23</b> (it only subtracts 10 once) and calls it a bust. It’s a 13. Aces are hard, apparently.' },
    hand8: { type: 'modal', title: 'Hand 8', kind: 'roast', buttons: [{ label: 'I’m sorry, Ian', primary: true }], sig: SIG,
      html: 'This is around where the original throws <code>Cannot read properties of undefined (reading \'image\')</code> and the table just… stops, because its deck is never refilled or reshuffled.<br>My shoe still has <b>%LEFT% cards</b> and a cut card. I tested his. It died. I am not sorry. 🍹' },
    reshuffle: { type: 'toast', html: 'The original has no reshuffle. It has a crash.' },
    streak3: { type: 'toast', html: '<b>Three wins in a row.</b> Source of luck: me, waving from a pool float.' },
    idle: { type: 'toast', html: 'Still deciding? Ian’s took 13 days. You’re doing great.' },
    counting: { type: 'toast', html: 'Counting trainer on. README user story #3: <i>"multiple decks ... so I can practice counting cards."</i> Delivered 11 years late.' },
    coach: { type: 'toast', once: true, html: 'The original never told you anything, including that it was broken.' }
  };

  function trigger(id, ctx) {
    var t = TRIGGERS[id]; if (!t || !ui || !ui.isOn()) return;
    if (seen[id] && !t.repeat) return; seen[id] = true;
    var html = t.html.replace('%LEFT%', ctx && ctx.left != null ? ctx.left : '');
    if (t.type === 'toast') ui.toast(html + '<span class="sig">' + SIG + '</span>', 7500);
    else ui.modal({ title: t.title, html: html, sig: t.sig, kind: t.kind || 'roast', buttons: t.buttons });
  }
  function bankrupt(refill) {
    ui.modal({ title: 'You’re broke', kind: 'roast', sig: SIG, buttons: [{ label: 'Refill $1,000', primary: true, cb: refill }],
      html: 'Out of chips! Ian’s version has no bankroll at all, so you couldn’t lose there. Or win. Or play more than 8 hands. Take a refill, on the house.' });
  }
  function row(a, b, c, bad) { return '<tr><td>' + a + '</td><td class="bad">' + b + '</td><td class="good">' + c + '</td></tr>'; }
  function report() {
    var rows = [
      ['Time to build', '13 days to ACE LOGIC, then a font-size tweak 3 months later', 'One sitting'], ['Commits', '20, one is a pasted terminal session', 'Real messages'],
      ['Dealer hole card', 'A picture of a card back', 'A real card that flips'], ['Decks', '1, never reshuffled', '1 to 8 decks, cut card'],
      ['Hands before it crashes', 'About 8', 'Unlimited (tested over 400,000 simulated hands)'], ['Double / split / insurance / surrender', '0 of 4', '4 of 4'],
      ['Bankroll and betting', 'None', '$1,000, chips, saved in your browser'], ['Three aces', 'Says 23, calls it a bust', 'Says 13, because it’s 13'],
      ['Natural blackjack', 'Not recognized', 'Pays 3 to 2'], ['Playing from the keyboard', 'No', 'H, S, D, P, R, Space'],
      ['Phone', 'Dealer’s cards fall off the screen', 'Works at 320px'], ['First-load weight', '~1.4 MB, then 950 KB for one card back', '104 KB, no jQuery, no images for cards'],
      ['Stray files in the repo', 'scripts2.js (header: "not working"), .bash_profile.save, 4 × .DS_Store', 'None'],
      ['Piña coladas', '0', 'Several']
    ];
    ui.modal({ title: 'The Roast Report', kind: 'plain', sig: SIG + ' (all figures from his real git log)', buttons: [{ label: 'Stats' , cb: function () { setTimeout(ui.openStats, 50); } }, { label: 'Back to the table', primary: true }],
      html: '<table><thead><tr><th></th><th>Ian’s 2015 original</th><th>Blackjack 2</th></tr></thead><tbody>' + rows.map(function (r) { return row(r[0], r[1], r[2]); }).join('') +
        '</tbody></table><p style="font-size:13px;margin:12px 0 0">Verdict: Ian’s best feature was the koala. It stayed. With love, Ian ❤️ (He asked me to do this.)</p>' });
  }

  function buildNotes(mine) {
    var L = document.getElementById('notes-left'), Rr = document.getElementById('notes-right');
    NOTES.forEach(function (n) { var d = document.createElement('div'); d.className = 'note ' + n.c; d.style.setProperty('--r', n.r + 'deg'); d.innerHTML = n.html.replace('104', mine) + '<span class="sig">' + SIG + '</span>'; (n.side === 'left' ? L : Rr).appendChild(d); });
    var close = document.createElement('button'); close.className = 'pill'; close.textContent = 'Close notes'; close.addEventListener('click', function () { document.body.classList.remove('notes-open'); }); close.id = 'close-notes'; L.insertBefore(close, L.firstChild);
    var mq = window.matchMedia('(max-width: 1179px)');
    function place() { var all = document.querySelectorAll('.note'); Array.prototype.forEach.call(all, function (note, i) { (mq.matches || NOTES[i].side === 'left' ? L : Rr).appendChild(note); }); close.style.display = mq.matches ? '' : 'none'; if (!mq.matches) document.body.classList.remove('notes-open'); }
    place(); if (mq.addEventListener) mq.addEventListener('change', place); else mq.addListener(place);
  }
  var MINE_KB = '104';
  window.BJRoast = {
    init: function (u) { ui = u; buildNotes(MINE_KB); }, trigger: trigger, bankrupt: bankrupt,
    report: function () { report(); }
  };
  // fill the weight number into every template string once
  Object.keys(TRIGGERS).forEach(function (k) { TRIGGERS[k].html = TRIGGERS[k].html.replace('104', MINE_KB); });
  var _r = report; report = function () { _r(); };
}());
