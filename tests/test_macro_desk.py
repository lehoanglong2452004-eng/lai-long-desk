# © 2026 Lailong Macro. Bảo lưu mọi quyền.
import datetime as dt
import unittest

from pipeline import macro_desk as m

EIA_HTML = """<table><tr><td class='B6'>&nbsp;&nbsp;2023-Dec&nbsp;</td><td class='B5'>12/01&nbsp;</td><td class='B3'>445,000</td>
<td class='B5'>12/08&nbsp;</td><td class='B3'>440,000</td><td class='B5'>12/29&nbsp;</td><td class='B3'>431,100</td></tr>
<tr><td class='B6'>&nbsp;&nbsp;2024-Jan&nbsp;</td><td class='B5'>01/05&nbsp;</td><td class='B3'>1,234</td>
<td class='B5'>&nbsp;</td><td class='B3'>&nbsp;</td></tr></table>"""


class MacroDeskTests(unittest.TestCase):
    def test_parse_eia_weekly(self):
        rows = m.parse_eia_weekly(EIA_HTML)
        self.assertEqual(rows[0], (dt.date(2023, 12, 1), 445000.0))
        self.assertEqual(rows[-1], (dt.date(2024, 1, 5), 1234.0))
        self.assertEqual(len(rows), 4)

    def test_yoy_and_mom(self):
        rows = [(dt.date(2020, 1, 1) + dt.timedelta(days=31 * i), 100 + i) for i in range(24)]
        yoy = m.transform(rows, "yoy")
        self.assertEqual(len(yoy), 12)
        self.assertAlmostEqual(yoy[0][1], 12.0)
        self.assertEqual(m.transform(rows, "mom")[0][1], 1)

    def test_pack_daily_is_weekly_with_exact_last(self):
        start = dt.date(2024, 1, 1)
        rows = [(start + dt.timedelta(days=i), float(i)) for i in range(60)]
        p = m.pack("x", "%", "test", rows)
        self.assertEqual(p["freq"], "d")
        self.assertLessEqual(len(p["d"]), 10)
        self.assertEqual(p["d"][-1][1], 59.0)
        self.assertEqual(p["st"]["pct"], 100)
        self.assertEqual(p["st"]["w"], 54.0)

    def test_seasonal_band(self):
        rows = []
        d = dt.date(2018, 1, 5)
        while d < dt.date(2024, 6, 1):
            rows.append((d, 100.0 + d.year))
            d += dt.timedelta(days=7)
        s = m.seasonal(rows)
        self.assertEqual(s["range"], "2019-2023")
        wk = s["band"][9]
        self.assertEqual((wk[1], wk[3]), (2119.0, 2123.0))
        self.assertGreater(s["vs5y_pct"], 0)


if __name__ == "__main__":
    unittest.main()
