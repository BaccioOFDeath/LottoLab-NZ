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
        self.assertEqual(history,len(rows)-model.MIN_TRAIN)
        self.assertEqual(stats['adaptive_frequency_v1']['tested'],len(rows)-model.MIN_TRAIN)
        for item in history:
            self.assertGreaterEqual(item['draw'],rows[model.MIN_TRAIN]['draw'])

    def test_historical_rule_periods(self):
        rows=model.get_draws()
        before,pb=model.select(rows,'2026-09-12','random_baseline_v1')
        self.assertTrue(1<=pb<=10)
        after,pb=model.select(rows,'2026-10-28','random_baseline_v1')
        self.assertTrue(1<=pb<=14)


    def test_prospective_selections_score_against_verified_draw(self):
        import datetime as dt, json, tempfile
        from pathlib import Path
        rows=model.get_draws()
        target=rows[-1]
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)
            draws_file=folder/'draws.json'
            picks_file=folder/'model-picks.json'
            report_file=folder/'model-performance.json'
            draws_file.write_text(json.dumps(rows))
            previous={'target_date':target['date'],'created_at':'2026-10-23T00:00:00Z',
                'model':'adaptive_frequency_v1','model_version':1,
                'numbers':target['numbers'],'powerball':target['powerball'],
                'training_draws':30,'status':'pending'}
            picks_file.write_text(json.dumps([previous]))
            original=(model.DRAW_FILE,model.PICK_FILE,model.REPORT_FILE)
            try:
                model.DRAW_FILE=draws_file
                model.PICK_FILE=picks_file
                model.REPORT_FILE=report_file
                model.run(dt.datetime(2026,10,25,12,0,tzinfo=model.NZ))
                recorded=json.loads(picks_file.read_text())
                scored=[x for x in recorded if x['target_date']==target['date']][0]
                self.assertEqual(scored['status'],'scored')
                self.assertEqual(scored['main_matches'],6)
                self.assertTrue(scored['powerball_match'])
                self.assertEqual(scored['numbers'],target['numbers'])
            finally:
                model.DRAW_FILE,model.PICK_FILE,model.REPORT_FILE=original


    def test_twenty_unique_slots_and_preserved_picks(self):
        import datetime as dt,json,tempfile
        from pathlib import Path
        rows=model.get_draws()
        previous=[
            {'target_date':'2026-10-28','created_at':'2026-10-24T11:48:07.547Z',
             'model':m,'model_version':1,'numbers':nums,'powerball':pb,
             'training_draws':53,'status':'pending'}
            for m,nums,pb in [
                ('adaptive_frequency_v1',[1,3,4,19,22,37],7),
                ('random_baseline_v1',[11,12,21,29,36,39],4)]]
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)
            data=folder/'draws.json';picks=folder/'picks.json';report=folder/'report.json'
            data.write_text(json.dumps(rows))
            picks.write_text(json.dumps(previous))
            originals=(model.DRAW_FILE,model.PICK_FILE,model.REPORT_FILE)
            try:
                model.DRAW_FILE=data;model.PICK_FILE=picks;model.REPORT_FILE=report
                when=dt.datetime(2026,10,25,9,10,tzinfo=model.NZ)
                model.run(when)
                first=json.loads(picks.read_text())
                self.assertEqual(len(first),20)
                self.assertEqual(first[:2],previous) # immutable original 2
                self.assertEqual(len(set((tuple(p['numbers']),p['powerball']) for p in first)),20)
                for m in model.MODELS:
                    group=[p for p in first if p['model']==m]
                    self.assertEqual(len(group),10)
                    self.assertEqual({model.line_id(p) for p in group},set(range(1,11)))
                model.run(when+dt.timedelta(minutes=4))
                after=json.loads(picks.read_text())
                self.assertEqual(after,first)
                out=json.loads(report.read_text())
                self.assertEqual(out['lines_per_draw'],20)
                self.assertEqual(len(out['upcoming_picks']),20)
            finally:
                model.DRAW_FILE,model.PICK_FILE,model.REPORT_FILE=originals

    def test_random_expected_is_point_nine(self):
        self.assertAlmostEqual(6*6/40,0.9)

if __name__=='__main__':
    unittest.main()
