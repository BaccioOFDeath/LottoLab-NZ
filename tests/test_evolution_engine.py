import unittest
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from evolution_engine import evaluate

class EvolutionEngineTests(unittest.TestCase):
 def test_empty_history_safe(self):
  result=evaluate([])
  self.assertEqual(result["evaluated_draws"],0)
  self.assertEqual(result["champion"],"random_control")
  self.assertFalse(result["candidate_verified"])
 def test_chronological_evaluation_rejects_unproven_claims(self):
  rows=[]
  for i in range(230):
   start=(i*11)%80
   rows.append({"draw":str(i+1),"date":"2026-01-%02d"%(i%28+1),"time":"10:00 am","numbers":list(((start+j)%80)+1 for j in range(20))})
  report=evaluate(rows)
  self.assertEqual(report["evaluated_draws"],30)
  self.assertEqual(report["discovery_draws"],22)
  self.assertEqual(report["holdout_draws"],8)
  self.assertFalse(report["candidate_verified"])
  self.assertEqual(report["champion"],"random_control")
  self.assertEqual(len(report["models"]),10)

if __name__=="__main__":unittest.main()
