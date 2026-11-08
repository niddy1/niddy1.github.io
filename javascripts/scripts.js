// No jQuery needed. This file does four things:
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

  // 2. Repeat the blocks
  var originals = Array.prototype.slice.call(loop.children);
  for (var i = 0; i < LOOP_COPIES; i++) {
    originals.forEach(function (block) {
      var copy = block.cloneNode(true);
      copy.classList.remove('first-block');
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

  // Swap text: each click switches the font on the whole page (the blocks, the project
  // descriptions and the footer) to the next one in FONTS, so you can try a bunch and pick a
  // favourite. The current font's name shows next to the buttons. Shift-click goes back one.
  // Nothing is saved: a refresh is back to Inconsolata.
  //
  // The fonts come from Google Fonts and each one is only fetched when you get to it (one
  // stylesheet per font, so a typo in one can't break the others). If a font doesn't load, the
  // label says so and the page keeps the font it had, rather than quietly showing a fallback.
  var fontButton = document.getElementById('font-swap');
  var fontLabel = document.getElementById('font-name');
  if (fontButton && fontLabel) {
    // name = the Google Fonts family name; query = how it's written in the Google Fonts URL;
    // weight = the one to use (fonts that only come in regular use 400, since fake bold looks bad)
    var FONTS = [
      { name: 'Inconsolata',      query: null,                              fallback: 'monospace',  weight: 700 }, // what the site already uses
      { name: 'Space Mono',       query: 'Space+Mono:wght@400;700',         fallback: 'monospace',  weight: 700 },
      { name: 'IBM Plex Mono',    query: 'IBM+Plex+Mono:wght@400;700',      fallback: 'monospace',  weight: 700 },
      { name: 'Courier Prime',    query: 'Courier+Prime:wght@400;700',      fallback: 'monospace',  weight: 700 },
      { name: 'Space Grotesk',    query: 'Space+Grotesk:wght@400;700',      fallback: 'sans-serif', weight: 700 },
      { name: 'Syne',             query: 'Syne:wght@400;700',               fallback: 'sans-serif', weight: 700 },
      { name: 'Unbounded',        query: 'Unbounded:wght@400;700',          fallback: 'sans-serif', weight: 700 },
      { name: 'Fredoka',          query: 'Fredoka:wght@400;700',            fallback: 'sans-serif', weight: 700 },
      { name: 'Oswald',           query: 'Oswald:wght@400;700',             fallback: 'sans-serif', weight: 700 },
      { name: 'Bebas Neue',       query: 'Bebas+Neue',                      fallback: 'sans-serif', weight: 400 },
      { name: 'Archivo Black',    query: 'Archivo+Black',                   fallback: 'sans-serif', weight: 400 },
      { name: 'Righteous',        query: 'Righteous',                       fallback: 'sans-serif', weight: 400 },
      { name: 'Playfair Display', query: 'Playfair+Display:wght@400;700',   fallback: 'serif',      weight: 700 },
      { name: 'DM Serif Display', query: 'DM+Serif+Display',                fallback: 'serif',      weight: 400 },
      { name: 'Abril Fatface',    query: 'Abril+Fatface',                   fallback: 'serif',      weight: 400 },
      { name: 'Special Elite',    query: 'Special+Elite',                   fallback: 'monospace',  weight: 400 },
      { name: 'Pacifico',         query: 'Pacifico',                        fallback: 'cursive',    weight: 400 },
      { name: 'Lobster',          query: 'Lobster',                         fallback: 'cursive',    weight: 400 },
      { name: 'Permanent Marker', query: 'Permanent+Marker',                fallback: 'cursive',    weight: 400 },
      { name: 'Press Start 2P',   query: 'Press+Start+2P',                  fallback: 'monospace',  weight: 400 },
      { name: 'Monoton',          query: 'Monoton',                         fallback: 'sans-serif', weight: 400 }
    ];

    var target = 0;      // the font the last click asked for
    var shown = 0;       // the font actually showing on the page
    var requestId = 0;   // lets a newer click cancel an older one that's still loading
    var fontRequests = {}; // name -> Promise, so each font is only requested once

    function familyOf(f) { return "'" + f.name + "', " + f.fallback; }

    // Fetch one font and wait until the browser really has it. Resolves true or false.
    function loadFont(f) {
      if (fontRequests[f.name]) return fontRequests[f.name];
      fontRequests[f.name] = new Promise(function (resolve) {
        function whenStylesheetIsIn() {
          var timer = setTimeout(function () { resolve(false); }, 5000); // give up after 5s
          document.fonts.load(f.weight + ' 1em "' + f.name + '"', 'Ian Andreu 0123456789').then(
            function (faces) { clearTimeout(timer); resolve(faces.length > 0); },
            function () { clearTimeout(timer); resolve(false); }
          );
        }
        if (!f.query) { resolve(true); return; } // already loaded by index.html
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=' + f.query + '&display=swap';
        link.onload = whenStylesheetIsIn;
        link.onerror = function () { resolve(false); };
        document.head.appendChild(link);
      });
      return fontRequests[f.name];
    }

    function showFont(index) {
      var f = FONTS[index];
      var thisRequest = ++requestId;
      fontLabel.textContent = 'Font: ' + f.name + (f.query ? ' …' : ''); // "…" while it loads
      loadFont(f).then(function (ok) {
        if (thisRequest !== requestId) return; // a newer click took over
        if (ok) {
          document.body.style.setProperty('--font', familyOf(f));
          document.body.style.setProperty('--weight', String(f.weight));
          shown = index;
          fontLabel.textContent = 'Font: ' + f.name;
          loadFont(FONTS[(index + 1) % FONTS.length]); // warm up the next one so the next click is quick
        } else {
          fontLabel.textContent = f.name + " didn't load. Still showing " + FONTS[shown].name;
        }
      });
    }

    fontButton.addEventListener('click', function (e) {
      var step = e.shiftKey ? -1 : 1;
      target = (target + step + FONTS.length) % FONTS.length;
      showFont(target);
    });
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
