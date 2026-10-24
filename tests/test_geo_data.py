"""Geo Lab source-quality and incremental import safety checks."""
import json,unittest,importlib.util,datetime as dt
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("geo_ingest",ROOT/"scripts"/"geo_ingest.py")
geo=importlib.util.module_from_spec(spec);spec.loader.exec_module(geo)
class GeoDataTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.db=json.loads((ROOT/'data/geo-winners.json').read_text())
  cls.outline=json.loads((ROOT/'data/nz-outline.geojson').read_text())
  cls.places=json.loads((ROOT/'data/geo-places.json').read_text())['places']
 def test_real_nz_polygon_and_public_provenance(self):
  self.assertEqual(self.outline['geometry']['type'],'MultiPolygon')
  self.assertEqual(len(self.outline['geometry']['coordinates']),2)
  self.assertIn('glynnbird',self.outline['properties']['source'])
 def test_geo_records_are_valid_and_not_duplicated(self):
  ids=set()
  for r in self.db['records']:
   self.assertNotIn(r['id'],ids);ids.add(r['id'])
   self.assertRegex(r['source_url'],r'^https://(mylotto\.co\.nz|www\.scoop\.co\.nz)/')
   self.assertIn(r['game'],('Lotto','Powerball','Strike'))
   self.assertIn(r['tier'],('first','second','four','roll_down'))
   self.assertIn(r['channel'],('online','retail'))
   self.assertGreaterEqual(r['tickets'],1)
   self.assertGreaterEqual(r['lon'],165)
   self.assertLessEqual(r['lon'],180)
   self.assertGreaterEqual(r['lat'],-48.3)
   self.assertLessEqual(r['lat'],-34)
   self.assertIn(r['place'],self.places)
   dt.date.fromisoformat(r['draw_date'])
   if r['channel']=='online':
    self.assertEqual(r['location_role'],'online_winner_reported_area_not_sale_point')
   else:self.assertEqual(r['location_role'],'retailer_town_not_exact_shop')
  self.assertGreater(len(ids),30)
 def test_roll_down_not_mislabelled_powerball_first(self):
  rows=[r for r in self.db['records'] if r['draw_date']=='2024-06-08']
  self.assertTrue(rows)
  self.assertEqual({r['tier'] for r in rows},{'roll_down'})
  self.assertEqual(sum(r['tickets'] for r in rows),7)
 def test_never_claim_ticket_sales_denominator(self):
  self.assertFalse(self.db['ticket_sales_denominator_available'])
  self.assertIn('NOT physical',self.db['online_warning'])
 def test_source_header_correct_weekday(self):
  self.assertEqual(geo.parse_header('For draw 2650 on Wednesday 18 November 2026.'),(2650,'2026-11-18'))
  self.assertIsNone(geo.parse_header('For draw 2650 on Saturday 18 November 2026.'))
 def test_strict_official_table_import_and_unknown_place_rejection(self):
  article='''<html><body><p>For draw 2650 on Wednesday 18 November 2026.</p>
  <h2>Lotto First Division</h2><table><tr><th>Store</th><th>Location</th></tr>
  <tr><td>New World Sample</td><td>Tauranga</td></tr>
  <tr><td>MyLotto (x2)</td><td>Auckland</td></tr>
  <tr><td>Imaginary Dairy</td><td>Unverifiedville</td></tr></table></body></html>'''
  url='https://mylotto.co.nz/news-and-press-releases/lotto-draw-results-181126'
  rows=geo.first_division_rows(article,url,self.places)
  self.assertEqual(len(rows),2)
  self.assertEqual(rows[0]['outlet'],'New World Sample')
  self.assertEqual(rows[0]['place'],'Tauranga')
  self.assertEqual(rows[1]['tickets'],2)
  self.assertEqual(rows[1]['channel'],'online')
  self.assertNotIn('Unverifiedville',[x['place'] for x in rows])
  self.assertEqual(geo.first_division_rows(article,'https://evil.example/lotto',self.places),[])
 def test_reject_spurious_lotto_second_division_table(self):
  html='''<html><body><p>For draw 2650 on Wednesday 18 November 2026.</p><h2>Lotto Second Division</h2>
  <table><tr><th>Store</th><th>Location</th></tr><tr><td>Test Outlet</td><td>Hamilton</td></tr></table></body></html>'''
  self.assertEqual(geo.first_division_rows(html,'https://mylotto.co.nz/news-and-press-releases/example',self.places),[])
 def test_candidate_urls_are_wed_sat_only(self):
  urls=list(geo.candidate_urls(dt.date(2026,10,25),7))
  self.assertTrue(any('241026' in u for u in urls))
  self.assertTrue(any('211026' in u for u in urls))
  self.assertFalse(any('251026' in u for u in urls))
if __name__=='__main__':unittest.main()
