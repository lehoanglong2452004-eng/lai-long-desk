"use strict";
// Paper trading journal panel, shared by the Traditional and MIDOTI pages.
// PAPER.mount(element, "TRAD" | "MIDOTI", { base: "../", symbol: () => "BTC", risk: () => [capital, riskPct] })
(() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fR = (x) => (x == null || !isFinite(x) ? "–" : (x >= 0 ? "+" : "") + x.toFixed(2) + "R");
  const pct = (x) => (x == null || !isFinite(x) ? "–" : Math.round(x * 100) + "%");
  const fP = (x) => { if (x == null || !isFinite(x)) return "–"; const a = Math.abs(x); return x.toFixed(a >= 1000 ? 1 : a >= 10 ? 2 : a >= 1 ? 4 : 5); };
  const fT = (t) => new Date((t + 7 * 3600) * 1000).toISOString().slice(5, 16).replace("T", " ");
  const late = (s) => (s < 3600 ? Math.round(s / 60) + " phút" : s < 86400 ? (s / 3600).toFixed(1).replace(".0", "") + " giờ" : (s / 86400).toFixed(1).replace(".0", "") + " ngày");
  const KIND = { W2: "Sóng 2→3", W4: "Sóng 4→5", W5: "Sóng 5→ABC", ABC: "ABC→xu hướng", SPRING: "Spring", UPTHRUST: "Upthrust", DARVAS: "Darvas", B0: "Phá vỡ", T1: "Test 1", T2: "Test 2", T3: "Test 3", T4: "Test 4", FAIL: "Phá vỡ giả", R_LONG: "Mua đáy biên", R_SHORT: "Bán đỉnh biên", "◆": "◆ đủ khối lượng", "◇": "◇ thiếu khối lượng" };
  const ST = { pending: ["chờ khớp", "amber"], open: ["đang mở", "amber"], closed: ["đã đóng", ""], gone: ["biến mất", "down"] };
  const WHY = { sl: "chạm cắt lỗ", be: "TP1 rồi hòa vốn", tp: "chạm mục tiêu", trail: "dời SL bị chạm", time: "hết giờ giữ lệnh",
    SL: "chạm cắt lỗ", SL_MOVED: "chạm SL đã dời", SL_AFTER_TP1: "TP1 rồi chạm SL đã dời", TP1: "chốt ở TP1", TP2: "chạm TP2", TIME: "hết thời gian", EOD: "đóng cuối ngày", OPP: "◆ ngược chiều", OPVWAP: "mất OP và VWAP" };
  const css = `.pp-k{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:6px 0 10px}
.pp-k div{border:1px solid var(--line);border-radius:4px;padding:6px 8px;font-size:11px;color:var(--dim);white-space:normal}
.pp-k b{display:block;font-size:17px;color:var(--text);margin-top:2px}.pp-k b.up{color:var(--green)}.pp-k b.down{color:var(--red)}
.pp-k small{display:block;margin-top:2px}
.pp-cv{width:100%;height:200px;display:block}.pp-note{font-size:12px;white-space:normal;margin:4px 0}
.pp-f{display:flex;gap:4px;margin:6px 0}.pp-f button{font:inherit;font-size:11px;background:none;border:1px solid var(--line);color:var(--dim);border-radius:3px;padding:2px 8px;cursor:pointer}
.pp-f button.on{background:var(--amber);color:#000;border-color:var(--amber)}
@media (max-width:1100px){.pp-k{grid-template-columns:repeat(3,minmax(0,1fr))}}@media (max-width:720px){.pp-k{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  let styled = false;

  function mount(el, sys, opt) {
    if (!styled) { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); styled = true; }
    const st = { data: null, scope: "all" };
    el.innerHTML = `<p class="pp-note dim" data-r="intro">Đang tải sổ giao dịch giấy…</p><div class="pp-k" data-r="k"></div><p class="pp-note" data-r="v"></p>
      <canvas class="pp-cv" data-r="cv"></canvas><div class="legend" data-r="lg"></div>
      <div class="pp-f" data-r="f"><button data-s="all" class="on">Mọi mã</button><button data-s="one">Chỉ mã đang chọn</button></div>
      <div class="scroll tall"><table data-r="t"></table></div>`;
    const q = (r) => el.querySelector(`[data-r="${r}"]`);
    q("f").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; st.scope = b.dataset.s; q("f").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); table(); });
    window.addEventListener("resize", () => draw());

    function load() {
      fetch(`${opt.base}data/paper/summary.json?v=${Math.floor(Date.now() / 300000)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null)).then((j) => { st.data = j; render(); }).catch(() => { st.data = null; render(); });
    }
    function render() {
      const d = st.data && st.data.sys && st.data.sys[sys];
      if (!d) { q("intro").textContent = "Sổ giao dịch giấy chưa có dữ liệu. Máy chủ bắt đầu ghi từ lần quét kế tiếp."; return; }
      const a = d.all, [cap, risk] = opt.risk ? opt.risk() : [10000, 2.5];
      q("intro").innerHTML = `Bắt đầu ghi từ <b>${fT(st.data.started)}</b> (GMT+7), cập nhật lần cuối ${fT(st.data.generated)}. Mỗi lần máy chủ quét, tín hiệu mới được <b>ghi lại trước khi biết kết quả</b>, rồi tự chấm khi giá chạy. Không ai sửa được sau đó, nên đây là bằng chứng thật, không phải backtest. ${sys === "TRAD" ? "Chỉ ghi lệnh thuận hội đồng, khung 15 phút trở lên." : "Bộ điều kiện mặc định v1.568, khung 15 phút, 30 phút và 1 giờ."}`;
      const k = (l, v, c, s) => `<div>${l}<b class="${c || ""}">${v}</b>${s ? `<small>${s}</small>` : ""}</div>`;
      q("k").innerHTML = k("Tín hiệu đã ghi", a.signals, "", `${d.skipped} tín hiệu không thành lệnh`) + k("Đã đóng", a.closed, "", `${a.open} đang mở · ${a.pending} chờ khớp`)
        + k("Tỷ lệ thắng", pct(a.win)) + k("R trung bình", fR(a.avgR), a.avgR > 0 ? "up" : a.avgR < 0 ? "down" : "")
        + k("Tổng", fR(a.totalR), a.totalR > 0 ? "up" : a.totalR < 0 ? "down" : "", `≈ ${a.totalR < 0 ? "-" : "+"}$${Math.round(Math.abs(a.totalR * cap * risk / 100)).toLocaleString("en-US")} với rủi ro ${risk}% của $${(+cap).toLocaleString("en-US")}`)
        + k("Biến mất", a.gone, a.gone ? "down" : "", "tín hiệu tự xóa khi dữ liệu cập nhật (vẽ lại)");
      const s = d.star;
      q("v").innerHTML = a.closed < 30 ? `<span class="amber">Mới có ${a.closed} lệnh đóng: dưới 30 lệnh thì tỷ lệ thắng chưa nói lên điều gì, cần chờ thêm.</span>`
        : `Sau ${a.closed} lệnh thật: ${a.avgR > 0 ? '<b class="up">đang có lời</b>' : '<b class="down">đang lỗ</b>'} ${fR(a.avgR)} mỗi lệnh.${s && s.closed ? ` Riêng ô ★ (vượt kiểm định lúc ghi): ${s.closed} lệnh, ${fR(s.avgR)} mỗi lệnh.` : ""}`;
      draw(); table();
    }
    function draw() {
      const c = q("cv"), x = c.getContext("2d"), dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      x.font = "11px JetBrains Mono, monospace";
      const d = st.data && st.data.sys && st.data.sys[sys];
      if (!d) return;
      const lines = [[d.curve, "#ffb000", "mọi lệnh"]].concat(d.curveStar && d.curveStar.length ? [[d.curveStar, "#22c55e", "chỉ ô ★"]] : []);
      q("lg").innerHTML = lines.map(([, c2, l]) => `<span><i style="background:${c2}"></i>${l}</span>`).join("") + '<span class="dim">R cộng dồn của các lệnh đã đóng, theo thời gian đóng</span>';
      if (!d.curve.length) { x.fillStyle = "#6b7785"; x.fillText("Chưa có lệnh nào đóng.", 8, 20); return; }
      const t0 = Math.min(...lines.map(([c2]) => (c2.length ? c2[0][0] : Infinity))), t1 = Math.max(st.data.generated, ...lines.map(([c2]) => (c2.length ? c2[c2.length - 1][0] : 0)));
      let lo = 0, hi = 0;
      for (const [c2] of lines) for (const [, v] of c2) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
      const L = 8, R = 56, top = 8, bot = H - 18, X = (t) => L + (t - t0) / (t1 - t0 || 1) * (W - L - R), Y = (v) => top + (hi - v) / (hi - lo) * (bot - top);
      x.strokeStyle = "#141a22"; x.fillStyle = "#6b7785";
      for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3; x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(W - R, Y(v)); x.stroke(); x.fillText(v.toFixed(1) + "R", W - R + 4, Y(v) + 4); }
      x.strokeStyle = "#39424f"; x.beginPath(); x.moveTo(L, Y(0)); x.lineTo(W - R, Y(0)); x.stroke();
      x.fillText(fT(t0).slice(0, 5), L, H - 4); x.fillText(fT(t1).slice(0, 5), W - R - 36, H - 4);
      for (const [c2, col] of lines) {
        x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(X(c2[0][0]), Y(0));
        c2.forEach(([t, v], i) => { if (i) x.lineTo(X(t), Y(c2[i - 1][1])); x.lineTo(X(t), Y(v)); });
        x.stroke(); x.lineWidth = 1;
      }
    }
    function table() {
      const d = st.data && st.data.sys && st.data.sys[sys];
      if (!d) { q("t").innerHTML = ""; return; }
      const sym = opt.symbol ? opt.symbol() : null;
      const rows = d.recent.filter((e) => st.scope === "all" || e.sym === sym).slice(0, 200);
      let h = `<tr><th>Tín hiệu</th><th>Ghi sau</th><th>Mã</th><th>Khung</th><th>Mô hình</th><th>Hướng</th>${sys === "TRAD" ? "<th>Phiếu</th><th>★</th>" : ""}<th>Vào</th><th>SL</th><th>Trạng thái</th><th>Kết quả</th></tr>`;
      if (!rows.length) h += `<tr><td colspan="12" class="dim">Chưa có tín hiệu nào được ghi${st.scope === "one" ? " cho mã này" : ""}.</td></tr>`;
      for (const e of rows) {
        const s = ST[e.status] || [e.status, ""];
        h += `<tr><td>${fT(e.sigClose)}</td><td class="dim">${late(e.late)}</td><td><b>${esc(e.sym)}</b></td><td>${esc(e.tf)}</td><td>${esc(KIND[e.kind] || e.kind)}</td><td class="${e.dir === 1 ? "up" : "down"}">${e.dir === 1 ? "MUA" : "BÁN"}</td>${sys === "TRAD" ? `<td>${e.vote != null ? Math.round(e.vote) + "%" : ""}</td><td>${e.star ? "★" : ""}</td>` : ""}<td>${fP(e.entry ?? e.price)}</td><td>${fP(e.sl)}</td><td class="${s[1]}">${s[0]}</td><td class="${e.R > 0 ? "up" : e.R < 0 ? "down" : ""}">${e.status === "closed" ? `${fR(e.R)} <span class="dim small">${esc(WHY[e.why] || e.why || "")}</span>` : ""}</td></tr>`;
      }
      q("t").innerHTML = h;
    }
    load();
    setInterval(() => { if (!document.hidden) load(); }, 600000);
    return { refresh: () => { render(); } };
  }
  window.PAPER = { mount };
})();
