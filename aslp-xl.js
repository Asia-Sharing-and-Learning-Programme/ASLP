/* ASLP Excel templates, built in the browser with ExcelJS: one file per CWG, filled in with the current data.
   Only the yellow cells can be changed; everything that can be is a dropdown. Shared by the website and CD Strategies. */
(function () {
  var PW = "aslp";   // sheet protection, so the grey cells and the layout can't be changed by accident
  var NAVY = "FF24215F", INK = "FF333333", GREY = "FFEDEDED", YEL = "FFFFF6CC", BLUE_T = "FF1F4E99";
  var F = function (o) { return Object.assign({ name: "Arial", size: 10 }, o || {}); };
  var thin = { style: "thin", color: { argb: "FFD0D0D0" } }, BOX = { top: thin, left: thin, bottom: thin, right: thin };
  var fill = function (c) { return { type: "pattern", pattern: "solid", fgColor: { argb: c } }; };

  function howTo(wb, title, intro, rules) {
    var ws = wb.addWorksheet("How to use", { properties: { tabColor: { argb: "FFF5C400" } }, views: [{ showGridLines: false }] });
    ws.getColumn(1).width = 3; ws.getColumn(2).width = 112;
    var r = 2, put = function (t, font, h, bg) { var c = ws.getCell(r, 2); c.value = t; c.font = font; c.alignment = { wrapText: true, vertical: "top" }; if (bg) c.fill = fill(bg); if (h) ws.getRow(r).height = h; r++; };
    put(title, F({ bold: true, size: 16, color: { argb: NAVY } }), 26);
    put(intro, F({ size: 10.5, color: { argb: "FF555555" } }), 30); r++;
    put("How it works", F({ bold: true, size: 12, color: { argb: NAVY } }));
    ["1. Change only the yellow cells. Use the dropdowns: most cells only accept a value from the list.",
     "2. Save the file (keep it as .xlsx).",
     "3. Upload it on the website where you downloaded it. You'll see what will change for each territory before anything is saved.",
     "4. Each upload is recorded in each territory's update history."].forEach(function (t) { put(t, F({ size: 10.5 })); });
    r++; put("Rules", F({ bold: true, size: 12, color: { argb: NAVY } }));
    rules.forEach(function (t) { put("• " + t, F({ size: 10.5 }), Math.max(15, Math.ceil(t.length / 120) * 15)); });
    r++; put("Colours", F({ bold: true, size: 12, color: { argb: NAVY } }));
    put("Yellow: you can change these", F({ size: 10.5 }), 0, YEL); put("Grey: locked", F({ size: 10.5 }), 0, GREY);
    return ws;
  }
  function sheet(wb, name, cols, frozenCols) {
    var ws = wb.addWorksheet(name, { properties: { tabColor: { argb: NAVY } }, views: [{ state: "frozen", xSplit: frozenCols || 0, ySplit: 1 }] });
    cols.forEach(function (c, i) { ws.getColumn(i + 1).width = c[1]; var h = ws.getCell(1, i + 1); h.value = c[0]; h.font = F({ bold: true, color: { argb: "FFFFFFFF" } }); h.fill = fill(NAVY); h.alignment = { wrapText: true, vertical: "middle" }; h.border = BOX; });
    ws.getRow(1).height = 36;
    return ws;
  }
  function locked(c, v) { c.value = v == null ? null : v; c.font = F({ color: { argb: "FF444444" } }); c.fill = fill(GREY); c.border = BOX; c.alignment = { vertical: "top", wrapText: true }; }
  function input(c, v, dv, fmt) {
    if (v != null && v !== "") c.value = v; c.font = F(); c.fill = fill(YEL); c.border = BOX; c.alignment = { vertical: "top", wrapText: true }; c.protection = { locked: false };
    if (fmt) c.numFmt = fmt; if (dv) c.dataValidation = dv;
  }
  var list = function (ref, strict, prompt) { return { type: "list", allowBlank: true, formulae: [ref], showErrorMessage: !!strict, errorStyle: "stop", errorTitle: "Choose from the list", error: "Please pick a value from the dropdown.", showInputMessage: !!prompt, prompt: prompt || "" }; };
  var dateDv = { type: "date", operator: "greaterThan", allowBlank: true, formulae: [new Date(2000, 0, 1)], showErrorMessage: true, errorTitle: "Date", error: "Please enter a date (dd/mm/yyyy)." };
  function lists(wb, cols) {   // hidden tab with the dropdown lists; returns the range for each
    var ws = wb.addWorksheet("Lists"), refs = {};
    Object.keys(cols).forEach(function (k, i) { var col = String.fromCharCode(65 + i); ws.getCell(1, i + 1).value = k;
      cols[k].forEach(function (v, n) { ws.getCell(n + 2, i + 1).value = v; }); refs[k] = "Lists!$" + col + "$2:$" + col + "$" + (cols[k].length + 1); });
    ws.state = "veryHidden"; return refs;
  }
  // a tab with one row per item: territory, then the item (as many rows as needed), filled in with what's there now
  function rowsTab(wb, name, cols, rows, dvs, extra) {
    var ws = sheet(wb, name, cols, 1), n = Math.max(rows.length + (extra || 60), 80);
    for (var r = 0; r < n; r++) { var vals = rows[r] || [];
      cols.forEach(function (c, k) { input(ws.getCell(r + 2, k + 1), vals[k], dvs[k], c[2]); }); }
    return ws;
  }
  async function protect(wb) { for (var i = 0; i < wb.worksheets.length; i++) { var ws = wb.worksheets[i]; if (ws.name !== "Lists") await ws.protect(PW, { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true }); } }
  var dateOf = function (s) { if (!s) return null; var d = new Date(String(s).slice(0, 10) + "T00:00:00Z"); return isNaN(d) ? null : d; };
  var years = function () { var a = []; for (var y = 2015; y <= 2040; y++) a.push(String(y)); return a; };
  var quarters = function () { var a = [], y0 = new Date().getFullYear() - 1; for (var y = y0; y <= y0 + 6; y++) for (var q = 1; q <= 4; q++) a.push("Q" + q + " " + y); return a; };
  var RANKS = ["Commissioner", "Colonel", "Lieut-Colonel", "Major", "Captain", "Lieutenant", "Envoy", "Cadet", "Mr", "Mrs", "Ms", "Dr"];
  var BODIES = ["Territorial Executive Council", "Territorial Cabinet", "Territorial Board", "Territorial Leadership Team", "Territorial Commander", "Programme Board", "Board of Trustees (BOT)", "Regional Leadership Team", "Regional Commander", "International Headquarters"];

  // ---------- territory profiles ----------
  // o: { cwg, terrs: [{id, name, profile:{workAreas, thematic[], strengths, techSupport}, contacts:[{rank,name,role}]}], themes[], strengths[], support[], tidy(text) -> items[] }
  async function profiles(o) {
    var wb = new ExcelJS.Workbook(); wb.creator = "ASLP website";
    howTo(wb, o.cwg + " territory profiles: update template", "Filled in with each territory's profile as it is now (" + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "). Change what needs changing and upload it again.", [
      "Profiles tab: only \"Where they work\" is typed. Leave it as it is if nothing changed. To empty it, type a single hyphen: -",
      "Thematic areas and Strengths tabs: one row per item. Pick the territory, then the item from the dropdown. Add rows to add items; clear a row to remove that item. Each territory needs 1 to 20 of each.",
      "Technical support tab: one row per thing the territory can offer. Pick from the dropdown, or type your own if it's not in the list.",
      "Contact persons tab: one row per person. Pick the territory and rank; type the name and appointment. No emails or phone numbers.",
      "For each territory, the lists you upload replace what's on the website.",
      "This file is for " + o.cwg + " only. Grey cells and the tab names can't be changed."]);
    var names = o.terrs.map(function (t) { return t.name; });
    var R = lists(wb, { Territories: names, Themes: o.themes, Strengths: o.strengths, Support: o.support, Ranks: RANKS });
    var terr = list(R.Territories, true, "Pick the territory.");
    var ws = sheet(wb, "Profiles", [["Territory ID", 18], ["Territory", 36], ["CWG", 10], ["Where they work (areas, communities and programmes)", 90]], 3);
    o.terrs.forEach(function (t, i) { var r = i + 2; locked(ws.getCell(r, 1), t.id); locked(ws.getCell(r, 2), t.name); locked(ws.getCell(r, 3), o.cwg);
      input(ws.getCell(r, 4), (t.profile || {}).workAreas || ""); ws.getRow(r).height = 48; });
    var th = [], st = [], su = [], co = [];
    o.terrs.forEach(function (t) { var p = t.profile || {};
      (p.thematic || []).forEach(function (x) { th.push([t.name, x]); });
      String(p.strengths || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) { st.push([t.name, x]); });
      (o.tidy ? o.tidy(p.techSupport || "") : String(p.techSupport || "").split("\n").filter(Boolean)).forEach(function (x) { su.push([t.name, x]); });
      (t.contacts || []).forEach(function (c) { co.push([t.name, c.rank || "", c.name || "", c.role || ""]); }); });
    rowsTab(wb, "Thematic areas", [["Territory", 40], ["Thematic area", 60]], th, [terr, list(R.Themes, true, "Pick a thematic area.")]);
    rowsTab(wb, "Strengths", [["Territory", 40], ["Strength", 70]], st, [terr, list(R.Strengths, true, "Pick a strength.")]);
    rowsTab(wb, "Technical support", [["Territory", 40], ["Technical support they can offer other territories", 80]], su, [terr, list(R.Support, false, "Pick from the list, or type your own.")], 40);
    rowsTab(wb, "Contact persons", [["Territory", 40], ["Rank (officers only)", 18], ["Name", 30], ["Appointment / role", 44]], co, [terr, list(R.Ranks, true), null, null], 40);
    await protect(wb);
    return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  // ---------- CD Strategies ----------
  // o: { cwg, terrs: [{id, name, status, strategyPeriod, target, docLink, focal, focalRole, consultation, approvals[]}], statuses: [{key,label}] }
  async function cds(o) {
    var wb = new ExcelJS.Workbook(); wb.creator = "ASLP CD Strategies";
    howTo(wb, o.cwg + " CD Strategies: update template", "Filled in with each territory's CD Strategy as it is now (" + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "). Change what needs changing and upload it again.", [
      "Status: pick from the dropdown. If you change it, put the date it changed in Status changed on (or leave it blank for today).",
      "Strategy period: pick the start year and the end year.",
      "Target: pick the quarter the strategy is due.",
      "Only the document link, the focal person's name and appointment are typed. To empty one, type a single hyphen: -",
      "Consultation / workshop: pick Yes or No. If Yes, give the start date, the end date (blank for one day) and whether it was before or during drafting.",
      "Approvals tab: one row per approval, as many as a territory has. Pick the territory and the approving body (or type it if it's not in the list) and give the date. For each territory, the approvals you upload replace what's on the website.",
      "No emails or phone numbers: the websites don't keep them.",
      "This file is for " + o.cwg + " only. Grey cells and the tab names can't be changed."]);
    var names = o.terrs.map(function (t) { return t.name; });
    var R = lists(wb, { Territories: names, Status: o.statuses.map(function (s) { return s.label; }), Years: years(), Quarters: quarters(), YesNo: ["Yes", "No"], Timing: ["Before drafting", "During drafting"], Bodies: BODIES });
    var ws = sheet(wb, "CD Strategies", [["Territory ID", 16], ["Territory", 34], ["CWG", 9], ["Status", 22], ["Status changed on", 13], ["Strategy start year", 11], ["Strategy end year", 11], ["Target", 11],
      ["Document link", 30], ["Focal person (name)", 24], ["Focal person appointment / role", 30], ["Consultation / workshop held?", 13], ["Consultation from", 13], ["Consultation to", 13], ["Consultation timing", 17]], 3);
    var lbl = {}; o.statuses.forEach(function (s) { lbl[s.key] = s.label; });
    o.terrs.forEach(function (t, i) {
      var r = i + 2, sp = String(t.strategyPeriod || "").match(/(\d{4})\D+(\d{4})/), c = t.consultation || null;
      locked(ws.getCell(r, 1), t.id); locked(ws.getCell(r, 2), t.name); locked(ws.getCell(r, 3), o.cwg);
      input(ws.getCell(r, 4), lbl[t.status] || "", list(R.Status, true, "Pick the status."));
      input(ws.getCell(r, 5), null, dateDv, "dd/mm/yyyy");
      input(ws.getCell(r, 6), sp ? sp[1] : "", list(R.Years, true)); input(ws.getCell(r, 7), sp ? sp[2] : "", list(R.Years, true));
      input(ws.getCell(r, 8), t.target || "", list(R.Quarters, true));
      input(ws.getCell(r, 9), t.docLink || ""); input(ws.getCell(r, 10), t.focal || ""); input(ws.getCell(r, 11), t.focalRole || "");
      input(ws.getCell(r, 12), c && typeof c.held === "boolean" ? (c.held ? "Yes" : "No") : "", list(R.YesNo, true));
      input(ws.getCell(r, 13), c && c.held ? dateOf(c.from) : null, dateDv, "dd/mm/yyyy"); input(ws.getCell(r, 14), c && c.held ? dateOf(c.to) : null, dateDv, "dd/mm/yyyy");
      input(ws.getCell(r, 15), c && c.held ? (c.timing === "during" ? "During drafting" : "Before drafting") : "", list(R.Timing, true));
      ws.getRow(r).height = 30;
    });
    var ap = []; o.terrs.forEach(function (t) { (t.approvals || []).forEach(function (a) { ap.push([t.name, a.body || "", dateOf(a.date)]); }); });
    rowsTab(wb, "Approvals", [["Territory", 40], ["Approving body", 40], ["Approval date", 15, "dd/mm/yyyy"]], ap,
      [list(R.Territories, true, "Pick the territory."), list(R.Bodies, false, "Pick from the list, or type the body's name."), dateDv], 40);
    await protect(wb);
    return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function save(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  window.ASLPXL = { profiles: profiles, cds: cds, save: save };
})();
