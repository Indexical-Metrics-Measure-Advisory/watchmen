import unittest

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

		self.assertEqual(selection.model_dump(), restored.cards[0].selection.model_dump())


if __name__ == '__main__':
	unittest.main()
