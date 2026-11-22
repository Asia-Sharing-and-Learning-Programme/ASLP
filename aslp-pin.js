/* ASLP PIN sign-in, shared by the main website, the Calendar and CD Strategies.
   ASLPPin.mount(box, supabaseClient, { onSignedIn })  the sign-in form:
     - Sign in: email + PIN, straight away, no email sent.
     - First time: choose a PIN; the person's CWG lead or an admin approves it (admins and CWG leads: an admin).
     - Forgot PIN: a link to choose a new PIN goes to the person's Gmail. No Gmail yet: they add one,
       their CWG lead or an admin approves it, and then the link goes there.
   ASLPPin.altPrompt(db)   after signing in: choose a new PIN if a reset is due, else finish setting up (PIN, then Gmail).
   ASLPPin.sendEmail / verifyCode   sign-in emails (to the person's Gmail when they added one).
   ASLPPin.altManager(box, db), ASLPPin.setMyPin(db, pin)   for the console. */
(function () {
  if (window.ASLPPin) return;
  var css = '.pin{font-family:inherit;color:inherit}.pin *{box-sizing:border-box}' +
    '.pin label{display:block;font-size:14px;font-weight:700;margin:10px 0 4px}' +
    '.pin input{width:100%;font:inherit;font-size:16px;padding:10px 12px;border:1.5px solid rgba(127,127,127,.45);border-radius:10px;background:transparent;color:inherit}' +
    '.pin input:focus{outline:2px solid #005fc0;outline-offset:1px}' +
    '.pin .pin-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}@media(max-width:520px){.pin .pin-row{grid-template-columns:1fr}}' +
    '.pin .pin-go{margin-top:14px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}' +
    '.pin button.pin-btn{font:inherit;font-weight:700;font-size:15px;border-radius:999px;padding:9px 20px;cursor:pointer;border:1.5px solid #000;background:#000;color:#fff}' +
    '.pin button.pin-btn:disabled{opacity:.55;cursor:default}' +
    '.pin button.pin-link{font:inherit;font-size:14.5px;background:none;border:0;padding:4px 0;color:#005fc0;text-decoration:underline;cursor:pointer}' +
    '.pin .pin-msg{margin-top:10px;font-size:14.5px;line-height:1.45;min-height:1em}.pin .pin-msg.err{color:#b3261e}.pin .pin-msg.ok{color:#1b6e3a}' +
    '.pin .pin-note{font-size:14px;opacity:.85;line-height:1.5;margin:6px 0 0}.pin h3{margin:0 0 6px;font-size:19px;line-height:1.25}.pin .pin-k{font-size:12.5px;font-weight:800;color:#e14b1e;margin:0 0 4px}' +
    'html.dark .pin button.pin-btn,[data-theme=dark] .pin button.pin-btn{background:#f5c400;color:#000;border-color:#f5c400}html.dark .pin button.pin-link,[data-theme=dark] .pin button.pin-link{color:#7db7ff}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .pin button.pin-btn{background:#f5c400;color:#000;border-color:#f5c400}:root:not([data-theme=light]) .pin button.pin-link{color:#7db7ff}}' +
    '.alt-ov{position:fixed;inset:0;z-index:2147482000;background:rgba(10,10,20,.5);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.alt-dlg{background:#fff;color:#111;border-radius:18px;max-width:470px;width:100%;padding:22px 22px 18px;box-shadow:0 24px 60px -20px rgba(0,0,0,.55);font-family:inherit;animation:altIn .4s cubic-bezier(.16,1,.3,1);max-height:calc(100vh - 32px);overflow:auto}' +
    '.alt-dlg .pin button.pin-btn{background:#000;color:#fff;border-color:#000}.alt-dlg .pin button.pin-link{color:#005fc0}' +
    '@keyframes altIn{from{opacity:0;transform:translateY(10px) scale(.98)}}@media (prefers-reduced-motion:reduce){.alt-dlg{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (e) { return String(e || '').trim().toLowerCase(); };
  var okEmail = function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); };
  var okGmail = function (e) { return /^[^@\s]+@(gmail|googlemail)\.com$/.test(e); };
  var weak = function (a) { return /^(\d)\1+$/.test(a) || /^(012345|123456|234567|345678|456789|654321|password|qwerty)/i.test(a); };
  var REMEMBER = 'aslp-pin-email';
  var NOT_REG = 'This email doesn’t have sign-in access. Please contact your CWG lead or the ASLP team.';
  var fn = function (db, name, body) { return db.functions.invoke(name, { body: body }).then(function (r) { return r; }, function (e) { return { error: e }; }); };
  async function fnErr(r) { var m = (r && r.data && r.data.error) || ''; try { if (!m && r && r.error && r.error.context) m = (await r.error.context.json()).error; } catch (e) {} return m; }

  async function sendEmail(db, email, site) {
    var r = await fn(db, 'aslp-signin', { action: 'send', email: norm(email), site: site || 'aslp', redirect: location.origin + location.pathname });
    if (r.error) return { ok: false, reason: 'error' };
    return r.data || { ok: false, reason: 'error' };
  }
  async function verifyCode(db, email, token) {
    var r = await fn(db, 'aslp-signin', { action: 'verify', email: norm(email), token: String(token || '') });
    var d = (r && r.data) || {};
    if (r.error || !d.ok || !d.session) return { ok: false };
    var s = await db.auth.setSession(d.session);
    return { ok: !s.error };
  }
  async function setMyPin(db, pin) {
    var r = await fn(db, 'aslp-pin', { action: 'set_my_pin', pin: pin });
    if (r.error || (r.data && r.data.error)) return { ok: false, message: (await fnErr(r)) || 'That didn’t work. Please try again.' };
    return { ok: true };
  }
  function pinCheck(a, b) { return a.length < 6 ? 'Your PIN needs at least 6 characters.' : weak(a) ? 'That PIN is too easy to guess. Please choose another.' : a !== b ? 'The two PINs don’t match.' : ''; }

  function mount(box, db, opts) {
    opts = opts || {}; if (!box) return;
    var email = opts.email || ''; try { email = email || localStorage.getItem(REMEMBER) || ''; } catch (e) {}
    var remember = function () { try { localStorage.setItem(REMEMBER, email); } catch (e) {} };
    var grab = function () { var i = box.querySelector('#pin-email'); if (i) email = norm(i.value) || email; };
    var emailField = function () { return '<label for="pin-email">Your registered email</label><input type="email" id="pin-email" autocomplete="username" value="' + esc(email) + '" placeholder="name@salvationarmy.org">'; };
    function wire(ids) { for (var k in ids) { var b = box.querySelector('#' + k); if (b) b.onclick = (function (f) { return function () { grab(); f(); }; })(ids[k]); } }
    function say(t, cls, html) { var m = box.querySelector('#pin-msg'); if (!m) return; m.className = 'pin-msg ' + (cls || ''); if (html) m.innerHTML = t; else m.textContent = t; }

    function signInView(msg, cls) {
      box.innerHTML = '<form class="pin" novalidate>' + emailField() +
        '<label for="pin-pin">Your PIN</label><input type="password" id="pin-pin" autocomplete="current-password" placeholder="Your PIN">' +
        '<div class="pin-go"><button type="submit" class="pin-btn" id="pin-in">Sign in</button><button type="button" class="pin-link" id="pin-first">First time? Set up your PIN</button><button type="button" class="pin-link" id="pin-forgot">Forgot your PIN?</button></div>' +
        '<div class="pin-msg ' + (cls || '') + '" role="status" id="pin-msg">' + (msg || '') + '</div></form>';
      wire({ 'pin-first': function () { setView(); }, 'pin-forgot': function () { forgotView(); } });
      box.querySelector('form').onsubmit = async function (ev) {
        ev.preventDefault(); grab();
        var pin = box.querySelector('#pin-pin').value;
        if (!okEmail(email)) return say('Please enter your email.', 'err');
        if (!pin) return say('Please enter your PIN.', 'err');
        var b = box.querySelector('#pin-in'); b.disabled = true; say('Signing in…'); remember();
        var r = await db.auth.signInWithPassword({ email: email, password: pin });
        if (!r.error) { say('Signed in.', 'ok'); if (opts.onSignedIn) opts.onSignedIn(email); return; }
        b.disabled = false;
        var s = {}; try { s = (await db.rpc('aslp_pin_status', { p_email: email })).data || {}; } catch (e) {}
        if (s.registered === false) say(NOT_REG, 'err');
        else if (!s.has_pin && s.request === 'pending') say('Your PIN is waiting for approval by your CWG lead or an admin. You can sign in once it’s approved.', 'err');
        else if (!s.has_pin && s.request === 'declined') say('Your PIN request wasn’t approved. Please contact your CWG lead, or choose <b>First time? Set up your PIN</b> to ask again.', 'err', true);
        else if (!s.has_pin) say('You don’t have a PIN yet. Choose <b>First time? Set up your PIN</b>.', 'err', true);
        else if (/rate|many/i.test(r.error.message || '')) say('Too many tries. Please wait a few minutes and try again.', 'err');
        else say('That PIN isn’t right. Try again, or choose <b>Forgot your PIN?</b>', 'err', true);
      };
    }
    function setView(forReset) {
      box.innerHTML = '<form class="pin" novalidate><p class="pin-k">' + (forReset ? 'New PIN, approved by your CWG lead or an admin' : 'First time: set up your PIN') + '</p>' + emailField() +
        '<div class="pin-row"><div><label for="pin-a">' + (forReset ? 'New PIN' : 'Choose a PIN') + '</label><input type="password" id="pin-a" autocomplete="new-password" placeholder="At least 6 characters"></div>' +
        '<div><label for="pin-b">Type it again</label><input type="password" id="pin-b" autocomplete="new-password"></div></div>' +
        '<p class="pin-note">Use at least 6 numbers or letters that others can’t guess. Your CWG lead or an admin gets an email to approve it (for admins and CWG leads: another admin). Then sign in here with your email and this PIN.</p>' +
        '<div class="pin-go"><button type="submit" class="pin-btn" id="pin-send">Send for approval</button><button type="button" class="pin-link" id="pin-back">Back to sign in</button></div>' +
        '<div class="pin-msg" role="status" id="pin-msg"></div></form>';
      wire({ 'pin-back': function () { signInView(); } });
      box.querySelector('form').onsubmit = async function (ev) {
        ev.preventDefault(); grab();
        var a = box.querySelector('#pin-a').value, b2 = box.querySelector('#pin-b').value;
        if (!okEmail(email)) return say('Please enter your email.', 'err');
        var bad = pinCheck(a, b2); if (bad) return say(bad, 'err');
        var btn = box.querySelector('#pin-send'); btn.disabled = true; say('Sending…');
        var r = await fn(db, 'aslp-signin', { action: 'pin_request', email: email, pin: a }); btn.disabled = false;
        var d = (r && r.data) || {};
        if (r.error || !d.ok) return say(d.reason === 'not_registered' ? NOT_REG : d.reason === 'too_many' ? 'You’ve asked several times today. Please contact your CWG lead or the ASLP team.' : 'That didn’t work. Please try again.', 'err');
        remember();
        signInView('<b>Sent for approval.</b> ' + (d.notified ? 'We’ve emailed your CWG lead and the admins. ' : 'Your CWG lead and the admins will see it in their console. ') + 'Once one of them approves it, sign in here with your email and new PIN.', 'ok');
      };
    }
    function forgotView() {
      box.innerHTML = '<form class="pin" novalidate><p class="pin-k">Forgot your PIN?</p>' + emailField() +
        '<p class="pin-note">We’ll email a link to the Gmail you added. Open it and choose a new PIN. No Gmail added yet? We’ll help you add one.</p>' +
        '<div class="pin-go"><button type="submit" class="pin-btn" id="pin-reset">Send a reset link to my Gmail</button><button type="button" class="pin-link" id="pin-back">Back to sign in</button></div>' +
        '<div class="pin-msg" role="status" id="pin-msg"></div></form>';
      wire({ 'pin-back': function () { signInView(); } });
      box.querySelector('form').onsubmit = async function (ev) {
        ev.preventDefault(); grab();
        if (!okEmail(email)) return say('Please enter your registered email.', 'err');
        var btn = box.querySelector('#pin-reset'); btn.disabled = true; say('Checking…'); remember();
        var r = await fn(db, 'aslp-signin', { action: 'reset_send', email: email, redirect: location.origin + location.pathname });
        btn.disabled = false; var d = (r && r.data) || {};
        if (d.ok) return codeView(d.to);
        if (d.reason === 'no_alt') return gmailView();
        say(d.reason === 'not_registered' ? NOT_REG : d.reason === 'limit' ? 'You’ve asked for several emails this hour. Please try again a little later.' : 'That didn’t work. Please try again.', 'err');
      };
    }
    function codeView(to) {
      box.innerHTML = '<form class="pin" novalidate><p class="pin-k">Check your Gmail</p><h3>We’ve emailed a link to ' + esc(to) + '</h3>' +
        '<p class="pin-note">Open it on this device and you’ll be asked to choose a new PIN. Or type the code from the email here.</p>' +
        '<label for="pin-code">Code from the email</label><input type="text" id="pin-code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456">' +
        '<div class="pin-go"><button type="submit" class="pin-btn" id="pin-cgo">Continue</button><button type="button" class="pin-link" id="pin-back">Back to sign in</button></div>' +
        '<div class="pin-msg" role="status" id="pin-msg"></div></form>';
      wire({ 'pin-back': function () { signInView(); } });
      box.querySelector('form').onsubmit = async function (ev) {
        ev.preventDefault(); var t = box.querySelector('#pin-code').value.replace(/\s+/g, '');
        if (!/^\d{6,10}$/.test(t)) return say('Please type the code from the email (numbers only).', 'err');
        var b = box.querySelector('#pin-cgo'); b.disabled = true; say('Checking…');
        var v = await verifyCode(db, email, t); b.disabled = false;
        if (!v.ok) return say('That code didn’t work. It may have expired or already been used.', 'err');
        say('Signed in.', 'ok'); if (opts.onSignedIn) opts.onSignedIn(email);
      };
    }
    function gmailView() {
      box.innerHTML = '<form class="pin" novalidate><p class="pin-k">Add your Gmail to reset your PIN</p><h3>You haven’t added a Gmail yet</h3>' +
        '<p class="pin-note">Add one now. Your CWG lead or an admin approves it (they get an email). Then we email a link to that Gmail, and you choose a new PIN. From then on, sign-in emails reach you there quickly.</p>' +
        '<label for="pin-g">Your Gmail</label><input type="email" id="pin-g" autocomplete="email" placeholder="yourname@gmail.com">' +
        '<div class="pin-go"><button type="submit" class="pin-btn" id="pin-gsend">Send for approval</button><button type="button" class="pin-link" id="pin-new">Or choose a new PIN for approval instead</button><button type="button" class="pin-link" id="pin-back">Back to sign in</button></div>' +
        '<div class="pin-msg" role="status" id="pin-msg"></div></form>';
      wire({ 'pin-back': function () { signInView(); }, 'pin-new': function () { setView(true); } });
      box.querySelector('form').onsubmit = async function (ev) {
        ev.preventDefault(); var g = norm(box.querySelector('#pin-g').value);
        if (!okGmail(g)) return say('Please enter your Gmail address (ending in @gmail.com).', 'err');
        var b = box.querySelector('#pin-gsend'); b.disabled = true; say('Sending…');
        var r = await fn(db, 'aslp-signin', { action: 'alt_request', email: email, alt: g }); b.disabled = false;
        var d = (r && r.data) || {};
        if (!d.ok) return say(d.reason === 'not_registered' ? NOT_REG : d.reason === 'alt_taken' ? 'That email is already used on the site. Please use your own personal Gmail.' : d.reason === 'bad_alt' ? 'Please use your own Gmail address (ending in @gmail.com), different from your registered email.' : d.reason === 'too_many' ? 'You’ve asked several times today. Please contact your CWG lead or the ASLP team.' : 'That didn’t work. Please try again.', 'err');
        signInView('<b>Sent for approval.</b> ' + (d.notified ? 'We’ve emailed your CWG lead and the admins. ' : '') + 'Once one of them approves it, a link to choose a new PIN arrives in <b>' + esc(g) + '</b>.', 'ok');
      };
    }
    signInView();
  }

  // ---- after signing in: choose a new PIN if a reset is due; otherwise finish setting up (PIN, then Gmail) ----
  function dialog() { var ov = document.createElement('div'); ov.className = 'alt-ov'; ov.innerHTML = '<div class="alt-dlg" role="dialog" aria-modal="true"></div>'; document.body.appendChild(ov); return ov; }
  function pinStep(dlg, db, title, head, skippable, done) {
    dlg.innerHTML = '<form class="pin" novalidate><p class="pin-k">' + esc(title) + '</p><h3>' + esc(head) + '</h3>' +
      '<p class="pin-note">Next time, sign in with your email and this PIN, with no email to wait for.</p>' +
      '<div class="pin-row"><div><label for="np-a">New PIN</label><input type="password" id="np-a" autocomplete="new-password" placeholder="At least 6 characters"></div><div><label for="np-b">Type it again</label><input type="password" id="np-b" autocomplete="new-password"></div></div>' +
      '<div class="pin-go"><button type="submit" class="pin-btn" id="np-save">Save my PIN</button>' + (skippable ? '<button type="button" class="pin-link" id="np-skip">Not now</button>' : '') + '</div><div class="pin-msg" role="status" id="np-msg"></div></form>';
    var m = dlg.querySelector('#np-msg');
    var sk = dlg.querySelector('#np-skip'); if (sk) sk.onclick = function () { done(false); };
    dlg.querySelector('form').onsubmit = async function (ev) {
      ev.preventDefault(); var a = dlg.querySelector('#np-a').value, b = dlg.querySelector('#np-b').value, bad = pinCheck(a, b);
      if (bad) { m.className = 'pin-msg err'; m.textContent = bad; return; }
      dlg.querySelector('#np-save').disabled = true; m.className = 'pin-msg'; m.textContent = 'Saving…';
      var r = await setMyPin(db, a); dlg.querySelector('#np-save').disabled = false;
      if (!r.ok) { m.className = 'pin-msg err'; m.textContent = r.message; return; }
      done(true);
    };
  }
  function altForm(box, db, cur, done, inDialog) {
    var P = inDialog ? 'altd' : 'alt';
    box.innerHTML = '<form class="pin" novalidate>' + (inDialog ? '<p class="pin-k">Optional</p><h3>Would you like an alternative sign-in email via Gmail?</h3>' : '') +
      '<p class="pin-note" style="margin:0 0 6px">Gmail gets sign-in links and codes much faster than work email, and it lets you reset a forgotten PIN yourself. If you add one, every sign-in email for you goes there. If you’d rather not, that’s fine: just make sure you don’t forget your PIN.</p>' +
      '<label for="' + P + '-in">Your Gmail</label><input type="email" id="' + P + '-in" autocomplete="email" placeholder="yourname@gmail.com" value="' + esc(cur || '') + '">' +
      '<div class="pin-go"><button type="submit" class="pin-btn" id="' + P + '-save">' + (cur ? 'Save' : 'Use this Gmail') + '</button>' +
      (inDialog ? '<button type="button" class="pin-link" id="' + P + '-no">No thanks, I’ll remember my PIN</button><button type="button" class="pin-link" id="' + P + '-later">Ask me later</button>'
        : (cur ? '<button type="button" class="pin-link" id="' + P + '-rm">Stop using it</button>' : '')) + '</div>' +
      '<div class="pin-msg" role="status" id="' + P + '-msg"></div></form>';
    var m = box.querySelector('#' + P + '-msg');
    async function save(val, decline) {
      m.className = 'pin-msg'; m.textContent = 'Saving…';
      var r = await db.rpc('aslp_set_alt_email', { p_alt: val, p_decline: !!decline });
      if (r.error) { m.className = 'pin-msg err'; m.textContent = (r.error.message || 'That didn’t work.').replace(/^.*?:\s*/, ''); return false; }
      return true;
    }
    box.querySelector('form').onsubmit = async function (ev) {
      ev.preventDefault(); var v = norm(box.querySelector('#' + P + '-in').value);
      if (!okGmail(v)) { m.className = 'pin-msg err'; m.textContent = 'Please enter a Gmail address (ending in @gmail.com).'; return; }
      if (await save(v, false)) { if (done) done('set', v); else { m.className = 'pin-msg ok'; m.textContent = 'Saved. Sign-in emails now go to ' + v + '.'; } }
    };
    var no = box.querySelector('#' + P + '-no'); if (no) no.onclick = async function () { if (await save('', true) && done) done('declined'); };
    var later = box.querySelector('#' + P + '-later'); if (later) later.onclick = function () { if (done) done('later'); };
    var rm = box.querySelector('#' + P + '-rm'); if (rm) rm.onclick = async function () { if (await save('', true)) altForm(box, db, '', done, inDialog); };
  }
  function finish(dlg, ov, lines) {
    dlg.innerHTML = '<div class="pin"><p class="pin-k">All set</p><h3>You’re ready</h3>' + lines.map(function (l) { return '<p class="pin-note">' + l + '</p>'; }).join('') +
      '<p class="pin-note">You can change these any time in your console under <b>My PIN</b>.</p><div class="pin-go"><button type="button" class="pin-btn" id="alt-ok">OK</button></div></div>';
    dlg.querySelector('#alt-ok').onclick = function () { ov.remove(); };
  }
  async function altPrompt(db) {
    if (document.querySelector('.alt-ov')) return;
    var r = await db.rpc('aslp_alt_status'); var s = (r && r.data) || {};
    if (r.error || !s.registered) return;
    if (s.reset_due) {   // came in through the reset link: choose the new PIN now
      var ov0 = dialog(), d0 = ov0.firstChild;
      pinStep(d0, db, 'Reset your PIN', 'Choose your new PIN', true, function (ok) {
        if (!ok) { ov0.remove(); return; }
        finish(d0, ov0, ['Your new PIN is saved. Use it with your registered email next time.']);
      });
      return;
    }
    var later = false; try { later = !!sessionStorage.getItem('aslp-alt-later'); } catch (e) {}
    var needPin = !s.has_pin, needAlt = !s.answered && !s.via_alt;
    if (later || (!needPin && !needAlt)) return;
    var ov = dialog(), dlg = ov.firstChild, lines = [];
    var stepAlt = function () {
      if (!needAlt) return finish(dlg, ov, lines.length ? lines : ['Sign in with your email and PIN next time.']);
      altForm(dlg, db, '', function (how, v) {
        if (how === 'later') { try { sessionStorage.setItem('aslp-alt-later', '1'); } catch (e) {} ov.remove(); return; }
        lines.push(how === 'set' ? 'Sign-in emails for you now go to <b>' + esc(v) + '</b>, and you can reset a forgotten PIN through it.' : 'No Gmail added. Make sure you don’t forget your PIN.');
        finish(dlg, ov, lines);
      }, true);
    };
    if (needPin) pinStep(dlg, db, 'Finish setting up · step 1 of ' + (needAlt ? 2 : 1), 'Choose your PIN', true, function (ok) { if (ok) lines.push('Your PIN is saved.'); stepAlt(); });
    else stepAlt();
  }
  async function altManager(box, db) {
    if (!box) return; var r = await db.rpc('aslp_alt_status'); var s = (r && r.data) || {};
    if (s.via_alt) { box.innerHTML = '<p class="pin-note">You signed in through your Gmail, <b>' + esc(s.alt || '') + '</b>. To change it, sign in with your registered email and PIN.</p>'; return; }
    altForm(box, db, s.alt || '', null, false);
  }
  window.ASLPPin = { mount: mount, sendEmail: sendEmail, verifyCode: verifyCode, setMyPin: setMyPin, altPrompt: altPrompt, altManager: altManager };
})();
