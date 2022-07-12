import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {BodyPaletteViewer} from './widgets';

export const Viewer = (props: { achievement: Achievement, indicators: Array<Indicator> }) => {
	const {achievement, indicators} = props;

	const visibleIndicators = (achievement.indicators || []).filter(indicator => indicator.includeInFinalScore);

	return <BodyPaletteViewer>
		{visibleIndicators.map(indicator => {
			return null;
		})}
	</BodyPaletteViewer>;
};