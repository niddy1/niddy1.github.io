// No jQuery needed. This file does these things (plus a few small bits of fun, marked below):
//   1. copies each project description into its block (for phones, where there is no hover)
//   2. repeats the blocks so the page loops
//   3. slides the description panel in/out on desktop hover
//   4. runs the "scroll" link at the bottom
(function () {
  'use strict';

  var LOOP_COPIES = 3; // extra copies after the original set (4 passes total)
  var loop = document.getElementById('loop');
  if (!loop) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The easter-egg notepad. Each hidden thing has a name on the list; the first time you find one,
  // a sheet of notepad slides in from the top with all the names (just the names, no hints) and the
  // one you found gets crossed off in red ink. The list starts fresh on every page load.
  var EGGS = {
    konami: 'Konami Code',
    flyby: 'Fly By',
    chirp: 'You chirping at me??',
    marathon: 'Marathon Man',
    blessing: 'The Blessing',
    purr: 'Purr Factory',
    laser: 'Fricken Laser Beams',
    rainbow: 'Taste the Rainbow'
  };
  var EGG_ORDER = ['konami', 'flyby', 'chirp', 'marathon', 'blessing', 'purr', 'laser', 'rainbow'];
  var eggsFound = {};
  var eggQueue = [];
  var eggBusy = false;
  var eggPad = null;
  var eggItems = {};
  var eggHideTimer = null;
  function buildEggPad() {
    eggPad = document.createElement('div');
    eggPad.className = 'egg-pad';
    eggPad.setAttribute('aria-hidden', 'true');
    var title = document.createElement('div');
    title.className = 'egg-title';
    title.textContent = 'Easter eggs';
    eggPad.appendChild(title);
    EGG_ORDER.forEach(function (id) {
      var row = document.createElement('div');
      row.className = 'egg-row';
      var name = document.createElement('span');
      name.className = 'egg-name';
      name.textContent = EGGS[id];
      row.appendChild(name);
      eggPad.appendChild(row);
      eggItems[id] = row;
    });
    document.body.appendChild(eggPad);
  }
  function runEggQueue() {
    if (eggBusy) return;
    if (!eggQueue.length) {
      eggHideTimer = setTimeout(function () { if (eggPad) eggPad.classList.remove('is-open'); }, 4500);
      return;
    }
    eggBusy = true;
    clearTimeout(eggHideTimer);
    var id = eggQueue.shift();
    var wasOpen = eggPad.classList.contains('is-open');
    eggPad.classList.add('is-open');
    setTimeout(function () {
      eggItems[id].classList.add('is-crossed');
      setTimeout(function () { eggBusy = false; runEggQueue(); }, 1300);
    }, wasOpen ? 250 : 1000);
  }
  function foundEgg(id) {
    if (!EGGS[id] || eggsFound[id]) return;
    eggsFound[id] = true;
    if (!eggPad) buildEggPad();
    eggQueue.push(id);
    runEggQueue();
  }

  // 1. Phone/touch: put each description inside its block
  Array.prototype.forEach.call(loop.querySelectorAll('[data-desc]'), function (link) {
    var desc = document.getElementById('desc-' + link.getAttribute('data-desc'));
    if (!desc) return;
    var inline = document.createElement('div');
    inline.className = 'block-desc';
    inline.innerHTML = desc.innerHTML;
    link.closest('.blocks').appendChild(inline);
  });

  // Fun: on the repeated passes down the page, a couple of the plain-text bands sometimes say
  // something sillier. The first pass is always the real text, and it's random on every load.
  var SILLY_TEXT = {
    'block-2': ['Web Developer (retired)', 'Cat Enthusiast', 'Professional Scroller', 'Not Looking For Work'],
    'block-3': ['Probably Getting Pizza', 'Somewhere Near a Cat', 'Not Looking For Work']
  };
  function sillyText(block) {
    Object.keys(SILLY_TEXT).forEach(function (cls) {
      if (!block.classList.contains(cls) || Math.random() > 0.75) return;
      var p = block.querySelector('p');
      var options = SILLY_TEXT[cls];
      if (p) p.textContent = options[Math.floor(Math.random() * options.length)];
    });
  }

  // 2. Repeat the blocks
  var originals = Array.prototype.slice.call(loop.children);
  for (var i = 0; i < LOOP_COPIES; i++) {
    originals.forEach(function (block) {
      var copy = block.cloneNode(true);
      copy.classList.remove('first-block');
      sillyText(copy);
      loop.appendChild(copy);
    });
  }

  // Phones: mark the blocks that are on (or just off) the screen. The CSS only
  // draws the fixed picture layer for these, so at most a few exist at once.
  // Without this every block had one and iPhone Safari ran out of memory.
  var allBlocks = loop.querySelectorAll('.blocks');
  if ('IntersectionObserver' in window) {
    var nearObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-near', entry.isIntersecting);
      });
    }, { rootMargin: '100px 0px' });
    Array.prototype.forEach.call(allBlocks, function (block) {
      nearObserver.observe(block);
    });
  }

  // 3. Desktop: hover (or keyboard focus) a link to slide its description in
  Array.prototype.forEach.call(loop.querySelectorAll('[data-desc]'), function (link) {
    var panel = document.getElementById('desc-' + link.getAttribute('data-desc'));
    if (!panel) return;
    function open()  { panel.classList.add('is-open'); }
    function close() { panel.classList.remove('is-open'); }
    link.addEventListener('mouseenter', open);
    link.addEventListener('mouseleave', close);
    link.addEventListener('focus', open);
    link.addEventListener('blur', close);
  });

  // Colour swap: every click makes a new random 5-colour palette (a bit like pressing
  // the spacebar on coolors.co, but generated right here, no outside service).
  // Each palette is built from a colour-wheel "harmony" (analogous, complementary,
  // triad...) with a spread of light and dark, so the colours go together.
  // Nothing is saved: every page load starts from the same six-colour default (set at the
  // bottom of this block), in the same order.
  var swapButton = document.getElementById('color-swap');
  if (swapButton) {
    var DARK_INK = '#1B2A2D';      // text colour used on light bands
    var WHITE_INK = '#ffffff';     // text colour used on dark bands (same look as the stylesheet default)
    var WHITE_SHADOW = '0 3px 0 rgba(0, 0, 0, 0.5)';

    function rand(min, max) { return min + Math.random() * (max - min); }

    function shuffle(list) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = list[i]; list[i] = list[j]; list[j] = t;
      }
      return list;
    }

    function hslToHex(h, s, l) {
      s /= 100; l /= 100;
      var a = s * Math.min(l, 1 - l);
      function channel(n) {
        var k = (n + h / 30) % 12;
        var v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
        return ('0' + Math.round(v * 255).toString(16)).slice(-2);
      }
      return '#' + channel(0) + channel(8) + channel(4);
    }

    // hue offsets (degrees around the colour wheel) for five colours
    var HARMONIES = [
      [0, 28, 56, -28, -56],      // analogous: neighbours
      [0, 180, 24, 204, -24],     // complementary: opposites
      [0, 120, 240, 40, 160],     // triad: three evenly spaced
      [0, 150, 210, 30, -30],     // split-complementary
      [0, 90, 180, 270, 45]       // tetradic: four evenly spaced
    ];

    // one colour from each lightness band, so a palette always has dark and light ones
    var LIGHTNESS = [[22, 34], [36, 48], [50, 62], [64, 76], [80, 92]];

    function makePalette() {
      var base = rand(0, 360);
      var harmony = HARMONIES[Math.floor(Math.random() * HARMONIES.length)];
      var lights = shuffle(LIGHTNESS.slice());
      return harmony.map(function (offset, i) {
        var hue = (base + offset + rand(-8, 8) + 360) % 360;
        var l = rand(lights[i][0], lights[i][1]);
        var s = l > 78 ? rand(35, 70) : rand(45, 88); // very light colours look better a bit softer
        return hslToHex(hue, s, l);
      });
    }

    // The order the palette's colours run down the page, in a random order each time.
    // The five colours cycle (A B C D E, A B C D E ...) without a break, so a colour never
    // repeats within any five bands in a row, and never shows up on both sides of another.
    // (With exactly five colours that rule can only be met by cycling in a fixed order.)
    function makeOrder(colorCount) {
      var order = [];
      for (var i = 0; i < colorCount; i++) order.push(i);
      return shuffle(order);
    }

    function luminance(hex) {
      var v = [1, 3, 5].map(function (n) {
        var c = parseInt(hex.substr(n, 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }

    // the text is large and bold, so white needs 3:1 contrast; below that use dark text
    function usesDarkText(hex) {
      return 1.05 / (luminance(hex) + 0.05) < 3;
    }

    function applyPalette(colors, order) {
      Array.prototype.forEach.call(loop.children, function (band, index) {
        // index counts straight down the whole page (all repeats of the blocks), so the
        // cycle doesn't restart or break where the page loops
        var color = colors[order[index % order.length]];
        band.style.backgroundColor = color;
        // always set both explicitly: the default light bands get dark text from the
        // stylesheet, so a dark generated colour has to say "white" itself
        if (usesDarkText(color)) {
          band.style.setProperty('--ink', DARK_INK);
          // a soft halo in the band's own colour lifts dark letters off the dark cat picture
          band.style.setProperty('--shadow', '0 0 3px ' + color + ', 0 0 6px ' + color + ', 0 0 10px ' + color);
        } else {
          band.style.setProperty('--ink', WHITE_INK);
          band.style.setProperty('--shadow', WHITE_SHADOW);
        }
      });
    }

    // Change the colours 10 times (the button or the spacebar, by a person, not by the Konami
    // party) and a pixel rainbow arcs over the cat, then pixel candies rain down.
    var swapCount = 0;
    var countSwap = function () {
      if (++swapCount >= 10) { swapCount = 0; rainbowAndCandy(); }
    };
    swapButton.addEventListener('click', function (e) {
      var colors = makePalette();
      applyPalette(colors, makeOrder(colors.length));
      if (e.isTrusted) countSwap();
    });

    // Fun: the spacebar does the same thing as the button (like coolors.co). It stays out of
    // the way when you're on a link or button, where space already means "press this".
    window.addEventListener('keydown', function (e) {
      if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && e.target.closest && e.target.closest('a, button, input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      swapButton.click();
      countSwap();
    });

    // The default look: these six colours, always in this order (pink, yellow, teal, coral,
    // deep blue, light gray), repeating down the page. Refreshing always brings this back;
    // "Swap colors" is what changes it. Applied instantly (transitions off) so there's no fade
    // from the stylesheet's fallback colours.
    var DEFAULT_PALETTE = ['#E33090', '#FBD40A', '#06B8C1', '#F88480', '#215575', '#EBEDEC'];
    var DEFAULT_ORDER = [0, 1, 2, 3, 4, 5];
    loop.classList.add('no-transition');
    applyPalette(DEFAULT_PALETTE, DEFAULT_ORDER);
    void loop.offsetHeight; // flush styles while transitions are off
    loop.classList.remove('no-transition');
  }

  // Fun: click (or tap) a coloured band and the cats get dealt again. The 16 pictures are
  // frames of one walking cat, so they're shifted along as a set (keeping the walk in order)
  // instead of shuffled, which would stitch different cats together across neighbouring bands.
  var CAT_FRAMES = [1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 13, 14, 15, 16]; // one per band type
  var catShift = 0;
  var catsPreloaded = null;

  function catUrl(n) {
    return 'url("' + new URL('css/images/' + n + '.webp', document.baseURI).href + '")';
  }
  function preloadCats() {
    if (!catsPreloaded) {
      catsPreloaded = Promise.all(Array.prototype.map.call(new Set(CAT_FRAMES), function (n) {
        return new Promise(function (resolve) {
          var img = new Image();
          img.onload = img.onerror = resolve;
          img.src = new URL('css/images/' + n + '.webp', document.baseURI).href;
        });
      }));
    }
    // never wait more than a moment, even on a slow connection
    return Promise.race([catsPreloaded, new Promise(function (r) { setTimeout(r, 1200); })]);
  }
  function dealCats() {
    var all = loop.querySelectorAll('.blocks');
    Array.prototype.forEach.call(all, function (band, i) {
      var frame = CAT_FRAMES[(i % CAT_FRAMES.length + catShift) % CAT_FRAMES.length];
      band.style.setProperty('--bg', catUrl(frame));
    });
  }
  loop.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var band = e.target.closest('.blocks');
    if (!band) return;
    var text = band.querySelector('p');
    if (text && !reduceMotion) {
      text.classList.remove('is-bounced');
      void text.offsetWidth; // restart the animation if clicked again quickly
      text.classList.add('is-bounced');
    }
    catShift = (catShift + 1 + Math.floor(Math.random() * (CAT_FRAMES.length - 1))) % CAT_FRAMES.length;
    preloadCats().then(dealCats);
  });
  loop.addEventListener('animationend', function (e) {
    if (e.animationName === 'band-bounce') e.target.classList.remove('is-bounced');
  });

  // Fun: type "cat" anywhere (or click the cat in the footer) and it rains cats.
  var rainRunning = false;
  function catRain() {
    // (not skipped for "reduce motion": you asked for it by typing the word or tapping the cat)
    if (rainRunning) return;
    rainRunning = true;
    var rain = document.createElement('div');
    rain.className = 'cat-rain';
    rain.setAttribute('aria-hidden', 'true');
    for (var d = 0; d < 36; d++) {
      var drop = document.createElement('div');
      drop.className = 'cat-drop';
      var turn = 20 + Math.random() * 50;
      drop.style.setProperty('--x', (Math.random() * 96 - 4) + '%');
      drop.style.setProperty('--s', (0.35 + Math.random() * 0.5).toFixed(2));
      drop.style.setProperty('--r0', (Math.random() * 40 - 20).toFixed(0) + 'deg');
      drop.style.setProperty('--r1', (Math.random() < 0.5 ? -turn : turn).toFixed(0) + 'deg');
      drop.style.setProperty('--dur', (2.2 + Math.random() * 2).toFixed(2) + 's');
      drop.style.setProperty('--delay', (Math.random() * 1.2).toFixed(2) + 's');
      rain.appendChild(drop);
    }
    var meow = document.createElement('div');
    meow.className = 'cat-meow';
    meow.setAttribute('aria-hidden', 'true');
    meow.textContent = 'purrrrr!';
    document.body.appendChild(rain);
    document.body.appendChild(meow);
    setTimeout(function () {
      rain.remove();
      meow.remove();
      rainRunning = false;
    }, 5800);
  }

  var typed = '';
  var typedTimer = null;
  window.addEventListener('keydown', function (e) {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    clearTimeout(typedTimer);
    typedTimer = setTimeout(function () { typed = ''; }, 1500);
    if (typed.slice(-3) === 'cat') { typed = ''; catRain(); }
  });
  // Fun: pet the cat in the footer (click or tap): hearts float up and he purrs. Pet him 10 times
  // (each within a few seconds of the last) and he goes full happy-wiggle, with a big purr, a burst
  // of hearts, and it rains cats (so phones, which can't type "cat", can get the rain too).
  var footerCatEl = document.querySelector('.footer-cat');
  function floatHeart(x, y) {
    var h = document.createElement('div');
    h.className = 'cat-heart';
    h.setAttribute('aria-hidden', 'true');
    h.textContent = '\u2665';
    h.style.left = x + 'px';
    h.style.top = y + 'px';
    h.style.setProperty('--hs', (22 + Math.random() * 18).toFixed(0) + 'px');
    h.style.setProperty('--dx', (Math.random() * 60 - 30).toFixed(0) + 'px');
    document.body.appendChild(h);
    setTimeout(function () { h.remove(); }, 1700);
  }
  if (footerCatEl) {
    var petCount = 0;
    var petTimer = null;
    var lastPurr = 0;
    var purrEl = null;
    // the happy purr: Mookie's real purr on a loop for about 3 seconds, then fading out
    var bigPurr = function () {
      if (purrEl) purrEl.pause();
      var loud = playSample('purr', 1, function () {
        playCatSound(function (ctx, out, t0) { return buildPurr(ctx, out, t0, 2.6); }, 1.0);
      });
      if (!loud) return;
      loud.loop = true;
      purrEl = loud;
      setTimeout(function () {
        var fade = setInterval(function () {
          if (loud.volume > 0.12) { loud.volume = Math.max(0, loud.volume - 0.12); }
          else { clearInterval(fade); loud.pause(); }
        }, 60);
      }, 2600);
    };
    footerCatEl.addEventListener('click', function () {
      unlockAudio();
      var box = footerCatEl.getBoundingClientRect();
      var hearts = 1 + Math.floor(Math.random() * 2);
      for (var i = 0; i < hearts; i++) floatHeart(box.left + box.width * (0.25 + Math.random() * 0.5), box.top + 14);
      footerCatEl.classList.add('is-petted');
      setTimeout(function () { footerCatEl.classList.remove('is-petted'); }, 140);
      var now = Date.now();
      if (now - lastPurr > 650) {
        lastPurr = now;
        if (!purrEl || purrEl.paused || purrEl.ended) {
          purrEl = playSample('purr', 0.85, function () {
            playCatSound(function (ctx, out, t0) { return buildPurr(ctx, out, t0, 1.1); }, 0.9);
          });
        }
      }
      petCount++;
      clearTimeout(petTimer);
      petTimer = setTimeout(function () { petCount = 0; }, 4000);
      if (petCount >= 10) {
        petCount = 0;
        foundEgg('purr');
        footerCatEl.classList.remove('is-happy');
        void footerCatEl.offsetWidth;
        footerCatEl.classList.add('is-happy');
        setTimeout(function () { footerCatEl.classList.remove('is-happy'); }, 1400);
        bigPurr();
        for (var k = 0; k < 14; k++) {
          (function (delay) {
            setTimeout(function () {
              var b = footerCatEl.getBoundingClientRect();
              floatHeart(b.left + b.width * (0.1 + Math.random() * 0.8), b.top + 10);
            }, delay);
          }(k * 90));
        }
        setTimeout(catRain, 700);
      }
    });
  }

  // Fun: after 10 clicks (anywhere that isn't a link or a button) Mookie drops in from the top of
  // the screen under a spotlight and blesses you. Click again, press Escape, or wait to close it.
  // The holy sound is made right in the browser (Web Audio), so there's no sound file to host:
  // a slow choir-like chord swell (three chords, D -> G -> D) with a deep organ-ish note under it,
  // a bell strike when Mookie lands, and a few sparkling high bells. ~14 seconds, in step with the
  // drop-in. It can only start from a click, which is exactly how Mookie is triggered.
  // HOLY-SOUND-BEGIN
  function buildHolySound(ctx, out, t0) {
    var sources = [];
    function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

    // a big, soft room
    var reverb = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 3.6);
    var ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var data = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb.buffer = ir;
    var wet = ctx.createGain(); wet.gain.value = 0.9;
    reverb.connect(wet); wet.connect(out);
    var dry = ctx.createGain(); dry.gain.value = 0.5;
    dry.connect(out);
    function toRoom(node) { node.connect(dry); node.connect(reverb); }

    function envelope(g, start, dur, peak, attack, release) {
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(peak, t0 + start + attack);
      g.gain.setValueAtTime(peak, t0 + start + dur - release);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    }

    // one "ahh" voice: two slightly detuned saw waves through vowel filters, with a gentle vibrato
    function choirVoice(midi, start, dur, peak, pan) {
      var f = hz(midi);
      var g = ctx.createGain();
      envelope(g, start, dur, peak, 1.8, 2.2);
      var f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 800;  f1.Q.value = 3;
      var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1250; f2.Q.value = 4;
      var g2 = ctx.createGain(); g2.gain.value = 0.7;
      f1.connect(g); f2.connect(g2); g2.connect(g);
      var lfo = ctx.createOscillator(); lfo.frequency.value = 4.8 + Math.random();
      var lfoGain = ctx.createGain(); lfoGain.gain.value = f * 0.004;
      lfo.connect(lfoGain);
      [-7, 7].forEach(function (cents) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents;
        lfoGain.connect(o.frequency);
        o.connect(f1); o.connect(f2);
        o.start(t0 + start); o.stop(t0 + start + dur + 0.1);
        sources.push(o);
      });
      lfo.start(t0 + start); lfo.stop(t0 + start + dur + 0.1);
      sources.push(lfo);
      if (ctx.createStereoPanner) {
        var pn = ctx.createStereoPanner(); pn.pan.value = pan;
        g.connect(pn); toRoom(pn);
      } else {
        toRoom(g);
      }
    }

    // a bell: a few sine partials that each die away at their own speed
    function bell(freq, start, peak) {
      [[1, 1, 3.6], [2, 0.5, 2.8], [2.76, 0.35, 2.0], [5.4, 0.15, 1.1], [8.93, 0.08, 0.7]].forEach(function (pt) {
        var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * pt[0];
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0 + start);
        g.gain.exponentialRampToValueAtTime(peak * pt[1], t0 + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + pt[2]);
        o.connect(g); toRoom(g);
        o.start(t0 + start); o.stop(t0 + start + pt[2] + 0.1);
        sources.push(o);
      });
    }

    // deep note underneath
    var sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = hz(38);
    var subGain = ctx.createGain();
    envelope(subGain, 0, 14, 0.07, 2.5, 3);
    sub.connect(subGain); subGain.connect(out);
    sub.start(t0); sub.stop(t0 + 14.2);
    sources.push(sub);

    // D major -> G major 7 -> D major (add 9)
    var chords = [
      { start: 0,   dur: 5.6, notes: [50, 57, 62, 66, 69] },
      { start: 4.4, dur: 5.6, notes: [43, 50, 59, 66, 74] },
      { start: 8.6, dur: 5.8, notes: [50, 57, 64, 66, 69, 74] }
    ];
    chords.forEach(function (c) {
      c.notes.forEach(function (n, k) {
        choirVoice(n, c.start, c.dur, 0.95 / c.notes.length, (k % 2 ? 1 : -1) * (0.15 + 0.12 * k));
      });
    });

    // Mookie lands (the drop takes about 2.4 s): a bell strike, then sparkles
    bell(hz(74), 2.45, 0.5);
    bell(hz(62), 2.45, 0.4);
    [81, 86, 90, 93].forEach(function (n, k) { bell(hz(n), 2.95 + k * 0.32, 0.16); });
    [86, 90, 93].forEach(function (n, k) { bell(hz(n), 9.2 + k * 0.32, 0.1); });

    return sources;
  }
  // HOLY-SOUND-END

  var audioCtx = null;
  var holy = null;
  function unlockAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (err) { audioCtx = null; }
    return audioCtx;
  }
  function startHolySound() {
    try {
      var ctx = unlockAudio();
      if (!ctx) return;
      stopHolySound(true);
      var out = ctx.createGain();
      out.gain.value = 0.55; // a gentle volume: this plays on its own, so it shouldn't startle anyone
      var limiter = ctx.createDynamicsCompressor(); // keeps the loudest moments from distorting
      out.connect(limiter); limiter.connect(ctx.destination);
      holy = { out: out, limiter: limiter, sources: buildHolySound(ctx, out, ctx.currentTime + 0.05) };
    } catch (err) { holy = null; }
  }
  function stopHolySound(now) {
    if (!holy) return;
    var h = holy;
    holy = null;
    try {
      var t = audioCtx.currentTime;
      h.out.gain.cancelScheduledValues(t);
      h.out.gain.setValueAtTime(h.out.gain.value, t);
      h.out.gain.linearRampToValueAtTime(0, t + (now ? 0.05 : 1.2));
    } catch (err) {}
    setTimeout(function () {
      h.sources.forEach(function (o) { try { o.stop(); } catch (err) {} });
      try { h.out.disconnect(); h.limiter.disconnect(); } catch (err) {}
    }, now ? 100 : 1400);
  }

  var mookie = document.getElementById('mookie');
  if (mookie) {
    var clickCount = 0;
    var mookieOpen = false;
    var mookieTimer = null;
    var mookieHideTimer = null;

    var closeMookie = function () {
      if (!mookieOpen) return;
      mookieOpen = false;
      clearTimeout(mookieTimer);
      mookie.classList.remove('is-on');
      stopHolySound();
      if (blessingPending) { blessingPending = false; setTimeout(function () { foundEgg('blessing'); }, 900); }
      mookieHideTimer = setTimeout(function () { mookie.hidden = true; }, 750);
    };
    var blessingPending = false;
    var openMookie = function () {
      mookieOpen = true;
      blessingPending = true;
      clearTimeout(mookieHideTimer);
      mookie.hidden = false;
      void mookie.offsetWidth; // so the drop-in animation starts from the top
      mookie.classList.add('is-on');
      startHolySound();
      mookieTimer = setTimeout(closeMookie, 14000);
    };

    document.addEventListener('click', function (e) {
      if (mookieOpen) return;
      if (e.target.closest('a, button, #mookie, .footer-cat')) return;
      clickCount++;
      if (clickCount === 1) unlockAudio(); // sound can only start from a click, so get ready early
      if (clickCount === 6) new Image().src = 'css/images/mookie.webp'; // get him ready
      if (clickCount >= 10) { clickCount = 0; openMookie(); }
    });
    mookie.addEventListener('click', closeMookie);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMookie();
    });
  }

  // The cat sounds are made in the browser too: a hiss (breathy, spitty noise) and a meow (a
  // gliding "m-ee-ow" voice run through moving vowel filters).
  // CAT-SOUNDS-BEGIN
  function noiseBuffer(ctx, seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
  function buildHiss(ctx, out, t0) {
    var dur = 1.05;
    var sources = [];
    function noise(seconds) {
      var n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, seconds);
      sources.push(n);
      return n;
    }
    // the hiss itself: bright noise, boosted around 5-6 kHz, with the boost wandering a little
    var hiss = noise(dur + 0.1);
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600; hp.Q.value = 0.8;
    var air = ctx.createBiquadFilter(); air.type = 'peaking'; air.gain.value = 10; air.Q.value = 0.9;
    air.frequency.setValueAtTime(4800, t0);
    air.frequency.linearRampToValueAtTime(6600, t0 + 0.3);
    air.frequency.linearRampToValueAtTime(5200, t0 + 0.9);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 11000;
    // a rough, breathy "hhh" underneath
    var breath = noise(dur + 0.1);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
    var breathGain = ctx.createGain(); breathGain.gain.value = 0.3;
    // the hiss isn't steady: slow random flutter in the loudness (noise squashed to ~20 Hz)
    var wobbleSrc = noise(dur + 0.1);
    var wobbleLp = ctx.createBiquadFilter(); wobbleLp.type = 'lowpass'; wobbleLp.frequency.value = 22;
    var wobbleAmt = ctx.createGain(); wobbleAmt.gain.value = 1.6;
    var turbulence = ctx.createGain(); turbulence.gain.value = 0.7;
    wobbleSrc.connect(wobbleLp); wobbleLp.connect(wobbleAmt); wobbleAmt.connect(turbulence.gain);
    // loudness: a quick "spit" at the start, then a long breath out
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(1.5, t0 + 0.025);
    env.gain.exponentialRampToValueAtTime(0.85, t0 + 0.12);
    env.gain.linearRampToValueAtTime(1.0, t0 + 0.45);
    env.gain.linearRampToValueAtTime(0.55, t0 + 0.75);
    env.gain.linearRampToValueAtTime(0.0001, t0 + 0.98); // fades away like a leaking tyre
    hiss.connect(hp); hp.connect(air); air.connect(lp); lp.connect(turbulence);
    breath.connect(bp); bp.connect(breathGain); breathGain.connect(turbulence);
    turbulence.connect(env); env.connect(out);
    // the "spit": a very short click of noise just before the hiss takes over
    var spit = noise(0.05);
    var spitBp = ctx.createBiquadFilter(); spitBp.type = 'bandpass'; spitBp.frequency.value = 3800; spitBp.Q.value = 0.6;
    var spitGain = ctx.createGain();
    spitGain.gain.setValueAtTime(1.4, t0);
    spitGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
    spit.connect(spitBp); spitBp.connect(spitGain); spitGain.connect(out);
    sources.forEach(function (n) { n.start(t0); n.stop(t0 + dur + 0.1); });
    return sources;
  }
  function buildMeow(ctx, out, t0) {
    var dur = 0.85;
    // the voice: a buzzy wave that rises, hangs, then falls away (like a real "mee-yow")
    var o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(430, t0);
    o.frequency.linearRampToValueAtTime(700, t0 + 0.12);
    o.frequency.linearRampToValueAtTime(790, t0 + 0.3);
    o.frequency.linearRampToValueAtTime(650, t0 + 0.55);
    o.frequency.exponentialRampToValueAtTime(400, t0 + dur);
    // a little wobble so it sounds like a throat and not a synth
    var vib = ctx.createOscillator(); vib.frequency.value = 6;
    var vibAmt = ctx.createGain(); vibAmt.gain.value = 14;
    var creak = ctx.createOscillator(); creak.frequency.value = 41;
    var creakAmt = ctx.createGain(); creakAmt.gain.value = 7;
    vib.connect(vibAmt); vibAmt.connect(o.frequency);
    creak.connect(creakAmt); creakAmt.connect(o.frequency);
    var soften = ctx.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 5200;
    o.connect(soften);
    // breath mixed into the voice
    var air = ctx.createBufferSource(); air.buffer = noiseBuffer(ctx, dur + 0.1);
    var airGain = ctx.createGain(); airGain.gain.value = 0.12;
    air.connect(airGain);
    // vowel filters that move through  m -> ee -> ow -> oo  as the meow goes
    function formant(f, q, level, points) {
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      bp.frequency.setValueAtTime(points[0], t0);
      points.forEach(function (hz, i) {
        if (i) bp.frequency.linearRampToValueAtTime(hz, t0 + dur * [0, 0.14, 0.45, 0.72, 1][i]);
      });
      var g = ctx.createGain(); g.gain.value = level;
      soften.connect(bp); airGain.connect(bp);
      bp.connect(g);
      return g;
    }
    var voice = ctx.createGain();
    [
      formant(1, 6,  1.0, [300, 420, 800, 700, 430]),    // first formant: closed, open, closing
      formant(2, 9,  0.7, [1500, 2700, 1250, 1000, 850]), // second: the "ee" sits high, "ow" low
      formant(3, 10, 0.35, [3000, 3300, 2900, 2600, 2400])
    ].forEach(function (g) { g.connect(voice); });
    // loudness: starts quiet and "closed" (the m), opens up, then tails off
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.5, t0 + 0.04);
    env.gain.linearRampToValueAtTime(1.0, t0 + 0.16);
    env.gain.linearRampToValueAtTime(0.85, t0 + 0.5);
    env.gain.linearRampToValueAtTime(0.4, t0 + 0.7);   // a long "yow" tail, not a sudden stop
    env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    voice.connect(env); env.connect(out);
    var all = [o, vib, creak, air];
    all.forEach(function (n) { n.start(t0); n.stop(t0 + dur + 0.05); });
    return all;
  }
  function buildPurr(ctx, out, t0, dur) {
    // a purr is a low rumble that pulses about 25 times a second
    var n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, dur + 0.2);
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 45;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.8;
    var body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 190; body.gain.value = 8; body.Q.value = 1;
    var pulse = ctx.createGain(); pulse.gain.value = 0.5;
    var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 24 + Math.random() * 3;
    var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt); lfoAmt.connect(pulse.gain);
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(1.0, t0 + Math.min(0.25, dur * 0.25));
    env.gain.setValueAtTime(1.0, t0 + dur - Math.min(0.5, dur * 0.4));
    env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    n.connect(hp); hp.connect(lp); lp.connect(body); body.connect(pulse); pulse.connect(env); env.connect(out);
    n.start(t0); n.stop(t0 + dur + 0.1); lfo.start(t0); lfo.stop(t0 + dur + 0.1);
    return [n, lfo];
  }
  // CAT-SOUNDS-END
  // Mookie's real voice: three short recordings in /sounds. If one can't play (or can't load) the
  // synthesized version is used instead, so there's always a sound.
  var SAMPLE_FILES = {
    meow:  'sounds/mookie-meow.mp3',
    purr:  'sounds/mookie-purr.mp3',
    chirp: 'sounds/mookie-chirp.mp3'
  };
  var sampleEls = {};
  function sampleEl(name) {
    if (!sampleEls[name]) {
      var a = new Audio(SAMPLE_FILES[name]);
      a.preload = 'auto';
      sampleEls[name] = a;
    }
    return sampleEls[name];
  }
  Object.keys(SAMPLE_FILES).forEach(sampleEl); // start loading them now (they're tiny)
  // plays a copy of the recording (so quick repeats can overlap); returns it, or null
  function playSample(name, volume, fallback) {
    try {
      var el = sampleEl(name);
      if (el.error) { if (fallback) fallback(); return null; }
      var c = el.cloneNode();
      c.volume = volume;
      var started = c.play();
      if (started && started.catch) started.catch(function () { if (fallback) fallback(); });
      return c;
    } catch (err) {
      if (fallback) fallback();
      return null;
    }
  }

  function playCatSound(build, volume) {
    try {
      var ctx = unlockAudio();
      if (!ctx) return;
      var out = ctx.createGain();
      out.gain.value = volume;
      out.connect(ctx.destination);
      var srcs = build(ctx, out, ctx.currentTime + 0.02);
      setTimeout(function () { try { out.disconnect(); } catch (err) {} }, 1500);
      return srcs;
    } catch (err) {}
  }

  // Fun: tap the right arrow key 3 times and a pixel cat runs in along the bottom of the screen.
  // Holding an arrow key keeps him running (he loops round the screen); the left arrow turns him
  // round to run the other way. Let go and he finishes crossing and leaves.
  var runner = document.getElementById('runner');
  if (runner) {
    var rightTaps = 0;
    var tapTimer = null;
    var running = false;
    var runDir = 1;      // 1 = running right, -1 = running left
    var heldDir = 0;     // which arrow key is held down right now (0 = none)
    var runX = 0;
    var runWidth = 0;
    var lastFrame = 0;

    // The footer cat (only there once you've scrolled to the end of the page) and the runner can meet.
    // When the runner gets close he does a startled hop, the footer cat hisses, and then he meows.
    // But if he's already in the air (you pressed the up arrow), he leaps right over the footer cat.
    var footerForRunner = document.querySelector('.last-block');
    var peekBox = document.querySelector('.footer-peek');
    var metFooterCat = false;
    var jumpY = 0;          // how high above the ground he is, in px
    var jumpV = 0;          // how fast he's going up (px per second)
    var leaping = false;    // flying over the footer cat
    var leapHissed = false;
    var crossings = 0;      // times he has run clear across the screen since he was called
    var chirpHold = 0;      // seconds left standing still, chirping at a bird
    var GRAVITY = 2400;
    var JUMP_SPEED = 820;   // a hop about 140px high that takes ~0.7 seconds

    var sayWord = function (text, kind, x, y) {
      var w = document.createElement('div');
      w.className = 'cat-sfx is-' + kind;
      w.setAttribute('aria-hidden', 'true');
      w.textContent = text;
      w.style.left = x + 'px';
      w.style.top = y + 'px';
      document.body.appendChild(w);
      setTimeout(function () { w.remove(); }, 1300);
    };
    var hissFooterCat = function (catBox) {
      footerForRunner.classList.add('is-hissing');
      setTimeout(function () { footerForRunner.classList.remove('is-hissing'); }, 800);
      playCatSound(buildHiss, 0.17);
      sayWord('HSSSS!', 'hiss', catBox.left + catBox.width / 2, catBox.top - 34);
    };
    var meetFooterCat = function (catBox) {
      metFooterCat = true;
      if (jumpY > 12) {                              // in the air: leap over!
        leaping = true;
        leapHissed = false;
        sayWord('hup!', 'mew', runX + runWidth / 2, window.innerHeight - runner.offsetHeight - jumpY - 34);
        return;
      }
      runner.classList.add('is-hop');
      setTimeout(function () { runner.classList.remove('is-hop'); }, 500);
      setTimeout(function () { hissFooterCat(peekBox.getBoundingClientRect()); }, 260);
      setTimeout(function () {                       // the meow
        if (!running) return;
        playSample('meow', 1, function () { playCatSound(buildMeow, 0.8); });
        sayWord('mew!', 'mew', runX + runWidth / 2, window.innerHeight - runner.offsetHeight - 34);
      }, 950);
    };
    var checkFooterCat = function () {
      if (!footerForRunner || !peekBox || !footerForRunner.classList.contains('is-peeking')) return;
      var cat = peekBox.getBoundingClientRect();
      if (!cat.width || cat.right < 0 || cat.left > window.innerWidth) return;
      var front = runDir > 0 ? runX + runWidth : runX;
      var gap = runDir > 0 ? cat.left - front : front - cat.right;
      if (!metFooterCat && gap > 0 && gap <= runWidth * 0.55) meetFooterCat(cat);
      else if (metFooterCat && gap > runWidth * 2) metFooterCat = false; // looped round: ready to meet again
    };
    // If the bird flies close while he's running on the ground, he stops, stares and chirps at it,
    // then carries on.
    var checkBird = function () {
      if (!birdActive || birdChirped || chirpHold > 0 || jumpY > 3 || leaping || runner.classList.contains('is-hop')) return;
      var runMid = runX + runWidth / 2;
      var birdMid = birdX + birdW / 2;
      if (runMid < 0 || runMid > window.innerWidth || birdMid < 0 || birdMid > window.innerWidth) return; // both must be on screen
      if (Math.abs(runMid - birdMid) > Math.max(260, runWidth * 0.9)) return;
      birdChirped = true;
      chirpHold = 1.5;
      runner.classList.add('is-watching');
      playSample('chirp', 1);
      foundEgg('chirp');
      sayWord('chrrp!', 'mew', runX + runWidth / 2, window.innerHeight - runner.offsetHeight - 34);
    };
    // up/down movement: a jump, or a glide over the footer cat's head
    var stepJump = function (dt) {
      if (leaping && peekBox) {
        var cat = peekBox.getBoundingClientRect();
        var clearY = window.innerHeight - cat.top + 10;          // just above the footer cat's ears
        jumpV = 0;
        jumpY += (clearY - jumpY) * Math.min(1, 9 * dt);
        var centre = runX + runWidth / 2;
        var catCentre = cat.left + cat.width / 2;
        if (!leapHissed && (runDir > 0 ? centre >= catCentre : centre <= catCentre)) {
          leapHissed = true;                                     // the footer cat hisses as he flies over
          hissFooterCat(cat);
        }
        var back = runDir > 0 ? runX : runX + runWidth;
        if (runDir > 0 ? back > cat.right + 12 : back < cat.left - 12) leaping = false;
      } else if (jumpY > 0 || jumpV > 0) {
        jumpV -= GRAVITY * dt;
        jumpY += jumpV * dt;
        if (jumpY <= 0) { jumpY = 0; jumpV = 0; }
      }
      runner.classList.toggle('is-airborne', jumpY > 3);
      runner.style.translate = jumpY > 0.5 ? '0 ' + (-jumpY).toFixed(1) + 'px' : '';
    };

    var runnerTick = function (now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      var still = chirpHold > 0;           // stopped to chirp at a passing bird
      if (still) {
        chirpHold -= dt;
        if (chirpHold <= 0) runner.classList.remove('is-watching');
      }
      runX += still ? 0 : runDir * runWidth * 1.5 * dt; // about one and a half cat-lengths per second
      var screenW = window.innerWidth;
      if ((runDir > 0 && runX > screenW) || (runDir < 0 && runX < -runWidth)) {
        if (++crossings >= 3) foundEgg('marathon');
      }
      if (runDir > 0 && runX > screenW) {
        if (heldDir === 1) { runX = -runWidth; } else { stopRunner(); return; }
      } else if (runDir < 0 && runX < -runWidth) {
        if (heldDir === -1) { runX = screenW; } else { stopRunner(); return; }
      }
      runner.style.transform = 'translateX(' + runX.toFixed(1) + 'px)';
      checkFooterCat();
      checkBird();
      stepJump(dt);
      requestAnimationFrame(runnerTick);
    };
    var turnRunner = function (dir) {
      runDir = dir;
      runner.classList.toggle('is-left', dir < 0);
    };
    var startRunner = function () {
      running = true;
      metFooterCat = false;
      jumpY = 0; jumpV = 0; leaping = false; chirpHold = 0; crossings = 0;
      runner.classList.remove('is-watching');
      runner.style.translate = '';
      runner.classList.remove('is-airborne');
      runner.hidden = false;
      runWidth = runner.offsetWidth;
      turnRunner(1);
      runX = -runWidth;
      runner.style.transform = 'translateX(' + runX + 'px)';
      lastFrame = performance.now();
      requestAnimationFrame(runnerTick);
    };
    var stopRunner = function () {
      running = false;
      leaping = false;
      chirpHold = 0;
      runner.classList.remove('is-watching');
      runner.hidden = true;
    };

    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'ArrowUp' && running) {   // jump (and don't scroll the page while he's out)
        e.preventDefault();
        if (!e.repeat && jumpY === 0 && !runner.classList.contains('is-hop')) jumpV = JUMP_SPEED;
        return;
      }
      var dir = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
      if (!dir) return;
      unlockAudio(); // a key press counts as the "click" browsers need before they allow sound
      if (running) {
        heldDir = dir;
        turnRunner(dir);
        return;
      }
      if (dir !== 1 || e.repeat) return; // only fresh right-arrow taps call him
      rightTaps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(function () { rightTaps = 0; }, 1400);
      if (rightTaps >= 3) {
        rightTaps = 0;
        heldDir = 1;
        startRunner();
      }
    });
    window.addEventListener('keyup', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
      if (dir && heldDir === dir) heldDir = 0;
    });
    window.addEventListener('blur', function () { heldDir = 0; }); // key-up can get lost if you switch windows
  }

  // Fun: press and hold (mouse button or finger) without moving.
  //   2 seconds         -> a bird flies by (see below)
  //   Shift + hold (mouse), or 4 seconds (finger) -> a red laser dot appears under the pointer and
  //                        Mookie (seen from above this time) chases it around until you let go.
  // When you let go he pounces, then trots off the nearest edge of the screen.
  var laser = document.getElementById('laser');
  var chaser = document.getElementById('chaser');
  var pressing = false;
  var pressType = 'mouse';
  var birdTimer = null;
  var laserTimer = null;
  var swallowClick = false;
  var laserOn = false;
  var pointerX = 0;
  var pointerY = 0;
  var pressX = 0;
  var pressY = 0;
  var chase = null;   // the chase state while Mookie is out on the screen

  function isInteractive(t) {
    return !!(t && t.closest && t.closest('a, button, #mookie, .footer-cat, input, textarea, select'));
  }
  function cancelPress() { clearTimeout(birdTimer); clearTimeout(laserTimer); }
  function mookieIsOpen() { return typeof mookieOpen !== 'undefined' && mookieOpen; }

  function startChase() {
    var w = chaser.offsetWidth || 72;
    var h = chaser.offsetHeight || 96;
    if (chase) { chase.leaving = false; return; }
    var sx, sy;
    if (typeof running !== 'undefined' && running) {      // he was running along the bottom: carry on from there
      sx = runX + runWidth / 2;
      sy = window.innerHeight - 70;
      stopRunner();
    } else {                                              // otherwise he pops up from just below the screen
      sx = Math.max(40, Math.min(window.innerWidth - 40, pointerX));
      sy = window.innerHeight + h;
    }
    chase = { x: sx, y: sy, angle: 0, w: w, h: h, leaving: false, idle: false, exitX: 0, exitY: 0, last: performance.now() };
    chaser.hidden = false;
    chaser.classList.remove('is-idle');
    chaser.style.translate = (sx - w / 2) + 'px ' + (sy - h / 2) + 'px';
    chaser.style.rotate = '0deg';
    requestAnimationFrame(chaseTick);
  }
  function chaseTick(now) {
    if (!chase) return;
    var c = chase;
    var dt = Math.min(0.05, (now - c.last) / 1000);
    c.last = now;
    var tx = c.leaving ? c.exitX : pointerX;
    var ty = c.leaving ? c.exitY : pointerY;
    var dx = tx - c.x;
    var dy = ty - c.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var stop = c.leaving ? 0 : 22;
    if (dist > stop) {
      var maxV = Math.max(320, window.innerWidth * 0.32);
      var speed = c.leaving ? maxV * 0.8 : Math.min(maxV, 70 + dist * 4.5);
      var step = Math.min(dist, speed * dt);
      c.x += dx / dist * step;
      c.y += dy / dist * step;
      // face the way he's going, in 45-degree steps (and don't flip-flop near the boundary)
      var deg = Math.atan2(dx, -dy) * 180 / Math.PI;
      var diff = ((deg - c.angle) % 360 + 540) % 360 - 180;
      if (Math.abs(diff) > 32) c.angle += Math.round(diff / 45) * 45;
      if (c.idle) { c.idle = false; chaser.classList.remove('is-idle', 'is-pounce'); }
    } else if (!c.idle && !c.leaving) {
      c.idle = true;                                      // caught up with the dot: stop, and pounce
      chaser.classList.add('is-idle');
      chaser.classList.remove('is-pounce');
      void chaser.offsetWidth;
      chaser.classList.add('is-pounce');
    }
    chaser.style.translate = (c.x - c.w / 2).toFixed(1) + 'px ' + (c.y - c.h / 2).toFixed(1) + 'px';
    chaser.style.rotate = c.angle + 'deg';
    if (c.leaving && (c.x < -c.w || c.x > window.innerWidth + c.w || c.y < -c.h || c.y > window.innerHeight + c.h)) {
      chaser.hidden = true;
      chaser.classList.remove('is-idle', 'is-pounce');
      chase = null;
      return;
    }
    requestAnimationFrame(chaseTick);
  }
  function startLaser() {
    if (laserOn || mookieIsOpen() || !laser || !chaser) return;
    laserOn = true;
    foundEgg('laser');
    swallowClick = true;
    cancelPress();
    laser.hidden = false;
    laser.style.translate = pointerX + 'px ' + pointerY + 'px';
    if (typeof unlockAudio === 'function') unlockAudio();
    startChase();
  }
  function endLaser() {
    if (!laserOn) return;
    laserOn = false;
    laser.hidden = true;
    if (chase) {
      var c = chase;
      c.leaving = true;
      var w = window.innerWidth, h = window.innerHeight;
      var edges = [[c.x, 0, -c.w - 20, c.y], [w - c.x, 1, w + c.w + 20, c.y], [c.y, 2, c.x, -c.h - 20], [h - c.y, 3, c.x, h + c.h + 20]];
      edges.sort(function (a, b) { return a[0] - b[0]; });
      c.exitX = edges[0][2];
      c.exitY = edges[0][3];
      chaser.classList.remove('is-idle');
      if (typeof sayWord === 'function' && c.y < h && c.y > 0) sayWord('mrrp!', 'mew', c.x, Math.max(30, c.y - c.h / 2 - 10));
    }
  }

  document.addEventListener('mousedown', function (e) {   // shift+click would otherwise select text
    if (e.shiftKey && !isInteractive(e.target)) e.preventDefault();
  });
  document.addEventListener('pointerdown', function (e) {
    if (e.button > 0 || isInteractive(e.target) || mookieIsOpen()) return;
    pressing = true;
    pressType = e.pointerType || 'mouse';
    swallowClick = false;
    pointerX = pressX = e.clientX;
    pointerY = pressY = e.clientY;
    cancelPress();
    if (pressType === 'mouse' && e.shiftKey) {
      startLaser();
    } else {
      birdTimer = setTimeout(function () { swallowClick = true; flyBird(); }, 2000);
      if (pressType !== 'mouse') laserTimer = setTimeout(startLaser, 4000);
    }
  });
  document.addEventListener('pointermove', function (e) {
    if (!pressing) return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (laserOn) {
      laser.style.translate = pointerX + 'px ' + pointerY + 'px';
    } else if (Math.abs(pointerX - pressX) > 14 || Math.abs(pointerY - pressY) > 14) {
      cancelPress();   // moved too much: not a hold
    }
  });
  function releasePress() {
    pressing = false;
    cancelPress();
    endLaser();
    setTimeout(function () { swallowClick = false; }, 120);
  }
  document.addEventListener('pointerup', releasePress);
  document.addEventListener('pointercancel', releasePress);
  document.addEventListener('click', function (e) {       // the release after a hold isn't a real click
    if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('contextmenu', function (e) {  // a long press on a phone would open a menu
    if (pressing && pressType !== 'mouse') e.preventDefault();
  });
  document.addEventListener('touchmove', function (e) {    // while the laser is on, the finger steers it, not the page
    if (laserOn) e.preventDefault();
  }, { passive: false });

  // Fun: after 10 colour changes a pixel rainbow draws itself in an arc over the big cat in the
  // middle of the screen, and then pixel candies rain down from the top and bounce on the "floor".
  var rainbowBusy = false;
  var CANDY_COLORS = [['#e0262e', '#9c1218'], ['#f58a1f', '#b0560a'], ['#f7d117', '#b69a05'], ['#3ba935', '#237320'], ['#7a47b8', '#4c2480']];
  var CANDY_URLS = null;
  function candyUrls() {
    if (CANDY_URLS) return CANDY_URLS;
    var shape = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'];
    CANDY_URLS = CANDY_COLORS.map(function (pair) {
      var c = document.createElement('canvas');
      c.width = 7; c.height = 7;
      var g = c.getContext('2d');
      shape.forEach(function (row, y) {
        for (var x = 0; x < 7; x++) {
          if (row[x] !== 'X') continue;
          g.fillStyle = (x + y >= 8) ? pair[1] : pair[0];
          g.fillRect(x, y, 1, 1);
        }
      });
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(2, 1, 1, 1); g.fillRect(1, 2, 1, 1);
      return c.toDataURL();
    });
    return CANDY_URLS;
  }
  function rainbowAndCandy() {
    if (rainbowBusy) return;
    rainbowBusy = true;
    foundEgg('rainbow');
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    // the arc, drawn as chunky pixels on a tiny canvas that is then scaled up
    var R = Math.min(vh * 0.52, vw * 0.44);
    var u = Math.max(5, Math.round(R / 34));                   // size of one rainbow "pixel"
    var Rc = Math.floor(R / u);                                // outer radius in pixels
    var band = Math.max(2, Math.round(Rc / 16));               // thickness of each colour band
    var legs = Math.round(Rc * 0.25);                           // the ends run straight down a bit
    var cols = Rc * 2 + 1;
    var rows = Rc + legs + 1;
    var colors = ['#e8262f', '#f7861e', '#f9d614', '#3fb14a', '#2b7de0', '#7b3fb4'];
    var cv = document.createElement('canvas');
    cv.width = cols; cv.height = rows;
    var g = cv.getContext('2d');
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var dx = x - Rc;
        var dy = Rc - y;
        var d = dy >= 0 ? Math.sqrt(dx * dx + dy * dy) : Math.abs(dx);
        var k = Math.floor((Rc + 0.5 - d) / band);
        if (k >= 0 && k < colors.length) { g.fillStyle = colors[k]; g.fillRect(x, y, 1, 1); }
      }
    }
    cv.className = 'pixel-rainbow';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.width = cols * u + 'px';
    cv.style.height = rows * u + 'px';
    cv.style.left = (vw / 2 - cols * u / 2) + 'px';
    cv.style.top = (vh * 0.68 - Rc * u) + 'px';
    document.body.appendChild(cv);
    // then the candy
    var urls = candyUrls();
    var rain = document.createElement('div');
    rain.className = 'candy-rain';
    rain.setAttribute('aria-hidden', 'true');
    var size = vw < 700 ? 28 : 35;
    for (var i = 0; i < 70; i++) {
      var c = document.createElement('div');
      c.className = 'candy';
      c.style.backgroundImage = 'url(' + urls[i % urls.length] + ')';
      c.style.setProperty('--x', (Math.random() * 96 + 1).toFixed(1) + '%');
      c.style.setProperty('--floor', (vh - size - Math.random() * 40).toFixed(0) + 'px');
      c.style.setProperty('--spin', (Math.random() * 540 - 270).toFixed(0) + 'deg');
      c.style.setProperty('--dur', (1.6 + Math.random() * 1.4).toFixed(2) + 's');
      c.style.setProperty('--delay', (1.8 + Math.random() * 3.2).toFixed(2) + 's');
      c.style.width = c.style.height = size + 'px';
      rain.appendChild(c);
    }
    document.body.appendChild(rain);
    setTimeout(function () { cv.remove(); }, 8500);
    setTimeout(function () { rain.remove(); rainbowBusy = false; }, 11500);
  }

  // Fun: a pixel bird flies across the whole page in a gentle swooping wave. Press and hold anywhere for two seconds
  // to call him (he also drops by on his own, now and then). If the running cat is out on the ground, he
  // stops and chirps at the bird, then runs on. Hold the right arrow to keep him looping round
  // the screen so he's there when the bird arrives.
  var bird = document.getElementById('bird');
  var birdActive = false;
  var birdChirped = false;
  var birdX = -9999;
  var birdW = 0;
  function flyBird() {
    if (!bird || birdActive) return;
    birdActive = true;
    birdChirped = false;
    foundEgg('flyby');
    bird.hidden = false;
    birdW = bird.offsetWidth;
    var screenW = window.innerWidth;
    var screenH = window.innerHeight;
    var dir = Math.random() < 0.5 ? 1 : -1;               // 1 = flying right (the picture faces left)
    bird.classList.toggle('is-right', dir > 0);
    var travel = screenW + birdW;
    var duration = Math.min(9.5, Math.max(5, travel / 240));
    var baseY = screenH * (0.16 + Math.random() * 0.14);
    var swoop = 45 + Math.random() * 55;                   // how tall the waves are
    var waves = 1.4 + Math.random() * 1.2;                 // how many waves across the screen
    var start = null;
    var frame = function (now) {
      if (start === null) start = now;
      var p = (now - start) / 1000 / duration;
      if (p >= 1) {
        birdActive = false;
        birdX = -9999;
        bird.hidden = true;
        return;
      }
      birdX = dir > 0 ? -birdW + p * travel : screenW - p * travel;
      // a smooth wave, and he dips a bit lower through the middle of the page
      var y = baseY + swoop * Math.sin(p * waves * 2 * Math.PI) + Math.sin(p * Math.PI) * screenH * 0.12;
      bird.style.transform = 'translate(' + birdX.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  // now and then a bird just drops by, once per visit at most, a minute or two after you arrive
  if (bird && !reduceMotion) {
    setTimeout(function () {
      if (Math.random() < 0.4 && !document.hidden && !(typeof mookieOpen !== 'undefined' && mookieOpen)) flyBird();
    }, 60000 + Math.random() * 90000);
  }

  // Fun: the Konami code (up up down down left right left right B A) throws a party: the colours
  // flow from palette to palette, it rains cats, the running cat joins in, and then Mookie
  // arrives to bless everyone. (The colours fade slowly, never flash, and sit still if you have
  // "reduce motion" turned on.)
  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var konamiAt = 0;
  var konamiTimer = null;
  var partyOn = false;

  function startParty() {
    if (partyOn || (typeof mookieOpen !== 'undefined' && mookieOpen)) return;
    partyOn = true;
    catRain();
    flyBird();
    if (typeof startRunner === 'function' && !running) { heldDir = 0; startRunner(); }
    var swaps = 0;
    var swapTimer = null;
    if (swapButton && !reduceMotion) {
      swapTimer = setInterval(function () {
        swapButton.click();
        if (++swaps >= 9) clearInterval(swapTimer);
      }, 650);
    }
    setTimeout(function () {
      clearInterval(swapTimer);
      partyOn = false;
      if (typeof openMookie === 'function' && !mookieOpen) openMookie();
    }, 6200);
  }

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey && e.key.length > 1) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiAt]) {
      konamiAt++;
      clearTimeout(konamiTimer);
      konamiTimer = setTimeout(function () { konamiAt = 0; }, 4000);
      if (konamiAt === KONAMI.length) {
        konamiAt = 0;
        unlockAudio(); // so Mookie's sound is allowed to play when he arrives
        foundEgg('konami');
        startParty();
      }
    } else {
      konamiAt = key === KONAMI[0] ? 1 : 0;
    }
  });

  // Fun: when you switch to another tab, the tab's title tries to get you back.
  var homeTitle = document.title;
  var awayTitles = ['the cats miss you', 'come back... \uD83D\uDC08', 'Mookie is watching', 'psst. the cat is lonely'];
  document.addEventListener('visibilitychange', function () {
    document.title = document.hidden ? awayTitles[Math.floor(Math.random() * awayTitles.length)] : homeTitle;
  });

  // Fun: at the very end of the page a cat peeks up out of the black footer. It rises when the
  // footer comes into view and ducks back down when you leave, so it pops up again each time.
  var footerEl = document.querySelector('.last-block');
  if (footerEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      footerEl.classList.toggle('is-peeking', entries[0].isIntersecting);
    }, { threshold: 0.6 }).observe(footerEl);
  }

  // Tuck the swap button away while the black footer is on screen, so it never covers the
  // "scroll" link and the footer can stay short.
  var swapControls = document.getElementById('swap-controls');
  var footer = document.querySelector('.last-block');
  if (swapControls && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      swapControls.classList.toggle('is-tucked', entries[0].isIntersecting);
    }).observe(footer);
  }

  // 4. "scroll" link: glide to the top, then all the way back down
  var scrollRun = 0; // bumped to cancel a run in progress

  function glideTo(targetY, duration, run, done) {
    var startY = window.pageYOffset;
    var change = targetY - startY;
    var startTime = null;
    function step(now) {
      if (run !== scrollRun) return; // cancelled
      if (startTime === null) startTime = now;
      var progress = Math.min((now - startTime) / duration, 1);
      var eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      window.scrollTo(0, startY + change * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else if (done) {
        done();
      }
    }
    requestAnimationFrame(step);
  }

  // If the visitor scrolls or taps while it's gliding, let them take over
  ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, function () { scrollRun++; }, { passive: true });
  });

  Array.prototype.forEach.call(document.querySelectorAll('a[href="#top"]'), function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      scrollRun++;
      if (reduceMotion) {
        window.scrollTo(0, 0);
        return;
      }
      var run = scrollRun;
      glideTo(0, 3000, run, function () {
        var bottom = document.documentElement.scrollHeight - window.innerHeight;
        glideTo(bottom, 6000, run);
      });
    });
  });
}());
