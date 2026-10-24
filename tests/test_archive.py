"""Data quality checks for LottoLab NZ. Run: python -m unittest discover -s tests."""
import json,unittest,datetime as dt
from pathlib import Path
class ArchiveTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rows=json.loads(Path('data/draws.json').read_text())
 def test_unique_draw_ids(self):
  ids=[r['draw'] for r in self.rows];self.assertEqual(len(ids),len(set(ids)))
 def test_valid_balls(self):
  for r in self.rows:
   with self.subTest(draw=r['draw']):
    nums=r['numbers']
    self.assertEqual(len(nums),6)
    self.assertEqual(len(set(nums)),6)
    self.assertTrue(all(type(n)==int and 1<=n<=40 for n in nums))
    self.assertTrue(type(r['bonus'])==int and 1<=r['bonus']<=40 and r['bonus'] not in nums)
    date=dt.date.fromisoformat(r['date'])
    self.assertLessEqual(date,dt.datetime.now(dt.timezone(dt.timedelta(hours=13))).date())
    self.assertIn(date.weekday(),(2,5))
    max_power=14 if date>=dt.date(2026,9,16) else 10
    self.assertTrue(type(r['powerball'])==int and 1<=r['powerball']<=max_power)
 def test_source_provenance(self):
  for r in self.rows:
   self.assertIn(r.get('verification','unverified'),('unverified','one-source','two-source'))
   if r.get('verification') in ('one-source','two-source'):
    urls=r.get('sources',[])
    self.assertGreaterEqual(len(set(urls)),2 if r['verification']=='two-source' else 1)
    self.assertTrue(all(u.startswith('https://') for u in urls))
 def test_ordering(self):
  self.assertEqual([r['draw'] for r in self.rows],sorted([r['draw'] for r in self.rows],reverse=True))
if __name__=='__main__':unittest.main()
