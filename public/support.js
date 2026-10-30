/* "Support" button: a Nostr zap goal (NIP-75) counted live from zap receipts (NIP-57).
   Donations are anonymous zaps to the goal event, paid from any Lightning wallet by QR code.
   No server and no keys: the zap request below is pre-signed by a throwaway key and carries no
   amount, so one request serves every donation; Alby signs a public receipt for each payment. */
(function () {
  "use strict";
  var C = {"goal": "c304b36d584fce31f57cea827c17fd7be39f3ebcad09c20f7fa5958e7a7f685a", "profile": "a8cda40d112aac3343d95f7ea33babc590d123cf70d3e8ac30ba16a219bc0470", "target": 100000, "lnurl": "https://getalby.com/.well-known/lnurlp/itstomekk", "zapper": "79f00d3f5a19ec806189fcab03c1be4ff81d18ee4f653c88fac41fe03570f432", "relays": ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net", "wss://nostr.mom"], "nevent": "nevent1qqsvxp9nd4vyln33747w4qnuzl7hhcul86726zwzpal6t9vw0flkskszyz5vmfqdzy42cv6rm90hagem40zep5freacd869vxzapdgsehsz8qqg5waehxw309aex2mrp0yhxgctdw4eju6t0qyxhwumn8ghj7mn0wvhxcmmvqyt8wumn8ghj7un9d3shjtnswf5k6ctv9ehx2aqccpndw", "npub": "npub14rx6grg392krxs7etal2xwatckgdzg70wrf73tpshgt2yxduq3cqls9c3f", "amounts": [1000, 5000, 21000, 100000], "locale": "en-US", "since": 0, "hashes": ["#support"], "text": {"kick": "Support the list", "title": "Keep it running", "sats": "sats", "zap": "Zap", "close": "Close", "amountAria": "Amount in sats", "otherLabel": "Other amount in sats", "otherPh": "other", "openInvoice": "Open the invoice in your Lightning wallet", "openWallet": "Open wallet", "copy": "Copy invoice", "copied": "Copied", "browserWallet": "Pay with browser wallet", "scan": "Scan with any Lightning wallet. Waiting for payment…", "paid": "Paid. Thank you! ⚡", "creating": "Creating invoice…", "range": "Amount not accepted, try another", "fail": "Could not create an invoice, try again", "webFail": "The browser wallet did not pay. Scan the code instead.", "first": "Be the first to zap", "one": "1 zap so far", "many": "{n} zaps so far", "tipGoal": "Support the list: {n} of {t} sats raised", "tipTotal": "Support the list: {n} sats raised", "lede": "Awesome Bitcoin Events is free, open source and curated by hand. Zaps pay for the domain, hosting and curation time.", "fine": "Paid to <b>itstomekk@getalby.com</b> as an anonymous zap on our <a href=\"https://njump.me/{nevent}\" target=\"_blank\" rel=\"noopener\">Nostr goal</a>. On Nostr? Zap the goal or follow <a href=\"https://njump.me/{npub}\" target=\"_blank\" rel=\"noopener\">@awesomebitcoinevents</a>."}, "zapRequest": "{\"id\":\"fc5499aa79e9ef5d79adad834087b1a8d7e70f40a888274647e799518862b62e\",\"pubkey\":\"40bfd5b4e7d5f7274955d88b7754174c12c74e7c5fdd75a052d8d4485132a693\",\"created_at\":1793376180,\"kind\":9734,\"tags\":[[\"p\",\"a8cda40d112aac3343d95f7ea33babc590d123cf70d3e8ac30ba16a219bc0470\"],[\"e\",\"c304b36d584fce31f57cea827c17fd7be39f3ebcad09c20f7fa5958e7a7f685a\"],[\"relays\",\"wss://relay.damus.io\",\"wss://nos.lol\",\"wss://relay.primal.net\",\"wss://nostr.mom\"]],\"content\":\"\",\"sig\":\"f2d965a2787498b27cdee894ba37cb98c048d541501e86532e83fdd6398ae5ca2d5d47abee2de11234d66abebb02182c938be705f796e8184a6658811f4f76e7\"}"};
  var GOAL = C.goal;            // goal event id (NIP-75) or null: then every zap to PROFILE is counted
  var PROFILE = C.profile;      // hex pubkey the zap request pays
  var TARGET = C.target;        // sats, or 0 for no goal bar
  var LNURL = C.lnurl;
  var ZAPPER = C.zapper;        // the LNURL server's receipt key
  var RELAYS = C.relays;
  var NEVENT = C.nevent;
  var NPUB = C.npub;
  var ZAP_REQUEST = C.zapRequest;
  var AMOUNTS = C.amounts;
  var T = C.text;
  var QR_URL = new URL("vendor/qrcode.js", (document.currentScript && document.currentScript.src) || location.href).href;
  var LOCALE = C.locale || "en-US";
  var SINCE = C.since || 0;     // only count receipts newer than this unix time (profile mode)

  var btn = document.getElementById("sup");
  if (!btn) return;
  var raised = null, count = 0, seen = {};

  function fmt(n) { return Math.round(n).toLocaleString(LOCALE); }
  function short(n) { return n >= 1000 ? (n >= 10000 || n % 1000 === 0 ? Math.floor(n / 1000) : (Math.floor(n / 100) / 10)) + "k" : String(Math.floor(n)); }
  function pct() { return raised == null || !TARGET ? 0 : Math.min(100, raised / TARGET * 100); }

  // amount of a BOLT11 invoice in sats, from its human-readable part
  function bolt11Sats(pr) {
    var m = /^ln(?:bc|tb|bcrt|tbs)(\d+)([munp]?)1/i.exec(pr || "");
    if (!m) return 0;
    var mult = { "": 1e8, m: 1e5, u: 100, n: 0.1, p: 1e-4 }[m[2].toLowerCase()];
    return Number(m[1]) * mult;
  }

  function addReceipt(ev) {
    if (!ev || ev.kind !== 9735 || ev.pubkey !== ZAPPER || seen[ev.id]) return false;
    var pr = null, onGoal = false;
    (ev.tags || []).forEach(function (t) { if (t[0] === "bolt11") pr = t[1]; if (GOAL ? (t[0] === "e" && t[1] === GOAL) : (t[0] === "p" && t[1] === PROFILE)) onGoal = true; });
    var sats = bolt11Sats(pr);
    if (!onGoal || !sats || ev.created_at < SINCE) return false;
    seen[ev.id] = 1; raised = (raised || 0) + sats; count++;
    return true;
  }

  function paint() {
    btn.style.setProperty("--p", pct().toFixed(1) + "%");
    var t = btn.querySelector(".supn");
    if (raised != null && TARGET) {
      t.textContent = short(raised) + " / " + short(TARGET);
      btn.title = T.tipGoal.replace("{n}", fmt(raised)).replace("{t}", fmt(TARGET));
    }
    var d = document.getElementById("supDlg");
    if (d) {
      var bar = d.querySelector(".sup-bar i"); if (bar) bar.style.width = pct().toFixed(1) + "%";
      d.querySelector(".sup-raised").textContent = raised == null ? "…" : fmt(raised);
      d.querySelector(".sup-count").textContent = raised == null ? "" : count === 0 ? T.first : count === 1 ? T.one : T.many.replace("{n}", count);
    }
  }

  // read the receipts once from every relay; live updates while the dialog is open
  var socks = [];
  function load(live) {
    RELAYS.forEach(function (url) {
      var ws;
      try { ws = new WebSocket(url); } catch (e) { return; }
      socks.push(ws);
      var timer = setTimeout(function () { if (!live) ws.close(); }, 8000);
      ws.onopen = function () { ws.send(JSON.stringify(["REQ", "g", (GOAL ? { kinds: [9735], "#e": [GOAL], limit: 1000 } : { kinds: [9735], "#p": [PROFILE], since: SINCE, limit: 1000 })])); };
      ws.onmessage = function (m) {
        var msg; try { msg = JSON.parse(m.data); } catch (e) { return; }
        if (msg[0] === "EVENT" && msg[1] === "g") { if (addReceipt(msg[2])) paint(); }
        else if (msg[0] === "EOSE") { if (raised == null) { raised = 0; paint(); } if (!live) { clearTimeout(timer); ws.close(); } }
      };
      ws.onerror = function () { clearTimeout(timer); };
    });
  }
  function closeSocks() { socks.forEach(function (s) { try { s.close(); } catch (e) {} }); socks = []; }

  // ---------- dialog ----------
  var dlg = null, lastFocus = null, poll = null, lnurlMeta = null, chosen = 21000;

  function qrLib(cb) {
    if (window.qrcode) return cb();
    var s = document.createElement("script"); s.src = QR_URL; s.onload = cb; document.head.appendChild(s);
  }
  function getMeta() {
    if (lnurlMeta) return Promise.resolve(lnurlMeta);
    return fetch(LNURL).then(function (r) { return r.json(); }).then(function (j) { lnurlMeta = j; return j; });
  }

  function build() {
    dlg = document.createElement("div");
    dlg.className = "sup"; dlg.id = "supDlg"; dlg.hidden = true;
    dlg.innerHTML =
      '<div class="sup-scrim" data-x></div>' +
      '<div class="sup-card" role="dialog" aria-modal="true" aria-labelledby="supT" tabindex="-1">' +
        '<div class="sup-head"><p class="sup-kick">' + T.kick + '</p><h2 id="supT">' + T.title + '</h2>' +
          '<button type="button" class="sup-x" data-x aria-label="' + T.close + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>' +
        '<div class="sup-body">' +
          '<p class="sup-lede">' + T.lede + '</p>' +
          '<div class="sup-goal"><p><b class="sup-raised">…</b>' + (TARGET ? ' / ' + fmt(TARGET) : '') + ' ' + (TARGET ? T.sats : (T.raisedLabel || T.sats)) + '</p>' + (TARGET ? '<div class="sup-bar"><i></i></div>' : '') + '<p class="sup-count"></p></div>' +
          '<div class="sup-pick" role="group" aria-label="' + T.amountAria + '">' +
            AMOUNTS.map(function (a) { return '<button type="button" data-a="' + a + '">' + short(a) + '</button>'; }).join("") +
            '<label class="sup-own"><span class="vh">' + T.otherLabel + '</span><input type="number" min="1" step="1" inputmode="numeric" placeholder="' + T.otherPh + '"></label>' +
          '</div>' +
          '<button type="button" class="sup-go">' + T.zap + ' <span class="sup-amt"></span> ' + T.sats + '</button>' +
          '<div class="sup-pay" hidden><a class="sup-qr" target="_blank" rel="noopener" aria-label="' + T.openInvoice + '"></a>' +
            '<div class="sup-acts"><a class="sup-wallet" href="#">' + T.openWallet + '</a><button type="button" class="sup-copy">' + T.copy + '</button><button type="button" class="sup-webln" hidden>' + T.browserWallet + '</button></div>' +
            '<p class="sup-st" role="status" aria-live="polite">' + T.scan + '</p></div>' +
          '<p class="sup-fine">' + T.fine.replace("{nevent}", NEVENT).replace("{npub}", NPUB) + '</p>' +
        '</div></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-x]")) return close();
      var a = e.target.closest("[data-a]"); if (a) { setAmt(+a.dataset.a); dlg.querySelector(".sup-own input").value = ""; }
    });
    dlg.querySelector(".sup-own input").addEventListener("input", function () { var v = Math.floor(+this.value); if (v > 0) setAmt(v, true); });
    dlg.querySelector(".sup-go").addEventListener("click", invoice);
    dlg.querySelector(".sup-copy").addEventListener("click", function () {
      var pr = dlg.dataset.pr, b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(pr) : Promise.reject()).then(function () { b.textContent = T.copied; setTimeout(function () { b.textContent = T.copy; }, 1600); }, function () {});
    });
    dlg.querySelector(".sup-webln").addEventListener("click", function () {
      window.webln.enable().then(function () { return window.webln.sendPayment(dlg.dataset.pr); }).catch(function () { status(T.webFail); });
    });
    document.addEventListener("keydown", function (e) {
      if (!dlg || dlg.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") { // keep focus inside
        var f = [].slice.call(dlg.querySelectorAll("button,a[href],input")).filter(function (x) { return x.offsetParent; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    setAmt(chosen);
  }

  function setAmt(a, own) {
    chosen = a; resetPay();
    [].forEach.call(dlg.querySelectorAll("[data-a]"), function (b) { b.setAttribute("aria-pressed", String(!own && +b.dataset.a === a)); });
    dlg.querySelector(".sup-amt").textContent = fmt(a);
  }
  function status(t) { dlg.querySelector(".sup-st").textContent = t; }
  function resetPay() {
    clearInterval(poll); poll = null;
    dlg.querySelector(".sup-pay").hidden = true;
    dlg.querySelector(".sup-go").hidden = false;
    dlg.querySelector(".sup-go").disabled = false;
  }

  function invoice() {
    var go = dlg.querySelector(".sup-go"); go.disabled = true; go.textContent = T.creating;
    var amt = chosen;
    getMeta().then(function (m) {
      var msat = amt * 1000;
      if (msat < m.minSendable || msat > m.maxSendable) throw new Error("range");
      var u = m.callback + (m.callback.indexOf("?") < 0 ? "?" : "&") + "amount=" + msat + "&nostr=" + encodeURIComponent(ZAP_REQUEST);
      return fetch(u).then(function (r) { return r.json(); });
    }).then(function (j) {
      if (!j.pr || bolt11Sats(j.pr) !== amt) throw new Error("bad invoice");
      qrLib(function () { show(j.pr, j.verify); });
    }).catch(function (e) {
      go.disabled = false;
      go.innerHTML = e && e.message === "range" ? T.range : T.fail;
      setTimeout(function () { go.innerHTML = T.zap + ' <span class="sup-amt">' + fmt(chosen) + "</span> " + T.sats; }, 2600);
    });
  }

  function show(pr, verify) {
    var go = dlg.querySelector(".sup-go");
    go.hidden = true; go.innerHTML = T.zap + ' <span class="sup-amt">' + fmt(chosen) + "</span> " + T.sats;
    dlg.dataset.pr = pr;
    var qr = window.qrcode(0, "M"); qr.addData("LIGHTNING:" + pr.toUpperCase(), "Alphanumeric"); qr.make();
    var box = dlg.querySelector(".sup-qr");
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: "Lightning invoice QR code" });
    box.href = "lightning:" + pr;
    dlg.querySelector(".sup-wallet").href = "lightning:" + pr;
    dlg.querySelector(".sup-webln").hidden = !window.webln;
    dlg.querySelector(".sup-pay").hidden = false;
    box.focus();
    status(T.scan);
    if (verify) poll = setInterval(function () {
      fetch(verify).then(function (r) { return r.json(); }).then(function (v) {
        if (v && v.settled) { clearInterval(poll); poll = null; paid(); }
      }).catch(function () {});
    }, 2500);
  }

  function paid() {
    dlg.querySelector(".sup-pay").classList.add("is-paid");
    status(T.paid);
    // the receipt reaches the relays a moment later; the live subscription picks it up
  }

  function open() {
    if (!dlg) build();
    lastFocus = document.activeElement;
    dlg.hidden = false; document.documentElement.classList.add("sup-open");
    requestAnimationFrame(function () { dlg.classList.add("is-in"); });
    paint();
    closeSocks(); load(true);
    dlg.querySelector(".sup-card").focus();
  }
  function close() {
    resetPay(); closeSocks();
    dlg.classList.remove("is-in"); dlg.querySelector(".sup-pay").classList.remove("is-paid");
    document.documentElement.classList.remove("sup-open");
    dlg.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.addEventListener("click", open);
  if (TARGET) load(false); // goal mode shows the running total on the button; profile mode loads it when the dialog opens
  document.addEventListener("click", function (e) { // any link marked data-support opens the dialog
    var a = e.target.closest && e.target.closest("[data-support]");
    if (a) { e.preventDefault(); open(); }
  });
  if ((C.hashes || ["#support"]).indexOf(location.hash) >= 0) open();
})();
