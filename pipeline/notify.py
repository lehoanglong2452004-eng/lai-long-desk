"""Optional Telegram alerts. Silent unless TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set."""
import json
import os
import urllib.request


def _send(text):
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        return
    body = json.dumps({"chat_id": chat, "text": text, "parse_mode": "HTML",
                       "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=body,
                                 headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=20).read()
    except Exception as e:  # noqa: BLE001 - an alert failing must not fail the scan
        print("WARN telegram", e)


def _px(x):
    return f"{x:.6g}"


def telegram(new_a, closed, med):
    site = os.environ.get("SITE_URL", "")
    for e in new_a:
        arrow = "🟢 LONG" if e["dir"] == "long" else "🔴 SHORT"
        _send(f"<b>LAI LONG DESK · {e['grade']} {e['score']}</b>\n{arrow} <b>{e['symbol']}</b> ({e['cls']})\n"
              f"{e['setup']}\nEntry {_px(e['entry'])} · SL {_px(e['stop'])} · TP {_px(e['target'])} · R:R {e['rr']:.1f}\n"
              f"USD bias {med.get('bias', 0):+d}\n{site}")
    for e in closed:
        _send(f"LAI LONG DESK · closed {e['symbol']} {e['dir']} {e['setup']}: {e['status']} {e['r']:+.2f}R (after costs)")
