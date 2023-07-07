import {TopicsMap} from '@/services/data/pipeline/pipeline-relations';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {Indicator, IndicatorBaseOn} from '@/services/data/tuples/indicator-types';
import {isNotNull} from '@/services/data/utils';
import {base64Encode} from '@/services/utils';

const generateBaseOn = (options: {
	indicator: Indicator;
	connectedSpaces: Array<ConnectedSpace>;
	topicsMap: TopicsMap;
}): string => {
	const {indicator, connectedSpaces, topicsMap} = options;

	if (indicator.baseOn === IndicatorBaseOn.TOPIC) {
		const topicId = indicator.topicOrSubjectId;
		const topic = topicsMap[topicId];
		// eslint-disable-next-line
		const factor = (topic?.factors || []).find(factor => factor.factorId == indicator.factorId);
		return `- Base: Topic <a href="#topic-${topic?.topicId}">${topic?.name || 'Noname Topic'}</a>
- Factor: ${factor?.name || 'Noname Factor'}
`;
	} else if (indicator.baseOn === IndicatorBaseOn.SUBJECT) {
		const subjectId = indicator.topicOrSubjectId;
		const subject = connectedSpaces.map(connectedSpace => connectedSpace.subjects).flat()
			// eslint-disable-next-line
			.find(subject => subject.subjectId == subjectId);
		// eslint-disable-next-line
		const column = (subject?.dataset?.columns || []).find(column => column.columnId == indicator.factorId);
		return `- Base: Subject <a href="#subject-${subject?.subjectId}">${subject?.name || 'Noname Subject'}</a>
- Factor: ${column?.alias || 'Noname Column'}
`;
	} else {
		return `[${indicator.baseOn}] is not supported yet.`;
	}
};

const generateAvailableBuckets = (options: { indicator: Indicator; buckets: Array<Bucket> }): string => {
	const {indicator, buckets} = options;
	if (indicator.valueBuckets == null || indicator.valueBuckets.length === 0) {
		return '';
	}
	const bucketMap = buckets.reduce((map, bucket) => {
		map[bucket.bucketId] = bucket;
		return map;
	}, {} as Record<BucketId, Bucket>);
	const availableBuckets = indicator.valueBuckets.filter(isNotNull).map(bucketId => bucketMap[bucketId]).filter(isNotNull);
	if (availableBuckets.length === 0) {
		return '';
	}

	return `- Buckets
${availableBuckets.map(bucket => `   - <a href="#bucket-${bucket.bucketId}">${bucket.name || 'Noname Bucket'}</a>`).join('\n')}
`;
};

const generateIndicatorMarkdown = (options: {
	indicator: Indicator; buckets: Array<Bucket>;
	connectedSpaces: Array<ConnectedSpace>; topicsMap: TopicsMap;
	index: number; sectionIndex: number;
}): string => {
	const {indicator, buckets, connectedSpaces, topicsMap, index, sectionIndex} = options;

	return `## ${sectionIndex}.${index + 1}. ${indicator.name || 'Noname Indicator'} #${indicator.indicatorId}<span id="indicator-${indicator.indicatorId}"/>
${(indicator.description || '').replace(/\n/g, '  ').replace(/</g, '&lt;')}

<a href="data:application/json;base64,${base64Encode(JSON.stringify(indicator))}" target="_blank" download="${indicator.name || 'Noname Indicator'}-${indicator.indicatorId}.json">Download Meta File</a>

${generateBaseOn({indicator, connectedSpaces, topicsMap})}
${generateAvailableBuckets({indicator, buckets})}
`;
};

export const generateIndicators = (options: {
	indicators: Array<Indicator>; buckets: Array<Bucket>;
	connectedSpaces: Array<ConnectedSpace>; topicsMap: TopicsMap;
	sectionIndex: number;
}): string => {
	const {indicators, buckets, connectedSpaces, topicsMap, sectionIndex} = options;

	if (indicators.length === 0) {
		return '> No indicator.';
	}

	return indicators.sort((t1, t2) => {
		return (t1.name || '').toLowerCase().localeCompare((t2.name || '').toLowerCase());
	}).map((indicator, index) => {
		return generateIndicatorMarkdown({indicator, buckets, connectedSpaces, topicsMap, index, sectionIndex});
	}).join('\n');
};
