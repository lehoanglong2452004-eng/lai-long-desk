// Full-screen button for every chart panel on the page. Uses the browser's full screen where it is allowed
// (desktop, Android) and otherwise makes the panel cover the window (iPhone). Charts redraw on the resize event.
(function () {
  "use strict";
  var css = document.createElement("style");
  css.textContent =
    ".lld-fsb{font:inherit;font-size:11px;background:none;border:1px solid var(--line,#1c232d);color:var(--text,#d6dde6);border-radius:3px;padding:1px 7px;cursor:pointer;margin-left:auto;white-space:nowrap}" +
    ".lld-fsb:hover{border-color:var(--amber,#ffb000);color:var(--amber,#ffb000)}" +
    ".lld-fsb.abs{position:absolute;top:8px;right:10px;z-index:3;background:rgba(0,0,0,.6)}" +
    ".lld-fs{position:fixed!important;inset:0!important;z-index:50!important;margin:0!important;border-radius:0!important;overflow:auto!important;background:var(--panel,#0d1117)!important;max-height:none!important}" +
    ":fullscreen.lld-fsp{overflow:auto;background:var(--panel,#0d1117);padding:10px 12px}";
  document.head.appendChild(css);

  function big(cv) { return cv.clientWidth >= 200 && cv.clientHeight >= 90 && !cv.classList.contains("spark"); }
  var cur = null;
  function grow(p, on) {
    var cvs = [].slice.call(p.querySelectorAll("canvas")).filter(function (c) { return on ? big(c) : c.dataset.fsH !== undefined; });
    var k = Math.min(cvs.length, 2) || 1, h = Math.max(200, Math.floor((window.innerHeight - 110) / k));
    cvs.forEach(function (c) {
      if (on) { c.dataset.fsH = c.style.height || ""; c.style.height = h + "px"; }
      else { c.style.height = c.dataset.fsH; delete c.dataset.fsH; }
    });
  }
  function exit() {
    if (!cur) return;
    var p = cur.p, b = cur.b;
    cur = null;
    if (document.fullscreenElement === p) document.exitFullscreen().catch(function () {});
    p.classList.remove("lld-fs"); document.body.style.overflow = "";
    grow(p, false); b.textContent = "⛶"; b.title = "Toàn màn hình";
    setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 60);
  }
  function enter(p, b) {
    if (cur) exit();
    cur = { p: p, b: b };
    var done = function () { grow(p, true); b.textContent = "✕ Thoát"; b.title = "Thoát toàn màn hình"; setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 120); };
    if (p.requestFullscreen) p.requestFullscreen().then(done, function () { p.classList.add("lld-fs"); document.body.style.overflow = "hidden"; done(); });
    else { p.classList.add("lld-fs"); document.body.style.overflow = "hidden"; done(); }
  }
  document.addEventListener("fullscreenchange", function () { if (cur && !document.fullscreenElement && !cur.p.classList.contains("lld-fs")) exit(); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape" && cur && cur.p.classList.contains("lld-fs")) exit(); });

  function scan() {
    [].slice.call(document.querySelectorAll("canvas")).forEach(function (cv) {
      if (!big(cv)) return;
      var p = cv.closest(".panel") || cv.parentElement;
      if (!p || p.dataset.fs) return;
      p.dataset.fs = "1"; p.classList.add("lld-fsp");
      var b = document.createElement("button");
      b.type = "button"; b.className = "lld-fsb"; b.textContent = "⛶"; b.title = "Toàn màn hình";
      b.onclick = function () { if (cur && cur.p === p) exit(); else enter(p, b); };
      var ph = p.querySelector(".ph");
      if (ph && p.contains(ph)) ph.appendChild(b);
      else { if (getComputedStyle(p).position === "static") p.style.position = "relative"; b.classList.add("abs"); p.appendChild(b); }
    });
  }
  // charts can appear after data loads, so look again for a while
  scan();
  setInterval(scan, 2000);
})();
