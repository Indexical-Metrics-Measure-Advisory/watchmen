import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {useEffect, useState} from 'react';
import {useAchievementEditEventBus} from './achievement-edit-event-bus';
import {AchievementEditEventTypes} from './achievement-edit-event-bus-types';
import {MoreIndicators} from './more-indicators';
import {IndicatorCategoryContent} from './types';
import {useShowAddIndicator} from './use-show-add-indicator';
import {buildCategoryNodes} from './utils';

interface CandidatesState {
	initialized: boolean;
	data: Array<IndicatorCategoryContent>;
}

export const IndicatorCandidates = (props: {
	paletteId: string;
	rootId: string;
	achievement: Achievement;
	indicators: Array<Indicator>;
}) => {
	const {paletteId, rootId, achievement, indicators} = props;

	const {fire: fireEdit} = useAchievementEditEventBus();
	const [state, setState] = useState<CandidatesState>({initialized: false, data: []});
	const visible = useShowAddIndicator(achievement);
	useEffect(() => {
		fireEdit(AchievementEditEventTypes.REPAINT);
	}, [fireEdit, visible, achievement]);
	useEffect(() => {
		setState({initialized: true, data: buildCategoryNodes(indicators)});
	}, [indicators]);

	if (!visible || !state.initialized) {
		return null;
	}

	return <MoreIndicators paletteId={paletteId} parentId={rootId}
	                       achievement={achievement} candidates={state.data}
	                       showText={true}/>;
};
