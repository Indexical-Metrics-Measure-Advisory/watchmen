import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {FireTiming, useThrottler} from '@/widgets/throttler';
import {useEffect, useRef, useState} from 'react';
import {v4} from 'uuid';
import {AchievementRenderMode} from '../../achievement-event-bus-types';
import {useAchievementEditEventBus} from './achievement-edit-event-bus';
import {AchievementEditEventTypes} from './achievement-edit-event-bus-types';
import {AchievementRoot} from './achievement-root';
import {IndicatorCandidates} from './indicator-candidates';
import {MoreComputeIndicators} from './more-compute-indicators';
import {PickedIndicators} from './picked-indicators';
import {TimeRange} from './time-range';
import {useShowAddIndicator} from './use-show-add-indicator';
import {AchievementPalette, AchievementPaletteContainer, PaletteColumn} from './widgets';

export const Palette = (props: {
	achievement: Achievement;
	indicators: Array<Indicator>;
	renderMode: AchievementRenderMode;
}) => {
	const {achievement, indicators, renderMode} = props;

	const ref = useRef<HTMLDivElement>(null);
	const {fire: fireEdit} = useAchievementEditEventBus();
	const [paletteId] = useState(v4());
	const [rootId] = useState(v4());
	const resizeQueue = useThrottler();
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
	}, [fireEdit, resizeQueue]);
	const showAddIndicator = useShowAddIndicator(achievement) && renderMode === AchievementRenderMode.EDIT;

	return <AchievementPaletteContainer renderMode={renderMode}>
		<AchievementPalette id={paletteId} showAddIndicator={showAddIndicator} renderMode={renderMode} ref={ref}>
			<PaletteColumn>
				<AchievementRoot id={rootId} achievement={achievement}/>
			</PaletteColumn>
			<PaletteColumn>
				<TimeRange rootId={rootId} achievement={achievement}/>
				<PickedIndicators rootId={rootId} paletteId={paletteId}
				                  achievement={achievement} indicators={indicators}/>
				<MoreComputeIndicators paletteId={paletteId} parentId={rootId}
				                       achievement={achievement}/>
				<IndicatorCandidates paletteId={paletteId} rootId={rootId}
				                     achievement={achievement} indicators={indicators}/>
			</PaletteColumn>
		</AchievementPalette>
	</AchievementPaletteContainer>;
};