"use strict";
// Traditional page: load one asset's bars on all 7 timeframes, run engine.js (the same code the server runs),
// let the council vote, and show which of the three strategies is working now, with every trade and its reasons.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = window.TRAD;
  const TFL = { "1W": "Tuần", "1D": "Ngày", "4H": "4 giờ", "1H": "1 giờ", "15m": "15 phút", "5m": "5 phút", "1m": "1 phút" };
  const WL = { "12m": "12 tháng", "6m": "6 tháng", "3m": "3 tháng", "1m": "1 tháng", "1w": "1 tuần", "1d": "1 ngày" };
  const WDAYS = Object.fromEntries(T.WINDOWS);
  const CLS = { crypto: "Crypto", forex: "Ngoại hối", commodity: "Hàng hóa", index: "Chỉ số", stock: "Cổ phiếu" };
  const ML = {
    W2: "Elliott: sau sóng 2, đón sóng 3", W4: "Elliott: sau sóng 4, đón sóng 5", W5: "Elliott: hết sóng 5, đón A-B-C", ABC: "Elliott: hết A-B-C, xu hướng quay lại",
    SPRING: "Wyckoff Spring (thủng đáy biên rồi quay vào)", UPTHRUST: "Wyckoff Upthrust (vượt đỉnh biên rồi quay vào)", DARVAS: "Hộp Darvas (phá hộp, dời SL theo hộp)",
    B0: "Phá vỡ lần đầu", T1: "Test lại lần 1", T2: "Test lại lần 2", T3: "Test lại lần 3", T4: "Test lại lần 4", FAIL: "Phá vỡ giả, đánh đảo chiều",
    R_LONG: "Mua ở đáy biên", R_SHORT: "Bán ở đỉnh biên",
  };
  const MS = { W2: "Sóng 2→3", W4: "Sóng 4→5", W5: "Sóng 5→ABC", ABC: "ABC→xu hướng", SPRING: "Spring", UPTHRUST: "Upthrust", DARVAS: "Darvas", B0: "Phá vỡ", T1: "Test 1", T2: "Test 2", T3: "Test 3", T4: "Test 4", FAIL: "Phá vỡ giả", R_LONG: "Mua đáy biên", R_SHORT: "Bán đỉnh biên" };
  const GL = { 1: "① ELLIOTT · WYCKOFF · DARVAS", 2: "② PHÁ VỠ VÀ TEST LẠI", 3: "③ GIAO DỊCH TRONG BIÊN" };
  const GC = { 1: "#ffb000", 2: "#4aa8ff", 3: "#c77dff" };
  const MIN_N = 8;
  const pct = (x, d = 0) => (x == null || !isFinite(x) ? "–" : (x * 100).toFixed(d) + "%");
  const fR = (x) => (x == null || !isFinite(x) ? "–" : (x >= 0 ? "+" : "") + x.toFixed(2) + "R");
  const fUsd = (x) => (x == null || !isFinite(x) ? "–" : (x < 0 ? "-$" : "+$") + Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: 0 }));
  const fP = (x) => { if (x == null || !isFinite(x)) return "–"; const a = Math.abs(x); return x.toFixed(a >= 1000 ? 1 : a >= 10 ? 2 : a >= 1 ? 4 : 5); };
  const fT = (t) => new Date((t + 7 * 3600) * 1000).toISOString().slice(0, 16).replace("T", " ");
  const fTs = (t) => new Date((t + 7 * 3600) * 1000).toISOString().slice(5, 16).replace("T", " ");
  const ver = () => Math.floor(Date.now() / 300000);
  async function getJSON(u) { const r = await fetch(u, { cache: "no-store" }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); }

  // ---------- settings ----------
  const S = Object.assign({ sym: "BTC", tf: "1H", win: "3m", cap: 10000, risk: 2.5, lev: 10, costs: {}, agree: true, cmin: 60, scope: "one", vscope: "one", logf: "all" },
    (() => { try { return JSON.parse(localStorage.getItem("lld-trad")) || {}; } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem("lld-trad", JSON.stringify(S)); } catch (e) { /* private mode */ } };

  let ASSETS = [], A = null, asset = null, SRV = null, SRVV = null, sel = null, TB = {}, VAL = {};
  const costOf = (a) => (S.costs[a.cls] ?? T.COST[a.cls] ?? 0.05);
  const filt = () => (S.agree ? (x) => x.agree : null);
  function tb(win) {
    const k = win + (S.agree ? "a" : "");
    return TB[k] || (TB[k] = T.tables(A, WDAYS[win], filt()));
  }

  // ---------- controls ----------
  // ---------- confirmation of what is applied ----------
  let toastT = null;
  function confirmMsg(msg) {
    const t = $("toast");
    t.innerHTML = `<b>✓ Đã áp dụng:</b> ${msg}`; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 3500);
    renderConfirm();
  }
  function renderConfirm() {
    const n = (SRV && SRV.assets && SRV.assets.length) || ASSETS.length;
    $("confirm").innerHTML = `<b>✓ Đang áp dụng:</b> ${esc(S.sym)} · khung ${TFL[S.tf]} · giai đoạn ${WL[S.win]} · vốn $${(+S.cap).toLocaleString("en-US")} · rủi ro ${S.risk}% mỗi lệnh ($${Math.round(S.cap * S.risk / 100).toLocaleString("en-US")}) · đòn bẩy tối đa ${S.lev}x · phí ${asset ? costOf(asset) : "–"}% · ${S.agree ? `chỉ tính lệnh thuận hội đồng ≥ ${S.cmin}%` : "tính mọi lệnh, kể cả ngược hội đồng"} · bảng màu: ${S.scope === "all" ? `gộp ${n} mã` : `chỉ ${esc(S.sym)}`} · kiểm định: ${S.vscope === "all" ? `gộp ${n} mã` : `chỉ ${esc(S.sym)}`}`;
  }
  function fillControls() {
    $("tfs").innerHTML = T.TFS.map((tf) => `<button data-tf="${tf}" class="${tf === S.tf ? "on" : ""}">${tf}</button>`).join("");
    $("wins").innerHTML = T.WINDOWS.map(([w]) => `<button data-w="${w}" class="${w === S.win ? "on" : ""}">${WL[w]}</button>`).join("");
    $("cap").value = S.cap; $("risk").value = S.risk; $("lev").value = S.lev; $("agree").checked = S.agree; $("cmin").value = S.cmin;
    $("scope").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.s === S.scope));
    $("vscope").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.s === S.vscope));
    const n = (SRV && SRV.assets && SRV.assets.length) || ASSETS.length || "";
    for (const id of ["scope", "vscope"]) { const bs = $(id).querySelectorAll("button"); bs[0].textContent = `Chỉ ${S.sym}`; bs[1].textContent = `Gộp ${n} mã`; bs[0].title = `Chỉ tính trên ${S.sym}, mã đang chọn ở ô Sản phẩm`; bs[1].title = "Cộng dồn kết quả của mọi mã trong hệ thống, máy chủ tính mỗi lần quét"; }
    renderConfirm();
  }
  function fillAssets() {
    const by = {};
    for (const a of ASSETS) (by[a.cls] = by[a.cls] || []).push(a);
    $("asset").innerHTML = Object.keys(CLS).filter((c) => by[c]).map((c) => `<optgroup label="${CLS[c]}">${by[c].map((a) => `<option value="${esc(a.symbol)}">${esc(a.symbol)}</option>`).join("")}</optgroup>`).join("");
    if (!ASSETS.find((a) => a.symbol === S.sym)) S.sym = ASSETS[0] ? ASSETS[0].symbol : S.sym;
    $("asset").value = S.sym;
  }
  $("tfs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setTf(b.dataset.tf); });
  $("wins").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.win = b.dataset.w; save(); fillControls(); renderAll(false); confirmMsg(`giai đoạn ${WL[S.win]}: bảng màu, phá vỡ, biên, kết quả và nhật ký chỉ tính các lệnh trong ${WL[S.win]} gần nhất.`); });
  $("scope").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.scope = b.dataset.s; save(); fillControls(); renderHeat(); confirmMsg(S.scope === "all" ? "bảng màu gộp kết quả của mọi mã trong hệ thống." : `bảng màu chỉ tính riêng ${esc(S.sym)}.`); });
  $("vscope").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.vscope = b.dataset.s; save(); fillControls(); renderVal(); confirmMsg(S.vscope === "all" ? "kiểm định trên mọi mã trong hệ thống (mỗi ô là một mã × mô hình × khung)." : `kiểm định chỉ trên ${esc(S.sym)}.`); });
  $("asset").addEventListener("change", () => { S.sym = $("asset").value; save(); load(); confirmMsg(`đổi sang ${esc(S.sym)}: đang tải nến 7 khung và chạy lại toàn bộ backtest.`); });
  for (const id of ["cap", "risk", "lev"]) $(id).addEventListener("change", () => { const v = +$(id).value; if (v > 0) { S[id] = v; save(); renderKpis(); renderLog(); confirmMsg(`vốn $${(+S.cap).toLocaleString("en-US")}, rủi ro ${S.risk}% = $${Math.round(S.cap * S.risk / 100).toLocaleString("en-US")} mỗi lệnh, đòn bẩy tối đa ${S.lev}x. Cột $ và lãi/lỗ đã tính lại.`); } });
  $("cost").addEventListener("change", () => { const v = +$("cost").value; if (v >= 0 && asset) { S.costs[asset.cls] = v; save(); run(); confirmMsg(`phí + trượt giá ${v}% cho mọi mã nhóm ${CLS[asset.cls] || asset.cls}; backtest đang chạy lại.`); } });
  $("agree").addEventListener("change", () => { S.agree = $("agree").checked; save(); renderAll(false); confirmMsg(S.agree ? `chỉ tính lệnh cùng hướng với phe chiếm ≥ ${S.cmin}% hội đồng.` : "tính mọi lệnh, kể cả lệnh ngược hội đồng."); });
  $("cmin").addEventListener("change", () => { const v = +$("cmin").value; if (v >= 50 && v <= 100) { S.cmin = v; save(); run(); confirmMsg(`ngưỡng hội đồng ${v}%: một phe phải chiếm từ ${v}% phiếu trở lên mới được vào lệnh theo hướng đó.`); } });
  $("revote").addEventListener("click", () => renderCouncil(true));
  function setTf(tf) { S.tf = tf; save(); fillControls(); sel = null; view.end = null; renderAll(false); confirmMsg(`khung ${TFL[tf]}: biểu đồ, Elliott, phá vỡ và biên chuyển sang khung ${TFL[tf]}.`); }

  // ---------- load and run ----------
  async function load() {
    asset = ASSETS.find((a) => a.symbol === S.sym) || { symbol: S.sym, cls: "crypto" };
    $("busy").textContent = "đang tải nến 7 khung…";
    const bars = {};
    await Promise.all(T.TFS.map(async (tf) => {
      try {
        const r = await getJSON(`../data/bars/${encodeURIComponent(asset.symbol)}_${tf}.json?v=${ver()}`);
        if (r.t && r.t.length) bars[tf] = { t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v.map((x) => x || 0) };
      } catch (e) { /* this timeframe is missing for the asset */ }
    }));
    load.bars = bars;
    if (!Object.keys(bars).length) { $("busy").textContent = "chưa có dữ liệu nến cho mã này"; A = null; renderAll(false); return; }
    run();
  }
  function run() {
    $("cost").value = costOf(asset);
    $("busy").textContent = "đang chạy backtest…";
    setTimeout(() => {
      const t0 = performance.now();
      A = T.runAsset(load.bars, { costPct: costOf(asset), councilMin: S.cmin });
      TB = {}; VAL = {};
      if (!A.res[S.tf]) S.tf = T.TFS.find((tf) => A.res[tf]) || S.tf;
      $("busy").textContent = `${A.trades.length.toLocaleString("vi-VN")} lệnh mô phỏng trên ${Object.keys(A.res).filter((k) => A.res[k]).length} khung trong ${((performance.now() - t0) / 1000).toFixed(1)} giây`;
      sel = null; view.end = null;
      fillControls(); renderAll(true);
    }, 20);
  }
  function renderAll(anim) {
    renderAge(); renderCouncil(anim); renderHeat(); renderVal(); drawChart(); renderElliott(); renderWyckoff(); renderBo(); renderRange(); renderKpis(); renderLog(); renderRank();
  }
  function renderAge() {
    if (!A) { $("age").textContent = ""; return; }
    const r = A.res[S.tf], last = r ? r.closeT[r.n - 1] : A.now, h = (Date.now() / 1000 - last) / 3600;
    $("age").textContent = `nến ${S.tf} đóng lúc ${fTs(last)}`;
    $("age").className = "pill " + (h > 26 && asset.cls === "crypto" ? "stale" : h > 6 ? "warn" : "ok");
    $("age").title = "Thời điểm đóng cửa của nến mới nhất (GMT+7). Máy chủ cập nhật nến khi chạy lịch.";
  }

  // ---------- council ----------
  let voteTimer = null;
  function renderCouncil(anim) {
    clearTimeout(voteTimer);
    if (!A) { $("council").innerHTML = ""; $("tally").innerHTML = ""; $("verdict").textContent = ""; return; }
    const c = A.council, by = Object.fromEntries(c.votes.map((v) => [v.tf, v]));
    const order = T.TFS.slice().reverse();
    $("council").innerHTML = order.map((tf) => {
      const v = by[tf], k = !v ? "flat" : v.v === 1 ? "up" : v.v === -1 ? "down" : "flat";
      const txt = !v ? "vắng" : v.v === 1 ? "▲ TĂNG" : v.v === -1 ? "▼ GIẢM" : "■ NGANG";
      return `<div class="vote ${k} ${T.WEIGHT[tf] > 10 ? "big" : ""}" data-tf="${tf}" title="${v ? "Phiếu dựa trên nến đóng lúc " + fTs(v.t) : "Khung này không có dữ liệu đủ mới để bỏ phiếu"}"><div class="tf">${TFL[tf]}</div><div class="v">${txt}</div><div class="w">${T.WEIGHT[tf]}% phiếu</div></div>`;
    }).join("");
    const cards = [...$("council").children];
    const finish = () => {
      $("tally").innerHTML = `<div class="u" style="flex-grow:${c.up || 0.001}">${c.up >= 8 ? "TĂNG " + c.up.toFixed(0) + "%" : ""}</div><div class="f" style="flex-grow:${c.flat || 0.001}">${c.flat >= 8 ? "NGANG/VẮNG " + c.flat.toFixed(0) + "%" : ""}</div><div class="d" style="flex-grow:${c.dn || 0.001}">${c.dn >= 8 ? "GIẢM " + c.dn.toFixed(0) + "%" : ""}</div>`;
      const win = c.up >= S.cmin ? 1 : c.dn >= S.cmin ? -1 : 0;
      $("verdict").innerHTML = win === 1 ? `<b class="up">Phe TĂNG thắng với ${c.up.toFixed(0)}%</b> (ngưỡng ${S.cmin}%): chỉ tìm lệnh MUA, bỏ qua mọi tín hiệu bán.`
        : win === -1 ? `<b class="down">Phe GIẢM thắng với ${c.dn.toFixed(0)}%</b> (ngưỡng ${S.cmin}%): chỉ tìm lệnh BÁN, bỏ qua mọi tín hiệu mua.`
          : `<b class="amber">Chưa phe nào đạt ${S.cmin}%</b> (tăng ${c.up.toFixed(0)}%, giảm ${c.dn.toFixed(0)}%): thị trường chưa đồng thuận, nên đứng ngoài hoặc chỉ đánh trong biên với khối lượng nhỏ.`;
    };
    if (!anim) { cards.forEach((x) => x.classList.add("show")); finish(); return; }
    $("tally").innerHTML = '<div class="f" style="flex-grow:1">đang kiểm phiếu…</div>'; $("verdict").textContent = "";
    let k = 0;
    const step = () => { if (k < cards.length) { cards[k++].classList.add("show"); voteTimer = setTimeout(step, 320); } else finish(); };
    voteTimer = setTimeout(step, 150);
  }
  $("council").addEventListener("click", (e) => { const v = e.target.closest(".vote"); if (v && A && A.res[v.dataset.tf]) setTf(v.dataset.tf); });

  // ---------- heatmap: which model works on which timeframe ----------
  function cellColor(avg, n) {
    if (n < MIN_N || avg == null) return "#11161d";
    const x = Math.max(-1, Math.min(1, avg / 0.6)), a = 0.18 + 0.62 * Math.abs(x);
    return x >= 0 ? `rgba(34,197,94,${a.toFixed(2)})` : `rgba(240,82,79,${a.toFixed(2)})`;
  }
  function renderHeat() {
    const all = S.scope === "all";
    $("h-hm").textContent = all ? `CHIẾN LƯỢC NÀO ĐANG HIỆU QUẢ? · CẢ HỆ THỐNG · ${WL[S.win].toUpperCase()}` : `CHIẾN LƯỢC NÀO ĐANG HIỆU QUẢ? · ${S.sym} · ${WL[S.win].toUpperCase()}`;
    let get;
    if (all) {
      if (!SRV || !SRV.grid) { $("hm").innerHTML = '<tr><td class="dim">Máy chủ chưa có kết quả gộp. Bảng này xuất hiện sau lần chạy lịch kế tiếp.</td></tr>'; return; }
      const g = SRV.grid[S.win] || {};
      get = (m, tf) => { const p = g[`${m}|${tf}`]; return p ? { n: p[0], win: p[1], avgR: p[2], totalR: p[3], p: p[4], q: p[5] } : { n: 0 }; };
    } else {
      if (!A) { $("hm").innerHTML = ""; return; }
      const grid = tb(S.win).grid;
      // q-values across this table's cells (testing many cells at once)
      if (!grid._q) { const ks = Object.keys(grid).filter((k) => grid[k].n >= MIN_N && grid[k].p != null), q = T.bh(ks.map((k) => grid[k].p)); ks.forEach((k, i) => { grid[k].q = q[i]; }); grid._q = true; }
      get = (m, tf) => grid[`${m}|${tf}`];
    }
    let h = `<tr><th></th>${T.TFS.map((tf) => `<th>${tf}</th>`).join("")}</tr>`, g0 = 0;
    for (const m of T.MODELS) {
      if (T.GROUP[m] !== g0) { g0 = T.GROUP[m]; h += `<tr class="g"><td colspan="8">${GL[g0]}</td></tr>`; }
      h += `<tr><td class="m" title="${esc(ML[m])}">${MS[m]}</td>` + T.TFS.map((tf) => {
        const s = get(m, tf);
        if (!s || !s.n) return `<td class="c na" data-m="${m}" data-tf="${tf}">·</td>`;
        const thin = s.n < MIN_N;
        const star = !thin && s.q != null && s.q < 0.2 && s.avgR > 0 ? '<i class="star">★</i>' : "";
        return `<td class="c ${thin ? "na" : ""}" style="background:${cellColor(s.avgR, s.n)}" data-m="${m}" data-tf="${tf}">${star}<b>${thin ? "·" : fR(s.avgR)}</b><span>${thin ? s.n + " lệnh" : pct(s.win) + " · " + s.n}</span></td>`;
      }).join("") + "</tr>";
    }
    $("hm").innerHTML = h;
    $("hm").dataset.all = all ? 1 : "";
    $("hm").get = get;
  }
  const tip = $("tip");
  function showTip(e, html) { tip.innerHTML = html; tip.style.display = "block"; const w = tip.offsetWidth, hh = tip.offsetHeight; tip.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + "px"; tip.style.top = Math.min(innerHeight - hh - 8, e.clientY + 14) + "px"; }
  const hideTip = () => { tip.style.display = "none"; };
  $("hm").addEventListener("pointermove", (e) => {
    const td = e.target.closest("td.c"); if (!td || !$("hm").get) { hideTip(); return; }
    const s = $("hm").get(td.dataset.m, td.dataset.tf) || { n: 0 };
    showTip(e, `<b>${esc(ML[td.dataset.m])}</b> · khung ${TFL[td.dataset.tf]}<br>${s.n ? `${s.n} lệnh · thắng ${pct(s.win)} · TB ${fR(s.avgR)} · tổng ${fR(s.totalR)}` : "chưa có lệnh"}${s.n && s.n < MIN_N ? "<br><span class='amber'>dưới 8 lệnh: chưa đủ để kết luận</span>" : ""}${s.n >= MIN_N && s.q != null ? `<br>kiểm định: p = ${s.p.toFixed(3)}, q = ${s.q.toFixed(3)} · ${s.q < 0.2 && s.avgR > 0 ? "<b class='up'>★ vượt kiểm định</b>" : s.avgR > 0 ? "<span class='amber'>xanh nhưng có thể do may mắn</span>" : "không có lợi thế"}` : ""}<br><span class="dim">${$("hm").dataset.all ? "gộp mọi mã, chỉ lệnh thuận hội đồng" : "bấm để xem các lệnh này"}</span>`);
  });
  $("hm").addEventListener("pointerleave", hideTip);
  $("hm").addEventListener("click", (e) => {
    const td = e.target.closest("td.c"); if (!td || $("hm").dataset.all || !A || !A.res[td.dataset.tf]) return;
    S.logf = "m:" + td.dataset.m; setTf(td.dataset.tf); $("log").scrollIntoView({ behavior: "smooth", block: "center" });
  });


  // ---------- validation: walk-forward and multiple-testing ----------
  function localVal() {
    const k = S.agree ? "a" : "";
    if (VAL[k] !== undefined) return VAL[k];
    const tr = A.trades.filter((x) => !x.open && x.t >= A.now - 365 * 86400 && (!S.agree || x.agree)).map((x) => ({ key: `${x.kind}|${x.tf}`, t: x.t, exitT: x.exitT, R: x.R }));
    const v = T.validate(tr);
    if (!v) return (VAL[k] = null);
    const st = (x) => ({ n: x.n, win: x.win, avgR: x.avgR, totalR: x.totalR, p: x.p });
    return (VAL[k] = { tested: v.tested, green: v.green, nsig: v.sig.length, start: v.start, end: v.end, mid: v.mid,
      sig: v.sig.sort((a, b) => a.q - b.q).map((c) => [c.key, c.n, c.win, c.avgR, c.t, c.q]),
      wf: { sel: st(v.wf.sel), all: st(v.wf.all), hind: st(v.wf.hind), naive: st(v.wf.naive), selC: v.wf.selC, allC: v.wf.allC, hindC: v.wf.hindC, naiveC: v.wf.naiveC },
      weeks: v.weeks, split: v.split });
  }
  const curV = () => (S.vscope === "all" ? SRVV && SRVV.asset : A && localVal());
  const keyName = (k) => { const p = k.split("|"); return p.length === 3 ? `${p[0]} · ${MS[p[1]]} ${p[2]}` : `${MS[p[0]]} ${p[1]}`; };
  function renderVal() {
    const v = curV(), all = S.vscope === "all";
    $("h-val").textContent = `KIỂM ĐỊNH: Ô XANH NÀO ĐÁNG TIN? · ${all ? "CẢ HỆ THỐNG" : S.sym}`;
    if (!v) {
      $("funnel").innerHTML = `<p class="dim">${all ? "Máy chủ chưa có kết quả kiểm định. Phần này xuất hiện sau lần chạy lịch kế tiếp." : "Chưa đủ lệnh để kiểm định."}</p>`;
      $("sv").innerHTML = ""; $("sc-txt").textContent = ""; $("v-sub").textContent = ""; drawWf(); drawSc(); return;
    }
    $("v-sub").textContent = `${all ? "mỗi ô = một mã × mô hình × khung (không tính USDCNY, USDHKD bị neo giá)" : "mỗi ô = mô hình × khung"} · 12 tháng · walk-forward từ ${fTs(v.start).slice(0, 5)}`;
    const w = v.wf, sR = (x) => (x.n ? `${x.totalR >= 0 ? "+" : ""}${x.totalR.toFixed(0)}R` : "–");
    const box = (l, val, sub, c) => `<div class="fn">${l}<b class="${c || ""}">${val}</b><small>${sub}</small></div>`;
    $("funnel").innerHTML = box("Số phép thử", v.tested.toLocaleString("vi-VN"), "ô có từ 8 lệnh trở lên")
      + box("Ô xanh", v.green.toLocaleString("vi-VN"), `${v.tested ? Math.round(v.green / v.tested * 100) : 0}% số ô, nhìn bảng màu thấy "có lời"`)
      + box("★ Vượt kiểm định", v.nsig, "R trung bình > 0 không phải do may mắn", v.nsig ? "up" : "down")
      + box("Ảo tưởng (nhìn lại)", sR(w.hind), `theo ô xanh, chấm bằng chính dữ liệu đã chọn · ${w.hind.n} lệnh`, w.hind.totalR > 0 ? "up" : "down")
      + box("Thực tế: theo ô xanh", sR(w.naive), `chỉ biết quá khứ, mỗi tuần chọn lại · ${w.naive.n} lệnh · TB ${fR(w.naive.avgR)}`, w.naive.totalR > 0 ? "up" : "down")
      + box("Thực tế: theo kiểm định", sR(w.sel), `chỉ ô ★ tại thời điểm đó · ${w.sel.n} lệnh · TB ${fR(w.sel.avgR)}`, w.sel.totalR > 0 ? "up" : w.sel.n ? "down" : "");
    const gap = (w.hind.totalR || 0) - (w.naive.totalR || 0);
    const verdict = v.nsig === 0
      ? `<b class="amber">Kết luận: chưa có mô hình nào có lợi thế được chứng minh.</b> Các ô xanh trên bảng màu đều có thể giải thích bằng may mắn. Nếu cứ theo ô xanh mỗi tuần, kết quả thật là ${sR(w.naive)} thay vì ${sR(w.hind)} như backtest hứa: phần chênh ${gap.toFixed(0)}R là "ảo". Nên quan sát, chưa đặt tiền thật.`
      : `<b class="up">Có ${v.nsig} ô vượt kiểm định.</b> Theo đúng các ô ★ tại từng thời điểm, kết quả thật là ${sR(w.sel)} (${w.sel.n} lệnh), so với ${sR(w.naive)} nếu theo mọi ô xanh. Backtest nhìn lại hứa ${sR(w.hind)}, phần chênh là "ảo".`;
    const peg = !all && T.PEGGED.includes(S.sym) ? `<br><b class="down">Lưu ý:</b> ${S.sym} bị ngân hàng trung ương neo giá; dữ liệu rất phẳng và phí thật cao hơn nhiều so với giả định, nên mọi kết quả ở mã này không đáng tin và bị loại khỏi kiểm định cả hệ thống.` : "";
    $("funnel").insertAdjacentHTML("beforeend", `<p class="why" style="grid-column:1/-1;margin:2px 0 0">${verdict}${peg}</p>`);
    let h = `<tr><th>Ô vượt kiểm định</th><th>Lệnh</th><th>Thắng</th><th>R TB</th><th>t</th><th>q</th></tr>`;
    if (!v.sig.length) h += `<tr><td colspan="6" class="dim">Không có ô nào. Với ${v.tested} phép thử, cần R trung bình cao và đủ nhiều lệnh mới phân biệt được với may mắn.</td></tr>`;
    for (const [k, n, win, avg, t, q] of v.sig.slice(0, 30)) h += `<tr><td>${esc(keyName(k))}</td><td>${n}</td><td>${pct(win)}</td><td class="up">${fR(avg)}</td><td>${t == null ? "–" : t.toFixed(2)}</td><td>${q.toFixed(3)}</td></tr>`;
    $("sv").innerHTML = h;
    // past versus future
    const sp = v.split.filter((x) => x[1] != null && x[2] != null);
    if (sp.length > 2) {
      const mx = sp.reduce((a, x) => a + x[1], 0) / sp.length, my = sp.reduce((a, x) => a + x[2], 0) / sp.length;
      let c = 0, vx = 0, vy = 0;
      for (const x of sp) { c += (x[1] - mx) * (x[2] - my); vx += (x[1] - mx) ** 2; vy += (x[2] - my) ** 2; }
      const r = vx && vy ? c / Math.sqrt(vx * vy) : 0, g = sp.filter((x) => x[1] > 0), gg = g.filter((x) => x[2] > 0);
      $("sc-txt").innerHTML = `${sp.length} ô · tương quan quá khứ–tương lai ${r.toFixed(2)} (1 = dự báo hoàn hảo, 0 = không liên quan). Trong ${g.length} ô xanh ở 2/3 đầu, ${gg.length} ô (${g.length ? Math.round(gg.length / g.length * 100) : 0}%) vẫn xanh ở 1/3 sau. Chấm cam: ô có p &lt; 0,05 ở 2/3 đầu.`;
    } else $("sc-txt").textContent = "Chưa đủ ô có lệnh ở cả hai giai đoạn.";
    drawWf(); drawSc();
  }
  function canvas2(id) {
    const c = $(id), x = c.getContext("2d"), dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    x.font = "11px JetBrains Mono, monospace";
    return { x, W, H };
  }
  function drawWf() {
    const { x, W, H } = canvas2("wf"), v = curV();
    if (!v) return;
    const w = v.wf, S4 = [["hindC", "#8a93a6", [5, 4], "ảo tưởng"], ["allC", "#4aa8ff", [], "tất cả"], ["naiveC", "#f0524f", [], "ô xanh"], ["selC", "#ffb000", [], "kiểm định"]];
    const t0 = v.start, t1 = v.end;
    let lo = 0, hi = 0;
    for (const [k] of S4) for (const [, y] of w[k]) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    const L = 8, R = Math.min(120, Math.max(...S4.map(([k, , , lab]) => x.measureText(`${lab} -0000R`).width)) + 8), top = 10, bot = H - 20, X = (t) => L + (t - t0) / (t1 - t0 || 1) * (W - L - R), Y = (y) => top + (hi - y) / (hi - lo) * (bot - top);
    x.strokeStyle = "#141a22"; x.fillStyle = "#6b7785";
    for (let k = 0; k <= 4; k++) { const y = lo + (hi - lo) * k / 4; x.beginPath(); x.moveTo(L, Y(y)); x.lineTo(W - R, Y(y)); x.stroke(); }
    x.strokeStyle = "#39424f"; x.beginPath(); x.moveTo(L, Y(0)); x.lineTo(W - R, Y(0)); x.stroke();
    x.fillText(fTs(t0).slice(0, 5), L, H - 4); x.fillText(fTs(t1).slice(0, 5), W - R - 36, H - 4);
    const ends = [];
    for (const [k, col, dash, lab] of S4) {
      const c = w[k]; if (!c.length) continue;
      x.strokeStyle = col; x.lineWidth = 2; x.setLineDash(dash); x.beginPath(); x.moveTo(X(t0), Y(0));
      for (const [t, y] of c) x.lineTo(X(t), Y(y));
      x.stroke(); x.setLineDash([]); x.lineWidth = 1;
      const last = c[c.length - 1][1]; ends.push([Y(last), col, `${lab} ${last >= 0 ? "+" : ""}${last.toFixed(0)}R`]);
    }
    // end labels, nudged apart so they never overlap
    ends.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < ends.length; i++) ends[i][0] = Math.max(ends[i][0], ends[i - 1][0] + 13);
    for (const [y, col, lab] of ends) { x.fillStyle = col; x.fillText(lab, W - R + 4, Math.min(H - 6, y + 4)); }
  }
  function drawSc() {
    const { x, W, H } = canvas2("sc"), v = curV();
    if (!v) return;
    const sp = v.split.filter((p) => p[1] != null && p[2] != null);
    if (!sp.length) return;
    let m = 0.5;
    for (const p of sp) m = Math.max(m, Math.abs(p[1]), Math.abs(p[2]));
    m = Math.min(m * 1.05, 4);
    const L = 34, R = 8, top = 8, bot = H - 26, sz = Math.min(W - L - R, bot - top), ox = L + (W - L - R - sz) / 2;
    const X = (a) => ox + (Math.max(-m, Math.min(m, a)) + m) / (2 * m) * sz, Y = (b) => top + (m - Math.max(-m, Math.min(m, b))) / (2 * m) * sz;
    x.fillStyle = "rgba(34,197,94,.06)"; x.fillRect(X(0), Y(m), X(m) - X(0), Y(0) - Y(m));
    x.fillStyle = "rgba(240,82,79,.06)"; x.fillRect(X(0), Y(0), X(m) - X(0), Y(-m) - Y(0));
    x.strokeStyle = "#39424f"; x.beginPath(); x.moveTo(X(-m), Y(0)); x.lineTo(X(m), Y(0)); x.moveTo(X(0), Y(-m)); x.lineTo(X(0), Y(m)); x.stroke();
    x.setLineDash([3, 4]); x.beginPath(); x.moveTo(X(-m), Y(-m)); x.lineTo(X(m), Y(m)); x.stroke(); x.setLineDash([]);
    x.fillStyle = "#6b7785";
    x.fillText(`${(-m).toFixed(1)}R`, X(-m), bot + 12); x.fillText(`+${m.toFixed(1)}R`, X(m) - 34, bot + 12);
    x.fillText("2/3 đầu →", X(0) + 4, bot + 12); x.save(); x.translate(12, Y(0) + 30); x.rotate(-Math.PI / 2); x.fillText("1/3 sau →", 0, 0); x.restore();
    for (const p of sp) {
      x.fillStyle = p[5] != null && p[5] < 0.05 && p[1] > 0 ? "rgba(255,176,0,.9)" : "rgba(214,221,230,.45)";
      x.beginPath(); x.arc(X(p[1]), Y(p[2]), Math.min(6, 2 + Math.sqrt(p[3]) / 4), 0, 7); x.fill();
    }
    x.fillStyle = "#22c55e"; x.fillText("vẫn xanh", X(m) - 60, Y(m) + 12); x.fillStyle = "#f0524f"; x.fillText("xanh rồi đỏ", X(m) - 74, Y(-m) - 4);
    drawSc.pts = sp.map((p) => [X(p[1]), Y(p[2]), p]);
  }
  $("sc").addEventListener("pointermove", (e) => {
    const rc = $("sc").getBoundingClientRect(), px = e.clientX - rc.left, py = e.clientY - rc.top;
    let best = null, d = 100;
    for (const q of drawSc.pts || []) { const dd = (q[0] - px) ** 2 + (q[1] - py) ** 2; if (dd < d) { d = dd; best = q[2]; } }
    if (!best) { hideTip(); return; }
    showTip(e, `<b>${esc(keyName(best[0]))}</b><br>2/3 đầu: ${fR(best[1])} (${best[3]} lệnh${best[5] != null ? `, p = ${best[5].toFixed(3)}` : ""})<br>1/3 sau: ${fR(best[2])} (${best[4]} lệnh)`);
  });
  $("sc").addEventListener("pointerleave", hideTip);

  // ---------- chart ----------
  const cv = $("cv"), ctx = cv.getContext("2d");
  const view = { n: 160, end: null };
  let hover = null, drag = null;
  function drawChart() {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono, monospace";
    const r = A && A.res[S.tf];
    if (!r) { ctx.fillStyle = "#6b7785"; ctx.fillText(A ? "Khung này chưa có dữ liệu" : "Đang tải…", 16, 24); $("h-chart").textContent = "BIỂU ĐỒ"; return; }
    const B = r.B, n = r.n, cur = T.current(A, S.tf), atEnd = view.end == null || view.end >= n - 1;
    const end = atEnd ? n - 1 : view.end, cnt = Math.min(view.n, n), i0 = Math.max(0, end - cnt + 1);
    const pad = atEnd ? Math.round(cnt * 0.28) : 0;   // room on the right for the scenarios
    const L = 6, R = 66, top = 18, volH = 46, bot = H - 22, ph = bot - volH - 6 - top;
    const slot = (W - L - R) / (cnt + pad), bw = Math.max(1, slot * 0.7);
    const X = (i) => L + (i - i0 + 0.5) * slot;
    let lo = Infinity, hi = -Infinity, vmax = 0;
    for (let i = i0; i <= end; i++) { lo = Math.min(lo, B.l[i]); hi = Math.max(hi, B.h[i]); vmax = Math.max(vmax, B.v[i]); }
    const ell = atEnd && cur.elliott && cur.elliott.scenario === 0 ? cur.elliott : null;
    if (ell) { lo = Math.min(lo, ell.target, ell.invalid); hi = Math.max(hi, ell.target, ell.invalid); }
    else if (atEnd && cur.wyckoff && cur.wyckoff.open) { lo = Math.min(lo, cur.wyckoff.target); hi = Math.max(hi, cur.wyckoff.target); }
    if (sel && sel.tf === S.tf && sel.i >= i0 && sel.i <= end) { lo = Math.min(lo, sel.sl); hi = Math.max(hi, sel.sl, ...(sel.tps || []).map((x) => x[0])); lo = Math.min(lo, ...(sel.tps || []).map((x) => x[0])); }
    const m = (hi - lo) * 0.06 || hi * 0.01; lo -= m; hi += m;
    const Y = (p) => top + (hi - p) / (hi - lo) * ph;
    $("h-chart").textContent = `BIỂU ĐỒ ${S.sym} · ${TFL[S.tf].toUpperCase()} · xu hướng khung này: ${cur.trend === 1 ? "TĂNG" : cur.trend === -1 ? "GIẢM" : "CHƯA RÕ"}`;
    // grid and price axis
    ctx.strokeStyle = "#141a22"; ctx.fillStyle = "#6b7785"; ctx.lineWidth = 1;
    for (let k = 0; k <= 5; k++) { const p = lo + (hi - lo) * k / 5, y = Y(p); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke(); ctx.fillText(fP(p), W - R + 4, y + 4); }
    // time labels
    const every = Math.max(1, Math.round(cnt / 6));
    for (let i = i0; i <= end; i += every) ctx.fillText(fTs(B.t[i]).slice(0, S.tf === "1W" || S.tf === "1D" ? 5 : 11), X(i) - 20, H - 6);
    ctx.save(); ctx.beginPath(); ctx.rect(L, top - 4, W - R - L, bot - top + 4); ctx.clip();
    // Darvas boxes
    for (const b of r.boxes) {
      const e = b.brk ?? Math.min(n - 1, b.at + 30);
      if (e < i0 || b.from > end) continue;
      ctx.fillStyle = "rgba(199,125,255,.08)"; ctx.strokeStyle = "rgba(199,125,255,.7)";
      ctx.fillRect(X(b.from), Y(Math.max(b.top, b.bot)), X(e) - X(b.from), Math.abs(Y(b.top) - Y(b.bot)));
      ctx.strokeRect(X(b.from), Y(Math.max(b.top, b.bot)), X(e) - X(b.from), Math.abs(Y(b.top) - Y(b.bot)));
    }
    // ranges (all in view; the open one extends right)
    for (const g of r.ranges) {
      const e = g.open ? end + pad : g.end;
      if (e < i0 || g.start > end) continue;
      ctx.strokeStyle = g.open ? "#4aa8ff" : "rgba(74,168,255,.35)"; ctx.setLineDash([]);
      for (const p of [g.top, g.bot]) { ctx.beginPath(); ctx.moveTo(X(g.start), Y(p)); ctx.lineTo(X(e), Y(p)); ctx.stroke(); }
      ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(X(g.start), Y(g.mid)); ctx.lineTo(X(e), Y(g.mid)); ctx.stroke(); ctx.setLineDash([]);
    }
    // Wyckoff: phase label, events and the cause-and-effect target of the running range
    if (cur.wyckoff && cur.wyckoff.open) {
      const y = cur.wyckoff, g = y.range;
      ctx.fillStyle = "#4aa8ff"; ctx.fillText(`Wyckoff: ${y.wk === "ACC" ? "tích lũy" : "phân phối"} · pha ${y.phase}`, Math.max(L + 2, X(g.start)), Y(g.top) - 6);
      for (const e of y.events) if (e.i >= i0 && e.i <= end) { ctx.fillStyle = "#4aa8ff"; const lo2 = e.k === "SC" || e.k === "SPRING" || e.k === "SOW"; ctx.fillText(e.k, X(e.i) - 10, lo2 ? Y(B.l[e.i]) + 24 : Y(B.h[e.i]) - 14); }
      if (atEnd && !ell) {
        ctx.strokeStyle = "rgba(74,168,255,.8)"; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(X(end), Y(y.target)); ctx.lineTo(X(end + pad), Y(y.target)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#4aa8ff"; ctx.fillText("mục tiêu Wyckoff", X(end) + 4, Y(y.target) + (y.bias === 1 ? -4 : 12));
      }
    }
    // broken levels waiting for a retest
    if (atEnd) for (const w of cur.watch) {
      ctx.strokeStyle = "#ffb000"; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(Math.max(i0, w.i)), Y(w.level)); ctx.lineTo(X(end + pad), Y(w.level)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#ffb000"; ctx.fillText(`${w.dir === 1 ? "▲" : "▼"} đã test ${w.tests}`, X(end) + 6, Y(w.level) - 4);
    }
    // volume
    for (let i = i0; i <= end; i++) {
      const vh = vmax ? B.v[i] / vmax * volH : 0;
      ctx.fillStyle = r.RV[i] >= 1.5 ? "rgba(255,176,0,.55)" : "rgba(107,119,133,.35)";
      ctx.fillRect(X(i) - bw / 2, bot - vh, bw, vh);
    }
    // candles
    for (let i = i0; i <= end; i++) {
      const up = B.c[i] >= B.o[i];
      ctx.strokeStyle = ctx.fillStyle = up ? "#22c55e" : "#f0524f";
      ctx.beginPath(); ctx.moveTo(X(i), Y(B.h[i])); ctx.lineTo(X(i), Y(B.l[i])); ctx.stroke();
      const y1 = Y(Math.max(B.o[i], B.c[i])), y2 = Y(Math.min(B.o[i], B.c[i]));
      ctx.fillRect(X(i) - bw / 2, y1, bw, Math.max(1, y2 - y1));
    }
    // zigzag (only pivots already confirmed at the right edge of the view)
    const pv = r.piv.filter((p) => p.c <= end && p.i >= i0 - 50);
    ctx.strokeStyle = "#8a93a6"; ctx.lineWidth = 1.5; ctx.beginPath();
    pv.forEach((p, k) => (k ? ctx.lineTo(X(p.i), Y(p.p)) : ctx.moveTo(X(p.i), Y(p.p)))); ctx.stroke(); ctx.lineWidth = 1;
    // Elliott count and the three scenarios
    if (cur.elliott && cur.elliott.i <= end) {
      const e = cur.elliott, labs = { W2: ["0", "1", "2"], W4: ["0", "1", "2", "3", "4"], W5: ["0", "1", "2", "3", "4", "5"], ABC: ["X", "A", "B", "C"] }[e.kind];
      const P = e.piv.slice(-labs.length);
      ctx.font = "bold 12px JetBrains Mono, monospace";
      P.forEach(([i, p], k) => { const hiP = k < P.length - 1 ? p >= P[k + 1][1] : p >= P[k - 1][1]; ctx.fillStyle = "#ffb000"; ctx.fillText(labs[k], X(i) - 4, Y(p) + (hiP ? -6 : 15)); });
      ctx.font = "11px JetBrains Mono, monospace";
    }
    if (ell) {
      const pr = scenProb(ell.kind), x0 = X(end), p0 = B.c[end], x1 = X(end + pad - 1), xm = (x0 + x1) / 2;
      const path = (pts, col, lab) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); pts.forEach(([x, p], k) => (k ? ctx.lineTo(x, Y(p)) : ctx.moveTo(x, Y(p)))); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
        const [lx, lp] = pts[pts.length - 1]; ctx.fillStyle = col; ctx.fillText(lab, Math.min(lx - 30, W - R - 70), Y(lp) + (lp >= p0 ? -6 : 14));
      };
      const amp = Math.abs(ell.target - p0) * 0.25;
      path([[x0, p0], [x0 + (x1 - x0) * 0.25, p0 - ell.dir * amp], [x0 + (x1 - x0) * 0.5, p0 + ell.dir * amp * 0.6], [x0 + (x1 - x0) * 0.75, p0 - ell.dir * amp * 0.5], [x1, p0 + ell.dir * amp * 0.3]], "#ffb000", `KB2 ${pr.s2}`);
      path([[x0, p0], [xm, ell.invalid], [x1, ell.invalid - ell.dir * Math.abs(ell.target - p0) * 0.3]], "#f0524f", `KB3 ${pr.s3}`);
      path([[x0, p0], [x0 + (x1 - x0) * 0.3, p0 - ell.dir * Math.abs(ell.target - p0) * 0.15], [x1, ell.target]], "#22c55e", `KB1 ${pr.s1}`);
      ctx.strokeStyle = "rgba(240,82,79,.6)"; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x0, Y(ell.invalid)); ctx.lineTo(W - R, Y(ell.invalid)); ctx.stroke(); ctx.setLineDash([]);
    }
    // the selected trade
    if (sel && sel.tf === S.tf) {
      const xe = X(sel.open ? end : sel.exitI);
      ctx.fillStyle = "rgba(255,176,0,.08)"; ctx.fillRect(X(sel.i) - slot / 2, top, xe - X(sel.i) + slot, ph);
      const hl = (p, col, lab) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(X(sel.i), Y(p)); ctx.lineTo(xe, Y(p)); ctx.stroke(); ctx.fillStyle = col; ctx.fillText(lab, X(sel.i) + 2, Y(p) - 3); };
      hl(sel.entry, "#d6dde6", "vào"); hl(sel.sl, "#f0524f", "SL");
      (sel.tps || []).forEach(([p], k) => hl(p, "#22c55e", sel.tps.length > 1 ? `TP${k + 1}` : "TP"));
      if (!sel.open) { ctx.fillStyle = sel.R > 0 ? "#22c55e" : "#f0524f"; ctx.beginPath(); ctx.arc(xe, Y(sel.exitPx), 4, 0, 7); ctx.fill(); }
      ctx.fillStyle = sel.dir === 1 ? "#22c55e" : "#f0524f"; ctx.beginPath();
      const xs = X(sel.i), ys = Y(sel.entry); ctx.moveTo(xs, ys + (sel.dir === 1 ? 12 : -12)); ctx.lineTo(xs - 5, ys + (sel.dir === 1 ? 20 : -20)); ctx.lineTo(xs + 5, ys + (sel.dir === 1 ? 20 : -20)); ctx.fill();
    }
    ctx.restore();
    // last price tag
    const lp = B.c[end]; ctx.fillStyle = "#ffb000"; ctx.fillRect(W - R, Y(lp) - 8, R, 16); ctx.fillStyle = "#000"; ctx.fillText(fP(lp), W - R + 4, Y(lp) + 4);
    // crosshair
    if (hover != null && hover >= i0 && hover <= end) {
      const i = hover;
      ctx.strokeStyle = "rgba(214,221,230,.25)"; ctx.beginPath(); ctx.moveTo(X(i), top); ctx.lineTo(X(i), bot); ctx.stroke();
      const t = `${fT(B.t[i])}  O ${fP(B.o[i])}  H ${fP(B.h[i])}  L ${fP(B.l[i])}  C ${fP(B.c[i])}  RVOL ${r.RV[i].toFixed(1)}`;
      ctx.fillStyle = "rgba(13,17,23,.9)"; ctx.fillRect(L, 0, Math.min(W - L - R, ctx.measureText(t).width + 10), 16); ctx.fillStyle = "#d6dde6"; ctx.fillText(t, L + 4, 12);
    }
    drawChart.map = { i0, end, slot, L, n };
  }
  const idxAt = (ev) => { const mp = drawChart.map; if (!mp) return null; const rc = cv.getBoundingClientRect(); return Math.round(mp.i0 + (ev.clientX - rc.left - mp.L) / mp.slot - 0.5); };
  cv.addEventListener("pointerdown", (ev) => { const mp = drawChart.map; if (!mp) return; drag = { x: ev.clientX, end: mp.end }; cv.setPointerCapture(ev.pointerId); });
  cv.addEventListener("pointermove", (ev) => {
    const mp = drawChart.map; if (!mp) return;
    if (drag) { const d = Math.round((ev.clientX - drag.x) / mp.slot); view.end = Math.max(Math.min(view.n, mp.n) - 1, Math.min(mp.n - 1, drag.end - d)); }
    hover = idxAt(ev); drawChart();
  });
  cv.addEventListener("pointerup", () => { drag = null; });
  cv.addEventListener("pointerleave", () => { hover = null; drag = null; drawChart(); });
  cv.addEventListener("wheel", (ev) => { ev.preventDefault(); view.n = Math.max(30, Math.min(1500, Math.round(view.n * (ev.deltaY > 0 ? 1.15 : 0.87)))); drawChart(); }, { passive: false });
  $("zin").onclick = () => { view.n = Math.max(30, Math.round(view.n * 0.75)); drawChart(); };
  $("zout").onclick = () => { view.n = Math.min(1500, Math.round(view.n * 1.33)); drawChart(); };
  $("zend").onclick = () => { view.end = null; drawChart(); };
  window.addEventListener("resize", () => { drawChart(); drawBo(); drawEq(); drawWf(); drawSc(); });

  // ---------- ① Elliott, Wyckoff, Darvas ----------
  // how often each scenario played out for this reading on this timeframe; falls back to 12 months when the window is thin
  function scenStats(kind, tf) {
    let w = S.win, e = tb(w).el[`${kind}|${tf}`];
    if (!e || e.n < 5) { w = "12m"; e = tb(w).el[`${kind}|${tf}`]; }
    return { e: e || { n: 0, s1: 0, s2: 0, s3: 0 }, w };
  }
  function scenProb(kind) {
    const { e } = scenStats(kind, S.tf), f = (k) => (e.n ? Math.round(e[k] / e.n * 100) + "%" : "–");
    return { s1: f("s1"), s2: f("s2"), s3: f("s3") };
  }
  function reasons(e, last) {
    const up = e.dir === 1, D = up ? "tăng" : "giảm", O = up ? "giảm" : "tăng";
    const P = e.piv.map((x) => x[1]), L = (a, b) => Math.abs(P[b] - P[a]);
    const tg = fP(e.target), iv = fP(e.invalid);
    if (e.kind === "W2") {
      const n = P.length, rt = L(n - 2, n - 1) / L(n - 3, n - 2);
      return [`Sóng 1 ${D} đã xong, sóng 2 hồi ${(rt * 100).toFixed(0)}% sóng 1 (vùng chuẩn 38,2–88,6%, đẹp nhất 50–61,8%) và chưa vượt điểm đầu sóng 1. Sóng 3 thường là sóng dài và mạnh nhất, khoảng 1,618 lần sóng 1: mục tiêu ${tg}.`,
        `Sóng 2 kéo dài thành điều chỉnh phẳng hoặc phức hợp: giá đi ngang giữa đáy sóng 2 và đỉnh sóng 1 để tích lũy thêm, rồi mới bắt đầu sóng 3. Thường gặp khi khối lượng chưa tăng.`,
        `Giá đóng cửa qua ${iv} (điểm đầu sóng 1) thì vi phạm quy tắc cứng: sóng 2 không được hồi quá 100% sóng 1. Khi đó cái ta tưởng là sóng 1-2 chỉ là một nhịp A-B, xu hướng ${O} cũ tiếp diễn.`];
    }
    if (e.kind === "W4") {
      const n = P.length, r4 = L(n - 2, n - 1) / L(n - 3, n - 2);
      return [`Đã có 4 sóng: sóng 3 dài hơn sóng 1, sóng 4 hồi ${(r4 * 100).toFixed(0)}% sóng 3 (chuẩn 23,6–50%) và không chồng lên vùng giá sóng 1. Sóng 5 thường bằng sóng 1: mục tiêu ${tg}.`,
        `Nguyên tắc luân phiên: sóng 2 sắc nét thì sóng 4 hay đi ngang (phẳng, tam giác). Giá có thể dao động thêm trong vùng sóng 4 trước khi đi sóng 5, hoặc sóng 5 bị cụt.`,
        `Giá đóng cửa vào vùng sóng 1, qua ${iv}, thì đây không phải sóng 4: quy tắc cứng bị vi phạm. Cấu trúc là một điều chỉnh lớn hơn đang chạy theo hướng ${O}.`];
    }
    if (e.kind === "W5") {
      return [`Đủ 5 sóng đẩy hợp lệ (sóng 3 không ngắn nhất, sóng 4 không chồng sóng 1). Sau sóng đẩy là điều chỉnh A-B-C ngược lại, thường về khoảng 38,2% cả chuỗi: mục tiêu ${tg}.`,
        `Sóng 5 kiệt sức thành tam giác kết thúc (ending diagonal) hoặc giá tích lũy ngang ở đỉnh/đáy: động lượng yếu dần nhưng chưa đảo chiều ngay.`,
        `Giá đóng cửa vượt ${iv} (điểm cuối sóng 5) thì sóng 5 đang kéo dài (extension) hoặc ta đếm thiếu một bậc sóng: xu hướng cũ vẫn tiếp tục.`];
    }
    const n = P.length, ca = L(n - 2, n - 1) / L(n - 4, n - 3);
    return [`Điều chỉnh A-B-C ngược xu hướng đã đủ 3 nhịp (sóng C bằng ${ca.toFixed(2)} lần sóng A, chuẩn 0,618–1,618). Xu hướng ${D} cũ quay lại, mục tiêu đỉnh/đáy trước ${tg}.`,
      `Điều chỉnh chưa xong mà biến thành phức hợp W-X-Y hoặc tam giác: giá đi ngang lâu hơn quanh vùng sóng C trước khi xu hướng cũ trở lại.`,
      `Giá đóng cửa qua ${iv} (điểm cuối sóng C) thì đây không còn là điều chỉnh: một xu hướng ${O} mới đã hình thành.`];
  }
  function renderElliott() {
    if (!A || !A.res[S.tf]) { $("ell").innerHTML = ""; $("el-sub").textContent = ""; return; }
    const cur = T.current(A, S.tf), e = cur.elliott;
    let h = "";
    if (!e) h += `<p class="dim">Khung ${TFL[S.tf]} hiện chưa có cấu trúc Elliott nào khớp quy tắc trong 200 nến gần nhất. Hãy xem bảng các khung khác bên dưới.</p>`;
    else {
      const { e: st, w } = scenStats(e.kind, S.tf), f = (k) => (st.n ? Math.round(st[k] / st.n * 100) + "%" : "–");
      const R = reasons(e, cur.last), done = e.scenario;
      $("el-sub").textContent = `khung ${TFL[S.tf]} · đọc tại nến ${fTs(e.t)} · độ khớp Fibonacci ${e.fit}/4 · xác suất từ ${st.n} lần giống vậy trong ${WL[w]}`;
      h += `<p><b>${esc(ML[e.kind])}</b>, hướng kỳ vọng <b class="${e.dir === 1 ? "up" : "down"}">${e.dir === 1 ? "TĂNG" : "GIẢM"}</b> · mục tiêu ${fP(e.target)} · điểm vô hiệu ${fP(e.invalid)} · giá hiện tại ${fP(cur.last)}${done ? ` · <b class="amber">đã kết thúc theo kịch bản ${done}</b>` : ""}</p>`;
      h += `<div class="scen">${[["s1", "KỊCH BẢN 1 · theo lý thuyết"], ["s2", "KỊCH BẢN 2 · đi ngang, tái tích lũy"], ["s3", "KỊCH BẢN 3 · đi ngược"]].map(([k, t], j) => `<div class="sc ${k}"><h4><span>${t}</span><span>${f(k)}</span></h4>${esc(R[j])}</div>`).join("")}</div>`;
    }
    // every timeframe at a glance, top-down
    h += `<div class="scroll" style="margin-top:10px"><table><tr><th>Khung</th><th>Xu hướng</th><th>Cách đếm hiện tại</th><th>Hướng</th><th>Mục tiêu</th><th>Vô hiệu</th><th>KB1</th><th>KB2</th><th>KB3</th><th>Wyckoff / biên</th><th>Darvas</th></tr>`;
    for (const tf of T.TFS) {
      const r = A.res[tf]; if (!r) continue;
      const c = T.current(A, tf), x = c.elliott, st = x ? scenStats(x.kind, tf).e : null, f = (k) => (st && st.n ? Math.round(st[k] / st.n * 100) + "%" : "–");
      const rg = c.range ? `biên ${fP(c.range.bot)}–${fP(c.range.top)}, trước đó ${c.range.prior === 1 ? "tăng" : c.range.prior === -1 ? "giảm" : "ngang"}` : "–";
      const b = c.boxes[c.boxes.length - 1];
      const dv = b ? `hộp ${b.dir === 1 ? "tăng" : "giảm"} ${fP(Math.min(b.top, b.bot))}–${fP(Math.max(b.top, b.bot))}${b.brk ? " (đã phá)" : ""}` : "–";
      h += `<tr class="${tf === S.tf ? "sel" : ""}" data-tf="${tf}" style="cursor:pointer"><td>${TFL[tf]}</td><td class="${c.trend === 1 ? "up" : c.trend === -1 ? "down" : "dim"}">${c.trend === 1 ? "▲ tăng" : c.trend === -1 ? "▼ giảm" : "■ chưa rõ"}</td><td>${x ? MS[x.kind] + (x.scenario ? ` <span class="dim">(xong: KB${x.scenario})</span>` : "") : "–"}</td><td class="${x ? (x.dir === 1 ? "up" : "down") : ""}">${x ? (x.dir === 1 ? "▲" : "▼") : ""}</td><td>${x ? fP(x.target) : ""}</td><td>${x ? fP(x.invalid) : ""}</td><td>${x ? f("s1") : ""}</td><td>${x ? f("s2") : ""}</td><td>${x ? f("s3") : ""}</td><td class="small">${rg}</td><td class="small">${dv}</td></tr>`;
    }
    h += "</table></div>";
    $("ell").innerHTML = h;
  }
  $("ell").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-tf]"); if (tr) setTf(tr.dataset.tf); });


  // ---------- ① Wyckoff ----------
  const WK = { ACC: "TÍCH LŨY (Accumulation)", DIST: "PHÂN PHỐI (Distribution)" };
  const PH = { A: "A · dừng xu hướng cũ", B: "B · xây dựng nguyên nhân", C: "C · phép thử (Spring/Upthrust)", D: "D · giá rời vùng test", E: "E · đã rời biên" };
  function wyStats(wk, tf) {
    let w = S.win, e = tb(w).wy[`${wk}|${tf}`];
    if (!e || e.n < 5) { w = "12m"; e = tb(w).wy[`${wk}|${tf}`]; }
    return { e: e || { n: 0, s1: 0, s2: 0, s3: 0 }, w };
  }
  function wyReasons(x) {
    const g = x.range, up = x.bias === 1, h = fP(x.height), tg = fP(x.target), iv = fP(x.invalid);
    const ctx = x.basis === "trend" ? (g.prior === -1 ? "Biên hình thành sau một đợt giảm" : "Biên hình thành sau một đợt tăng") : `Trước biên giá đi ngang; khối lượng nến ${x.vbAtFound >= 0 ? "tăng" : "giảm"} lớn hơn`;
    const evs = x.events.filter((e) => e.k !== "SOS" && e.k !== "SOW").map((e) => e.k).join(", ");
    const eff = `nến tăng chiếm ${Math.round((x.vb + 1) * 50)}% khối lượng trong biên`;
    const dry = x.dry < 0.8 ? `khối lượng 10 nến gần nhất cạn (RVOL ${x.dry.toFixed(2)}): bên ${up ? "bán" : "mua"} đã yếu` : `khối lượng 10 nến gần nhất chưa cạn (RVOL ${x.dry.toFixed(2)})`;
    const tilt = x.bias !== x.bias0 ? ` ${x.bias === 1 ? "Spring" : "Upthrust"} vừa xuất hiện nên kỳ vọng nghiêng sang ${up ? "TĂNG" : "GIẢM"}.` : "";
    return [
      `${ctx}, nên theo luật Cung–Cầu đây là vùng ${up ? "tay to gom hàng" : "tay to xả hàng"}.${tilt} ${evs ? `Đã thấy: ${evs}. ` : ""}Luật Nhân–Quả: biên cao ${h}, nên mục tiêu tối thiểu sau khi ${up ? "vượt đỉnh (SOS)" : "thủng đáy (SOW)"} là ${tg}. Xác nhận: đóng cửa ${up ? "vượt đỉnh" : "thủng đáy"} biên với khối lượng lớn, rồi test lại mép cũ mà giữ được (${up ? "LPS" : "LPSY"}).`,
      `Nguyên nhân chưa đủ: giá tiếp tục dao động trong ${fP(g.bot)}–${fP(g.top)} (pha B kéo dài). Đáy đã bị test ${x.testsBot} lần, đỉnh ${x.testsTop} lần; ${dry}. Biên càng dài thì đợt chạy sau càng xa, nên đi ngang chưa phải tín hiệu xấu.`,
      `Đóng cửa ${up ? "thủng đáy" : "vượt đỉnh"} biên, qua ${iv}, với khối lượng lớn (${up ? "SOW" : "SOS"}): đây không phải ${up ? "tích lũy mà là tái phân phối" : "phân phối mà là tái tích lũy"}, xu hướng ${up ? "giảm" : "tăng"} tiếp diễn, mục tiêu khoảng ${fP(up ? g.bot - x.height : g.top + x.height)}. Nỗ lực–Kết quả hiện tại: ${eff}.`,
    ];
  }
  function renderWyckoff() {
    if (!A || !A.res[S.tf]) { $("wy").innerHTML = ""; $("wy-sub").textContent = ""; return; }
    const cur = T.current(A, S.tf), x = cur.wyckoff;
    let h = "";
    if (!x) { h += `<p class="dim">Khung ${TFL[S.tf]} hiện không có biên giá nào đang chạy hoặc vừa kết thúc, nên chưa có cách đọc Wyckoff. Xem bảng các khung khác bên dưới.</p>`; $("wy-sub").textContent = ""; }
    else {
      const { e: st, w } = wyStats(x.wk, S.tf), f = (k) => (st.n ? Math.round(st[k] / st.n * 100) + "%" : "–"), R = wyReasons(x), up = x.bias === 1;
      $("wy-sub").textContent = `khung ${TFL[S.tf]} · biên từ ${fTs(x.range.t)} · xác suất từ ${st.n} biên ${x.wk === "ACC" ? "tích lũy" : "phân phối"} trong ${WL[w]}`;
      const done = !x.open ? (x.exit === x.bias0 ? 1 : x.exit === -x.bias0 ? 3 : 2) : 0;
      h += `<p><b>${WK[x.wk]}</b>, pha <b class="amber">${PH[x.phase]}</b>, kỳ vọng <b class="${up ? "up" : "down"}">${up ? "TĂNG (markup)" : "GIẢM (markdown)"}</b> · biên ${fP(x.range.bot)}–${fP(x.range.top)} · mục tiêu ${fP(x.target)} · vô hiệu ${fP(x.invalid)} · giá ${fP(x.last)}${done ? ` · <b class="amber">đã kết thúc theo kịch bản ${done}</b>` : ""}</p>`;
      h += `<div class="chips-row">${x.events.map((e) => `<span class="ev" title="${esc(e.txt)}"><b>${e.k}</b> ${fTs(A.res[S.tf].B.t[e.i])}</span>`).join("") || '<span class="dim small">chưa có sự kiện Wyckoff rõ ràng</span>'}<span class="ev">test đáy ${x.testsBot} · test đỉnh ${x.testsTop}</span><span class="ev">RVOL 10 nến ${x.dry.toFixed(2)}</span></div>`;
      h += `<div class="scen">${[["s1", up ? "KỊCH BẢN 1 · tăng giá (markup)" : "KỊCH BẢN 1 · giảm giá (markdown)"], ["s2", "KỊCH BẢN 2 · đi ngang, xây thêm nguyên nhân"], ["s3", up ? "KỊCH BẢN 3 · tái phân phối, giảm tiếp" : "KỊCH BẢN 3 · tái tích lũy, tăng tiếp"]].map(([k, t], j) => `<div class="sc ${k}"><h4><span>${t}</span><span>${f(k)}</span></h4>${esc(R[j])}</div>`).join("")}</div>`;
    }
    h += `<div class="scroll" style="margin-top:10px"><table><tr><th>Khung</th><th>Biên</th><th>Cách đọc</th><th>Pha</th><th>Sự kiện</th><th>Kỳ vọng</th><th>Mục tiêu</th><th>Vô hiệu</th><th>KB1</th><th>KB2</th><th>KB3</th></tr>`;
    for (const tf of T.TFS) {
      if (!A.res[tf]) continue;
      const y = T.current(A, tf).wyckoff, st = y ? wyStats(y.wk, tf).e : null, f = (k) => (st && st.n ? Math.round(st[k] / st.n * 100) + "%" : "–");
      h += `<tr class="${tf === S.tf ? "sel" : ""}" data-tf="${tf}" style="cursor:pointer"><td>${TFL[tf]}</td>${y ? `<td>${fP(y.range.bot)}–${fP(y.range.top)}${y.open ? "" : ' <span class="dim">(đã kết thúc)</span>'}</td><td>${y.wk === "ACC" ? "Tích lũy" : "Phân phối"}</td><td>${y.phase}</td><td class="small">${y.events.map((e) => e.k).join(", ") || "–"}</td><td class="${y.bias === 1 ? "up" : "down"}">${y.bias === 1 ? "▲ tăng" : "▼ giảm"}</td><td>${fP(y.target)}</td><td>${fP(y.invalid)}</td><td>${f("s1")}</td><td>${f("s2")}</td><td>${f("s3")}</td>` : '<td colspan="10" class="dim">không có biên</td>'}</tr>`;
    }
    h += `</table></div><p class="dim small">KB1 = rời biên theo hướng kỳ vọng · KB2 = hết thời gian vẫn trong biên · KB3 = rời biên ngược hướng. Đo trên các biên đã kết thúc cùng loại, cùng khung, của mã này.</p>`;
    $("wy").innerHTML = h;
  }
  $("wy").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-tf]"); if (tr) setTf(tr.dataset.tf); });

  // ---------- ② breakouts ----------
  const BK = ["B0", "T1", "T2", "T3", "T4", "FAIL"];
  const BKL = { B0: "Phá vỡ", T1: "Test 1", T2: "Test 2", T3: "Test 3", T4: "Test 4", FAIL: "Đảo chiều" };
  function drawBo() {
    const c = $("bo"), x = c.getContext("2d"), dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    x.font = "11px JetBrains Mono, monospace";
    if (!A || !A.res[S.tf]) return;
    const bo = tb(S.win).bo, L = 34, R = 8, top = 14, bot = H - 34, gw = (W - L - R) / BK.length;
    const Y = (v) => bot - v * (bot - top);
    x.strokeStyle = "#141a22"; x.fillStyle = "#6b7785";
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(W - R, Y(v)); x.stroke(); x.fillText((v * 100) + "%", 0, Y(v) + 4); }
    // break-even win rate for a 2R target: 1/3 (before costs)
    x.strokeStyle = "rgba(214,221,230,.5)"; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(L, Y(1 / 3)); x.lineTo(W - R, Y(1 / 3)); x.stroke(); x.setLineDash([]);
    x.fillStyle = "#d6dde6"; x.fillText("hòa vốn 33%", W - R - 84, Y(1 / 3) - 4);
    const bars = [];
    BK.forEach((k, j) => {
      const s = bo[`${k}|${S.tf}`], bw = Math.min(26, gw * 0.34), cx = L + gw * (j + 0.5);
      [["vol", "#ffb000", -1], ["novol", "#4aa8ff", 1]].forEach(([key, col, side]) => {
        const st = s[key], bx = cx + (side === -1 ? -bw - 1 : 1);
        if (st.n) { const h = Math.max(2, (bot - Y(st.win))); x.fillStyle = st.n < MIN_N ? col + "55" : col; x.beginPath(); x.roundRect ? x.roundRect(bx, bot - h, bw, h, [4, 4, 0, 0]) : x.rect(bx, bot - h, bw, h); x.fill(); }
        x.fillStyle = "#6b7785"; x.fillText(String(st.n), bx + bw / 2 - x.measureText(String(st.n)).width / 2, bot + 12);
        bars.push({ x0: bx, x1: bx + bw, k, key, st });
      });
      x.fillStyle = "#d6dde6"; x.fillText(BKL[k], cx - x.measureText(BKL[k]).width / 2, bot + 26);
    });
    drawBo.bars = bars;
  }
  $("bo").addEventListener("pointermove", (e) => {
    const rc = $("bo").getBoundingClientRect(), px = e.clientX - rc.left, b = (drawBo.bars || []).find((q) => px >= q.x0 - 2 && px <= q.x1 + 2);
    if (!b) { hideTip(); return; }
    showTip(e, `<b>${ML[b.k]}</b> · ${b.key === "vol" ? "có" : "không có"} xác nhận khối lượng<br>${b.st.n} lệnh · thắng ${pct(b.st.win)} · TB ${fR(b.st.avgR)}`);
  });
  $("bo").addEventListener("pointerleave", hideTip);
  function renderBo() {
    drawBo();
    if (!A || !A.res[S.tf]) { $("bo-txt").innerHTML = ""; return; }
    const bo = tb(S.win).bo, g = (k, tf) => bo[`${k}|${tf}`];
    const b0 = g("B0", S.tf).all.n, fail = g("FAIL", S.tf).all.n;
    const best = BK.map((k) => [k, g(k, S.tf).all]).filter(([, s]) => s.n >= MIN_N).sort((a, b) => b[1].avgR - a[1].avgR)[0];
    let h = `<p>Khung ${TFL[S.tf]}, ${WL[S.win]}: ${b0} lần phá vỡ, trong đó ${fail} lần thành phá vỡ giả (${b0 ? Math.round(fail / b0 * 100) : 0}%). ${best ? `Điểm vào tốt nhất hiện tại: <b>${BKL[best[0]]}</b> (thắng ${pct(best[1].win)}, TB ${fR(best[1].avgR)} mỗi lệnh).` : "Chưa đủ lệnh để chọn điểm vào tốt nhất."}</p>`;
    h += `<div class="scroll"><table><tr><th>Khung</th>${BK.map((k) => `<th>${BKL[k]}</th>`).join("")}<th>Giả</th></tr>`;
    for (const tf of T.TFS) {
      if (!A.res[tf]) continue;
      const nb = g("B0", tf).all.n;
      h += `<tr class="${tf === S.tf ? "sel" : ""}"><td>${TFL[tf]}</td>${BK.map((k) => { const s = g(k, tf); const a = s.all, v = s.vol; return `<td title="có KL: ${pct(v.win)} (${v.n}) · không KL: ${pct(s.novol.win)} (${s.novol.n})" class="${a.n >= MIN_N ? (a.avgR > 0 ? "up" : "down") : "dim"}">${a.n ? pct(a.win) : "–"}<span class="dim small"> ${a.n}</span></td>`; }).join("")}<td>${nb ? Math.round(g("FAIL", tf).all.n / nb * 100) + "%" : "–"}</td></tr>`;
    }
    h += `</table></div><p class="dim small">Ô xanh/đỏ: R trung bình dương/âm (đủ ${MIN_N} lệnh). Rê chuột vào ô để xem có và không có xác nhận khối lượng.</p>`;
    $("bo-txt").innerHTML = h;
  }

  // ---------- ③ ranges ----------
  function renderRange() {
    if (!A || !A.res[S.tf]) { $("rg").innerHTML = ""; return; }
    const rg = tb(S.win).rg, cur = T.current(A, S.tf);
    const PL = { 1: "▲ Tăng", 0: "■ Ngang", "-1": "▼ Giảm" };
    let h = cur.range ? `<p>Biên đang chạy ở khung ${TFL[S.tf]}: <b>${fP(cur.range.bot)} – ${fP(cur.range.top)}</b>, giữa ${fP(cur.range.mid)}, xu hướng trước biên ${PL[cur.range.prior].toLowerCase()}.</p>` : `<p class="dim">Khung ${TFL[S.tf]} hiện không ở trong biên.</p>`;
    h += `<div class="scroll"><table><tr><th>Trước biên</th><th>Số biên</th><th>Thoát lên</th><th>Thoát xuống</th><th>Mua đáy</th><th>Bán đỉnh</th></tr>`;
    for (const p of [1, 0, -1]) {
      const s = rg[`${p}|${S.tf}`]; if (!s) continue;
      const done = s.up + s.down, cell = (st) => (st.n ? `<span class="${st.avgR > 0 ? "up" : "down"}">${pct(st.win)}</span> <span class="dim small">${fR(st.avgR)} · ${st.n}</span>` : "–");
      h += `<tr><td>${PL[p]}</td><td>${s.n}</td><td>${done ? pct(s.up / s.n) : "–"}</td><td>${done ? pct(s.down / s.n) : "–"}</td><td>${cell(s.long)}</td><td>${cell(s.short)}</td></tr>`;
    }
    h += "</table></div>";
    // continuation versus reversal on every timeframe
    h += `<p class="small" style="margin-top:10px">Biên thoát theo xu hướng cũ (tiếp diễn) hay ngược lại (đảo chiều):</p><div class="scroll"><table><tr><th>Khung</th><th>Tiếp diễn</th><th>Đảo chiều</th><th>Biên</th></tr>`;
    for (const tf of T.TFS) {
      const u = rg[`1|${tf}`], d = rg[`-1|${tf}`]; if (!u || !d) continue;
      const n = u.n + d.n, cont = u.up + d.down, rev = u.down + d.up;
      h += `<tr class="${tf === S.tf ? "sel" : ""}"><td>${TFL[tf]}</td><td class="up">${n ? pct(cont / n) : "–"}</td><td class="down">${n ? pct(rev / n) : "–"}</td><td>${n}</td></tr>`;
    }
    h += `</table></div><p class="dim small">Phần còn lại là biên hết hạn mà chưa thoát rõ ràng.</p>`;
    $("rg").innerHTML = h;
  }

  // ---------- results, equity, log ----------
  function sizeUsd(x) {
    const riskUsd = S.cap * S.risk / 100, notional = riskUsd / (x.r / x.entry), cap = S.cap * S.lev;
    const k = notional > cap ? cap / notional : 1;
    return { usd: x.R * riskUsd * k, notional: Math.min(notional, cap), capped: k < 1 };
  }
  function logTrades() {
    if (!A) return [];
    let tr = T.windowed(A.trades, A.now, WDAYS[S.win], filt());
    const f = S.logf;
    if (f === "tf") tr = tr.filter((x) => x.tf === S.tf);
    else if (f === "1" || f === "2" || f === "3") tr = tr.filter((x) => x.group === +f);
    else if (f.startsWith("m:")) tr = tr.filter((x) => x.kind === f.slice(2) && x.tf === S.tf);
    return tr;
  }
  function renderKpis() {
    if (!A) { $("kpis").innerHTML = ""; drawEq(); return; }
    const tr = T.windowed(A.trades, A.now, WDAYS[S.win], filt()), s = T.stats(tr);
    const usd = tr.filter((x) => !x.open).reduce((a, x) => a + sizeUsd(x).usd, 0);
    const k = (l, v, c, t) => `<div class="kpi" title="${esc(t || "")}">${l}<b class="${c || ""}">${v}</b></div>`;
    $("kpis").innerHTML = k("Số lệnh đã đóng", s.n + (s.open ? ` <span class="dim small">+${s.open} đang mở</span>` : ""))
      + k("Tỷ lệ thắng", pct(s.win, 1)) + k("R trung bình", fR(s.avgR), s.avgR > 0 ? "up" : "down", "Lợi nhuận trung bình mỗi lệnh tính theo số lần rủi ro, đã trừ phí")
      + k("Hệ số lợi nhuận", s.pf == null ? "–" : s.pf === Infinity ? "∞" : s.pf.toFixed(2), s.pf > 1 ? "up" : "down", "Tổng lãi / tổng lỗ")
      + k("Lãi/lỗ theo vốn", fUsd(usd), usd > 0 ? "up" : "down", `Mỗi lệnh rủi ro ${S.risk}% của $${S.cap.toLocaleString("en-US")}, không cộng dồn, đòn bẩy tối đa ${S.lev}x`)
      + k("Sụt giảm lớn nhất", "-" + s.dd.toFixed(1) + "R", "down", `≈ $${Math.round(s.dd * S.cap * S.risk / 100).toLocaleString("en-US")}`);
    $("eq-sub").textContent = `${S.sym} · mọi khung · ${WL[S.win]}${S.agree ? ` · chỉ lệnh thuận hội đồng ≥ ${S.cmin}%` : " · mọi lệnh"}`;
    drawEq();
  }
  function drawEq() {
    const c = $("eq"), x = c.getContext("2d"), dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    x.font = "11px JetBrains Mono, monospace";
    if (!A) return;
    const tr = T.windowed(A.trades, A.now, WDAYS[S.win], filt()).filter((q) => !q.open).sort((a, b) => a.exitT - b.exitT);
    if (!tr.length) { x.fillStyle = "#6b7785"; x.fillText("Chưa có lệnh nào đóng trong giai đoạn này", 10, 20); return; }
    const t0 = A.now - WDAYS[S.win] * 86400, t1 = A.now, series = { 1: [[t0, 0]], 2: [[t0, 0]], 3: [[t0, 0]] }, sum = { 1: 0, 2: 0, 3: 0 };
    for (const q of tr) { sum[q.group] += q.R; series[q.group].push([q.exitT, sum[q.group]]); }
    let lo = 0, hi = 0;
    for (const g of [1, 2, 3]) { series[g].push([t1, sum[g]]); for (const [, v] of series[g]) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    const L = 8, R = 56, top = 10, bot = H - 20, X = (t) => L + (t - t0) / (t1 - t0 || 1) * (W - L - R), Y = (v) => top + (hi - v) / (hi - lo) * (bot - top);
    x.strokeStyle = "#141a22"; x.fillStyle = "#6b7785";
    for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(W - R, Y(v)); x.stroke(); x.fillText(fR(v).replace("+", ""), W - R + 4, Y(v) + 4); }
    x.strokeStyle = "#39424f"; x.beginPath(); x.moveTo(L, Y(0)); x.lineTo(W - R, Y(0)); x.stroke();
    x.fillText(fTs(t0).slice(0, 5), L, H - 4); x.fillText(fTs(t1).slice(0, 5), W - R - 36, H - 4);
    for (const g of [1, 2, 3]) {
      x.strokeStyle = GC[g]; x.lineWidth = 2; x.beginPath();
      series[g].forEach(([t, v], k) => { const px = X(t), py = Y(v); if (!k) x.moveTo(px, py); else { x.lineTo(px, Y(series[g][k - 1][1])); x.lineTo(px, py); } });
      x.stroke(); x.lineWidth = 1;
    }
  }
  const WHY = { sl: "chạm cắt lỗ", be: "chạm TP1 rồi về hòa vốn", tp: "chạm mục tiêu", trail: "cắt lỗ dời theo xu hướng bị chạm", time: "hết thời gian giữ lệnh" };
  function entryWhy(x) {
    const e = x.ev, d = x.dir === 1 ? "mua" : "bán";
    switch (x.kind) {
      case "W2": case "W4": case "W5": case "ABC": return `${ML[x.kind]}; ${d} với mục tiêu ${fP(e.target)}, vô hiệu ở ${fP(e.invalid)}; độ khớp Fibonacci ${e.fit}/4`;
      case "SPRING": return `Giá thủng đáy biên ${fP(e.range.bot)} rồi đóng cửa trở lại trong biên: bên mua hấp thụ`;
      case "UPTHRUST": return `Giá vượt đỉnh biên ${fP(e.range.top)} rồi đóng cửa trở lại trong biên: bên bán hấp thụ`;
      case "DARVAS": return `Đóng cửa ${x.dir === 1 ? "vượt nóc" : "thủng đáy"} hộp ${fP(Math.min(e.box.top, e.box.bot))}–${fP(Math.max(e.box.top, e.box.bot))}`;
      case "B0": return `Đóng cửa ${x.dir === 1 ? "vượt đỉnh" : "thủng đáy"} sóng ${fP(e.level)} lần đầu`;
      case "FAIL": return `Phá vỡ ${fP(e.level)} thất bại, giá đóng cửa quay lại phía trong: ${d} theo hướng đảo chiều`;
      case "R_LONG": return `Chạm vùng đáy biên ${fP(e.range.bot)} và đóng nến tăng; TP1 ${fP(e.range.mid)}, TP2 ${fP(e.range.top)}`;
      case "R_SHORT": return `Chạm vùng đỉnh biên ${fP(e.range.top)} và đóng nến giảm; TP1 ${fP(e.range.mid)}, TP2 ${fP(e.range.bot)}`;
      default: return `Giá quay lại mức đã phá ${fP(e.level)} lần thứ ${e.test} và bị từ chối`;
    }
  }
  function lossWhy(x) {
    if (x.open) return "";
    if (x.R > 0) return x.why === "trail" ? "Cưỡi xu hướng tới khi cắt lỗ dời bị chạm" : x.why === "time" ? "Hết thời gian, đóng có lãi" : "";
    const r = [];
    if (x.why === "be") r.push("phí ăn mất phần lãi TP1");
    if (x.mfe < 0.3) r.push("giá đi ngược gần như ngay lập tức");
    else if (x.mfe >= 1) r.push(`đã lãi ${x.mfe.toFixed(1)}R rồi quay đầu`);
    if (x.vote < S.cmin) r.push(`ngược hội đồng (phe cùng hướng chỉ ${Math.round(x.vote)}%)`);
    if (!x.vol) r.push("không có khối lượng xác nhận");
    if (x.kind === "W2" || x.kind === "W4" || x.kind === "W5" || x.kind === "ABC") { if (x.ev.scenario === 3) r.push("kịch bản 3 xảy ra: đếm sóng sai"); else if (x.ev.scenario === 2) r.push("kịch bản 2: giá đi ngang"); }
    if (x.kind === "B0" || x.kind.startsWith("T")) r.push("mức phá vỡ không giữ được");
    return r.join("; ");
  }
  function renderLog() {
    const f = S.logf;
    const tabs = [["all", "Tất cả"], ["1", "①"], ["2", "②"], ["3", "③"], ["tf", "Khung " + S.tf]].concat(f.startsWith("m:") ? [[f, MS[f.slice(2)] + " " + S.tf]] : []);
    $("logf").innerHTML = tabs.map(([k, l]) => `<button class="tab ${k === f ? "on" : ""}" data-f="${k}">${esc(l)}</button>`).join("");
    if (!A) { $("log").innerHTML = ""; $("log-n").textContent = ""; return; }
    const tr = logTrades().slice().reverse(), shown = tr.slice(0, 400);
    $("log-n").textContent = `${tr.length} lệnh${tr.length > shown.length ? `, hiện ${shown.length} lệnh mới nhất` : ""}`;
    let h = `<tr><th>Giờ vào</th><th>Khung</th><th>Mô hình</th><th>Hướng</th><th>Phiếu</th><th>KL</th><th>Vào</th><th>SL</th><th>Ra</th><th>Kết quả</th><th>$</th><th>Vì sao vào · vì sao thắng/thua</th></tr>`;
    shown.forEach((x, k) => {
      const u = x.open ? null : sizeUsd(x), lw = lossWhy(x);
      h += `<tr data-k="${k}" class="${sel && sel.t === x.t && sel.tf === x.tf && sel.kind === x.kind ? "sel" : ""}" style="cursor:pointer"><td>${fTs(x.t)}</td><td>${x.tf}</td><td style="color:${GC[x.group]}">${MS[x.kind]}</td><td class="${x.dir === 1 ? "up" : "down"}">${x.dir === 1 ? "MUA" : "BÁN"}</td><td class="${x.agree ? "" : "dim"}">${Math.round(x.vote)}%</td><td>${x.vol ? "✓" : "<span class='dim'>·</span>"}</td><td>${fP(x.entry)}</td><td>${fP(x.sl)}</td><td>${x.open ? "<span class='amber'>đang mở</span>" : fP(x.exitPx)}</td><td class="${x.open ? "" : x.R > 0 ? "up" : "down"}">${x.open ? "" : fR(x.R) + ` <span class="dim small">${WHY[x.why]}</span>`}</td><td class="${u && u.usd > 0 ? "up" : "down"}">${u ? fUsd(u.usd) + (u.capped ? "*" : "") : ""}</td><td class="rs"><b>${esc(entryWhy(x))}</b>${lw ? "<br>" + esc(lw) : ""}</td></tr>`;
    });
    $("log").innerHTML = h;
    $("log").rows_ = shown;
  }
  $("logf").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.logf = b.dataset.f; save(); renderLog(); });
  $("log").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-k]"); if (!tr) return;
    const x = $("log").rows_[+tr.dataset.k]; sel = x;
    if (S.tf !== x.tf) { S.tf = x.tf; save(); fillControls(); renderElliott(); renderWyckoff(); renderBo(); renderRange(); }
    const n = A.res[x.tf].n, span = (x.open ? n - 1 : x.exitI) - x.i;
    view.n = Math.max(view.n, span + 40); view.end = Math.min(n - 1, (x.open ? n - 1 : x.exitI) + 15);
    drawChart(); renderLog(); cv.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // ---------- ranking from the server ----------
  function renderRank() {
    if (!SRV || !SRV.assets) { $("rank").innerHTML = '<tr><td class="dim">Máy chủ chưa có bảng xếp hạng. Bảng này xuất hiện sau lần chạy lịch kế tiếp.</td></tr>'; return; }
    $("rk-sub").textContent = `${SRV.assets.length} mã · máy chủ tính lúc ${fTs(SRV.generated)} · ${WL[S.win]} · chỉ lệnh thuận hội đồng`;
    const rows = SRV.assets.map((a) => ({ a, w: a.win[S.win] || { all: [0], best: [] } })).sort((p, q) => ((q.w.best[0] || [])[4] ?? -9) - ((p.w.best[0] || [])[4] ?? -9));
    let h = `<tr><th>Mã</th><th>Nhóm</th><th>Hội đồng</th><th>Mô hình tốt nhất</th><th>Khung</th><th>Lệnh</th><th>Thắng</th><th>R TB</th><th>Tổng R mọi mô hình</th><th>Tín hiệu mới</th></tr>`;
    for (const { a, w } of rows) {
      const b = w.best[0], up = a.council.up, dn = a.council.dn;
      const sig = a.signals.filter((s) => (s.dir === 1 ? up : dn) >= S.cmin).map((s) => `<span class="${s.dir === 1 ? "up" : "down"}">${MS[s.kind]} ${s.tf}</span>`).join(", ");
      h += `<tr data-s="${esc(a.symbol)}" style="cursor:pointer" class="${a.symbol === S.sym ? "sel" : ""}"><td><b>${esc(a.symbol)}</b></td><td class="dim">${CLS[a.cls] || a.cls}</td><td><span class="up">${Math.round(up)}%</span> / <span class="down">${Math.round(dn)}%</span></td><td>${b ? MS[b[0]] : "<span class='dim'>chưa đủ lệnh</span>"}</td><td>${b ? b[1] : ""}</td><td>${b ? b[2] : ""}</td><td>${b ? pct(b[3]) : ""}</td><td class="${b && b[4] > 0 ? "up" : "down"}">${b ? fR(b[4]) : ""}</td><td class="${w.all[3] > 0 ? "up" : "down"}">${w.all[0] ? fR(w.all[3]) : "–"}</td><td class="small">${sig || "<span class='dim'>–</span>"}</td></tr>`;
    }
    $("rank").innerHTML = h;
  }
  $("rank").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-s]"); if (!tr || !ASSETS.find((a) => a.symbol === tr.dataset.s)) return; S.sym = tr.dataset.s; save(); $("asset").value = S.sym; load(); confirmMsg(`đổi sang ${esc(S.sym)} từ bảng xếp hạng.`); window.scrollTo({ top: 0, behavior: "smooth" }); });

  // ---------- start ----------
  fillControls();
  (async () => {
    try {
      const j = await getJSON(`../data/latest.json?v=${ver()}`);
      if (j.market && j.market.length) ASSETS = j.market.map((m) => ({ symbol: m.symbol, cls: m.cls }));
    } catch (e) { /* fall back to the bar index */ }
    if (!ASSETS.length) try { const j = await getJSON(`../data/bars/index.json?v=${ver()}`); ASSETS = j.assets.map((a) => ({ symbol: a.symbol, cls: a.cls })); } catch (e) { /* nothing yet */ }
    fillAssets();
    getJSON(`../data/trad/index.json?v=${ver()}`).then((j) => { SRV = j; fillControls(); renderHeat(); renderRank(); }).catch(() => { renderRank(); });
    getJSON(`../data/trad/validate.json?v=${ver()}`).then((j) => { SRVV = j; renderVal(); }).catch(() => { renderVal(); });
    load();
  })();
  // new bars arrive with the server schedule: reload every 10 minutes while the page is visible
  setInterval(() => { if (!document.hidden && asset) { load(); getJSON(`../data/trad/index.json?v=${ver()}`).then((j) => { SRV = j; renderRank(); }).catch(() => {}); } }, 600000);
})();
