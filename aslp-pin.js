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
        var r = await db.rpc('aslp_pin_request', { p_email: email, p_pin: a }); btn.disabled = false;
        var d = (r && r.data) || {};
        if (r.error || !d.ok) {
          m.className = 'pin-msg err';
          m.textContent = d.reason === 'not_registered' ? 'This email doesn’t have sign-in access. Please contact your CWG lead or the ASLP team.'
            : d.reason === 'too_many' ? 'You’ve asked several times today. Please contact your CWG lead or the ASLP team.'
            : d.reason === 'pin_length' ? 'Your PIN needs 6 to 40 characters.' : 'That didn’t work. Please try again.';
          return;
        }
        try { localStorage.setItem(REMEMBER, email); } catch (e) {}
        signInView('<b>Sent for approval.</b> Your CWG lead or an admin will see it in their console. Once they approve it, sign in here with your email and new PIN.', 'ok');
      };
    }
    signInView();
  }
  window.ASLPPin = { mount: mount };
})();
