/* Shared ASLP site chrome for the CD Strategies and Calendar pages: the main website's top bar,
   footer and Light / Auto / Dark setting (shared across all three, so the choice follows you). */
(function () {
  var page = (document.currentScript && document.currentScript.getAttribute("data-page")) || "";
  var KEY = "cds-theme";   // the main website's theme setting
  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function getMode() { try { return localStorage.getItem(KEY) || "auto"; } catch (e) { return "auto"; } }
  function isDark(m) { return m === "dark" || (m === "auto" && !!(mq && mq.matches)); }
  function apply(m, save) {
    if (m === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", m);
    if (save) { try { localStorage.setItem(KEY, m); localStorage.setItem("cd-theme", m); localStorage.setItem("aslpDark", isDark(m) ? "1" : "0"); } catch (e) {} }
    var bs = document.querySelectorAll("[data-ac-theme]");
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("on", bs[i].getAttribute("data-ac-theme") === m);
    try { window.dispatchEvent(new CustomEvent("aslp-theme", { detail: { mode: m, dark: isDark(m) } })); } catch (e) {}
  }
  apply(getMode(), false);   // before first paint
  if (mq && mq.addEventListener) mq.addEventListener("change", function () { if (getMode() === "auto") apply("auto", false); });
  window.aslpTheme = { mode: getMode, dark: function () { return isDark(getMode()); } };

  var signedIn = false;
  try { signedIn = !!localStorage.getItem("sb-emvtqqjiirgcgghcaeps-auth-token"); } catch (e) {}
  var seg = function (cls) { return '<div class="ac-seg ' + cls + '" role="group" aria-label="Theme"><button type="button" data-ac-theme="light">Light</button><button type="button" data-ac-theme="auto">Auto</button><button type="button" data-ac-theme="dark">Dark</button></div>'; };
  var cur = function (p) { return page === p ? ' class="ac-cur" aria-current="page"' : ""; };
  var top = '<div class="ac-wrap">' +
    '<a class="ac-brand" href="/" aria-label="ASLP home"><img class="ac-on-light" src="/brand/fullname-h.webp" alt="Asia-Pacific Sharing &amp; Learning Programme"><img class="ac-on-dark" src="/brand/fullname-h-dark.webp" alt="Asia-Pacific Sharing &amp; Learning Programme"></a>' +
    '<button type="button" class="ac-menu-btn" aria-expanded="false" aria-controls="ac-menu">Menu</button>' +
    '<nav class="ac-menu" id="ac-menu" aria-label="Main">' +
      '<a href="/#/">Home</a>' +
      '<div class="ac-dd"><a href="/#/about" class="ac-dd-top" aria-haspopup="true">About</a><div class="ac-dd-menu"><a href="/#/about"><b>About ASLP</b><span>What the programme is, what it aims for and how it works</span></a><a href="/#/history"><b>History of ASLP</b><span>The journey from 2016 to today</span></a></div></div>' +
      '<a href="/#/activities">ASLP Activities</a>' +
      '<div class="ac-dd"><a href="/#/groups" class="ac-dd-top" aria-haspopup="true">ASLP Groups</a><div class="ac-dd-menu">' +
        '<a href="/#/cwgs"><b>CWGs</b><span>Cluster Working Groups in SPEA and SASIA</span></a>' +
        '<a href="/#/group/asc"><b>ASC</b><span>ASLP Steering Committee</span></a>' +
        '<a href="/#/group/apsg"><b>APSG</b><span>Asia and the Pacific Strategy Group</span></a>' +
        '<a href="/#/group/sog"><b>SOG</b><span>Support Office Group</span></a>' +
        '<a href="/#/group/fcg"><b>FCG</b><span>Finance Coordination Group</span></a></div></div>' +
      '<div class="ac-dd"><a href="/#/updates" class="ac-dd-top" aria-haspopup="true">ASLP Updates</a><div class="ac-dd-menu"><a href="/#/newsletter"><b>Newsletter</b><span>Every issue of the ASLP newsletter</span></a><a href="/#/updates"><b>CWG Updates</b><span>Activities and news from each CWG</span></a><a href="/#/programmatic"><b>Programmatic Updates</b><span>News from the ASC and the APSG</span></a></div></div>' +
      '<a href="/cd-strategy/"' + cur("cds") + '>CD Strategies</a>' +
      '<a href="/Calendar-2027-2028/"' + cur("calendar") + '>Calendar</a>' +
      seg("ac-seg-in-menu") +
    '</nav>' + seg("") +
    '<a class="ac-auth" href="/#/console">' + (signedIn ? "Console" : "Sign in") + '</a></div>';
  var foot = '<div class="ac-wrap"><div><p class="ac-fname"><b>Asia-Pacific</b><br><span>Sharing &amp; Learning</span><br><b>Programme</b></p>' +
    '<div class="ac-tagline"><span class="a">LISTEN.</span> <span class="b">LEARN.</span> <span class="c">LEAD.</span></div></div>' +
    '<nav aria-label="Footer"><a href="/#/about">About ASLP</a><a href="/#/activities">ASLP Activities</a><a href="/#/cwgs">Cluster Working Groups</a><a href="/#/groups">ASLP Groups</a><a href="/#/newsletter">Newsletter</a><a href="/#/updates">CWG Updates</a><a href="/#/programmatic">Programmatic Updates</a><a href="/cd-strategy/">CD Strategies</a><a href="/Calendar-2027-2028/">Calendar</a><a href="/#/console">' + (signedIn ? "Console" : "Sign in") + '</a></nav>' +
    '<div class="ac-copy">© ' + new Date().getFullYear() + ' Asia-Pacific Sharing &amp; Learning Programme, The Salvation Army<span id="ac-extra"></span></div></div>';

  function mount() {
    var old = document.querySelector(".back-strip"); if (old) old.remove();
    var t = document.createElement("div"); t.className = "ac-top"; t.setAttribute("role", "banner"); t.innerHTML = top; document.body.insertBefore(t, document.body.firstChild);
    var f = document.createElement("div"); f.className = "ac-foot"; f.setAttribute("role", "contentinfo"); f.innerHTML = foot; document.body.appendChild(f);
    var btn = t.querySelector(".ac-menu-btn"), menu = t.querySelector(".ac-menu");
    btn.addEventListener("click", function () { var o = menu.classList.toggle("open"); btn.setAttribute("aria-expanded", o ? "true" : "false"); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-ac-theme]"); if (b) apply(b.getAttribute("data-ac-theme"), true);
      if (menu.classList.contains("open") && !t.contains(e.target)) { menu.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
    // Sign in here uses this page's own sign-in, so you stay on the page; once signed in it opens the Console
    var auth = t.querySelector(".ac-auth");
    auth.addEventListener("click", function (e) {
      if (signedIn) return;
      var own = document.getElementById("auth-btn") || document.getElementById("signinbtn");
      if (own) { e.preventDefault(); own.click(); }
    });
    apply(getMode(), false);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
