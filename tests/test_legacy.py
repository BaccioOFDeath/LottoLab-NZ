"""Guarded legacy archival source validation for 1987–2018."""
import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("legacy",ROOT/'scripts/import_legacy.py')
legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
def sample(n,date,nums,bonus,pb):
 return ('<html><body><h4>New Zealand Lotto '+str(n)+'</h4><p>Draw: '+str(n)+', Date: '+date+
 '</p>'+''.join('<p>'+str(x).zfill(2)+'</p>' for x in nums)+
 '<p>+</p><p>'+str(bonus).zfill(2)+'</p><p>'+str(pb).zfill(2)+
 '</p><p>03</p><p>02</p><h4>Next Draw</h4></body></html>')
class TestLegacy(unittest.TestCase):
 def test_1987_pre_powerball(self):
  row=legacy.parse(sample(1,'1987-08-01',[4,8,16,29,32,40],30,0),1,'https://app.nz-lotto.com/example')
  self.assertIsNotNone(row);self.assertIsNone(row['powerball'])
  self.assertEqual(row['numbers'],[4,8,16,29,32,40]);self.assertEqual(row['verification'],'one-source')
 def test_2002_powerball(self):
  row=legacy.parse(sample(760,'2002-01-26',[2,4,16,23,29,37],39,4),760,'https://app.nz-lotto.com/example')
  self.assertEqual(row['powerball'],4)
 def test_invalid_numbers_not_written(self):
  self.assertIsNone(legacy.parse(sample(1,'1987-08-01',[4,4,16,29,32,40],30,0),1,'https://app.nz-lotto.com/example'))
  self.assertIsNone(legacy.parse(sample(1,'1987-08-01',[4,8,16,29,32,40],4,0),1,'https://app.nz-lotto.com/example'))
  self.assertIsNone(legacy.parse(sample(1,'1987-08-01',[4,8,16,29,32,40],30,5),1,'https://app.nz-lotto.com/example'))
  self.assertIsNone(legacy.parse(sample(1,'1987-08-01',[4,8,16,29,32,40],30,0),2,'https://app.nz-lotto.com/example'))
if __name__=='__main__':unittest.main()
