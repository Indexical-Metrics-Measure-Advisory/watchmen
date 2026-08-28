import {FactorId} from '../../tuples/factor-types';
import {FactorConsanguinity, FactorLineageEdge, FactorLineageNode} from '../../tuples/lineage-types';
import {TopicId} from '../../tuples/topic-types';

const MOCK_RAW_ORDER_TOPIC_ID = '90001';
const MOCK_RAW_EXCHANGE_TOPIC_ID = '90002';
const MOCK_ODS_ORDER_TOPIC_ID = '90003';

const node = (topicId: TopicId, topicName: string, factorId: FactorId, factorName: string,
              factorType: string, isTarget: boolean = false): FactorLineageNode => {
	return {topicId, topicName, factorId, factorName, factorType, isTarget};
};

const edge = (props: Omit<FactorLineageEdge, 'level'>, level: number): FactorLineageEdge => {
	return {...props, level};
};

export const fetchMockFactorConsanguinity = async (options: {
	topicId: TopicId;
	factorId: FactorId;
}): Promise<FactorConsanguinity> => {
	const {topicId, factorId} = options;
	return new Promise<FactorConsanguinity>((resolve) => {
		setTimeout(() => {
			const targetTopicName = 'Dwd Order';
			const nodes: Array<FactorLineageNode> = [
				node(MOCK_RAW_ORDER_TOPIC_ID, 'Raw Order', '90011', 'qty', 'number'),
				node(MOCK_RAW_ORDER_TOPIC_ID, 'Raw Order', '90012', 'price', 'number'),
				node(MOCK_RAW_EXCHANGE_TOPIC_ID, 'Raw Exchange Rate', '90013', 'usd_to_cny', 'number'),
				node(MOCK_ODS_ORDER_TOPIC_ID, 'Ods Order', '90021', 'quantity', 'number'),
				node(MOCK_ODS_ORDER_TOPIC_ID, 'Ods Order', '90022', 'unit_price', 'number'),
				node(MOCK_ODS_ORDER_TOPIC_ID, 'Ods Order', '90023', 'exchange_rate', 'number'),
				node(topicId, targetTopicName, factorId, 'amount', 'number', true)
			];
			const edges: Array<FactorLineageEdge> = [
				edge({
					sourceTopicId: MOCK_RAW_ORDER_TOPIC_ID, sourceFactorId: '90011', sourceFactorName: 'qty',
					targetTopicId: MOCK_ODS_ORDER_TOPIC_ID, targetFactorId: '90021', targetFactorName: 'quantity',
					relationType: 'Direct', pipelineId: '91001', pipelineName: 'Sync Raw Order'
				}, 3),
				edge({
					sourceTopicId: MOCK_RAW_ORDER_TOPIC_ID, sourceFactorId: '90012', sourceFactorName: 'price',
					targetTopicId: MOCK_ODS_ORDER_TOPIC_ID, targetFactorId: '90022', targetFactorName: 'unit_price',
					relationType: 'Direct', pipelineId: '91001', pipelineName: 'Sync Raw Order'
				}, 3),
				edge({
					sourceTopicId: MOCK_RAW_EXCHANGE_TOPIC_ID, sourceFactorId: '90013', sourceFactorName: 'usd_to_cny',
					targetTopicId: MOCK_ODS_ORDER_TOPIC_ID, targetFactorId: '90023', targetFactorName: 'exchange_rate',
					relationType: 'Direct', pipelineId: '91002', pipelineName: 'Sync Exchange Rate'
				}, 3),
				edge({
					sourceTopicId: MOCK_ODS_ORDER_TOPIC_ID, sourceFactorId: '90021', sourceFactorName: 'quantity',
					targetTopicId: topicId, targetFactorId: factorId, targetFactorName: 'amount',
					relationType: 'Computed', arithmetic: 'MULTIPLY', pipelineId: '91003', pipelineName: 'Compute Order Amount'
				}, 2),
				edge({
					sourceTopicId: MOCK_ODS_ORDER_TOPIC_ID, sourceFactorId: '90022', sourceFactorName: 'unit_price',
					targetTopicId: topicId, targetFactorId: factorId, targetFactorName: 'amount',
					relationType: 'Computed', arithmetic: 'MULTIPLY', pipelineId: '91003', pipelineName: 'Compute Order Amount'
				}, 2),
				edge({
					sourceTopicId: MOCK_ODS_ORDER_TOPIC_ID, sourceFactorId: '90023', sourceFactorName: 'exchange_rate',
					targetTopicId: topicId, targetFactorId: factorId, targetFactorName: 'amount',
					relationType: 'Direct', pipelineId: '91003', pipelineName: 'Compute Order Amount'
				}, 2)
			];
			resolve({
				topicId, topicName: targetTopicName, factorId, factorName: 'amount',
				nodes, edges, maxLevel: 3
			});
		}, 300);
	});
};
