import {BreakdownTarget} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {isBlank} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import {DefForBreakdownDimension} from '../types';
import {Column} from './types';

const buildValueColumns = (target: ObjectiveTarget): Array<Column> => {
	const columns: Array<Column> = [];

	columns.push({name: Lang.INDICATOR.OBJECTIVE.TARGET_CURRENT_VALUE, width: 100});
	if (target.askPreviousCycle) {
		columns.push({name: Lang.INDICATOR.OBJECTIVE.TARGET_PREVIOUS_VALUE, width: 100});
	}
	if (target.askChainCycle) {
		columns.push({name: Lang.INDICATOR.OBJECTIVE.TARGET_CHAIN_VALUE, width: 100});
	}

	return columns;
};
export const buildColumns = (target: ObjectiveTarget, breakdown: BreakdownTarget, def: DefForBreakdownDimension): Array<Column> => {
	const columns: Array<Column> = [];

	const dimensions = breakdown.dimensions ?? [];
	dimensions.forEach(dimension => {
		const factorOrColumnId = dimension.factorOrColumnId;
		if (isBlank(factorOrColumnId)) {
			return;
		}
		if (def.topic != null) {
			// eslint-disable-next-line eqeqeq
			const factor = (def.topic.factors ?? []).find(factor => factor.factorId == factorOrColumnId);
			if (factor != null) {
				columns.push({name: factor.label || factor.name || 'Noname Dimension', width: '1fr'});
			}
		} else if (def.subject != null) {
			// eslint-disable-next-line eqeqeq
			const column = (def.subject.dataset?.columns ?? []).find(column => column.columnId == factorOrColumnId);
			if (column != null) {
				columns.push({name: column.alias || 'Noname Dimension', width: '1fr'});
			}
		}
	});

	columns.push(...buildValueColumns(target));
	return columns;
};