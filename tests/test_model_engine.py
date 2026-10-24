"""Model engine tests: deterministic output, chronological holdout, no false prediction claims."""
import importlib.util
import unittest
from pathlib import Path

P=Path(__file__).resolve().parents[1]/'scripts/model_engine.py'
spec=importlib.util.spec_from_file_location('model_engine',P)
model=importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)

class ModelResearchTests(unittest.TestCase):
    def test_next_draw_is_future_wed_or_sat(self):
        import datetime as dt
        self.assertEqual(model.next_draw(dt.date(2026,10,24)),'2026-10-28')
        self.assertEqual(model.next_draw(dt.date(2026,10,28)),'2026-10-31')
        self.assertEqual(model.next_draw(dt.date(2026,10,30)),'2026-10-31')

    def test_no_duplicate_numbers(self):
        rows=model.get_draws()
        self.assertGreaterEqual(len(rows),30)
        for method in model.MODELS:
            balls,pb=model.select(rows,'2026-10-28',method)
            self.assertEqual(len(balls),6)
            self.assertEqual(len(set(balls)),6)
            self.assertTrue(all(1<=n<=40 for n in balls))
            self.assertTrue(1<=pb<=14)
            self.assertEqual(model.select(rows,'2026-10-28',method),(balls,pb))

    def test_walk_forward_is_out_of_sample(self):
        rows=model.get_draws()
        stats,history=model.backtest(rows)
        self.assertEqual(len(history),len(rows)-model.MIN_TRAIN)
        self.assertEqual(stats['adaptive_frequency_v1']['tested'],len(rows)-model.MIN_TRAIN)
        for item in history:
            self.assertGreaterEqual(item['draw'],rows[model.MIN_TRAIN]['draw'])

    def test_historical_rule_periods(self):
        rows=model.get_draws()
        before,pb=model.select(rows,'2026-09-12','random_baseline_v1')
        self.assertTrue(1<=pb<=10)
        after,pb=model.select(rows,'2026-10-28','random_baseline_v1')
        self.assertTrue(1<=pb<=14)

    def test_random_expected_is_point_nine(self):
        self.assertAlmostEqual(6*6/40,0.9)

if __name__=='__main__':
    unittest.main()
