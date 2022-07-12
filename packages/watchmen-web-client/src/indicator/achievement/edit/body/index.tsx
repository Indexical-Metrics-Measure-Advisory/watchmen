import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {useEffect, useState} from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';
import {AchievementEditEventBusProvider} from './achievement-edit-event-bus';
import {Editor} from './editor';
import {BodyContainer} from './widgets';

interface Indicators {
	loaded: boolean;
	data: Array<Indicator>;
}

export const AchievementEditPageBody = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const [indicators, setIndicators] = useState<Indicators>({loaded: false, data: []});
	const {fire} = useAchievementEventBus();
	useEffect(() => {
		fire(AchievementEventTypes.ASK_INDICATORS, (indicators: Array<Indicator>) => {
			setIndicators({loaded: true, data: indicators});
		});
	}, [fire, achievement]);

	if (!indicators.loaded) {
		return null;
	}

	return <AchievementEditEventBusProvider>
		<BodyContainer>
			<Editor achievement={achievement} indicators={indicators.data}/>
		</BodyContainer>
	</AchievementEditEventBusProvider>;
};