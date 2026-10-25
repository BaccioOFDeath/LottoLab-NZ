import datetime as dt
import unittest
from scripts.update_keno import normalize, parse_day, build_models

class KenoTests(unittest.TestCase):
    def test_verified_day_parser(self):
        url = "https://www.lottodraw.co.nz/keno/results-october-25-2026"
        numbers = "".join("<li>%s</li>" % n for n in range(1,21))
        page = "<main><article><h2>1:00 pm draw</h2><p>Draw 27909</p><p>Multiplier</p>×1.5<ol>%s</ol></article></main>" % numbers
        parsed = parse_day(page, url)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["date"], "2026-10-25")
        self.assertEqual(parsed[0]["draw"], "27909")
        self.assertEqual(parsed[0]["numbers"], list(range(1,21)))
        self.assertEqual(parsed[0]["multiplier"], 1.5)
    def test_rejects_invalid_numbers(self):
        self.assertIsNone(normalize({"date":"2026-10-26","draw":"1","numbers":[1]*20}))
    def test_models_are_valid_and_deterministic(self):
        draws = []
        base = dt.date(2026, 10, 1)
        for i in range(80):
            numbers = sorted({((i*7+j*13)%80)+1 for j in range(20)})
            self.assertEqual(len(numbers),20)
            draws.append({"date":(base+dt.timedelta(days=i//4)).isoformat(),"draw":str(27000+i),"numbers":numbers})
        a = build_models(draws, dt.date(2026, 11, 2))
        b = build_models(draws, dt.date(2026, 11, 2))
        self.assertEqual(a,b)
        self.assertEqual(len(a),6)
        for model in a:
            self.assertEqual(len(model["numbers"]),10)
            self.assertEqual(len(set(model["numbers"])),10)
            self.assertTrue(all(1<=n<=80 for n in model["numbers"]))

if __name__ == "__main__":
    unittest.main()
