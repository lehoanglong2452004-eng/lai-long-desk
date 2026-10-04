import datetime as dt
import json
import os
import tempfile
import time
import unittest

from pipeline import news_desk

RSS = """<?xml version="1.0"?><rss><channel>
<item><title>Fed holds rates as inflation cools</title><link>https://example.com/a</link>
<pubDate>{now}</pubDate></item>
<item><title>Old story</title><link>https://example.com/b</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item>
</channel></rss>"""
ATOM = """<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Bitcoin jumps</title>
<link href="https://example.com/c"/><updated>{iso}</updated></entry></feed>"""


class NewsDeskTests(unittest.TestCase):
    def test_rss_and_atom(self):
        now = dt.datetime.now(dt.timezone.utc)
        rss = news_desk.parse_feed("CNBC", RSS.format(now=now.strftime("%a, %d %b %Y %H:%M:%S GMT")))
        self.assertEqual(rss[0]["topics"][:1], ["macro"])
        atom = news_desk.parse_feed("CoinDesk", ATOM.format(iso=now.isoformat()))
        self.assertEqual(atom[0]["link"], "https://example.com/c")
        self.assertIn("crypto", atom[0]["topics"])

    def test_old_news_dropped(self):
        now = dt.datetime.now(dt.timezone.utc)
        orig = news_desk._get
        news_desk._get = lambda url, **k: RSS.format(now=now.strftime("%a, %d %b %Y %H:%M:%S GMT"))
        try:
            items = news_desk.news(int(time.time() * 1000))
        finally:
            news_desk._get = orig
        self.assertEqual([n["title"] for n in items], ["Fed holds rates as inflation cools"])  # deduped, old one gone

    def test_futures_curve_picks_active_contract(self):
        vols = {}
        def fake(sym):
            v = vols.setdefault(sym, 1000 - 100 * len(vols))
            return {"price": 100 + len(vols), "changePct": 0.1, "volume": v}
        orig = news_desk.yahoo_quote
        news_desk.yahoo_quote = fake
        news_desk.PAUSE = 0
        try:
            out = news_desk.futures_curves(dt.datetime(2026, 10, 4, tzinfo=dt.timezone.utc))
        finally:
            news_desk.yahoo_quote = orig
        cl = next(f for f in out if f["root"] == "CL")
        self.assertEqual(cl["contracts"][0]["symbol"], "CLV26.NYM")
        self.assertEqual(len(cl["contracts"]), 3)
        self.assertEqual(cl["structure"], "contango")
        gc = next(f for f in out if f["root"] == "GC")
        self.assertEqual(gc["contracts"][0]["symbol"], "GCV26.CMX")


if __name__ == "__main__":
    unittest.main()
