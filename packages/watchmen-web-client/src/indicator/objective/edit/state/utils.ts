import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactorOnIndicator} from '@/services/data/tuples/objective-types';
import {isNotBlank} from '@/services/utils';
import {isIndicatorFactor} from '../utils';

export const findIndicators = async (
	objective: Objective,
	askIndicator: (indicatorId: IndicatorId) => Promise<Indicator | null>
): Promise<Array<Indicator>> => {
	const indicatorIds = (objective.factors || [])
		.filter(f => isIndicatorFactor(f))
		.map(f => (f as ObjectiveFactorOnIndicator).indicatorId)
		.filter(indicatorId => isNotBlank(indicatorId)) as Array<IndicatorId>;
	return (await Promise.all(indicatorIds.map(indicatorId => {
		return new Promise<Indicator | null>(async resolve => {
			const indicator = await askIndicator(indicatorId);
			resolve(indicator);
		});
	}))).filter(indicator => indicator != null) as Array<Indicator>;
};