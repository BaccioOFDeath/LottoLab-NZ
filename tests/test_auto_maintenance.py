"""Automatic maintenance guards: NZ draw time, publication grace, immutable sets."""
import datetime as dt
import importlib.util
import json
import unittest
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("freshness", ROOT / "scripts/check_site_freshness.py")
health = importlib.util.module_from_spec(spec)
spec.loader.exec_module(health)
spec2 = importlib.util.spec_from_file_location("engine", ROOT / "scripts/model_engine.py")
engine = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(engine)
NZ = ZoneInfo("Pacific/Auckland")


class AutoMaintenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.draws = json.loads((ROOT / "data/draws.json").read_text())
        cls.picks = json.loads((ROOT / "data/model-picks.json").read_text())
        cls.performance = json.loads((ROOT / "data/model-performance.json").read_text())

    def test_model_keeps_current_draw_visible_until_nz_evening(self):
        self.assertEqual(engine.next_display_draw(dt.datetime(2026, 10, 28, 8, 0, tzinfo=NZ)), "2026-10-28")
        self.assertEqual(engine.next_display_draw(dt.datetime(2026, 10, 28, 20, 19, tzinfo=NZ)), "2026-10-28")
        self.assertEqual(engine.next_display_draw(dt.datetime(2026, 10, 28, 20, 21, tzinfo=NZ)), "2026-10-31")
        self.assertEqual(engine.next_display_draw(dt.datetime(2026, 10, 30, 8, 0, tzinfo=NZ)), "2026-10-31")

    def test_draw_freshness_grace_respects_weekends(self):
        early = dt.datetime(2026, 10, 25, 9, 0, tzinfo=NZ)
        late = dt.datetime(2026, 10, 25, 16, 0, tzinfo=NZ)
        self.assertEqual(health.draw_due(early), dt.date(2026, 10, 21))
        self.assertEqual(health.draw_due(late), dt.date(2026, 10, 24))

    def test_current_archives_and_picks_pass_watchdog(self):
        now = dt.datetime(2026, 10, 25, 20, 30, tzinfo=NZ)
        result = health.assess(now, self.draws, self.picks, self.performance)
        self.assertEqual(result["status"], "ok", result["problems"])
        self.assertEqual(result["upcoming_lines"], 20)
        self.assertEqual(result["upcoming_draw"], "2026-10-28")

    def test_missing_verified_draw_alerts_instead_of_claiming_latest(self):
        now = dt.datetime(2026, 10, 25, 20, 30, tzinfo=NZ)
        old = [d for d in self.draws if d["date"] < "2026-10-24"]
        result = health.assess(now, old, self.picks, self.performance)
        self.assertEqual(result["status"], "alert")
        self.assertTrue(any("stale" in problem for problem in result["problems"]))

    def test_incomplete_predictions_alert(self):
        now = dt.datetime(2026, 10, 25, 20, 30, tzinfo=NZ)
        incomplete = [p for p in self.picks if p.get("target_date") != "2026-10-28"] + [
            p for p in self.picks if p.get("target_date") == "2026-10-28"
        ][:19]
        result = health.assess(now, self.draws, incomplete, self.performance)
        self.assertEqual(result["status"], "alert")
        self.assertTrue(any("19/20" in problem for problem in result["problems"]))


if __name__ == "__main__":
    unittest.main()
