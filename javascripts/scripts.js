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
