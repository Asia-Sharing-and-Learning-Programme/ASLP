/* ASLP guided test runs: one engine for the main website, the Calendar and CD Strategies.
   A page calls ASLPTour.run(steps, { practiceOn, practiceOff, then, label }).
   Each step: { group, el (selector or function), title, text, wait: "click", before (may be async), delay,
                skipIfMissing, nextLabel, go (function run instead of moving on, e.g. to open another site) }.
   During a run the page is in practice mode (the page's own practiceOn/practiceOff), so nothing is saved. */
(function () {
  if (window.ASLPTour) return;
  var css = '.tour{position:fixed;inset:0;z-index:2147483000;pointer-events:none}' +
    '.tour-b{position:fixed;background:rgba(10,10,20,.5);pointer-events:none;transition:all .35s cubic-bezier(.16,1,.3,1)}' +
    '.tour.doing .tour-b{pointer-events:auto}' +
    '.tour-ring{position:fixed;border-radius:12px;box-shadow:0 0 0 3px #f5c400,0 0 0 9px rgba(245,196,0,.3);pointer-events:none;transition:all .35s cubic-bezier(.16,1,.3,1)}' +
    '.tour.doing .tour-ring{animation:tourPulse 1.6s ease-in-out infinite}' +
    '@keyframes tourPulse{50%{box-shadow:0 0 0 3px #f5c400,0 0 0 14px rgba(245,196,0,.15)}}' +
    '.tour-card{position:fixed;width:min(380px,calc(100vw - 24px));background:#fff;color:#111;border-radius:18px;padding:18px 20px 14px;pointer-events:auto;font-family:Archivo,system-ui,sans-serif;text-align:left;' +
    'box-shadow:0 24px 60px -20px rgba(0,0,0,.55);transition:left .35s cubic-bezier(.16,1,.3,1),top .35s cubic-bezier(.16,1,.3,1)}' +
    'html.dark .tour-card,[data-theme=dark] .tour-card{background:#1c1c22;color:#f2f2f2}' +
    '.tour-card.pop{animation:tourPop .5s cubic-bezier(.16,1,.3,1)}.tour-card.busy{opacity:.6}' +
    '@keyframes tourPop{from{opacity:0;transform:translateY(8px) scale(.98)}}' +
    '.tour-k{font-size:12.5px;font-weight:800;color:#e14b1e;margin:0 0 4px}' +
    '.tour-card h3{font-size:20px;font-weight:800;letter-spacing:-.01em;margin:0 0 6px;line-height:1.2;color:inherit}' +
    '.tour-card p{font-size:15.5px;line-height:1.5;margin:0;opacity:.88}' +
    '.tour-card p em{display:block;margin-top:6px;font-style:normal;font-size:13.5px;opacity:.75}' +
    '.tour-nav{display:flex;align-items:center;gap:10px;margin-top:14px}.tour-n{flex:1;text-align:center;font-size:13px;opacity:.6}' +
    '.tour-nav button{font:inherit;font-weight:700;font-size:14.5px;border-radius:999px;padding:8px 18px;cursor:pointer;border:1.5px solid currentColor;background:transparent;color:inherit}' +
    '.tour-nav button.fill{background:#000;color:#fff;border-color:#000}html.dark .tour-nav button.fill{background:#f5c400;color:#000;border-color:#f5c400}' +
    '.tour-nav button[hidden]{display:none}' +
    '.tour-bar{position:fixed;z-index:2147483001;left:50%;top:10px;transform:translateX(-50%);display:flex;gap:12px;align-items:center;background:#f5c400;color:#000;border-radius:999px;' +
    'padding:7px 8px 7px 18px;font:14px/1.3 Archivo,system-ui,sans-serif;box-shadow:0 10px 30px -12px rgba(0,0,0,.5);max-width:calc(100vw - 20px);transition:top .35s cubic-bezier(.16,1,.3,1),bottom .35s cubic-bezier(.16,1,.3,1)}' +
    '.tour-bar.low{top:auto;bottom:12px}' +
    '.tour-bar b{font-weight:800;white-space:nowrap}.tour-bar button{border:0;background:#000;color:#fff;border-radius:999px;padding:6px 14px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}' +
    '@media (max-width:600px){.tour-bar span{display:none}}' +
    '@media (prefers-reduced-motion:reduce){.tour-b,.tour-ring,.tour-card,.tour-bar{transition:none}.tour.doing .tour-ring,.tour-card.pop{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function findEl(sel) {
    var e = typeof sel === 'function' ? sel() : null;
    if (typeof sel === 'string') { var all = document.querySelectorAll(sel); for (var i = 0; i < all.length; i++) if (all[i].getClientRects().length) { e = all[i]; break; } }
    return e && e.getClientRects && e.getClientRects().length ? e : null;
  }
  function waitEl(sel, ms) { ms = ms || 5000; return new Promise(function (r) { var t0 = Date.now(); (function f() { var e = findEl(sel); if (e || Date.now() - t0 > ms) return r(e || null); setTimeout(f, 120); })(); }); }
  function fillIn(sel, v) { var e = findEl(sel); if (e && !e.value) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } }
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var T = null;

  function hostFor() { var d = document.querySelectorAll('dialog[open]'); for (var i = d.length - 1; i >= 0; i--) if (d[i].matches(':modal')) return d[i]; return document.body; }
  function end(done) {
    if (!T) return; var t = T; T = null;
    clearInterval(t.timer); document.removeEventListener('click', t.onClick, true); document.removeEventListener('keydown', t.onKey);
    removeEventListener('resize', t.place); removeEventListener('scroll', t.place, true);
    t.layer.remove(); t.bar.remove(); document.documentElement.classList.remove('touring');
    try { if (t.opts.practiceOff) t.opts.practiceOff(); } catch (e) {}
    try { sessionStorage.removeItem('aslp-tour'); } catch (e) {}
    if (t.opts.onEnd) t.opts.onEnd(!!done);
    if (done && t.opts.then) location.href = t.opts.then;
  }
  function run(steps, opts) {
    opts = opts || {}; if (T) end(false);
    steps = (steps || []).filter(Boolean); if (!steps.length) return;
    try { if (opts.practiceOn) opts.practiceOn(); } catch (e) {}
    document.documentElement.classList.add('touring');
    var layer = document.createElement('div'); layer.className = 'tour';
    layer.innerHTML = '<div class="tour-b"></div><div class="tour-b"></div><div class="tour-b"></div><div class="tour-b"></div><div class="tour-ring"></div>' +
      '<div class="tour-card" role="dialog" aria-live="polite"><div class="tour-k"></div><h3></h3><p></p><div class="tour-nav"><button type="button" data-tn="back">Back</button><span class="tour-n"></span><button type="button" class="fill" data-tn="next">Next</button></div></div>';
    var bar = document.createElement('div'); bar.className = 'tour-bar';
    bar.innerHTML = '<b>Test run</b><span>' + (opts.label || 'Nothing you do now is saved or published.') + '</span><button type="button" data-tn="end">End test run</button>';
    document.body.appendChild(layer); document.body.appendChild(bar);
    var t = T = { steps: steps, i: -1, layer: layer, bar: bar, el: null, opts: opts };
    var card = layer.querySelector('.tour-card'), ring = layer.querySelector('.tour-ring'), bs = layer.querySelectorAll('.tour-b');
    function S(e, o) { for (var k in o) e.style[k] = o[k]; }
    t.place = function () {
      if (T !== t) return;
      var host = hostFor(); if (layer.parentNode !== host) { host.appendChild(layer); host.appendChild(bar); }
      var st = t.steps[t.i];
      if (st && st.el && (!t.el || !t.el.isConnected || !t.el.getClientRects().length)) t.el = findEl(st.el);   // pages that redraw: find the part again
      var e = t.el, vw = innerWidth, vh = innerHeight;
      if (!e) {
        S(bs[0], { left: 0, top: 0, width: vw + 'px', height: vh + 'px' }); for (var k = 1; k < 4; k++) S(bs[k], { width: 0, height: 0 }); ring.style.opacity = 0;
        S(card, { left: Math.max(12, (vw - card.offsetWidth) / 2) + 'px', top: Math.max(70, (vh - card.offsetHeight) / 2) + 'px' });
        bar.classList.remove('low'); return;
      }
      var r = e.getBoundingClientRect(), pad = 8, x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad), w = Math.min(vw, r.right + pad) - x, h = Math.min(vh, r.bottom + pad) - y;
      S(bs[0], { left: 0, top: 0, width: vw + 'px', height: Math.max(0, y) + 'px' });
      S(bs[1], { left: x + w + 'px', top: y + 'px', width: Math.max(0, vw - x - w) + 'px', height: Math.max(0, h) + 'px' });
      S(bs[2], { left: 0, top: y + h + 'px', width: vw + 'px', height: Math.max(0, vh - y - h) + 'px' });
      S(bs[3], { left: 0, top: y + 'px', width: x + 'px', height: Math.max(0, h) + 'px' });
      S(ring, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', opacity: 1 });
      // keep the "Test run" bar off the part being shown
      bar.classList.toggle('low', y < 64 && y + h > 0);
      var low = bar.classList.contains('low'), topMin = low ? 12 : 64, botMax = vh - (low ? 64 : 12);
      var cw = card.offsetWidth, ch = card.offsetHeight, below = y + h + 14 + ch < botMax, above = y - 14 - ch > topMin;
      var top = below ? y + h + 14 : above ? y - 14 - ch : Math.max(topMin, botMax - ch);
      S(card, { left: Math.min(vw - cw - 12, Math.max(12, x + w / 2 - cw / 2)) + 'px', top: top + 'px' });
    };
    t.go = async function (d) {
      var ni = t.i + d; if (ni < 0) return;
      if (ni >= t.steps.length) return end(true);
      var st = t.steps[ni]; t.i = ni; t.el = null; card.classList.add('busy');
      if (st.before) { try { await st.before(); } catch (e) {} }
      if (T !== t) return;
      t.el = st.el ? await waitEl(st.el, st.skipIfMissing ? 1500 : 5000) : null;
      if (T !== t || t.i !== ni) return;
      if (st.el && !t.el && st.skipIfMissing) return t.go(d < 0 ? -1 : 1);
      if (t.el) t.el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      card.querySelector('.tour-k').textContent = st.group || opts.group || 'Test run';
      card.querySelector('h3').textContent = st.title;
      card.querySelector('p').innerHTML = (typeof st.text === 'function' ? st.text() : st.text) + (st.el && !t.el ? '<em>This part isn’t on your screen just now, so read on and select Next.</em>' : '');
      card.querySelector('.tour-n').textContent = (ni + 1) + ' of ' + t.steps.length;
      var nx = card.querySelector('[data-tn="next"]'), waiting = st.wait === 'click' && t.el;
      nx.textContent = st.nextLabel || (ni === t.steps.length - 1 ? 'Finish' : waiting ? 'Skip' : 'Next'); nx.classList.toggle('fill', !waiting);
      card.querySelector('[data-tn="back"]').hidden = ni === 0;
      layer.classList.toggle('doing', !!waiting);
      card.classList.remove('busy', 'pop'); void card.offsetWidth; card.classList.add('pop');
      setTimeout(t.place, 30); setTimeout(t.place, 420);
    };
    t.onClick = function (e) {
      if (T !== t) return;
      var nb = e.target.closest && e.target.closest('[data-tn]');
      if (nb && (layer.contains(nb) || bar.contains(nb))) {
        e.preventDefault(); e.stopPropagation();
        if (nb.dataset.tn === 'end') return end(false);
        if (nb.dataset.tn === 'back') return t.go(-1);
        var st0 = t.steps[t.i]; if (st0 && st0.go) { end(false); st0.go(); return; }
        return t.go(1);
      }
      if (opts.guard && opts.guard(e)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var st = t.steps[t.i]; if (st && st.wait === 'click' && t.el && t.el.contains(e.target)) { var i0 = t.i; setTimeout(function () { if (T === t && t.i === i0) t.go(1); }, st.delay || 350); }
    };
    t.onKey = function (e) { if (T === t && e.key === 'Escape' && !document.querySelector('dialog[open]')) end(false); };
    document.addEventListener('click', t.onClick, true); document.addEventListener('keydown', t.onKey);
    addEventListener('resize', t.place); addEventListener('scroll', t.place, true);
    t.timer = setInterval(t.place, 400);
    t.go(1);
  }
  // pages read this to start a run handed over from another ASLP site: ?tour=1&then=<where to go after>
  function handoff() {
    var q = new URLSearchParams(location.search); if (!q.get('tour')) return null;
    var then = q.get('then') || ''; q.delete('tour'); q.delete('then');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    return { then: /^\/[^/]/.test(then) || then === '/' ? then : '' };
  }
  window.ASLPTour = { run: run, end: end, findEl: findEl, waitEl: waitEl, fillIn: fillIn, sleep: sleep, handoff: handoff,
    active: function () { return !!T; }, isTarget: function (el) { return !!(T && T.el && el && T.el.contains(el)); } };
})();
