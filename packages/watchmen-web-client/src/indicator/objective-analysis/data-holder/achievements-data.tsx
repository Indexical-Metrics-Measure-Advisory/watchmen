import {TuplePage} from '@/services/data/query/tuple-page';
import {listAchievements} from '@/services/data/tuples/achievement';
import {QueryAchievement} from '@/services/data/tuples/query-achievement-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

interface State {
	loaded: boolean;
	data: Array<QueryAchievement>;
	loader?: Promise<Array<QueryAchievement>>;
}

export const AchievementsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useObjectiveAnalysisEventBus();
	const [state, setState] = useState<State>({loaded: false, data: []});
	useEffect(() => {
		const onAskAchievements = (onData: (achievements: Array<QueryAchievement>) => void) => {
			if (state.loaded) {
				onData(state.data);
			} else if (state.loader) {
				state.loader.then(achievements => onData(achievements));
			} else {
				const loader = async () => {
					const sync = (achievements: Array<QueryAchievement>) => {
						onData(achievements);
						setState({loaded: true, data: achievements});
					};
					return new Promise<Array<QueryAchievement>>(resolve => {
						fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
							return await listAchievements({search: '', pageNumber: 1, pageSize: 9999});
						}, (page: TuplePage<QueryAchievement>) => {
							sync(page.data ?? []);
							resolve(page.data);
						}, () => {
							sync([]);
							resolve([]);
						});
					});
				};
				setState({loaded: false, data: [], loader: loader()});
			}
		};
		on(ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, onAskAchievements);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, onAskAchievements);
		};
	}, [fireGlobal, on, off, state]);

	return <Fragment/>;
};