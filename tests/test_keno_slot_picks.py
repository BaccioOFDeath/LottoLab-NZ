import unittest
from scripts.keno_slot_picks import build_models, ranked

class PerDrawModels(unittest.TestCase):
    def setUp(self):
        self.rows=[]
        times=("10:00 am","1:00 pm","3:00 pm","6:00 pm")
        for i in range(1000):
            numbers=sorted({(i*11+j*9)%80+1 for j in range(20)})
            self.assertEqual(len(numbers),20)
            self.rows.append({"date":"2026-09-01","draw":str(25000+i),
                              "time":times[i%4],"numbers":numbers})
    def test_outputs_unique_tickets_and_model_rank(self):
        for time in ("10:00 am","1:00 pm","3:00 pm","6:00 pm"):
            predictions=build_models(self.rows,time,28000)
            self.assertEqual(len(predictions),6)
            for model in predictions:
                self.assertEqual(len(model["numbers"]),10)
                self.assertEqual(len(set(model["numbers"])),10)
                self.assertEqual(sorted(model["ranked_numbers"]),model["numbers"])
                self.assertTrue(all(1<=n<=80 for n in model["numbers"]))
                self.assertEqual(set(map(int,model["number_scores"].keys())),set(model["numbers"]))
    def test_same_time_repeat_only_uses_previous_same_time_draw(self):
        time="3:00 pm"
        previous=next(r for r in reversed(self.rows) if r["time"]==time)
        results=build_models(self.rows,time,28000)
        repeat=next(m for m in results if m["id"]=="same_slot")
        self.assertTrue(set(repeat["numbers"]).issubset(set(previous["numbers"])))
    def test_determinism(self):
        self.assertEqual(build_models(self.rows,"6:00 pm",28000),build_models(self.rows,"6:00 pm",28000))
        self.assertNotEqual(build_models(self.rows,"6:00 pm",28000)[-1]["numbers"],build_models(self.rows,"6:00 pm",28001)[-1]["numbers"])
    def test_no_data_no_model(self):
        self.assertEqual(build_models([],"1:00 pm",27913),[])
if __name__=="__main__":
    unittest.main()
