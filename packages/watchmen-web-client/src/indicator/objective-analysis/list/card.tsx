import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {prettifyDateTimeToMinute} from '@/services/data/tuples/utils';
import {ICON_CREATED_AT, ICON_LAST_MODIFIED_AT} from '@/widgets/basic/constants';
import {TooltipAlignment} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {
	TupleCard,
	TupleCardDescription,
	TupleCardStatistics,
	TupleCardStatisticsItem,
	TupleCardTitle
} from '@/widgets/tuple-workbench/tuple-card';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';

const AnalysisCard = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const {fire} = useTupleEventBus();

	const onEditClicked = () => {
		fire(TupleEventTypes.DO_EDIT_TUPLE, analysis);
	};

	return <TupleCard key={analysis.analysisId} onClick={onEditClicked}>
		<TupleCardTitle>
			<span>{analysis.title}</span>
		</TupleCardTitle>
		<TupleCardDescription>{analysis.description}</TupleCardDescription>
		<TupleCardStatistics>
			<TupleCardStatisticsItem
				tooltip={{label: Lang.INDICATOR.OBJECTIVE_ANALYSIS.CREATE_AT, alignment: TooltipAlignment.CENTER}}>
				<FontAwesomeIcon icon={ICON_CREATED_AT}/>
				<span>{prettifyDateTimeToMinute(analysis.createdAt)}</span>
			</TupleCardStatisticsItem>
			<TupleCardStatisticsItem
				tooltip={{
					label: Lang.INDICATOR.OBJECTIVE_ANALYSIS.LAST_MODIFIED_AT,
					alignment: TooltipAlignment.CENTER
				}}>
				<FontAwesomeIcon icon={ICON_LAST_MODIFIED_AT}/>
				<span>{prettifyDateTimeToMinute(analysis.lastModifiedAt)}</span>
			</TupleCardStatisticsItem>
		</TupleCardStatistics>
	</TupleCard>;
};

export const renderCard = (analysis: ObjectiveAnalysis) => {
	return <AnalysisCard analysis={analysis}/>;
};