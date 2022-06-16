import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {FireTiming, useThrottler} from '@/widgets/throttler';
import {useEffect, useRef, useState} from 'react';
import {v4} from 'uuid';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';
import {AchievementEditEventBusProvider, useAchievementEditEventBus} from './achievement-edit-event-bus';
import {AchievementEditEventTypes} from './achievement-edit-event-bus-types';
import {AchievementRoot} from './achievement-root';
import {IndicatorCandidates} from './indicator-candidates';
import {MoreComputeIndicators} from './more-compute-indicators';
import {PickedIndicators} from './picked-indicators';
import {TimeRange} from './time-range';
import {useShowAddIndicator} from './use-show-add-indicator';
import {BodyContainer, BodyPalette, PaletteColumn} from './widgets';

interface Indicators {
	loaded: boolean;
	data: Array<Indicator>;
}

const Palette = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const ref = useRef<HTMLDivElement>(null);
	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();
	const [paletteId] = useState(v4());
	const [rootId] = useState(v4());
	const [indicators, setIndicators] = useState<Indicators>({loaded: false, data: []});
	const resizeQueue = useThrottler();
	useEffect(() => {
		fire(AchievementEventTypes.ASK_INDICATORS, (indicators: Array<Indicator>) => {
			setIndicators({loaded: true, data: indicators});
		});
	}, [fire, achievement]);
	useEffect(() => {
		if (ref.current) {
			// @ts-ignore
			const resizeObserver = new ResizeObserver(() => {
				resizeQueue.replace((saveTime) => {
					if (saveTime === FireTiming.UNMOUNT) {
						return;
					}
					fireEdit(AchievementEditEventTypes.REPAINT);
				}, 100);
			});
			resizeObserver.observe(ref.current);
			return () => {
				resizeObserver.disconnect();
			};
		}
	}, [fireEdit, resizeQueue, indicators.loaded]);
	const showAddIndicator = useShowAddIndicator(achievement);

	if (!indicators.loaded) {
		return null;
	}

	return <BodyPalette id={paletteId} showAddIndicator={showAddIndicator} ref={ref}>
		<PaletteColumn>
			<AchievementRoot id={rootId} achievement={achievement}/>
		</PaletteColumn>
		<PaletteColumn>
			<TimeRange rootId={rootId} achievement={achievement}/>
			<PickedIndicators rootId={rootId} paletteId={paletteId}
			                  achievement={achievement} indicators={indicators.data}/>
			<MoreComputeIndicators paletteId={paletteId} parentId={rootId}
			                       achievement={achievement}/>
			<IndicatorCandidates paletteId={paletteId} rootId={rootId}
			                     achievement={achievement} indicators={indicators.data}/>
		</PaletteColumn>
	</BodyPalette>;
};

export const AchievementEditPageBody = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	return <AchievementEditEventBusProvider>
		<BodyContainer>
			<Palette achievement={achievement}/>
		</BodyContainer>
	</AchievementEditEventBusProvider>;
};