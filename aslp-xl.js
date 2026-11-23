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

  // one block of rows per territory: the territory's name runs down the block, and everything for it is entered beside it
  var MED = { style: "medium", color: { argb: NAVY } };
  function blocks(ws, terrs, n, fill1) {
    var r = 2;
    terrs.forEach(function (t) {
      var r2 = r + n - 1; fill1(t, r, r2);
      for (var c = 1; c <= ws.columnCount; c++) { var cell = ws.getCell(r2, c); cell.border = Object.assign({}, cell.border || BOX, { bottom: MED }); }
      r = r2 + 1;
    });
  }
  function merged(ws, r1, r2, c, v, edit) { ws.mergeCells(r1, c, r2, c); var cell = ws.getCell(r1, c);
    if (edit) input(cell, v); else locked(cell, v); cell.alignment = { vertical: "top", wrapText: true }; }
  function grey(c) { c.fill = fill(GREY); c.border = BOX; }

  // ---------- territory profiles ----------
  // o: { cwg, terrs: [{id, name, profile:{workAreas, thematic[], strengths[], support[]}, contacts:[{rank,name,role}]}], themes[], strengths[] }
  async function profiles(o) {
    var wb = new ExcelJS.Workbook(); wb.creator = "ASLP website";
    var N = 8, TH = 8, ST = 8, SU = 5, CO = 2;
    howTo(wb, o.cwg + " territory profiles: update template", "Filled in with each territory's profile as it is now (" + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "). Each territory has its own block of rows: fill in everything for it beside its name, then upload the file again.", [
      "Where they work: type it in the territory's box. Leave it as it is if nothing changed. To empty it, type a single hyphen: -",
      "Thematic areas: pick 1 to " + TH + " from the dropdowns, one per row.",
      "Strengths: pick at least 1 from the dropdowns, one per row.",
      "Technical support they can offer other territories: type 2 to " + SU + ", one per row.",
      "Contact persons: 1 or 2 people. Pick the rank (officers only) and type the name and appointment. No emails or phone numbers.",
      "Clear a cell to remove that item. For each territory, what you upload replaces what's on the website.",
      "This file is for " + o.cwg + " only. Grey cells and the tab names can't be changed."]);
    var R = lists(wb, { Themes: o.themes, Strengths: o.strengths, Ranks: RANKS });
    var ws = sheet(wb, "Profiles", [["ID", 4], ["Territory", 26], ["Where they work (areas, communities, programmes)", 42], ["Thematic areas (1 to " + TH + ")", 30], ["Strengths (at least 1)", 30],
      ["Technical support they can offer (2 to " + SU + ", typed)", 40], ["Contact: rank", 14], ["Contact: name", 22], ["Contact: appointment / role", 30]], 2);
    ws.getColumn(1).hidden = true;
    var thDv = list(R.Themes, true, "Pick a thematic area."), stDv = list(R.Strengths, true, "Pick a strength."), rkDv = list(R.Ranks, true);
    blocks(ws, o.terrs, N, function (t, r1, r2) {
      var p = t.profile || {}, th = p.thematic || [], st = p.strengths || [], su = p.support || [], co = t.contacts || [];
      merged(ws, r1, r2, 1, t.id); merged(ws, r1, r2, 2, t.name); ws.getCell(r1, 2).font = F({ bold: true });
      merged(ws, r1, r2, 3, p.workAreas || "", true);
      for (var k = 0; k < N; k++) { var r = r1 + k; ws.getRow(r).height = 18;
        if (k < TH) input(ws.getCell(r, 4), th[k], thDv); else grey(ws.getCell(r, 4));
        if (k < ST) input(ws.getCell(r, 5), st[k], stDv); else grey(ws.getCell(r, 5));
        if (k < SU) input(ws.getCell(r, 6), su[k]); else grey(ws.getCell(r, 6));
        if (k < CO) { var c = co[k] || {}; input(ws.getCell(r, 7), c.rank, rkDv); input(ws.getCell(r, 8), c.name); input(ws.getCell(r, 9), c.role); }
        else { grey(ws.getCell(r, 7)); grey(ws.getCell(r, 8)); grey(ws.getCell(r, 9)); }
      }
    });
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
      "Approvals tab: each territory has its own rows. Type each approving body and give its date, one approval per row. For each territory, the approvals you upload replace what's on the website.",
      "No emails or phone numbers: the websites don't keep them.",
      "This file is for " + o.cwg + " only. Grey cells and the tab names can't be changed."]);
    var names = o.terrs.map(function (t) { return t.name; });
    var R = lists(wb, { Territories: names, Status: o.statuses.map(function (s) { return s.label; }), Years: years(), Quarters: quarters(), YesNo: ["Yes", "No"], Timing: ["Before drafting", "During drafting"] });
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
    var aw = sheet(wb, "Approvals", [["ID", 4], ["Territory", 34], ["Approving body (type it)", 44], ["Approval date", 15]], 2);
    aw.getColumn(1).hidden = true;
    var AP = 5;
    var rr = 2;
    o.terrs.forEach(function (t) {
      var apps = t.approvals || [], n = Math.max(AP, apps.length + 1), r2 = rr + n - 1;
      merged(aw, rr, r2, 1, t.id); merged(aw, rr, r2, 2, t.name); aw.getCell(rr, 2).font = F({ bold: true });
      for (var k = 0; k < n; k++) { var a = apps[k] || {}; aw.getRow(rr + k).height = 18;
        input(aw.getCell(rr + k, 3), a.body || ""); input(aw.getCell(rr + k, 4), dateOf(a.date), dateDv, "dd/mm/yyyy"); }
      for (var c = 1; c <= 4; c++) { var cell = aw.getCell(r2, c); cell.border = Object.assign({}, cell.border || BOX, { bottom: MED }); }
      rr = r2 + 1;
    });
    await protect(wb);
    return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function save(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  window.ASLPXL = { profiles: profiles, cds: cds, save: save };
})();
