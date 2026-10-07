"""System status: merge what each desk fetched this hour into site/data/health.json.

Keeps a short history per source so the status page can say "failing for 3 runs in a row".
Run last in the hourly scan, even when an earlier step failed:
    python -m pipeline.health
"""
import json
import time

from .run import DATA, load_json

DESKS = ("scan", "global", "factory", "news")
HISTORY = 48  # hourly runs kept per source (two days)


def status(c):
    if not c["fail"]:
        return "ok"
    return "partial" if c["ok"] else "down"


def main():
    now = int(time.time())
    old = load_json(DATA / "health.json", {})
    old_src = {s["key"]: s for s in old.get("sources", [])}
    desks, merged = [], {}
    for d in DESKS:
        r = load_json(DATA / "health" / f"{d}.json", None)
        if not r:
            desks.append({"desk": d, "t": None, "state": "missing"})
            continue
        # a report older than this run means the desk did not finish this time
        fresh = now - r["t"] < 3 * 3600
        desks.append({"desk": d, "t": r["t"], "errors": r.get("errors", 0), "crashed": r.get("crashed"),
                      "state": "crashed" if r.get("crashed") else "ok" if fresh else "stale"})
        if not fresh:
            continue
        for k, c in r.get("sources", {}).items():
            m = merged.setdefault(k, {"ok": 0, "fail": 0, "error": None, "what": None, "desks": []})
            m["ok"] += c["ok"]
            m["fail"] += c["fail"]
            if c.get("error"):
                m["error"], m["what"] = c["error"], c.get("what")
            m["desks"].append(d)
    sources = []
    for k in sorted(set(merged) | set(old_src)):
        prev = old_src.get(k, {})
        hist = prev.get("history", [])
        if k in merged:
            m = merged[k]
            st = status(m)
            hist = (hist + [[now, st]])[-HISTORY:]
            row = {"key": k, "status": st, "ok": m["ok"], "fail": m["fail"], "desks": m["desks"],
                   "error": m["error"], "what": m["what"], "last_ok": now if m["ok"] else prev.get("last_ok"),
                   "last_error_t": now if m["fail"] else prev.get("last_error_t"),
                   "last_error": m["error"] or prev.get("last_error")}
        else:  # not called this run (a desk was skipped): keep the last known state
            row = dict(prev, status=prev.get("status", "unknown"), stale=True)
        row["fails_in_row"] = 0
        for _, s in reversed(hist):
            if s == "ok":
                break
            row["fails_in_row"] += 1
        row["history"] = hist
        sources.append(row)
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "health.json").write_text(json.dumps({"generated": now, "desks": desks, "sources": sources}, separators=(",", ":")))
    bad = [s["key"] for s in sources if s["status"] != "ok"]
    print(f"health: desks={[(d['desk'], d['state']) for d in desks]} sources={len(sources)} not ok={bad}")


if __name__ == "__main__":
    main()
