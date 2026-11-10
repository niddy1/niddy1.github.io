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

    swapButton.addEventListener('click', function () {
      var colors = makePalette();
      applyPalette(colors, makeOrder(colors.length));
    });

    // Fun: the spacebar does the same thing as the button (like coolors.co). It stays out of
    // the way when you're on a link or button, where space already means "press this".
    window.addEventListener('keydown', function (e) {
      if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && e.target.closest && e.target.closest('a, button, input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      swapButton.click();
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
    meow.textContent = 'meow!';
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
    typed = (typed + e.key.toLowerCase()).slice(-3);
    clearTimeout(typedTimer);
    typedTimer = setTimeout(function () { typed = ''; }, 1500);
    if (typed === 'cat') { typed = ''; catRain(); }
  });
  var footerCatEl = document.querySelector('.footer-cat');
  if (footerCatEl) footerCatEl.addEventListener('click', catRain);

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
      mookieHideTimer = setTimeout(function () { mookie.hidden = true; }, 750);
    };
    var openMookie = function () {
      mookieOpen = true;
      clearTimeout(mookieHideTimer);
      mookie.hidden = false;
      void mookie.offsetWidth; // so the drop-in animation starts from the top
      mookie.classList.add('is-on');
      startHolySound();
      mookieTimer = setTimeout(closeMookie, 14000);
    };

    document.addEventListener('click', function (e) {
      if (mookieOpen) return;
      if (e.target.closest('a, button, #mookie')) return;
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

    var runnerTick = function (now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      runX += runDir * runWidth * 1.5 * dt; // about one and a half cat-lengths per second
      var screenW = window.innerWidth;
      if (runDir > 0 && runX > screenW) {
        if (heldDir === 1) { runX = -runWidth; } else { stopRunner(); return; }
      } else if (runDir < 0 && runX < -runWidth) {
        if (heldDir === -1) { runX = screenW; } else { stopRunner(); return; }
      }
      runner.style.transform = 'translateX(' + runX.toFixed(1) + 'px)';
      requestAnimationFrame(runnerTick);
    };
    var turnRunner = function (dir) {
      runDir = dir;
      runner.classList.toggle('is-left', dir < 0);
    };
    var startRunner = function () {
      running = true;
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
      runner.hidden = true;
    };

    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      var dir = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
      if (!dir) return;
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
