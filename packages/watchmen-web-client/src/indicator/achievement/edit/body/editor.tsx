import {useAchievementEventBus} from '@/indicator/achievement/achievement-event-bus';
import {AchievementEventTypes} from '@/indicator/achievement/achievement-event-bus-types';
import {useAchievementEditEventBus} from '@/indicator/achievement/edit/body/achievement-edit-event-bus';
import {AchievementEditEventTypes} from '@/indicator/achievement/edit/body/achievement-edit-event-bus-types';
import {AchievementRoot} from '@/indicator/achievement/edit/body/achievement-root';
import {IndicatorCandidates} from '@/indicator/achievement/edit/body/indicator-candidates';
import {MoreComputeIndicators} from '@/indicator/achievement/edit/body/more-compute-indicators';
import {PickedIndicators} from '@/indicator/achievement/edit/body/picked-indicators';
import {TimeRange} from '@/indicator/achievement/edit/body/time-range';
import {useShowAddIndicator} from '@/indicator/achievement/edit/body/use-show-add-indicator';
import {BodyPalette, PaletteColumn} from '@/indicator/achievement/edit/body/widgets';
import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {FireTiming, useThrottler} from '@/widgets/throttler';
import {useEffect, useRef, useState} from 'react';
import {v4} from 'uuid';

interface Indicators {
	loaded: boolean;
	data: Array<Indicator>;
}

export const Editor = (props: { achievement: Achievement }) => {
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