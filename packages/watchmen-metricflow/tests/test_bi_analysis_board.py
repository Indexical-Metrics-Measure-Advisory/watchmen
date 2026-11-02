import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
for source_root in [PACKAGE_ROOT / 'src', *(path / 'src' for path in PACKAGE_ROOT.parent.iterdir())]:
	if source_root.exists() and str(source_root) not in sys.path:
		sys.path.insert(0, str(source_root))

from watchmen_metricflow.meta.bi_analysis_meta_service import BI_ANALYSIS_ENTITY_SHAPER
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis, BIChartCard, BIDimensionSelection


class TestBIAnalysisBoardPersistence(unittest.TestCase):
	def test_dimension_selection_round_trip(self):
		selection = BIDimensionSelection(
			dimensions=['order_date', 'region'],
			axisDimension='order_date',
			seriesDimension='valueBucket',
			facetDimension='region',
			valueBucketId='bucket-1',
			timeRange='Past 30 days',
			timeGranularity='day',
			limit=10)
		analysis = BIAnalysis(
			id='analysis-1',
			name='Analysis',
			cards=[BIChartCard(
				id='card-1', title='Revenue', metricId='revenue', chartType='bar', size='md',
				selection=selection)])

		row = BI_ANALYSIS_ENTITY_SHAPER.serialize(analysis)
		restored = BI_ANALYSIS_ENTITY_SHAPER.deserialize(row)

		restored_selection = BIDimensionSelection.model_validate(restored.cards[0].selection)
		self.assertEqual(selection.model_dump(), restored_selection.model_dump())


if __name__ == '__main__':
	unittest.main()
