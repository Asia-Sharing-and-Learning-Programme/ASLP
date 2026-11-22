/* ASLP PIN sign-in, shared by the main website, the Calendar and CD Strategies.
   ASLPPin.mount(box, supabaseClient, { onSignedIn, email }) draws the form into box.
   - Sign in: email + PIN, straight away, no email sent.
   - No PIN yet, or forgot it: choose a new PIN; it waits for approval by the person's CWG lead or an admin
     (admins and CWG leads: by an admin). Once approved, the same email + PIN signs in. */
(function () {
  if (window.ASLPPin) return;
  var css = '.pin{font-family:inherit;color:inherit}.pin *{box-sizing:border-box}' +
    '.pin label{display:block;font-size:14px;font-weight:700;margin:10px 0 4px}' +
    '.pin input{width:100%;font:inherit;font-size:16px;padding:10px 12px;border:1.5px solid rgba(127,127,127,.45);border-radius:10px;background:transparent;color:inherit}' +
    '.pin input:focus{outline:2px solid #005fc0;outline-offset:1px}' +
    '.pin .pin-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}@media(max-width:520px){.pin .pin-row{grid-template-columns:1fr}}' +
    '.pin .pin-go{margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}' +
    '.pin button.pin-btn{font:inherit;font-weight:700;font-size:15px;border-radius:999px;padding:9px 20px;cursor:pointer;border:1.5px solid #000;background:#000;color:#fff}' +
    '.pin button.pin-btn:disabled{opacity:.55;cursor:default}' +
    '.pin button.pin-link{font:inherit;font-size:14.5px;background:none;border:0;padding:4px 0;color:#005fc0;text-decoration:underline;cursor:pointer}' +
    '.pin .pin-msg{margin-top:10px;font-size:14.5px;line-height:1.45;min-height:1em}.pin .pin-msg.err{color:#b3261e}.pin .pin-msg.ok{color:#1b6e3a}' +
    '.pin .pin-note{font-size:14px;opacity:.8;line-height:1.45;margin-top:6px}' +
    'html.dark .pin button.pin-btn,[data-theme=dark] .pin button.pin-btn{background:#f5c400;color:#000;border-color:#f5c400}html.dark .pin button.pin-link,[data-theme=dark] .pin button.pin-link{color:#7db7ff}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .pin button.pin-btn{background:#f5c400;color:#000;border-color:#f5c400}:root:not([data-theme=light]) .pin button.pin-link{color:#7db7ff}}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (e) { return String(e || '').trim().toLowerCase(); };
  var okEmail = function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); };
  var REMEMBER = 'aslp-pin-email';

  function mount(box, db, opts) {
    opts = opts || {}; if (!box) return;
    var email = opts.email || ''; try { email = email || localStorage.getItem(REMEMBER) || ''; } catch (e) {}
    function signInView(msg, cls) {
      box.innerHTML = '<form class="pin" novalidate><label for="pin-email">Your email</label><input type="email" id="pin-email" autocomplete="username" value="' + esc(email) + '" placeholder="name@salvationarmy.org">' +
        '<label for="pin-pin">Your PIN</label><input type="password" id="pin-pin" autocomplete="current-password" placeholder="Your PIN">' +
        '<div class="pin-go"><button type="submit" class="pin-btn" id="pin-in">Sign in</button><button type="button" class="pin-link" id="pin-new">No PIN yet, or forgot it?</button></div>' +
        '<div class="pin-msg ' + (cls || '') + '" role="status" id="pin-msg">' + (msg || '') + '</div></form>';
      var f = box.querySelector('form'), m = box.querySelector('#pin-msg');
      box.querySelector('#pin-new').onclick = function () { email = norm(box.querySelector('#pin-email').value) || email; setView(); };
      f.onsubmit = async function (ev) {
        ev.preventDefault();
        email = norm(box.querySelector('#pin-email').value); var pin = box.querySelector('#pin-pin').value;
        if (!okEmail(email)) { m.className = 'pin-msg err'; m.textContent = 'Please enter your email.'; return; }
        if (!pin) { m.className = 'pin-msg err'; m.textContent = 'Please enter your PIN.'; return; }
        var b = box.querySelector('#pin-in'); b.disabled = true; m.className = 'pin-msg'; m.textContent = 'Signing in…';
        try { localStorage.setItem(REMEMBER, email); } catch (e) {}
        var r = await db.auth.signInWithPassword({ email: email, password: pin });
        if (!r.error) { m.className = 'pin-msg ok'; m.textContent = 'Signed in.'; if (opts.onSignedIn) opts.onSignedIn(email); return; }
        b.disabled = false;
        var s = {}; try { s = (await db.rpc('aslp_pin_status', { p_email: email })).data || {}; } catch (e) {}
        m.className = 'pin-msg err';
        if (s.registered === false) m.textContent = 'This email doesn’t have sign-in access. Please contact your CWG lead or the ASLP team.';
        else if (!s.has_pin && s.request === 'pending') m.textContent = 'Your PIN is waiting for approval by your CWG lead or an admin. You can sign in once it’s approved.';
        else if (!s.has_pin && s.request === 'declined') m.innerHTML = 'Your PIN request wasn’t approved. Please contact your CWG lead, or choose <b>No PIN yet, or forgot it?</b> to ask again.';
        else if (!s.has_pin) m.innerHTML = 'You don’t have a PIN yet. Choose <b>No PIN yet, or forgot it?</b> to set one up.';
        else if (s.request === 'pending') m.textContent = 'That PIN isn’t right. Your new PIN is still waiting for approval, so until then use your old PIN.';
        else if (/rate|many/i.test(r.error.message || '')) m.textContent = 'Too many tries. Please wait a few minutes and try again.';
        else m.innerHTML = 'That PIN isn’t right. Try again, or choose <b>No PIN yet, or forgot it?</b>';
      };
    }
    function setView() {
      box.innerHTML = '<form class="pin" novalidate><label for="pin-email">Your email</label><input type="email" id="pin-email" autocomplete="username" value="' + esc(email) + '">' +
        '<div class="pin-row"><div><label for="pin-a">New PIN</label><input type="password" id="pin-a" autocomplete="new-password" placeholder="At least 6 characters"></div>' +
        '<div><label for="pin-b">Type it again</label><input type="password" id="pin-b" autocomplete="new-password"></div></div>' +
        '<p class="pin-note">Use at least 6 numbers or letters that others can’t guess. Your CWG lead or an admin approves it first (admins and CWG leads: another admin). Then you sign in with your email and this PIN, with no email to wait for.</p>' +
        '<div class="pin-go"><button type="submit" class="pin-btn" id="pin-send">Send for approval</button><button type="button" class="pin-link" id="pin-back">Back to sign in</button></div>' +
        '<div class="pin-msg" role="status" id="pin-msg"></div></form>';
      var f = box.querySelector('form'), m = box.querySelector('#pin-msg');
      box.querySelector('#pin-back').onclick = function () { signInView(); };
      f.onsubmit = async function (ev) {
        ev.preventDefault();
        email = norm(box.querySelector('#pin-email').value); var a = box.querySelector('#pin-a').value, b2 = box.querySelector('#pin-b').value;
        m.className = 'pin-msg err';
        if (!okEmail(email)) { m.textContent = 'Please enter your email.'; return; }
        if (a.length < 6) { m.textContent = 'Your PIN needs at least 6 characters.'; return; }
        if (/^(\d)\1+$/.test(a) || /^(012345|123456|234567|345678|456789|654321|password)/i.test(a)) { m.textContent = 'That PIN is too easy to guess. Please choose another.'; return; }
        if (a !== b2) { m.textContent = 'The two PINs don’t match.'; return; }
        var btn = box.querySelector('#pin-send'); btn.disabled = true; m.className = 'pin-msg'; m.textContent = 'Sending…';
        var r = await db.functions.invoke('aslp-signin', { body: { action: 'pin_request', email: email, pin: a } }); btn.disabled = false;
        var d = (r && r.data) || {};
        if (r.error || !d.ok) {
          m.className = 'pin-msg err';
          m.textContent = d.reason === 'not_registered' ? 'This email doesn’t have sign-in access. Please contact your CWG lead or the ASLP team.'
            : d.reason === 'too_many' ? 'You’ve asked several times today. Please contact your CWG lead or the ASLP team.'
            : d.reason === 'pin_length' ? 'Your PIN needs 6 to 40 characters.' : 'That didn’t work. Please try again.';
          return;
        }
        try { localStorage.setItem(REMEMBER, email); } catch (e) {}
        signInView('<b>Sent for approval.</b> ' + (d.notified ? 'We\u2019ve emailed your CWG lead and the admins. ' : 'Your CWG lead and the admins will see it in their console. ') + 'Once one of them approves it, sign in here with your email and new PIN.', 'ok');
      };
    }
    signInView();
  }
  // sign-in emails go to the person's own Gmail if they added one (fast), otherwise to their registered email
  async function sendEmail(db, email, site) {
    var r = await db.functions.invoke('aslp-signin', { body: { action: 'send', email: norm(email), site: site || 'aslp', redirect: location.origin + location.pathname } });
    if (r.error) return { ok: false, reason: 'error' };
    return r.data || { ok: false, reason: 'error' };
  }
  async function verifyCode(db, email, token) {
    var r = await db.functions.invoke('aslp-signin', { body: { action: 'verify', email: norm(email), token: String(token || '') } });
    var d = (r && r.data) || {};
    if (r.error || !d.ok || !d.session) return { ok: false };
    var s = await db.auth.setSession(d.session);
    return { ok: !s.error };
  }
  var mcss = '.alt-ov{position:fixed;inset:0;z-index:2147482000;background:rgba(10,10,20,.5);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.alt-dlg{background:#fff;color:#111;border-radius:18px;max-width:460px;width:100%;padding:22px 22px 18px;box-shadow:0 24px 60px -20px rgba(0,0,0,.55);font-family:inherit;animation:altIn .4s cubic-bezier(.16,1,.3,1)}' +
    '@keyframes altIn{from{opacity:0;transform:translateY(10px) scale(.98)}}@media (prefers-reduced-motion:reduce){.alt-dlg{animation:none}}' +
    '.alt-dlg h3{margin:0 0 8px;font-size:21px;line-height:1.25}.alt-dlg p{margin:0 0 8px;font-size:15px;line-height:1.5;opacity:.85}' +
    '.alt-dlg .pin-go{margin-top:14px}';
  var ms = document.createElement('style'); ms.textContent = mcss; (document.head || document.documentElement).appendChild(ms);
  function altForm(box, db, cur, done, inDialog) {
    var P = inDialog ? 'altd' : 'alt';
    box.innerHTML = '<form class="pin" novalidate>' + (inDialog ? '<h3>Would you like an alternative sign-in email via Gmail?</h3>' : '') +
      '<p class="pin-note" style="margin:0 0 6px">Gmail gets sign-in links and codes much faster than work email. If you add one, every sign-in email for you goes there. If you\u2019d rather not, that\u2019s fine: just make sure you don\u2019t forget your PIN.</p>' +
      '<label for="' + P + '-in">Your Gmail</label><input type="email" id="' + P + '-in" autocomplete="email" placeholder="yourname@gmail.com" value="' + esc(cur || '') + '">' +
      '<div class="pin-go"><button type="submit" class="pin-btn" id="' + P + '-save">' + (cur ? 'Save' : 'Use this Gmail') + '</button>' +
      (inDialog ? '<button type="button" class="pin-link" id="' + P + '-no">No thanks, I\u2019ll remember my PIN</button><button type="button" class="pin-link" id="' + P + '-later">Ask me later</button>'
        : (cur ? '<button type="button" class="pin-link" id="' + P + '-rm">Stop using it</button>' : '')) + '</div>' +
      '<div class="pin-msg" role="status" id="' + P + '-msg"></div></form>';
    var m = box.querySelector('#' + P + '-msg');
    async function save(val, decline) {
      m.className = 'pin-msg'; m.textContent = 'Saving\u2026';
      var r = await db.rpc('aslp_set_alt_email', { p_alt: val, p_decline: !!decline });
      if (r.error) { m.className = 'pin-msg err'; m.textContent = (r.error.message || 'That didn\u2019t work.').replace(/^.*?:\s*/, ''); return false; }
      return true;
    }
    box.querySelector('form').onsubmit = async function (ev) {
      ev.preventDefault(); var v = norm(box.querySelector('#' + P + '-in').value);
      if (!okEmail(v)) { m.className = 'pin-msg err'; m.textContent = 'Please enter your Gmail address.'; return; }
      if (await save(v, false)) { if (done) done('set', v); else { m.className = 'pin-msg ok'; m.textContent = 'Saved. Sign-in emails now go to ' + v + '.'; } }
    };
    var no = box.querySelector('#' + P + '-no'); if (no) no.onclick = async function () { if (await save('', true) && done) done('declined'); };
    var later = box.querySelector('#' + P + '-later'); if (later) later.onclick = function () { if (done) done('later'); };
    var rm = box.querySelector('#' + P + '-rm'); if (rm) rm.onclick = async function () { if (await save('', true)) altForm(box, db, '', done, inDialog); };
  }
  // ask once, after someone signs in, until they answer (\u201cAsk me later\u201d waits until their next visit)
  async function altPrompt(db) {
    try { if (sessionStorage.getItem('aslp-alt-later')) return; } catch (e) {}
    if (document.querySelector('.alt-ov')) return;
    var r = await db.rpc('aslp_alt_status'); var s = (r && r.data) || {};
    if (r.error || !s.registered || s.answered || s.via_alt) return;
    var ov = document.createElement('div'); ov.className = 'alt-ov'; ov.innerHTML = '<div class="alt-dlg" role="dialog" aria-modal="true" aria-label="Alternative sign-in email"></div>';
    document.body.appendChild(ov);
    altForm(ov.firstChild, db, '', function (how, v) {
      if (how === 'later') { try { sessionStorage.setItem('aslp-alt-later', '1'); } catch (e) {} ov.remove(); return; }
      ov.firstChild.innerHTML = '<div class="pin"><h3>' + (how === 'set' ? 'Done' : 'All right') + '</h3><p>' + (how === 'set' ? 'From now on, sign-in emails for you go to <b>' + esc(v) + '</b>. You can change this any time in your console under <b>My PIN</b>.' : 'Sign in with your email and PIN. If you ever change your mind, add a Gmail in your console under <b>My PIN</b>.') +
        '</p><div class="pin-go"><button type="button" class="pin-btn" id="alt-ok">OK</button></div></div>';
      ov.querySelector('#alt-ok').onclick = function () { ov.remove(); };
    }, true);
  }
  async function altManager(box, db) {
    if (!box) return; var r = await db.rpc('aslp_alt_status'); var s = (r && r.data) || {};
    if (s.via_alt) { box.innerHTML = '<p class="pin-note">You signed in with your Gmail, <b>' + esc(s.alt || '') + '</b>. To change it, sign in with your registered email and PIN.</p>'; return; }
    altForm(box, db, s.alt || '', null, false);
  }
  window.ASLPPin = { mount: mount, sendEmail: sendEmail, verifyCode: verifyCode, altPrompt: altPrompt, altManager: altManager };
})();
