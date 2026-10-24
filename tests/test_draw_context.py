"""Sourced rule-change manifest checks: no invented machine or operator labels."""
import datetime as dt,json,unittest
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
class DrawContextTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.events=json.loads((BASE/'data/draw-context.json').read_text())
  cls.rows=json.loads((BASE/'data/draws.json').read_text())
 def test_events_have_provenance(self):
  for event in self.events['events']:
   with self.subTest(event=event['id']):
    dt.date.fromisoformat(event['date'])
    self.assertTrue(event['source'].startswith('https://'))
    self.assertIs(type(event['affects_main_odds']),bool)
    self.assertIs(type(event['affects_powerball_odds']),bool)
 def test_no_invented_equipment_identity(self):
  ids={str(r['draw']) for r in self.rows}
  for draw,meta in self.events['by_draw'].items():
   self.assertIn(draw,ids)
   if meta.get('machine_id') or meta.get('ball_set_id') or meta.get('operator_id'):
    self.assertTrue(meta.get('source','').startswith('https://'))
 def test_2026_powerball_change_is_recorded(self):
  events={e['id']:e for e in self.events['events']}
  pb=events['powerball-14']
  self.assertEqual(pb['date'],'2026-09-16')
  self.assertTrue(pb['affects_powerball_odds'])
  self.assertFalse(pb['affects_main_odds'])
 def test_main_game_stays_six_of_forty(self):
  for d in self.rows:
   self.assertEqual(len(d['numbers']),6)
   self.assertTrue(all(1<=n<=40 for n in d['numbers']))
if __name__=='__main__':unittest.main()
