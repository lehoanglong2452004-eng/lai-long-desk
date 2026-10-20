import datetime as dt
import unittest

from pipeline import calendar_desk as c

FED = """<h4><a id="1">2027 FOMC Meetings</a></h4></div>
<div class="row fomc-meeting"><div class="fomc-meeting__month col-xs-5"><strong>January</strong></div>
<div class="fomc-meeting__date col-xs-4">26-27</div></div>
<div class="row fomc-meeting"><div class="fomc-meeting__month col-xs-5"><strong>Apr/May</strong></div>
<div class="fomc-meeting__date col-xs-4">30-1*</div></div>
<div class="row fomc-meeting"><div class="fomc-meeting__month col-xs-5"><strong>August</strong></div>
<div class="fomc-meeting__date col-xs-4">16 (notation vote)</div></div>"""

WASDE = "<p>In 2027 the WASDE report will be released on Jan. 12, Feb. 10, Mar. 10, and Dec. 10.</p><h3>October 2026 WASDE Report</h3>"

BEA = """<a href="/news/schedule/2025">2025</a><a href="/news/schedule/2027">2027</a>
<tr><td class="scheduled-date"><div class="release-date">October 29</div>
<small class="text-muted">8:30 AM</small></td><td></td>
<td class="release-title views-field">GDP (Advance Estimate), 3rd Quarter 2026 </td></tr>
<tr><td class="scheduled-date"><div class="release-date">October 29</div>
<small class="text-muted">8:30 AM</small></td><td></td>
<td class="release-title views-field">Personal Income and Outlays, September 2026 </td></tr>"""

CENSUS = """<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>January 15, 2027</td><td>8:30 AM</td>
<td>December 2026</td><td>A202701150830</td><td>A202612</td></tr>
<tr><td>Monthly Wholesale Trade: Sales and Inventories</td><td>January 8, 2027</td><td>10:00 AM</td>
<td>November 2026</td><td>A202701081000</td><td>A202611</td></tr>"""


class CalendarParsers(unittest.TestCase):
    def test_fomc_decision_day_and_month_span(self):
        ev = c.parse_fomc(FED)
        self.assertEqual([e["date"] for e in ev], ["2027-01-27", "2027-05-01"])
        self.assertIn("SEP", ev[1]["label"])

    def test_wasde(self):
        self.assertEqual([e["date"] for e in c.parse_wasde(WASDE)], ["2027-01-12", "2027-02-10", "2027-03-10", "2027-12-10"])

    def test_bea(self):
        y = c.bea_year(BEA, dt.date(2026, 10, 20))
        self.assertEqual(y, 2026)
        ev = c.parse_bea(BEA, y)
        self.assertEqual([(e["k"], e["date"], e["time"], e["label"]) for e in ev],
                         [("gdp", "2026-10-29", "08:30", "bản sơ bộ Q3"), ("pce", "2026-10-29", "08:30", "số T9")])

    def test_census_only_tracked_releases(self):
        ev = c.parse_census(CENSUS)
        self.assertEqual([(e["k"], e["date"], e["time"], e["label"]) for e in ev], [("retail", "2027-01-15", "08:30", "số T12")])

    def test_merge_keeps_last_good_source(self):
        old = {"sources": {"fed": {"events": [{"k": "fomc", "date": "2026-12-09", "time": "14:00", "label": ""}], "updated": 1}}}
        now = int(dt.datetime(2026, 10, 20, tzinfo=dt.timezone.utc).timestamp() * 1000)
        out = c.merge(old, {"fed": None, "usda": [{"k": "wasde", "date": "2026-11-10", "time": "12:00", "label": ""}]}, now)
        self.assertEqual([e["k"] for e in out["events"]], ["wasde", "fomc"])


if __name__ == "__main__":
    unittest.main()
