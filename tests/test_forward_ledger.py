import unittest
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from forward_ledger import update

class ForwardLedgerTests(unittest.TestCase):
 def test_keno_snapshots_locked_and_scored(self):
  tickets={"slots":[{"draw":"77","date":"2026-10-25","created_at":"2026-10-24T10:00:00+00:00","eligible_from":"2026-10-25T13:00:00+13:00","models":[{"id":"m","numbers":list(range(1,11))}]}]}
  rows=[{"draw":77,"date":"2026-10-25","numbers":list(range(1,21))}]
  first=update("keno",rows,tickets)
  self.assertEqual(first["counts"]["verified_scored"],1)
  self.assertEqual(first["snapshots"][0]["matches"],10)
  tickets["slots"][0]["models"][0]["numbers"]=list(range(11,21))
  second=update("keno",rows,tickets,first)
  self.assertEqual(second["snapshots"][0]["matches"],10)
  self.assertEqual(len(second["conflicts"]),1)
 def test_lotto_matches_by_date_when_draw_id_absent(self):
  p=[{"target_date":"2026-10-28","created_at":"2026-10-25T10:00:00Z","model":"random_baseline_v1","line_number":1,"numbers":[1,2,3,4,5,6],"powerball":3}]
  r=[{"draw":2633,"date":"2026-10-28","numbers":[1,2,3,4,10,11]}]
  result=update("lotto",r,p)
  self.assertEqual(result["counts"]["verified_scored"],1)
  self.assertEqual(result["snapshots"][0]["matches"],4)
 def test_unverified_publication_not_promoted(self):
  p=[{"target_date":"2026-10-28","created_at":"missing","model":"a","numbers":[1,2,3,4,5,6]}]
  r=[{"draw":2633,"date":"2026-10-28","numbers":[1,2,3,4,5,6]}]
  result=update("lotto",r,p)
  self.assertEqual(result["counts"]["verified_scored"],0)
  self.assertEqual(result["counts"]["without_publication_evidence"],1)
if __name__=="__main__":unittest.main()
